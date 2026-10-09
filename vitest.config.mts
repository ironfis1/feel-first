import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit and component tests (docs/testing.md). Component test files opt in to jsdom
// with a `// @vitest-environment jsdom` comment. No test may call an outside party.
export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      // Tests never read the real catalog through the catalog module; they get the fixture.
      { find: /^.*\/data\/catalog\.json$/, replacement: path.resolve(import.meta.dirname, "tests/fixtures/catalog.metadata.json") },
    ],
  },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.{ts,mjs}"],
      exclude: ["scripts/smoke/**"],
    },
  },
});
