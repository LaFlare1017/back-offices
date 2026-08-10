import * as THREE from 'three';
import { PALETTE, WALL_HEIGHT } from './constants.js';
import { wallpaperTexture, carpetTexture, carpetRoughnessTexture, ceilingTexture, signTexture } from './textures.js';

// Modular office kit. Every room is assembled from these repeating pieces,
// which is what gives the space its liminal sameness. Each helper adds meshes
// to a room context and, where solid, a static Rapier collider.

let shared = null;

export function sharedMaterials() {
  if (shared) return shared;
  shared = {
    wall: new THREE.MeshStandardMaterial({ map: wallpaperTexture(), roughness: 0.92 }),
    carpet: new THREE.MeshStandardMaterial({
      map: carpetTexture(),
      roughnessMap: carpetRoughnessTexture(),
      roughness: 1.0,
      metalness: 0.04,
    }),
    ceiling: new THREE.MeshStandardMaterial({ map: ceilingTexture(), roughness: 0.95 }),
    surface: new THREE.MeshStandardMaterial({ color: PALETTE.surface, roughness: 0.85 }),
    surfaceDark: new THREE.MeshStandardMaterial({ color: 0x3a3628, roughness: 0.9 }),
    glowTube: new THREE.MeshStandardMaterial({
      color: PALETTE.glow,
      emissive: PALETTE.glow,
      emissiveIntensity: 1.6,
    }),
    hope: new THREE.MeshStandardMaterial({
      color: PALETTE.hope,
      emissive: PALETTE.hope,
      emissiveIntensity: 1.2,
    }),
    risk: new THREE.MeshStandardMaterial({
      color: PALETTE.risk,
      emissive: PALETTE.risk,
      emissiveIntensity: 0.9,
    }),
    figure: new THREE.MeshStandardMaterial({ color: 0x211d10, roughness: 1.0 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xb9c4b6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
    }),
  };
  return shared;
}

export function createRoomContext({ scene, world, rapier, origin }) {
  const group = new THREE.Group();
  group.position.set(origin.x, 0, origin.z);
  scene.add(group);

  const ctx = {
    group,
    world,
    rapier,
    origin: new THREE.Vector3(origin.x, 0, origin.z),
    colliders: [],
    flickerLights: [], // { light, mesh, baseIntensity }
    mats: sharedMaterials(),

    // Solid, invisible physics box in room-local coordinates.
    addCollider(x, y, z, hx, hy, hz) {
      const desc = rapier.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(origin.x + x, y, origin.z + z);
      ctx.colliders.push(world.createCollider(desc));
    },

    removeCollider(collider) {
      const i = ctx.colliders.indexOf(collider);
      if (i >= 0) ctx.colliders.splice(i, 1);
      world.removeCollider(collider, true);
    },

    setActive(active) {
      group.visible = active;
      // Parked colliders would need per-collider disable; rooms are spatially
      // isolated (300u apart) so leaving them enabled is harmless.
    },
  };
  return ctx;
}

// ---- structural pieces ----

export function addFloor(ctx, w, d, { x = 0, z = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ctx.mats.carpet);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0, z);
  ctx.group.add(m);
  ctx.addCollider(x, -0.5, z, w / 2, 0.5, d / 2);
  return m;
}

export function addCeiling(ctx, w, d, { x = 0, z = 0, h = WALL_HEIGHT } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ctx.mats.ceiling);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, h, z);
  ctx.group.add(m);
  return m;
}

// A wall segment. dir 'x' runs along the x axis, 'z' along z.
export function addWall(ctx, { x = 0, z = 0, len = 4, dir = 'x', h = WALL_HEIGHT, thickness = 0.24, material = null, solid = true }) {
  const mat = material ?? ctx.mats.wall;
  const sx = dir === 'x' ? len : thickness;
  const sz = dir === 'x' ? thickness : len;
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), mat);
  m.position.set(x, h / 2, z);
  ctx.group.add(m);
  if (solid) ctx.addCollider(x, h / 2, z, sx / 2, h / 2, sz / 2);
  return m;
}

