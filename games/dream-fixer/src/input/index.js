import { Touch } from "./touch.js";
import { Gamepad, BTN } from "./gamepad.js";

// ── Input ────────────────────────────────────────────────────────────────
// Keyboard + mouse (with pointer lock), touch and a gamepad feed one shared state.
// The game reads it once per frame: look() gives the view turn since the
// last call, intent() the movement and buttons for the sim, and pressed()
// the one-shot actions (tool switch, pause…).

const KEYS = {
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  jump: ["Space"], use: ["KeyE", "KeyF"], sprint: ["ShiftLeft", "ShiftRight"],
};
const ONE_SHOT = {
  Digit1: "tool1", Digit2: "tool2", Digit3: "tool3", Digit4: "tool4", Digit5: "tool5", Digit6: "tool6", KeyQ: "toolPrev", Escape: "pause", KeyP: "pause", KeyR: "toolNext",
  KeyG: "item_pillow", KeyC: "item_espresso", KeyV: "item_cocoa",
};

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
    this.canLock = () => true;
    this.pad = new Gamepad();
    this.padOn = false;           // a pad is connected (polled this frame)
    this.usingPad = false;        // …and it was the last thing touched
    this.padLook = [0, 0];

    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      this.usingPad = false;
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
      // Only grab the mouse when the game is really being played: clicks on
      // menus and panels keep the cursor.
      if (!this.locked) { if (this.canLock() && !e.target.closest?.(".menus, .memcards")) this.lock(); return; }
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
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.usingPad = false;
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

  // Once a frame: read the pad; while playing, its right stick turns the
  // view and its buttons give the same one-shot actions as the keys.
  poll(dt, playing) {
    const p = this.pad;
    this.padOn = p.poll();
    if (!this.padOn) { this.usingPad = false; return; }
    if (p.any()) this.usingPad = true;
    if (!playing) return;
    const s = this.settings, k = s.padSensitivity ?? 1;
    // On a curve: small pushes for fine aim, a full push turns fast.
    const curve = (v) => Math.sign(v) * Math.abs(v) ** 1.7;
    this.padLook[0] -= curve(p.axes[2]) * 3.6 * k * dt;
    this.padLook[1] -= curve(p.axes[3]) * 2.5 * k * dt * (s.invertY ? -1 : 1);
    const P = (b) => p.pressed(b);
    if (P(BTN.A)) this.edges.add("jump");
    if (P(BTN.X)) this.edges.add("use");
    if (P(BTN.Y) || P(BTN.RB) || P(BTN.RIGHT)) this.edges.add("toolNext");
    if (P(BTN.LB) || P(BTN.LEFT)) this.edges.add("toolPrev");
    if (P(BTN.START)) this.edges.add("pause");
    if (P(BTN.B)) this.edges.add("item_pillow");
    if (P(BTN.UP)) this.edges.add("item_espresso");
    if (P(BTN.DOWN)) this.edges.add("item_cocoa");
    // Click the stick to run; it keeps running until the stick is let go.
    if (P(BTN.L3)) this.padRun = true;
    if (Math.hypot(p.axes[0], p.axes[1]) < 0.25) this.padRun = false;
  }

  key(name) { for (const c of KEYS[name]) if (this.down.has(c)) return true; return false; }

  // View turn in radians since the last call ([yaw, pitch]).
  look() {
    const s = this.settings;
    const k = 0.0022 * s.sensitivity;
    let yaw = -this.dx * k, pitch = -this.dy * k * (s.invertY ? -1 : 1);
    this.dx = this.dy = 0;
    const [ty, tp] = this.touch.look();
    yaw += ty + this.padLook[0]; pitch += tp + this.padLook[1];
    this.padLook[0] = this.padLook[1] = 0;
    return [yaw, pitch];
  }

  // Movement and held buttons for one sim step.
  intent() {
    const t = this.touch;
    let forward = (this.key("forward") ? 1 : 0) - (this.key("back") ? 1 : 0);
    let strafe = (this.key("right") ? 1 : 0) - (this.key("left") ? 1 : 0);
    if (t.active) { forward += t.move[1]; strafe += t.move[0]; }
    const p = this.padOn ? this.pad : null;
    if (p) { forward -= p.axes[1]; strafe += p.axes[0]; }
    return {
      forward, strafe,
      jump: this.key("jump") || t.held.jump || !!p?.down(BTN.A),
      fire: this.mouse.fire || t.held.fire || (p?.value(BTN.RT) ?? 0) > 0.35,
      alt: this.mouse.alt || t.held.alt || (p?.value(BTN.LT) ?? 0) > 0.35,
      use: this.key("use") || t.held.use || !!p?.down(BTN.X),
      sprint: this.key("sprint") || (!!p && this.padRun),
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
