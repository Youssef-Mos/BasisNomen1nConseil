import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PdfEditor from "@/components/admin/PdfEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentEditorPage({ params }: Props) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, pageCount: true },
  });

  if (!doc) notFound();

  return (
    <PdfEditor
      documentId={doc.id}
      documentTitle={doc.title}
      pageCount={doc.pageCount}
    />
  );
}
