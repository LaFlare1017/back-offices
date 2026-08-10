import * as THREE from 'three';
import { PALETTE_CSS } from './constants.js';

// All textures are generated procedurally on canvas so the game ships with zero
// binary assets and the palette stays exact.

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Mono-yellow wallpaper with the faint vertical arrow/stripe motif from the
// original Backrooms photo.
export function wallpaperTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = PALETTE_CSS.wall;
  ctx.fillRect(0, 0, size, size);

  // subtle vertical stripes
  for (let x = 0; x < size; x += 32) {
    ctx.fillStyle = x % 64 === 0 ? 'rgba(201,187,99,0.28)' : 'rgba(110,95,46,0.10)';
    ctx.fillRect(x, 0, 14, size);
  }

  // faint chevron motif on the light stripes
  ctx.strokeStyle = 'rgba(110,95,46,0.22)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < size; x += 64) {
    for (let y = 16; y < size; y += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 10);
      ctx.lineTo(x + 7, y);
      ctx.lineTo(x + 12, y + 10);
      ctx.stroke();
    }
  }

  // grime and water stains
  for (let i = 0; i < 60; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 8 + Math.random() * 40;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, 'rgba(74,68,51,0.08)');
    g.addColorStop(1, 'rgba(74,68,51,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }

  return toTexture(c, 2, 1);
}

// Damp, patterned carpet — the "moist carpet" signature.
export function carpetTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = PALETTE_CSS.carpet;
  ctx.fillRect(0, 0, size, size);

  // dense fiber noise
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = Math.random();
    ctx.fillStyle = v > 0.5
      ? `rgba(184,169,78,${0.05 + v * 0.06})`
      : `rgba(42,36,16,${0.05 + v * 0.09})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }

  // faint square carpet-tile pattern
  ctx.strokeStyle = 'rgba(42,36,16,0.25)';
  ctx.lineWidth = 2;
  for (let p = 0; p <= size; p += 128) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  // damp blotches
  for (let i = 0; i < 26; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 20 + Math.random() * 70;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, 'rgba(42,36,16,0.20)');
    g.addColorStop(1, 'rgba(42,36,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }

  return toTexture(c, 10, 10);
}

// Roughness map for the carpet: damp blotches are smoother (lower value), so
// they catch fluorescent sheen — the "moist carpet" signature.
export function carpetRoughnessTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e8e8e8'; // mostly rough
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 30; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 24 + Math.random() * 80;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, 'rgba(70,70,70,0.85)'); // wet center: low roughness
    g.addColorStop(0.7, 'rgba(120,120,120,0.4)');
    g.addColorStop(1, 'rgba(232,232,232,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

// Drop-ceiling tiles with grid.
export function ceilingTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#8f855c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(42,36,16,0.10)' : 'rgba(252,246,216,0.05)';
    ctx.fillRect(x, y, 2, 2);
  }

  // tile grid
  ctx.strokeStyle = 'rgba(42,36,16,0.55)';
  ctx.lineWidth = 4;
  for (let p = 0; p <= size; p += 256) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  return toTexture(c, 12, 12);
}

// Terminal screen texture: renders lines of mono text; used by Room 1 records
// and Room 3 logs. Re-render by calling the returned update() with new lines.
export function terminalScreen({ width = 512, height = 384 } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  function update(lines, { accent = PALETTE_CSS.hope, title = '' } = {}) {
    ctx.fillStyle = '#1d1a0e';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(252,246,216,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillStyle = accent;
    if (title) ctx.fillText(title, 24, 40);

    ctx.font = '16px "IBM Plex Mono", monospace';
    lines.forEach((line, i) => {
      ctx.fillStyle = line.startsWith('>') ? accent : 'rgba(252,246,216,0.82)';
      ctx.fillText(line, 24, 76 + i * 26);
    });
    tex.needsUpdate = true;
  }

  return { texture: tex, update };
}

// Simple sign texture (Room 2 signage, door labels, exit signs).
export function signTexture(text, { bg = PALETTE_CSS.surface, fg = PALETTE_CSS.glow, sub = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 192;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(252,246,216,0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);

  ctx.fillStyle = fg;
  ctx.font = '700 44px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, c.width / 2, sub ? 92 : 110);

  if (sub) {
    ctx.font = '22px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(252,246,216,0.65)';
    ctx.fillText(sub, c.width / 2, 140);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
