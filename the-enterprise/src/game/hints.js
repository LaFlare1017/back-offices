import * as THREE from 'three';
import { PALETTE } from './constants.js';

// Struggle detection: if a player makes no meaningful progress for a while,
// a soft teal glow gathers at the edge of the screen in the direction of the
// next puzzle-relevant interactable. It never solves anything — it only says
// "this way is progress", in the color already established to mean that.
//
// Progress is detected by hooking dread.lower(): every puzzle-relevant action
// in every room lowers dread, so it doubles as a universal progress event.
// (dread.raise events — wrong doors, alarms — deliberately do NOT reset the
// timer: flailing isn't progress.)

const TIER1_SECONDS = 60;   // soft directional edge glow
const TIER2_SECONDS = 150;  // + a faint pulsing light at the target itself

export class HintSystem {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.glow = document.getElementById('hint-glow');
    this.pulseLight = null;
    this._v = new THREE.Vector3();

    // Every room signals progress through dread.lower — hook it once.
    const originalLower = game.dread.lower.bind(game.dread);
    game.dread.lower = (n) => { this.progress(); originalLower(n); };
  }

  onRoomEnter() {
    this.progress();
  }

  progress() {
    this.timer = 0;
    this.glow.style.opacity = '0';
    if (this.pulseLight) {
      this.pulseLight.removeFromParent();
      this.pulseLight = null;
    }
  }

  update(dt, elapsed) {
    const g = this.game;
    const inst = g.rooms.current;
    const ctx = g.rooms.currentContext;
    if (!inst?.hintTarget || !ctx) return;
    if (document.getElementById('revelation-card').classList.contains('visible')) return;

    this.timer += dt;
    if (this.timer < TIER1_SECONDS) return;

    const target = inst.hintTarget();
    if (!target) { this.glow.style.opacity = '0'; return; }

    const world = this._v.set(ctx.origin.x + target.x, target.y ?? 1.3, ctx.origin.z + target.z);

    // Tier 2: the target itself breathes a faint teal pulse.
    if (this.timer >= TIER2_SECONDS) {
      if (!this.pulseLight) {
        this.pulseLight = new THREE.PointLight(PALETTE.hope, 0, 7);
        g.scene.add(this.pulseLight);
      }
      this.pulseLight.position.set(world.x, (target.y ?? 1.3) + 0.6, world.z);
      this.pulseLight.intensity = 2.2 + Math.sin(elapsed * 2.2) * 1.6;
    }

    // Project the target into screen space and park the glow there (clamped
    // to the screen edges when the target is behind or off-screen).
    const ndc = world.clone().project(g.camera);
    let x = (ndc.x * 0.5 + 0.5) * 100;
    let y = (-ndc.y * 0.5 + 0.5) * 100;
    if (ndc.z > 1) { x = 100 - x; y = 100; } // behind the camera: point down/away
    x = Math.max(6, Math.min(94, x));
    y = Math.max(8, Math.min(92, y));
    this.glow.style.setProperty('--hx', `${x}%`);
    this.glow.style.setProperty('--hy', `${y}%`);
    this.glow.style.opacity = this.timer >= TIER2_SECONDS ? '0.5' : '0.32';
  }
}
