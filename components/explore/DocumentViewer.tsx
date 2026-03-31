"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterSidebar, {
  type FilterState,
  EMPTY_FILTERS,
  hasFilters,
} from "./FilterSidebar";
import type { RectClient, Lang } from "./shared";
import { buildTreeMap } from "./shared";
import TreeNode from "./TreeNode";
import ResultCard from "./ResultCard";
import Lightbox from "./Lightbox";

// Re-export so server pages can type the rectangles prop without a separate import.
export type { RectClient };

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SearchEmptyIcon() {
  return (
    <svg
      className="w-6 h-6 text-gray-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

// ─── DocumentViewer ───────────────────────────────────────────────────────────

export default function DocumentViewer({
  doc,
  rectangles,
}: {
  doc: { id: string; title: string; pageCount: number };
  rectangles: RectClient[];
}) {
  const [lang, setLang] = useState<Lang>("fr");
  const [pendingFilters, setPendingFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [resultPage, setResultPage] = useState(1);
  const [results, setResults] = useState<RectClient[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [lightboxRect, setLightboxRect] = useState<RectClient | null>(null);

  const controller = useRef<AbortController | null>(null);

  const treeMap = useMemo(() => buildTreeMap(rectangles), [rectangles]);
  const rectById = useMemo(() => new Map(rectangles.map((r) => [r.id, r])), [rectangles]);
  const roots = useMemo(() => treeMap.get(null) ?? [], [treeMap]);
  const allLabels = useMemo(() => {
    const s = new Set<string>();
    rectangles.forEach((r) => r.labels.forEach((l) => s.add(l)));
    return [...s].sort();
  }, [rectangles]);

  const isFiltered = hasFilters(appliedFilters);

  const handleToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function handlePendingChange(field: keyof FilterState, value: string) {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleApply() {
    setAppliedFilters({ ...pendingFilters });
    setResultPage(1);
    setResults([]);
    setTotalResults(0);
    setHasMore(false);
    setError(null);
  }

  function handleClear() {
    setPendingFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setResults([]);
    setTotalResults(0);
    setHasMore(false);
    setError(null);
  }

  useEffect(() => {
    if (!isFiltered) return;

    const params = new URLSearchParams();
    if (appliedFilters.search)             params.set("keywords",            appliedFilters.search);
    if (appliedFilters.topic)              params.set("topic",               appliedFilters.topic);
    if (appliedFilters.projectAddress)     params.set("projectAddress",      appliedFilters.projectAddress);
    if (appliedFilters.permitDate)         params.set("permitDate",          appliedFilters.permitDate);
    if (appliedFilters.buildingHeightType) params.set("buildingHeightType",  appliedFilters.buildingHeightType);
    if (appliedFilters.compartmentCategory) params.set("compartmentCategory", appliedFilters.compartmentCategory);
    if (appliedFilters.roomCategory)       params.set("roomCategory",        appliedFilters.roomCategory);
    params.set("page", String(resultPage));
    params.set("pageSize", "60");

    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setLoading(true);
    setError(null);

    fetch(`/api/documents/${doc.id}/rectangles?${params.toString()}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load filtered results");
        return res.json();
      })
      .then((payload: { items: RectClient[]; total: number; hasMore: boolean }) => {
        setResults((prev) => resultPage === 1 ? payload.items : [...prev, ...payload.items]);
        setTotalResults(payload.total);
        setHasMore(payload.hasMore);
      })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message || "Failed to load"); })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [appliedFilters, doc.id, isFiltered, resultPage]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50 antialiased">

      {/* Lightbox */}
      {lightboxRect && (
        <Lightbox docId={doc.id} rect={lightboxRect} onClose={() => setLightboxRect(null)} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-gray-100/80 shadow-[0_1px_12px_rgba(0,0,0,0.04)] relative z-10">
        <div className="max-w-[1680px] mx-auto px-8">

          {/* Nav + Lang row */}
          <div className="flex items-center justify-between py-4">
            <a
              href="/explore"
              className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-all -ml-1 px-3 py-2 rounded-xl hover:bg-gray-100/80"
            >
              <span className="text-gray-400 group-hover:text-gray-700 transition-colors">
                <ArrowLeftIcon />
              </span>
              Back to Documents
            </a>

            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-100/50">
              {(["fr", "en", "nl"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-200 ${
                    lang === l
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Title + Meta row */}
          <div className="flex items-center justify-between gap-6 pb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight truncate">
                {doc.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200/60 rounded-xl px-3.5 py-1.5 text-sm text-gray-500">
                <DocIcon />
                <span className="font-semibold text-gray-800 tabular-nums">{doc.pageCount}</span>
                <span>pages</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200/60 rounded-xl px-3.5 py-1.5 text-sm text-gray-500">
                <BlockIcon />
                <span className="font-semibold text-gray-800 tabular-nums">{rectangles.length}</span>
                <span>blocks</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-gray-50">

        {/* Sidebar */}
        <FilterSidebar
          pending={pendingFilters}
          applied={appliedFilters}
          allLabels={allLabels}
          onChange={handlePendingChange}
          onApply={handleApply}
          onClear={handleClear}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full px-8 py-10">

            {isFiltered ? (
              /* ── Filter results ────────────────────────────────────────── */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                    {loading && resultPage === 1
                      ? "Loading…"
                      : `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
                  </p>
                  <button
                    onClick={handleClear}
                    className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    {error}
                  </div>
                )}

                {loading && resultPage === 1 ? (
                  <div className="py-24 text-center text-sm text-gray-400">Loading results…</div>
                ) : results.length === 0 ? (
                  <div className="py-24 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <SearchEmptyIcon />
                    </div>
                    <p className="text-sm text-gray-500">No results match your filters.</p>
                    <button
                      onClick={handleClear}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {results.map((r) => (
                        <ResultCard
                          key={r.id}
                          rect={r}
                          rectById={rectById}
                          docId={doc.id}
                          lang={lang}
                          query={appliedFilters.search}
                          onLightbox={setLightboxRect}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setResultPage((p) => p + 1)}
                        disabled={loading}
                        className="w-full mt-8 py-3.5 text-sm font-semibold text-blue-700 bg-blue-50/50 border border-blue-100 rounded-2xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {loading ? "Loading…" : "Load more results"}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* ── Accordion tree ────────────────────────────────────────── */
              <div className="min-w-0 overflow-x-hidden">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5">
                  {roots.length} top-level element{roots.length !== 1 ? "s" : ""}
                </p>

                <div className="flex flex-col gap-3">
                  {roots.length === 0 ? (
                    <p className="py-20 text-center text-sm text-gray-400">
                      No content blocks found in this document.
                    </p>
                  ) : (
                    roots.map((rect) => (
                      <TreeNode
                        key={rect.id}
                        rect={rect}
                        docId={doc.id}
                        lang={lang}
                        treeMap={treeMap}
                        level={0}
                        openIds={openIds}
                        onToggle={handleToggle}
                        onLightbox={setLightboxRect}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
