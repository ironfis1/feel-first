import { expect, test } from "@playwright/test";

// The demo path (docs/testing.md, quality-bar check 1): Threshold, Room with a poster first, describe a moment,
// Closer, a Piece with a frame chosen, Add to bag, Bag, Close with all four metrics and the Signals link.
// Runs at 390px and 1440px. Any uncaught error or console error fails it. The Wall step arrives in Milestone 5.

test("the demo path runs end to end with no console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
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

  // Describe a moment: the demo video phrase names the bedroom.
  await page.getByLabel("Or describe the moment").fill("a slow sunday morning in the bedroom, something large");
  await page.getByRole("button", { name: "Hang it" }).click();
  await expect(page.getByText(/for the bedroom$/).filter({ visible: true }).first()).toBeVisible();

  // Closer on a work, then open the first work.
  await room.getByRole("button", { name: /^Closer to / }).first().click();
  await room.getByRole("listitem").first().getByRole("link").click();

  // Piece: choose a frame and add to the bag.
  await page.waitForURL("**/piece/**");
  await page.getByRole("button", { name: /^Natural oak/ }).click();
  await expect(page.getByRole("button", { name: /^Natural oak/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("link", { name: "View your bag" }).click();

  // Bag: one line with the chosen frame, then on to Close.
  await page.waitForURL("**/bag");
  await expect(page.getByText(/natural oak frame/)).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Finish" }).click();

  // Close: all four metrics and the Signals link.
  await page.waitForURL("**/close");
  await expect(page.getByText("No search typed")).toBeVisible();
  await expect(page.getByText("Time to first piece")).toBeVisible();
  await expect(page.getByText("Re-hangs")).toBeVisible();
  await expect(page.getByText("Pieces chosen")).toBeVisible();
  await expect(page.getByRole("link", { name: "Signals" })).toHaveAttribute("href", "/signals");

  // No sideways scroll at this width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
