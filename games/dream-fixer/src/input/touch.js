// ── Touch controls ───────────────────────────────────────────────────────
// Left side: a floating stick (it appears where the thumb lands). Right
// side: drag to look, with buttons for fire, the tool's second action,
// jump and use. Everything shows up on the first touch, so desktop
// players never see it.

const BUTTONS = [
  // id, label (icon), class
  ["fire", "", "big"],
  ["alt", "", "mid"],
  ["jump", "", "mid"],
  ["use", "", "small"],
  ["tool", "", "small"],
  ["pause", "", "corner"],
];
const ICONS = {
  fire: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  alt: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 1 7 7" fill="none" stroke-width="2.4" stroke-linecap="round"/><path d="M4 16l1-4 4 1"/></svg>',
  jump: '<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4v7H9v-7H5z"/></svg>',
  use: '<svg viewBox="0 0 24 24"><path d="M14.5 3.5a4.5 4.5 0 0 0-4.2 6.1L3.5 16.4 7.6 20.5l6.8-6.8a4.5 4.5 0 0 0 6.1-4.2l-2.6 2.6-3.1-.5-.5-3.1z"/></svg>',
  tool: '<svg viewBox="0 0 24 24"><path d="M7 7h10l-3-3M17 17H7l3 3" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
};

export class Touch {
  constructor(el, input) {
    this.input = input;
    this.active = false;
    this.move = [0, 0];
    this.held = { fire: false, alt: false, jump: false, use: false };
    this.edges = new Set();
    this.lookDx = 0; this.lookDy = 0;
    this.roles = new Map();           // pointerId → { role, x, y, ox, oy }

    const ui = this.ui = document.createElement("div");
    ui.className = "touch-ui hidden";
    ui.innerHTML = `<div class="stick"><i></i></div>` + BUTTONS.map(([id, , cls]) => `<button class="tbtn ${cls}" data-t="${id}" aria-label="${id}">${ICONS[id]}</button>`).join("");
    el.appendChild(ui);
    this.stick = ui.querySelector(".stick");
    this.knob = this.stick.querySelector("i");

    const opts = { passive: false };
    el.addEventListener("pointerdown", (e) => this.down(e), opts);
    addEventListener("pointermove", (e) => this.moveEv(e), opts);
    addEventListener("pointerup", (e) => this.up(e));
    addEventListener("pointercancel", (e) => this.up(e));
  }

  show(on) { this.ui.classList.toggle("hidden", !on || !this.active); }

  down(e) {
    if (e.pointerType !== "touch") return;
    if (!this.active) { this.active = true; this.ui.classList.remove("hidden"); this.input.onTouchStart?.(); }
    if (!this.input.enabled) return;
    e.preventDefault();
    const btn = e.target.closest?.(".tbtn");
    if (btn) {
      const id = btn.dataset.t;
      btn.classList.add("on");
      if (id in this.held) this.held[id] = true;
      this.edges.add(id === "tool" ? "toolNext" : id);
      // The fire button also steers the view, so aiming and shooting is one thumb.
      this.roles.set(e.pointerId, { role: id === "fire" ? "fire" : "btn", btn, x: e.clientX, y: e.clientY });
      return;
    }
    if (e.clientX < innerWidth * 0.42) {
      this.roles.set(e.pointerId, { role: "stick", ox: e.clientX, oy: e.clientY });
      this.stick.style.left = `${e.clientX}px`; this.stick.style.top = `${e.clientY}px`;
      this.stick.classList.add("on");
      this.knob.style.transform = "translate(-50%, -50%)";
    } else this.roles.set(e.pointerId, { role: "look", x: e.clientX, y: e.clientY });
  }

  moveEv(e) {
    const r = this.roles.get(e.pointerId);
    if (!r) return;
    e.preventDefault();
    if (r.role === "stick") {
      const R = 56;
      let dx = e.clientX - r.ox, dy = e.clientY - r.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // Drag the stick's centre along, so a thumb that slid off still steers.
        r.ox += dx * (1 - R / d); r.oy += dy * (1 - R / d);
        this.stick.style.left = `${r.ox}px`; this.stick.style.top = `${r.oy}px`;
        dx *= R / d; dy *= R / d;
      }
      this.move = [dx / R, -dy / R];
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (r.role === "look" || r.role === "fire") {
      this.lookDx += e.clientX - r.x; this.lookDy += e.clientY - r.y;
      r.x = e.clientX; r.y = e.clientY;
    }
  }

  up(e) {
    const r = this.roles.get(e.pointerId);
    if (!r) return;
    this.roles.delete(e.pointerId);
    if (r.role === "stick") { this.move = [0, 0]; this.stick.classList.remove("on"); }
    if (r.btn) {
      r.btn.classList.remove("on");
      const id = r.btn.dataset.t;
      if (id in this.held) this.held[id] = false;
    }
  }

  look() {
    const k = 0.0052 * this.input.settings.touchSensitivity;
    const out = [-this.lookDx * k, -this.lookDy * k * (this.input.settings.invertY ? -1 : 1)];
    this.lookDx = this.lookDy = 0;
    return out;
  }

  release() {
    for (const [, r] of this.roles) r.btn?.classList.remove("on");
    this.roles.clear();
    this.move = [0, 0];
    for (const k in this.held) this.held[k] = false;
    this.stick.classList.remove("on");
  }
}
