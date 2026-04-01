"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterState = {
  search: string;
  topic: string;
  projectAddress: string;
  permitDate: string;
  buildingHeightType: string;
  compartmentCategory: string;
  roomCategory: string;
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  topic: "",
  projectAddress: "",
  permitDate: "",
  buildingHeightType: "",
  compartmentCategory: "",
  roomCategory: "",
};

export function hasFilters(f: FilterState): boolean {
  return Object.values(f).some((v) => v !== "");
}

export function filtersEqual(a: FilterState, b: FilterState): boolean {
  return (Object.keys(a) as (keyof FilterState)[]).every((k) => a[k] === b[k]);
}

// ─── Static options ───────────────────────────────────────────────────────────

const BUILDING_HEIGHT_OPTIONS = [
  "Low-rise (≤ 10 m)",
  "Mid-rise (10 – 25 m)",
  "High-rise (> 25 m)",
];

const COMPARTMENT_OPTIONS = [
  "Category A",
  "Category B",
  "Category C",
  "Category D",
  "Category E",
];

const ROOM_OPTIONS = [
  "Living space",
  "Bedroom",
  "Office",
  "Commercial",
  "Industrial",
  "Technical room",
  "Common area",
  "Circulation",
];

// ─── Shared input styles ──────────────────────────────────────────────────────

const INPUT =
  "w-full h-10 px-3.5 text-sm border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 " +
  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all shadow-sm";

const SELECT =
  "w-full h-10 px-3.5 text-sm border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 " +
  "text-[var(--text-primary)] transition-all appearance-none cursor-pointer shadow-sm";

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm p-6 space-y-4">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[var(--text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

// ─── SelectWrapper — adds a chevron to native <select> ───────────────────────

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

// ─── Active filter pill ───────────────────────────────────────────────────────

const FILTER_LABELS: Record<keyof FilterState, string> = {
  search: "Keywords",
  topic: "Topic",
  projectAddress: "Address",
  permitDate: "Date",
  buildingHeightType: "Height",
  compartmentCategory: "Compartment",
  roomCategory: "Room",
};

// ─── FilterSidebar ────────────────────────────────────────────────────────────

type Props = {
  pending: FilterState;
  applied: FilterState;
  allLabels: string[];
  onChange: (field: keyof FilterState, value: string) => void;
  onApply: () => void;
  onClear: () => void;
};

export default function FilterSidebar({ pending, applied, allLabels, onChange, onApply, onClear }: Props) {
  const isDirty = !filtersEqual(pending, applied);
  const isActive = hasFilters(applied);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onApply();
  }

  return (
    <aside className="w-80 shrink-0 flex flex-col bg-[var(--bg-page)] border-r border-[var(--border-default)] overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Filters</h2>
          {isActive && (
            <button
              onClick={onClear}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Refine by keywords and metadata
        </p>
      </div>

      {/* ── Scrollable sections ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 pb-6 flex flex-col gap-6">

          {/* ── Search ──────────────────────────────────────────────────── */}
          <Section title="Search">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <input
                type="text"
                value={pending.search}
                onChange={(e) => onChange("search", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search in content…"
                className={`${INPUT} pl-9`}
              />
            </div>
            {allLabels.length > 0 && (
              <Field label="Topic">
                <SelectWrapper>
                  <select value={pending.topic} onChange={(e) => onChange("topic", e.target.value)} className={SELECT}>
                    <option value="">All topics</option>
                    {allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </SelectWrapper>
              </Field>
            )}
          </Section>

          {/* ── Project ─────────────────────────────────────────────────── */}
          <Section title="Project">
            <Field label="Address">
              <input
                type="text"
                value={pending.projectAddress}
                onChange={(e) => onChange("projectAddress", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Street, city…"
                className={INPUT}
              />
            </Field>
            <Field label="Permit applicable date">
              <input
                type="date"
                value={pending.permitDate}
                onChange={(e) => onChange("permitDate", e.target.value)}
                className={INPUT}
              />
            </Field>
          </Section>

          {/* ── Building ────────────────────────────────────────────────── */}
          <Section title="Building">
            <Field label="Height type">
              <SelectWrapper>
                <select value={pending.buildingHeightType} onChange={(e) => onChange("buildingHeightType", e.target.value)} className={SELECT}>
                  <option value="">Any height</option>
                  {BUILDING_HEIGHT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Compartment category">
              <SelectWrapper>
                <select value={pending.compartmentCategory} onChange={(e) => onChange("compartmentCategory", e.target.value)} className={SELECT}>
                  <option value="">Any category</option>
                  {COMPARTMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Room category">
              <SelectWrapper>
                <select value={pending.roomCategory} onChange={(e) => onChange("roomCategory", e.target.value)} className={SELECT}>
                  <option value="">Any room type</option>
                  {ROOM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </SelectWrapper>
            </Field>
          </Section>

          {/* ── Active filter pills ───────────────────────────────────── */}
          {isActive && (
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm p-6 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Active filters
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(applied) as [keyof FilterState, string][]).map(([key, val]) => {
                  if (!val) return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium"
                    >
                      <span className="text-blue-500 dark:text-blue-400 shrink-0">{FILTER_LABELS[key]}:</span>
                      <span className="truncate max-w-[140px]">{val}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="shrink-0 px-6 py-5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] space-y-3">
        <button
          onClick={onApply}
          className={`w-full h-10 text-[13px] font-semibold rounded-xl transition-all ${
            isDirty
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm ring-1 ring-blue-700/50"
              : isActive
              ? "bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-default)]"
              : "bg-[var(--text-primary)] text-[var(--bg-page)] hover:opacity-90 shadow-sm"
          }`}
        >
          {isDirty ? "Apply filters" : isActive ? "✓ Filters applied" : "Apply filters"}
        </button>
        {(isActive || isDirty) && (
          <button
            onClick={onClear}
            className="w-full h-9 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors font-medium"
          >
            Reset all
          </button>
        )}
      </div>

    </aside>
  );
}
