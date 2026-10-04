import "./style.css";
import {
  createWorld,
  command,
  step,
  serialize,
  restore,
  DAY,
  togglePriority,
  type Building,
} from "./sim";
import { Renderer } from "./renderer";
let world = createWorld(),
  speed = 0,
  tool: "inspect" | "gather" | Building | "cancel" = "inspect",
  last = 0,
  acc = 0;
const KEY = "hearthline.save.v1";
document.querySelector("#app")!.innerHTML =
  `<header><div class="brand"><span class="brandmark">⌂</span><div>HEARTHLINE<small>A PLACE TO BEGIN</small></div></div><div id="resources"></div><div class="header-actions"><button id="save">Save</button><button id="load">Load</button><button id="help" aria-label="Open field guide">?</button></div></header><main><section class="world"><canvas aria-label="Isometric settlement. Select a tool then tap a terrain tile."></canvas><div class="world-top"><span class="eyebrow">THE ALDER REACH <i> / </i> FIRST SETTLEMENT</span><span id="day"></span></div><div class="intro"><span class="eyebrow">YOUR FIRST CHAPTER</span><h1>A little warmth.<br>A place to stay.</h1><p>Three strangers, a quiet valley.<br>Make something worth coming home to.</p></div><div class="camera"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="center" aria-label="Center map">⌖</button></div><div class="world-bottom"><span id="hint">Drag to explore · Scroll to zoom</span><div class="speed"><button data-speed="0" class="active" aria-label="Pause">Ⅱ</button><button data-speed="1" aria-label="Normal speed">1×</button><button data-speed="3" aria-label="Fast speed">3×</button></div></div></section><aside><div class="section-heading"><span class="eyebrow">SETTLEMENT</span><span class="pill">FOUNDING DAYS</span></div><h2>Keep the hearth alive.</h2><p class="muted">Survive three nights. Give everyone a home, then light a beacon for tomorrow.</p><div id="objectives"></div><div class="section-heading settlers-heading"><span class="eyebrow">YOUR PEOPLE</span><span>03</span></div><div id="people"></div><div class="section-heading"><span class="eyebrow">FIELD NOTES</span><span>↗</span></div><div id="logs"></div><button id="reset" class="text-button">Begin a new settlement</button></aside></main><footer><div class="tool-label"><span class="eyebrow">MAKE A HOME</span><small>Choose a task, then tap a tile</small></div><nav aria-label="Settlement tools"><button data-tool="inspect" class="active"><b>⌖</b>Inspect<small>Look around</small></button><button data-tool="gather"><b>♧</b>Gather<small>Wood · stone · food</small></button><button data-tool="cabin"><b>⌂</b>Cabin<small>12 wood · 4 stone</small></button><button data-tool="garden"><b>▥</b>Garden<small>6 wood</small></button><button data-tool="beacon"><b>♜</b>Beacon<small>16 wood · 12 stone</small></button><button data-tool="cancel"><b>×</b>Cancel<small>Refund blueprint</small></button></nav></footer><div id="toast" role="status"></div><dialog id="guide"><span class="eyebrow">WELCOME TO HEARTHLINE</span><h2>Build a life, one tile at a time.</h2><p>Start time with <b>1×</b>. Select <b>Gather</b> and tap trees, pale stone blocks, or berry bushes. Settlers harvest and carry supplies to the glowing hearth.</p><p>Place <b>three cabins</b> on clear land, grow food with <b>gardens</b>, and build a <b>beacon</b>. Keep all three settlers alive through three nights with at least 12 food stored. Each day lasts four minutes at 1×.</p><p>Tap a settler's priority to favor building or gathering. Eating, hauling, and rest happen automatically. Gardens yield 8 food every minute. A cabin shelters everyone for now; the goal requires a home for each.</p><p>Drag to pan, scroll or use +/− to zoom. Space pauses, 1 and 3 change speed. On touch screens, drag with one finger and tap to assign. The game pauses when hidden. Save locally before leaving; autosaves every 30 seconds.</p><button id="close-guide">Let’s begin →</button></dialog><dialog id="reset-dialog"><h2>Start a fresh settlement?</h2><p>This replaces your current local save.</p><button id="confirm-reset">Start again</button><button id="cancel-reset">Keep this settlement</button></dialog>`;
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
const canvas = document.querySelector("canvas")!,
  renderer = new Renderer(canvas);
