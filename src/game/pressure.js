import * as THREE from 'three';

// Roaming pressure entities — external and internal pressure on the
// transformation, made visible. Not enemies: no combat, no death, no fail
// state. Contact or proximity feeds DreadLevel and can cost a moment, never
// the game. They carry no colliders, so they can never block a puzzle path.
//
// Archetypes:
//   competitor — fast, erratic, glitching. Appears at range, rushes, vanishes.
//                Periodically fractures into offset ghost copies: not one
//                clean threat, several, faster than you can process.
//   board      — slow row of watchers at the edge of sight. Defined by
//                stillness: dread accrues the longer they stay in view.
//   legacy     — heavy, groaning mass of technical debt. Slow wander, a
//                dread aura up close.
//
// One deliberate breach of the silhouette ambiguity: eyes. Always emissive,
// always tracking the player. Board eyes are calm and patient; Competitor
// eyes snap and flicker.

const ARCHETYPES = ['competitor', 'board', 'legacy'];

// Sickly wallpaper-family glow — deliberately neither hope-teal nor risk-red.
const EYE_BRIGHT = 0xF2E4A2;
const EYE_DIM = 0xBFB37E;

const SILHOUETTE = new THREE.MeshStandardMaterial({
  color: 0x17140a,
  roughness: 1.0,
  transparent: true,
  opacity: 0.92,
});

// Diegetic alert lines, rotated per archetype so repeats don't copy-paste.
const NOTIFICATIONS = {
  competitor: [
    'Your competitors have announced a new AI initiative.',
    'A competitor just shipped an AI feature you haven’t.',
    'The market is not waiting for you.',
  ],
  board: [
    'The Board of Directors is monitoring your AI transformation progress.',
    'The Board has requested a status update.',
    'Leadership is asking about your timeline.',
  ],
  legacy: [
    'A legacy system is still load-bearing.',
    'That workaround from 2019 is now mission-critical.',
  ],
};

// A pair of always-watching eyes at a head position. Returned group is the
// aim rig; call lookAt with the camera's world position.
function buildEyePair(x, y, z, { color = EYE_BRIGHT, size = 0.032, gap = 0.075 } = {}) {
  const rig = new THREE.Group();
  rig.position.set(x, y, z);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), mat);
    // eyes sit slightly forward of the rig origin so lookAt aims them
    eye.position.set(side * gap / 2, 0, 0.1);
    rig.add(eye);
  }
  rig.userData.eyeMat = mat;
  return rig;
}

function buildMesh(kind) {
  const g = new THREE.Group();
  const mat = SILHOUETTE.clone();
  const eyeRigs = [];

  if (kind === 'competitor') {
    // tall, thin, leaning forward — always mid-stride
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.35, 4, 8), mat);
    body.position.y = 1.1;
    body.rotation.x = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mat);
    head.position.set(0, 1.98, 0.18);
    g.add(body, head);
    eyeRigs.push(buildEyePair(0, 1.98, 0.18, { color: EYE_BRIGHT, size: 0.03, gap: 0.07 }));
  } else if (kind === 'board') {
    // a slow row of indistinct figures, moving as one
    for (let i = -1; i <= 1; i++) {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 4, 8), mat);
      body.position.set(i * 0.55, 1.0, Math.abs(i) * 0.1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mat);
      head.position.set(i * 0.55, 1.78, Math.abs(i) * 0.1);
      g.add(body, head);
      eyeRigs.push(buildEyePair(i * 0.55, 1.78, Math.abs(i) * 0.1, { color: EYE_DIM, size: 0.028, gap: 0.08 }));
    }
  } else {
    // legacy system: a groaning stack of dead hardware with one dim lamp
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.1 - i * 0.2, 0.6, 0.9 - i * 0.15), mat);
      box.position.y = 0.3 + i * 0.6;
      box.rotation.y = (i % 2 ? 1 : -1) * 0.12;
      g.add(box);
    }
    eyeRigs.push(buildEyePair(0, 1.55, 0.3, { color: EYE_DIM, size: 0.04, gap: 0 }));
  }

  for (const rig of eyeRigs) g.add(rig);
  return { group: g, eyeRigs };
}

// Translucent offset copies of the Competitor with a faint red/cyan split —
// a corrupted-signal flaw in the image, not a special effect. Mobile GPUs get
// one copy instead of two; the multiplying read survives, the fill cost halves.
function buildGhosts(kind, max = 2) {
  if (kind !== 'competitor') return [];
  const tints = [0x2a1010, 0x102a2a].slice(0, max);
  return tints.map((tint) => {
    const { group } = buildMesh('competitor');
    group.traverse((m) => {
      if (m.material) {
        m.material = m.material.clone();
        m.material.transparent = true;
        m.material.opacity = 0.32;
        if (m.material.color) m.material.color.offsetHSL(0, 0, 0).add(new THREE.Color(tint));
      }
    });
    group.visible = false;
    return group;
  });
}

