# Back Offices — Technical Handoff

> Complete current-state handoff for the codebase. If you're picking this up cold, read this
> top-to-bottom once, then keep it open as a map. Design intent lives in
> [`backrooms-enterprise-ai-game-handoff.md`](backrooms-enterprise-ai-game-handoff.md) (the original
> design spec / source of truth); *this* document describes what was actually built.

---

## 1. What it is

**Back Offices** is a first-person browser game: a Backrooms-style corporate liminal space where the
"monster" is systemic enterprise dysfunction, not a creature. The player closes five AI-transformation
gaps — **Data, Workflow, Governance, Readiness, Alignment** — to escape into a sunlit garden.

- **Playtime:** 5–10 minutes · **No combat, no death, no fail state.**
- **Platform:** any modern browser, desktop + mobile (touch).
- **Build:** none. It's a static site using an ES-module **import map** to pull Three.js and Rapier from
  a CDN. Open `index.html` on any static server and it runs.
- **Assets:** **zero binary assets.** Every texture is drawn on a `<canvas>` at runtime; every sound is
  synthesized with WebAudio. The only external fetches are the three/rapier modules and Google Fonts.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Rendering | **Three.js 0.161.0** | via CDN import map in `index.html` |
| Physics | **Rapier3D compat 0.14.0** (wasm) | kinematic character collision only |
| Movement / camera | **GameBlocks** modules | copied under `src/modules/`, see `gameblocks_usage.md` |
| Audio | **WebAudio API** | fully synthesized (`src/game/audio.js`) |
| Textures | **Canvas 2D** | procedural (`src/game/textures.js`) |
| Persistence | **localStorage** | room-index checkpoint |
| Fonts | Space Grotesk, IBM Plex Sans/Mono | Google Fonts CDN |

---

## 3. File map

```
the-enterprise/                 ← becomes the "back-offices" repo root
├── index.html                  ← canvas, HUD, overlays, import map, title/pause screens
├── styles.css                  ← palette-driven UI, mobile media queries, safe-areas
├── src/
│   ├── main.js                 ← boot, main loop, system wiring, title/pointer-lock, intro gate
│   ├── modules/                ← GameBlocks (movement/camera/collision/math) — reused as-is
│   │   ├── actor-motion/…      ← MouseLookCharacterMotionController, KinematicBatchResolver
│   │   ├── camera/…            ← FirstPersonCameraRig, BaseCameraRig
│   │   └── math/…              ← WorldBasis, Scalar/Vector3/Time/Random utils
│   └── game/
│       ├── constants.js        ← PALETTE, WALL_HEIGHT, ROOM_SPACING, SAVE_KEY
│       ├── kit.js              ← createRoomContext + modular office building blocks + materials
│       ├── textures.js         ← procedural canvas textures (wallpaper, carpet, signs, terminals)
│       ├── audio.js            ← synthesized hum, footsteps, entity cues, garden ambience
│       ├── dread.js            ← DreadSystem: the single 0–1 float that drives all atmosphere
│       ├── player.js           ← Player: GameBlocks composition + touch hook + footstep foley
│       ├── interact.js         ← raycast interaction (register mesh → prompt + handler)
│       ├── ui.js               ← revelation cards, objectives, prompts, narration, notifications
│       ├── roomManager.js      ← room streaming, checkpointing, the shared solve→card→exit beat
│       ├── pressure.js         ← roaming pressure entities (Competitor / Board / Legacy) + eyes/glitch
│       ├── hints.js            ← struggle-detection hint system (teal edge glow → pulsing light)
│       ├── touch.js            ← mobile virtual joystick + drag-look + tap-to-interact
│       ├── intro.js            ← the cold-open (off-grid standalone context)
│       └── rooms/
│           ├── room1_data.js         ← Records Floor (de-dup / reconcile)
│           ├── room2_workflow.js     ← Process Corridors (follow the standard)
│           ├── room3_governance.js   ← Server Vault (governed door order)
│           ├── room4_readiness.js    ← Training Floor (comms + training tokens)
│           ├── room5_alignment.js    ← Divided Departments (fragment convergence)
│           └── ending.js             ← synthesis bridge → garden courtyard
├── README.md · HANDOFF.md · ROADMAP.md · CHANGELOG.md
├── LICENSE · CREDITS.md · CONTRIBUTING.md · .gitignore
├── gameblocks_usage.md         ← how the GameBlocks modules are integrated
└── Reference/                  ← LOCAL ONLY, git-ignored (copyrighted movie stills)
```

---

## 4. Boot & main loop (`src/main.js`)

1. `await RAPIER.init()` → create a Rapier `World`.
2. Create the `WebGLRenderer` (DPR/antialias gated by `isMobile`), `Scene` (background + exponential fog),
   `PerspectiveCamera`, ambient + hemisphere lights.
