# Hearthline contributor instructions

Preserve user files. Read README.md and docs/ROADMAP.md before changing behavior.

- Simulation belongs in src/sim.ts: seeded generation, serializable state, integer ticks, no DOM, wall clock, or Math.random.
- Rendering belongs in src/renderer.ts; user input, storage, and display belong in src/main.ts.
- Test public simulation commands, stepping, and persistence. Test real browser controls for UI changes. Do not expose test-only runtime controls in production.
- Run npm run check and npm run test:e2e. Report exact commands and failures. Physical devices are separate from emulation.
- Keep assets original, the build static, and saves local. No secret, tracking, paid service, backend, or new credential without approval.
- Work in issue-sized branches; draft PRs by default. Never change repository visibility, workflow token scopes, or hosting destinations silently.
- GitHub Actions validates and packages. ChatGPT Sites publishing is a separate connector-mediated release; do not invent an Actions deployment API.
