# Contributing to Back Offices

Thanks for your interest! This is a small, self-contained project and contributions are welcome.

## Getting started

There's no build step. Clone the repo and serve it statically (the import map needs `http://`):

```bash
npx serve .
# open http://localhost:3000
```

Read [`HANDOFF.md`](HANDOFF.md) first — it maps every file and system and lists the invariants you need
to respect (especially the room-index rules and why the intro is an off-grid context).

## Ground rules that keep the game coherent

- **Preserve the tone.** Corporate-appropriate, non-gore, no jump scares. The dread is systemic, not a
  creature.
- **Respect the Dread System.** `DreadLevel` is the single source of atmosphere. New puzzle-relevant
  actions should call `dread.lower()` (which is also the hint system's progress signal); "wrong" actions
  call `dread.raise()`.
- **Don't shift room indices.** Room 1 is index 0 and lots of logic depends on it (notification scope,
  checkpoints). New pre-game or interstitial scenes should be built as off-grid standalone contexts, the
  way `src/game/intro.js` is.
- **Pressure entities stay colliderless.** They must never block a puzzle path.
- **Keep it asset-light.** The office is procedural by design. New binary assets are only for the curated
  hero-moment set (Phase 2) and must be CC0 / permissively licensed and listed in [`CREDITS.md`](CREDITS.md).
- **Accessibility.** New motion/flash effects should respect the comfort settings and `prefers-reduced-motion`
  (Phase 3).

## Pull requests

- Keep PRs focused and describe what you changed and why.
- Test a full fresh-start playthrough (clear `localStorage`) and confirm the browser console is clean.
- Match the surrounding code style (small modules, clear names, comments that explain *why*).

## Reporting issues

Open an issue with steps to reproduce, your browser/OS, and a screenshot or console output if relevant.
