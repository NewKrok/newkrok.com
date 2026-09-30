// ── Gamepad ──────────────────────────────────────────────────────────────
// Polled once a frame through the Gamepad API (standard mapping):
//   left stick / d-pad  steer (menus: move the focus)
//   RT / LT             drive / reverse (brakes first when rolling the other way)
//   A / X               brake (menus: A presses the focused button)
//   B                   back          Start  pause
//   Y                   camera        Back   restart
//   LB / RB             reversing camera / path guide
//   right stick         zoom

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const DEAD = 0.2;
const deadzone = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * (Math.abs(v) - DEAD) / (1 - DEAD));

export class Gamepad {
  constructor() {
    this.prev = [];
    this.now = [];
    this.axes = [0, 0, 0, 0];
    this.info = null;            // { id, mapping, axes, buttons } of the pads, for the settings readout
    this.onConnect = null;
    this.repeat = { dir: null, next: 0 };
    if (typeof window !== "undefined") {
      window.addEventListener("gamepadconnected", () => this.onConnect?.(true));
      window.addEventListener("gamepaddisconnected", () => this.onConnect?.(false));
    }
  }

  #pads() {
    try { return [...(navigator.getGamepads?.() ?? [])].filter((p) => p && p.connected !== false); } catch { return []; }
  }

  // Reads every connected pad and merges them: a button counts when it is
  // down on any pad, a stick takes the pad pushed furthest. Picking one
  // "active" pad went wrong when the system listed the controller twice
  // (or a virtual one next to it). Returns false when there is none.
  poll() {
    const pads = this.#pads();
    this.prev = this.now;
    if (!pads.length) { this.now = []; this.axes = [0, 0, 0, 0]; this.info = null; return false; }
    const now = [], axes = [0, 0, 0, 0];
    const push = (i, v) => { if (v > (now[i] ?? 0)) now[i] = v; };
    const stick = (i, v) => { v = deadzone(v); if (Math.abs(v) > Math.abs(axes[i])) axes[i] = v; };
    for (const p of pads) {
      p.buttons.forEach((b, i) => push(i, typeof b === "number" ? b : Math.max(b.value, b.pressed ? 1 : 0)));
      const std = p.mapping === "standard";
      if (Math.abs(p.axes[0] ?? 0) <= 1 && Math.abs(p.axes[1] ?? 0) <= 1) { stick(0, p.axes[0] ?? 0); stick(1, p.axes[1] ?? 0); }
      // Without the standard mapping axes 2 / 3 may be triggers resting at −1.
      if (std) { stick(2, p.axes[2] ?? 0); stick(3, p.axes[3] ?? 0); }
      else {
        // Non-standard pads report the d-pad as a hat switch on axis 9:
        // eight positions from −1 (up) clockwise, above 1 when centred.
        const hat = p.axes[9];
        if (hat != null && Math.abs(hat) <= 1.05) {
          const k = Math.round((hat + 1) * 3.5) % 8;
          if (k === 7 || k <= 1) push(BTN.UP, 1);
          if (k >= 1 && k <= 3) push(BTN.RIGHT, 1);
          if (k >= 3 && k <= 5) push(BTN.DOWN, 1);
          if (k >= 5 && k <= 7) push(BTN.LEFT, 1);
        }
      }
    }
    for (let i = 0; i < now.length; i++) now[i] ??= 0;
    this.now = now;
    this.axes = axes;
    this.info = pads.map((p) => ({
      id: p.id, mapping: p.mapping || "—",
      axes: [...p.axes].map((v) => (Number(v) || 0).toFixed(2)),
      buttons: p.buttons.map((b, i) => ((typeof b === "number" ? b : b.value) > 0.5 || b.pressed ? i : -1)).filter((i) => i >= 0),
    }));
    return true;
  }

  value(i) { return this.now[i] ?? 0; }
  down(i) { return this.value(i) > 0.5; }
  pressed(i) { return this.down(i) && !((this.prev[i] ?? 0) > 0.5); }
  any() { return this.now.some((v) => v > 0.5) || this.axes.some((v) => v !== 0); }

  // Driving input from the pad. `digital` tells d-pad steering from the
  // stick, so a released stick still re-centres the wheel.
  drive() {
    let steer = this.axes[0], digital = false;
    if (this.down(BTN.LEFT)) { steer = -1; digital = true; }
    if (this.down(BTN.RIGHT)) { steer = 1; digital = true; }
    const throttle = this.value(BTN.RT) - this.value(BTN.LT);
    return { steer, throttle: Math.abs(throttle) < 0.08 ? 0 : throttle, brake: this.down(BTN.A) || this.down(BTN.X), digital };
  }

  // Menu direction with key-repeat: "up" | "down" | "left" | "right" | null.
  nav(time) {
    const [ax, ay] = this.axes;
    let dir = null;
    if (this.down(BTN.UP) || ay < -0.5) dir = "up";
    else if (this.down(BTN.DOWN) || ay > 0.5) dir = "down";
    else if (this.down(BTN.LEFT) || ax < -0.5) dir = "left";
    else if (this.down(BTN.RIGHT) || ax > 0.5) dir = "right";
    const r = this.repeat;
    if (!dir) { r.dir = null; return null; }
    if (dir !== r.dir) { r.dir = dir; r.next = time + 0.38; return dir; }
    if (time >= r.next) { r.next = time + 0.12; return dir; }
    return null;
  }
}
