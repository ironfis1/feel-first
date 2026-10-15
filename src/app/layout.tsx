import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { ConceptBar } from "@/components/ConceptBar";
import { workingName } from "@/config/feel";
import "../styles/tokens.css";
import "./globals.css";

// Self-hosted by next/font: the font files are served from this app, never from Google at runtime.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });

export const metadata: Metadata = {
  title: workingName,
  // No search indexing or crawling [D-011].
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={serif.variable}>
      <body>
        <ConceptBar />
        {children}
      </body>
    </html>
  );
}
