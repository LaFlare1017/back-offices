import { PALETTE_CSS } from '../constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addWall, addSign, addDoor, addExitDoor,
} from '../kit.js';

// Room 2: Workflow Standardization — "The Process Corridors"
// One long corridor with four junctions. At each junction, several doors carry
// signage in clashing ad-hoc styles; exactly one follows the standardized
// format. Wrong doors loop the player back to the start.

const STANDARD = { fmt: (n) => `PROC-0${n}`, sub: 'STD WORKFLOW', bg: '#4A4433', fg: '#FCF6D8' };
const ADHOC = [
  { fmt: (n) => `proc ${n} (final)`, sub: 'rev. bob v2', bg: '#5a4a3a', fg: '#D46A5A' },
  { fmt: (n) => `STEP_${n}_NEW`, sub: 'DO NOT USE?', bg: '#3a4a4a', fg: '#C9BB63' },
  { fmt: (n) => `Workflow ${n}!!`, sub: 'ask Karen', bg: '#4a3a4a', fg: '#b9c4b6' },
];

export const room2 = {
  key: 'room2',
  title: 'The Process Corridors',
  build(ctx, game) {
    // Corridor runs north (negative z). 4 junction chambers linked by halls.
    const HALL_W = 4;
    const CHUNK = 12; // each junction chamber is 12 deep
    const TOTAL_D = CHUNK * 4 + 10;
    const startZ = TOTAL_D / 2 - 4;

    addFloor(ctx, 26, TOTAL_D + 4);
    addCeiling(ctx, 26, TOTAL_D + 4);
    addPerimeter(ctx, 26, TOTAL_D + 4);

    for (let z = startZ; z > -TOTAL_D / 2; z -= 5) {
      addFluorescent(ctx, 0, z);
      addFluorescent(ctx, -8, z, { intensity: 3 });
      addFluorescent(ctx, 8, z, { intensity: 3 });
    }

    let progress = 0;
    const doorSets = [];
    const stdDoorPos = []; // per-junction position of the standard door
    const exit = addExitDoor(ctx, 0, -TOTAL_D / 2 + 1.2, { rotY: 0 });

    // Contradictory floor-marking hints scattered along the way.
    addSign(ctx, -8, startZ - 3, '← EXIT', { rotY: Math.PI / 2, sub: 'this way??', bg: '#3a4a4a', fg: '#C9BB63' });
    addSign(ctx, 8, startZ - 9, 'EXIT →', { rotY: -Math.PI / 2, sub: 'trust me', bg: '#5a4a3a', fg: '#D46A5A' });

    for (let j = 0; j < 4; j++) {
      const wallZ = startZ - 6 - j * CHUNK;
      const stdLane = [(-1) ** j * 6, 0, (-1) ** (j + 1) * 6][j % 3 === 2 ? 1 : 0] ?? 0;
      // three door lanes at x = -6, 0, 6; pick the standard lane per junction
      const lanes = [-6, 0, 6];
      const standardLane = lanes[(j * 2 + 1) % 3];

      // wall across the corridor with three doorways
      const gapW = 1.7;
      let cursor = -13;
      for (const lane of [...lanes, 14]) {
        const gapStart = lane - gapW / 2;
        const segLen = gapStart - cursor;
        if (segLen > 0.05) addWall(ctx, { x: cursor + segLen / 2, z: wallZ, len: segLen, dir: 'x' });
        cursor = lane + gapW / 2;
      }

      const set = { doors: [], junction: j };
      stdDoorPos[j] = { x: standardLane, z: wallZ };
      lanes.forEach((lane, li) => {
        const isStd = lane === standardLane;
        const style = isStd ? STANDARD : ADHOC[(j + li) % ADHOC.length];
        addSign(ctx, lane, wallZ + 0.35, style.fmt(j + 1), { sub: style.sub, bg: style.bg, fg: style.fg, y: 2.75 });

        const door = addDoor(ctx, lane, wallZ, {});
        set.doors.push({ door, isStd, lane });

        game.interaction.register(door.mesh, {
          prompt: 'E — follow this process',
          onInteract: () => {
            if (j !== progress) return; // only the active junction matters
            if (isStd) {
              progress += 1;
              game.audio.pickup();
              game.dread.lower(0.15);
              ctx.removeCollider(door.collider);
              door.mesh.visible = false;
              game.interaction.unregister(door.mesh);
              game.ui.setObjective(`PROCESS CORRIDORS\nstandard process followed: ${progress} / 4\nthe pattern is the same every time.`);
              if (progress >= 4) {
                game.ui.setObjective('PROCESS CORRIDORS\nthe loop is broken. the corridor is straight now.');
                game.rooms.solveRoom('room2', exit);
              }
            } else {
              game.audio.deny();
              game.dread.raise(0.15);
              game.player.teleport(ctx.origin.x, ctx.origin.z + startZ, 0);
              game.ui.setObjective('PROCESS CORRIDORS\nthat process looped you back to the start.\nevery ad-hoc path returns here.\nfind the signage that stays consistent.');
            }
          },
        });
      });
      doorSets.push(set);
    }

    game.interaction.register(exit, {
      prompt: 'E — step through',
      onInteract: () => { if (exit.visible) game.rooms.advance(); },
    });

    return {
      spawn: { x: 0, z: startZ, yaw: 0 },
      bounds: { w: 26, d: 58 },
      hintTarget() {
        if (progress < 4) return { x: stdDoorPos[progress].x, z: stdDoorPos[progress].z, y: 1.4 };
        return exit.visible ? { x: 0, z: -TOTAL_D / 2 + 1.2, y: 1.6 } : null;
      },
      enter() {
        game.ui.setObjective('PROCESS CORRIDORS\nfour checkpoints. every sign disagrees.\none format repeats, junction after junction.\nfollow the standard.');
        game.dread.set(0.4);
      },
    };
  },
};
