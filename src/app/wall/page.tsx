import { ScreenNav } from "@/components/ScreenNav";
import c from "@/styles/controls.module.css";

// Stub until Milestone 5, with the screen links so free navigation never dead-ends [D-056].
export default function WallPage() {
  return (
    <main className={c.screen}>
      <ScreenNav />
      <h1>Wall</h1>
    </main>
  );
}
