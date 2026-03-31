import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DocumentViewer from "@/components/explore/DocumentViewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ExploreDocumentPage({ params }: Props) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, pageCount: true },
  });

  if (!doc) notFound();

  const rectangles = await prisma.rectangle.findMany({
    where: { documentId: id },
    select: {
      id: true,
      type: true,
      page: true,
      x: true,
      y: true,
      width: true,
      height: true,
      textFr: true,
      textEn: true,
      textNl: true,
      labels: true,
      fatherId: true,
    },
    orderBy: [{ page: "asc" }, { y: "asc" }],
  });

  return <DocumentViewer doc={doc} rectangles={rectangles} />;
}
