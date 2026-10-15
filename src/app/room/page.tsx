import { Room } from "@/components/room/Room";
import { getFeelingPositions, getWorkCards } from "@/lib/catalog";

export default function RoomPage() {
  return <Room works={getWorkCards()} positions={getFeelingPositions()} />;
}
