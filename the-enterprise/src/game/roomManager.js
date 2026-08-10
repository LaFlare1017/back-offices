import { ROOM_SPACING, SAVE_KEY } from './constants.js';

// RoomManager — owns the room sequence, activation, checkpointing, and the
// solve -> stinger -> revelation card -> teal exit beat shared by every room.
export class RoomManager {
  constructor({ game }) {
    this.game = game;
    this.rooms = []; // { key, title, build(ctx, api), enter(), dispose? }
    this.contexts = [];
    this.instances = [];
    this.currentIndex = -1;
  }

  register(roomDef) {
    this.rooms.push(roomDef);
  }

  originFor(index) {
    return { x: index * ROOM_SPACING, z: 0 };
  }

  get current() { return this.instances[this.currentIndex]; }
  get currentContext() { return this.contexts[this.currentIndex]; }

  buildAll(createContext) {
    this.rooms.forEach((def, i) => {
      const ctx = createContext(this.originFor(i));
      ctx.setActive(false);
      this.contexts.push(ctx);
      this.instances.push(def.build(ctx, this.game));
    });
  }

  async enterRoom(index, { fade = true } = {}) {
    if (fade) await this.game.ui.fadeOut();

    if (this.currentIndex >= 0) {
      this.contexts[this.currentIndex].setActive(false);
      this.instances[this.currentIndex]?.exit?.();
    }
    this.game.interaction.hovered = null;
    this.game.ui.setPrompt(null);

    this.currentIndex = index;
    const ctx = this.contexts[index];
    ctx.setActive(true);

    const inst = this.instances[index];
    const spawn = inst.spawn ?? { x: 0, z: 0, yaw: 0 };
    this.game.player.teleport(ctx.origin.x + spawn.x, ctx.origin.z + spawn.z, spawn.yaw ?? 0);

    localStorage.setItem(SAVE_KEY, String(index));
    this.game.pressure?.onRoomEnter(ctx, inst.bounds);
    this.game.hints?.onRoomEnter();
    inst.enter?.();

    if (fade) await this.game.ui.fadeIn();
  }

  // The shared solve beat: dread collapses, stinger, card, then the exit opens.
  async solveRoom(revelationKey, exitDoor) {
    const g = this.game;
    g.dread.set(0.05);
    g.audio.stinger();
    await g.ui.showRevelation(revelationKey);
    if (exitDoor) exitDoor.visible = true;
    g.canvas.requestPointerLock?.();
  }

  async advance() {
    if (this.currentIndex + 1 < this.rooms.length) {
      this.game.dread.set(0.3); // a new room, a new unease
      await this.enterRoom(this.currentIndex + 1);
    }
  }

  savedIndex() {
    const raw = localStorage.getItem(SAVE_KEY);
    const n = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < this.rooms.length ? n : 0;
  }
}
