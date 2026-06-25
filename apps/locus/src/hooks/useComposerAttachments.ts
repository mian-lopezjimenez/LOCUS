import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readImageAttachment,
  readPdfAttachment,
  readTextAttachment,
} from "@/services/attachments";
import type { PendingAttachment } from "@/types/attachment";
import {
  ALL_ATTACHMENT_EXTENSIONS,
  fileToPendingImage,
  IMAGE_FILE_EXTENSIONS,
  isImageFileName,
  isPdfFileName,
  isTextFileName,
  TEXT_FILE_EXTENSIONS,
} from "@/utils/attachments";
import { compressImageDataUrl } from "@/utils/imageCompress";
import { newId } from "@/utils/id";
import { shouldUsePdfVision } from "@/utils/pdfConstants";

type UseComposerAttachmentsOptions = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

const ATTACHMENT_PICKER_FILTERS = [
  {
    name: "Todos (texto, imágenes, PDF)",
    extensions: [...ALL_ATTACHMENT_EXTENSIONS],
  },
  {
    name: "PDF",
    extensions: ["pdf"],
  },
  {
    name: "Imágenes",
    extensions: [...IMAGE_FILE_EXTENSIONS],
  },
  {
    name: "Archivos de texto",
    extensions: [...TEXT_FILE_EXTENSIONS],
  },
];

function normalizePath(path: string): string {
  return path.replace(/\//g, "\\").toLowerCase();
}

function dedupePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const path of paths) {
    const key = normalizePath(path);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(path);
  }

  return unique;
}

async function buildPdfPending(path: string): Promise<PendingAttachment> {
  const result = await readPdfAttachment(path);
  return {
    id: newId(),
    kind: "pdf",
    name: result.name,
    path,
    text: result.text,
    pageCount: result.pageCount,
    useVision: shouldUsePdfVision(result.text, result.pageCount),
    sizeBytes: result.sizeBytes,
  };
}

export function useComposerAttachments({
  disabled = false,
  onError,
}: UseComposerAttachmentsOptions = {}) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const disabledRef = useRef(disabled);
  const dropGuardRef = useRef<{ key: string; at: number } | null>(null);

  disabledRef.current = disabled;

  const reportError = useCallback(
    (message: string) => {
      onError?.(message);
    },
    [onError],
  );

  const addAttachment = useCallback((attachment: PendingAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const ingestPath = useCallback(
    async (path: string) => {
      const name = path.split(/[/\\]/).pop() ?? path;

      if (isTextFileName(name)) {
        const result = await readTextAttachment(path);
        addAttachment({
          id: newId(),
          kind: "text",
          name: result.name,
          content: result.content,
        });
        return;
      }

      if (isImageFileName(name)) {
        const result = await readImageAttachment(path);
        const { dataUrl, mimeType } = await compressImageDataUrl(result.dataUrl);
        addAttachment({
          id: newId(),
          kind: "image",
          name: result.name,
          mimeType,
          dataUrl,
          sizeBytes: result.sizeBytes,
        });
        return;
      }

      if (isPdfFileName(name)) {
        addAttachment(await buildPdfPending(path));
        return;
      }

      reportError(`Tipo de archivo no soportado: ${name}`);
    },
    [addAttachment, reportError],
  );

  const ingestPathsRef = useRef<(paths: string[]) => Promise<void>>(async () => {});

  const ingestPaths = useCallback(
    async (paths: string[]) => {
      if (disabledRef.current) return;

      const uniquePaths = dedupePaths(paths);
      const dropKey = uniquePaths.map(normalizePath).sort().join("|");
      const now = Date.now();
      const lastDrop = dropGuardRef.current;

      if (lastDrop && lastDrop.key === dropKey && now - lastDrop.at < 500) {
        return;
      }
      dropGuardRef.current = { key: dropKey, at: now };

      for (const path of uniquePaths) {
        try {
          await ingestPath(path);
        } catch (err) {
          reportError(
            err instanceof Error ? err.message : "No se pudo adjuntar el archivo",
          );
        }
      }
    },
    [ingestPath, reportError],
  );

  ingestPathsRef.current = ingestPaths;

  const pickFiles = useCallback(async () => {
    if (disabledRef.current) return;

    try {
      const selected = await open({
        multiple: true,
        filters: ATTACHMENT_PICKER_FILTERS,
      });

      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      await ingestPathsRef.current(
        paths.filter((path): path is string => typeof path === "string"),
      );
    } catch (err) {
      reportError(err instanceof Error ? err.message : "No se pudo adjuntar el archivo");
    }
  }, [reportError]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (disabledRef.current) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/"),
      );
      if (imageItems.length === 0) return;

      event.preventDefault();

      void (async () => {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) continue;
          try {
            const result = await fileToPendingImage(file);
            addAttachment({
              id: newId(),
              kind: "image",
              name: result.name,
              mimeType: result.mimeType,
              dataUrl: result.dataUrl,
              sizeBytes: result.sizeBytes,
            });
          } catch (err) {
            reportError(err instanceof Error ? err.message : "No se pudo pegar la imagen");
          }
        }
      })();
    },
    [addAttachment, reportError],
  );

  useEffect(() => {
    if (disabled) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (disposed) return;

        const payload = event.payload;
        if (payload.type === "over") {
          setDragOver(true);
        } else if (payload.type === "drop") {
          setDragOver(false);
          void ingestPathsRef.current(payload.paths);
        } else {
          setDragOver(false);
        }
      })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch(() => {
        // Fuera de Tauri (p. ej. vite dev en navegador): sin drag nativo.
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [disabled]);

  return {
    attachments,
    dragOver,
    pickFiles,
    removeAttachment,
    clearAttachments,
    handlePaste,
  };
}