// Perimeter walls for a rectangular area centered on (cx, cz), with optional
// gaps: [{ side: 'n'|'s'|'e'|'w', at: offsetAlongWall, width }]
export function addPerimeter(ctx, w, d, { cx = 0, cz = 0, gaps = [] } = {}) {
  const sides = {
    n: { axis: 'x', fixed: cz - d / 2, len: w, center: cx },
    s: { axis: 'x', fixed: cz + d / 2, len: w, center: cx },
    w: { axis: 'z', fixed: cx - w / 2, len: d, center: cz },
    e: { axis: 'z', fixed: cx + w / 2, len: d, center: cz },
  };

  for (const [name, s] of Object.entries(sides)) {
    const sideGaps = gaps
      .filter((g) => g.side === name)
      .map((g) => ({ start: s.center + g.at - g.width / 2, end: s.center + g.at + g.width / 2 }))
      .sort((a, b) => a.start - b.start);

    let cursor = s.center - s.len / 2;
    const endEdge = s.center + s.len / 2;
    for (const g of [...sideGaps, { start: endEdge, end: endEdge }]) {
      const segLen = g.start - cursor;
      if (segLen > 0.05) {
        const mid = cursor + segLen / 2;
        if (s.axis === 'x') addWall(ctx, { x: mid, z: s.fixed, len: segLen, dir: 'x' });
        else addWall(ctx, { x: s.fixed, z: mid, len: segLen, dir: 'z' });
      }
      cursor = g.end;
    }
  }
}

// Buzzing fluorescent fixture: emissive panel + point light, registered for
// dread-driven flicker.
export function addFluorescent(ctx, x, z, { h = WALL_HEIGHT - 0.05, intensity = 12, distance = 22 } = {}) {
  const tube = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.45), ctx.mats.glowTube.clone());
  tube.position.set(x, h, z);
  ctx.group.add(tube);

  const light = new THREE.PointLight(PALETTE.glow, intensity, distance, 1.5);
  light.position.set(x, h - 0.3, z);
  ctx.group.add(light);

  ctx.flickerLights.push({ light, mesh: tube, baseIntensity: intensity, seed: Math.random() * 100 });
  return { tube, light };
}

// ---- props ----

export function addFilingCabinet(ctx, x, z, { rotY = 0, openDrawer = false } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.7), ctx.mats.surface);
  body.position.y = 0.75;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), ctx.mats.surfaceDark);
    handle.position.set(0, 0.3 + i * 0.36, 0.36);
    g.add(handle);
  }
  if (openDrawer) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), ctx.mats.surfaceDark);
    drawer.position.set(0, 1.15, 0.5);
    g.add(drawer);
    const papers = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.05, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd8d0b0, roughness: 1 })
    );
    papers.position.set(0, 1.32, 0.5);
    g.add(papers);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.group.add(g);
  ctx.addCollider(x, 0.75, z, 0.35, 0.75, 0.42);
  return g;
}

export function addCubicle(ctx, x, z, { rotY = 0 } = {}) {
  const g = new THREE.Group();
  const panelMat = ctx.mats.surface;
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.06), panelMat);
  p1.position.set(0, 0.7, -0.9);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 1.8), panelMat);
  p2.position.set(-0.9, 0.7, 0);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.7), ctx.mats.surfaceDark);
  desk.position.set(0, 0.74, -0.5);
  g.add(p1, p2, desk);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.group.add(g);
  ctx.addCollider(x, 0.7, z, 0.95, 0.7, 0.95);
  return g;
}

// Monitor on a stand; screenTexture is a CanvasTexture (from terminalScreen).
export function addTerminal(ctx, x, z, screenTexture, { rotY = 0 } = {}) {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, 0.5), ctx.mats.surfaceDark);
  stand.position.y = 0.52;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.65), screenMat);
  screen.position.set(0, 1.45, 0.02);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.08), ctx.mats.surface);
  frame.position.set(0, 1.45, -0.04);
  g.add(stand, frame, screen);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.group.add(g);
  ctx.addCollider(x, 0.7, z, 0.35, 0.7, 0.3);
  return { group: g, screen };
}

