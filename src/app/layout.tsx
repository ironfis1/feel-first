import type { Metadata } from "next";
import { ConceptBar } from "@/components/ConceptBar";
import { workingName } from "@/config/feel";
import "./globals.css";

export const metadata: Metadata = {
  title: workingName,
  // No search indexing or crawling [D-011].
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ConceptBar />
        {children}
      </body>
    </html>
  );
}
