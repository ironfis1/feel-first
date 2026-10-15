import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (docs/testing.md). By default they run against a local production build.
// `npm run test:prod` sets PLAYWRIGHT_BASE_URL to art.reasinger.net and runs the same suite with no local server.
const remote = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: remote ?? "http://localhost:3100" },
  projects: [
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: remote
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 240_000,
      },
});
