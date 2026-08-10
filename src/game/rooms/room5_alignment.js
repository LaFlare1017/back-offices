import * as THREE from 'three';
import { PALETTE } from '../constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addWall, addSign, addExitDoor,
} from '../kit.js';
import { sharedMaterials } from '../kit.js';

// Room 5: Cross-Functional Alignment — "The Divided Departments"
// Four frosted-glass pods (Finance, Operations, IT, Sales), each with its own
// confident, wrong exit sign and one key fragment. Aligning the fragments at
// the central console clears the glass and forms the one real exit.

// Each department is confidently, individually wrong: one true priority,
// one single dimension, one direction. north = -z, east = +x.
const PODS = [
  { name: 'FINANCE', cx: 9, cz: -9, exitDir: 'EXIT →', quote: 'Let’s go east. Increasing ROI is what matters.', priority: 'ROI' },
  { name: 'SALES', cx: -9, cz: -9, exitDir: 'EXIT ↑', quote: 'Let’s go north. Client satisfaction is what matters.', priority: 'client satisfaction' },
  { name: 'IT', cx: -9, cz: 9, exitDir: '← EXIT', quote: 'Let’s go west. System security is what matters.', priority: 'security' },
  { name: 'OPERATIONS', cx: 9, cz: 9, exitDir: 'EXIT ↓', quote: 'Let’s go south. Efficiency is what matters.', priority: 'efficiency' },
];

export const room5 = {
  key: 'room5',
  title: 'The Divided Departments',
  build(ctx, game) {
    const W = 32, D = 32;
    addFloor(ctx, W, D);
    addCeiling(ctx, W, D);
    addPerimeter(ctx, W, D);

    for (let gx = -10; gx <= 10; gx += 10) {
      for (let gz = -10; gz <= 10; gz += 10) {
        addFluorescent(ctx, gx, gz);
      }
    }

    const mats = sharedMaterials();
    const glassWalls = [];
    const glassColliders = [];

    // Each pod: frosted glass square with one opening facing the center.
    for (const pod of PODS) {
      const s = 10; // pod size
      const { cx, cz } = pod;
      const openToward = { x: cx > 0 ? -1 : 1, z: cz > 0 ? -1 : 1 };

      const walls = [
        { x: cx, z: cz - s / 2, len: s, dir: 'x', open: openToward.z > 0 ? false : true },
        { x: cx, z: cz + s / 2, len: s, dir: 'x', open: openToward.z > 0 ? true : false },
        { x: cx - s / 2, z: cz, len: s, dir: 'z', open: openToward.x > 0 ? false : true },
        { x: cx + s / 2, z: cz, len: s, dir: 'z', open: openToward.x > 0 ? true : false },
      ];

      for (const w of walls) {
        if (w.open) {
          // glass wall with a doorway gap in the middle
          const segLen = (w.len - 1.8) / 2;
          for (const off of [-(1.8 / 2 + segLen / 2), 1.8 / 2 + segLen / 2]) {
            const gx = w.dir === 'x' ? w.x + off : w.x;
            const gz = w.dir === 'x' ? w.z : w.z + off;
            const m = addWall(ctx, { x: gx, z: gz, len: segLen, dir: w.dir, material: mats.glass, thickness: 0.08 });
            glassWalls.push(m);
          }
        } else {
          const m = addWall(ctx, { x: w.x, z: w.z, len: w.len, dir: w.dir, material: mats.glass, thickness: 0.08 });
          glassWalls.push(m);
        }
      }

      addSign(ctx, cx, cz + (cz > 0 ? -s / 2 - 0.15 : s / 2 + 0.15), pod.name, {
        rotY: cz > 0 ? Math.PI : 0, y: 2.8, w: 2.0,
      });
      // the confident, wrong exit sign — physically pointing their way
      addSign(ctx, cx, cz, pod.exitDir, {
        sub: `${pod.priority} is what matters`, y: 2.45, w: 1.6,
        bg: '#3a4a4a', fg: '#C9BB63',
        rotY: Math.atan2(-cx, -cz) + Math.PI,
      });
      // the department's private, confident, wrong plan — a note on a whiteboard
      addNote(ctx, pod, cx, cz);
    }

    // Central alignment console.
    const console = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.1, 8), mats.surfaceDark);
    console.position.set(0, 0.55, 0);
    ctx.group.add(console);
    ctx.addCollider(0, 0.55, 0, 0.9, 0.55, 0.9);
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.06, 0.3),
        new THREE.MeshStandardMaterial({ color: PALETTE.shadow, emissive: PALETTE.hope, emissiveIntensity: 0 })
      );
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      slot.position.set(Math.cos(a) * 0.5, 1.14, Math.sin(a) * 0.5);
      ctx.group.add(slot);
      slots.push(slot);
    }

    // Key fragments, one per pod.
    const fragMat = new THREE.MeshStandardMaterial({ color: PALETTE.hope, emissive: PALETTE.hope, emissiveIntensity: 0.8 });
    let fragments = 0;
    const fragMeshes = [];
    PODS.forEach((pod, i) => {
      const frag = new THREE.Mesh(new THREE.TetrahedronGeometry(0.22), fragMat);
      fragMeshes.push({ frag, pod });
      frag.position.set(pod.cx, 1.0, pod.cz);
      ctx.group.add(frag);
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), mats.surface);
      pedestal.position.set(pod.cx, 0.4, pod.cz);
      ctx.group.add(pedestal);

      game.interaction.register(frag, {
        prompt: `E — take ${pod.name}'s key fragment`,
        onInteract: () => {
          if (!frag.visible) return;
          frag.visible = false;
          fragments += 1;
          slots[i].material.emissiveIntensity = 0.9;
          game.audio.pickup();
          game.dread.lower(0.12);
          game.ui.setObjective(`DIVIDED DEPARTMENTS\n${pod.name}: "${pod.quote}"\ntrue — and not enough on its own.\nfragments: ${fragments} / 4`);
        },
      });
    });

    const exit = addExitDoor(ctx, 0, -W / 2 + 1.2, { rotY: 0 });

    let aligning = false;
    game.interaction.register(console, {
      prompt: 'E — align the fragments',
      onInteract: async () => {
        if (aligning) return;
        if (fragments < 4) {
          game.audio.deny();
          game.dread.raise(0.1);
          game.ui.setObjective(`DIVIDED DEPARTMENTS\nthe console has four empty slots.\nno single department's fragment is enough.\nfragments: ${fragments} / 4`);
          return;
        }
        aligning = true;
        // The alignment moment: all four voices at once — not in conflict,
        // four true priorities that only work together.
        await overlapBeat(game);
        for (const gw of glassWalls) {
          gw.material = gw.material.clone();
          gw.material.opacity = 0.12;
        }
        game.ui.setObjective('DIVIDED DEPARTMENTS\nROI. satisfaction. security. efficiency.\nfour true priorities. one direction.\nthe glass is clear — it was one floor all along.');
        game.rooms.solveRoom('room5', exit);
      },
    });

    game.interaction.register(exit, {
      prompt: 'E — step through',
      onInteract: () => { if (exit.visible) game.rooms.advance(); },
    });

    return {
      spawn: { x: 0, z: 13, yaw: 0 },
      bounds: { w: 32, d: 32 },
      hintTarget() {
        const f = fragMeshes.find((o) => o.frag.visible);
        if (f) return { x: f.pod.cx, z: f.pod.cz, y: 1.0 };   // next fragment
        if (!exit.visible) return { x: 0, z: 0, y: 1.2 };      // the console
        return { x: 0, z: -W / 2 + 1.2, y: 1.6 };              // the one real exit
      },
      enter() {
        game.ui.setObjective('DIVIDED DEPARTMENTS\nfour departments. four exit signs.\nall pointing different directions.\nnone of them can see the others.');
        game.dread.set(0.5);
      },
    };
  },
};

