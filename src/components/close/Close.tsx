"use client";

// Close [spec Section 5.6]: what the visitor just did, computed in the browser and never sent [Res #11, Res #36];
// the builder's contact; and the Signals link, always shown [RB110, Res #39].

import Link from "next/link";
import { contactEmail, linkedInUrl } from "@/config/feel";
import { closeSummary, formatDuration } from "@/lib/metrics";
import { ScreenNav } from "../ScreenNav";
import { useSession } from "../session/Session";
import c from "@/styles/controls.module.css";
import s from "./Close.module.css";

export function Close() {
  const { metrics, bag } = useSession();
  const summary = closeSummary(metrics, bag.length);

  return (
    <main className={c.screen}>
      <span className={c.wash} aria-hidden />
      <ScreenNav />
      <div className={`${c.column} ${s.close}`}>
        <h1 className={c.title}>What you just did</h1>
        <dl className={s.metrics}>
          <div>
            <dt>Search</dt>
            <dd>No search typed</dd>
          </div>
          <div>
            <dt>Time to first piece</dt>
            <dd>{summary.timeToFirstPieceMs === null ? "Not measured" : formatDuration(summary.timeToFirstPieceMs)}</dd>
          </div>
          <div>
            <dt>Re-hangs</dt>
            <dd>{summary.rehangs}</dd>
          </div>
          <div>
            <dt>Pieces chosen</dt>
            <dd>{summary.piecesChosen}</dd>
          </div>
        </dl>

        <section className={s.contact} aria-labelledby="contact">
          <h2 id="contact" className={c.label}>
            Contact
          </h2>
          <p>
            <a className={c.link} href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
          <p>
            <a className={c.link} href={linkedInUrl} rel="noopener noreferrer" target="_blank">
              LinkedIn
            </a>
          </p>
        </section>

        <p className={s.signals}>
          <Link className={c.pill} href="/signals">
            Signals
          </Link>
        </p>
      </div>
    </main>
  );
}
