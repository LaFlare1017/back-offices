import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PALETTE, ROOM_SPACING, SAVE_KEY } from './game/constants.js';
import { createRoomContext } from './game/kit.js';
import { Intro } from './game/intro.js';
import { AudioSystem } from './game/audio.js';
import { DreadSystem } from './game/dread.js';
import { Player } from './game/player.js';
import { UI } from './game/ui.js';
import { InteractionSystem } from './game/interact.js';
import { RoomManager } from './game/roomManager.js';
import { PressureSystem } from './game/pressure.js';
import { HintSystem } from './game/hints.js';
import { TouchControls, isTouchDevice } from './game/touch.js';
import { room1 } from './game/rooms/room1_data.js';
import { room2 } from './game/rooms/room2_workflow.js';
import { room3 } from './game/rooms/room3_governance.js';
import { room4 } from './game/rooms/room4_readiness.js';
import { room5 } from './game/rooms/room5_alignment.js';
import { ending } from './game/rooms/ending.js';

async function boot() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  const isMobile = isTouchDevice();

  // Mobile performance profile: 30fps floor on mid-range phones. Cheapest
  // wins first — render fewer pixels (DPR cap 1.5 vs 2), skip MSAA (the
  // dark, foggy palette hides aliasing), and halve the glitch ghost draws.
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.shadow);
  scene.fog = new THREE.FogExp2(0x241f0e, 0.02);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 400);

  // Low, sickly ambient so unlit corners stay murky, never black.
  scene.add(new THREE.AmbientLight(0x8a7f52, 1.1));
  const hemi = new THREE.HemisphereLight(0xcabb63, 0x2a2410, 0.7);
  scene.add(hemi);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const audio = new AudioSystem();
  const ui = new UI();
  const dread = new DreadSystem(audio);
  const player = new Player({ world, rapier: RAPIER, camera, audio });
  const interaction = new InteractionSystem(camera, ui);

  const game = { scene, canvas, audio, ui, dread, player, interaction, rooms: null, isMobile };
  window.__game = game; // debug/playtest handle
  game.renderer = renderer;
  game.camera = camera;
  const rooms = new RoomManager({ game });
  game.rooms = rooms;
  game.pressure = new PressureSystem(game);
  game.hints = new HintSystem(game);
  audio.mobile = isMobile;
  if (isMobile) {
    player.touch = new TouchControls(game);
    // Pointer lock is meaningless (and disruptive) on touch; make every
    // `canvas.requestPointerLock?.()` in the codebase a silent no-op.
    canvas.requestPointerLock = undefined;
  }

  for (const def of [room1, room2, room3, room4, room5, ending]) rooms.register(def);
  rooms.buildAll((origin) => createRoomContext({ scene, world, rapier: RAPIER, origin }));

  // The cold open lives on its own context, off the room grid, so it never
  // shifts the indexed sequence the notification/checkpoint/hint systems key on.
  const introCtx = createRoomContext({ scene, world, rapier: RAPIER, origin: { x: -ROOM_SPACING, z: 0 } });
  introCtx.setActive(false);
  game.intro = new Intro(game, introCtx);

  // ---- title screen / pointer lock ----
  const titleEl = document.getElementById('title-screen');
  const pauseEl = document.getElementById('pause-screen');
  const startBtn = document.getElementById('start-button');
  const resumeNote = document.getElementById('resume-note');

  const saved = rooms.savedIndex();
  const freshStart = localStorage.getItem(SAVE_KEY) === null;
  if (saved > 0) resumeNote.textContent = `checkpoint found — resuming at room ${saved + 1} of 5`;

  let started = false;
  startBtn.addEventListener('click', async () => {
    if (started) return;
    started = true;
    audio.start();
    titleEl.style.display = 'none';
    if (isMobile) player.enabled = true; // no pointer lock gate on touch
    canvas.requestPointerLock?.();
    // First-ever run gets the cold open; it resolves when the player crosses
    // into the Backrooms, then Room 1 fades in.
    if (freshStart) await game.intro.start();
    await rooms.enterRoom(saved, { fade: true });
  });

  canvas.addEventListener('click', () => {
    if (started) canvas.requestPointerLock?.();
  });
  pauseEl.addEventListener('click', () => canvas.requestPointerLock?.());

  // Mobile app lifecycle: backgrounding, app switches, calls. Audio must not
  // keep humming from a pocket; rAF pauses on its own, checkpoints are already
  // written at every room entry.
  document.addEventListener('visibilitychange', () => {
    if (!audio.ctx) return;
    if (document.hidden) audio.ctx.suspend();
    else if (started) audio.ctx.resume();
  });

  document.addEventListener('pointerlockchange', () => {
    if (isMobile) return; // touch input isn't gated on pointer lock
    const locked = document.pointerLockElement === canvas;
    player.enabled = locked;
    // Don't flash PAUSED under the revelation card or title/end screens.
    const cardOpen = document.getElementById('revelation-card').classList.contains('visible');
    const titleOpen = titleEl.style.display !== 'none';
    pauseEl.style.display = started && !locked && !cardOpen && !titleOpen ? 'flex' : 'none';
  });

  // ---- main loop ----
  const clock = new THREE.Clock();
  let elapsed = 0;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (started) {
      player.update(dt, dread.level);
      interaction.update();
      if (game.intro?.active) {
        // Cold open: its own context drives the flicker; no pressure or hints.
        dread.update(dt, game.intro.ctx.flickerLights, elapsed);
        game.intro.update();
      } else {
        const ctx = rooms.currentContext;
        dread.update(dt, ctx ? ctx.flickerLights : [], elapsed);
        game.pressure.update(dt);
        game.hints.update(dt, elapsed);
        rooms.current?.update?.(dt);
      }
    }

    renderer.render(scene, camera);
  });
}

boot().catch((err) => {
  console.error('boot failed', err);
  const el = document.querySelector('.title-body');
  if (el) el.textContent = 'Something failed to load. Check the console.';
});
