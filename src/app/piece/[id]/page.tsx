import { notFound } from "next/navigation";
import { Piece } from "@/components/piece/Piece";
import { getAllWorks, getCopyLines, getFeelingPositions, getWorkById } from "@/lib/catalog";

/**
 * Blocking, so an id that is not a catalog work answers 404 before anything is sent, rather than a page
 * streamed with status 200. Catalog works are built ahead, so they still open instantly.
 */
export const instant = false;

/** Every work's Piece screen is built ahead. */
export function generateStaticParams() {
  return getAllWorks().map((w) => ({ id: w.id }));
}

export default async function PiecePage({ params }: PageProps<"/piece/[id]">) {
  const work = getWorkById((await params).id);
  if (!work) notFound();
  return <Piece work={work} lines={getCopyLines(work.id)} positions={getFeelingPositions()} />;
}
