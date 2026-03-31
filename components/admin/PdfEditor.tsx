"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RectangleData, DrawingMode, RectangleCreateInput } from "@/lib/types";
import PdfCanvas from "./PdfCanvas";
import PropertiesPanel from "./PropertiesPanel";
import ToolBar from "./ToolBar";

type Props = {
  documentId: string;
  documentTitle: string;
  pageCount: number;
};

export default function PdfEditor({ documentId, documentTitle, pageCount }: Props) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("select");
  const [rectangles, setRectangles] = useState<RectangleData[]>([]);
  const [allRectangles, setAllRectangles] = useState<RectangleData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const pdfUrl = `/api/documents/${documentId}/pdf`;

  // Global keyboard shortcuts for mode switching
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case "v":
          setDrawingMode("select");
          break;
        case "f":
          setDrawingMode("fullWidth");
          setSelectedId(null);
          break;
        case "r":
          setDrawingMode("freeRect");
          setSelectedId(null);
          break;
        case "escape":
          setDrawingMode("select");
          setSelectedId(null);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch all document rectangles (for parent selection dropdown).
  // Use pageSize=300 (API max) to load as many as possible in one request.
  const fetchAllRectangles = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/rectangles?pageSize=300`);
    if (res.ok) {
      const data = await res.json();
      setAllRectangles(data.items ?? []);
    }
  }, [documentId]);

  // Fetch rectangles for the current PDF page.
  // The API paginates results; we pass pdfPage to filter by page number.
  const fetchPageRectangles = useCallback(async () => {
    const res = await fetch(
      `/api/documents/${documentId}/rectangles?pdfPage=${currentPage}&pageSize=300`
    );
    if (res.ok) {
      const data = await res.json();
      setRectangles(data.items ?? []);
    }
  }, [documentId, currentPage]);

  useEffect(() => {
    fetchPageRectangles();
  }, [fetchPageRectangles]);

  useEffect(() => {
    fetchAllRectangles();
  }, [fetchAllRectangles]);

  const selectedRect = rectangles.find((r) => r.id === selectedId) || null;

  // ---------- CRUD handlers ----------

  async function handleCreate(input: Omit<RectangleCreateInput, "documentId">) {
    const res = await fetch(`/api/documents/${documentId}/rectangles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, documentId }),
    });

    if (res.ok) {
      const created = await res.json();
      setRectangles((prev) => [...prev, created]);
      setAllRectangles((prev) => [...prev, created]);
      setSelectedId(created.id);
      setDrawingMode("select");
      return created;
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create rectangle.");
      return null;
    }
  }

  async function handleUpdate(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/rectangles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setRectangles((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setAllRectangles((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update rectangle.");
      return null;
    }
  }

  async function handleDeleteRect(id: string) {
    const res = await fetch(`/api/rectangles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRectangles((prev) => prev.filter((r) => r.id !== id));
      setAllRectangles((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  }

  // ---------- Auto-analyze ----------

  async function handleAnalyze() {
    const hasRectangles = allRectangles.length > 0;
    const msg = hasRectangles
      ? "This will DELETE all existing rectangles and re-analyze the document from scratch.\n\nContinue?"
      : "Auto-detect text blocks from the PDF?\n\nYou can edit or delete the results afterward.";

    if (!confirm(msg)) return;

    setAnalyzing(true);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/analyze?clear=${hasRectangles}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Analysis failed.");
        return;
      }

      alert(`Done! ${data.created} rectangles detected.`);

      // Refresh rectangles
      await fetchPageRectangles();
      await fetchAllRectangles();
      setSelectedId(null);
    } catch {
      alert("Network error during analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ---------- Delete document ----------

  async function handleDeleteDoc() {
    if (!confirm("Permanently delete this document and ALL its rectangles?\n\nThis cannot be undone."))
      return;

    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete document.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <ToolBar
        documentTitle={documentTitle}
        currentPage={currentPage}
        pageCount={pageCount}
        drawingMode={drawingMode}
        analyzing={analyzing}
        onPageChange={setCurrentPage}
        onModeChange={(mode) => {
          setDrawingMode(mode);
          if (mode !== "select") setSelectedId(null);
        }}
        onAnalyze={handleAnalyze}
        onDelete={handleDeleteDoc}
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* PDF canvas area */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <PdfCanvas
            pdfUrl={pdfUrl}
            page={currentPage}
            rectangles={rectangles}
            selectedId={selectedId}
            drawingMode={drawingMode}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
          />
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          rectangle={selectedRect}
          allRectangles={allRectangles}
          documentId={documentId}
          onUpdate={handleUpdate}
          onDelete={handleDeleteRect}
          onDeselect={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}
