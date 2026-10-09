import { BTN } from "../input/gamepad.js";

// ── Menus with a gamepad ─────────────────────────────────────────────────
// The left stick / d-pad moves the focus to the nearest control that way
// (sliders and toggles take left / right themselves), A presses it, B goes
// back, Start leaves the pause menu. Nothing focused yet: A takes the
// screen's main button. Taken over from Hitch & Park.

const visible = (el) => el.offsetParent !== null && !el.disabled;

export class PadNav {
  constructor(root, audio) {
    this.root = root;
    this.audio = audio;
    // The focus ring only shows while the pad is driving the menus. Only a
    // real hand on the mouse takes it away: not the jump the cursor makes
    // when the pointer lock lets go, nor a twitch right after a pad press.
    // A real hand: a few moves in a row adding up to a fair distance.
    this.padT = 0; this.mouseAcc = 0; this.mouseT = 0;
    addEventListener("mousemove", (e) => {
      const m = Math.abs(e.movementX) + Math.abs(e.movementY), now = performance.now();
      if (m > 150 || document.pointerLockElement || now - this.padT < 1500) return;
      this.mouseAcc = now - this.mouseT > 250 ? m : this.mouseAcc + m;
      this.mouseT = now;
      if (this.mouseAcc > 60) document.body.classList.remove("pad-nav");
    });
    addEventListener("mousedown", () => document.body.classList.remove("pad-nav"));
  }

  // A menu just opened while the pad is in hand: its main button is
  // focused straight away, so you can see where you are.
  focusMain() {
    const list = this.focusables();
    if (!list.length || list.includes(document.activeElement)) return;
    document.body.classList.add("pad-nav");
    this.padT = performance.now();
    this.main(list).focus({ preventScroll: true });
  }

  focusables() {
    const scr = this.root.querySelector(".menus .screen");
    if (!scr) return [];
    return [...scr.querySelectorAll("button, input, select")].filter(visible);
  }

  main(list) { return list.find((b) => b.classList.contains("tile") && b.classList.contains("sel")) ?? list.find((b) => b.classList.contains("big")) ?? list.find((b) => b.classList.contains("btn") && !b.classList.contains("ghost")) ?? list[0]; }

  // pad: the Gamepad, time: seconds (for the stick's key-repeat).
  frame(pad, time) {
    // The right stick scrolls the list (or panel) you are in.
    const dt = Math.min(0.1, time - (this.lastT ?? time)), ry = pad.axes[3] || 0;
    this.lastT = time;
    if (Math.abs(ry) > 0.05) {
      const scr = this.root.querySelector(".menus .screen"), act = document.activeElement;
      const box = (scr?.contains(act) && act.closest(".achlist, .jbody, .tiles, .clients, .settings, .scroll")) || scr?.querySelector(".achlist, .jbody, .tiles, .clients, .settings, .scroll") || scr?.querySelector(".panel");
      box?.scrollBy({ top: ry * 900 * dt });
    }
    const dir = pad.nav(time);
    if (dir) { document.body.classList.add("pad-nav"); this.padT = performance.now(); this.move(dir); }
    const P = (b) => pad.pressed(b);
    if (P(BTN.B)) { this.press("[data-a=back], [data-a=close], [data-a=resume]"); return; }
    if (P(BTN.START)) { this.press("[data-a=resume]"); return; }
    // The shoulder buttons flip through a panel's tabs (the bench's pages).
    if (P(BTN.LB) || P(BTN.RB)) {
      const tabs = [...(this.root.querySelector(".menus .screen")?.querySelectorAll("[data-a=tab]") ?? [])];
      if (tabs.length) {
        const i = Math.max(0, tabs.findIndex((b) => b.classList.contains("on"))), d = P(BTN.RB) ? 1 : -1;
        tabs[(i + d + tabs.length) % tabs.length].click();
        this.audio.play("click");
        return;
      }
    }
    if (P(BTN.A)) {
      document.body.classList.add("pad-nav");
      this.padT = performance.now();
      const list = this.focusables(), el = document.activeElement;
      const target = list.includes(el) ? el : this.main(list);
      if (target?.type === "range" || target?.tagName === "SELECT") this.move("right");
      else target?.click();
    }
  }

  press(sel) {
    this.root.querySelector(".menus .screen")?.querySelector(sel)?.click();
  }

  move(dir) {
    const list = this.focusables();
    if (!list.length) return;
    const cur = document.activeElement;
    if (!list.includes(cur)) { this.main(list).focus(); return; }
    if ((dir === "left" || dir === "right") && cur.type === "range") {
      const d = dir === "right" ? 1 : -1;
      cur.value = Math.min(Number(cur.max), Math.max(Number(cur.min), Number(cur.value) + d * Number(cur.step || 0.05)));
      cur.dispatchEvent(new Event("input", { bubbles: true }));
      this.audio.play("click");
      return;
    }
    // A drop-down: left / right step through its options (round the end).
    if ((dir === "left" || dir === "right") && cur.tagName === "SELECT") {
      const n = cur.options.length;
      cur.selectedIndex = (cur.selectedIndex + (dir === "right" ? 1 : -1) + n) % n;
      cur.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    // Up / down: the nearest row first, then the control in it closest
    // across. Left / right: within the row.
    const r0 = cur.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    const vertical = dir === "up" || dir === "down", sgn = dir === "down" || dir === "right" ? 1 : -1;
    const cands = [];
    for (const el of list) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      if (vertical) {
        if ((ey - cy) * sgn <= 4) continue;
        const gap = sgn > 0 ? r.top - r0.bottom : r0.top - r.bottom;
        cands.push({ el, gap: Math.max(0, gap), across: Math.abs(ex - cx) });
      } else {
        if ((ex - cx) * sgn <= 4) continue;
        // In the same row first; failing that, the nearest control that way
        // (the bench's buy button sits low in the panel beside the list).
        const row = !(r.top >= r0.bottom - 2 || r.bottom <= r0.top + 2);
        cands.push({ el, gap: row ? Math.abs(ex - cx) : 1e5 + Math.abs(ey - cy), across: row ? 0 : Math.abs(ex - cx) });
      }
    }
    if (!cands.length) {
      if (vertical) { const pn = cur.closest(".panel"); (pn?.querySelector(".jbody, .achlist") ?? pn)?.scrollBy({ top: sgn * 160, behavior: "smooth" }); }
      return;
    }
    const near = Math.min(...cands.map((c) => c.gap)) + 12;
    const best = cands.filter((c) => c.gap <= near).sort((p, q) => p.across - q.across || p.gap - q.gap)[0].el;
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: "nearest", behavior: "smooth" });
    this.audio.play("click");
  }
}
