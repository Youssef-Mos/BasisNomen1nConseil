"use client";

import { useRef, useEffect, useState } from "react";
import type { RectangleData, DrawingMode, RectangleCreateInput } from "@/lib/types";
import type { PDFDocumentProxy } from "pdfjs-dist";

const SCALE = 1.5;

// Type colors based on rectangle type
const TYPE_COLORS: Record<string, string> = {
  phrase: "rgba(59, 130, 246, 0.25)",
  paragraph: "rgba(16, 185, 129, 0.25)",
  article: "rgba(245, 158, 11, 0.25)",
  section: "rgba(139, 92, 246, 0.25)",
  figure: "rgba(236, 72, 153, 0.25)",
  table: "rgba(6, 182, 212, 0.25)",
  formula: "rgba(249, 115, 22, 0.25)",
  annexe: "rgba(107, 114, 128, 0.25)",
};

const TYPE_BORDERS: Record<string, string> = {
  phrase: "rgba(59, 130, 246, 0.7)",
  paragraph: "rgba(16, 185, 129, 0.7)",
  article: "rgba(245, 158, 11, 0.7)",
  section: "rgba(139, 92, 246, 0.7)",
  figure: "rgba(236, 72, 153, 0.7)",
  table: "rgba(6, 182, 212, 0.7)",
  formula: "rgba(249, 115, 22, 0.7)",
  annexe: "rgba(107, 114, 128, 0.7)",
};

type Props = {
  pdfUrl: string;
  page: number;
  rectangles: RectangleData[];
  selectedId: string | null;
  drawingMode: DrawingMode;
  onSelect: (id: string | null) => void;
  onCreate: (input: Omit<RectangleCreateInput, "documentId">) => Promise<unknown>;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<unknown>;
};

type DrawState =
  | null
  | { type: "fullWidth"; y1: number }
  | { type: "freeRect"; x1: number; y1: number };

