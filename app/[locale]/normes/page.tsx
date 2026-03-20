/**
 * /normes — Liste des documents disponibles.
 * Server Component — accès Prisma direct.
 */

import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ImportButton } from "@/components/normes/ImportButton"

export const dynamic = "force-dynamic"

export default async function NormesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const [documents, articleStats] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, language: true, version: true, createdAt: true },
    }),
    prisma.article.groupBy({
      by: ["documentId"],
      _count: { _all: true },
      _max: { pageStart: true },
    }),
  ])

  const statsMap = new Map(articleStats.map((s) => [s.documentId, s]))

  const docs = documents.map((doc) => ({
    ...doc,
    articleCount: statsMap.get(doc.id)?._count._all ?? 0,
    pageCount: statsMap.get(doc.id)?._max.pageStart ?? 0,
  }))

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Basis Norm Explorer
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Documents disponibles
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {docs.length} document{docs.length !== 1 ? "s" : ""} indexé
                {docs.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ImportButton locale={locale} />
          </div>
        </header>

        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-8 py-16 text-center">
            <p className="text-sm text-slate-400">
              Aucun document ingéré pour l&apos;instant.
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Utilisez le bouton &laquo;&nbsp;Importer un PDF&nbsp;&raquo; pour ajouter un document.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/${locale}/normes/${doc.id}`}
                  className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-800 group-hover:text-slate-900">
                      {doc.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {doc.articleCount.toLocaleString()} articles
                      {doc.pageCount > 0 && ` · ${doc.pageCount} pages`}
                      {" · "}
                      {doc.language.toUpperCase()}
                      {doc.version && ` · v${doc.version}`}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
