"use client";

// Room [spec Section 5.2]: the J3 hang, poster first; Show more; the compact wheel; Closer and Drift; the room name
// above the feeling and its sentence; the describe box, read by the word map in the browser until Milestone 5.

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { describeNoMatch, describePlaceholder, feelingSentences, roomPageSizePerLane } from "@/config/feel";
import { roomNameFor } from "@/lib/buckets";
import type { WorkCard } from "@/lib/catalog";
import { feelingAt, moodFor, wheelPointFor, type FeelingPositions, type WheelPoint } from "@/lib/feelings";
import { hang } from "@/lib/j3";
import { nudge, type Reaction } from "@/lib/j7";
import { interpretWords } from "@/lib/wordmap";
import { ScreenNav } from "../ScreenNav";
import { useSession } from "../session/Session";
import { FeelingWheel } from "../wheel/FeelingWheel";
import c from "@/styles/controls.module.css";
import s from "./Room.module.css";

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Thumbnails are 640px wide, resized and never cropped [D-023]. */
const thumbWidth = 640;

export function Room({ works, positions }: { works: readonly WorkCard[]; positions: FeelingPositions }) {
  const session = useSession();
  const { point, drifted, pages, described } = session;
  const [text, setText] = useState("");
  const [unheard, setUnheard] = useState(false);

  const mood = moodFor(point, positions);
  const feel = feelingAt(point);
  const hung = hang(works, mood, pages, drifted);
  const laneMax = useMemo(() => Math.max(...(["poster", "fine-art"] as const).map((l) => works.filter((w) => w.lane === l).length)), [works]);

  /** The hang's order for a wheel point, to tell whether a retune re-ordered the Room [Gap G13, D-041]. */
  const orderAt = (p: WheelPoint) =>
    hang(works, moodFor(p, positions), pages, drifted)
      .map((w) => w.id)
      .join();
  const retuned = (from: WheelPoint, to: WheelPoint) => {
    if (orderAt(from) !== orderAt(to)) session.countRehang();
  };

  const react = (w: WorkCard, reaction: Reaction) => {
    session.movePoint(wheelPointFor(nudge(mood, w, reaction), positions));
    if (reaction === "drift") session.drift(w.id);
    session.countRehang();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const heard = interpretWords(text);
    setUnheard(!heard);
    // No mood word: the mood stays, the Room does not move, and nothing counts as a re-hang [D-052].
    if (!heard) return;
    session.describe(wheelPointFor(heard, positions), { roomType: heard.roomType, size: heard.size });
  };

  const roomName = roomNameFor(mood) + (described?.roomType ? ` for the ${described.roomType}` : "");

  return (
    <main className={c.screen}>
      <span className={c.wash} aria-hidden />
      <ScreenNav />
      <header className={s.head}>
        <div className={s.title}>
          <p className={`${c.label} ${s.eyebrow}`}>{roomName}</p>
          <h1 key={feel.main} className={s.feeling}>
            {cap(feel.main)}
            {feel.also && <span className={s.also}>, a little {feel.also}</span>}
          </h1>
          <p className={s.sentence}>{feelingSentences[feel.main]}</p>
          <form className={s.describe} onSubmit={submit}>
            <label className={s.describeLabel} htmlFor="describe">
              Or describe the moment
            </label>
            <div className={s.describeRow}>
              <input
                id="describe"
                className={s.describeInput}
                placeholder={describePlaceholder}
                autoComplete="off"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setUnheard(false);
                }}
              />
              <button className={c.text} type="submit">
                Hang it
              </button>
            </div>
            <p className={s.unheard} role="status">
              {unheard ? describeNoMatch : ""}
            </p>
          </form>
        </div>
        <FeelingWheel point={point} onMove={session.movePoint} onGestureEnd={retuned} compact className={s.wheel} />
      </header>

      <ol className={s.hang} aria-label="The room">
        {hung.map((w, i) => (
          <li key={w.id} className={s.work} data-lane={w.lane}>
            <Link href={`/piece/${w.id}`} className={s.open}>
              <span className={s.pic} style={{ aspectRatio: `${w.width} / ${w.height}` }}>
                <Image
                  src={w.thumbUrl}
                  alt={`${w.title}, ${w.artist}`}
                  width={thumbWidth}
                  height={Math.round((thumbWidth * w.height) / w.width)}
                  unoptimized
                  priority={i < 4}
                  sizes="(max-width: 640px) 90vw, 30vw"
                />
              </span>
              <span className={s.caption}>
                <span className={s.workTitle}>{w.title}</span>
                <span className={s.meta}>
                  {w.artist}, {w.date}
                </span>
              </span>
            </Link>
            <div className={s.reacts}>
              <button className={c.text} onClick={() => react(w, "closer")} aria-label={`Closer to ${w.title}`}>
                Closer
              </button>
              <button className={c.text} onClick={() => react(w, "drift")} aria-label={`Drift from ${w.title}`}>
                Drift
              </button>
            </div>
          </li>
        ))}
      </ol>
      {pages * roomPageSizePerLane < laneMax && (
        <div className={s.more}>
          <button className={c.pill} onClick={session.showMore}>
            Show more
          </button>
        </div>
      )}
    </main>
  );
}
