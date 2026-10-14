import { notFound } from "next/navigation";
import { Newsreader } from "next/font/google";
import { emotionPositions, reviewWorks } from "../_shared/works";
import { DirectionC } from "./DirectionC";

// Self-hosted by next/font: the font files are served from this app, not from Google.
const text = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-c", display: "swap" });

/** Round 1 review route. Local only: a production build returns 404 (D-004). */
export default function DesignReviewC() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={text.variable}>
      <DirectionC works={reviewWorks()} positions={emotionPositions()} />
    </div>
  );
}
