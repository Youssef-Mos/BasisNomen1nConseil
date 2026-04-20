"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type NormFilter = {
  id: string;
  normId: string;
  key: string;
  label: string;
  section: string;
  type: string;
  options: string[];
  sortOrder: number;
};

type NormInfo = { id: string; name: string };

const FILTER_TYPES = ["select", "text", "multiselect", "boolean"] as const;

const EMPTY_FORM = {
  key: "",
  label: "",
  section: "",
  type: "select" as string,
  options: "",
  sortOrder: 0,
};

const INPUT =
  "w-full px-3 py-2 border border-(--border-default) rounded-md text-sm bg-(--bg-surface) text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function NormFiltersPage() {
  const { normId } = useParams<{ normId: string }>();
  const [norm, setNorm] = useState<NormInfo | null>(null);
  const [filters, setFilters] = useState<NormFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [normsRes, filtersRes] = await Promise.all([
        fetch("/api/norms"),
        fetch(`/api/norms/${normId}/filters`),
      ]);
      if (normsRes.ok) {
        const norms: NormInfo[] = await normsRes.json();
        setNorm(norms.find((n) => n.id === normId) ?? null);
      }
      if (filtersRes.ok) {
        setFilters(await filtersRes.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normId]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(f: NormFilter) {
    setEditingId(f.id);
    setForm({
      key: f.key,
      label: f.label,
      section: f.section,
      type: f.type,
      options: f.options.join(", "),
      sortOrder: f.sortOrder,
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      key: form.key.trim(),
      label: form.label.trim(),
      section: form.section.trim(),
      type: form.type,
      options:
        form.type === "select" || form.type === "multiselect"
          ? form.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      sortOrder: form.sortOrder,
    };

    try {
      const url = editingId
        ? `/api/norms/${normId}/filters/${editingId}`
        : `/api/norms/${normId}/filters`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save filter.");
        return;
      }
      closeForm();
      fetchData();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: NormFilter) {
    if (!confirm(`Delete filter "${f.label}" (${f.key})?\n\nThis cannot be undone.`)) return;
    const res = await fetch(`/api/norms/${normId}/filters/${f.id}`, { method: "DELETE" });
    if (res.ok) {
      setFilters((prev) => prev.filter((x) => x.id !== f.id));
    } else {
      alert("Failed to delete filter.");
    }
  }

  const showOptions = form.type === "select" || form.type === "multiselect";

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-(--text-muted) mb-4">
        <a href="/admin" className="hover:text-blue-600">Documents</a>
        <span>/</span>
        <span className="text-(--text-secondary)">{norm?.name ?? "Norm"} &mdash; Filters</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-(--text-primary)">
          Filters{norm ? ` for ${norm.name}` : ""}
        </h1>
        <button
          onClick={showForm ? closeForm : openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancel" : "New filter"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-(--bg-page) border border-(--border-default) rounded-lg space-y-3"
        >
          <h2 className="text-sm font-semibold text-(--text-primary)">
            {editingId ? "Edit filter" : "New filter"}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-1">Key</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                placeholder="e.g. buildingHeightType"
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Height type"
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-1">Section</label>
              <input
                type="text"
                value={form.section}
                onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                placeholder="e.g. Building"
                className={INPUT}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className={INPUT}
              >
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-1">Sort order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                className={INPUT}
              />
            </div>
            {showOptions && (
              <div>
                <label className="block text-sm font-medium text-(--text-primary) mb-1">
                  Options <span className="font-normal text-(--text-muted)">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.options}
                  onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
                  placeholder="e.g. Low-rise, Mid-rise, High-rise"
                  className={INPUT}
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : editingId ? "Update filter" : "Create filter"}
          </button>
        </form>
      )}

      {/* Filters table */}
      {loading ? (
        <p className="text-sm text-(--text-muted)">Loading filters...</p>
      ) : filters.length === 0 ? (
        <div className="text-center py-12 text-(--text-muted)">
          <p className="text-lg mb-2">No filters defined</p>
          <p className="text-sm">Click &ldquo;New filter&rdquo; to add a filter for this norm.</p>
        </div>
      ) : (
        <div className="border border-(--border-default) rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-(--bg-surface-2) text-(--text-secondary) text-left">
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Section</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Options</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filters.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-(--border-default) hover:bg-(--bg-surface-2)/50"
                >
                  <td className="px-4 py-2 tabular-nums">{f.sortOrder}</td>
                  <td className="px-4 py-2">{f.section}</td>
                  <td className="px-4 py-2 font-mono text-xs">{f.key}</td>
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-(--bg-surface-2) text-xs">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-(--text-muted) max-w-[200px] truncate">
                    {f.options.length > 0 ? f.options.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => openEdit(f)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(f)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