function toast(text: string) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 4500);
}
function save() {
  try {
    localStorage.setItem(KEY, serialize(world));
    toast("Settlement saved on this device.");
  } catch {
    toast(
      "Storage unavailable. Keep this tab open to preserve your settlement.",
    );
  }
}
function setSpeed(n: number) {
  speed = n;
  acc = 0;
  document
    .querySelectorAll("[data-speed]")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        Number((b as HTMLElement).dataset.speed) === n,
      ),
    );
}
function renderUI() {
  $("#resources").innerHTML =
    `<span><i>▰</i><b>${world.stock.wood}</b><small>WOOD</small></span><span><i>◆</i><b>${world.stock.stone}</b><small>STONE</small></span><span><i>●</i><b>${world.stock.food}</b><small>FOOD</small></span>`;
  $("#day").textContent =
    `${world.tick % DAY >= 160 ? "☾" : "☀"} Day ${Math.floor(world.tick / DAY) + 1} · ${world.tick % DAY >= 160 ? "Night" : "Daylight"}`;
  const count = (b: Building) =>
    world.tiles.filter((t) => t.building === b && t.progress === 100).length;
  $("#objectives").innerHTML = [
    [
      `${Math.min(3, count("cabin"))}/3`,
      "Build a cabin for each settler",
      count("cabin") >= 3,
    ],
    [
      `${Math.min(3, Math.floor(world.tick / DAY))}/3`,
      "Weather three nights",
      world.tick >= 720,
    ],
    [`${world.stock.food}/12`, "Keep a food reserve", world.stock.food >= 12],
    [
      `${Math.min(1, count("beacon"))}/1`,
      "Raise the welcome beacon",
      count("beacon") > 0,
    ],
  ]
    .map(
      ([n, s, done]) =>
        `<div class="objective ${done ? "done" : ""}"><span>${done ? "✓" : "○"}</span><p>${s}</p><b>${n}</b></div>`,
    )
    .join("");
  $("#people").innerHTML = world.people
    .map(
      (p, i) =>
        `<article class="person"><span class="portrait p${i}">▣</span><div class="person-info"><strong>${p.name}</strong><span>${p.job}</span><div class="meters"><label>Food <meter min="0" max="100" value="${p.hunger}"></meter></label><label>Rest <meter min="0" max="100" value="${p.energy}"></meter></label></div></div><button data-person="${i}" aria-label="${p.name} priority: ${p.priority}" title="Change job priority">${p.priority === "build" ? "Build" : "Gather"} ↺</button></article>`,
    )
    .join("");
  $("#logs").replaceChildren(
    ...world.logs.slice(0, 3).map((s) => {
      const p = document.createElement("p");
      p.textContent = s;
      return p;
    }),
  );
  if (world.status !== "playing") {
    $("#hint").textContent =
      world.status === "won"
        ? "A home at last. Your settlement is complete."
        : "The hearth went cold. Begin again when ready.";
    setSpeed(0);
  }
}
document
  .querySelectorAll<HTMLButtonElement>("[data-speed]")
  .forEach((b) => (b.onclick = () => setSpeed(Number(b.dataset.speed))));
