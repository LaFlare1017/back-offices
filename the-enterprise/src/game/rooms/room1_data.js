import { PALETTE_CSS } from '../constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addFilingCabinet, addTerminal, addExitDoor, addCubicle,
} from '../kit.js';
import { terminalScreen } from '../textures.js';

// Room 1: Data Transformation — "The Records Floor"
// Duplicate rooms of filing cabinets; six terminals, three of them corrupted
// duplicates. Resolving the three canonical records collapses the duplicates
// and opens the path.

const CLEAN_RECORDS = [
  { title: 'RECORD 0117 — VENDOR MASTER', lines: ['SCHEMA:   conformed ✓', 'DATES:    ISO-8601', 'UNITS:    normalized', 'PIPELINE: FLOWING · 7/7 steps', 'UPDATED:  4 min ago', '', '> press E to reconcile'] },
  { title: 'RECORD 0442 — CUSTOMER LEDGER', lines: ['SCHEMA:   conformed ✓', 'JOIN KEY: stable', 'FORMAT:   one source of truth', 'PIPELINE: FLOWING · 7/7 steps', 'UPDATED:  11 min ago', '', '> press E to reconcile'] },
  { title: 'RECORD 0903 — PRODUCT CATALOG', lines: ['SCHEMA:   conformed ✓', 'NAMING:   one convention', 'LINEAGE:  traced end to end', 'PIPELINE: FLOWING · 7/7 steps', 'UPDATED:  2 min ago', '', '> press E to reconcile'] },
];

const DIRTY_LINES = [
  ['SCHEMA:   3 conflicting versions', 'DATES:    03/04/24 · Mar-4 · 4.3.24', 'UNITS:    lbs? kg? "units"', 'PIPELINE: STALLED at step 3/7', 'UPDATED:  847 days ago'],
  ['FORMAT:   CSV → XLS → PDF → scan', 'FIELD:    rev = "Rev_Final_v7_REAL"', 'OWNER:    none assigned', 'PIPELINE: no transform step exists', 'UPDATED:  unknown'],
  ['ENCODING: �������', 'JOIN KEY: null', 'NAMING:   prod_cat / PC / catalog2', 'PIPELINE: STALLED at step 0/7', 'UPDATED:  1997-??-??'],
];

export const room1 = {
  key: 'room1',
  title: 'The Records Floor',
  build(ctx, game) {
    const W = 34, D = 34;
    addFloor(ctx, W, D);
    addCeiling(ctx, W, D);
    addPerimeter(ctx, W, D);

    for (let gx = -12; gx <= 12; gx += 8) {
      for (let gz = -12; gz <= 12; gz += 8) {
        addFluorescent(ctx, gx, gz);
      }
    }

    // Duplicate cabinet blocks: identical clusters that make the floor loop
    // visually. Some fade out when records are resolved.
    const duplicateClusters = [];
    const clusterAt = (x, z, collectible) => {
      // deterministic per-cluster jitter so the tiling reads as almost —
      // but not quite — identical
      const j = Math.sin(x * 12.9898 + z * 78.233) * 0.5;
      const parts = [
        addFilingCabinet(ctx, x - 1.2, z + j * 0.3, { openDrawer: true, rotY: j * 0.3 }),
        addFilingCabinet(ctx, x - 0.6, z, { rotY: -j * 0.15 }),
        addFilingCabinet(ctx, x + j * 0.2, z, { openDrawer: j > 0 }),
        addFilingCabinet(ctx, x + 0.6, z - j * 0.2),
        addFilingCabinet(ctx, x + 1.2, z, { rotY: j * 0.2 }),
        addCubicle(ctx, x + j, z + 2.4, { rotY: Math.PI + j * 0.25 }),
      ];
      if (collectible) duplicateClusters.push(parts);
    };

    clusterAt(-9, -9, true); clusterAt(0, -9, false); clusterAt(9, -9, true);
    clusterAt(-9, 0, false); clusterAt(9, 0, true);
    clusterAt(-9, 9, true); clusterAt(0, 9, false); clusterAt(9, 9, true);

    // Six terminals around the floor: three canonical, three corrupted.
    const spots = [
      { x: -12, z: -4, rotY: Math.PI / 2 },
      { x: 12, z: -4, rotY: -Math.PI / 2 },
      { x: -4, z: -12, rotY: 0 },
      { x: 4, z: -12, rotY: 0 },
      { x: -4, z: 12, rotY: Math.PI },
      { x: 4, z: 12, rotY: Math.PI },
    ];
    // canonical terminals sit at indexes 0, 3, 4
    const canonicalIdx = new Set([0, 3, 4]);

    let resolved = 0;
    const exit = addExitDoor(ctx, 0, -16.7, { rotY: 0 });
    const cleanTerms = [];

    spots.forEach((s, i) => {
      const screen = terminalScreen();
      const isClean = canonicalIdx.has(i);
      if (isClean) {
        const rec = CLEAN_RECORDS[resolvedIndexOf(i)];
        screen.update(rec.lines, { title: rec.title, accent: PALETTE_CSS.hope });
      } else {
        screen.update(DIRTY_LINES[i % DIRTY_LINES.length], { title: 'RECORD ??? — UNRECONCILED', accent: PALETTE_CSS.risk });
      }

      const term = addTerminal(ctx, s.x, s.z, screen.texture, { rotY: s.rotY });
      if (isClean) cleanTerms.push({ term, x: s.x, z: s.z });

      game.interaction.register(term.group, {
        prompt: 'E — inspect record',
        onInteract: () => {
          if (isClean) {
            if (term.done) return;
            term.done = true;
            resolved += 1;
            game.audio.pickup();
            game.dread.lower(0.2);
            screen.update(['', '  RECONCILED ✓', '', `  ${resolved} of 3 records`, '  formatted · pipelined · current'], { title: 'FLOWING', accent: PALETTE_CSS.hope });
            game.interaction.setPrompt(term.group, 'record reconciled');

            // A duplicate cluster collapses.
            const cluster = duplicateClusters.pop();
            if (cluster) cluster.forEach((p) => { p.visible = false; });

            game.ui.setObjective(`RECORDS FLOOR\nrecords reconciled: ${resolved} / 3`);
            if (resolved >= 3) {
              game.ui.setObjective('RECORDS FLOOR\nthe data is flowing.\nsomething opened to the north.');
              game.rooms.solveRoom('room1', exit);
            }
          } else {
            game.audio.deny();
            game.dread.raise(0.12);
            game.ui.setObjective('RECORDS FLOOR\nmismatched schema. stalled pipeline. stale for years.\nthis record cannot flow. find one that can.');
          }
        },
      });
    });

    game.interaction.register(exit, {
      prompt: 'E — step through',
      onInteract: () => { if (exit.visible) game.rooms.advance(); },
    });

    return {
      spawn: { x: -13.5, z: 14, yaw: 0 },
      bounds: { w: 34, d: 34 },
      hintTarget() {
        const next = cleanTerms.find((t) => !t.term.done);
        if (next) return { x: next.x, z: next.z, y: 1.4 };
        return exit.visible ? { x: 0, z: -16.7, y: 1.6 } : null;
      },
      enter() {
        game.ui.setObjective('RECORDS FLOOR\nschemas clash. pipelines stall. timestamps rot.\nfind the three records built to flow.');
        game.dread.set(0.45);
      },
    };
  },
};

// Map canonical terminal index (0,3,4) to record 0..2.
function resolvedIndexOf(i) {
  return { 0: 0, 3: 1, 4: 2 }[i] ?? 0;
}
