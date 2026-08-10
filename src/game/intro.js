import { PALETTE_CSS } from './constants.js';
import {
  addFloor, addCeiling, addPerimeter, addFluorescent,
  addWall, addSign, addTerminal, addCubicle, addFilingCabinet,
} from './kit.js';
import { terminalScreen } from './textures.js';

// The cold open — a quiet, too-normal office, before the Backrooms.
// The player has just been handed the company's AI transformation with no
// roadmap. They go looking for where to start, wander into the back offices,
// and the space begins to curdle. This is the literal bridge into the
// metaphor: you got lost while looking for where to begin.
//
// Built as its own context OFF the room grid (origin x = -300) so it never
// shifts the indexed room sequence that later systems key on — the Rooms 1–2
// notification scope (`currentIndex <= 1`), checkpoints, and hint targets all
// assume Room 1 is index 0. The intro is not a registered room; main.js runs
// it once, on a fresh start, before entering Room 1.

const ROOM_D = 12;
const HALL_LEN = 16;
const CROSS_Z = -19; // local z at which the player crosses into the Backrooms

export class Intro {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.active = false;
    this.phase = 'desk'; // desk -> searching -> crossing -> done
    this._resolve = null;
    this.spawn = { x: 0, z: 2.5, yaw: Math.PI }; // facing +z, toward the desk

    const ROOM_W = 12;

    // The office room, then a corridor running north (−z) to the RECORDS door.
    addFloor(ctx, ROOM_W, ROOM_D);
    addCeiling(ctx, ROOM_W, ROOM_D);
    addPerimeter(ctx, ROOM_W, ROOM_D, { gaps: [{ side: 'n', at: 0, width: 4 }] });

    const hallZ = -ROOM_D / 2 - HALL_LEN / 2;
    addFloor(ctx, 4, HALL_LEN, { z: hallZ });
    addCeiling(ctx, 4, HALL_LEN, { z: hallZ });
    addWall(ctx, { x: -2, z: hallZ, len: HALL_LEN, dir: 'z' });
    addWall(ctx, { x: 2, z: hallZ, len: HALL_LEN, dir: 'z' });

    // Calmer, fuller light than the Backrooms proper — "before", not "wrong".
    addFluorescent(ctx, 0, 0, { intensity: 14 });
    addFluorescent(ctx, 0, -11, { intensity: 12 });
    addFluorescent(ctx, 0, -18, { intensity: 10 });

    // The workstation: a monitor carrying the assignment, on a desk.
    const screen = terminalScreen();
    screen.update([
      'AI TRANSFORMATION',
      'owner needed',
      '',
      'you’ve been asked to lead',
      'the company’s AI transformation.',
      '',
      'no roadmap. no starting point.',
      'just you and the assignment.',
      '',
      '> press E to acknowledge',
    ], { title: 'MEETING INVITE', accent: PALETTE_CSS.hope });
    this.screen = screen;
    const monitor = addTerminal(ctx, 0, 4.2, screen.texture, { rotY: Math.PI });
    addCubicle(ctx, 0, 5.4);
    addFilingCabinet(ctx, -2.6, 5.0);
    addFilingCabinet(ctx, 2.6, 5.0, { rotY: Math.PI });

    // Records: the mundane door that invites exploration.
    addSign(ctx, 0, -(ROOM_D / 2 + HALL_LEN) + 0.6, 'RECORDS', {
      sub: 'authorized personnel', y: 2.35, w: 1.7, bg: '#3a3628', fg: '#C9BB63',
    });
    // A couple of cabinets down the hall, foreshadowing the Records Floor.
    addFilingCabinet(ctx, -1.5, -9, { rotY: Math.PI / 2 });
    addFilingCabinet(ctx, 1.5, -13, { rotY: -Math.PI / 2 });

    game.interaction.register(monitor.group, {
      prompt: 'E — read the message',
      onInteract: () => {
        if (this.phase !== 'desk') return;
        this.phase = 'searching';
        game.audio.pickup();
        // The blank planning document: no idea where to begin.
        screen.update([
          '',
          '  UNTITLED PLAN',
          '  ───────────────',
          '',
          '  ▉',
          '',
          '  where do I even start?',
        ], { title: 'PLANNING', accent: PALETTE_CSS.risk });
        game.interaction.setPrompt(monitor.group, 'the cursor blinks');
        game.ui.setObjective('AI TRANSFORMATION — OWNER: YOU\nno one can tell you where to begin.\ngo looking. try Records, down the hall.');
      },
    });
  }

  // Activates the intro, drops the player in, returns a promise that resolves
  // once they cross into the Backrooms and the screen has faded.
  start() {
    this.active = true;
    this.ctx.setActive(true);
    const g = this.game;
    g.scene.fog.density = 0.014;     // thin, almost-normal air
    g.audio.humMuted = true;         // a too-quiet office: the hum hasn't begun
    g.dread.set(0.06);
    const O = this.ctx.origin;
    g.player.teleport(O.x + this.spawn.x, O.z + this.spawn.z, this.spawn.yaw);
    g.ui.setObjective('AI TRANSFORMATION — OWNER: YOU\nyou’ve been asked to lead it. no roadmap, no starting point.\nlook for where to begin.');
    return new Promise((res) => { this._resolve = res; });
  }

  async _cross() {
    this.phase = 'crossing';
    const g = this.game;
    // The tonal shift: the hum begins, the air thickens, the space feels wrong.
    g.audio.humMuted = false;
    g.dread.set(0.5);
    g.scene.fog.density = 0.03;
    g.ui.setObjective(null);
    // One quiet seed of unease — never naming the twist.
    await g.ui.showNarrationLine('Maybe the answer isn’t out there.', 3800);
    await g.ui.fadeOut(false, 1200);
    this.active = false;
    this.phase = 'done';
    this.ctx.setActive(false);
    g.scene.fog.density = 0.02; // hand Room 1 its normal murk
    this._resolve?.();
  }

  update() {
    if (!this.active || this.phase === 'crossing') return;
    const localZ = this.game.player.position.z - this.ctx.origin.z;
    if (localZ < CROSS_Z) this._cross();
  }
}