document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach(
  (b) =>
    (b.onclick = () => {
      tool = b.dataset.tool as typeof tool;
      document
        .querySelectorAll("[data-tool]")
        .forEach((el) => el.classList.toggle("active", el === b));
      $("#hint").textContent =
        tool === "inspect"
          ? "Tap any tile to inspect"
          : `${tool[0].toUpperCase() + tool.slice(1)} · Tap a tile`;
    }),
);
$("#people").onclick = (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-person]",
  );
  if (b) {
    togglePriority(world, Number(b.dataset.person));
    renderUI();
  }
};
$("#save").onclick = save;
$("#load").onclick = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      toast("No saved settlement yet.");
      return;
    }
    world = restore(raw);
    setSpeed(0);
    renderUI();
    toast("Settlement restored. Time is paused.");
  } catch {
    toast("Could not load this save. Your current settlement is safe.");
  }
};
const guide = document.querySelector<HTMLDialogElement>("#guide")!;
$("#help").onclick = () => {
  setSpeed(0);
  guide.showModal();
};
$("#close-guide").onclick = () => guide.close();
const reset = document.querySelector<HTMLDialogElement>("#reset-dialog")!;
$("#reset").onclick = () => {
  setSpeed(0);
  reset.showModal();
};
$("#cancel-reset").onclick = () => reset.close();
$("#confirm-reset").onclick = () => {
  world = createWorld();
  renderer.selected = -1;
  renderUI();
  save();
  reset.close();
};
$("#zoom-in").onclick = () =>
  (renderer.zoom = Math.min(2.5, renderer.zoom + 0.2));
$("#zoom-out").onclick = () =>
  (renderer.zoom = Math.max(0.6, renderer.zoom - 0.2));
$("#center").onclick = () => {
  renderer.panX = 0;
  renderer.panY = 0;
  renderer.zoom = 1;
};
let down: { x: number; y: number; px: number; py: number } | null = null;
canvas.onpointerdown = (e) => {
  down = { x: e.clientX, y: e.clientY, px: renderer.panX, py: renderer.panY };
  canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove = (e) => {
  if (down) {
    renderer.panX = down.px + e.clientX - down.x;
    renderer.panY = down.py + e.clientY - down.y;
  }
};
canvas.onpointerup = (e) => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7) {
    const index = renderer.pick(e.clientX, e.clientY, world);
    renderer.selected = index;
    if (index >= 0) {
      const t = world.tiles[index];
      if (tool === "inspect")
        toast(
          `${t.building ? `${t.building} · ${t.progress}% built` : t.resource ? `${t.resource} · ${t.amount} remaining` : t.kind === "water" ? "River · Cannot build here" : "Meadow · Ready for building"} (${t.x}, ${t.y})`,
        );
      else if (world.status === "playing") {
        toast(command(world, index, tool));
        renderUI();
      }
    }
  }
  down = null;
};
canvas.onpointercancel = () => (down = null);
canvas.onwheel = (e) => {
  e.preventDefault();
  renderer.zoom = Math.max(
    0.6,
    Math.min(2.5, renderer.zoom - e.deltaY * 0.001),
  );
};
window.onkeydown = (e) => {
  if (document.querySelector("dialog[open]")) return;
  if (e.code === "Space") {
    e.preventDefault();
    setSpeed(speed ? 0 : 1);
  }
  if (e.key === "1" || e.key === "3") setSpeed(Number(e.key));
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setSpeed(0);
    save();
  }
});
setInterval(() => {
  if (world.tick > 0) save();
}, 30000);
let uiTick = 0;
function frame(now: number) {
  acc += Math.min(250, now - last) * speed;
  last = now;
  while (acc >= 1000) {
    step(world);
    acc -= 1000;
  }
  renderer.draw(world);
  if (world.tick !== uiTick) {
    uiTick = world.tick;
    renderUI();
  }
  requestAnimationFrame(frame);
}
try {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    world = restore(saved);
    toast("Settlement restored. Time is paused.");
  }
} catch {
  toast("Saved data could not be restored. Start again or load a valid save.");
}
renderUI();
requestAnimationFrame(frame);
