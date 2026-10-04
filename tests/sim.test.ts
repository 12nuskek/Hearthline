import { expect, test } from "vitest";
import { createWorld } from "../src/sim";
test("a seed reproduces a traversable settlement and three settlers", () => {
  const a = createWorld(42);
  expect(a).toEqual(createWorld(42));
  expect(a.people).toHaveLength(3);
  expect(a.tiles[9 * 20 + 9].kind).toBe("grass");
});
import { command, path, step, serialize, restore } from "../src/sim";
test("harvesting hauls to stock and survives a save roundtrip", () => {
  const w = createWorld();
  const i = w.tiles.findIndex((t) => t.resource === "food");
  command(w, i, "gather");
  for (let n = 0; n < 90; n++) step(w);
  expect(w.tiles[i].resource).toBeUndefined();
  expect(w.people.every((p) => p.carry === null)).toBe(true);
  expect(restore(serialize(w))).toEqual(w);
});
test("blueprints reserve materials once and cancellation refunds exactly", () => {
  const w = createWorld();
  command(w, 147, "cabin");
  expect(w.stock).toEqual({ wood: 8, stone: 4, food: 18 });
  command(w, 147, "cabin");
  expect(w.stock.wood).toBe(8);
  command(w, 147, "cancel");
  expect(w.stock.wood).toBe(20);
  command(w, 147, "cancel");
  expect(w.stock.wood).toBe(20);
});
test("routes avoid water and unreachable goals return no route", () => {
  const w = createWorld();
  const route = path(w, 189, 390);
  expect(route.length).toBeGreaterThan(0);
  expect(route.every((i) => w.tiles[i].kind === "grass")).toBe(true);
  expect(path(w, 189, 380)).toEqual([]);
});
test("a planned settlement can survive and win without stuck settlers", () => {
  const w = createWorld();
  w.tiles.forEach((t, i) => {
    if (t.resource) command(w, i, "gather");
  });
  command(w, 147, "garden");
  command(w, 148, "cabin");
  let cabin = 1,
    beacon = false;
  for (let n = 0; n < 1200 && w.status === "playing"; n++) {
    if (cabin < 3 && w.stock.wood >= 12 && w.stock.stone >= 4) {
      command(w, 148 + cabin, "cabin");
      cabin++;
    }
    if (!beacon && cabin === 3 && w.stock.wood >= 16 && w.stock.stone >= 12) {
      command(w, 151, "beacon");
      beacon = true;
    }
    step(w);
  }
  expect(w.status).toBe("won");
  expect(w.people.every((p) => p.health > 0)).toBe(true);
  expect(restore(serialize(w))).toEqual(w);
});
test("replay after load stays deterministic across event boundaries", () => {
  const w = createWorld();
  command(w, 147, "garden");
  for (let i = 0; i < 181; i++) step(w);
  const loaded = restore(serialize(w));
  for (let i = 0; i < 400; i++) {
    step(w);
    step(loaded);
  }
  expect(loaded).toEqual(w);
});
test("neglect produces a recoverable terminal loss and terminal ticks stop", () => {
  const w = createWorld();
  for (let i = 0; i < 3000; i++) step(w);
  expect(w.status).toBe("lost");
  const before = serialize(w);
  step(w);
  expect(serialize(w)).toBe(before);
  expect(createWorld().status).toBe("playing");
});
test("malformed saves are rejected", () => {
  for (const raw of [
    "null",
    "{}",
    '{"version":2}',
    serialize({ ...createWorld(), stock: { wood: -1, stone: 0, food: 0 } }),
  ])
    expect(() => restore(raw)).toThrow();
});
test("untrusted save display fields cannot inject markup", () => {
  const w = createWorld();
  Object.assign(w.people[0], { job: "<img src=x onerror=alert(1)>" });
  expect(() => restore(serialize(w))).toThrow();
});
test("completed cabins assign one stable home per settler", () => {
  const w = createWorld();
  command(w, 147, "cabin");
  for (let i = 0; i < 40; i++) step(w);
  expect(w.people.map((p) => p.home)).toEqual([147, null, null]);
  w.stock.wood = 24;
  w.stock.stone = 8;
  command(w, 148, "cabin");
  command(w, 149, "cabin");
  for (let i = 0; i < 80; i++) step(w);
  expect(w.people.map((p) => p.home)).toEqual([147, 148, 149]);
  expect(restore(serialize(w)).people.map((p) => p.home)).toEqual([
    147, 148, 149,
  ]);
});
test("only a cabin owner rests inside; unsheltered settlers rest outdoors", () => {
  const w = createWorld();
  w.tiles[147].building = "cabin";
  w.tiles[147].progress = 100;
  w.tick = 160;
  w.people.forEach((p) => {
    p.x = 7;
    p.y = 7;
    p.energy = 20;
  });
  step(w);
  expect(w.people.map((p) => p.job)).toEqual([
    "Resting inside",
    "Resting outdoors",
    "Resting outdoors",
  ]);
  expect(w.people[0].energy).toBeGreaterThan(w.people[1].energy);
});
import { setPriority } from "../src/sim";
test("numeric priorities choose work before distance and resource claims separate workers", () => {
  const w = createWorld();
  const targets = [
    w.tiles.findIndex((t) => t.resource === "wood"),
    w.tiles.findIndex((t) => t.resource === "stone"),
  ];
  targets.forEach((i) => command(w, i, "gather"));
  command(w, 147, "cabin");
  setPriority(w, 0, "gather", 1);
  setPriority(w, 0, "build", 3);
  setPriority(w, 1, "build", 1);
  setPriority(w, 1, "gather", 3);
  step(w);
  expect(targets).toContain(w.people[0].target);
  expect(w.people[1].target).toBe(147);
  expect(targets).toContain(w.people[2].target);
  expect(w.people[0].target).not.toBe(w.people[2].target);
});
import { readFileSync } from "node:fs";
test("foundation saves migrate without losing resources, time or settlers", () => {
  const raw = readFileSync(
    new URL("./fixtures/foundation-v1.json", import.meta.url),
    "utf8",
  );
  const original = JSON.parse(raw);
  const w = restore(raw);
  expect(w.version).toBe(2);
  expect(w.stock).toEqual(original.stock);
  expect(w.tick).toBe(80);
  expect(w.tiles).toEqual(original.tiles);
  expect(w.people.map((p) => p.priorities)).toEqual([
    { gather: 1, build: 2 },
    { gather: 2, build: 1 },
    { gather: 1, build: 2 },
  ]);
  expect(w.people[0].home).toBe(147);
  expect(restore(serialize(w))).toEqual(w);
});
test("resource claims release on hunger, cancellation and changed priorities", () => {
  const w = createWorld();
  const i = w.tiles.findIndex((t) => t.resource === "wood");
  command(w, i, "gather");
  step(w);
  expect(w.people[0].claim).toBe(i);
  w.people[0].hunger = 30;
  step(w);
  expect(w.people[0].claim).toBeNull();
  expect(w.people.slice(1).some((p) => p.claim === i)).toBe(true);
  command(w, i, "gather");
  step(w);
  expect(w.people.every((p) => p.claim === null)).toBe(true);
  command(w, i, "gather");
  step(w);
  const worker = w.people.findIndex((p) => p.claim === i);
  expect(worker).toBeGreaterThanOrEqual(0);
  setPriority(w, worker, "build", 1);
  expect(w.people[worker].claim).toBeNull();
});
test("saving exactly when a cabin completes keeps replay state unchanged", () => {
  const w = createWorld();
  command(w, 147, "cabin");
  for (let i = 0; i < 35; i++) {
    step(w);
    expect(restore(serialize(w))).toEqual(w);
  }
});
test("restoring a paused save normalizes stale or duplicate gather claims", () => {
  const w = createWorld();
  const i = w.tiles.findIndex((t) => t.resource === "wood");
  command(w, i, "gather");
  w.people[0].claim = i;
  w.people[1].claim = i;
  w.people[2].claim = 189;
  const loaded = restore(serialize(w));
  expect(loaded.people.map((p) => p.claim)).toEqual([i, null, null]);
});
