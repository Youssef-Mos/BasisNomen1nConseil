"use client";

import { useState, useEffect } from "react";
import { RECTANGLE_TYPES } from "@/lib/types";
import type { RectangleData, RectangleType } from "@/lib/types";
import ParentSelector from "./ParentSelector";

type Props = {
  rectangle: RectangleData | null;
  allRectangles: RectangleData[];
  documentId: string;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: string) => void;
  onDeselect: () => void;
};

export default function PropertiesPanel({
  rectangle,
  allRectangles,
  documentId: _documentId,
  onUpdate,
  onDelete,
  onDeselect,
}: Props) {
  const [type, setType] = useState<RectangleType>("paragraph");
  const [fatherId, setFatherId] = useState<string>("");
  const [labelsStr, setLabelsStr] = useState("");
  const [textFr, setTextFr] = useState("");
  const [textEn, setTextEn] = useState("");
  const [textNl, setTextNl] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form state when selection changes
  useEffect(() => {
    if (rectangle) {
      setType(rectangle.type);
      setFatherId(rectangle.fatherId || "");
      setLabelsStr(rectangle.labels.join(", "));
      setTextFr(rectangle.textFr || "");
      setTextEn(rectangle.textEn || "");
      setTextNl(rectangle.textNl || "");
      setExtractError(null);
      setSaveSuccess(false);
    }
  }, [rectangle]);

  if (!rectangle) {
    return (
      <aside className="w-80 xl:w-96 min-w-70 border-l border-gray-200 bg-white shrink-0 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Select a rectangle to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  // Compute inherited labels from parent chain
  function getInheritedLabels(rectId: string | null): string[] {
    const labels: string[] = [];
    let currentId = rectId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const parent = allRectangles.find((r) => r.id === currentId);
      if (parent) {
        labels.push(...parent.labels);
        currentId = parent.fatherId;
      } else {
        break;
      }
    }

    return [...new Set(labels)];
  }

  const inheritedLabels = getInheritedLabels(rectangle.fatherId);

  // Possible parents: all rectangles in this document except self and descendants
  function getDescendantIds(id: string): Set<string> {
    const ids = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);
      allRectangles
        .filter((r) => r.fatherId === current)
        .forEach((r) => queue.push(r.id));
    }
    return ids;
  }

  const excludeIds = getDescendantIds(rectangle.id);
  const possibleParents = allRectangles.filter(
    (r) => !excludeIds.has(r.id)
  );

  async function handleSave() {
    setSaving(true);
    setExtractError(null);
    setSaveSuccess(false);

    const labels = labelsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await onUpdate(rectangle!.id, {
      type,
      fatherId: fatherId || null,
      labels,
      textFr: textFr || null,
      textEn: textEn || null,
      textNl: textNl || null,
    });

    if (result) {
      const updated = result as RectangleData;
      if (updated.textFr !== undefined) setTextFr(updated.textFr || "");
      if (updated.textEn !== undefined) setTextEn(updated.textEn || "");
      if (updated.textNl !== undefined) setTextNl(updated.textNl || "");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }

    setSaving(false);
  }

  async function handleReExtract() {
    setExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch(`/api/rectangles/${rectangle!.id}/extract-text`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Extraction failed.");
        return;
      }

      setTextFr(data.text || "");

      if (data.rectangle) {
        await onUpdate(rectangle!.id, {
          textFr: data.text,
        });
      }
    } catch {
      setExtractError("Network error during extraction.");
    } finally {
      setExtracting(false);
    }
  }

  function handleDeleteClick() {
    if (confirm("Delete this rectangle? This cannot be undone.")) {
      onDelete(rectangle!.id);
    }
  }

  return (
    <aside className="w-80 xl:w-96 min-w-70 border-l border-gray-200 bg-white shrink-0 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/60 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Properties</h3>
        <button
          onClick={onDeselect}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-5">

          {/* — Read-only metadata — */}
          <div className="space-y-3 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                ID
              </label>
              <p className="text-xs font-mono text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100 truncate">
                {rectangle.id}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Position
              </label>
              <p className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100 leading-relaxed">
                Page {rectangle.page} &mdash; ({rectangle.x.toFixed(1)}, {rectangle.y.toFixed(1)})
                &ensp;{rectangle.width.toFixed(1)} &times; {rectangle.height.toFixed(1)}
              </p>
            </div>
          </div>

          {/* — Classification — */}
          <div className="space-y-4 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RectangleType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              >
                {RECTANGLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Parent
              </label>
              <ParentSelector
                value={fatherId}
                onChange={setFatherId}
                possibleParents={possibleParents}
                currentRectangle={rectangle}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Labels{" "}
                <span className="font-normal normal-case text-gray-400">
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={labelsStr}
                onChange={(e) => setLabelsStr(e.target.value)}
                placeholder="e.g. civil, property, art-42"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {inheritedLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  <span className="text-xs text-gray-400 shrink-0">Inherited:</span>
                  {inheritedLabels.map((label) => (
                    <span
                      key={label}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* — Text content — */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Text (FR)
                </label>
                <button
                  type="button"
                  onClick={handleReExtract}
                  disabled={extracting}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  title="Re-extract text from the current rectangle area on the PDF"
                >
                  {extracting ? "Extracting..." : "Re-extract"}
                </button>
              </div>
              <textarea
                value={textFr}
                onChange={(e) => setTextFr(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
              />
              {extractError && (
                <p className="text-xs text-red-500 mt-1.5">{extractError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Text (EN)
              </label>
              <textarea
                value={textEn}
                onChange={(e) => setTextEn(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Text (NL)
              </label>
              <textarea
                value={textNl}
                onChange={(e) => setTextNl(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Sticky action footer */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-2.5 shrink-0 bg-gray-50/60">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full px-4 py-2.5 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
            saveSuccess
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-full px-4 py-2.5 bg-white text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-50 transition-colors"
        >
          Delete Rectangle
        </button>
      </div>
    </aside>
  );
}
