import { useEffect, useState } from "react";
import { loadImageDataUrl } from "@/services/attachments";
import type { MessageAttachment } from "@/types/attachment";

type MessageAttachmentsProps = {
  attachments: MessageAttachment[];
};

function ImagePreview({
  attachment,
}: {
  attachment: MessageAttachment & { kind: "image" };
}) {
  const [src, setSrc] = useState(attachment.dataUrl ?? "");

  useEffect(() => {
    if (attachment.dataUrl) {
      setSrc(attachment.dataUrl);
      return;
    }
    if (!attachment.path) return;

    let cancelled = false;
    void loadImageDataUrl(attachment.path).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.dataUrl, attachment.path]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={attachment.name}
      className="max-h-40 max-w-full rounded-md border border-border object-contain"
    />
  );
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments.length) return null;

  const images = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "image" } =>
      attachment.kind === "image",
  );
  const texts = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "text" } =>
      attachment.kind === "text",
  );
  const pdfs = attachments.filter(
    (attachment): attachment is MessageAttachment & { kind: "pdf" } =>
      attachment.kind === "pdf",
  );

  return (
    <div className="mb-2 flex flex-col gap-2">
      {images.map((attachment) => (
        <ImagePreview key={`${attachment.name}-${attachment.path ?? "inline"}`} attachment={attachment} />
      ))}
      {texts.map((attachment) => (
        <p key={attachment.name} className="text-xs text-muted-foreground">
          📎 {attachment.name}
        </p>
      ))}
      {pdfs.map((attachment) => (
        <p key={attachment.name} className="text-xs text-muted-foreground">
          📄 {attachment.name}
          {attachment.useVision ? " (análisis visual)" : ""}
        </p>
      ))}
    </div>
  );
}
