import * as THREE from 'three';
import { MouseLookCharacterMotionController } from '../modules/actor-motion/character/MouseLookCharacterMotionController.js';
import { KinematicBatchResolver } from '../modules/actor-motion/KinematicBatchResolver.js';
import { FirstPersonCameraRig } from '../modules/camera/FirstPersonCameraRig.js';
import { CAMERA_HEIGHT_SOURCES } from '../modules/camera/BaseCameraRig.js';

// First-person player built from GameBlocks modules:
//   MouseLookCharacterMotionController (input -> locomotion intent)
//   KinematicBatchResolver             (Rapier collision resolution)
//   FirstPersonCameraRig               (camera pose from character state)
export class Player {
  constructor({ world, rapier, camera, audio }) {
    this.camera = camera;
    this.audio = audio;

    this.motion = new MouseLookCharacterMotionController({
      walkSpeed: 3.6,
      sprintSpeed: 5.6,
      jumpVelocity: 0, // no jumping in a liminal office
    });

    this.resolver = new KinematicBatchResolver(world, rapier);
    this.actor = this.resolver.createActor({
      position: { x: 0, y: 0, z: 0 },
      bodyOffset: { x: 0, y: 0.95, z: 0 },
      groundedProbeDistance: 0.12,
      colliderShape: { type: 'capsule', halfHeight: 0.6, radius: 0.34 },
      controllerOptions: { snapToGround: 0.3, slide: true },
    });

    // basisUp keeps the eye at a fixed height when pitching, like a real FPS.
    this.rig = new FirstPersonCameraRig({ eyeHeight: 1.66, heightVectorSource: CAMERA_HEIGHT_SOURCES.basisUp });

    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.enabled = false;
    this.touch = null; // TouchControls, when running on a coarse-pointer device
    this._stepDistance = 0;

    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  teleport(x, z, yaw = 0) {
    this.motion.setState({ position: { x, y: 0, z }, velocity: { x: 0, y: 0, z: 0 }, yaw, pitch: 0 });
    this.resolver.syncActor(this.actor, this.motion.position);
  }

  get position() { return this.motion.position; }

  update(dt, dread) {
    if (!this.enabled) {
      this.mouseDX = 0;
      this.mouseDY = 0;
      // Keep the camera glued to the character even when input is off
      // (menus, cards, automated playtests).
      const idle = this.motion.snapshot();
      this.rig.step({ targetPosition: idle.position, targetFrame: idle.viewFrame, camera: this.camera });
      return idle;
    }

    // Keyboard is digital; the virtual joystick contributes analog amounts.
    const t = this.touch?.move ?? { x: 0, y: 0 };
    const intent = this.motion.planMovement({
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : Math.max(0, t.y),
      backward: this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : Math.max(0, -t.y),
      strafeLeft: this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : Math.max(0, -t.x),
      strafeRight: this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : Math.max(0, t.x),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      mouseDeltaX: this.mouseDX,
      mouseDeltaY: this.mouseDY,
      deltaSeconds: dt,
    });
    this.mouseDX = 0;
    this.mouseDY = 0;

    this.resolver.beginFrame();
    this.resolver.queueMove(this.actor, intent);
    this.resolver.resolveQueuedMoves(dt);
    const state = this.motion.commitMovement(intent, this.resolver.getResult(this.actor));

    // Footstep foley from distance traveled on the damp carpet.
    const speed = Math.hypot(state.velocity.x, state.velocity.z);
    this._stepDistance += speed * dt;
    if (speed > 0.5 && this._stepDistance > 2.1) {
      this._stepDistance = 0;
      this.audio.footstep(dread);
    }

    this.rig.step({
      targetPosition: state.position,
      targetFrame: state.viewFrame,
      camera: this.camera,
    });

    return state;
  }
}
