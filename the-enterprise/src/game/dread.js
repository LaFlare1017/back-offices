// The Dread System — the mechanical expression of "the monster is the
// enterprise". A single float, DreadLevel [0,1], drives the hum, the light
// flicker, and the screen-edge unease. There is no chase AI. There is only this.

export class DreadSystem {
  constructor(audio) {
    this.audio = audio;
    this.level = 0.25;
    this.target = 0.25;
    this.frozen = false; // ending disables dread entirely

    this.vignetteEl = document.getElementById('vignette');
    this.tintEl = document.getElementById('dread-tint');
    this.chromaEl = document.getElementById('chroma');
    this._uiClock = 0;
    this._shockTimer = 0;
  }

  // A brief lights-out beat (pressure entity contact). Not a fail state —
  // just a moment lost to the dark.
  shock(seconds = 0.5) {
    this._shockTimer = seconds;
  }

  // Nudge dread up (running from the problem) or down (engaging with it).
  raise(amount) { if (!this.frozen) this.target = Math.min(1, this.target + amount); }
  lower(amount) { if (!this.frozen) this.target = Math.max(0, this.target - amount); }
  set(value) { this.target = Math.max(0, Math.min(1, value)); }

  freezeCalm() {
    this.frozen = true;
    this.target = 0;
  }

  update(dt, flickerLights, elapsed) {
    // Ease the actual level toward the target.
    const rate = this.level < this.target ? 0.35 : 0.12; // rises faster than it falls
    this.level += (this.target - this.level) * Math.min(1, rate * dt * 3);

    // Ambient creep: doing nothing in an unsolved room slowly raises dread.
    if (!this.frozen && this.target < 0.85) this.target += dt * 0.004;

    this.audio.setDread(this.level);

    // Screen-edge unease (kept as cheap DOM overlays for performance).
    this._uiClock += dt;
    if (this._uiClock > 0.15) {
      this._uiClock = 0;
      // Frozen calm (the ending) lets the vignette clear completely.
      this.vignetteEl.style.opacity = (this.frozen ? this.level * 0.85 : 0.25 + this.level * 0.6).toFixed(2);
      this.tintEl.style.opacity = (this.level * 0.45).toFixed(2);
      // chromatic fringe creeps in from the edges as dread rises
      if (this.chromaEl) {
        this.chromaEl.style.opacity = this.frozen ? '0' : Math.max(0, (this.level - 0.25) * 1.1).toFixed(2);
      }
    }

    // Shock beat: pressure contact cuts the lights for a moment.
    if (this._shockTimer > 0) {
      this._shockTimer -= dt;
      this.vignetteEl.style.opacity = '1';
      for (const f of flickerLights) {
        f.light.intensity = 0;
        if (f.mesh?.material?.emissiveIntensity !== undefined) f.mesh.material.emissiveIntensity = 0.05;
      }
      return;
    }

    // Fluorescent flicker: rate and depth scale with dread. Each fixture has
    // its own seed so the floor never flickers in unison.
    for (const f of flickerLights) {
      const n =
        Math.sin(elapsed * (7 + this.level * 26) + f.seed * 17) *
        Math.sin(elapsed * (13 + this.level * 40) + f.seed * 5);
      const flicker = n > (0.92 - this.level * 0.55) ? 0.15 + Math.random() * 0.3 : 1.0;
      f.light.intensity = f.baseIntensity * flicker;
      if (f.mesh?.material?.emissiveIntensity !== undefined) {
        f.mesh.material.emissiveIntensity = 1.6 * flicker;
      }
    }
  }
}
