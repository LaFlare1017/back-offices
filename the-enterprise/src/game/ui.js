// Diegetic-adjacent UI: revelation cards, objectives, prompts, narration.
// All copy is data-driven from REVELATIONS / room configs (the web analogue of
// the handoff doc's DT_Revelations data table).

export const REVELATIONS = {
  room1: {
    heading: "Your data wasn't missing.\nIt was inconsistent, stale,\nand never built to flow.",
    sub: 'Room 1 of 5: Data',
  },
  room2: {
    heading: 'Everyone did it their own way.\nSo nothing fit together, and you went in circles.\nOne shared way of working, and the loop breaks.',
    sub: 'Room 2 of 5: Workflow',
  },
  room3: {
    heading: 'With no rules for who can open what,\nevery door was a risk.\nWho gets in, who’s accountable, who’s in control —\nthat kept you safe. Not speed.',
    sub: 'Room 3 of 5: Governance',
  },
  room4: {
    heading: 'The tools were never the problem.\nNo one told them what changed.\nNo one taught them how.\nCommunicate. Train. Then they’ll move.',
    sub: 'Room 4 of 5: Readiness',
  },
  room5: {
    heading: 'Every team was right about something.\nNone of them was right about everything.\nGetting aligned isn’t meeting halfway —\nit’s everyone pulling the same direction at once.',
    sub: 'Room 5 of 5: Alignment',
  },
  final: {
    heading: 'You made it out.\nNot by running.\nBy transforming.',
    sub: 'Back Offices',
  },
};

export const FINAL_NARRATION = [
  'You thought something was chasing you.',
  'Nothing ever was.',
  'Messy data. Tangled processes. No clear rules.\nPeople left in the dark. Teams pulling apart.',
  'Five cracks in one company. One thing to fix.',
  'The tools were never the hard part.\nThe way the work was built was.',
  'The answer was never out there.\nIt was in here — and now it’s yours.',
];

export class UI {
  constructor() {
    this.card = document.getElementById('revelation-card');
    this.cardHeading = document.getElementById('revelation-heading');
    this.cardSub = document.getElementById('revelation-sub');
    this.prompt = document.getElementById('interact-prompt');
    this.objective = document.getElementById('objective');
    this.narration = document.getElementById('narration');
    this.fade = document.getElementById('fade-layer');
    this.notification = document.getElementById('notification');
    this.notificationText = document.getElementById('notification-text');
    this._notificationUntil = 0;
    this._cardResolve = null;

    this.card.addEventListener('click', () => {
      if (this._cardResolve) {
        this.card.classList.remove('visible');
        const resolve = this._cardResolve;
        this._cardResolve = null;
        setTimeout(resolve, 400);
      }
    });
  }

  // Shows a revelation card; resolves when the player clicks through.
  showRevelation(key) {
    const rev = REVELATIONS[key];
    this.cardHeading.textContent = rev.heading;
    this.cardSub.textContent = rev.sub;
    document.exitPointerLock?.();
    this.card.classList.add('visible');
    return new Promise((resolve) => { this._cardResolve = resolve; });
  }

  // A brief corporate alert. Returns false (suppressed) if one is already up —
  // unwelcome updates arriving, not a chat log. Held long enough for a full
  // read of the longest line at arm's length on a phone.
  showNotification(text, holdMs = 5200) {
    const now = performance.now();
    if (now < this._notificationUntil) return false;
    this._notificationUntil = now + holdMs + 400;
    this.notificationText.textContent = text;
    this.notification.classList.add('visible');
    setTimeout(() => this.notification.classList.remove('visible'), holdMs);
    return true;
  }

  setPrompt(text, { risk = false } = {}) {
    if (!text) {
      this.prompt.classList.remove('visible');
      return;
    }
    // On touch the prompt IS the button — "E — " would be a lie there.
    if (document.body.classList.contains('touch')) text = text.replace(/^E — /, '');
    this.prompt.textContent = text;
    this.prompt.classList.toggle('risk', risk);
    this.prompt.classList.add('visible');
  }

  setObjective(text) {
    if (!text) {
      this.objective.classList.remove('visible');
      return;
    }
    this.objective.textContent = text;
    this.objective.classList.add('visible');
  }

  async showNarrationLine(text, holdMs = 3400) {
    this.narration.textContent = text;
    this.narration.classList.add('visible');
    await wait(holdMs);
    this.narration.classList.remove('visible');
    await wait(900);
  }

  async fadeOut(light = false, ms = 1000) {
    this.fade.classList.toggle('light', light);
    this.fade.classList.add('dark');
    await wait(ms);
  }

  async fadeIn(ms = 1000) {
    this.fade.classList.remove('dark');
    await wait(ms);
  }
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