3. Instantiate systems: `AudioSystem`, `UI`, `DreadSystem`, `Player`, `InteractionSystem`, then a `game`
   object that holds them all. `game.renderer` / `game.camera` are exposed for driving/verification.
4. `RoomManager` registers the five rooms + ending and **builds all of them up front** at origins spaced
   `ROOM_SPACING` (300u) apart on the x-axis — a lightweight "world-partition": every room exists in the
   scene simultaneously but only the active one is `setActive(true)` (visible).
5. `PressureSystem`, `HintSystem`, and a standalone **`Intro`** context (at x = −300, off the room grid)
   are created.
6. Title screen → **ENTER** starts audio, runs the intro on a fresh start, then `enterRoom(saved)`.

**Main loop order (this order matters):**
```
player.update            → movement + camera pose
interaction.update       → raycast the hovered interactable
if intro active:
    dread.update(intro flicker lights); intro.update()      ← no pressure/hints during cold open
else:
    dread.update(current room flicker lights)
    pressure.update      ← may nudge camera for the first-encounter shake (render is after)
    hints.update
    current room.update
renderer.render
```

---

## 5. Systems, one by one

### DreadSystem (`dread.js`) — the "monster"
A single float `DreadLevel ∈ [0,1]` is the entire antagonist. There is no chase AI. Engaging with a
room's real task calls `dread.lower(...)`; running from it (wrong doors, alarms, proximity to pressure
entities) calls `dread.raise(...)`. The level eases toward a target (rises faster than it falls) and
drives, every frame: the fluorescent **hum** pitch/volume (`audio.setDread`), **light flicker** rate/depth
(seeded per fixture so the floor never flickers in unison), and the DOM **vignette / tint / chromatic**
overlays. `shock(seconds)` cuts the lights for a beat (pressure contact). `freezeCalm()` disables it
permanently (the ending). Ambient creep slowly raises dread when you idle in an unsolved room.

### RoomManager (`roomManager.js`) — streaming + the shared beat
Owns the room sequence, `enterRoom(index)` (fade → deactivate old → activate new → teleport → checkpoint →
`pressure.onRoomEnter` + `hints.onRoomEnter` → `enter()`), and the **solve beat** every room reuses:
`solveRoom(key, exitDoor)` collapses dread, plays a stinger, shows the revelation card, then reveals the
teal exit. Checkpoint = the room index in `localStorage[SAVE_KEY]`.

### Rooms (`rooms/*.js`)
Each room is `{ key, title, build(ctx, game) }`. `build` assembles geometry from `kit.js`, registers
interactables, and returns `{ spawn, bounds, enter(), update?(), hintTarget?() }`. All five share the same
three-beat structure (arrival → trap → revelation) and guide the player via dread rather than fail states.
`bounds` is used by the pressure system to clamp entity spawns; `hintTarget()` returns the local `{x,z,y}`
of the next puzzle-relevant interactable for the hint system.

### PressureSystem (`pressure.js`) — roaming pressure, not enemies
Colliderless silhouettes that feed dread; they **never block puzzle paths**. Three archetypes:
- **Competitor** — lurks then rushes; contact = dread spike + `shock`. Fractures into **offset ghost
  copies** (red/cyan chromatic split) on erratic moments, with a digital-stutter audio cue.
- **Board of Directors** — a slow row of watchers; dread accrues from being *seen*, not touched.
- **Legacy System** — a groaning stack of tech debt with a close-range dread aura.

All three have **always-tracking emissive eyes** (Board smooth-tracks + blinks; Competitor snap-tracks +
flickers). Each archetype has a distinct audio signature. On the **first sighting** of the Competitor and
the Board, a one-time "noticing" beat fires (view-cone-biased spawn, camera micro-shake, hum drop-out). A
diegetic **corporate-alert notification** fires on spawn **only in Rooms 1–2** (`currentIndex <= 1`), with a
small paired dread bump — it teaches the pattern early, then goes quiet. Mobile gets one ghost copy instead
of two. Pressure pauses while a revelation card is up and for a spawn-grace period after entering a room.

### HintSystem (`hints.js`) — struggle detection
Hooks `dread.lower()` as the **universal progress event** (every room's puzzle actions lower dread; wrong
actions raise it and deliberately do *not* reset the timer). After 60s without progress a soft **teal edge
glow** points toward `room.hintTarget()`; after 150s a faint **pulsing teal light** appears at the target.
It never solves the puzzle and never telegraphs pressure entities.

