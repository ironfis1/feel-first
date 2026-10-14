import { notFound } from "next/navigation";
import { Newsreader } from "next/font/google";
import { reviewWorks } from "../_shared/works";
import { DirectionA } from "./DirectionA";

// Self-hosted by next/font: the font files are served from this app, not from Google.
const text = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-a-text", display: "swap" });

/** Round 0 review route. Local only: a production build returns 404 (D-004). */
export default function DesignReviewA() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={text.variable}>
      <DirectionA works={reviewWorks()} />
    </div>
  );
}
