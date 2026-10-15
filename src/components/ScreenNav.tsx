"use client";

// Free navigation between the journey's screens [spec Section 5, Res #3, Res #35]. Not a category menu.

import Link from "next/link";
import { useSession } from "./session/Session";
import c from "@/styles/controls.module.css";
import s from "./ScreenNav.module.css";

export function ScreenNav() {
  const { bag } = useSession();
  return (
    <nav className={s.nav} aria-label="Screens">
      <Link className={c.text} href="/room">
        Room
      </Link>
      <Link className={c.text} href="/bag">
        Bag{bag.length ? ` (${bag.length})` : ""}
      </Link>
      <Link className={c.text} href="/close">
        Close
      </Link>
    </nav>
  );
}
