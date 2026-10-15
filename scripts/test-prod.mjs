// npm run test:prod: the Playwright demo path against the live site (docs/testing.md).
// Sets the base URL here so the script works the same on Windows and Unix shells without an extra package.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_BASE_URL: "https://art.reasinger.net" },
});
process.exit(result.status ?? 1);
