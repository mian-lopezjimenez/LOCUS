export type TextAttachment = {
  kind: "text";
  name: string;
  content: string;
};

export type ImageAttachment = {
  kind: "image";
  name: string;
  mimeType: string;
  path?: string;
  dataUrl?: string;
  /** Descripción generada por el modelo de visión al delegar. */
  visionDescription?: string;
};

export type MessageAttachment = TextAttachment | ImageAttachment;

export type PendingTextAttachment = {
  id: string;
  kind: "text";
  name: string;
  content: string;
};

export type PendingImageAttachment = {
  id: string;
  kind: "image";
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
};

export type PendingAttachment = PendingTextAttachment | PendingImageAttachment;

export type StoredAttachment = {
  kind: "text" | "image";
  name: string;
  mimeType?: string;
  path?: string;
  content?: string;
  visionDescription?: string;
};
