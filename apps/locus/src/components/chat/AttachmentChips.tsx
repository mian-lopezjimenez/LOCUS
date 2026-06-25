import { FileText, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingAttachment } from "@/types/attachment";
import { cn } from "@/lib/utils";

type AttachmentChipsProps = {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
};

export function AttachmentChips({ attachments, onRemove }: AttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex max-w-full items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs"
        >
          {attachment.kind === "image" ? (
            <>
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="size-6 shrink-0 rounded object-cover"
              />
              <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
            </>
          ) : (
            <FileText className="size-3 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{attachment.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-5 shrink-0 text-muted-foreground"
            aria-label={`Quitar ${attachment.name}`}
            onClick={() => onRemove(attachment.id)}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

type VisionNoticeProps = {
  visionUnavailable: boolean;
};

export function VisionNotice({ visionUnavailable }: VisionNoticeProps) {
  if (!visionUnavailable) return null;

  return (
    <p className="mb-2 text-xs text-amber-500">
      No hay modelo de visión instalado. Ejecuta «ollama pull qwen2.5vl:7b» y
      reinicia OpenClaw para analizar imágenes.
    </p>
  );
}

type DropOverlayProps = {
  active: boolean;
};

export function DropOverlay({ active }: DropOverlayProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-primary/50 bg-primary/10 text-sm text-primary",
      )}
    >
      Suelta archivos aquí
    </div>
  );
}
