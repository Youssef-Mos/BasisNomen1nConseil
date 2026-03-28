"use client";

import type { DrawingMode } from "@/lib/types";

type Props = {
  documentTitle: string;
  currentPage: number;
  pageCount: number;
  drawingMode: DrawingMode;
  analyzing: boolean;
  onPageChange: (page: number) => void;
  onModeChange: (mode: DrawingMode) => void;
  onAnalyze: () => void;
  onDelete: () => void;
};

const MODE_LABELS: { mode: DrawingMode; label: string; shortcut: string }[] = [
  { mode: "select", label: "Select", shortcut: "V" },
  { mode: "fullWidth", label: "Full Width", shortcut: "F" },
  { mode: "freeRect", label: "Free Rect", shortcut: "R" },
];

export default function ToolBar({
  documentTitle,
  currentPage,
  pageCount,
  drawingMode,
  analyzing,
  onPageChange,
  onModeChange,
  onAnalyze,
  onDelete,
}: Props) {
  return (
    <div className="h-11 border-b border-gray-200 bg-white flex items-center px-4 gap-4 shrink-0">
      {/* Document title */}
      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={documentTitle}>
        {documentTitle}
      </span>

      <div className="w-px h-6 bg-gray-200" />

      {/* Drawing mode */}
      <div className="flex items-center gap-1">
        {MODE_LABELS.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              drawingMode === mode
                ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title={`${label} (${shortcut})`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &larr; Prev
        </button>
        <span className="text-xs text-gray-600 tabular-nums min-w-[80px] text-center">
          Page {currentPage} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Auto-analyze */}
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="px-3 py-1 text-xs font-medium rounded bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 disabled:opacity-50 transition-colors"
        title="Auto-detect text blocks from PDF (uses PyMuPDF)"
      >
        {analyzing ? "Analyzing..." : "Auto-Analyze"}
      </button>

      {/* Delete document */}
      <button
        onClick={onDelete}
        className="px-3 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 transition-colors"
        title="Delete this document"
      >
        Delete Doc
      </button>

      {/* Keyboard shortcut hint */}
      <div className="ml-auto text-[10px] text-gray-400 hidden lg:block">
        V=Select &middot; F=Full Width &middot; R=Free Rect &middot; Esc=Cancel
      </div>
    </div>
  );
}
