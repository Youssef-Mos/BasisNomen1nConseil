/**
 * components/explore/shared.ts
 *
 * Types, constants, and pure utility functions shared across all explore/
 * sub-components. No JSX — importable from both server and client modules.
 */

import type { RectangleType } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Lightweight rectangle shape used exclusively on the client explore views. */
export type RectClient = {
  id: string;
  type: RectangleType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  textFr: string | null;
  textEn: string | null;
  textNl: string | null;
  labels: string[];
  fatherId: string | null;
};

export type Lang = "fr" | "en" | "nl";

/** parent-id (or null for roots) → ordered list of direct children */
export type TreeMap = Map<string | null, RectClient[]>;

// ─── Constants ────────────────────────────────────────────────────────────────

/** A4 portrait aspect ratio — used only for the CSS crop fallback. */
export const PAGE_ASPECT = 297 / 210;

export const TYPE_STYLE = {
  annexe:    { badge: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",     accent: "bg-slate-500",  border: "border-l-slate-400"  },
  article:   { badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",     accent: "bg-amber-400",  border: "border-l-amber-400"  },
  section:   { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", accent: "bg-violet-400", border: "border-l-violet-400" },
  paragraph: { badge: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300",            accent: "bg-gray-300",   border: "border-l-gray-300"   },
  phrase:    { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",          accent: "bg-blue-400",   border: "border-l-blue-400"   },
  figure:    { badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",          accent: "bg-pink-400",   border: "border-l-pink-400"   },
  table:     { badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",          accent: "bg-cyan-400",   border: "border-l-cyan-400"   },
  formula:   { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",  accent: "bg-orange-400", border: "border-l-orange-400" },
} as const;

type KnownType = keyof typeof TYPE_STYLE;

export const TYPE_LABEL: Record<string, string> = {
  annexe: "Annexe", article: "Article", section: "Section",
  paragraph: "Paragraph", phrase: "Phrase", figure: "Figure",
  table: "Table", formula: "Formula",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function typeStyle(t: string) {
  return TYPE_STYLE[t as KnownType] ?? {
    badge: "bg-gray-100 text-gray-600",
    accent: "bg-gray-300",
    border: "border-l-gray-300",
  };
}

export function getText(rect: RectClient, lang: Lang): string {
  if (lang === "en") return rect.textEn || rect.textFr || rect.textNl || "";
  if (lang === "nl") return rect.textNl || rect.textFr || rect.textEn || "";
  return rect.textFr || rect.textEn || rect.textNl || "";
}

export function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit).trimEnd() + "…";
}

export function buildTreeMap(rects: RectClient[]): TreeMap {
  const allIds = new Set(rects.map((r) => r.id));
  const map: TreeMap = new Map();
  for (const rect of rects) {
    const key = rect.fatherId && allIds.has(rect.fatherId) ? rect.fatherId : null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(rect);
  }
  for (const children of map.values()) {
    children.sort((a, b) => a.page !== b.page ? a.page - b.page : a.y - b.y);
  }
  return map;
}

export function buildPath(rect: RectClient, rectById: Map<string, RectClient>): RectClient[] {
  const chain: RectClient[] = [];
  let cur: RectClient | undefined = rect;
  while (cur) {
    chain.unshift(cur);
    cur = cur.fatherId ? rectById.get(cur.fatherId) : undefined;
  }
  return chain;
}

export function cropImageUrl(_docId: string, rectId: string): string {
  return `/api/crop/${rectId}`;
}

export function pageImageUrl(docId: string, page: number): string {
  return `/pdf-pages/${docId}/page-${String(page).padStart(3, "0")}.png`;
}
