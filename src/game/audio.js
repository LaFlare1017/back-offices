// All audio is synthesized with WebAudio so the game ships with zero assets.
// The fluorescent hum is the voice of "the monster": its volume and pitch are
// bound to DreadLevel by the DreadSystem.

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.humGain = null;
    this.humOscs = [];
    this.humNoiseGain = null;
    this.started = false;
    this.humMuted = false;
    this.mobile = false; // set before start(); revoices the hum for tiny speakers
  }

  // Must be called from a user gesture.
  start() {
    if (this.started) return;
    this.started = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // --- fluorescent hum: 120Hz fundamental + harmonics + filtered noise ---
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0.0;
    this.humGain.connect(this.master);

    // Phone speakers roll off below ~200Hz: the 58Hz sub and much of the 120Hz
    // fundamental vanish. On mobile, shift the hum's weight into the harmonics
    // that tiny drivers can actually reproduce, so the monster stays audible.
    const humVoices = this.mobile
      ? [[120, 0.55], [240, 0.34], [360, 0.18], [480, 0.1]]
      : [[120, 0.5], [240, 0.22], [360, 0.1], [58, 0.18]];
    for (const [freq, level] of humVoices) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      osc.connect(filter).connect(g).connect(this.humGain);
      osc.start();
      this.humOscs.push(osc);
    }

    const noise = this._noiseSource();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3200;
    noiseFilter.Q.value = 2.5;
    this.humNoiseGain = ctx.createGain();
    this.humNoiseGain.gain.value = 0.02;
    noise.connect(noiseFilter).connect(this.humNoiseGain).connect(this.humGain);
    noise.start();
  }

  _noiseSource() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  // dread in [0,1]. Hum swells and detunes as dread rises.
  setDread(dread) {
    if (!this.ctx || this.humMuted) return;
    const t = this.ctx.currentTime;
    const vol = 0.05 + dread * 0.24;
    this.humGain.gain.setTargetAtTime(vol, t, 0.4);
    const detune = dread * 65; // cents — the hum goes subtly wrong
    for (const osc of this.humOscs) osc.detune.setTargetAtTime(detune, t, 0.6);
    this.humNoiseGain.gain.setTargetAtTime(0.02 + dread * 0.06, t, 0.5);
  }

  // The payoff of the ending is silence.
  killHum(fadeSeconds = 3) {
    if (!this.ctx) return;
    this.humMuted = true;
    this.humGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, fadeSeconds / 3);
  }

  // Damp-carpet footstep: a short filtered noise thud.
  footstep(dread = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this._noiseSource();
    src.loop = false;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260 + Math.random() * 120;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 + Math.random() * 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14 + dread * 0.12);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.3);
  }

  // Revelation stinger: a soft, resolving two-note chime.
  stinger() {
    this._tone(392, 0.9, 0.12, 'sine', 0);
    this._tone(523.25, 1.6, 0.12, 'sine', 0.35);
  }

  // Governance alarm: harsh descending buzzer.
  alarm() {
    this._tone(880, 0.5, 0.18, 'square', 0);
    this._tone(622, 0.6, 0.18, 'square', 0.28);
  }

  // Small positive tick for collecting solution elements.
  pickup() {
    this._tone(660, 0.25, 0.09, 'triangle', 0);
  }

  // Dull negative thump for wrong actions.
  deny() {
    this._tone(110, 0.4, 0.2, 'sawtooth', 0);
  }

  // The hum goes wrong for half a second — the first-encounter "noticing" beat.
  humStutter() {
    if (!this.ctx || this.humMuted || !this.humGain) return;
    const t = this.ctx.currentTime;
    const g = this.humGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.exponentialRampToValueAtTime(0.0001, t + 0.08);
    g.setValueAtTime(0.0001, t + 0.32);
    g.exponentialRampToValueAtTime(Math.max(0.05, g.value), t + 0.55);
    for (const osc of this.humOscs) {
      osc.detune.cancelScheduledValues(t);
      osc.detune.setValueAtTime(osc.detune.value, t);
      osc.detune.linearRampToValueAtTime(-320, t + 0.2);
      osc.detune.linearRampToValueAtTime(0, t + 0.55);
    }
  }

  // Digital stutter for the Competitor's glitch burst: 3 harsh, tiny blips.
  glitchCue() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) {
      this._tone(900 + Math.random() * 900, 0.045, 0.09, 'square', i * 0.05);
    }
  }

  // ---- pressure entity signatures ----

  // Competitor: fast skittering steps + a static hiss. Identifiable by ear
  // before it is seen.
  competitorCue() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this._noiseSource();
    src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.5);
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.7);
  }

  competitorSteps() {
    // two rapid ticks — running footsteps, too fast to be a person
    for (const d of [0, 0.09]) this._tone(210 + Math.random() * 60, 0.07, 0.12, 'square', d);
  }

  competitorHit() {
    this._tone(70, 0.5, 0.28, 'sawtooth', 0);
    this._tone(1400, 0.15, 0.1, 'square', 0.02);
  }

  // Board of Directors: a low, slow murmur — several voices, no words.
  boardCue() {
    if (!this.ctx) return;
    for (const [f, delay] of [[87, 0], [92, 0.3], [110, 0.55], [82, 0.9]]) {
      this._tone(f + Math.random() * 6, 1.6, 0.05, 'sine', delay);
    }
  }

  // Legacy System: a deep mechanical groan, descending.
  legacyCue() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 1.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.connect(lp).connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 2);
  }

  // ---- the garden: what the silence resolves into ----
  startGarden() {
    if (!this.ctx || this.gardenStarted) return;
    this.gardenStarted = true;
    const ctx = this.ctx;

    // light wind: slow-breathing filtered noise
    const wind = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    wind.connect(lp).connect(windGain).connect(this.master);
    wind.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(windGain.gain);
    lfo.start();

    // birdsong: sparse random chirps
    const chirp = () => {
      if (!this.gardenStarted) return;
      const t = ctx.currentTime;
      const f0 = 2200 + Math.random() * 1800;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const ts = t + i * 0.12;
        osc.frequency.setValueAtTime(f0 * (1 + Math.random() * 0.2), ts);
        osc.frequency.exponentialRampToValueAtTime(f0 * (0.7 + Math.random() * 0.2), ts + 0.09);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n * 0.12 + 0.1);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + n * 0.12 + 0.2);
      setTimeout(chirp, 900 + Math.random() * 2600);
    };
    setTimeout(chirp, 600);
  }

  _tone(freq, dur, level, type, delay) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }
}
