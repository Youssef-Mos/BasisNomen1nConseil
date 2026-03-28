import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// Type colors for visual distinction
const TYPE_BG: Record<string, string> = {
  phrase: "bg-blue-50 border-blue-200",
  paragraph: "bg-green-50 border-green-200",
  article: "bg-amber-50 border-amber-200",
  section: "bg-purple-50 border-purple-200",
  figure: "bg-pink-50 border-pink-200",
  table: "bg-cyan-50 border-cyan-200",
  formula: "bg-orange-50 border-orange-200",
  annexe: "bg-gray-50 border-gray-200",
};

const TYPE_BADGE: Record<string, string> = {
  phrase: "bg-blue-100 text-blue-700",
  paragraph: "bg-green-100 text-green-700",
  article: "bg-amber-100 text-amber-700",
  section: "bg-purple-100 text-purple-700",
  figure: "bg-pink-100 text-pink-700",
  table: "bg-cyan-100 text-cyan-700",
  formula: "bg-orange-100 text-orange-700",
  annexe: "bg-gray-100 text-gray-700",
};

export default async function ExploreDocumentPage({ params }: Props) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, pageCount: true },
  });

  if (!doc) notFound();

  // Fetch all rectangles, ordered by type importance then page
  const rectangles = await prisma.rectangle.findMany({
    where: { documentId: id },
    orderBy: [{ type: "asc" }, { page: "asc" }, { y: "asc" }],
    include: {
      father: { select: { id: true, type: true, labels: true } },
    },
  });

  // Compute inherited labels recursively
  function getLabelsWithInherited(rectId: string): string[] {
    const labels: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null = rectId;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const rect = rectangles.find((r) => r.id === currentId);
      if (rect) {
        labels.push(...rect.labels);
        currentId = rect.fatherId;
      } else {
        break;
      }
    }

    return [...new Set(labels)];
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <a href="/explore" className="text-xs text-blue-600 hover:underline">
          &larr; Back to documents
        </a>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">{doc.title}</h1>
        <p className="text-sm text-gray-500">
          {doc.pageCount} pages &middot; {rectangles.length} content blocks
        </p>
      </div>

      {rectangles.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No content has been annotated yet. An admin must create rectangles first.
        </p>
      ) : (
        <div className="space-y-3">
          {rectangles.map((rect) => {
            const allLabels = getLabelsWithInherited(rect.id);
            const bgClass = TYPE_BG[rect.type] || TYPE_BG.paragraph;
            const badgeClass = TYPE_BADGE[rect.type] || TYPE_BADGE.paragraph;
            const hasText = rect.textEn || rect.textFr || rect.textNl;

            return (
              <div
                key={rect.id}
                className={`p-4 rounded-lg border ${bgClass}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
                    {rect.type}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Page {rect.page}
                  </span>
                  {allLabels.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {allLabels.map((label) => (
                        <span
                          key={label}
                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {hasText ? (
                  <div className="space-y-1">
                    {rect.textEn && (
                      <p className="text-sm text-gray-800">
                        <span className="text-[10px] text-gray-400 mr-1">EN</span>
                        {rect.textEn}
                      </p>
                    )}
                    {rect.textFr && (
                      <p className="text-sm text-gray-700">
                        <span className="text-[10px] text-gray-400 mr-1">FR</span>
                        {rect.textFr}
                      </p>
                    )}
                    {rect.textNl && (
                      <p className="text-sm text-gray-700">
                        <span className="text-[10px] text-gray-400 mr-1">NL</span>
                        {rect.textNl}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No text content yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
