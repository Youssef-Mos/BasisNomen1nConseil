"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterSidebar, {
  type FilterState,
  type NormFilterDef,
  buildEmptyFilters,
  hasFilters,
} from "./FilterSidebar";
import type { RectClient, Lang } from "./shared";
import { buildTreeMap, getEffectiveLabels } from "./shared";
import TreeNode from "./TreeNode";
import ResultCard from "./ResultCard";
import Lightbox from "./Lightbox";

// Re-export so server pages can type the rectangles prop without a separate import.
export type { RectClient };

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SearchEmptyIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
  doc: { id: string; title: string; pageCount: number; normId?: string | null };
  rectangles: RectClient[];
}) {
  const [lang, setLang] = useState<Lang>("fr");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [filterDefs, setFilterDefs] = useState<NormFilterDef[]>([]);
  const [pendingFilters, setPendingFilters] = useState<FilterState>({ search: "", topic: "" });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ search: "", topic: "" });
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
    for (const r of rectangles) {
      for (const l of getEffectiveLabels(r, rectById)) s.add(l);
    }
    return [...s].sort();
  }, [rectangles, rectById]);

  const isFiltered = hasFilters(appliedFilters);

  // Fetch filter definitions: norm-specific + global (normId=null)
  // If the document has a norm, GET /api/norms/:normId/filters returns both.
  // If no norm, GET /api/filters returns all (we filter to global only).
  useEffect(() => {
    const url = doc.normId
      ? `/api/norms/${doc.normId}/filters`
      : `/api/filters`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((defs: NormFilterDef[]) => {
        // If no norm, only keep global filters (normId === null)
        const filtered = doc.normId ? defs : defs.filter((d: any) => d.normId === null);
        setFilterDefs(filtered);
        const empty = buildEmptyFilters(filtered);
        setPendingFilters(empty);
        setAppliedFilters(empty);
      })
      .catch(() => {});
  }, [doc.normId]);

  const handleToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function handlePendingChange(field: string, value: string | string[]) {
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

  function handleOpenPdf() {
    setPopupBlocked(false);
    const w = window.open(`/api/documents/${doc.id}/pdf`, "_blank", "noopener,noreferrer");
    if (w === null) setPopupBlocked(true);
  }

  function handleClear() {
    const empty = buildEmptyFilters(filterDefs);
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setResults([]);
    setTotalResults(0);
    setHasMore(false);
    setError(null);
  }

  // Fetch filtered results
  useEffect(() => {
    if (!isFiltered) return;

    const params = new URLSearchParams();

    // Built-in search/topic filters
    const search = appliedFilters.search as string;
    const topic = appliedFilters.topic as string;
    if (search) params.set("keywords", search);
    if (topic) params.set("topic", topic);

    // Dynamic filters from definitions
    for (const def of filterDefs) {
      const val = appliedFilters[def.key];
      if (!val) continue;
      if (Array.isArray(val)) {
        if (val.length > 0) params.set(def.key, val.join(","));
      } else if (val !== "") {
        params.set(def.key, val);
      }
    }

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
  }, [appliedFilters, doc.id, isFiltered, resultPage, filterDefs]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-page)] antialiased">

      {/* Lightbox */}
      {lightboxRect && (
        <Lightbox docId={doc.id} rect={lightboxRect} onClose={() => setLightboxRect(null)} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shadow-[0_1px_12px_rgba(0,0,0,0.04)] relative z-10">
        <div className="max-w-[1680px] mx-auto px-8">

          {/* Nav + Lang + ThemeToggle row */}
          <div className="flex items-center justify-between py-4">
            <a
              href="/explore"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all -ml-1 px-3 py-2 rounded-xl hover:bg-[var(--bg-surface-2)]"
            >
              <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                <ArrowLeftIcon />
              </span>
              Back to Documents
            </a>

            <div className="flex items-center gap-3">
              {/* Open PDF button */}
              <div className="relative">
                <button
                  onClick={handleOpenPdf}
                  className="bg-(--bg-surface) border border-(--border-default) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-2) transition-colors duration-150 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
                  title="Open raw PDF in a new tab"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                  Open PDF
                </button>
                {popupBlocked && (
                  <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-2.5 py-1 z-20">
                    Popup blocked — allow popups for this site.
                  </p>
                )}
              </div>

              {/* Language selector */}
              <div className="flex items-center gap-1 bg-[var(--bg-page)] p-1 rounded-full border border-[var(--border-default)]">
                {(["fr", "en", "nl"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-200 ${
                      lang === l
                        ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Title + Meta row */}
          <div className="flex items-center justify-between gap-6 pb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight truncate">
                {doc.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
                <DocIcon />
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{doc.pageCount}</span>
                <span>pages</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-xl px-3.5 py-1.5 text-sm text-[var(--text-secondary)]">
                <BlockIcon />
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{rectangles.length}</span>
                <span>blocks</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[var(--bg-page)]">

        {/* Sidebar */}
        <FilterSidebar
          filterDefs={filterDefs}
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
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                    {loading && resultPage === 1
                      ? "Loading..."
                      : `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
                  </p>
                  <button
                    onClick={handleClear}
                    className="text-xs font-medium text-[var(--text-muted)] hover:text-red-600 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 mb-5">
                    {error}
                  </div>
                )}

                {loading && resultPage === 1 ? (
                  <div className="py-24 text-center text-sm text-[var(--text-muted)]">Loading results...</div>
                ) : results.length === 0 ? (
                  <div className="py-24 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] flex items-center justify-center">
                      <SearchEmptyIcon />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">No results match your filters.</p>
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
                          query={(appliedFilters.search as string) ?? ""}
                          onLightbox={setLightboxRect}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setResultPage((p) => p + 1)}
                        disabled={loading}
                        className="w-full mt-8 py-3.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors disabled:opacity-50"
                      >
                        {loading ? "Loading..." : "Load more results"}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* ── Accordion tree ────────────────────────────────────────── */
              <div className="min-w-0 overflow-x-hidden">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-5">
                  {roots.length} top-level element{roots.length !== 1 ? "s" : ""}
                </p>

                <div className="flex flex-col gap-3">
                  {roots.length === 0 ? (
                    <p className="py-20 text-center text-sm text-[var(--text-muted)]">
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
                        rectById={rectById}
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
