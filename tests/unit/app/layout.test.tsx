import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

// next/font only works inside the Next compiler; the test gets a stand-in class name.
vi.mock("next/font/google", () => ({ Newsreader: () => ({ variable: "font-serif-var" }) }));
import { workingName } from "@/config/feel";

describe("RootLayout", () => {
  const html = renderToStaticMarkup(
    RootLayout({ children: <p>screen content</p> } as LayoutProps<"/">),
  );

  it("sets the document language to English", () => {
    expect(html).toMatch(/^<html lang="en"/);
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
