"use client";

import { useState } from "react";
import Highlight from "./Highlight";

export default function TextPreview({ text, query }: { text: string; query?: string }) {
  const [expanded, setExpanded] = useState(false);
  const words = text.trim().split(/\s+/);
  const isLong = words.length > 30;
  const display = expanded ? text : (isLong ? words.slice(0, 30).join(" ") + "…" : text);

  return (
    <div className="text-sm text-(--text-secondary) leading-relaxed">
      <Highlight text={display} query={query || ""} />
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="ml-2 inline-flex text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
