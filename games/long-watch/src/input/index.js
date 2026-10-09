import { Gamepad, BTN } from "./gamepad.js";

// ── Input ────────────────────────────────────────────────────────────────
// Keyboard + mouse (pointer lock) and a gamepad feed one state. The game
// reads it once per sim step: intent() gives movement, held buttons and
// the one-shot presses since the last step. The view angles live here too
// (the mouse turns them between steps, the renderer uses them at once).
//
// Keys:  WASD move · mouse look · LMB fire · RMB aim · Space jump ·
//        Shift sprint · V dash · C / Ctrl crouch · Q cover · R reload ·
//        E use · 1 / 2 / wheel / Tab switch weapon · X shoulder · Esc pause
// Pad:   left stick move (click: sprint) · right stick look (click:
//        shoulder) · RT fire · LT aim · A jump · B dash · X use / reload ·
//        Y switch weapon · RB cover · LB crouch · Start pause · Back skip

const KEYS = {
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  jump: ["Space"], sprint: ["ShiftLeft", "ShiftRight"], use: ["KeyE", "KeyF"],
};
const ONE_SHOT = {
  Space: "jump", KeyV: "dash", KeyC: "crouch", ControlLeft: "crouch", KeyQ: "cover", KeyR: "reload", KeyE: "use", KeyF: "use",
  Digit1: "slot1", Digit2: "slot2", Tab: "swap", KeyX: "shoulder", Escape: "pause", KeyP: "pause", Enter: "skip",
};

export class Input {
  constructor(el, settings) {
    this.el = el;
    this.settings = settings;
    this.down = new Set();
    this.mouse = { fire: false, aim: false };
    this.edges = new Set();
    this.locked = false;
    this.enabled = false;
    this.pad = new Gamepad();
    this.padOn = false; this.usingPad = false;
    this.padSprint = false;
    this.yaw = 0; this.pitch = -0.08;
    this.onLockChange = null;
    this.canLock = () => true;

    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      this.usingPad = false;
      if (e.code === "Tab" || e.code === "Space" || e.code.startsWith("Arrow") || e.code === "ControlLeft") e.preventDefault();
      if (!e.repeat && ONE_SHOT[e.code]) this.edges.add(ONE_SHOT[e.code]);
      this.down.add(e.code);
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => { this.down.clear(); this.mouse.fire = this.mouse.aim = false; });
    el.addEventListener("mousedown", (e) => {
      if (!this.enabled) return;
      if (!this.locked) { if (this.canLock() && !e.target.closest?.(".menus, .logpanel")) this.lock(); return; }
      this.usingPad = false;
      if (e.button === 0) { this.mouse.fire = true; this.edges.add("fire"); }
      if (e.button === 2) this.mouse.aim = true;
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.fire = false;
      if (e.button === 2) this.mouse.aim = false;
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      const k = 0.0022 * (this.settings.sensitivity ?? 1) * (this.mouse.aim ? 0.65 : 1);
      this.turn(-e.movementX * k, -e.movementY * k * (this.settings.invertY ? -1 : 1));
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.usingPad = false;
    });
    let wheelLast = 0;
    addEventListener("wheel", (e) => {
      if (!this.locked || !e.deltaY) return;
      const now = performance.now();
      if (now - wheelLast < 180) return;
      wheelLast = now;
      this.edges.add("swap");
    }, { passive: true });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === el;
      if (!this.locked) { this.mouse.fire = this.mouse.aim = false; this.down.clear(); }
      this.onLockChange?.(this.locked);
    });
  }

  turn(dy, dp) {
    this.yaw += dy;
    this.pitch = Math.max(-1.25, Math.min(1.2, this.pitch + dp));
  }
  setView(yaw, pitch) { this.yaw = yaw; this.pitch = pitch; }

  lock() {
    try {
      const p = this.el.requestPointerLock?.({ unadjustedMovement: true });
      p?.catch?.(() => this.el.requestPointerLock?.());
    } catch { /* not supported */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  // Once a frame: the pad's sticks turn the view; its buttons give the
  // same one-shots as the keys.
  poll(dt, playing, assist) {
    const p = this.pad;
    this.padOn = p.poll();
    if (!this.padOn) { this.usingPad = false; return; }
    if (p.any()) this.usingPad = true;
    if (!playing) return;
    const s = this.settings, k = s.padSensitivity ?? 1, aimSlow = p.value(BTN.LT) > 0.35 ? 0.55 : 1;
    const curve = (v) => Math.sign(v) * Math.abs(v) ** 1.8;
    // Aim assist: the stick slows down over a bug.
    const slow = assist ? 0.55 : 1;
    this.turn(-curve(p.axes[2]) * 3.4 * k * dt * aimSlow * slow, -curve(p.axes[3]) * 2.3 * k * dt * aimSlow * slow * (s.invertY ? -1 : 1));
    const P = (b) => p.pressed(b);
    if (P(BTN.A)) this.edges.add("jump");
    if (P(BTN.B)) this.edges.add("dash");
    if (P(BTN.X)) this.edges.add("padUse");
    if (P(BTN.Y)) this.edges.add("swap");
    if (P(BTN.RB)) this.edges.add("cover");
    if (P(BTN.LB)) this.edges.add("crouch");
    if (P(BTN.R3)) this.edges.add("shoulder");
    if (P(BTN.START)) this.edges.add("pause");
    if (P(BTN.BACK)) this.edges.add("skip");
    if (P(BTN.RT)) this.edges.add("fire");
    if (P(BTN.UP)) this.edges.add("slot1");
    if (P(BTN.DOWN)) this.edges.add("slot2");
    if (P(BTN.L3)) this.padSprint = !this.padSprint;
    if (Math.hypot(p.axes[0], p.axes[1]) < 0.3) this.padSprint = false;
  }

  key(name) { for (const c of KEYS[name]) if (this.down.has(c)) return true; return false; }

  // Everything for one sim step.
  intent() {
    let forward = (this.key("forward") ? 1 : 0) - (this.key("back") ? 1 : 0);
    let strafe = (this.key("right") ? 1 : 0) - (this.key("left") ? 1 : 0);
    const p = this.padOn ? this.pad : null;
    if (p) { forward -= p.axes[1]; strafe += p.axes[0]; }
    const e = this.edges;
    // The pad's X: use when there is something to use, else reload (the
    // game decides; both are offered).
    const I = {
      forward, strafe, yaw: this.yaw, pitch: this.pitch,
      jump: this.key("jump") || !!p?.down(BTN.A),
      sprint: this.key("sprint") || this.padSprint,
      fire: this.mouse.fire || (p?.value(BTN.RT) ?? 0) > 0.35,
      aim: this.mouse.aim || (p?.value(BTN.LT) ?? 0) > 0.35,
      use: this.key("use") || !!p?.down(BTN.X),
      firePressed: e.has("fire"), jumpPressed: e.has("jump"), dashPressed: e.has("dash"), crouchPressed: e.has("crouch"),
      coverPressed: e.has("cover"), reloadPressed: e.has("reload"), usePressed: e.has("use"), padUse: e.has("padUse"),
      swapPressed: e.has("swap"), shoulderPressed: e.has("shoulder"), skipPressed: e.has("skip") || e.has("jump") || e.has("pause"),
      slot: e.has("slot1") ? 0 : e.has("slot2") ? 1 : -1,
    };
    // A held Escape / Start opens the pause menu outside of a cutscene; the
    // caller takes "pause" out before this when it is used for that.
    e.clear();
    return I;
  }

  // One-shots the menus care about (and leave the rest for the sim).
  take(name) { const had = this.edges.has(name); this.edges.delete(name); return had; }
}
