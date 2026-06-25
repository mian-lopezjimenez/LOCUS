import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import {
  readImageAttachment,
  readTextAttachment,
} from "@/services/attachments";
import type { PendingAttachment } from "@/types/attachment";
import {
  fileToPendingImage,
  fileToPendingText,
  isImageFileName,
  isTextFileName,
} from "@/utils/attachments";
import { compressImageDataUrl } from "@/utils/imageCompress";
import { newId } from "@/utils/id";

type UseComposerAttachmentsOptions = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

export function useComposerAttachments({
  disabled = false,
  onError,
}: UseComposerAttachmentsOptions = {}) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);

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

  const pickFiles = useCallback(async () => {
    if (disabled) return;

    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Archivos de texto",
            extensions: [
              "txt", "md", "py", "json", "js", "ts", "tsx", "jsx", "rs", "go",
              "java", "c", "cpp", "h", "css", "html", "xml", "yaml", "yml",
              "toml", "sh", "sql", "csv",
            ],
          },
          {
            name: "Imágenes",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });

      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      for (const path of paths) {
        if (typeof path !== "string") continue;
        const name = path.split(/[/\\]/).pop() ?? path;

        if (isTextFileName(name)) {
          const result = await readTextAttachment(path);
          addAttachment({
            id: newId(),
            kind: "text",
            name: result.name,
            content: result.content,
          });
        } else if (isImageFileName(name)) {
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
        } else {
          reportError(`Tipo de archivo no soportado: ${name}`);
        }
      }
    } catch (err) {
      reportError(err instanceof Error ? err.message : "No se pudo adjuntar el archivo");
    }
  }, [addAttachment, disabled, reportError]);

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;

      const list = Array.from(files);
      for (const file of list) {
        try {
          if (isTextFileName(file.name)) {
            const result = await fileToPendingText(file);
            addAttachment({
              id: newId(),
              kind: "text",
              name: result.name,
              content: result.content,
            });
          } else if (isImageFileName(file.name) || file.type.startsWith("image/")) {
            const result = await fileToPendingImage(file);
            addAttachment({
              id: newId(),
              kind: "image",
              name: result.name,
              mimeType: result.mimeType,
              dataUrl: result.dataUrl,
              sizeBytes: result.sizeBytes,
            });
          } else {
            reportError(`Tipo de archivo no soportado: ${file.name}`);
          }
        } catch (err) {
          reportError(err instanceof Error ? err.message : "No se pudo adjuntar el archivo");
        }
      }
    },
    [addAttachment, disabled, reportError],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (disabled) return;

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
    [addAttachment, disabled, reportError],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files.length > 0) {
        void ingestFiles(event.dataTransfer.files);
      }
    },
    [disabled, ingestFiles],
  );

  return {
    attachments,
    dragOver,
    pickFiles,
    removeAttachment,
    clearAttachments,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
