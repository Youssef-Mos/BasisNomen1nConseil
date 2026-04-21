"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NormFilterDef = {
  id: string;
  key: string;
  label: string;
  section: string;
  type: string; // "select" | "text" | "multiselect" | "boolean" | "number" | "range" | "date"
  options: string[];
  sortOrder: number;
};

export type FilterState = Record<string, string | string[]>;

export function buildEmptyFilters(defs: NormFilterDef[]): FilterState {
  const state: FilterState = { search: "", topic: "" };
  for (const d of defs) {
    state[d.key] = d.type === "multiselect" ? [] : "";
  }
  return state;
}

export function hasFilters(f: FilterState): boolean {
  return Object.values(f).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== "",
  );
}

export function filtersEqual(a: FilterState, b: FilterState): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = a[k] ?? "";
    const vb = b[k] ?? "";
    if (Array.isArray(va) || Array.isArray(vb)) {
      const aa = Array.isArray(va) ? va : [va];
      const bb = Array.isArray(vb) ? vb : [vb];
      if (aa.length !== bb.length || aa.some((v, i) => v !== bb[i])) return false;
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}

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

// ─── Build a label lookup from filter defs ────────────────────────────────────

function buildFilterLabels(defs: NormFilterDef[]): Record<string, string> {
  const labels: Record<string, string> = { search: "Keywords", topic: "Topic" };
  for (const d of defs) {
    labels[d.key] = d.label;
  }
  return labels;
}

// ─── Number/Range config parser ───────────────────────────────────────────────

export function parseNumberConfig(options: string[]): {
  min?: number;
  max?: number;
  step: number;
  unit: string;
  operator: string;
} {
  const config: { min?: number; max?: number; step: number; unit: string; operator: string } = {
    step: 1,
    unit: "",
    operator: "eq",
  };
  for (const opt of options) {
    const idx = opt.indexOf(":");
    if (idx === -1) continue;
    const k = opt.slice(0, idx).trim();
    const v = opt.slice(idx + 1).trim();
    if (k === "min" || k === "max" || k === "step") {
      const n = Number(v);
      if (Number.isFinite(n)) config[k] = n;
    } else if (k === "unit") {
      config.unit = v;
    } else if (k === "operator") {
      config.operator = v;
    }
  }
  return config;
}

// ─── FilterSidebar ────────────────────────────────────────────────────────────

type Props = {
  filterDefs: NormFilterDef[];
  pending: FilterState;
  applied: FilterState;
  allLabels: string[];
  onChange: (field: string, value: string | string[]) => void;
  onApply: () => void;
  onClear: () => void;
};

