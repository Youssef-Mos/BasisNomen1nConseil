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
  documentId,
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
      <div className="w-80 border-l border-gray-200 bg-white p-4 shrink-0">
        <p className="text-sm text-gray-400 text-center mt-8">
          Select a rectangle to edit its properties
        </p>
      </div>
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
      // Refresh text fields from the server response (may have been re-extracted)
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

      // Update text field with extracted text
      setTextFr(data.text || "");

      // Also update parent state via onUpdate to sync UI
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
    <div className="w-80 border-l border-gray-200 bg-white shrink-0 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Properties</h3>
        <button
          onClick={onDeselect}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Close
        </button>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* ID */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            ID
          </label>
          <p className="text-xs font-mono text-gray-500 truncate">{rectangle.id}</p>
        </div>

        {/* Position (read-only summary) */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Position
          </label>
          <p className="text-xs text-gray-500">
            Page {rectangle.page} — ({rectangle.x.toFixed(1)}, {rectangle.y.toFixed(1)}) {rectangle.width.toFixed(1)}x{rectangle.height.toFixed(1)}
          </p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RectangleType)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {RECTANGLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Parent */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Parent
          </label>
          <ParentSelector
            value={fatherId}
            onChange={setFatherId}
            possibleParents={possibleParents}
            currentRectangle={rectangle}
          />
        </div>

        {/* Labels */}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Labels <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={labelsStr}
            onChange={(e) => setLabelsStr(e.target.value)}
            placeholder="e.g. civil, property, art-42"
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {inheritedLabels.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              Inherited: {inheritedLabels.join(", ")}
            </p>
          )}
        </div>

        {/* Text (FR) with re-extract button */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Text (FR)
            </label>
            <button
              type="button"
              onClick={handleReExtract}
              disabled={extracting}
              className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              title="Re-extract text from the current rectangle area on the PDF"
            >
              {extracting ? "Extracting..." : "Re-extract"}
            </button>
          </div>
          <textarea
            value={textFr}
            onChange={(e) => setTextFr(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
          {extractError && (
            <p className="text-[10px] text-red-500 mt-0.5">{extractError}</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Text (EN)
          </label>
          <textarea
            value={textEn}
            onChange={(e) => setTextEn(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
            Text (NL)
          </label>
          <textarea
            value={textNl}
            onChange={(e) => setTextNl(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full px-3 py-1.5 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 ${
            saveSuccess
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-full px-3 py-1.5 bg-white text-red-600 text-xs font-medium rounded border border-red-200 hover:bg-red-50 transition-colors"
        >
          Delete Rectangle
        </button>
      </div>
    </div>
  );
}
