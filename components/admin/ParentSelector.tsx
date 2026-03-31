"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { RECTANGLE_TYPES } from "@/lib/types";
import type { RectangleData, RectangleType } from "@/lib/types";

type Props = {
  value: string; // current fatherId or ""
  onChange: (fatherId: string) => void;
  possibleParents: RectangleData[];
  currentRectangle: RectangleData;
};

/** Truncate text to a max length, adding ellipsis */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

/** Color for type badge */
const TYPE_BADGE_COLORS: Record<string, string> = {
  phrase:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  paragraph: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  article:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  section:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  figure:    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  table:     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  formula:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  annexe:    "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
};

export default function ParentSelector({
  value,
  onChange,
  possibleParents,
  currentRectangle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RectangleType | "">("");
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
      setTypeFilter("");
    }
  }, [open]);

  // Current parent info
  const currentParent = possibleParents.find((r) => r.id === value);

  // Filter and sort candidates
  const filtered = useMemo(() => {
    let list = possibleParents;

    if (typeFilter) {
      list = list.filter((r) => r.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((r) => {
        const haystack = [
          r.textFr || "",
          r.type,
          r.labels.join(" "),
          `p.${r.page}`,
          `page ${r.page}`,
          r.id,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.y - b.y;
    });
  }, [possibleParents, typeFilter, search]);

  // Count available types for filter chips
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of possibleParents) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }, [possibleParents]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-(--border-strong) transition-colors bg-(--bg-surface) text-(--text-primary)"
      >
        {currentParent ? (
          <span className="flex items-center gap-2 min-w-0">
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                TYPE_BADGE_COLORS[currentParent.type] || "bg-gray-100 text-gray-600"
              }`}
            >
              {currentParent.type}
            </span>
            <span className="truncate text-(--text-primary)">
              {currentParent.textFr
                ? truncate(currentParent.textFr.replace(/\s+/g, " "), 40)
                : "(no text)"}
            </span>
            <span className="shrink-0 text-(--text-muted) ml-auto text-xs">
              p.{currentParent.page}
            </span>
          </span>
        ) : (
          <span className="text-(--text-muted)">None (root)</span>
        )}
      </button>

      {/* Dropdown panel — full width of the sidebar content area */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-(--bg-surface) border border-(--border-default) rounded-lg shadow-xl flex flex-col max-h-105">
          {/* Search bar */}
          <div className="p-2.5 border-b border-(--border-default) shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by text, article number, page..."
              className="w-full px-3 py-2 border border-(--border-default) rounded-md text-sm bg-(--bg-surface) text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type filter chips */}
          <div className="px-2.5 py-2 border-b border-(--border-default) flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => setTypeFilter("")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === ""
                  ? "bg-blue-600 text-white"
                  : "bg-(--bg-surface-2) text-(--text-secondary) hover:bg-(--border-default)"
              }`}
            >
              All ({possibleParents.length})
            </button>
            {RECTANGLE_TYPES.filter((t) => typeCounts[t]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : `${TYPE_BADGE_COLORS[t] || "bg-gray-100 text-gray-500"} hover:opacity-80`
                }`}
              >
                {t} ({typeCounts[t]})
              </button>
            ))}
          </div>

          {/* "None (root)" option */}
          <button
            onClick={handleClear}
            className={`px-3 py-2.5 text-left text-sm border-b border-(--border-default) hover:bg-(--bg-surface-2) transition-colors shrink-0 ${
              !value ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/30 dark:text-blue-300" : "text-(--text-secondary)"
            }`}
          >
            None (root)
          </button>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-5 text-center text-sm text-(--text-muted)">
                No matching rectangles found
              </div>
            ) : (
              filtered.map((r) => {
                const isSelected = r.id === value;
                const isSamePage = r.page === currentRectangle.page;

                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className={`w-full px-3 py-2.5 text-left border-b border-(--border-default) hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors ${
                      isSelected ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-inset ring-blue-200 dark:ring-blue-800/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Type badge */}
                      <span
                        className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                          TYPE_BADGE_COLORS[r.type] || "bg-(--bg-surface-2) text-(--text-secondary)"
                        }`}
                      >
                        {r.type}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Text preview */}
                        <div className="text-xs text-(--text-primary) leading-snug">
                          {r.textFr
                            ? truncate(r.textFr.replace(/\s+/g, " "), 70)
                            : "(no text)"}
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs ${
                              isSamePage
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : "text-(--text-muted)"
                            }`}
                          >
                            Page {r.page}
                          </span>
                          {r.labels.length > 0 && (
                            <span className="text-xs text-(--text-muted) truncate">
                              {r.labels.join(", ")}
                            </span>
                          )}
                          <span className="text-xs text-(--text-muted) ml-auto font-mono opacity-50">
                            {r.id.slice(-6)}
                          </span>
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div className="px-3 py-2 border-t border-(--border-default) text-xs text-(--text-muted) text-center shrink-0">
            {filtered.length} of {possibleParents.length} candidates
          </div>
        </div>
      )}
    </div>
  );
}