### Player (`player.js`) — GameBlocks composition
Composes `MouseLookCharacterMotionController` (WASD/mouse → intent) → `KinematicBatchResolver` (Rapier
collision) → `FirstPersonCameraRig` (fixed eye height while pitching). Analog `touch.move` feeds the same
intent on mobile. Footstep foley triggers on distance traveled across the damp carpet.

### Touch / mobile (`touch.js` + `main.js` profile)
Coarse-pointer devices (or `?touch=1`) get a **thumb-anchored virtual joystick** (left 45%), **drag-look**
(right), and the **interact prompt doubles as the tap button**. Mobile profile: DPR cap 1.5, antialias off,
one glitch ghost, hum revoiced into harmonics phone speakers can reproduce, `visibilitychange` suspends the
AudioContext, pointer-lock made a no-op.

### Intro (`intro.js`) — the cold open
A quiet "normal office" (desk + monitor with the AI-transformation assignment, a hall to a RECORDS door)
that curdles into the Backrooms when the player crosses a threshold (hum unmutes, dread → 0.5, fog thickens,
one foreshadow line). **It is a standalone context at x = −300, NOT a registered room** — see gotchas.

### UI (`ui.js`) + overlays (`index.html` / `styles.css`)
Data-driven `REVELATIONS` cards + `FINAL_NARRATION`, objectives, contextual prompts, the corporate-alert
`showNotification`, and fade transitions. Atmosphere overlays (`#vignette`, `#dread-tint`, `#chroma`,
`#hint-glow`) are cheap DOM layers driven by DreadSystem/HintSystem.

---

## 6. Invariants & gotchas (read before editing)

- **Room indices are 0-based and load-bearing.** Room 1 = index 0. The pressure notification scope is
  `currentIndex <= 1` (Rooms 1–2), and checkpoints store the index. **Do not insert a room into the
  registered sequence** without auditing all index math — that's exactly why the intro (and any future
  hub/tutorial) is built as an **off-grid standalone context**, not a registered room.
- **`dread.lower()` is the universal progress signal** the hint system hooks. Any new puzzle-relevant
  action should call it so hints reset correctly; wrong actions should use `dread.raise()`.
- **Hidden-tab rAF throttling.** `renderer.setAnimationLoop` pauses in a backgrounded/hidden tab — the
  game looks frozen but isn't. When driving it headlessly for tests, force frames via
  `window.__game.renderer.render(window.__game.scene, window.__game.camera)`.
- **Player forward vector:** yaw 0 looks toward −z (north). Forward in the xz-plane is
  `(-sin(yaw), -cos(yaw))` — easy to get backwards (bit us once in the pressure view-cone math).
- **Pressure entities never get colliders** — that's deliberate; they must never obstruct a puzzle.
- **CDN runtime dependency.** three/rapier/fonts load from CDNs. Fine on GitHub Pages online; see
  `ROADMAP.md` (Phase 4) for vendoring/pinning to make it offline-robust.
- **`window.__game`** is a live debug/verification handle — useful in dev, should be dev-flag-gated for a
  production build.

---

## 7. How to run, deploy, extend

**Run locally** (any static server; the import map needs http, not `file://`):
```bash
npx serve the-enterprise      # → http://localhost:3000
```

**Deploy:** it's fully static — drop the folder on GitHub Pages, Netlify, or Vercel as-is. (A prebuilt
Netlify-drop zip has been produced at each milestone.)

**Add a room:** create `rooms/roomN.js` exporting `{ key, title, build(ctx, game) }` that returns
`{ spawn, bounds, enter(), hintTarget() }`; register it in `main.js`. Use `kit.js` builders for geometry
and `game.interaction.register(mesh, {...})` for interactables. Remember the index invariants above.

**Add a pressure archetype:** extend `buildMesh(kind)` + the per-kind branch in `PressureSystem.update`
and add an audio signature in `audio.js`. Keep it colliderless.

**Tune atmosphere:** dread targets are set per room in `enter()`; global easing/flicker live in `dread.js`;
the palette lives in `constants.js`.

---

## 8. Palette & typography

| Token | Hex | Use |
|---|---|---|
| wall | `#B8A94E` | wallpaper |
| wallHi | `#C9BB63` | highlights |
| carpet | `#6E5F2E` | floor |
| shadow | `#2A2410` | deep shade / bg |
| glow | `#FCF6D8` | fluorescent light / body text |
| surface | `#4A4433` | props |
| **hope** | `#7FD4C4` | teal — "this way is progress" (exits, hints) |
| **risk** | `#D46A5A` | red — danger / wrong action / alerts |

No pure white, no pure black. Type: **Space Grotesk** (headings), **IBM Plex Sans** (body), **IBM Plex
Mono** (terminals/objectives). Wall height 3.2u; rooms spaced 300u apart.
