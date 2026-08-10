import * as THREE from 'three';
import { PALETTE } from '../constants.js';
import { FINAL_NARRATION, wait } from '../ui.js';

// The ending — the synthesis and escape.
// Part 1: a dark void where the five rooms hang as glowing models, wired
// together in teal. The player walks a bridge while the final narration lands.
// Part 2: through the doorway into a sunlit garden courtyard — trees, water,
// people, birdsong. The hum is gone, and the silence resolves into life.

const ROOM_LABELS = ['DATA', 'WORKFLOW', 'GOVERNANCE', 'READINESS', 'ALIGNMENT'];

export const ending = {
  key: 'ending',
  title: 'The Synthesis',
  build(ctx, game) {
    const mats = {
      bridge: new THREE.MeshStandardMaterial({ color: PALETTE.surface, roughness: 0.7 }),
      teal: new THREE.MeshBasicMaterial({ color: PALETTE.hope }),
      tealGlow: new THREE.MeshBasicMaterial({ color: PALETTE.hope, transparent: true, opacity: 0.4 }),
      model: new THREE.MeshStandardMaterial({ color: PALETTE.wall, emissive: PALETTE.wall, emissiveIntensity: 0.25 }),
    };

    // --- Part 1: the void and the bridge ---
    const BRIDGE_LEN = 50;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, BRIDGE_LEN), mats.bridge);
    bridge.position.set(0, -0.15, -BRIDGE_LEN / 2 + 5);
    ctx.group.add(bridge);
    ctx.addCollider(0, -0.15, -BRIDGE_LEN / 2 + 5, 1.5, 0.15, BRIDGE_LEN / 2);
    // invisible rails so the player cannot walk off into the void
    ctx.addCollider(-1.7, 1, -BRIDGE_LEN / 2 + 5, 0.2, 1.2, BRIDGE_LEN / 2);
    ctx.addCollider(1.7, 1, -BRIDGE_LEN / 2 + 5, 0.2, 1.2, BRIDGE_LEN / 2);
    ctx.addCollider(0, 1, 5.2, 1.7, 1.2, 0.2); // behind the spawn

    for (const side of [-1.45, 1.45]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, BRIDGE_LEN), mats.teal);
      strip.position.set(side, 0.03, -BRIDGE_LEN / 2 + 5);
      ctx.group.add(strip);
    }

    // The five rooms as suspended glowing models, alternating sides.
    ROOM_LABELS.forEach((label, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const mx = side * (7 + (i % 3));
      const mz = -4 - i * 8;
      const my = 2.5 + (i % 3) * 1.5;

      const model = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 3.2), mats.model.clone());
      model.position.set(mx, my, mz);
      ctx.group.add(model);

      const inner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 3.4), mats.tealGlow);
      inner.position.copy(model.position);
      ctx.group.add(inner);

      const glow = new THREE.PointLight(PALETTE.hope, 8, 18, 1.8);
      glow.position.copy(model.position);
      ctx.group.add(glow);

      connect(ctx, mats.teal, model.position, new THREE.Vector3(0, 0.4, mz));
      if (i > 0) {
        const prevSide = (i - 1) % 2 === 0 ? -1 : 1;
        const prev = new THREE.Vector3(prevSide * (7 + ((i - 1) % 3)), 2.5 + ((i - 1) % 3) * 1.5, -4 - (i - 1) * 8);
        connect(ctx, mats.teal, model.position, prev);
      }
    });

    const voidLight = new THREE.PointLight(PALETTE.hope, 10, 60, 1.4);
    voidLight.position.set(0, 8, -BRIDGE_LEN / 2 + 5);
    ctx.group.add(voidLight);

    // The final doorway of light at the end of the bridge.
    const doorway = new THREE.Group();
    const doorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 3.4),
      new THREE.MeshBasicMaterial({ color: PALETTE.hope, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    doorGlow.position.y = 1.7;
    doorway.add(doorGlow);
    const doorLight = new THREE.PointLight(PALETTE.hope, 20, 30, 1.4);
    doorLight.position.set(0, 2, 1);
    doorway.add(doorLight);
    doorway.position.set(0, 0, -BRIDGE_LEN + 6.5);
    ctx.group.add(doorway);

    // --- Part 2: the garden courtyard (far below the void, same context) ---
    // The payoff shot of the whole game: full sun, greenery, water, people.
    const OFF_Y = -80;
    const garden = new THREE.Group();
    garden.position.y = OFF_Y;
    ctx.group.add(garden);

    const gMats = {
      grass: new THREE.MeshStandardMaterial({ color: 0x69a659, roughness: 0.95 }),
      path: new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.8 }),
      soil: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 0.95 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x4d8f43, roughness: 0.9 }),
      leafLight: new THREE.MeshStandardMaterial({ color: 0x6fb75c, roughness: 0.9 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xc9c4b6, roughness: 0.7 }),
      water: new THREE.MeshStandardMaterial({ color: 0x7fc4d4, roughness: 0.15, metalness: 0.1, emissive: 0x2a5a64, emissiveIntensity: 0.15 }),
      glassBldg: new THREE.MeshStandardMaterial({ color: 0xa9cfe2, roughness: 0.15, metalness: 0.4 }),
      mullion: new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 }),
      bench: new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.85 }),
      people: new THREE.MeshStandardMaterial({ color: 0x7a8a9a, roughness: 0.8 }),
    };

    // Ground: a broad lawn with a stone path cross.
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(56, 44), gMats.grass);
    lawn.rotation.x = -Math.PI / 2;
    garden.add(lawn);
    ctx.addCollider(0, OFF_Y - 0.5, 0, 28, 0.5, 22);

    const pathNS = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 44), gMats.path);
    pathNS.position.y = 0.03;
    const pathEW = new THREE.Mesh(new THREE.BoxGeometry(56, 0.06, 3), gMats.path);
    pathEW.position.y = 0.03;
    garden.add(pathNS, pathEW);

    // Fountain at the crossing: basin, water, a soft plume.
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 0.7, 24), gMats.stone);
    basin.position.y = 0.35;
    garden.add(basin);
    ctx.addCollider(0, OFF_Y + 0.35, 0, 3.4, 0.35, 3.4);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.1, 24), gMats.water);
    water.position.y = 0.62;
    garden.add(water);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: 0xbfe8f2, transparent: true, opacity: 0.55, roughness: 0.2 })
    );
    plume.position.y = 1.5;
    garden.add(plume);

    // Trees and planted beds around the lawn.
    const treeAt = (x, z, s = 1) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.6 * s, 8), gMats.trunk);
      trunk.position.y = 0.8 * s;
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.15 * s, 10, 10), gMats.leaf);
      c1.position.y = 2.1 * s;
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 10, 10), gMats.leafLight);
      c2.position.set(0.55 * s, 2.5 * s, 0.25 * s);
      t.add(trunk, c1, c2);
      t.position.set(x, 0, z);
      garden.add(t);
      ctx.addCollider(x, OFF_Y + 0.8, z, 0.3, 0.8, 0.3);
    };
    treeAt(-10, -8); treeAt(10, -9, 1.2); treeAt(-12, 7, 1.1);
    treeAt(12, 8); treeAt(-19, -2, 0.9); treeAt(19, 1, 1.15);
    treeAt(-6, 13, 0.85); treeAt(7, -15, 1.05);

    const bedAt = (x, z) => {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 1.6), gMats.soil);
      bed.position.set(x, 0.15, z);
      garden.add(bed);
      for (let i = 0; i < 5; i++) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), i % 2 ? gMats.leafLight : gMats.leaf);
        bush.position.set(x - 1.3 + i * 0.65, 0.45, z + (i % 2 ? 0.3 : -0.3));
        garden.add(bush);
      }
      ctx.addCollider(x, OFF_Y + 0.2, z, 1.7, 0.2, 0.8);
    };
    bedAt(-7, -4); bedAt(7, 4); bedAt(-7, 5); bedAt(8, -5);

    // Benches along the paths.
    const benchAt = (x, z, rotY = 0) => {
      const b = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), gMats.bench);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), gMats.bench);
      back.position.set(0, 0.75, -0.22);
      for (const lx of [-0.75, 0.75]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), gMats.bench);
        leg.position.set(lx, 0.22, 0);
        b.add(leg);
      }
      b.add(seat, back);
      b.position.set(x, 0, z);
      b.rotation.y = rotY;
      garden.add(b);
      ctx.addCollider(x, OFF_Y + 0.4, z, 0.9, 0.4, 0.3);
    };
    benchAt(-4.5, -6.5, Math.PI); benchAt(4.5, 6.5); benchAt(-6.5, 4.5, Math.PI / 2);

    // Modern glass office architecture at the courtyard's edges — background,
    // not foreground.
    for (const [bx, bz, bw, bd] of [[0, -26, 50, 8], [0, 26, 50, 8], [-32, 0, 8, 36], [32, 0, 8, 36]]) {
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, 14, bd), gMats.glassBldg);
      bldg.position.set(bx, 7, bz);
      garden.add(bldg);
      // horizontal floor bands
      for (let fy = 3.2; fy < 14; fy += 3.2) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(bw + 0.1, 0.25, bd + 0.1), gMats.mullion
        );
        band.position.set(bx, fy, bz);
        garden.add(band);
      }
      ctx.addCollider(bx, OFF_Y + 7, bz, bw / 2, 7, bd / 2);
    }

    // People, at a distance, moving calmly — the first people in the game.
    const people = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), gMats.people);
      body.position.y = 1.05;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), gMats.people);
      head.position.y = 1.65;
      p.add(body, head);
      const angle = (i / 6) * Math.PI * 2;
      p.position.set(Math.cos(angle) * 13, 0, Math.sin(angle) * 11);
      p.userData = { phase: i * 1.7, radius: 11 + (i % 3) * 2, speed: 0.05 + (i % 3) * 0.02, angle };
      garden.add(p);
      people.push(p);
    }

    // Full warm sun — the hard tonal break from every fluorescent room.
    const sun = new THREE.DirectionalLight(0xfff2d8, 3.2);
    sun.position.set(18, 30, 10);
    const skyFill = new THREE.HemisphereLight(0xcfe8f2, 0x69a659, 1.4);
    garden.add(sun, skyFill);

    let phase = 'bridge';
    let narrationStarted = false;
    let elapsed = 0;

    async function runNarration() {
      for (const line of FINAL_NARRATION) {
        await game.ui.showNarrationLine(line);
      }
    }

    async function escape() {
      phase = 'transition';
      await game.ui.fadeOut(true, 1400); // fade to light, not dark
      game.audio.killHum(2);             // the hum dies here, permanently
      game.dread.freezeCalm();
      // drop the player into the garden, facing the fountain
      game.player.motion.setState({ position: { x: ctx.origin.x, y: OFF_Y, z: ctx.origin.z + 14 }, yaw: 0, pitch: 0 });
      game.player.resolver.syncActor(game.player.actor, game.player.motion.position);
      game.ui.setObjective(null);
      phase = 'garden';
      game.scene.fog = null; // clear air, at last
      game.audio.startGarden(); // birdsong and wind — silence resolving into life
      await game.ui.fadeIn(1800);
      await wait(6000);
      await game.ui.showRevelation('final');
      showEndScreen(game);
    }

    return {
      spawn: { x: 0, z: 4, yaw: 0 },
      enter() {
        game.ui.setObjective(null);
        game.dread.set(0.1);
        game.pressure?.disable(); // pressure has no place in the synthesis
        game.scene.background = new THREE.Color(0x0d0b04);
        if (!narrationStarted) {
          narrationStarted = true;
          runNarration();
        }
      },
      update(dt) {
        elapsed += dt;
        if (phase === 'garden') {
          game.scene.background = new THREE.Color(0x9fd4ea);
          // people stroll the paths; the fountain breathes
          for (const p of people) {
            p.userData.angle += dt * p.userData.speed;
            p.position.set(
              Math.cos(p.userData.angle) * p.userData.radius, 0,
              Math.sin(p.userData.angle) * p.userData.radius * 0.8
            );
            p.rotation.y = -p.userData.angle;
          }
          plume.scale.y = 1 + Math.sin(elapsed * 2.2) * 0.08;
          water.position.y = 0.62 + Math.sin(elapsed * 1.6) * 0.01;
        }
        if (phase === 'bridge') {
          const dz = game.player.position.z - (ctx.origin.z - BRIDGE_LEN + 8);
          if (dz < 0) escape();
        }
      },
    };
  },
};

function connect(ctx, mat, a, b) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 5), mat);
  line.position.copy(a).addScaledVector(dir, 0.5);
  line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  ctx.group.add(line);
}

function showEndScreen(game) {
  const title = document.getElementById('title-screen');
  title.querySelector('h1').textContent = 'BACK OFFICES';
  title.querySelector('.title-sub').textContent = 'transformed';
  title.querySelector('.title-body').innerHTML =
    'There was never a monster.<br/>The dysfunction was internal — and so was the way out.<br/><br/>Data · Workflow · Governance · Readiness · Alignment';
  title.querySelector('.title-controls').textContent = '';
  const btn = document.getElementById('start-button');
  btn.textContent = 'PLAY AGAIN';
  btn.onclick = () => {
    localStorage.removeItem('the-enterprise-checkpoint');
    location.reload();
  };
  document.getElementById('resume-note').textContent = '';
  document.exitPointerLock?.();
  title.style.display = 'flex';
}
