import { describe, expect, it } from "vitest";
import { costLineText } from "@/config/feel";

// Exact wording is fixed by spec Section 6.2 [RB106, Res #40].
describe("costLineText", () => {
  it("renders the exact spec wording", () => {
    expect(costLineText(12, 340)).toBe("Built in 12 days for $340 in AI and hosting.");
  });

  it("prints cents exactly as given, pinned until Q-007 is decided", () => {
    expect(costLineText(12, 340.5)).toBe("Built in 12 days for $340.5 in AI and hosting.");
  });

  it("does not singularize one day", () => {
    expect(costLineText(1, 20)).toBe("Built in 1 days for $20 in AI and hosting.");
  });
});
