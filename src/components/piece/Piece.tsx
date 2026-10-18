"use client";

// Piece [spec Section 5.3]: the full-size image from the source institution with a live framed preview (D-001,
// Gap G29), the "why this found you" line, the fingerprint, size, material and frame choices with prices, the
// credits (Gap G33), Add to bag (which opens the Bag, D-077), and the way on to the Wall.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fingerprintTagCount, frameFinishes, materials, pieceDefaults, printSizes, sizeWordToPrintSize, type FrameFinish, type MaterialId, type PrintSizeId } from "@/config/feel";
import { lineKey } from "@/lib/bag";
import { bucketOf, type BucketKey } from "@/lib/buckets";
import type { Work } from "@/lib/catalog";
import { moodFor, wheelPointFor, type FeelingPositions } from "@/lib/feelings";
import { formatPrice, frameFor, priceOf } from "@/lib/pricing";
import { ScreenNav } from "../ScreenNav";
import { useSession } from "../session/Session";
import { placeAt, WheelFace } from "../wheel/FeelingWheel";
import { FrameCorner, Preview } from "./Preview";
import c from "@/styles/controls.module.css";
import s from "./Piece.module.css";

const materialIds = Object.keys(materials) as MaterialId[];

type Props = { work: Work; lines: Readonly<Record<BucketKey, string>> | undefined; positions: FeelingPositions };

export function Piece({ work, lines, positions }: Props) {
  const session = useSession();
  const { point, described, bag, openPiece, select } = session;
  // Coming back from the Wall, the choices made there carry over [Res #41].
  const kept = session.selection?.workId === work.id ? session.selection : null;
  const [size, setSize] = useState<PrintSizeId>(kept?.size ?? (described?.size ? sizeWordToPrintSize[described.size] : pieceDefaults.size));
  const [material, setMaterial] = useState<MaterialId>(kept?.material ?? pieceDefaults.material);
  const [finish, setFinish] = useState<FrameFinish>(kept?.finish ?? pieceDefaults.frame);
  const router = useRouter();

  // The first Piece screen opened stops the time-to-first-piece clock [Res #11].
  useEffect(openPiece, [openPiece]);
  // This piece, as chosen, is the current selection the Wall hangs [Res #41].
  useEffect(() => select({ workId: work.id, size, material, finish }), [select, work.id, size, material, finish]);

  const mood = moodFor(point, positions);
  const why = lines?.[bucketOf(mood.valence, mood.arousal)];
  const frame = frameFor(material, finish);
  const choice = { workId: work.id, size, material, frame };
  const inBag = bag.some((l) => l.key === lineKey(choice));

  return (
    <main className={c.screen}>
      <span className={c.wash} aria-hidden />
      <ScreenNav />
      <div className={`${c.column} ${s.piece}`}>
        <div className={s.stage}>
          <Preview work={work} size={size} frame={frame} />
        </div>

        <div className={s.info}>
          <h1 className={c.title}>{work.title}</h1>
          <p className={s.byline}>
            {work.artist}, {work.date}
          </p>
          {why && <p className={s.why}>{why}</p>}

          <section className={s.fingerprint} aria-labelledby="fingerprint">
            <h2 id="fingerprint" className={c.label}>
              Its feeling and yours
            </h2>
            <div className={s.fingerprintRow}>
              <WheelFace className={s.miniWheel} label="Where this piece and your feeling sit on the feeling wheel">
                <span className={s.markWork} style={placeAt(wheelPointFor(work, positions))} aria-hidden />
                <span className={s.markYou} style={placeAt(point)} aria-hidden />
              </WheelFace>
              <div className={s.legend}>
                <p className={s.key}>
                  <span className={s.keyWork} aria-hidden /> This piece
                </p>
                <p className={s.key}>
                  <span className={s.keyYou} aria-hidden /> You
                </p>
                <p className={s.tags}>{work.tags.slice(0, fingerprintTagCount).join(", ")}</p>
              </div>
            </div>
          </section>

          <section className={s.choices} aria-label="Choose your print">
            <ChoiceGroup label="Size">
              {printSizes.map((p) => (
                <button key={p.id} className={s.choice} aria-pressed={size === p.id} onClick={() => setSize(p.id)}>
                  {p.widthIn} x {p.heightIn} in <span className={s.price}>{formatPrice(priceOf(p.id, material))}</span>
                </button>
              ))}
            </ChoiceGroup>
            <ChoiceGroup label="Material">
              {materialIds.map((m) => (
                <button key={m} className={s.choice} aria-pressed={material === m} onClick={() => setMaterial(m)}>
                  {materials[m].label} <span className={s.price}>{formatPrice(priceOf(size, m))}</span>
                </button>
              ))}
            </ChoiceGroup>
            {material === "framed" && (
              <ChoiceGroup label="Frame">
                <div className={s.frames}>
                  {frameFinishes.map((f) => (
                    <button key={f} className={s.frameChoice} aria-pressed={finish === f} onClick={() => setFinish(f)}>
                      <FrameCorner work={work} finish={f} />
                      <span className={s.frameName}>{f[0].toUpperCase() + f.slice(1)}</span>
                      <span className={s.price}>{formatPrice(priceOf(size, "framed"))}</span>
                    </button>
                  ))}
                </div>
              </ChoiceGroup>
            )}
          </section>

          <div className={s.buy}>
            <p className={s.total}>{formatPrice(priceOf(size, material))}</p>
            <button
              className={c.pill}
              onClick={() => {
                if (!inBag) session.addToBag(choice);
                router.push("/bag");
              }}
            >
              {inBag ? "In your bag" : "Add to bag"}
            </button>
          </div>
          <p>
            <Link className={c.link} href="/wall">
              Hang it
            </Link>
          </p>

          <p className={s.credits}>
            {[`${work.title}`, `${work.artist}, ${work.date}`, work.source, work.license].map(stop).join(" ")}
          </p>
        </div>
      </div>
    </main>
  );
}

/** Ends a credit field with a period unless the source text already ends a sentence. */
const stop = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);

function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.group} role="group" aria-label={label}>
      <p className={c.label}>{label}</p>
      <div className={s.options}>{children}</div>
    </div>
  );
}