export function addSign(ctx, x, z, text, { rotY = 0, y = 2.35, sub = '', bg, fg, w = 1.5 } = {}) {
  const tex = signTexture(text, { sub, ...(bg && { bg }), ...(fg && { fg }) });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: false })
  );
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  ctx.group.add(m);
  return m;
}

// The teal exit: a glowing doorway that only appears when a room is solved.
export function addExitDoor(ctx, x, z, { rotY = 0 } = {}) {
  const g = new THREE.Group();
  const frameMat = ctx.mats.hope.clone();
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), frameMat);
  left.position.set(-0.75, 1.3, 0);
  const right = left.clone();
  right.position.x = 0.75;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 0.12), frameMat);
  top.position.set(0, 2.6, 0);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.5),
    new THREE.MeshBasicMaterial({
      color: PALETTE.hope,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  glowPlane.position.set(0, 1.28, 0);
  const glow = new THREE.PointLight(PALETTE.hope, 5, 10, 1.6);
  glow.position.set(0, 1.6, 0.5);
  // soft volumetric-style shaft falling through the doorway — hope should
  // feel magnetic
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.25, 3.4, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: PALETTE.hope,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  shaft.position.set(0, 1.7, 0.3);
  g.add(left, right, top, glowPlane, glow, shaft);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.visible = false;
  ctx.group.add(g);
  return g;
}

// Static human silhouette for Room 4 — the physical form of resistance to change.
export function addFigure(ctx, x, z, { rotY = 0, seated = true } = {}) {
  const g = new THREE.Group();
  const mat = ctx.mats.figure;
  const torsoH = seated ? 0.55 : 0.75;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, torsoH, 4, 8), mat);
  torso.position.y = seated ? 0.95 : 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), mat);
  head.position.y = seated ? 1.45 : 1.72;
  g.add(torso, head);
  if (seated) {
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.5), mat);
    legs.position.set(0, 0.62, 0.18);
    g.add(legs);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), ctx.mats.surfaceDark);
    chair.position.y = 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), ctx.mats.surfaceDark);
    back.position.set(0, 0.82, -0.24);
    g.add(chair, back);
  } else {
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.6, 4, 8), mat);
    legs.position.y = 0.45;
    g.add(legs);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.group.add(g);
  return g;
}

export function addServerRack(ctx, x, z, { rotY = 0, alert = false } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.1, 0.9), ctx.mats.surfaceDark);
  body.position.y = 1.05;
  g.add(body);
  for (let i = 0; i < 6; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.02),
      (alert && i % 2 === 0 ? ctx.mats.risk : ctx.mats.hope).clone()
    );
    led.position.set(-0.25 + (i % 3) * 0.25, 0.5 + Math.floor(i / 3) * 0.9, 0.46);
    g.add(led);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  ctx.group.add(g);
  ctx.addCollider(x, 1.05, z, 0.45, 1.05, 0.5);
  return g;
}

// Simple interior door (solid until opened). Returns mesh + its collider for removal.
export function addDoor(ctx, x, z, { rotY = 0, color = PALETTE.surface } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.12), mat);
  m.position.set(x, 1.3, z);
  m.rotation.y = rotY;
  ctx.group.add(m);
  const cos = Math.abs(Math.cos(rotY));
  const hx = cos > 0.5 ? 0.75 : 0.06;
  const hz = cos > 0.5 ? 0.06 : 0.75;
  const desc = ctx.rapier.ColliderDesc.cuboid(hx, 1.3, hz)
    .setTranslation(ctx.origin.x + x, 1.3, ctx.origin.z + z);
  const collider = ctx.world.createCollider(desc);
  ctx.colliders.push(collider);
  return { mesh: m, collider, material: mat };
}
