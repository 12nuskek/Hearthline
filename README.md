# Hearthline

An original, local-first voxel colony game for a browser. Three travelers arrive in the Alder Reach. Gather supplies, build a home for each settler, grow food and raise a welcome beacon. Survive three nights with everyone alive and 12 food in storage.

## Play

Start with **1×**. Select **Gather**, then tap trees, berry bushes or stone blocks. Settlers harvest and haul to the central hearth. Place a **garden** and a **cabin** on clear tiles; materials are reserved immediately. Gather more supplies to build two more cabins and a beacon. A garden provides 8 food each minute. Click each settler's priority to favor gathering or building. Eating, rest and hauling are automatic.

Drag to pan, scroll or +/− to zoom, tap to select. Space pauses; 1/3 select speed. Touch uses the same tools and one-finger drag. The field guide is under **?**. The simulation starts paused and pauses when its tab is hidden. Save/Load use this browser's local storage; autosave runs every 30 seconds. Load is explicit after refresh. Reset asks before replacing the save. Storage failure is reported.

## Develop and verify

Node 22+ and npm:

```sh
npm ci
npm run dev
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run preview
```

Local browser tests use `/usr/bin/chromium` when available; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override, or use downloaded Playwright Chromium. CI downloads Chromium. Browser plugin was unavailable in the Cloud executor, so QA uses Playwright.

`dist/` is the static release output. No runtime network requests, backend, API key, paid service or external art is required. System serif/sans fonts provide an offline-friendly presentation. Original code and procedural voxel art; no RimWorld content.

## Architecture

- `src/sim.ts`: deterministic public seam (`createWorld`, `command`, `step`, `serialize`, `restore`, `path`). One tick = one simulated second. Seeded generator, BFS routing, needs/work and objectives are independent of UI.
- `src/renderer.ts`: orthographic software voxel projection on Canvas 2D, bounded device pixel ratio. No GPU or 3D framework required for this small 20×20 scene.
- `src/main.ts`: controls, fixed-step accumulator, visibility pause, local persistence and UI.
- `tests/`: simulation/replay/whole-survival regressions. `e2e/`: real Chromium browser flows at desktop and phone dimensions.

Buildings are traversable to avoid enclosure deadlocks. One completed cabin currently shelters all resting settlers; victory requires three cabins. Settlers move on integer tiles. Terrain is generated from a fixed default seed; campaign variety, combat, individual beds, audio, keyboard map navigation and exportable saves are future work. Victory/loss ends the current simulation. This is a scoped first playable release.

## CI and publishing

GitHub Actions runs lint, simulation tests, strict type/build checks and browser tests on pushes and PRs. It uploads the static `dist` output plus screenshot/test evidence. Workflow permissions are only `contents: read`; no deployment credentials are required.

**Publication destination: ChatGPT Sites.** This repository is the public development source. Sites uses its supported connector-managed source/version/deploy workflow. There is no verified GitHub Actions-to-Sites API: CI produces a release artifact, and a Sites-capable session must perform and verify publication. Do not silently deploy to another host. One-time Site creation and any required source transfer must be completed through supported tooling. Parent session owns that coordination.

See [roadmap and acceptance criteria](docs/ROADMAP.md), [contributor rules](AGENTS.md), and [release verification](docs/VERIFICATION.md).
