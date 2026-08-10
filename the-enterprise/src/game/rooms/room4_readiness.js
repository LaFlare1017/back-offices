import * as THREE from 'three';
import { PALETTE } from '../constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addSign, addExitDoor, addFigure, addCubicle,
} from '../kit.js';

// Room 4: Change Management — "The Training Floor"
// The exit is visible but boarded. Static figures will not move. Collecting
// four readiness tokens activates the space piece by piece: figures stand,
// lights come on, boards unseal.

export const room4 = {
  key: 'room4',
  title: 'The Training Floor',
  build(ctx, game) {
    const W = 32, D = 30;
    addFloor(ctx, W, D);
    addCeiling(ctx, W, D);
    addPerimeter(ctx, W, D);

    // Only two fixtures lit at first; the rest come on with readiness.
    const litA = addFluorescent(ctx, 0, 10);
    const darkFixtures = [
      addFluorescent(ctx, -8, 2, { intensity: 0 }),
      addFluorescent(ctx, 8, 2, { intensity: 0 }),
      addFluorescent(ctx, 0, -6, { intensity: 0 }),
      addFluorescent(ctx, 0, -12, { intensity: 0 }),
    ];
    // Track their intended brightness for staged activation.
    darkFixtures.forEach((f) => { f.light.intensity = 0; });

    // Rows of chairs facing a dead projector screen.
    for (let r = 0; r < 3; r++) {
      for (let cix = 0; cix < 4; cix++) {
        const x = -6 + cix * 4;
        const z = 4 - r * 3;
        if ((r + cix) % 2 === 0) addFigure(ctx, x, z, { seated: true, rotY: Math.PI });
      }
    }
    const standingSpots = [
      addFigure(ctx, -10, -2, { seated: true, rotY: Math.PI / 2 }),
      addFigure(ctx, 10, -4, { seated: true, rotY: -Math.PI / 2 }),
    ];
    addCubicle(ctx, -12, 8); addCubicle(ctx, 12, 8, { rotY: Math.PI });

    // Dead projector screen.
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x8f855c, roughness: 0.9 })
    );
    screen.position.set(0, 1.9, 9.5);
    screen.rotation.y = Math.PI;
    ctx.group.add(screen);

    // The boarded exit — visible from the start, unusable.
    const exit = addExitDoor(ctx, 0, -D / 2 + 1.2, { rotY: 0 });
    exit.visible = true; // the frame is there all along…
    const boards = [];
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x4A4433, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.32, 0.1), boardMat);
      b.position.set(0, 0.5 + i * 0.62, -D / 2 + 1.25);
      b.rotation.z = (i % 2 ? -1 : 1) * 0.12;
      ctx.group.add(b);
      boards.push(b);
    }
    addSign(ctx, 0, -D / 2 + 1.3, 'UNDER CONSTRUCTION', { sub: 'do not use', bg: '#3a3628', fg: '#D46A5A', y: 2.95, w: 2.2 });
    // Block passage until ready.
    const boardDesc = ctx.rapier.ColliderDesc.cuboid(1.0, 1.4, 0.1)
      .setTranslation(ctx.origin.x, 1.4, ctx.origin.z - D / 2 + 1.25);
    let boardCollider = ctx.world.createCollider(boardDesc);
    ctx.colliders.push(boardCollider);

    // A dead announcement board on the east wall — comms made physical.
    const boardScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x35311f, roughness: 0.95 })
    );
    boardScreen.position.set(15.7, 1.9, 0);
    boardScreen.rotation.y = -Math.PI / 2;
    ctx.group.add(boardScreen);
    addSign(ctx, 15.6, -2.6, 'ANNOUNCEMENTS', { rotY: -Math.PI / 2, y: 2.6, w: 1.4, sub: 'last post: 2019' });

    // Four readiness tokens: two are communication, two are upskilling.
    // Change management = comms + capability; all four are required.
    const tokenMat = new THREE.MeshStandardMaterial({ color: PALETTE.glow, emissive: PALETTE.glow, emissiveIntensity: 0.35 });
    const tokens = [
      { mesh: box(0.35, 0.06, 0.28, tokenMat), pos: [-12, 0.9, -8], cat: 'COMMS', label: 'the memo that never went out', act: 'the memo is posted where everyone can see it.\na light comes on.' },
      { mesh: box(0.3, 0.22, 0.06, tokenMat), pos: [14.9, 1.3, 3.2], cat: 'COMMS', label: 'a dead announcement board — restore it', act: 'the board lights up: "HERE IS WHAT IS CHANGING, AND WHY."\na light comes on.' },
      { mesh: box(0.5, 0.35, 0.06, tokenMat), pos: [-4, 1.2, 9.4], cat: 'TRAINING', label: 'training module 1 of 2 — left unfinished', act: 'module complete. someone finally knows how.\na figure stands up.' },
      { mesh: box(0.2, 0.2, 0.2, tokenMat), pos: [6, 0.85, -10], cat: 'TRAINING', label: 'a skill certification, never issued', act: 'certification issued. capability, on record.\na figure stands up.' },
    ];

    let readiness = 0;
    tokens.forEach((t, i) => {
      t.mesh.position.set(...t.pos);
      ctx.group.add(t.mesh);
      game.interaction.register(t.mesh, {
        prompt: `E — ${t.cat}: ${t.label}`,
        onInteract: () => {
          if (!t.mesh.visible) return;
          t.mesh.visible = false;
          readiness += 1;
          game.audio.pickup();
          game.dread.lower(0.15);

          // Staged activation of the space.
          if (i < 2) {
            const f = darkFixtures[i];
            f.light.intensity = f.baseIntensity;
          } else {
            const fig = standingSpots[i - 2];
            fig.clear();
            const standing = addFigure(ctx, fig.position.x, fig.position.z, { seated: false, rotY: fig.rotation.y });
            standing.position.copy(fig.position);
          }
          const b = boards[readiness - 1];
          if (b) b.visible = false;

          // The announcement board wakes up when its comms token is restored.
          if (t.cat === 'COMMS' && t.pos[0] > 10) {
            boardScreen.material = new THREE.MeshStandardMaterial({
              color: PALETTE.glow, emissive: PALETTE.glow, emissiveIntensity: 0.5,
            });
          }
          game.ui.setObjective(`TRAINING FLOOR\n${t.act}\nreadiness: ${readiness} / 4 (comms + training)`);
          if (readiness >= 4) {
            darkFixtures.forEach((f) => { f.light.intensity = f.baseIntensity; });
            ctx.removeCollider(boardCollider);
            game.ui.setObjective('TRAINING FLOOR\nthey know what changed. they know how.\nthe boards are gone.');
            game.rooms.solveRoom('room4', exit);
          }
        },
      });
    });

    game.interaction.register(exit, {
      prompt: 'E — step through',
      risk: false,
      onInteract: () => {
        if (readiness >= 4) { game.rooms.advance(); return; }
        game.audio.deny();
        game.dread.raise(0.15);
        game.ui.setObjective(`TRAINING FLOOR\nyou pull at the boards. nothing gives.\nnobody was told. nobody was trained. so nothing moves.\nreadiness: ${readiness} / 4`);
      },
    });

    return {
      spawn: { x: 0, z: 12, yaw: 0 },
      bounds: { w: 32, d: 30 },
      hintTarget() {
        const t = tokens.find((tk) => tk.mesh.visible);
        if (t) return { x: t.pos[0], z: t.pos[2], y: t.pos[1] };
        return { x: 0, z: -D / 2 + 1.2, y: 1.6 }; // the unboarded exit
      },
      enter() {
        game.ui.setObjective('TRAINING FLOOR\nthe way out is right there, boarded shut.\nno one was told what changed. no one was taught how.\ndeliver the comms. finish the training.');
        game.dread.set(0.45);
      },
    };
  },
};

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
