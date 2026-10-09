import { afterEach, describe, expect, it, vi } from "vitest";
import { validWork } from "../../fixtures/works";

/** A valid M2 work: the full test work without J1's five fields. */
const j1Fields = ["valence", "arousal", "tags", "palette", "subject"];
const metadataWork = (overrides: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(validWork(overrides)).filter(([key]) => !j1Fields.includes(key)));

// Medium tier (docs/test-tiers.md). The catalog module validates its data file on load,
// so a bad file fails the build. The data import is replaced in memory; no file or network is touched.

// data/catalog.json resolves to this fixture in tests (vitest.config.mts).
const dataPath = "../../fixtures/catalog.metadata.json";

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
    const catalog = await loadCatalogWith([metadataWork({ id: "b" }), metadataWork({ id: "a" })]);
    expect(catalog.getAllWorks().map((w) => w.id)).toEqual(["a", "b"]);
  });

  it("fails to load a file with a duplicate id [D-015]", async () => {
    await expect(loadCatalogWith([metadataWork({ id: "a" }), metadataWork({ id: "a" })])).rejects.toThrow(/duplicate id a/);
  });

  it("fails to load a file with a malformed work", async () => {
    await expect(loadCatalogWith([metadataWork({ width: 0 })])).rejects.toThrow();
  });

  it("fails to load a file that is not a list of works", async () => {
    await expect(loadCatalogWith({ works: [] })).rejects.toThrow();
  });
});
