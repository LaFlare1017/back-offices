<!-- Replace the placeholder links below (marked <…>) with your real URLs. -->

# Back Offices

> A Backrooms game where the monster is the enterprise.

**Back Offices** is a first-person browser game set in an endless corporate liminal space. Nothing is
chasing you — the antagonist is systemic dysfunction. Close five enterprise **AI-transformation gaps**
(Data · Workflow · Governance · Readiness · Alignment) and escape into the light.

No combat. No death. No fail state. Just you, a too-quiet office, and the growing sense that the way out
is fixing what's broken.

[![License: MIT](https://img.shields.io/badge/License-MIT-7FD4C4.svg)](LICENSE)
![No build step](https://img.shields.io/badge/build-none-C9BB63)
![Zero binary assets](https://img.shields.io/badge/assets-0%20binary-D46A5A)
![Three.js](https://img.shields.io/badge/three.js-0.161-B8A94E)

**▶ Play:** `https://LaFlare1017.github.io/back-offices/` · **Playtime:** 5–10 min · **Desktop + mobile**

<!-- ![Back Offices gameplay](docs/gameplay.gif) -->

---

## The five gaps

| # | Room | Gap | What you learn |
|---|------|-----|----------------|
| 1 | The Records Floor | **Data** | Data isn't missing — it's inconsistent, stale, and never built to flow. |
| 2 | The Process Corridors | **Workflow** | Everyone did it their own way, so nothing connected. Standardize and the loop breaks. |
| 3 | The Server Vault | **Governance** | With no rules for who can open what, every door is a risk. Access, accountability, control. |
| 4 | The Training Floor | **Readiness** | The tools were never the problem. Communicate. Train. Then people move. |
| 5 | The Divided Departments | **Alignment** | Every team was right about something, none about everything. Aligning is convergence, not compromise. |

Then: the synthesis, the escape, and the silence where the hum used to be.

## The Dread System

A single float, `DreadLevel` (0–1), *is* the monster. Running from a room's real task raises it; engaging
with it lowers it. In real time it drives the fluorescent hum (synthesized), the light flicker, and the
screen-edge unease. There is no chase AI — there is only this. See [`HANDOFF.md`](HANDOFF.md) for the full
architecture.

## Controls

| | Move | Look | Interact |
|---|---|---|---|
| **Desktop** | WASD | mouse | E |
| **Mobile** | left-thumb joystick | right-thumb drag | tap the prompt |

## Highlights

- **Zero binary assets** — every texture is drawn on a `<canvas>` at runtime; every sound is synthesized
  with WebAudio. The whole game is HTML + CSS + JS.
- **No build step** — an ES-module import map pulls Three.js + Rapier from a CDN. Open a file server and play.
- **Roaming pressure entities** — the Competitor (fast, glitching, multiplying), the Board of Directors
  (slow, always watching), and the Legacy System — all colliderless, all feeding the Dread System, none
  ever blocking a puzzle.
- **Struggle-aware hints** — stuck for 60s and a soft teal glow points the way, without solving it for you.
- **Full mobile support** — virtual joystick, drag-look, tap-to-interact, and a mobile performance profile.
- **A cold open** that starts in a normal office and curdles into the Backrooms as you go looking for where
  to begin.

## Run locally

The import map needs `http://`, not `file://` — use any static server:

```bash
npx serve .
# open http://localhost:3000
```

## Deploy

It's a fully static site. Drop it on **GitHub Pages**, **Netlify**, or **Vercel** as-is:

```bash
npx netlify deploy --prod --dir .
# or: npx vercel --prod
```

## Tech stack

- **Three.js 0.161** (rendering) + **Rapier3D 0.14** (kinematic collision), via CDN import map
- Movement / camera / collision on **[GameBlocks](https://github.com/xt4d/GameBlocks)** modules
  (see [`gameblocks_usage.md`](gameblocks_usage.md))
- Procedural canvas textures + synthesized WebAudio — no binary assets
- `localStorage` checkpointing
- Type: Space Grotesk · IBM Plex Sans · IBM Plex Mono

## Docs

- [`HANDOFF.md`](HANDOFF.md) — full technical handoff (architecture, systems, invariants, how to extend)
- [`ROADMAP.md`](ROADMAP.md) — improvement perspective + phased roadmap
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute
- [`CREDITS.md`](CREDITS.md) — third-party attribution

## Credits

Created by **Leron Garriques** — [GitHub](https://github.com/LaFlare1017) · [LinkedIn](https://www.linkedin.com/in/lerongarriques/).
Built with the help of Claude Code. Design intent in `backrooms-enterprise-ai-game-handoff.md`.

## License

[MIT](LICENSE) © 2026 Leron Garriques.
