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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Documents</h1>

      {documents.length === 0 ? (
        <p className="text-gray-500 text-sm">No documents available yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={`/explore/${doc.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div>
                <h2 className="font-medium text-gray-900 group-hover:text-blue-600">
                  {doc.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {doc.pageCount} pages &middot; {doc._count.rectangles} content blocks
                </p>
              </div>
              <span className="text-gray-400 group-hover:text-blue-500 text-sm">
                View &rarr;
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
