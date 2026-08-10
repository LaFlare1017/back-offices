import * as THREE from 'three';

// Raycast interaction: rooms register interactable meshes with a prompt and a
// handler; the player presses E while looking at one within reach.
export class InteractionSystem {
  constructor(camera, ui) {
    this.camera = camera;
    this.ui = ui;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.0;
    this.items = new Map(); // mesh -> { prompt, onInteract, risk, enabled }
    this.hovered = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') this.trigger();
    });
  }

  // Fire the hovered interactable — shared by the E key and the touch button.
  trigger() {
    if (!this.hovered) return;
    const item = this.items.get(this.hovered);
    if (item?.enabled !== false) item?.onInteract(this.hovered);
  }

  register(mesh, { prompt, onInteract, risk = false, enabled = true }) {
    this.items.set(mesh, { prompt, onInteract, risk, enabled });
  }

  setEnabled(mesh, enabled) {
    const item = this.items.get(mesh);
    if (item) item.enabled = enabled;
  }

  setPrompt(mesh, prompt) {
    const item = this.items.get(mesh);
    if (item) item.prompt = prompt;
  }

  unregister(mesh) {
    this.items.delete(mesh);
    if (this.hovered === mesh) this.hovered = null;
  }

  clear() {
    this.items.clear();
    this.hovered = null;
    this.ui.setPrompt(null);
  }

  update() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const meshes = [...this.items.keys()].filter((m) => {
      let v = m.visible, p = m.parent;
      while (v && p) { v = p.visible; p = p.parent; }
      return v;
    });
    const hits = this.raycaster.intersectObjects(meshes, true);

    let found = null;
    if (hits.length) {
      // Walk up from the hit to the registered mesh (props are groups).
      let obj = hits[0].object;
      while (obj && !this.items.has(obj)) obj = obj.parent;
      found = obj ?? null;
    }

    if (found !== this.hovered) {
      this.hovered = found;
      const item = found ? this.items.get(found) : null;
      this.ui.setPrompt(item && item.enabled !== false ? item.prompt : null, { risk: item?.risk });
    }
  }
}
