"use client";

// Signals [spec Section 5.7]: the four precomputed J8 findings, each with its business action, labeled as
// simulated [RB97, Res #34]; the visitor's own session beside them, read from client memory and never stored or
// sent [Res #36, Gap G26]; the follow-up ask [Res #45]; then the contact block (D-068). Strings are D-079. No J8
// code runs here: the findings come from data/signals.json, read at build time [Res #55].

import { contactEmail, linkedInUrl, materials, printSizes, roomNames } from "@/config/feel";
import { arousalBands, bucketOf, valenceBands, type BucketKey } from "@/lib/buckets";
import type { Finding, Signals as SignalsFile, WorkCard } from "@/lib/catalog";
import { moodFor, type FeelingPositions } from "@/lib/feelings";
import { ScreenNav } from "../ScreenNav";
import { useSession } from "../session/Session";
import c from "@/styles/controls.module.css";
import s from "./Signals.module.css";

const headings: Record<Finding["kind"], { title: string; team: string }> = {
  "rack-candidate": { title: "Retail rack candidate", team: "For merchandising" },
  "attach-pattern": { title: "Frame attach pattern", team: "For merchandising" },
  "under-converting": { title: "Under-converting segment", team: "For merchandising" },
  "licensing-gap": { title: "Licensing gap", team: "For licensing" },
};

/** The grid's rows, charged at the top, each running heavy to bright. */
const gridKeys = [...arousalBands].reverse().flatMap((a) => valenceBands.map((v) => `${v}-${a}` as BucketKey));

type Props = { signals: SignalsFile; works: readonly WorkCard[]; positions: FeelingPositions };

export function Signals({ signals, works, positions }: Props) {
  const { point, bag } = useSession();
  const mood = moodFor(point, positions);
  const mine = bucketOf(mood.valence, mood.arousal);
  const byId = new Map(works.map((w) => [w.id, w]));

  return (
    <main className={c.screen}>
      <span className={c.wash} aria-hidden />
      <ScreenNav />
      <div className={`${c.column} ${s.signals}`}>
        <header className={s.head}>
          <h1 className={c.title}>Signals</h1>
          <p className={s.lede}>What sessions like yours would tell merchandising and licensing, from the site to the shelf.</p>
          <p className={s.simulated}>
            <strong>Simulated data.</strong> {signals.sessionCount.toLocaleString("en-US")} sessions generated from a fixed seed. No real visitors.
          </p>
        </header>

        <ol className={s.findings}>
          {signals.findings.map((f) => (
            <li key={f.kind} className={s.finding}>
              <p className={c.label}>{headings[f.kind].team}</p>
              <h2 className={s.findingTitle}>{headings[f.kind].title}</h2>
              <p className={s.segment}>Segment: {roomNames[f.bucket]}</p>
              <p className={s.text}>{f.text}</p>
              <div className={s.action}>
                <h3 className={c.label}>Action</h3>
                <p>{f.action}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className={s.session} aria-labelledby="your-session">
          <h2 id="your-session" className={s.sectionTitle}>
            Your session
          </h2>
          <p className={s.quiet}>Only on this device. Nothing here is stored or sent.</p>
          <div className={s.gridWrap}>
            <span className={s.axisY} aria-hidden>
              <span>charged</span>
              <span>calm</span>
            </span>
            <div className={s.grid} role="img" aria-label={`The nine mood segments, with your point in ${roomNames[mine]}`}>
              {gridKeys.map((key) => (
                <span key={key} className={s.cell} data-mine={key === mine || undefined}>
                  {roomNames[key]}
                </span>
              ))}
              <span className={s.you} style={{ left: `${((mood.valence + 1) / 2) * 100}%`, top: `${((1 - mood.arousal) / 2) * 100}%` }} aria-hidden />
            </div>
            <span className={s.axisX} aria-hidden>
              <span>heavy</span>
              <span>bright</span>
            </span>
          </div>
          <p className={s.yours}>Your segment: {roomNames[mine]}</p>
          <p className={s.quiet}>Simulated sessions in this segment: {signals.buckets[mine].sessions.toLocaleString("en-US")}</p>

          <h3 className={`${c.label} ${s.bagLabel}`}>Your bag</h3>
          {bag.length ? (
            <ul className={s.bag}>
              {bag.map((l) => {
                const size = printSizes.find((p) => p.id === l.size)!;
                return (
                  <li key={l.key}>
                    {byId.get(l.workId)?.title}, {size.widthIn} x {size.heightIn} in, {materials[l.material].label.toLowerCase()}
                    {l.frame ? `, ${l.frame} frame` : ""}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={s.quiet}>Nothing in your bag yet.</p>
          )}
        </section>

        <section className={s.ask} aria-labelledby="next-step">
          <h2 id="next-step" className={s.sectionTitle}>
            Next step
          </h2>
          <p className={s.askLine}>
            Run this same pipeline on a sample of Trends&rsquo; licensed SKUs: tag each work by feeling (J1), write why each piece fits a mood (J4), and read the signals (J8).
          </p>
        </section>

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
      </div>
    </main>
  );
}
