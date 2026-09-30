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

const DEAD = 0.16;
const deadzone = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * (Math.abs(v) - DEAD) / (1 - DEAD));

export class Gamepad {
  constructor() {
    this.index = null;           // the pad in use (the last one touched)
    this.prev = [];
    this.now = [];
    this.axes = [0, 0, 0, 0];
    this.connected = false;
    this.onConnect = null;
    this.repeat = { dir: null, next: 0 };
    if (typeof window !== "undefined") {
      window.addEventListener("gamepadconnected", (e) => { this.index ??= e.gamepad.index; this.connected = true; this.onConnect?.(true); });
      window.addEventListener("gamepaddisconnected", (e) => {
        if (e.gamepad.index !== this.index) return;
        this.index = null;
        this.connected = !!this.#pads().length;
        this.onConnect?.(false);
      });
    }
  }

  #pads() {
    try { return [...(navigator.getGamepads?.() ?? [])].filter(Boolean); } catch { return []; }
  }

  // Reads the pad; returns false when there is none.
  poll() {
    const pads = this.#pads();
    if (!pads.length) { this.prev = this.now = []; this.axes = [0, 0, 0, 0]; return false; }
    // Follow whichever pad was used last.
    const active = pads.find((p) => p.buttons.some((b) => b.pressed)) ?? pads.find((p) => p.index === this.index) ?? pads[0];
    this.index = active.index;
    this.prev = this.now;
    this.now = active.buttons.map((b) => (typeof b === "number" ? b : b.value));
    this.axes = [0, 1, 2, 3].map((i) => deadzone(active.axes[i] ?? 0));
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
