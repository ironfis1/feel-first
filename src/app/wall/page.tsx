import { Wall } from "@/components/wall/Wall";
import { getFeelingPositions, getWorkCards } from "@/lib/catalog";

export default function WallPage() {
  return <Wall works={getWorkCards()} positions={getFeelingPositions()} />;
}
