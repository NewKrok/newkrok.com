import { Touch } from "./touch.js";

// ── Input ────────────────────────────────────────────────────────────────
// Keyboard + mouse (with pointer lock) and touch feed one shared state.
// The game reads it once per frame: look() gives the view turn since the
// last call, intent() the movement and buttons for the sim, and pressed()
// the one-shot actions (tool switch, pause…).

const KEYS = {
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  jump: ["Space"], use: ["KeyE", "KeyF"], sprint: ["ShiftLeft", "ShiftRight"],
};
const ONE_SHOT = { Digit1: "tool1", Digit2: "tool2", Digit3: "tool3", Digit4: "tool4", KeyQ: "toolPrev", Escape: "pause", KeyP: "pause", KeyR: "toolNext" };

export class Input {
  constructor(el, settings) {
    this.el = el;
    this.settings = settings;
    this.down = new Set();
    this.mouse = { fire: false, alt: false };
    this.dx = 0; this.dy = 0;
    this.edges = new Set();
    this.locked = false;
    this.enabled = false;
    this.touch = new Touch(el, this);
    this.onLockChange = null;

    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      if (e.code === "Tab") e.preventDefault();
      if (!e.repeat) {
        if (ONE_SHOT[e.code]) this.edges.add(ONE_SHOT[e.code]);
        if (KEYS.jump.includes(e.code)) this.edges.add("jump");
        if (KEYS.use.includes(e.code)) this.edges.add("use");
      }
      this.down.add(e.code);
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => { this.down.clear(); this.mouse.fire = this.mouse.alt = false; });

    el.addEventListener("mousedown", (e) => {
      if (!this.enabled || this.touch.active) return;
      if (!this.locked) { this.lock(); return; }
      if (e.button === 0) { this.mouse.fire = true; this.edges.add("fire"); }
      if (e.button === 2) { this.mouse.alt = true; this.edges.add("alt"); }
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.fire = false;
      if (e.button === 2) this.mouse.alt = false;
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      // Browsers occasionally report one huge jump when the lock settles.
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    addEventListener("wheel", (e) => {
      if (!this.locked) return;
      this.edges.add(e.deltaY > 0 ? "toolNext" : "toolPrev");
    }, { passive: true });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === el;
      if (!this.locked) { this.mouse.fire = this.mouse.alt = false; this.down.clear(); }
      this.onLockChange?.(this.locked);
    });
  }

  lock() {
    if (this.touch.active) return;
    try {
      const p = this.el.requestPointerLock?.({ unadjustedMovement: true });
      // Older browsers reject unadjustedMovement; try again without it.
      p?.catch?.(() => this.el.requestPointerLock?.());
    } catch { /* not supported */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  key(name) { for (const c of KEYS[name]) if (this.down.has(c)) return true; return false; }

  // View turn in radians since the last call ([yaw, pitch]).
  look() {
    const s = this.settings;
    const k = 0.0022 * s.sensitivity;
    let yaw = -this.dx * k, pitch = -this.dy * k * (s.invertY ? -1 : 1);
    this.dx = this.dy = 0;
    const [ty, tp] = this.touch.look();
    yaw += ty; pitch += tp;
    return [yaw, pitch];
  }

  // Movement and held buttons for one sim step.
  intent() {
    const t = this.touch;
    let forward = (this.key("forward") ? 1 : 0) - (this.key("back") ? 1 : 0);
    let strafe = (this.key("right") ? 1 : 0) - (this.key("left") ? 1 : 0);
    if (t.active) { forward += t.move[1]; strafe += t.move[0]; }
    return {
      forward, strafe,
      jump: this.key("jump") || t.held.jump,
      fire: this.mouse.fire || t.held.fire,
      alt: this.mouse.alt || t.held.alt,
      use: this.key("use") || t.held.use,
    };
  }

  // One-shot actions since the last call.
  pressed() {
    const out = new Set(this.edges);
    for (const e of this.touch.edges) out.add(e);
    this.edges.clear(); this.touch.edges.clear();
    return out;
  }

  get isTouch() { return this.touch.active; }
}
