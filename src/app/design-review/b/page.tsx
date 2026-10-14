import { notFound } from "next/navigation";
import { Archivo } from "next/font/google";
import { reviewWorks } from "../_shared/works";
import { DirectionB } from "./DirectionB";

// Self-hosted by next/font: the font files are served from this app, not from Google.
const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-b", display: "swap" });

/** Round 0 review route. Local only: a production build returns 404 (D-004). */
export default function DesignReviewB() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={sans.variable}>
      <DirectionB works={reviewWorks()} />
    </div>
  );
}
