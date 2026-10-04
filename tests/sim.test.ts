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