export default function PdfCanvas({
  pdfUrl,
  page,
  rectangles,
  selectedId,
  drawingMode,
  onSelect,
  onCreate,
  onUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [drawState, setDrawState] = useState<DrawState>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pdfLoading, setPdfLoading] = useState(true);

  // Drag state for moving rectangles
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Resize state
  const resizeRef = useRef<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    origRect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Load PDF and render page
  useEffect(() => {
    let cancelled = false;

    async function render() {
      setPdfLoading(true);
      try {
        const { pdfjsLib } = await import("@/lib/pdf-worker");

        if (!pdfDocRef.current) {
          const loadingTask = pdfjsLib.getDocument(pdfUrl);
          pdfDocRef.current = await loadingTask.promise;
        }

        const pdf = pdfDocRef.current;
        if (cancelled || !pdf) return;

        const pdfPage = await pdf.getPage(page);
        const viewport = pdfPage.getViewport({ scale: SCALE });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasSize({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        setPdfLoading(false);
      } catch (err) {
        console.error("PDF render error:", err);
        setPdfLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, page]);

  // Cancel drawing preview when mode changes
  useEffect(() => {
    setDrawState(null);
  }, [drawingMode]);

  function pxToPercent(px: number, total: number) {
    return (px / total) * 100;
  }

  function percentToPx(pct: number, total: number) {
    return (pct / 100) * total;
  }

  function getRelativePos(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // Handle click on the canvas area
  function handleOverlayClick(e: React.MouseEvent) {
    // Ignore clicks while dragging/resizing
    if (dragRef.current || resizeRef.current) return;

    if (drawingMode === "select") {
      onSelect(null);
      return;
    }

    const pos = getRelativePos(e);

    if (drawingMode === "fullWidth") {
      if (!drawState) {
        setDrawState({ type: "fullWidth", y1: pos.y });
      } else if (drawState.type === "fullWidth") {
        const y1Pct = pxToPercent(Math.min(drawState.y1, pos.y), canvasSize.height);
        const y2Pct = pxToPercent(Math.max(drawState.y1, pos.y), canvasSize.height);
        const heightPct = y2Pct - y1Pct;

        if (heightPct < 0.5) {
          setDrawState(null);
          return;
        }

        onCreate({ page, x: 0, y: y1Pct, width: 100, height: heightPct });
        setDrawState(null);
      }
    } else if (drawingMode === "freeRect") {
      if (!drawState) {
        setDrawState({ type: "freeRect", x1: pos.x, y1: pos.y });
      } else if (drawState.type === "freeRect") {
        const x1 = Math.min(drawState.x1, pos.x);
        const y1 = Math.min(drawState.y1, pos.y);
        const x2 = Math.max(drawState.x1, pos.x);
        const y2 = Math.max(drawState.y1, pos.y);

        const xPct = pxToPercent(x1, canvasSize.width);
        const yPct = pxToPercent(y1, canvasSize.height);
        const wPct = pxToPercent(x2 - x1, canvasSize.width);
        const hPct = pxToPercent(y2 - y1, canvasSize.height);

        if (wPct < 0.5 || hPct < 0.5) {
          setDrawState(null);
          return;
        }

        onCreate({ page, x: xPct, y: yPct, width: wPct, height: hPct });
        setDrawState(null);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pos = getRelativePos(e);
    setMousePos(pos);

    if (dragRef.current) {
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      const newX = dragRef.current.origX + pxToPercent(dx, canvasSize.width);
      const newY = dragRef.current.origY + pxToPercent(dy, canvasSize.height);
      const el = document.getElementById(`rect-${dragRef.current.id}`);
      if (el) {
        el.style.left = `${percentToPx(Math.max(0, newX), canvasSize.width)}px`;
        el.style.top = `${percentToPx(Math.max(0, newY), canvasSize.height)}px`;
      }
      return;
    }

    if (resizeRef.current) {
      const r = resizeRef.current;
      const dx = pxToPercent(pos.x - r.startX, canvasSize.width);
      const dy = pxToPercent(pos.y - r.startY, canvasSize.height);
      const el = document.getElementById(`rect-${r.id}`);
      if (!el) return;

      let { x, y, width, height } = r.origRect;
      if (r.handle.includes("e")) width = Math.max(1, width + dx);
      if (r.handle.includes("s")) height = Math.max(1, height + dy);
      if (r.handle.includes("w")) { x += dx; width = Math.max(1, width - dx); }
      if (r.handle.includes("n")) { y += dy; height = Math.max(1, height - dy); }

      el.style.left = `${percentToPx(x, canvasSize.width)}px`;
      el.style.top = `${percentToPx(y, canvasSize.height)}px`;
      el.style.width = `${percentToPx(width, canvasSize.width)}px`;
      el.style.height = `${percentToPx(height, canvasSize.height)}px`;
    }
  }

  function handleMouseUp() {
    if (dragRef.current) {
      const el = document.getElementById(`rect-${dragRef.current.id}`);
      if (el) {
        const newX = (parseFloat(el.style.left) / canvasSize.width) * 100;
        const newY = (parseFloat(el.style.top) / canvasSize.height) * 100;
        onUpdate(dragRef.current.id, {
          x: Math.max(0, Math.min(100, newX)),
          y: Math.max(0, Math.min(100, newY)),
        });
      }
      dragRef.current = null;
      return;
    }

    if (resizeRef.current) {
      const el = document.getElementById(`rect-${resizeRef.current.id}`);
      if (el) {
        const x = (parseFloat(el.style.left) / canvasSize.width) * 100;
        const y = (parseFloat(el.style.top) / canvasSize.height) * 100;
        const width = (parseFloat(el.style.width) / canvasSize.width) * 100;
        const height = (parseFloat(el.style.height) / canvasSize.height) * 100;
        onUpdate(resizeRef.current.id, {
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.max(1, width),
          height: Math.max(1, height),
        });
      }
      resizeRef.current = null;
    }
  }

  function handleRectClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (drawingMode === "select") {
      onSelect(id);
    }
  }

  function handleRectMouseDown(e: React.MouseEvent, rect: RectangleData) {
    if (drawingMode !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    dragRef.current = {
      id: rect.id,
      startX: pos.x,
      startY: pos.y,
      origX: rect.x,
      origY: rect.y,
    };
  }

  function handleResizeMouseDown(e: React.MouseEvent, rect: RectangleData, handle: string) {
    if (drawingMode !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getRelativePos(e);
    resizeRef.current = {
      id: rect.id,
      handle,
      startX: pos.x,
      startY: pos.y,
      origRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  }

  // Cursor style
  let cursor = "default";
  if (drawingMode === "fullWidth") cursor = "crosshair";
  if (drawingMode === "freeRect") cursor = "crosshair";

  // Mode instruction text
  const modeHint =
    drawingMode === "fullWidth"
      ? drawState
        ? "Click to set the bottom edge"
        : "Click to set the top edge"
      : drawingMode === "freeRect"
        ? drawState
          ? "Click to set the bottom-right corner"
          : "Click to set the top-left corner"
        : null;

  return (
    <div className="flex flex-col items-center p-4">
      {/* Mode indicator banner */}
      {drawingMode !== "select" && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-md flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>
            {drawingMode === "fullWidth" ? "FULL WIDTH" : "FREE RECTANGLE"} mode
            {modeHint && <span className="font-normal ml-1">— {modeHint}</span>}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs"
          >
            Esc to cancel
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative inline-block shadow-lg"
        style={{
          width: canvasSize.width || "auto",
          height: canvasSize.height || "auto",
          cursor,
        }}
        onClick={handleOverlayClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* PDF canvas */}
        <canvas ref={canvasRef} className="block" />

        {pdfLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
            <span className="text-sm text-(--text-muted)">Loading page...</span>
          </div>
        )}

        {/* Existing rectangles overlay */}
        {rectangles.map((rect) => {
          const left = percentToPx(rect.x, canvasSize.width);
          const top = percentToPx(rect.y, canvasSize.height);
          const w = percentToPx(rect.width, canvasSize.width);
          const h = percentToPx(rect.height, canvasSize.height);
          const isSelected = rect.id === selectedId;
          const bgColor = TYPE_COLORS[rect.type] || TYPE_COLORS.paragraph;
          const borderColor = TYPE_BORDERS[rect.type] || TYPE_BORDERS.paragraph;

          return (
            <div
              key={rect.id}
              id={`rect-${rect.id}`}
              className="absolute"
              style={{
                left,
                top,
                width: w,
                height: h,
                backgroundColor: bgColor,
                border: `${isSelected ? 2 : 1}px solid ${isSelected ? "#2563eb" : borderColor}`,
                zIndex: isSelected ? 20 : 10,
              }}
              onClick={(e) => handleRectClick(e, rect.id)}
              onMouseDown={(e) => handleRectMouseDown(e, rect)}
            >
              {/* Label badge */}
              <span
                className="absolute -top-4 left-0 text-[9px] font-mono px-1 rounded whitespace-nowrap pointer-events-none"
                style={{ backgroundColor: borderColor, color: "white" }}
              >
                {rect.type}
                {rect.labels.length > 0 && ` [${rect.labels.join(", ")}]`}
              </span>

              {/* Resize handles */}
              {isSelected && drawingMode === "select" &&
                ["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((handle) => {
                  const style: React.CSSProperties = {
                    position: "absolute",
                    width: 8,
                    height: 8,
                    backgroundColor: "#2563eb",
                    border: "1px solid white",
                    zIndex: 30,
                  };
                  if (handle.includes("n")) style.top = -4;
                  if (handle.includes("s")) style.bottom = -4;
                  if (handle.includes("w")) style.left = -4;
                  if (handle.includes("e")) style.right = -4;
                  if (handle === "n" || handle === "s") { style.left = "50%"; style.marginLeft = -4; }
                  if (handle === "w" || handle === "e") { style.top = "50%"; style.marginTop = -4; }
                  const cursors: Record<string, string> = {
                    nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
                    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
                  };
                  style.cursor = cursors[handle];
                  return (
                    <div
                      key={handle}
                      style={style}
                      onMouseDown={(e) => handleResizeMouseDown(e, rect, handle)}
                    />
                  );
                })}
            </div>
          );
        })}

        {/* Drawing preview: full-width */}
        {drawState?.type === "fullWidth" && (
          <>
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 pointer-events-none"
              style={{ top: drawState.y1, zIndex: 40 }}
            />
            <div
              className="absolute left-0 right-0 bg-blue-300/30 border border-dashed border-blue-400 pointer-events-none"
              style={{
                top: Math.min(drawState.y1, mousePos.y),
                height: Math.abs(mousePos.y - drawState.y1),
                zIndex: 40,
              }}
            />
          </>
        )}

        {/* Drawing preview: free rect */}
        {drawState?.type === "freeRect" && (
          <div
            className="absolute bg-blue-300/30 border-2 border-dashed border-blue-500 pointer-events-none"
            style={{
              left: Math.min(drawState.x1, mousePos.x),
              top: Math.min(drawState.y1, mousePos.y),
              width: Math.abs(mousePos.x - drawState.x1),
              height: Math.abs(mousePos.y - drawState.y1),
              zIndex: 40,
            }}
          />
        )}

        {/* Crosshair guides when in drawing mode */}
        {drawingMode !== "select" && canvasSize.width > 0 && (
          <>
            <div
              className="absolute left-0 right-0 border-t border-blue-400/40 pointer-events-none"
              style={{ top: mousePos.y, zIndex: 35 }}
            />
            {drawingMode === "freeRect" && (
              <div
                className="absolute top-0 bottom-0 border-l border-blue-400/40 pointer-events-none"
                style={{ left: mousePos.x, zIndex: 35 }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