// A handwritten-feel note inside the pod carrying the department's one line.
function addNote(ctx, pod, cx, cz) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g2d = c.getContext('2d');
  g2d.fillStyle = '#efe8cf';
  g2d.fillRect(0, 0, 512, 256);
  g2d.strokeStyle = 'rgba(74,68,51,0.6)';
  g2d.lineWidth = 6;
  g2d.strokeRect(10, 10, 492, 236);
  g2d.fillStyle = '#3a3628';
  g2d.font = '600 26px "Space Grotesk", sans-serif';
  g2d.textAlign = 'center';
  const words = pod.quote.split(' ');
  const lines = [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
  g2d.fillText(lines[0], 256, 105);
  g2d.fillText(lines[1], 256, 145);
  g2d.font = '20px "IBM Plex Mono", monospace';
  g2d.fillStyle = 'rgba(58,54,40,0.7)';
  g2d.fillText(`— ${pod.name}, internal only`, 256, 205);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.8),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  // On the pod's outer-corner wall, facing the pedestal.
  note.position.set(cx + (cx > 0 ? 3.2 : -3.2), 1.7, cz + (cz > 0 ? 3.2 : -3.2));
  note.rotation.y = Math.atan2(-(cx > 0 ? 3.2 : -3.2), -(cz > 0 ? 3.2 : -3.2));
  ctx.group.add(note);
}

// All four voices land together, staggered in, held, then resolved.
function overlapBeat(game) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:18;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(26,22,8,0.55);opacity:0;transition:opacity 0.8s ease;';
    PODS.forEach((pod, i) => {
      const line = document.createElement('div');
      line.textContent = `${pod.name}: “${pod.quote}”`;
      line.style.cssText = `font-family:'Space Grotesk',sans-serif;font-size:21px;color:#FCF6D8;text-shadow:0 2px 18px rgba(26,22,8,0.9);opacity:0;transition:opacity 0.7s ease;transform:translateX(${(i % 2 ? 1 : -1) * 24}px);`;
      host.appendChild(line);
      setTimeout(() => { line.style.opacity = '0.9'; }, 500 + i * 650);
    });
    const resolveLine = document.createElement('div');
    resolveLine.textContent = 'Four true priorities. One direction.';
    resolveLine.style.cssText = 'font-family:"Space Grotesk",sans-serif;font-size:26px;color:#7FD4C4;margin-top:26px;opacity:0;transition:opacity 1s ease;';
    host.appendChild(resolveLine);
    document.body.appendChild(host);
    requestAnimationFrame(() => { host.style.opacity = '1'; });
    setTimeout(() => { game.audio.stinger(); resolveLine.style.opacity = '1'; }, 3400);
    setTimeout(() => { host.style.opacity = '0'; }, 5600);
    setTimeout(() => { host.remove(); resolve(); }, 6500);
  });
}
