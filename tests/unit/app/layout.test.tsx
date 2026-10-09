import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "@/app/layout";
import { workingName } from "@/config/feel";

describe("RootLayout", () => {
  const html = renderToStaticMarkup(
    RootLayout({ children: <p>screen content</p> } as LayoutProps<"/">),
  );

  it("sets the document language to English", () => {
    expect(html).toMatch(/^<html lang="en">/);
  });

  it("puts the concept bar before the screen content on every page", () => {
    const bar = html.indexOf("A concept by Scott Reasinger.");
    const content = html.indexOf("screen content");
    expect(bar).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(bar);
  });
});

describe("layout metadata", () => {
  it("titles every page with the working name", () => {
    expect(metadata.title).toBe(workingName);
  });

  it("asks search engines not to index or follow [D-011]", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
