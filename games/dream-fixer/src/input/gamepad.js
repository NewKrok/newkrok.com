// ── Gamepad ──────────────────────────────────────────────────────────────
// Polled once a frame through the Gamepad API (taken over from Hitch &
// Park, with its fixes for odd pads). In the game:
//   left stick   move (click: run) right stick  look
//   RT           fire              LT           charge / the tool's second use
//   A            jump              X            use (tune an anchor …)
//   Y / RB / →   next tool         LB / ←       previous tool
//   Start        pause
// In menus the left stick / d-pad moves the focus, A presses, B goes back.

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const DEAD = 0.2;
const NINTENDO = /switch|pro controller|nintendo|joy-con|057e/i;
const deadzone = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * (Math.abs(v) - DEAD) / (1 - DEAD));

export class Gamepad {
  constructor() {
    this.prev = [];
    this.now = [];
    this.axes = [0, 0, 0, 0];
    this.info = null;            // { id, mapping, axes, buttons } of the pads, for the settings readout
    this.onConnect = null;
    this.repeat = { dir: null, next: 0 };
    this.calib = new Map();      // per pad: axes seen at rest, hat seen centred
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
      const std = p.mapping === "standard";
      // A button or axis only counts once it has been seen at rest: a
      // button stuck down or an axis sitting at ±1 on some other device
      // would otherwise hold a direction (the menu focus kept running down).
      const key = `${p.index}:${p.id}`;
      let cal = this.calib.get(key);
      if (!cal) { cal = { rest: new Set(), up: new Set(), hat: false, first: [...p.axes].map((v) => Number(v) || 0) }; this.calib.set(key, cal); }
      // Without the standard mapping only the first twelve buttons are the
      // usual ones (12 and up are Home, Capture …, not the d-pad), and the
      // face buttons come in another order: Switch pads (HORI, Pro
      // Controller) by their letters, so A confirms; others by position.
      const face = std ? null : NINTENDO.test(p.id) ? [2, 1, 0, 3] : [1, 2, 0, 3];
      p.buttons.forEach((b, i) => {
        const v = typeof b === "number" ? b : Math.max(b.value, b.pressed ? 1 : 0);
        if (v < 0.2) cal.up.add(i);
        if (!cal.up.has(i) || (!std && i >= 12)) return;
        push(face && i < 4 ? face.indexOf(i) : i, v);
      });
      const axis = (i) => {
        const v = Number(p.axes[i]) || 0;
        if (Math.abs(v) < DEAD) cal.rest.add(i);
        return cal.rest.has(i) && Math.abs(v) <= 1.01 ? v : 0;
      };
      stick(0, axis(0)); stick(1, axis(1));
      // Without the standard mapping axes 2 / 3 may be triggers: those
      // rest at −1, are never seen at rest and so never count.
      stick(2, axis(2)); stick(3, axis(3));
      if (!std) {
        // Non-standard pads report the d-pad as a hat switch on axis 9:
        // eight positions from −1 (up) clockwise, above 1 when centred.
        // Trusted only after it has shown the centred value, and only at
        // one of the eight positions.
        const hat = p.axes[9];
        if (hat != null && hat > 1.1) cal.hat = true;
        const k = hat == null ? -1 : Math.round((hat + 1) * 3.5);
        if (cal.hat && k >= 0 && k <= 7 && Math.abs(hat - (k / 3.5 - 1)) < 0.06) {
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
      // Indexed; an axis away from where it was first seen gets a "*".
      axes: [...p.axes].map((v, i) => {
        v = Number(v) || 0;
        const moved = Math.abs(v - (this.calib.get(`${p.index}:${p.id}`).first[i] ?? v)) > 0.3;
        return `${i}:${v.toFixed(2)}${moved ? "*" : ""}`;
      }),
      buttons: p.buttons.map((b, i) => ((typeof b === "number" ? b : b.value) > 0.5 || b.pressed ? i : -1)).filter((i) => i >= 0),
    }));
    return true;
  }

  value(i) { return this.now[i] ?? 0; }
  down(i) { return this.value(i) > 0.5; }
  pressed(i) { return this.down(i) && !((this.prev[i] ?? 0) > 0.5); }
  any() { return this.now.some((v) => v > 0.5) || this.axes.some((v) => v !== 0); }

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
