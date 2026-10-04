# Homes and work iteration — 2026-10-04

## Scope and behavior

Issue #2 subset: one assigned resident per completed cabin, numeric gather/build priorities, exclusive resource claims released when needs or commands interrupt work, keyboard map controls/live tile descriptions and large direction/apply buttons. Existing foundation saves migrate to schema version 2 with the same storage key. Map seeds, manual bed reassignment and physical-device certification remain outside this release.

## Validation

`npm run check` passes: ESLint, strict TypeScript/build, 15 simulation tests. Added tests cover cabin ownership/capacity, actual sheltered vs outdoor rest, priority ordering, distinct resource targets, interrupted/cancelled claims, real foundation-save migration, and save/load at the exact cabin-completion tick. Existing deterministic replay, full survival victory, loss and resource conservation tests still pass.

`npm run test:e2e` passes 8 Chromium production-build tests: six foundation flows plus keyboard-only placement/description/focus retention and migrated-save home/priority display. Desktop 1440×1000 and phone layout 390×844; separate emulated-touch context covers assignment, drag and cancelled gestures. Browser plugin unavailable; Playwright uses installed Chromium. Physical iOS/Android, Safari/Firefox and screen-reader software have not been tested; accessible semantics and keyboard behavior have automated coverage.

Visual inspection checks original voxel appearance, numeric controls, selected tile/home descriptions and phone overflow. Screenshots are in docs/screenshots and CI evidence artifacts. The software Canvas renderer and 20×20 world remain unchanged in scale.

## Release receipts

Foundation PR #4 merged only after the approved head 18cf3d0, two successful check runs, no submitted reviews and mergeability were confirmed. Main merge commit: aabf794c7d6a0ac4c2b304140890677276df96e5. Post-merge CI passed: https://github.com/12nuskek/Hearthline/actions/runs/37166682457 .

The new iteration is a separate draft PR. Parent owns deployment to the existing private Site; no duplicate Site or release is created here. CI still validates/packages rather than claiming unsupported unattended Sites deployment.
