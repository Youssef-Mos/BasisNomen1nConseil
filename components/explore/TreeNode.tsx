"use client";

import type { RectClient, Lang, TreeMap } from "./shared";
import { getText, getEffectiveLabels, TYPE_LABEL, truncate } from "./shared";
import TypeBadge from "./ui/TypeBadge";
import RectCrop from "./RectCrop";
import TextPreview from "./ui/TextPreview";

const LEVEL_INDENT = 12;  // px per depth level
const MAX_INDENT_LEVEL = 5; // stop indenting beyond this level

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transition: "transform 0.18s ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
      }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function TreeNode({
  rect,
  docId,
  lang,
  treeMap,
  rectById,
  level,
  openIds,
  onToggle,
  onLightbox,
}: {
  rect: RectClient;
  docId: string;
  lang: Lang;
  treeMap: TreeMap;
  rectById: Map<string, RectClient>;
  level: number;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onLightbox: (rect: RectClient) => void;
}) {
  const children = treeMap.get(rect.id) ?? [];
  const isOpen = openIds.has(rect.id);
  const text = getText(rect, lang);

  const cappedLevel = Math.min(level, MAX_INDENT_LEVEL);
  const rowIndent = cappedLevel * LEVEL_INDENT;
  const contentIndent = rowIndent + 36; // aligns with text after badge + chevron

  return (
    <div
      className={
        level === 0
          ? "rounded-2xl overflow-hidden bg-(--bg-surface) shadow-[0_1px_8px_rgba(0,0,0,0.06)] border border-(--border-default)"
          : ""
      }
    >
      {/* ── Row ─────────────────────────────────────────────────────────── */}
      <div
        style={{ paddingLeft: `${rowIndent + 20}px` }}
        className={`flex items-center gap-x-4 pr-6 py-4 min-w-0 overflow-hidden cursor-pointer select-none transition-colors duration-100 ${
          isOpen ? "bg-(--bg-surface)" : "bg-(--bg-surface) hover:bg-(--bg-surface-2)"
        }`}
        role="button"
        tabIndex={0}
        aria-label={`${TYPE_LABEL[rect.type] ?? rect.type}${text ? ` — ${truncate(text, 60)}` : ""}, page ${rect.page}`}
        onClick={() => onToggle(rect.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle(rect.id)}
      >
        {/* Chevron */}
        <span className={children.length > 0 ? "text-(--text-muted)" : "text-transparent"}>
          <ChevronIcon open={isOpen} />
        </span>

        <TypeBadge type={rect.type} />

        <span className="flex-1 min-w-0 text-[15px] font-medium text-(--text-primary) leading-snug">
          {text
            ? <span className="truncate block">{truncate(text, 120)}</span>
            : <span className="italic text-(--text-muted) text-sm">No text content</span>}
        </span>

        <span className="shrink-0 ml-auto pl-2 text-xs text-(--text-muted) tabular-nums">
          p.{rect.page}
        </span>
      </div>

      {/* ── Expanded content ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{ paddingLeft: `${contentIndent}px` }}
          className="pr-6 pb-6 pt-4 bg-(--bg-page) border-t border-(--border-default)"
        >
          {/* Screenshot card */}
          <div
            className="bg-(--bg-surface) rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.07)] overflow-hidden mb-5 cursor-zoom-in"
            onClick={() => onLightbox(rect)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onLightbox(rect)}
            aria-label={`View full image — ${TYPE_LABEL[rect.type] ?? rect.type}, p.${rect.page}`}
          >
            {/* Image container */}
            <div className="p-5 bg-(--bg-page) flex items-center justify-center">
              <RectCrop docId={docId} rect={rect} thumb onClick={() => onLightbox(rect)} />
            </div>

            {/* Text caption */}
            {text && (
              <div
                className="px-5 py-4 border-t border-(--border-default) bg-(--bg-surface)"
                onClick={(e) => e.stopPropagation()}
              >
                <TextPreview text={text} />
              </div>
            )}
          </div>

          {/* Effective labels (own + inherited) */}
          {(() => {
            const effective = getEffectiveLabels(rect, rectById);
            const ownSet = new Set(rect.labels);
            if (effective.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {effective.map((l) => (
                  <span
                    key={l}
                    className={`text-[10px] font-medium px-2 py-1 rounded-md ring-1 ${
                      ownSet.has(l)
                        ? "bg-(--bg-page) text-(--text-secondary) ring-(--border-default)"
                        : "bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-blue-200/50 dark:ring-blue-800/50 italic"
                    }`}
                    title={ownSet.has(l) ? "Own label" : "Inherited from parent"}
                  >
                    {l}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Children with left guide */}
          {children.length > 0 && (
            <div className="border-l border-(--border-default) pl-4 space-y-1">
              {children.map((child) => (
                <TreeNode
                  key={child.id}
                  rect={child}
                  docId={docId}
                  lang={lang}
                  treeMap={treeMap}
                  rectById={rectById}
                  level={level + 1}
                  openIds={openIds}
                  onToggle={onToggle}
                  onLightbox={onLightbox}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
