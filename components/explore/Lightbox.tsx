"use client";

import { useEffect } from "react";
import type { RectClient } from "./shared";
import TypeBadge from "./ui/TypeBadge";
import RectCrop from "./RectCrop";

function CloseIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function Lightbox({
  docId,
  rect,
  onClose,
}: {
  docId: string;
  rect: RectClient;
  onClose: () => void;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-(--bg-surface) rounded-3xl shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col max-h-[90vh] ring-1 ring-black/10 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-default) bg-(--bg-page)">
          <div className="flex items-center gap-2.5">
            <TypeBadge type={rect.type} />
            <span className="text-sm text-(--text-muted)">Page {rect.page}</span>
          </div>
          <button
            onClick={onClose}
            className="text-(--text-muted) hover:text-(--text-primary) p-2 rounded-xl hover:bg-(--bg-surface-2) transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-8 overflow-auto bg-(--bg-page) flex items-center justify-center">
          <div className="bg-(--bg-surface) p-4 rounded-xl shadow-sm border border-(--border-default) max-w-full">
            <RectCrop docId={docId} rect={rect} thumb={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
