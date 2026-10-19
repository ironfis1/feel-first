import { expect, test, type Request } from "@playwright/test";

// The demo path (docs/testing.md, quality-bar check 1): Threshold, Room with a poster first, describe a moment
// (the video phrase, answered from the cache), Closer, a Piece with a frame chosen, the Wall (bed scene and large
// size follow the phrase; change the frame and the wall color), Add to bag, Bag, Close, Signals.
// Runs at 390px and 1440px. Any uncaught error or console error fails it.
// Quality-bar check 9: the only request the page sends with a body is POST /api/j2 with exactly { text }, and no
// request carries the mood, the bag or the metrics.

const phrase = "a slow sunday morning in the bedroom, something large";
const assets = new Set(["image", "font", "stylesheet", "script", "media", "manifest", "other"]);

test("the demo path runs end to end with no console error and sends nothing but the typed sentence", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const sent: Request[] = [];
  page.on("request", (r) => {
    if (!assets.has(r.resourceType())) sent.push(r);
  });

  // Threshold: move the light, then step in.
  await page.goto("/");
  const wheel = page.getByRole("slider");
  const box = (await wheel.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Step in" }).click();

  // Room: a poster hangs at position 1.
  await page.waitForURL("**/room");
  const room = page.getByRole("list", { name: "The room" });
  await expect(room.getByRole("listitem").first()).toHaveAttribute("data-lane", "poster");

  // Describe a moment: the demo video phrase is answered from the cache and names the bedroom.
  await page.getByLabel("Or describe the moment").fill(phrase);
  const [j2] = await Promise.all([page.waitForResponse("**/api/j2"), page.getByRole("button", { name: "See matches" }).click()]);
  expect(j2.headers()["x-j2-source"]).toBe("cache");
  await expect(page.getByText(/for the bedroom$/).filter({ visible: true }).first()).toBeVisible();

  // Closer on a work, then open the first work.
  await room.getByRole("button", { name: /^Closer to / }).first().click();
  await room.getByRole("listitem").first().getByRole("link").click();

  // Piece: the large size is preselected; choose a frame, then hang it.
  await page.waitForURL("**/piece/**");
  await expect(page.getByRole("button", { name: /^30 x 40 in/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Natural oak/ }).click();
  await expect(page.getByRole("button", { name: /^Natural oak/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Hang it" }).click();

  // Wall: the bed scene and the large size follow the phrase; change the frame and the wall color.
  await page.waitForURL("**/wall");
  await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "bed");
  await expect(page.getByRole("group", { name: "Size" }).getByRole("button", { name: /^30 x 40 in/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Frame" }).getByRole("button", { name: "Natural oak" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Frame" }).getByRole("button", { name: "Brass" }).click();
  await page.getByRole("group", { name: "Wall color" }).getByRole("button", { name: "Sage" }).click();
  await expect(page.getByRole("group", { name: "Wall color" }).getByRole("button", { name: "Sage" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add to bag" }).click();

  // Bag: one line with the size and frame chosen on the Wall, then on to Close.
  await page.waitForURL("**/bag");
  await expect(page.getByText(/30 x 40 in, framed print, brass frame/).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText("Total", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: "Finish" }).click();

  // Close: all four metrics and the Signals link.
  await page.waitForURL("**/close");
  await expect(page.getByText("No search typed")).toBeVisible();
  await expect(page.getByText("Time to first piece")).toBeVisible();
  await expect(page.getByText("Re-hangs")).toBeVisible();
  await expect(page.getByText("Pieces chosen")).toBeVisible();
  await page.getByRole("main").filter({ visible: true }).getByRole("link", { name: "Signals" }).click();

  // Signals: four findings each with an action, the simulated label, your session, the ask, then the contact block.
  await page.waitForURL("**/signals");
  const signals = page.getByRole("main").filter({ visible: true });
  await expect(signals.getByRole("heading", { level: 1, name: "Signals" })).toBeVisible();
  await expect(signals.getByText("Simulated data.")).toBeVisible();
  const findings = signals.getByRole("list").first().getByRole("listitem");
  await expect(findings).toHaveCount(4);
  for (const f of await findings.all()) await expect(f.getByRole("heading", { name: "Action" })).toBeVisible();
  await expect(signals.getByRole("heading", { name: "Your session" })).toBeVisible();
  await expect(signals.getByText(/30 x 40 in, framed print, brass frame/)).toBeVisible();
  await expect(signals.getByRole("heading", { name: "Next step" })).toBeVisible();
  await expect(signals.getByText(/licensed SKUs/)).toBeVisible();
  await expect(signals.getByRole("link", { name: "scott@reasinger.net" })).toHaveAttribute("href", "mailto:scott@reasinger.net");
  await expect(signals.getByRole("link", { name: "LinkedIn" })).toBeVisible();

  // No sideways scroll at this width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);

  // Nothing leaves the browser but the typed sentence [quality-bar section 9, D-066, D-067].
  const origin = new URL(baseURL!).origin;
  const withBody = sent.filter((r) => r.method() !== "GET");
  expect(withBody.map((r) => `${r.method()} ${new URL(r.url()).pathname}`)).toEqual(["POST /api/j2"]);
  expect(JSON.parse(withBody[0].postData()!)).toEqual({ text: phrase });
  for (const r of sent) {
    const url = new URL(r.url());
    expect(url.origin, `${r.method()} ${r.url()}`).toBe(origin);
    // Page and navigation fetches carry no query beyond the framework's own _rsc key.
    expect([...url.searchParams.keys()].filter((k) => k !== "_rsc"), r.url()).toEqual([]);
  }
});
