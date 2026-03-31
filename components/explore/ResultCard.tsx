"use client";

import type { RectClient, Lang } from "./shared";
import { getText, buildPath, typeStyle, TYPE_LABEL, truncate } from "./shared";
import TypeBadge from "./ui/TypeBadge";
import RectCrop from "./RectCrop";
import TextPreview from "./ui/TextPreview";

function ChevronSmall() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function ResultCard({
  rect,
  rectById,
  docId,
  lang,
  query,
  onLightbox,
}: {
  rect: RectClient;
  rectById: Map<string, RectClient>;
  docId: string;
  lang: Lang;
  query: string;
  onLightbox: (rect: RectClient) => void;
}) {
  const path = buildPath(rect, rectById);
  const text = getText(rect, lang);

  return (
    <div className="bg-white rounded-2xl border border-gray-100/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col pt-1">
      {/* Top accent line */}
      <div className={`h-1 w-full ${typeStyle(rect.type).accent}`} />

      {/* Breadcrumb */}
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-center gap-1.5">
        {path.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1.5">
            {i > 0 && <ChevronSmall />}
            <TypeBadge type={node.type} />
            <span className="text-xs font-medium text-gray-500 truncate max-w-24 text-balance">
              {truncate(getText(node, lang), 24) || TYPE_LABEL[node.type]}
            </span>
          </span>
        ))}
        <span className="ml-auto text-xs text-gray-400 tabular-nums shrink-0">p.{rect.page}</span>
      </div>

      {/* Screenshot */}
      <div className="px-5 pb-4">
        <div
          className="rounded-xl overflow-hidden bg-gray-50 cursor-zoom-in ring-1 ring-inset ring-gray-900/5 transition-all hover:ring-gray-900/10"
          onClick={() => onLightbox(rect)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onLightbox(rect)}
          aria-label={`View full image — ${TYPE_LABEL[rect.type] ?? rect.type}, page ${rect.page}`}
        >
          <div className="p-3">
            <RectCrop docId={docId} rect={rect} thumb onClick={() => onLightbox(rect)} />
          </div>
        </div>
      </div>

      {/* Text snippet */}
      {text && query && (
        <div className="px-5 pb-5 mt-auto" onClick={(e) => e.stopPropagation()}>
          <TextPreview text={text} query={query} />
        </div>
      )}

      {/* Labels */}
      {rect.labels.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {rect.labels.map((l) => (
            <span
              key={l}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-600 ring-1 ring-gray-200/50"
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
