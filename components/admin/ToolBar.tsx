"use client";

import { useRouter } from "next/navigation";
import type { DrawingMode } from "@/lib/types";
import ThemeToggle from "@/components/ui/ThemeToggle";

type Props = {
  documentTitle: string;
  currentPage: number;
  pageCount: number;
  drawingMode: DrawingMode;
  analyzing: boolean;
  sessionCount: number;
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
  sessionCount,
  onPageChange,
  onModeChange,
  onAnalyze,
  onDelete,
}: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="h-11 border-b border-(--border-default) bg-(--bg-surface) flex items-center px-4 gap-4 shrink-0">
      {/* Document title */}
      <span className="text-sm font-medium text-(--text-primary) truncate max-w-50" title={documentTitle}>
        {documentTitle}
      </span>

      <div className="w-px h-6 bg-(--border-default)" />

      {/* Drawing mode */}
      <div className="flex items-center gap-1">
        {MODE_LABELS.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              drawingMode === mode
                ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700/50"
                : "text-(--text-secondary) hover:bg-(--bg-surface-2)"
            }`}
            title={`${label} (${shortcut})`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-(--border-default)" />

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2 py-1 text-xs text-(--text-secondary) hover:bg-(--bg-surface-2) rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          &larr; Prev
        </button>
        <span className="text-xs text-(--text-secondary) tabular-nums min-w-20 text-center">
          Page {currentPage} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
          className="px-2 py-1 text-xs text-(--text-secondary) hover:bg-(--bg-surface-2) rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>

      <div className="w-px h-6 bg-(--border-default)" />

      {/* Auto-analyze */}
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="px-3 py-1 text-xs font-medium rounded bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/40 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
        title="Auto-detect text blocks from PDF (uses PyMuPDF)"
      >
        {analyzing ? "Analyzing..." : "Auto-Analyze"}
      </button>

      <ThemeToggle />

      {/* Delete document */}
      <button
        onClick={onDelete}
        className="px-3 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/50 transition-colors"
        title="Delete this document"
      >
        Delete Doc
      </button>

      {/* Session counter */}
      <div className="ml-auto flex items-center gap-3">
        {sessionCount > 0 && (
          <span className="text-[10px] text-(--text-muted) tabular-nums">
            {sessionCount} rect{sessionCount > 1 ? "s" : ""} created
          </span>
        )}
        <span className="text-[10px] text-(--text-muted) hidden lg:block">
          V=Select &middot; F=Full Width &middot; R=Free Rect &middot; Esc=Cancel
        </span>
      </div>

      <div className="w-px h-6 bg-(--border-default)" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--bg-surface-2) rounded transition-colors"
        title="Logout"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Logout
      </button>
    </div>
  );
}
