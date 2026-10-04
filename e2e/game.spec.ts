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
    await page.getByRole("button", { name: "Jun gather priority 1" }).click();
    await expect(
      page.getByRole("button", { name: "Jun gather priority 2" }),
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
test("refresh preserves saved settlement before visibility pause and shortcuts work after clicking", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Fast speed" }).click();
  await page.waitForTimeout(1100);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveClass("active");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem("hearthline.save.v1"),
  );
  await page.reload();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    await page.evaluate(() => localStorage.getItem("hearthline.save.v1")),
  ).toBe(before);
});
test("touch assignment, drag and cancelled gesture on phone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page.locator('[data-tool="cabin"]').tap();
  const box = (await page.locator("canvas").boundingBox())!;
  const s = Math.min(box.width / 43, box.height / 25);
  const x = box.x + box.width / 2,
    y = box.y + box.height * 0.35 + 15 * s * 0.5 - 0.23 * s;
  await page.touchscreen.tap(x, y);
  await expect(page.getByRole("status")).toContainText("planned");
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 45, y: y + 30 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await page.getByRole("button", { name: "Center map" }).tap();
  await page.locator('[data-tool="cancel"]').tap();
  await page.touchscreen.tap(x, y);
  await expect(page.getByRole("status")).toContainText("returned");
  await context.close();
});
test("a completed simulation restores as a visible terminal settlement", async ({
  page,
}) => {
  const { createWorld, command, step, serialize } = await import("../src/sim");
  const w = createWorld();
  w.tiles.forEach((t, i) => {
    if (t.resource) command(w, i, "gather");
  });
  command(w, 147, "garden");
  command(w, 148, "cabin");
  let cabins = 1,
    beacon = false;
  for (let n = 0; n < 1200 && w.status === "playing"; n++) {
    if (cabins < 3 && w.stock.wood >= 12 && w.stock.stone >= 4) {
      command(w, 148 + cabins, "cabin");
      cabins++;
    }
    if (!beacon && cabins === 3 && w.stock.wood >= 16 && w.stock.stone >= 12) {
      command(w, 151, "beacon");
      beacon = true;
    }
    step(w);
  }
  expect(w.status).toBe("won");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(
    (raw) => localStorage.setItem("hearthline.save.v1", raw),
    serialize(w),
  );
  await page.goto("/");
  await expect(page.locator("#hint")).toContainText("A home at last");
  await page.screenshot({ path: "/tmp/hearthline-victory.png" });
});
test("keyboard map navigation builds and reports selected terrain without pointer input", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-tool="cabin"]').focus();
  await page.keyboard.press("Space");
  const map = page.getByRole("application", { name: "Settlement map" });
  await map.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#tile-description")).toContainText(
    "Tile 7, 7. Meadow",
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("planned");
  await expect(page.locator("#tile-description")).toContainText("cabin, 0%");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tool="inspect"]')).toHaveClass("active");
  await page.keyboard.press("Tab");
  await expect(map).not.toBeFocused();
  await page.getByRole("button", { name: "Select east tile" }).click();
  await expect(page.locator("#tile-description")).toContainText("Tile 8, 7");
  await page.getByRole("button", { name: "Jun gather priority 1" }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Jun gather priority 2" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Normal speed" }).click();
  await page.getByRole("button", { name: "Jun gather priority 2" }).focus();
  await page.waitForTimeout(1200);
  await expect(
    page.getByRole("button", { name: "Jun gather priority 2" }),
  ).toBeFocused();
});
test("foundation save restores assigned homes and new priorities in the browser", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync(
    new URL("../tests/fixtures/foundation-v1.json", import.meta.url),
    "utf8",
  );
  await page.addInitScript(
    (raw) => localStorage.setItem("hearthline.save.v1", raw),
    raw,
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Locate Jun home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jun gather priority 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mira build priority 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Locate Jun home" }).click();
  await expect(page.locator("#tile-description")).toContainText("Jun’s home");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hearthline.save.v1")!),
  );
  expect(saved.version).toBe(2);
  expect(saved.tick).toBe(80);
  await page.screenshot({ path: "/tmp/hearthline-homes.png", fullPage: true });
});
