import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { promptBetween } from "../../../scripts/lib/prompt.ts";

// Medium tier (docs/test-tiers.md). Prompts are read from docs/ai-jobs.md between named markers.

const block = (name: string, body: string, eol = "\n") => [`<!-- ${name}:start -->`, body, `<!-- ${name}:end -->`].join(eol);

describe("promptBetween", () => {
  it("returns the text between the markers", () => {
    expect(promptBetween(`intro\n${block("j1-prompt", "Tag the work.")}\noutro`, "j1-prompt")).toBe("Tag the work.");
  });

  it("gives the same text, with no carriage returns, for LF and CRLF documents", () => {
    const body = "Line one.\n\nLine two.";
    const lf = promptBetween(block("j1-prompt", body), "j1-prompt");
    const crlf = promptBetween(block("j1-prompt", body.replace(/\n/g, "\r\n"), "\r\n"), "j1-prompt");
    expect(crlf).toBe(lf);
    expect(crlf).toBe("Line one.\n\nLine two.");
    expect(crlf).not.toContain("\r");
  });

  it("stops at the first end marker when the same block appears twice", () => {
    const doc = `${block("j1-prompt", "First.")}\n${block("j1-prompt", "Second.")}`;
    expect(promptBetween(doc, "j1-prompt")).toBe("First.");
  });

  it("does not match a marker whose name only starts with the asked name", () => {
    const doc = `${block("j1-prompt-v2", "Newer.")}\n${block("j1-prompt", "Current.")}`;
    expect(promptBetween(doc, "j1-prompt")).toBe("Current.");
    expect(() => promptBetween(block("j1-prompt-v2", "Newer."), "j1-prompt")).toThrow(
      "docs/ai-jobs.md has no prompt between the j1-prompt markers",
    );
  });

  it("throws with the marker name when the block is missing", () => {
    expect(() => promptBetween("no markers here", "j4-prompt")).toThrow("docs/ai-jobs.md has no prompt between the j4-prompt markers");
  });

  it("trims surrounding blank lines and keeps the inner ones", () => {
    expect(promptBetween(block("j8-prompt", "\n\n  First.\n\n\nSecond.  \n\n"), "j8-prompt")).toBe("First.\n\n\nSecond.");
  });

  it("matches a name with regex-special characters literally", () => {
    expect(promptBetween(block("j2-draft-prompt", "Draft."), "j2-draft-prompt")).toBe("Draft.");
    expect(promptBetween(block("j1.prompt", "Dotted."), "j1.prompt")).toBe("Dotted.");
    expect(promptBetween(block("j1(prompt", "Paren."), "j1(prompt")).toBe("Paren.");
    expect(promptBetween(block("j1+prompt", "Plus."), "j1+prompt")).toBe("Plus.");
    expect(() => promptBetween(block("j1xprompt", "Other."), "j1.prompt")).toThrow("no prompt between the j1.prompt markers");
  });

  it.each(["j1-prompt", "j4-prompt", "j8-prompt", "j2-draft-prompt"])("finds a non-empty %s in the real docs/ai-jobs.md", (name) => {
    const doc = readFileSync(path.resolve(import.meta.dirname, "../../../docs/ai-jobs.md"), "utf8");
    expect(promptBetween(doc, name).length).toBeGreaterThan(0);
  });
});
