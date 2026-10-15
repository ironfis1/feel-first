import { Bag } from "@/components/bag/Bag";
import { getWorkCards } from "@/lib/catalog";

export default function BagPage() {
  return <Bag works={getWorkCards()} />;
}