export default function FilterSidebar({ filterDefs, pending, applied, allLabels, onChange, onApply, onClear }: Props) {
  const isDirty = !filtersEqual(pending, applied);
  const isActive = hasFilters(applied);
  const filterLabels = buildFilterLabels(filterDefs);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onApply();
  }

  // Group filter definitions by section
  const sectionMap = new Map<string, NormFilterDef[]>();
  for (const def of filterDefs) {
    if (!sectionMap.has(def.section)) sectionMap.set(def.section, []);
    sectionMap.get(def.section)!.push(def);
  }

  function renderFilterField(def: NormFilterDef) {
    const val = pending[def.key];

    switch (def.type) {
      case "select":
        return (
          <Field key={def.key} label={def.label}>
            <SelectWrapper>
              <select
                value={(val as string) ?? ""}
                onChange={(e) => onChange(def.key, e.target.value)}
                className={SELECT}
              >
                <option value="">Any</option>
                {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </SelectWrapper>
          </Field>
        );

      case "text":
        return (
          <Field key={def.key} label={def.label}>
            <input
              type="text"
              value={(val as string) ?? ""}
              onChange={(e) => onChange(def.key, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Filter by ${def.label.toLowerCase()}...`}
              className={INPUT}
            />
          </Field>
        );

      case "multiselect":
        return (
          <Field key={def.key} label={def.label}>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {def.options.map((opt) => {
                const arr = Array.isArray(val) ? val : [];
                const checked = arr.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...arr, opt]
                          : arr.filter((v) => v !== opt);
                        onChange(def.key, next);
                      }}
                      className="rounded border-[var(--border-default)]"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </Field>
        );

      case "boolean":
        return (
          <Field key={def.key} label={def.label}>
            <SelectWrapper>
              <select
                value={(val as string) ?? ""}
                onChange={(e) => onChange(def.key, e.target.value)}
                className={SELECT}
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </SelectWrapper>
          </Field>
        );

      case "number": {
        const cfg = parseNumberConfig(def.options);
        const labelWithUnit = cfg.unit ? `${def.label} (${cfg.unit})` : def.label;
        const operatorLabels: Record<string, string> = {
          eq: "=", gte: "≥", lte: "≤", gt: ">", lt: "<",
        };
        const opSymbol = operatorLabels[cfg.operator] ?? "=";
        return (
          <Field key={def.key} label={labelWithUnit}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-muted)] shrink-0 w-4 text-center">{opSymbol}</span>
              <input
                type="number"
                value={(val as string) ?? ""}
                onChange={(e) => onChange(def.key, e.target.value)}
                onKeyDown={handleKeyDown}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                placeholder={`Valeur${cfg.unit ? ` en ${cfg.unit}` : ""}...`}
                className={INPUT}
              />
            </div>
          </Field>
        );
      }

      case "range": {
        const cfg = parseNumberConfig(def.options);
        const labelWithUnit = cfg.unit ? `${def.label} (${cfg.unit})` : def.label;
        const strVal = (val as string) ?? "";
        const parts = strVal.split("-");
        const minVal = parts[0] ?? "";
        const maxVal = parts[1] ?? "";
        return (
          <Field key={def.key} label={labelWithUnit}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minVal}
                onChange={(e) => onChange(def.key, `${e.target.value}-${maxVal}`)}
                onKeyDown={handleKeyDown}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                placeholder="Min"
                className={INPUT}
              />
              <span className="text-sm text-[var(--text-muted)] shrink-0">—</span>
              <input
                type="number"
                value={maxVal}
                onChange={(e) => onChange(def.key, `${minVal}-${e.target.value}`)}
                onKeyDown={handleKeyDown}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                placeholder="Max"
                className={INPUT}
              />
            </div>
          </Field>
        );
      }

      case "date":
        return (
          <Field key={def.key} label={def.label}>
            <input
              type="date"
              value={(val as string) ?? ""}
              onChange={(e) => onChange(def.key, e.target.value)}
              className={INPUT}
            />
          </Field>
        );

      default:
        return null;
    }
  }

  // Format active filter value for display
  function formatFilterValue(key: string, val: string | string[]): string {
    if (Array.isArray(val)) return val.join(", ");
    return val;
  }

  return (
    <aside className="w-80 shrink-0 flex flex-col bg-[var(--bg-page)] border-r border-[var(--border-default)] overflow-hidden">

      {/* Header */}
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

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 pb-6 flex flex-col gap-6">

          {/* Built-in: Search + Topic */}
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
                value={(pending.search as string) ?? ""}
                onChange={(e) => onChange("search", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search in content..."
                className={`${INPUT} pl-9`}
              />
            </div>
            {allLabels.length > 0 && (
              <Field label="Topic">
                <SelectWrapper>
                  <select value={(pending.topic as string) ?? ""} onChange={(e) => onChange("topic", e.target.value)} className={SELECT}>
                    <option value="">All topics</option>
                    {allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </SelectWrapper>
              </Field>
            )}
          </Section>

          {/* Dynamic sections from filter definitions */}
          {[...sectionMap.entries()].map(([section, defs]) => (
            <Section key={section} title={section}>
              {defs.map((def) => renderFilterField(def))}
            </Section>
          ))}

          {/* Active filter pills */}
          {isActive && (
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm p-6 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Active filters
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(applied).map(([key, val]) => {
                  if (!val || (Array.isArray(val) && val.length === 0)) return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium"
                    >
                      <span className="text-blue-500 dark:text-blue-400 shrink-0">{filterLabels[key] ?? key}:</span>
                      <span className="truncate max-w-[140px]">{formatFilterValue(key, val)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Sticky footer */}
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
          {isDirty ? "Apply filters" : isActive ? "Filters applied" : "Apply filters"}
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
