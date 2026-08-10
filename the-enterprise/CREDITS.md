# Credits & Attribution

## Libraries

- **[Three.js](https://threejs.org/)** (v0.161.0) — MIT License. 3D rendering.
- **[Rapier](https://rapier.rs/)** (`@dimforge/rapier3d-compat` v0.14.0) — Apache-2.0 License. Physics /
  kinematic character collision.
- **[GameBlocks](https://github.com/xt4d/GameBlocks)** — movement, camera, and collision modules, copied
  under `src/modules/` and reused as-is (see [`gameblocks_usage.md`](gameblocks_usage.md)). See the
  GameBlocks repository for its license.

## Fonts (Google Fonts)

- **Space Grotesk**, **IBM Plex Sans**, **IBM Plex Mono** — SIL Open Font License 1.1.

## Art & audio

All textures are procedurally generated on `<canvas>` at runtime; all audio is synthesized with the
WebAudio API. **The base game ships with zero binary assets.**

<!--
Phase 2 (hybrid graphics) will add curated CC0 / permissively-licensed 3D assets for hero moments
(the garden and prop-dressing). Each asset MUST be listed here before it is committed, e.g.:

- "Bench" by Kenney — CC0 — https://kenney.nl/assets/…
- "Oak Tree" by Quaternius — CC0 — https://poly.pizza/…

Keep this list authoritative: license, author, and source URL for every third-party asset.
-->

## Design

Original design intent: *Project Handoff — The Enterprise*
(`backrooms-enterprise-ai-game-handoff.md`). Aesthetic inspired by the Backrooms creepypasta genre.

## Not included in this repository

The `Reference/` folder (local only, git-ignored) contains third-party / copyrighted movie stills used
purely as private visual reference during development. They are **not** part of this project and are not
distributed with it.
