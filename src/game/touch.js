// Touch controls: thumb-anchored virtual joystick on the left, drag-look on
// the right, and the interact prompt doubles as the tap target. Only
// instantiated on coarse-pointer devices, so desktop is untouched.

const JOY_RADIUS = 52;       // px — max nub travel
const LOOK_GAIN = 2.6;       // touch px -> mouse-delta equivalent, phone-tuned
const DEAD_ZONE = 0.12;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.move = { x: 0, y: 0 }; // x: strafe right+, y: forward+
    this.joyId = null;
    this.lookId = null;
    this.joyOrigin = { x: 0, y: 0 };
    this.lastLook = { x: 0, y: 0 };

    document.body.classList.add('touch');

    // Joystick DOM — hidden until a thumb lands, anchored where it lands.
    this.base = document.createElement('div');
    this.base.id = 'joy-base';
    this.nub = document.createElement('div');
    this.nub.id = 'joy-nub';
    this.base.appendChild(this.nub);
    document.body.appendChild(this.base);

    const canvas = game.canvas;
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      if (this.joyId === null && e.clientX < window.innerWidth * 0.45) {
        this.joyId = e.pointerId;
        this.joyOrigin = { x: e.clientX, y: e.clientY };
        this.base.style.left = `${e.clientX}px`;
        this.base.style.top = `${e.clientY}px`;
        this.base.classList.add('active');
        this._setNub(0, 0);
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lastLook = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) {
        let dx = e.clientX - this.joyOrigin.x;
        let dy = e.clientY - this.joyOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
        this._setNub(dx, dy);
        const nx = dx / JOY_RADIUS, ny = dy / JOY_RADIUS;
        this.move.x = Math.abs(nx) > DEAD_ZONE ? nx : 0;
        this.move.y = Math.abs(ny) > DEAD_ZONE ? -ny : 0; // screen-up = forward
      } else if (e.pointerId === this.lookId) {
        this.game.player.mouseDX += (e.clientX - this.lastLook.x) * LOOK_GAIN;
        this.game.player.mouseDY += (e.clientY - this.lastLook.y) * LOOK_GAIN;
        this.lastLook = { x: e.clientX, y: e.clientY };
      }
    });

    const release = (e) => {
      if (e.pointerId === this.joyId) {
        this.joyId = null;
        this.move.x = 0;
        this.move.y = 0;
        this.base.classList.remove('active');
      } else if (e.pointerId === this.lookId) {
        this.lookId = null;
      }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    // The interact prompt is the interact button on touch.
    const prompt = document.getElementById('interact-prompt');
    prompt.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.interaction.trigger();
    });
  }

  _setNub(dx, dy) {
    this.nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}

// Coarse pointer = phones/tablets. `?touch=1` forces it for desktop testing.
export function isTouchDevice() {
  return new URLSearchParams(location.search).has('touch')
    || window.matchMedia('(pointer: coarse)').matches;
}
