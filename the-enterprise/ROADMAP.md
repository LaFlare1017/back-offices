# Back Offices — Improvement Perspective & Roadmap

This is a candid, thorough assessment of where the project stands and where it can go. It's written for
two readers: a contributor deciding what to work on, and anyone evaluating the engineering behind it.

The game is **complete and shipped** — five rooms, an intro, pressure entities, mobile support, a hint
system, a garden ending. What follows is not a list of bugs; it's the gap between "a polished game jam
build" and "a portfolio-grade open-source showcase."

---

## Where it's strong (worth preserving)

- **The Dread System.** One `0–1` float as the entire antagonist is an elegant, legible design spine.
  Every atmosphere channel (hum, flicker, vignette, chroma) reads from it. Don't dilute this.
- **Zero binary assets.** All textures are canvas-drawn, all audio is synthesized. This is a genuine and
  rare technical flex and a big part of the "look what I built from nothing" story.
- **No build step.** An import map means the repo runs by opening a file server — great for approachability.
- **Non-combat design.** Teaching through dread and discovery, not fail states, is distinctive and on-theme.
- **Clean system boundaries.** Dread, Pressure, Hints, Rooms, Intro are well-separated and individually
  understandable.

---

## Detailed improvement perspective

### 1. Accessibility & comfort — *the biggest real gap*
- **No reduced-motion path.** Flicker, chromatic aberration, and camera shake are always on. This is a
  photosensitivity / motion-sickness concern and the single most important thing to fix. Add comfort
  toggles + honor `prefers-reduced-motion`.
- **Color-only puzzle signals.** Teal = progress, red = danger, with no shape/label redundancy — a barrier
  for colorblind players. Pair every color cue with an icon or word.
- **No audio controls or captions.** Add master volume/mute and optional captions for narration + entity
  cues.
- **No FOV or look-sensitivity control.** Both are standard comfort options for first-person games.

### 2. Visuals
- **No shadows anywhere.** Adding contact shadows (SSAO/GTAO) is the single biggest realism jump available
  and is exactly what sells a liminal space. Currently ambient light is flat and props don't feel grounded.
- **No bloom.** The fluorescent tubes and the teal exit — the core "hope" cue — should glow. A post-process
  bloom pass is high-impact and cheap.
- **Repetition still reads.** The deterministic jitter helps, but procedural tiling can still look tiled;
  CC0 prop variety + procedurally-derived normal maps break it up.
- **Garden has no sky.** A procedural gradient-sky shader fixes it without adding a binary asset.

### 3. Story & onboarding
- **No controls tutorial.** New players learn by fumbling. A short, safe warm-up that teaches WASD/look/E
  and the dread mechanic before Room 1 dramatically improves the first five minutes.
- **Thin connective tissue.** The rooms are strong individually; interstitial beats and optional lore
  (emails/documents to find) would deepen the enterprise metaphor and reward exploration.

### 4. Architecture & engineering credibility
- **No tests, lint, or types.** For an open-source showcase these are the highest-leverage credibility
  additions. Pure logic (dread easing, hint-target selection, pressure spawn math, index invariants) is
  very testable.
- **Runtime CDN dependency.** three/rapier/fonts load from CDNs. An optional Vite build that vendors and
  pins them makes the artifact offline-robust while keeping the zero-setup dev path.
- **Scattered tuning constants.** Centralizing gameplay/feel numbers into one config module makes the
  project easier to tune and to read.
- **Repo hygiene.** Copyrighted movie reference stills and a stale duplicate folder must stay out of the
  public repo (handled by `.gitignore`).

### 5. Gameplay depth (optional / lower priority)
- Save only persists room index, not in-room progress.
- Pressure entities are intentionally non-lethal; a light "close call" feedback loop could deepen tension
  without breaking the no-fail-state design.
- Replayability leans on randomized pressure spawns; collectible lore would add a reason to explore.

---

## Prioritized roadmap

The project is organized into phases; each is independently shippable, so the repo is always demoable.

### Phase 0 — Docs & open-source readiness ✅ (this pass)
`HANDOFF.md`, `ROADMAP.md`, rewritten `README.md`, `LICENSE` (MIT), `.gitignore`, `CREDITS.md`,
`CONTRIBUTING.md`, `CHANGELOG.md`; remove copyrighted stills + stale duplicate from the tree; `git init`.

### Phase 1 — Technical-showcase landing page + GitHub Pages
Self-contained `docs/index.html`: hero + PLAY + looping gameplay GIF, the pitch, the five gaps, a
**"how it works" technical deep-dive** (Dread System, procedural everything, GameBlocks, pressure/hint/
mobile), tech badges, about-the-author. Capture GIF/screenshots + a real `og:image`. GitHub Action to
deploy game + landing to Pages on push.

### Phase 2 — Hybrid graphics upgrade
Post-processing (`EffectComposer`): **bloom**, **SSAO/GTAO**, subtle film grain, SMAA; move vignette/chroma
into the composer; bind intensity to `DreadLevel`. Procedural **normal maps** + **shadow maps** + a garden
**sky shader**. Curated **CC0 hero assets** (Quaternius/Poly Pizza garden, Kenney furniture) via `GLTFLoader`
with a preloader — office stays procedural. Every asset logged in `CREDITS.md` with license + URL.

### Phase 3 — Story hub + tutorial + comfort/settings
An off-grid narrative **hub + tutorial** (same pattern as `intro.js`) teaching controls and the dread
mechanic, plus optional lore collectibles. A **settings/comfort menu**: volume/mute, sensitivity, FOV,
flicker/chroma/shake reduction, `prefers-reduced-motion`, colorblind-safe redundancy, captions.

### Phase 4 — Engineering polish
Vitest tests on pure logic; ESLint + Prettier; CI running lint + tests; optional Vite production build with
vendored/pinned deps; JSDoc `// @ts-check` (or a TS migration); dev-flag the `window.__game` handle; a real
loading screen for the Rapier wasm + fonts.

---

## Suggested "impress the open-source community" priorities

If the goal is maximum signal per hour of work:
1. **Phase 0 + Phase 1** — a repo that's clean, documented, and has a landing page that *explains the
   engineering* is what makes people star and share it.
2. **Bloom + SSAO (start of Phase 2)** — the fastest path to "wow" screenshots for the README and landing.
3. **Comfort/accessibility menu (Phase 3)** — a strong, differentiating inclusive-design signal that most
   game-jam projects skip.
4. **Tests + CI (Phase 4)** — the credibility layer that says "this person ships production software," not
   just demos.
