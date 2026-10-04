/** Deterministic, fixed-step colony simulation. No browser or renderer dependencies. */
export type Resource = "wood" | "stone" | "food";
export type Building = "cabin" | "garden" | "beacon";
export type Tile = {
  x: number;
  y: number;
  height: number;
  kind: "grass" | "water";
  resource?: Resource;
  amount: number;
  marked: boolean;
  building?: Building;
  progress: number;
};
export const JOBS = [
  "Waiting",
  "Lost",
  "Eating",
  "Going to eat",
  "Going to shelter",
  "Resting inside",
  "Resting outdoors",
  "Unloading",
  "Hauling",
  "Gathering",
  "Building",
] as const;
export type WorkKind = "gather" | "build";
export type Priority = 1 | 2 | 3;
export type Person = {
  name: string;
  x: number;
  y: number;
  hunger: number;
  energy: number;
  health: number;
  job: (typeof JOBS)[number];
  priorities: Record<WorkKind, Priority>;
  claim: number | null;
  carry: Resource | null;
  target: number | null;
  home: number | null;
};
export type World = {
  version: 2;
  seed: number;
  tick: number;
  tiles: Tile[];
  people: Person[];
  stock: Record<Resource, number>;
  logs: string[];
  status: "playing" | "won" | "lost";
};
export const SIZE = 20,
  DAY = 240;
const HUNGER_DRAIN = 0.16,
  ENERGY_DRAIN = 0.12,
  EAT_BELOW = 65,
  REST_BELOW = 25,
  NIGHT_REST_BELOW = 90;
