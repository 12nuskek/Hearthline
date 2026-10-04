# Release verification — 2026-10-04

## Automated checks

`npm run check`: ESLint, 9 Vitest simulation tests, strict TypeScript and Vite production build pass.

Simulation coverage: seeded world reproducibility; gather/haul and persistence; exact reservation/refund; water routing; complete survival victory without stuck settlers; save/load replay over events; neglect/loss and terminal freeze; damaged saves and unsafe display fields.

`npm run test:e2e`: Chromium tests run against the production static build at `http://127.0.0.1:4173`. Desktop 1440×1000; phone layout 390×844; separate touch-enabled mobile context. Coverage: identity/nonblank page, runtime errors, overflow, pause/speed, save/load, priorities, guide, reset/cancel, corrupted-save recovery, actual map construction/cancellation/gathering, refresh→visibility pause save preservation, keyboard use after button focus, touch assignment/drag/cancelled gesture, and completed-world restoration.

Physical iOS/Android and Safari/Firefox have **not** been tested. Browser plugin was unavailable; the existing system Chromium provided Playwright verification. A browser-download domain restriction did not affect this installed-browser path. CI uses standard Playwright Chromium.

## Independent review

Two agents reviewed standards and specification against initial commit `ecb0151`.

Standards findings: verification document missing (added); UI priority mutation bypassed simulation (moved into simulation command); job string validation duplicated its domain (shared literal union). Nonblocking balancing constants are still partly duplicated in UI copy.

Spec findings: refresh could overwrite prior saves when hidden (automatic paused restore added, regression tested); focused speed buttons blocked shortcuts (fixed, regression tested); phone-sized tests were not touch tests (separate emulated-touch context added). No physical-device claim is made.

## Visual evidence

Original orthographic voxel boxes rendered through Canvas 2D: terrain height, top/side faces, depth-sorted vegetation, block settlers and buildings. This is a software voxel renderer, not a GPU 3D engine or free camera. Initial desktop/mobile, constructed cabin, and victory screenshots are retained under `docs/screenshots/` and CI browser-evidence artifacts. The victory view restores a world reached through the real deterministic simulation commands; it is not a manually fabricated victory state.

## Remote release boundaries

Public repository verified via GitHub connector. Code pushed to `feat/playable-foundation`; draft PR #4; foundation #1, follow-up #2, Sites publication #3. CLI GitHub API access is blocked in this Cloud environment; supported connector calls handle issues, PR and Actions checks. Git push and remote SHA verification work normally.

Initial Actions run: https://github.com/12nuskek/Hearthline/actions/runs/37164267764 — all check, browser, build and artifact steps succeeded. The final handoff records the later reviewed commit's separate CI result.

Sites publication is not performed by this executor: the parent owns integration coordination. Clone the final remote commit, run `npm ci && npm run build`, and publish `dist/` through the supported Sites source/save/deploy workflow. No hosting manifest with invented Site identity, external Actions API, credential or alternate host has been added.
