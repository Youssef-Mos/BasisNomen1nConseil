"use client";

import { useState, useEffect } from "react";
import { cropImageUrl, pageImageUrl, PAGE_ASPECT, TYPE_LABEL } from "./shared";
import type { RectClient } from "./shared";

// ─── RectCrop ─────────────────────────────────────────────────────────────────
//
// Renders a rectangle region of a PDF page as an image.
//
// thumb=true  → Used in accordion cards. Image constrained to max-h-52.
//               Prevents small regions from blowing up to full container width.
// thumb=false → Used in the lightbox. No height constraint.
//
// Primary source: crops/{rectId}.png  (200 DPI, pre-generated)
// Fallback:       CSS crop of the full page PNG
//   container paddingBottom = (h/w) × PAGE_ASPECT × 100%
//   img width               = (100/w) × 100%
//   img left                = -(x/w)  × 100%
//   img top                 = -(y/h)  × 100%

export default function RectCrop({
  docId,
  rect,
  thumb = true,
  onClick,
}: {
  docId: string;
  rect: RectClient;
  thumb?: boolean;
  onClick?: () => void;
}) {
  const [cropFailed, setCropFailed] = useState(false);
  const [pageFailed, setPageFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCropFailed(false);
    setPageFailed(false);
    setLoaded(false);
  }, [rect.id]);

  const w = Math.max(rect.width, 0.5);
  const h = Math.max(rect.height, 0.5);
  const alt = `${TYPE_LABEL[rect.type] ?? rect.type} — p.${rect.page}`;
  const clickProps = onClick
    ? {
        onClick,
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onClick(),
      }
    : {};

  const wrapCls = `bg-(--bg-page) flex items-center justify-center overflow-hidden ${onClick ? "cursor-zoom-in" : ""}`;

  // Both sources failed
  if (cropFailed && pageFailed) {
    return (
      <div className={`${wrapCls} py-8 gap-2 flex-col`} {...clickProps}>
        <svg
          className="w-5 h-5 text-(--text-muted)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9l4-4 4 4 4-4 4 4" />
        </svg>
        <span className="text-xs text-(--text-muted)">Image unavailable</span>
      </div>
    );
  }

  const spinner = (
    <div className="flex items-center justify-center py-8">
      <div className="w-4 h-4 border-2 border-(--border-default) border-t-blue-400 rounded-full animate-spin" />
    </div>
  );

  // ── Pre-cropped image ──────────────────────────────────────────────────────
  if (!cropFailed) {
    const imgCls = thumb
      ? "max-h-52 w-auto max-w-full object-contain block mx-auto rounded-lg shadow-sm"
      : "w-full h-auto block";

    return (
      <div className={wrapCls} {...clickProps}>
        {!loaded && spinner}
        <img
          key={rect.id + docId}
          src={cropImageUrl(docId, rect.id)}
          alt={alt}
          draggable={false}
          className={imgCls}
          style={{ display: loaded ? "block" : "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => { setCropFailed(true); setLoaded(false); }}
        />
      </div>
    );
  }

  // ── CSS crop fallback ──────────────────────────────────────────────────────
  // Audit fix: keep overflow on the inline style only (no duplicate Tailwind overflow-hidden)
  const pb = `${(h / w) * PAGE_ASPECT * 100}%`;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        paddingBottom: thumb ? `min(${pb}, 13rem)` : pb,
      }}
      className={`bg-(--bg-page) flex items-center justify-center ${onClick ? "cursor-zoom-in" : ""}`}
      {...clickProps}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">{spinner}</div>
      )}
      <img
        key={rect.id + docId + "page"}
        src={pageImageUrl(docId, rect.page)}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => { setLoaded(true); setPageFailed(true); }}
        style={{
          position: "absolute",
          width: `${(100 / w) * 100}%`,
          height: "auto",
          left: `${-(rect.x / w) * 100}%`,
          top: `${-(rect.y / h) * 100}%`,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease",
          maxWidth: "none",
        }}
      />
    </div>
  );
}
