import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Piece } from "@/components/piece/Piece";
import { getAllWorks, getCopyLines, getFeelingPositions, getWorkById } from "@/lib/catalog";

/** Every work's Piece screen is built ahead, so it opens instantly. */
export function generateStaticParams() {
  return getAllWorks().map((w) => ({ id: w.id }));
}

async function PieceFor({ params }: { params: PageProps<"/piece/[id]">["params"] }) {
  const work = getWorkById((await params).id);
  if (!work) notFound();
  return <Piece work={work} lines={getCopyLines(work.id)} positions={getFeelingPositions()} />;
}

export default function PiecePage({ params }: PageProps<"/piece/[id]">) {
  return (
    <Suspense>
      <PieceFor params={params} />
    </Suspense>
  );
}