export const COST: Record<Building, Partial<Record<Resource, number>>> = {
  cabin: { wood: 12, stone: 4 },
  garden: { wood: 6 },
  beacon: { wood: 16, stone: 12 },
};
export function createWorld(seed = 731): World {
  let n = seed >>> 0;
  const random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const tiles: Tile[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const r = random(),
        clear = x >= 7 && x <= 12 && y >= 7 && y <= 12;
      const water = !clear && ((x < 3 && y > 10) || (x > 16 && y < 7));
      const resource =
        clear || water
          ? undefined
          : r < 0.23
            ? "wood"
            : r < 0.32
              ? "stone"
              : r < 0.41
                ? "food"
                : undefined;
      tiles.push({
        x,
        y,
        height: water ? 0 : 1 + (!clear && r > 0.88 ? 1 : 0),
        kind: water ? "water" : "grass",
        resource,
        amount: resource ? 8 : 0,
        marked: false,
        progress: 0,
      });
    }
  return {
    version: 2,
    seed,
    tick: 0,
    tiles,
    people: ["Jun", "Mira", "Oren"].map((name, i) => ({
      name,
      x: 9 + i,
      y: 10,
      hunger: 90,
      energy: 90,
      health: 100,
      job: "Waiting",
      priorities: { gather: i === 1 ? 2 : 1, build: i === 1 ? 1 : 2 },
      claim: null,
      home: null,
      carry: null,
      target: null,
    })),
    stock: { wood: 20, stone: 8, food: 18 },
    logs: ["Three travelers. One shared beginning."],
    status: "playing",
  };
}
export function command(
  w: World,
  index: number,
  tool: "gather" | Building | "cancel",
): string {
  const t = w.tiles[index];
  if (!t || t.kind === "water") return "Choose dry land.";
  if (tool === "gather") {
    if (!t.resource) return "Choose a tree, berry bush, or stone.";
    t.marked = !t.marked;
    if (!t.marked)
      for (const p of w.people) if (p.claim === index) p.claim = null;
    return t.marked
      ? "Gathering marked. Settlers will harvest and haul."
      : "Gathering cancelled.";
  }
  if (tool === "cancel") {
    if (t.building && t.progress < 100) {
      for (const [r, v] of Object.entries(COST[t.building]))
        w.stock[r as Resource] += v;
      t.building = undefined;
      t.progress = 0;
      return "Blueprint cancelled. Materials returned.";
    }
    return "Select an unfinished blueprint.";
  }
  if (t.resource || t.building) return "Clear this tile before building.";
  if (Object.entries(COST[tool]).some(([r, v]) => w.stock[r as Resource] < v))
    return "Not enough stored materials. Mark resources to gather.";
  for (const [r, v] of Object.entries(COST[tool])) w.stock[r as Resource] -= v;
  t.building = tool;
  t.progress = 0;
  return `${tool[0].toUpperCase() + tool.slice(1)} planned. Materials reserved.`;
}
/** Breadth-first route; buildings remain traversable so blueprints cannot trap settlers. */
export function path(w: World, start: number, goal: number): number[] {
  if (!w.tiles[start] || !w.tiles[goal] || w.tiles[goal].kind === "water")
    return [];
  const queue = [start],
    prev = new Map<number, number>([[start, -1]]);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    if (at === goal) break;
    const t = w.tiles[at];
    for (const [x, y] of [
      [t.x - 1, t.y],
      [t.x + 1, t.y],
      [t.x, t.y - 1],
      [t.x, t.y + 1],
    ]) {
      const k = y * SIZE + x;
      if (
        x >= 0 &&
        y >= 0 &&
        x < SIZE &&
        y < SIZE &&
        w.tiles[k].kind !== "water" &&
        !prev.has(k)
      ) {
        prev.set(k, at);
        queue.push(k);
      }
    }
  }
  if (!prev.has(goal)) return [];
  const out: number[] = [];
  for (let k = goal; k !== start; k = prev.get(k)!) out.unshift(k);
  return out;
}
function walk(w: World, p: Person, k: number): boolean {
  p.target = k;
  if (p.y * SIZE + p.x === k) return true;
  const next = path(w, p.y * SIZE + p.x, k)[0];
  if (next !== undefined) {
    p.x = w.tiles[next].x;
    p.y = w.tiles[next].y;
  }
  return false;
}
function log(w: World, s: string) {
  w.logs = [s, ...w.logs].slice(0, 6);
}
export function step(w: World): void {
  if (w.status !== "playing") return;
  w.tick++;
  assignHomes(w);
  const cabins = w.tiles.filter(
      (t) => t.building === "cabin" && t.progress === 100,
    ),
    night = w.tick % DAY >= 160;
  if (w.tick % DAY === 160)
    log(w, "Night falls. Shelter makes rest twice as effective.");
  if (w.tick === DAY + 30) {
    w.stock.food += 8;
    log(w, "A passing forager shares 8 food.");
  }
  if (w.tick === DAY * 2) {
    w.stock.food = Math.max(0, w.stock.food - 5);
    log(w, "Rain spoiled 5 food. Gardens will replenish the stores.");
  }
  if (w.tick % 60 === 0)
    for (const t of w.tiles)
      if (t.building === "garden" && t.progress === 100) w.stock.food += 8;
  // Release interrupted reservations before any worker selects a new target.
  for (const p of w.people) {
    const t = p.claim === null ? undefined : w.tiles[p.claim];
    if (
      !t?.resource ||
      !t.marked ||
      p.carry ||
      p.health <= 0 ||
      (p.hunger - HUNGER_DRAIN < EAT_BELOW && w.stock.food > 0) ||
      p.energy - ENERGY_DRAIN < REST_BELOW ||
      (night && p.energy - ENERGY_DRAIN < NIGHT_REST_BELOW)
    )
      p.claim = null;
  }
  for (const p of w.people) {
    if (p.health <= 0) {
      p.job = "Lost";
      continue;
    }
    p.hunger = Math.max(0, p.hunger - HUNGER_DRAIN);
    p.energy = Math.max(0, p.energy - ENERGY_DRAIN);
    p.target = null;
    if (p.hunger < EAT_BELOW && w.stock.food > 0) {
      if (walk(w, p, 9 * SIZE + 9)) {
        w.stock.food--;
        p.hunger = Math.min(100, p.hunger + 24);
        p.job = "Eating";
      } else p.job = "Going to eat";
      continue;
    }
    if (p.hunger === 0) p.health = Math.max(0, p.health - 0.25);
    else if (p.hunger > 50) p.health = Math.min(100, p.health + 0.03);
    if (p.energy < REST_BELOW || (night && p.energy < NIGHT_REST_BELOW)) {
      const bed = p.home === null ? undefined : w.tiles[p.home];
      if (bed && !walk(w, p, bed.y * SIZE + bed.x)) {
        p.job = "Going to shelter";
        continue;
      }
      p.energy = Math.min(100, p.energy + (bed ? 1.5 : 0.65));
      p.job = bed ? "Resting inside" : "Resting outdoors";
      continue;
    }
    if (p.carry) {
      if (walk(w, p, 9 * SIZE + 9)) {
        w.stock[p.carry] += 4;
        p.carry = null;
        p.job = "Unloading";
      } else p.job = "Hauling";
      continue;
    }
    const tasks = w.tiles
      .map((t, i) => ({ t, i }))
      .filter(
        ({ t, i }) =>
          (t.marked &&
            t.resource &&
            !w.people.some((other) => other !== p && other.claim === i)) ||
          (t.building && t.progress < 100),
      );
    tasks.sort((a, b) => {
      const rank = (t: Tile) =>
        p.priorities[t.resource ? "gather" : "build"] * 100;
      return (
        rank(a.t) -
        rank(b.t) +
        Math.abs(a.t.x - p.x) +
        Math.abs(a.t.y - p.y) -
        Math.abs(b.t.x - p.x) -
        Math.abs(b.t.y - p.y)
      );
    });
    const task = tasks.find(
      ({ i }) =>
        i === p.y * SIZE + p.x || path(w, p.y * SIZE + p.x, i).length > 0,
    );
    p.claim = task?.t.resource ? task.i : null;
    if (!task) {
      p.job = "Waiting";
      continue;
    }
    const { t, i } = task;
    p.job = t.resource ? "Gathering" : "Building";
    if (!walk(w, p, i)) continue;
    if (t.resource) {
      t.amount -= 4;
      p.carry = t.resource;
      p.claim = null;
      if (t.amount <= 0) {
        t.resource = undefined;
        t.marked = false;
      }
    } else if (t.building) {
      t.progress = Math.min(100, t.progress + 5);
      if (t.progress === 100)
        log(
          w,
          `${t.building[0].toUpperCase() + t.building.slice(1)} complete.`,
        );
    }
  }
  assignHomes(w);
  if (w.people.some((p) => p.health <= 0)) {
    w.status = "lost";
    log(w, "A settler was lost. Begin again with food and shelter first.");
  } else if (
    w.tick >= DAY * 3 &&
    cabins.length >= 3 &&
    w.stock.food >= 12 &&
    w.tiles.some((t) => t.building === "beacon" && t.progress === 100)
  ) {
    w.status = "won";
    log(w, "The beacon shines. Hearthline is home.");
  }
}
export function serialize(w: World): string {
  return JSON.stringify(w);
}
export function restore(raw: string): World {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== "object" || !("version" in saved))
    throw Error("Unsupported or damaged save");
  if (saved.version === 1) {
    if (!("people" in saved) || !Array.isArray(saved.people))
      throw Error("Damaged save");
    for (const p of saved.people) {
      if (!p || !["gather", "build"].includes(p.priority))
        throw Error("Damaged save");
      p.priorities = {
        gather: p.priority === "gather" ? 1 : 2,
        build: p.priority === "build" ? 1 : 2,
      };
      p.home = null;
      p.claim = null;
      delete p.priority;
    }
    saved.version = 2;
  }
  const w = saved as World;
  if (
    w.version !== 2 ||
    !Number.isInteger(w.seed) ||
    !Number.isInteger(w.tick) ||
    w.tick < 0 ||
    !Array.isArray(w.tiles) ||
    w.tiles.length !== 400 ||
    !Array.isArray(w.people) ||
    w.people.length !== 3 ||
    !["playing", "won", "lost"].includes(w.status) ||
    !Array.isArray(w.logs) ||
    !w.logs.every((s) => typeof s === "string")
  )
    throw Error("Unsupported or damaged save");
  const finite = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (
    !w.stock ||
    !["wood", "stone", "food"].every((r) => finite(w.stock[r as Resource])) ||
    !w.tiles.every(
      (t, i) =>
        t.x === i % 20 &&
        t.y === Math.floor(i / 20) &&
        ["grass", "water"].includes(t.kind) &&
        finite(t.height) &&
        t.height <= 2 &&
        finite(t.amount) &&
        finite(t.progress) &&
        t.progress <= 100 &&
        (!t.resource || ["wood", "stone", "food"].includes(t.resource)) &&
        (!t.building || ["cabin", "garden", "beacon"].includes(t.building)),
    ) ||
    !w.people.every(
      (p) =>
        ["Jun", "Mira", "Oren"].includes(p.name) &&
        JOBS.includes(p.job) &&
        Number.isInteger(p.x) &&
        p.x >= 0 &&
        p.x < 20 &&
        Number.isInteger(p.y) &&
        p.y >= 0 &&
        p.y < 20 &&
        [p.hunger, p.energy, p.health].every((v) => finite(v) && v <= 100) &&
        p.priorities &&
        [p.priorities.gather, p.priorities.build].every((n) =>
          [1, 2, 3].includes(n),
        ) &&
        [p.home, p.claim].every(
          (n) =>
            n === null || (Number.isInteger(n) && n >= 0 && n < SIZE * SIZE),
        ) &&
        (!p.carry || ["wood", "stone", "food"].includes(p.carry)),
    )
  )
    throw Error("Damaged save");
  assignHomes(w);
  const claimed = new Set<number>();
  for (const p of w.people) {
    const t = p.claim === null ? undefined : w.tiles[p.claim];
    if (
      !t?.resource ||
      !t.marked ||
      p.carry ||
      p.health <= 0 ||
      claimed.has(p.claim!)
    )
      p.claim = null;
    else claimed.add(p.claim!);
  }
  return w;
}

export function setPriority(
  w: World,
  index: number,
  kind: WorkKind,
  priority: Priority,
): void {
  const p = w.people[index];
  if (!p || ![1, 2, 3].includes(priority)) return;
  p.priorities[kind] = priority;
  p.claim = null;
}

/** Existing homes stay assigned; each completed cabin houses one living settler. */
function assignHomes(w: World): void {
  const occupied = new Set<number>();
  for (const p of w.people) {
    const t = p.home === null ? undefined : w.tiles[p.home];
    if (
      p.health <= 0 ||
      !t ||
      t.building !== "cabin" ||
      t.progress !== 100 ||
      occupied.has(p.home!)
    )
      p.home = null;
    else occupied.add(p.home!);
  }
  for (const p of w.people) {
    if (p.home !== null || p.health <= 0) continue;
    const i = w.tiles.findIndex(
      (t, i) =>
        t.building === "cabin" && t.progress === 100 && !occupied.has(i),
    );
    if (i >= 0) {
      p.home = i;
      occupied.add(i);
    }
  }
}
