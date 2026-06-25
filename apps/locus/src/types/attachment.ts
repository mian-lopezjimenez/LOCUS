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

export type PdfAttachment = {
  kind: "pdf";
  name: string;
  path?: string;
  text: string;
  pageCount: number;
  useVision: boolean;
};

export type MessageAttachment = TextAttachment | ImageAttachment | PdfAttachment;

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

export type PendingPdfAttachment = {
  id: string;
  kind: "pdf";
  name: string;
  path?: string;
  text: string;
  pageCount: number;
  useVision: boolean;
  sizeBytes: number;
};

export type PendingAttachment =
  | PendingTextAttachment
  | PendingImageAttachment
  | PendingPdfAttachment;

export type StoredAttachment = {
  kind: "text" | "image" | "pdf";
  name: string;
  mimeType?: string;
  path?: string;
  content?: string;
  visionDescription?: string;
  pageCount?: number;
  useVision?: boolean;
};
