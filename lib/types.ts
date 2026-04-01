/**
 * lib/types.ts — Shared types for the Rectangle-centric architecture.
 *
 * Used by API routes (server) and components (client).
 */

// ---------------------------------------------------------------------------
// Rectangle type enum (mirrors Prisma RectangleType)
// ---------------------------------------------------------------------------

export const RECTANGLE_TYPES = [
  "phrase",
  "paragraph",
  "article",
  "section",
  "figure",
  "table",
  "formula",
  "annexe",
] as const;

export type RectangleType = (typeof RECTANGLE_TYPES)[number];

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentListItem = {
  id: string;
  title: string;
  pageCount: number;
  rectangleCount: number;
  createdAt: string;
};

export type DocumentDetail = DocumentListItem & {
  pdfPath: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Rectangles
// ---------------------------------------------------------------------------

export type RectangleData = {
  id: string;
  documentId: string;
  fatherId: string | null;
  type: RectangleType;
  labels: string[];
  textFr: string | null;
  textEn: string | null;
  textNl: string | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export type RectangleWithChildren = RectangleData & {
  children: RectangleData[];
  father: { id: string; type: RectangleType; labels: string[] } | null;
};

export type RectangleCreateInput = {
  documentId: string;
  fatherId?: string | null;
  type?: RectangleType;
  labels?: string[];
  textFr?: string | null;
  textEn?: string | null;
  textNl?: string | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RectangleUpdateInput = {
  fatherId?: string | null;
  type?: RectangleType;
  labels?: string[];
  textFr?: string | null;
  textEn?: string | null;
  textNl?: string | null;
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

// ---------------------------------------------------------------------------
// Drawing modes for the admin interface
// ---------------------------------------------------------------------------

export type DrawingMode = "select" | "fullWidth" | "freeRect";

// ---------------------------------------------------------------------------
// API Errors
// ---------------------------------------------------------------------------

export type ApiError = {
  error: string;
};
