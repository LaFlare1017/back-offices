# Changelog

All notable changes to Back Offices. This project adheres to
[Semantic Versioning](https://semver.org/) and the spirit of
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]
### Added
- Open-source documentation set: `HANDOFF.md`, `ROADMAP.md`, `CREDITS.md`, `CONTRIBUTING.md`, this
  changelog, `LICENSE` (MIT), and `.gitignore`.
- README rewritten for the "Back Offices" name with feature overview and docs index.

## [0.5.0] — Narrative onboarding
### Added
- Cold-open intro sequence (`src/game/intro.js`): a quiet "normal office" with the AI-transformation
  assignment on a monitor that curdles into the Backrooms as the player goes looking for where to begin,
  including a one-line foreshadow that the ending echoes. Built as an off-grid standalone context so it
  never shifts room indices.
### Changed
- Plain-language pass on all revelation cards and the final synthesis narration, so the lessons land for
  players with no Backrooms or enterprise-transformation background without losing their edge.

## [0.4.0] — Mobile
### Added
- Touch controls (`src/game/touch.js`): thumb-anchored virtual joystick, drag-look, tap-to-interact.
- Mobile performance profile (DPR cap, no MSAA, reduced glitch draws) and a phone-speaker hum revoicing.
- App-lifecycle handling (AudioContext suspend/resume on backgrounding).
- Struggle-detection hint system (`src/game/hints.js`): teal edge glow → pulsing light toward the next
  objective after periods without progress.
- Mobile UI scaling with safe-area insets and 44pt+ touch targets.
### Changed
- Corporate-alert notification duration extended for comfortable reading at arm's length.

## [0.3.0] — Pressure presence
### Added
- Always-tracking emissive eyes on all pressure entities (Board smooth-tracks + blinks; Competitor
  snap-tracks + flickers).
- Diegetic corporate-alert notifications, scoped to Rooms 1–2, that teach the pressure archetypes early.
- One-time first-encounter "noticing" beat per archetype (view-cone spawn, camera shake, hum drop-out).
- Competitor glitch/multiplying silhouette: offset ghost copies with a red/cyan chromatic split and a
  digital-stutter audio cue.

## [0.2.0] — Post-playtest revisions
### Added
- Roaming pressure entity system (`src/game/pressure.js`): Competitor, Board of Directors, Legacy System.
- Garden-courtyard ending: fountain, trees, benches, glass architecture, moving people, birdsong.
- Graphics/audio polish: dread-ramped chromatic fringe, wet-carpet roughness, volumetric teal exit shaft.
### Changed
- Room 1 reframed around schemas/pipelines/staleness; Room 4 around communication + upskilling; Room 5
  gained per-department dialogue and an overlapping convergence beat.
- Renamed the game to **Back Offices**.

## [0.1.0] — Initial build
### Added
- Five playable rooms (Data, Workflow, Governance, Readiness, Alignment) + synthesis ending.
- The Dread System, procedural textures, synthesized audio, GameBlocks-based movement/camera/collision,
  room streaming with localStorage checkpointing, and the revelation-card UI.
