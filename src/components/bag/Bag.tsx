"use client";

// Bag [spec Section 5.5]: lines with Remove, totals, how the pieces feel together, and the J6 suggestion.
// An empty bag shows a way back to the Room and no suggestion [Gap G6].

import Image from "next/image";
import Link from "next/link";
import { materials, printSizes } from "@/config/feel";
import { bagTotals } from "@/lib/bag";
import type { WorkCard } from "@/lib/catalog";
import { feelTogether, suggestion } from "@/lib/j6";
import { formatPrice } from "@/lib/pricing";
import { ScreenNav } from "../ScreenNav";
import { useSession } from "../session/Session";
import c from "@/styles/controls.module.css";
import s from "./Bag.module.css";

const thumbWidth = 640;

function Thumb({ w, sizes }: { w: WorkCard; sizes: string }) {
  return (
    <span className={s.pic} style={{ aspectRatio: `${w.width} / ${w.height}` }}>
      <Image src={w.thumbUrl} alt={`${w.title}, ${w.artist}`} width={thumbWidth} height={Math.round((thumbWidth * w.height) / w.width)} unoptimized sizes={sizes} />
    </span>
  );
}

export function Bag({ works }: { works: readonly WorkCard[] }) {
  const { bag, removeFromBag } = useSession();
  const byId = new Map(works.map((w) => [w.id, w]));
  const lineWorks = bag.map((l) => byId.get(l.workId)!).filter(Boolean);
  const totals = bagTotals(bag);
  const together = feelTogether(lineWorks);
  const next = suggestion(works, lineWorks);

  return (
    <main className={c.screen}>
      <span className={c.wash} aria-hidden />
      <ScreenNav />
      <div className={`${c.column} ${s.bag}`}>
        <h1 className={c.title}>Your bag</h1>

        {!bag.length ? (
          <p className={s.empty}>
            Nothing here yet.{" "}
            <Link className={c.link} href="/room">
              Back to the room
            </Link>
          </p>
        ) : (
          <>
            {together && <p className={s.together}>Together they feel like {together}.</p>}
            <ul className={s.lines}>
              {bag.map((l) => {
                const w = byId.get(l.workId);
                if (!w) return null;
                const size = printSizes.find((p) => p.id === l.size)!;
                return (
                  <li key={l.key} className={s.line}>
                    <Link href={`/piece/${w.id}`} className={s.lineArt}>
                      <Thumb w={w} sizes="120px" />
                    </Link>
                    <div className={s.lineText}>
                      <p className={s.lineTitle}>{w.title}</p>
                      <p className={s.lineMeta}>
                        {size.widthIn} x {size.heightIn} in, {materials[l.material].label.toLowerCase()}
                        {l.frame ? `, ${l.frame} frame` : ""}
                      </p>
                      <button className={c.text} onClick={() => removeFromBag(l.key)} aria-label={`Remove ${w.title}`}>
                        Remove
                      </button>
                    </div>
                    <p className={s.linePrice}>{formatPrice(l.price)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className={s.totals}>
              <dt>Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
              <dt>Shipping estimate</dt>
              <dd>{formatPrice(totals.shipping)}</dd>
              <dt className={s.grand}>Total</dt>
              <dd className={s.grand}>{formatPrice(totals.total)}</dd>
            </dl>
            <p className={s.finish}>
              <Link className={c.pill} href="/close">
                Finish
              </Link>
            </p>
            {next && (
              <section className={s.suggest} aria-labelledby="suggest">
                <h2 id="suggest" className={c.label}>
                  One more for this room
                </h2>
                <Link href={`/piece/${next.id}`} className={s.suggestLink}>
                  <Thumb w={next} sizes="240px" />
                  <span className={s.suggestCaption}>
                    <span className={s.lineTitle}>{next.title}</span>
                    <span className={s.lineMeta}>
                      {next.artist}, {next.date}
                    </span>
                  </span>
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
