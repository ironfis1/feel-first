import { Signals } from "@/components/signals/Signals";
import { getFeelingPositions, getSignals, getWorkCards } from "@/lib/catalog";

export default function SignalsPage() {
  return <Signals signals={getSignals()} works={getWorkCards()} positions={getFeelingPositions()} />;
}
