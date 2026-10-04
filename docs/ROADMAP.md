# Hearthline roadmap and release scope

GitHub tracking: [foundation #1](https://github.com/12nuskek/Hearthline/issues/1), [work/accessibility #2](https://github.com/12nuskek/Hearthline/issues/2), [Sites release #3](https://github.com/12nuskek/Hearthline/issues/3).

## Foundation acceptance criteria
- Seeded voxel landscape, readable settlers and distinct buildings.
- Mark resources, harvest and haul into shared stores; reserve/refund construction materials.
- Settlers prioritize jobs, walk around water, satisfy food/rest needs and use shelter.
- Three nights, three cabins, one beacon, 12 stored food and all settlers alive wins.
- Day/night, a forager gift and a bounded food-spoilage event; loss and restart.
- Pause/1×/3×, touch/desktop pan and zoom, local save/load/reset and autosave.
- Deterministic replay and full-loop tests, browser checks, strict TypeScript, lint/build, CI artifacts.

## Next issue: richer work and shelter
Acceptance: individual bed assignments; limited cabin capacity; per-job numeric priorities; resource claims prevent duplicate travel; regression tests for interrupted work.

## Next issue: terrain and accessibility
Acceptance: keyboard-addressable map tiles; screen-reader tile descriptions; larger optional touch targets; different reproducible map seeds; physical iOS/Android verification.

## Next issue: persistent campaign
Acceptance: versioned migrations, export/import saves, recovery slots and user-visible save timestamp; no data loss on refresh; optional endless continuation after victory.

## Next issue: visual depth
Acceptance: directional settler movement, separate legs/tools, richer building silhouettes and placement ghosts; measured phone performance remains smooth. No proprietary assets.

## Next issue: Sites release
Acceptance: supported Sites connector saves and deploys tested build/source; verify live entry, asset paths, touch layout and local storage. Record exact source SHA and Site version. CI does not deploy to Sites until an official external API is verified.
