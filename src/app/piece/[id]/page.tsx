import { notFound } from "next/navigation";
import { Piece } from "@/components/piece/Piece";
import { getAllWorks, getCopyLines, getFeelingPositions, getWorkById } from "@/lib/catalog";

/**
 * Blocking, so an id that is not a catalog work is less likely to stream with status 200. On the slow
 * production container it still could, so src/proxy.ts answers 404 for those ids before this page runs and
 * notFound() below is only a fallback. Catalog works are built ahead, so they still open instantly.
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
