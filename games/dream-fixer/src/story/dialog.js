import { line, t } from "../i18n/index.js";

// ── Radio chatter ────────────────────────────────────────────────────────
// A small box in the corner: who is talking and what they say, typed out
// with beep-talk. Lines queue up and never stop the game.

const ICONS = {
  margo: '<svg viewBox="0 0 32 32"><rect x="5" y="11" width="22" height="15" rx="3"/><circle cx="12" cy="18.5" r="4" fill="#1b2436"/><rect x="18" y="15" width="6" height="2" rx="1" fill="#1b2436"/><rect x="18" y="20" width="6" height="2" rx="1" fill="#1b2436"/><path d="M9 11 L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  csavar: '<svg viewBox="0 0 32 32"><circle cx="16" cy="18" r="11"/><circle cx="16" cy="18" r="6" fill="#1b2436"/><circle cx="16" cy="18" r="3.5" fill="#7ff5e0"/><path d="M16 7 V2 M10 3 H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

export class Dialog {
  constructor(root, audio) {
    this.audio = audio;
    const el = this.el = document.createElement("div");
    el.className = "dialog";
    el.innerHTML = `<div class="who"><i></i><b></b></div><div class="text"></div>`;
    root.appendChild(el);
    this.icon = el.querySelector(".who i");
    this.name = el.querySelector(".who b");
    this.textEl = el.querySelector(".text");
    this.queue = [];
    this.cur = null;
    this.said = new Set();
    this.last = null;
    this.onLine = null;           // called with each line's id as it starts
  }

  // Queue a story line by id (once per visit unless `again`).
  say(id, again = false) {
    if (!again && this.said.has(id)) return;
    this.said.add(id);
    this.queue.push(id);
  }
  reset() { this.queue.length = 0; this.cur = null; this.said.clear(); this.el.classList.remove("on"); this.voice?.stop(); }
  get busy() { return !!this.cur || this.queue.length > 0; }
  hide(on) { this.el.classList.toggle("hidden", on); }

  // Menus open: hold the line (and its voice) where it is.
  pause(on) { this.voice?.pause(on); }

  update(dt) {
    // (A new line only starts while the game runs, not behind a menu.)
    if (!this.cur && this.queue.length && dt > 0 && this.voice?.ready !== false) {
      const id = this.queue.shift();
      const [who, text] = line(id);
      this.cur = { who, text, t: 0, shown: 0, dur: 2.2 + text.length * 0.05, rate: 55 };
      // Spoken: typed out in step with the voice, and held until it ends.
      const el = this.voice?.play(id);
      if (el) {
        const c = this.cur;
        c.voiced = el;
        el.addEventListener("loadedmetadata", () => {
          if (!Number.isFinite(el.duration)) return;
          c.rate = c.text.length / Math.max(0.6, el.duration * 0.92);
          c.dur = Math.max(c.dur * 0.6, el.duration + 0.7);
        });
      }
      this.last = id;
      this.onLine?.(id);
      this.icon.innerHTML = ICONS[who] ?? ICONS.margo;
      this.name.textContent = t(who === "csavar" ? "csavar" : "margoRadio");
      this.el.dataset.who = who;
      this.textEl.textContent = "";
      this.el.classList.add("on");
      if (!el) this.audio?.talk(who, Math.min(10, 3 + Math.floor(text.length / 14)));
    }
    const c = this.cur;
    if (!c) return;
    // A voice that could not play falls back to beep-talk and the old pace.
    if (c.voiced?.failed) { c.voiced = null; c.rate = 55; c.dur = 2.2 + c.text.length * 0.05; this.audio?.talk(c.who, 6); }
    c.t += dt;
    // Type out.
    const n = Math.min(c.text.length, Math.floor(c.t * c.rate));
    if (n !== c.shown) { this.textEl.textContent = c.text.slice(0, n); c.shown = n; }
    if (c.t > c.dur) {
      this.cur = null;
      if (c.voiced) this.voice.stop();
      if (!this.queue.length) this.el.classList.remove("on");
    }
  }
}
