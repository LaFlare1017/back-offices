import * as THREE from 'three';
import { PALETTE, PALETTE_CSS } from '../constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addWall, addSign, addDoor, addExitDoor, addServerRack, addTerminal,
} from '../kit.js';
import { terminalScreen } from '../textures.js';

// Room 3: Governance — "The Server Vault"
// Dim server room. Three access doors (A, B, C) must be opened in the governed
// order with a credential. Rushing an ungoverned door trips the alarm, spikes
// dread, and resets progress.

const ORDER = ['B', 'A', 'C'];

export const room3 = {
  key: 'room3',
  title: 'The Server Vault',
  build(ctx, game) {
    const W = 30, D = 36;
    addFloor(ctx, W, D);
    addCeiling(ctx, W, D);
    addPerimeter(ctx, W, D);

    // Dimmer than the other floors: sparse, weaker fixtures.
    addFluorescent(ctx, 0, 12, { intensity: 3.5 });
    addFluorescent(ctx, -8, 4, { intensity: 2.5 });
    addFluorescent(ctx, 8, 4, { intensity: 2.5 });
    addFluorescent(ctx, 0, -6, { intensity: 2.5 });
    addFluorescent(ctx, 0, -14, { intensity: 3 });

    // Server rack aisles.
    for (let x = -10; x <= 10; x += 5) {
      for (let z = 2; z <= 10; z += 4) {
        addServerRack(ctx, x, z, { alert: (x + z) % 3 === 0 });
      }
    }

    // Three vault doors along a mid wall, then the exit chamber beyond.
    const wallZ = -4;
    const lanes = { A: -8, B: 0, C: 8 };
    const gapW = 1.7;
    let cursor = -W / 2;
    for (const lane of [...Object.values(lanes), W / 2]) {
      const segLen = lane - gapW / 2 - cursor;
      if (segLen > 0.05) addWall(ctx, { x: cursor + segLen / 2, z: wallZ, len: segLen, dir: 'x' });
      cursor = lane + gapW / 2;
    }

    let hasBadge = false;
    let step = 0;
    const doors = {};
    const exit = addExitDoor(ctx, 0, -D / 2 + 1.2, { rotY: 0 });

    // Warning striping on the risk accent — first appearance of #D46A5A.
    for (const [name, lane] of Object.entries(lanes)) {
      addSign(ctx, lane, wallZ + 0.4, `ACCESS ${name}`, { sub: 'LEVEL 3 — AUTHORIZED ONLY', bg: '#3a3628', fg: PALETTE_CSS.risk, y: 2.75 });
      doors[name] = addDoor(ctx, lane, wallZ, { color: 0x5a3a32 });
    }

    // The credential badge.
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.05, 0.46),
      new THREE.MeshStandardMaterial({ color: PALETTE.hope, emissive: PALETTE.hope, emissiveIntensity: 0.6 })
    );
    badge.position.set(-11, 1.06, 12);
    ctx.group.add(badge);
    const badgeDesk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.02, 0.7), ctx.mats.surfaceDark);
    badgeDesk.position.set(-11, 0.51, 12);
    ctx.group.add(badgeDesk);
    ctx.addCollider(-11, 0.51, 12, 0.35, 0.51, 0.35);

    // The oversight log terminal reveals the governed order.
    const logScreen = terminalScreen();
    logScreen.update([
      'CHANGE CONTROL LOG',
      '------------------',
      'governed sequence:',
      '',
      `>  1. ACCESS ${ORDER[0]}`,
      `>  2. ACCESS ${ORDER[1]}`,
      `>  3. ACCESS ${ORDER[2]}`,
      '',
      'no badge, no entry.',
    ], { title: 'OVERSIGHT LOG', accent: PALETTE_CSS.hope });
    const logTerm = addTerminal(ctx, 12, 13, logScreen.texture, { rotY: -Math.PI / 4 });

    const objectiveBase = 'SERVER VAULT\nspeed is not safety here.\ncheck the log. carry the credential.\nopen doors in the governed order.';

    const trip = (msg) => {
      game.audio.alarm();
      game.dread.raise(0.3);
      step = 0;
      for (const d of Object.values(doors)) {
        if (d.opened) {
          d.opened = false;
          d.mesh.visible = true;
          d.collider2 = ctx.rapier.ColliderDesc.cuboid(0.85, 1.3, 0.06)
            .setTranslation(ctx.origin.x + d.mesh.position.x, 1.3, ctx.origin.z + wallZ);
          d.collider = ctx.world.createCollider(d.collider2);
          ctx.colliders.push(d.collider);
        }
      }
      game.ui.setObjective(`SERVER VAULT\n⚠ ${msg}\nall doors have re-sealed. progress reset.`);
    };

    game.interaction.register(badge, {
      prompt: 'E — take access credential',
      onInteract: () => {
        if (hasBadge) return;
        hasBadge = true;
        badge.visible = false;
        game.audio.pickup();
        game.dread.lower(0.1);
        game.ui.setObjective(objectiveBase + '\n\n✓ credential acquired');
      },
    });

    game.interaction.register(logTerm.group, {
      prompt: 'E — read oversight log',
      onInteract: () => {
        game.audio.pickup();
        game.dread.lower(0.1);
        game.ui.setObjective(`SERVER VAULT\ngoverned sequence: ${ORDER.join(' → ')}\n${hasBadge ? '✓ credential acquired' : 'you still need the credential.'}`);
      },
    });

    for (const [name, lane] of Object.entries(lanes)) {
      const d = doors[name];
      game.interaction.register(d.mesh, {
        prompt: `E — open ACCESS ${name}`,
        risk: true,
        onInteract: () => {
          if (d.opened) return;
          if (!hasBadge) {
            trip('ungoverned access attempt. no credential.');
            return;
          }
          if (ORDER[step] !== name) {
            trip(`out-of-sequence access at door ${name}.`);
            return;
          }
          step += 1;
          d.opened = true;
          d.mesh.visible = false;
          ctx.removeCollider(d.collider);
          game.audio.pickup();
          game.dread.lower(0.15);
          game.ui.setObjective(`SERVER VAULT\ngoverned sequence: ${ORDER.join(' → ')}\nstep ${step} of 3 cleared — in order, with access.`);
          if (step >= 3) {
            game.ui.setObjective('SERVER VAULT\naccess. accountability. control.\nthe vault is safe now.');
            game.rooms.solveRoom('room3', exit);
          }
        },
      });
    }

    game.interaction.register(exit, {
      prompt: 'E — step through',
      onInteract: () => { if (exit.visible) game.rooms.advance(); },
    });

    return {
      spawn: { x: 0, z: 15, yaw: 0 },
      bounds: { w: 30, d: 36 },
      hintTarget() {
        if (!hasBadge) return { x: -11, z: 12, y: 1.1 };            // the credential
        if (step < 3) return { x: lanes[ORDER[step]], z: -4, y: 1.4 }; // next governed door
        return exit.visible ? { x: 0, z: -16.8, y: 1.6 } : null;
      },
      enter() {
        game.ui.setObjective(objectiveBase);
        game.dread.set(0.5);
      },
    };
  },
};
