import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { rectangles: true } },
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">Documents</h1>
        <p className="text-sm text-(--text-secondary) mt-1">Select a document to explore its structure and contents.</p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-(--bg-surface) border border-(--border-default) rounded-2xl p-12 text-center shadow-sm">
          <p className="text-(--text-secondary) text-sm">No documents available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={`/explore/${doc.id}`}
              className="flex items-start justify-between p-5 bg-(--bg-surface) border border-(--border-default) rounded-2xl hover:border-(--border-strong) hover:shadow-md transition-all group"
            >
              <div>
                <h2 className="font-semibold text-(--text-primary) group-hover:text-blue-600 transition-colors line-clamp-2">
                  {doc.title}
                </h2>
                <div className="flex items-center gap-3 mt-3">
                  <span className="inline-flex items-center text-xs font-medium text-(--text-secondary) bg-(--bg-page) px-2.5 py-1 rounded-lg">
                    {doc.pageCount} pages
                  </span>
                  <span className="inline-flex items-center text-xs font-medium text-(--text-secondary) bg-(--bg-page) px-2.5 py-1 rounded-lg">
                    {doc._count.rectangles} blocks
                  </span>
                </div>
              </div>
              <span className="w-8 h-8 rounded-full bg-(--bg-page) group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 flex items-center justify-center shrink-0 transition-colors ml-4">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-(--text-muted) group-hover:text-blue-600">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