export class PressureSystem {
  constructor(game) {
    this.game = game;
    this.entities = [];
    this.ctx = null;
    this.bounds = null;
    this.timer = 0;
    this.nextSpawn = rand(8, 15);
    this.enabled = true;
    this.firstSeen = { competitor: false, board: false };
    this.noteIndex = { competitor: 0, board: 0, legacy: 0 };
    this.shakeTime = 0;
    this._camOffset = new THREE.Vector3();
  }

  // Notifications (and their dread bump) teach the pattern in Rooms 1–2 only;
  // from Room 3 on, presence must be read from eyes, motion, and sound.
  get notificationsActive() {
    return this.game.rooms.currentIndex <= 1;
  }

  onRoomEnter(ctx, bounds) {
    for (const e of this.entities) e.mesh.removeFromParent();
    this.entities = [];
    this.ctx = ctx;
    this.bounds = bounds ?? { w: 26, d: 26 };
    this.timer = 0;
    // Grace period: let the room's arrival beat land before pressure starts.
    this.nextSpawn = rand(9, 16);
  }

  disable() {
    this.enabled = false;
    for (const e of this.entities) e.mesh.removeFromParent();
    this.entities = [];
  }

  _clampLocal(v) {
    const hx = this.bounds.w / 2 - 2;
    const hz = this.bounds.d / 2 - 2;
    v.x = Math.max(-hx, Math.min(hx, v.x));
    v.z = Math.max(-hz, Math.min(hz, v.z));
    return v;
  }

  _playerLocal() {
    const p = this.game.player.position;
    return new THREE.Vector3(p.x - this.ctx.origin.x, 0, p.z - this.ctx.origin.z);
  }

  _notify(kind) {
    if (!this.notificationsActive) return;
    const lines = NOTIFICATIONS[kind];
    const line = lines[this.noteIndex[kind] % lines.length];
    if (this.game.ui.showNotification(line)) {
      this.noteIndex[kind] += 1;
      // the notification itself is a dread event, not just flavor text
      this.game.dread.raise(0.04);
    }
  }

