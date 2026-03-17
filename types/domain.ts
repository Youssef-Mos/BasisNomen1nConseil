export type Locale = "fr" | "en";

export interface DocumentItem {
  id: string;
  code: string;
  title: string;
  version?: string | null;
  language: string;
}

export interface SectionItem {
  id: string;
  documentId: string;
  parentId?: string | null;
  sectionType: string;
  identifier?: string | null;
  title?: string | null;
  orderIndex: number;
}

export interface PdfSnippetItem {
  id: string;
  documentId: string;
  sectionId?: string | null;
  pageNumber: number;
  imagePath: string;
}
