"use client";

import { typeStyle, TYPE_LABEL } from "../shared";

export default function TypeBadge({ type }: { type: string }) {
  const { badge } = typeStyle(type);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none shrink-0 max-w-24 truncate tracking-wide transition-colors duration-150 ${badge}`}
    >
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}
