import { afterEach, describe, expect, it, vi } from "vitest";
import { validWork } from "../../fixtures/works";

// Medium tier (docs/test-tiers.md). The catalog module validates its data file on load,
// so a bad file fails the build. The data import is replaced in memory; no file or network is touched.

const dataPath = "../../../data/fixtures/catalog.fixture.json";

async function loadCatalogWith(data: unknown) {
  vi.resetModules();
  vi.doMock(dataPath, () => ({ default: data }));
  return import("@/lib/catalog");
}

afterEach(() => {
  vi.doUnmock(dataPath);
  vi.resetModules();
});

describe("catalog module load", () => {
  it("loads a valid file and serves it in id order", async () => {
    const catalog = await loadCatalogWith([validWork({ id: "b" }), validWork({ id: "a" })]);
    expect(catalog.getAllWorks().map((w) => w.id)).toEqual(["a", "b"]);
  });

  it("fails to load a file with a duplicate id [D-015]", async () => {
    await expect(loadCatalogWith([validWork({ id: "a" }), validWork({ id: "a" })])).rejects.toThrow(/duplicate id a/);
  });

  it("fails to load a file with a malformed work", async () => {
    await expect(loadCatalogWith([validWork({ palette: ["#000000"] })])).rejects.toThrow();
  });

  it("fails to load a file that is not a list of works", async () => {
    await expect(loadCatalogWith({ works: [] })).rejects.toThrow();
  });
});