  spawn(kind = null) {
    if (!this.ctx || !this.enabled) return;
    kind = kind ?? ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    const player = this._playerLocal();

    // First encounter of each required archetype gets a one-time "noticing"
    // beat — and spawns inside the player's view cone so it lands.
    const isFirst = (kind === 'competitor' || kind === 'board')
      && !this.firstSeen[kind] && this.notificationsActive;

    let angle;
    const dist = kind === 'board' ? rand(12, 16) : rand(9, 14);
    if (isFirst) {
      // player's facing direction in world: yaw 0 looks toward -z, so the
      // forward vector is (-sin(yaw), -cos(yaw)) in the xz plane
      const yaw = this.game.player.motion.yaw;
      const facing = Math.atan2(-Math.cos(yaw), -Math.sin(yaw)); // atan2(z, x) of forward
      angle = facing + rand(-0.5, 0.5);
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    const pos = this._clampLocal(new THREE.Vector3(
      player.x + Math.cos(angle) * dist, 0, player.z + Math.sin(angle) * dist
    ));

    const { group: mesh, eyeRigs } = buildMesh(kind);
    mesh.position.copy(pos);
    this.ctx.group.add(mesh);
    const ghosts = buildGhosts(kind, this.game.isMobile ? 1 : 2);
    for (const gh of ghosts) this.ctx.group.add(gh);

    const e = {
      kind, mesh, eyeRigs, ghosts,
      age: 0,
      life: kind === 'board' ? rand(22, 38) : kind === 'legacy' ? rand(20, 30) : rand(6, 9),
      state: 'lurk',
      stateTime: kind === 'competitor' ? rand(0.8, 1.8) : 0,
      heading: Math.random() * Math.PI * 2,
      cueTimer: 0,
      snapTimer: 0,          // competitor eye snap-tracking
      blinkTimer: rand(4, 9), // board blink cadence
      blinkTime: 0,
      glitchTime: 0,
      glitchedNear: false,   // fast-approach glitch fired?
    };
    this.entities.push(e);

    if (kind === 'competitor') this.game.audio.competitorCue();
    else if (kind === 'board') this.game.audio.boardCue();
    else this.game.audio.legacyCue();

    this._notify(kind);

    if (isFirst) {
      this.firstSeen[kind] = true;
      this.shakeTime = 0.4;            // camera micro-shake
      this.game.audio.humStutter();    // the hum drops out for half a second
    }
    return e;
  }

  _glitch(e) {
    if (e.glitchTime > 0) return;
    e.glitchTime = this.game.isMobile ? rand(0.08, 0.2) : rand(0.1, 0.3);
    this.game.audio.glitchCue();
  }

  update(dt) {
    if (!this.ctx || !this.enabled) return;

    // Hold everything while a revelation card is up — the lesson beat should
    // never be interrupted by a contact spike.
    if (document.getElementById('revelation-card').classList.contains('visible')) return;

    this.timer += dt;
    if (this.timer > this.nextSpawn && this.entities.length < 2) {
      this.timer = 0;
      this.nextSpawn = rand(14, 26);
      this.spawn();
    }

    const player = this._playerLocal();
    const dread = this.game.dread;
    const audio = this.game.audio;
    const camera = this.game.camera;
    const camWorld = camera.getWorldPosition(new THREE.Vector3());

    for (const e of this.entities) {
      e.age += dt;
      e.cueTimer += dt;
      const toPlayer = player.clone().sub(e.mesh.position);
      toPlayer.y = 0;
      const d = toPlayer.length();

      if (e.kind === 'competitor') {
        if (e.state === 'lurk') {
          e.mesh.position.x += (Math.random() - 0.5) * dt * 3;
          e.mesh.position.z += (Math.random() - 0.5) * dt * 3;
          e.stateTime -= dt;
          if (e.stateTime <= 0) {
            e.state = 'rush';
            this._glitch(e); // fracture on the moment it commits
          }
        } else {
          const step = toPlayer.normalize().multiplyScalar(7.5 * dt);
          e.mesh.position.add(step);
          if (e.cueTimer > 0.35) { e.cueTimer = 0; audio.competitorSteps(); }
          // fast-approach glitch: once when it closes inside 6m
          if (d < 6 && !e.glitchedNear) { e.glitchedNear = true; this._glitch(e); }
          // erratic re-fracture, rarely, mid-rush
          if (Math.random() < dt * 0.6) this._glitch(e);
          if (d < 1.4) {
            dread.raise(0.18);
            dread.shock(0.55);
            audio.competitorHit();
            e.age = e.life; // expire
          }
        }
        e.mesh.lookAt(this.ctx.origin.x + player.x, 1.2, this.ctx.origin.z + player.z);

        // snap-tracking eyes: re-aim instantly, on a jittery timer
        e.snapTimer -= dt;
        if (e.snapTimer <= 0) {
          e.snapTimer = rand(0.15, 0.35);
          for (const rig of e.eyeRigs) rig.lookAt(camWorld);
        }
        // hard emissive flicker
        for (const rig of e.eyeRigs) {
          rig.userData.eyeMat.opacity = 0.7 + Math.random() * 0.3;
        }

        // ghost-image burst
        if (e.glitchTime > 0) {
          e.glitchTime -= dt;
          e.ghosts.forEach((gh, gi) => {
            gh.visible = e.glitchTime > 0;
            const off = 0.3 + Math.random() * 0.3;
            gh.position.copy(e.mesh.position);
            gh.position.x += (gi ? 1 : -1) * off;
            gh.position.z += (Math.random() - 0.5) * 0.4;
            gh.rotation.copy(e.mesh.rotation);
            gh.rotation.y += (gi ? 1 : -1) * 0.15;
          });
        } else {
          for (const gh of e.ghosts) gh.visible = false;
        }
      } else if (e.kind === 'board') {
        const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        e.mesh.position.addScaledVector(side, Math.sin(e.age * 0.4) * 0.35 * dt);
        if (d < 9) e.mesh.position.addScaledVector(toPlayer.clone().normalize(), -0.3 * dt);
        this._clampLocal(e.mesh.position);
        e.mesh.lookAt(this.ctx.origin.x + player.x, 1.0, this.ctx.origin.z + player.z);
        if (d < 18) dread.raise(dt * 0.012);
        if (e.cueTimer > 4.5) { e.cueTimer = 0; audio.boardCue(); }

        // calm, patient eyes: smooth tracking, slow blink
        for (const rig of e.eyeRigs) rig.lookAt(camWorld);
        e.blinkTimer -= dt;
        if (e.blinkTimer <= 0) { e.blinkTimer = rand(6, 9); e.blinkTime = 0.15; }
        if (e.blinkTime > 0) {
          e.blinkTime -= dt;
          for (const rig of e.eyeRigs) rig.scale.y = 0.1;
        } else {
          for (const rig of e.eyeRigs) rig.scale.y = 1;
        }
      } else {
        e.heading += (Math.random() - 0.5) * dt * 0.8;
        e.mesh.position.x += Math.cos(e.heading) * 0.5 * dt;
        e.mesh.position.z += Math.sin(e.heading) * 0.5 * dt;
        this._clampLocal(e.mesh.position);
        e.mesh.rotation.y += dt * 0.15;
        if (d < 5) dread.raise(dt * 0.02);
        if (e.cueTimer > rand(4, 6)) { e.cueTimer = 0; audio.legacyCue(); }
        for (const rig of e.eyeRigs) rig.lookAt(camWorld);
      }

      // fade out at end of life
      const remaining = e.life - e.age;
      if (remaining < 1.2) {
        const op = Math.max(0, remaining / 1.2);
        e.mesh.traverse((m) => { if (m.material) m.material.opacity = op * 0.92; });
        for (const gh of e.ghosts) gh.visible = false;
      }
    }

    this.entities = this.entities.filter((e) => {
      if (e.age >= e.life) {
        e.mesh.removeFromParent();
        for (const gh of e.ghosts) gh.removeFromParent();
        return false;
      }
      return true;
    });

    // First-encounter camera micro-shake: applied after the rig positioned the
    // camera (render happens after pressure.update in the main loop).
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const s = 0.03 * (this.shakeTime / 0.4);
      this._camOffset.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      camera.position.add(this._camOffset);
    }
  }
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}
