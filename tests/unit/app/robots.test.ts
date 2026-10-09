import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

// The /robots.txt contract with crawlers [D-011].
describe("robots", () => {
  it("disallows every crawler from every path, with no allow rule or sitemap", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
