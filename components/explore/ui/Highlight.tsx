"use client";

export default function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const q = query.trim().toLowerCase();
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q
          ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
