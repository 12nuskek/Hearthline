import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`play, save, resume, reset on ${mobile ? "phone" : "desktop"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page).toHaveTitle(/Hearthline/);
    await expect(page.getByText("Keep the hearth alive.")).toBeVisible();
    await page.screenshot({
      path: `/tmp/hearthline-${mobile ? "phone" : "desktop"}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Normal speed" }).click();
    await page.waitForTimeout(2200);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hearthline.save.v1")!),
    );
    expect(saved.tick).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.getByRole("button", { name: "Load", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("restored");
    await page.getByRole("button", { name: "Jun priority: gather" }).click();
    await expect(
      page.getByRole("button", { name: "Jun priority: build" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open field guide" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Let’s begin" }).click();
    await page.getByRole("button", { name: "Begin a new settlement" }).click();
    await page.getByRole("button", { name: "Keep this settlement" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Begin a new settlement" }).click();
    await page
      .getByRole("button", { name: "Start again", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hearthline.save.v1")!).tick,
      ),
    ).toBe(0);
    await page.evaluate(() =>
      localStorage.setItem("hearthline.save.v1", "broken"),
    );
    await page.getByRole("button", { name: "Load", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Could not load");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("map tools construct, cancel and gather through real pointer input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const map = page.locator("canvas");
  const b = (await map.boundingBox())!;
  const scale = Math.min(b.width / 43, b.height / 25);
  const tile = async (x: number, y: number) =>
    page.mouse.click(
      b.x + b.width / 2 + (x - y) * scale,
      b.y + b.height * 0.2 + (x + y + 1) * scale * 0.5 - 0.23 * scale,
    );
  await page.getByRole("button", { name: "Cabin 12 wood" }).click();
  await tile(7, 7);
  await expect(page.getByRole("status")).toContainText("planned");
  await page.getByRole("button", { name: "Cancel Refund" }).click();
  await tile(7, 7);
  await expect(page.getByRole("status")).toContainText("returned");
  await page.getByRole("button", { name: "Cabin 12 wood" }).click();
  await tile(7, 7);
  await page.getByRole("button", { name: "Fast speed" }).click();
  await page.waitForTimeout(12000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const w = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hearthline.save.v1")!),
  );
  expect(w.tiles[147].progress).toBe(100);
  await page.screenshot({ path: "/tmp/hearthline-construction.png" });
  const resource = w.tiles.find(
    (t: { resource?: string; height: number }) => t.resource && t.height === 1,
  );
  await page.getByRole("button", { name: "Gather Wood" }).click();
  await tile(resource.x, resource.y);
  await expect(page.getByRole("status")).toContainText("marked");
});
