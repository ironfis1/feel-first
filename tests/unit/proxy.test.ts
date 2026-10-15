import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { getAllWorks } from "@/lib/catalog";
import { proxy } from "@/proxy";

// Medium tier (docs/test-tiers.md): the Piece id gate. Unknown ids are rewritten to an unmatched path so the
// app's 404 page answers with status 404; catalog ids pass through. Vitest's catalog is the fixture.

const at = (path: string) => proxy(new NextRequest(`https://art.example${path}`));
const rewrittenTo = (path: string) => at(path).headers.get("x-middleware-rewrite");

describe("proxy", () => {
  it("passes every catalog id through untouched, so it never hides a Piece that would render", () => {
    for (const w of getAllWorks()) {
      const res = at(`/piece/${w.id}`);
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("rewrites an unknown id to an unmatched path on the same origin", () => {
    expect(rewrittenTo("/piece/w-9999")).toBe("https://art.example/_no-such-piece");
  });

  it("rewrites an empty id, a nested path and a different case, since the lookup is exact", () => {
    const id = getAllWorks()[0].id;
    for (const path of ["/piece/", `/piece/${id}/extra`, `/piece/${id.toUpperCase()}`]) {
      expect(rewrittenTo(path)).toBe("https://art.example/_no-such-piece");
    }
  });

  it("rewrites a malformed percent escape without throwing", () => {
    expect(rewrittenTo("/piece/%E0%A4%A")).toBe("https://art.example/_no-such-piece");
  });
});
