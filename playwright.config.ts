import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a local production build (docs/testing.md).
// From Milestone 4, `npm run test:prod` points the same suite at art.reasinger.net.
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
