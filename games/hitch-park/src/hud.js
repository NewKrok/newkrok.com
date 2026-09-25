import { M, PARK_HOLD, clamp, fmtTime, fmtPar } from "./config.js";
import { t, levelText } from "./i18n/index.js";

// ── HUD ──────────────────────────────────────────────────────────────────
// A 2D canvas over the WebGL view, drawn in CSS pixels (scaled for the
// device pixel ratio). Everything is laid out against the screen edges and
// scaled with `u` so it reads on a phone and on a big monitor.

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const C_PANEL = "rgba(10,14,22,0.72)";
const C_EDGE = "rgba(255,255,255,0.10)";
const C_TEXT = "#e8edf4";
const C_DIM = "#9aa6b6";
const C_GOLD = "#ffd166";
const C_OK = "#7ee787";
const C_BAD = "#ff6b6b";

export class Hud {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = 1; this.H = 1; this.dpr = 1; this.u = 1;
    this.floaters = [];
    this.banners = [];
  }

  resize(w, h) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = w; this.H = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.u = clamp(Math.min(w / 1000, h / 580), 0.62, 1.3);
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, t: 0, life: 1.4 });
    if (this.floaters.length > 20) this.floaters.shift();
  }
  banner(text, color, life = 1.6) {
    this.banners.push({ text, color, t: 0, life });
    if (this.banners.length > 3) this.banners.shift();
  }
  clearFx() { this.floaters = []; this.banners = []; }
  tick(dt) {
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < f.life);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.life);
  }

  // ── Drawing helpers ────────────────────────────────────────────────────
  #roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  #panel(x, y, w, h, r = 10, fill = C_PANEL) {
    const ctx = this.ctx;
    this.#roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = C_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  #text(s, x, y, size, color = C_TEXT, align = "left", weight = 600) {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  }

  // Left-aligned text shrunk to fit `maxW`.
  #fitText(str, x, y, size, color, maxW, weight) {
    const ctx = this.ctx;
    let sz = size;
    ctx.font = `${weight} ${sz}px ${FONT}`;
    while (sz > 8 && ctx.measureText(str).width > maxW) { sz -= 0.5; ctx.font = `${weight} ${sz}px ${FONT}`; }
    this.#text(str, x, y, sz, color, "left", weight);
  }

  // s: { sim, phase, clock, hold, levelIndex, levelCount, joy, pip, project, showStatus }
  draw(s) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (s.phase === "menu") return;
    if (s.pip) this.#drawPip(s);
    if (s.phase === "play") this.#drawNav(s);
    this.#drawFloaters(s);
    ctx.save();
    ctx.scale(this.u, this.u);
    const W = this.W / this.u, H = this.H / this.u;
    if (s.phase === "play" || s.phase === "paused" || s.phase === "done" || s.phase === "intro") this.#drawHud(s, W, H);
    this.#drawBanners(W);
    ctx.restore();
    if (s.joy) this.#drawJoystick(s.joy);
  }

  #drawHud(s, W, H) {
    const ctx = this.ctx;
    const sim = s.sim, L = sim.level;
    const small = W < 620;
    // Level + clock.
    const pw = small ? 220 : 270;
    this.#panel(12, 12, pw, 54);
    this.#fitText(`${s.levelIndex + 1} / ${s.levelCount}  ·  ${levelText(L).name.toUpperCase()}`, 26, 29, 11, C_DIM, pw - 100, 700);
    this.#fitText(levelText(L).title, 26, 49, 17, C_TEXT, pw - 100, 800);
    const over = s.clock > L.par;
    this.#text(fmtTime(s.clock), pw, 30, 19, over ? "#ffb347" : C_TEXT, "right", 800);
    this.#text(t("par", { t: fmtPar(L.par) }), pw, 50, 11, C_DIM, "right", 600);
    // Penalties.
    const bumps = sim.hits + sim.crashes;
    const bx = 12 + pw + 8;
    this.#panel(bx, 12, 140, 54);
    this.#text(t("hud_bumps"), bx + 14, 29, 10, C_DIM, "left", 700);
    this.#text(String(bumps), bx + 14, 49, 19, bumps ? C_BAD : C_TEXT, "left", 800);
    this.#text(t("hud_cones"), bx + 76, 29, 10, C_DIM, "left", 700);
    this.#text(String(sim.coneHits), bx + 76, 49, 19, sim.coneHits ? "#ffb347" : C_TEXT, "left", 800);

    // Instruments: steering wheel, hitch angle, gear + speed.
    const v = sim.veh;
    const ix = 12, iy = H - 98;
    this.#panel(ix, iy, 276, 86);
    const sx = ix + 44, sy = iy + 43;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(v.steer * 4.2);
    ctx.strokeStyle = "#c9d1dc";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-24, 3); ctx.lineTo(24, 3); ctx.moveTo(0, 3); ctx.lineTo(0, 24); ctx.stroke();
    ctx.fillStyle = "#c9d1dc"; ctx.beginPath(); ctx.arc(0, 3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_GOLD; ctx.fillRect(-2, -28, 4, 7);
    ctx.restore();
    const hx = ix + 150, hy = iy + 62, hr = 40;
    const rel = sim.hitchAngle();
    const HITCH_LIMIT = v.spec.hitchLimit, HITCH_WARN = v.spec.hitchWarn;
    ctx.lineWidth = 6;
    const arc = (a0, a1, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(hx, hy, hr, -Math.PI / 2 + a0, -Math.PI / 2 + a1); ctx.stroke(); };
    arc(-HITCH_LIMIT, -HITCH_WARN, "rgba(255,107,107,0.8)");
    arc(-HITCH_WARN, -0.45, "rgba(255,179,71,0.7)");
    arc(-0.45, 0.45, "rgba(126,231,135,0.55)");
    arc(0.45, HITCH_WARN, "rgba(255,179,71,0.7)");
    arc(HITCH_WARN, HITCH_LIMIT, "rgba(255,107,107,0.8)");
    const na = -Math.PI / 2 - rel;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(na) * (hr + 4), hy + Math.sin(na) * (hr + 4)); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
    const jk = Math.abs(rel) > HITCH_WARN;
    this.#text(jk ? t("hud_jack") : t("hud_hitch", { d: Math.round(Math.abs(rel) * 57.3) }), hx, iy + 76, 10, jk ? C_BAD : C_DIM, "center", 800);
    const gx = ix + 240;
    const rev = v.gear < 0;
    this.#text(rev ? "R" : "D", gx, iy + 32, 30, rev ? "#ffffff" : C_OK, "center", 900);
    const kmh = Math.abs(v.speed) / M * 3.6;
    this.#text(`${kmh.toFixed(0)} km/h`, gx, iy + 62, 12, C_DIM, "center", 700);
    if (v.holding && s.phase === "play") this.#text(t("hud_hold"), gx, iy + 77, 9, "#6f7b8c", "center", 800);

    // Parking status chips once the trailer is near the bay.
    const ps = sim.park;
    if (ps && ps.near && s.phase === "play") {
      const chips = [[t("chip_in"), ps.inside], [t("chip_square"), ps.aligned], [t("chip_stopped"), ps.stopped]];
      ctx.font = `800 11px ${FONT}`;
      const w = Math.max(88, ...chips.map(([l]) => ctx.measureText("✓ " + l).width + 22)), gap = 8;
      const x0 = small ? W - (w * 3 + gap * 2) - 12 : W / 2 - (w * 3 + gap * 2) / 2;
      const y = small ? H - 140 : H - 48;
      chips.forEach(([label, ok], i) => {
        this.#panel(x0 + i * (w + gap), y, w, 30, 15, ok ? "rgba(46,120,70,0.92)" : "rgba(20,26,36,0.85)");
        this.#text((ok ? "✓ " : "") + label, x0 + i * (w + gap) + w / 2, y + 15, 11, ok ? "#eaffea" : C_DIM, "center", 800);
      });
      if (s.hold > 0) {
        const f = clamp(s.hold / PARK_HOLD, 0, 1);
        const tw = w * 3 + gap * 2;
        this.#roundRect(x0, y - 9, tw, 4, 2); ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fill();
        this.#roundRect(x0, y - 9, tw * f, 4, 2); ctx.fillStyle = C_OK; ctx.fill();
      }
    }
  }

  // Off-screen target: an arrow at the screen edge with the distance.
  #drawNav(s) {
    const bay = s.sim.level.bay;
    const p = s.project(bay.x, bay.y, 0);
    const W = this.W, H = this.H, m = 70;
    const onScreen = p && p.x > m && p.x < W - m && p.y > m && p.y < H - m;
    if (onScreen) return;
    const cx = W / 2, cy = H / 2;
    // Direction from the screen centre to the (possibly behind-camera) bay.
    let dx, dy;
    if (p) { dx = p.x - cx; dy = p.y - cy; } else {
      const c = s.sim.veh.chassis.position;
      dx = bay.x - c.x; dy = bay.y - c.y;
    }
    const a = Math.atan2(dy, dx);
    const k = Math.min((W / 2 - m) / Math.max(1e-3, Math.abs(Math.cos(a))), (H / 2 - m) / Math.max(1e-3, Math.abs(Math.sin(a))));
    const x = cx + Math.cos(a) * k;
    let y = cy + Math.sin(a) * k;
    // Keep clear of the reversing camera inset.
    const r = s.pip;
    if (r && x > r.x - 40 && y < r.y + r.h + 40) y = r.y + r.h + 44;
    const ctx = this.ctx;
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 220);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(10,14,22,0.75)";
    ctx.beginPath(); ctx.arc(0, 0, 26 * this.u, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = C_GOLD;
    const u = this.u;
    ctx.beginPath(); ctx.moveTo(18 * u, 0); ctx.lineTo(4 * u, -10 * u); ctx.lineTo(4 * u, 10 * u); ctx.closePath(); ctx.fill();
    ctx.restore();
    const c = s.sim.veh.chassis.position;
    const dist = Math.hypot(bay.x - c.x, bay.y - c.y) / M;
    this.#text(`P ${Math.round(dist)} m`, x, y + 38 * this.u, 12 * this.u, C_GOLD, "center", 800);
  }

  #drawPip(s) {
    const ctx = this.ctx, r = s.pip;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 5;
    ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    ctx.strokeStyle = "rgba(220,230,240,0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    // Guide lines of a reversing camera: fixed distance bands plus the
    // steering-dependent bend.
    const cx = r.x + r.w / 2, by = r.y + r.h;
    const bend = -s.sim.veh.steer * r.w * 0.25;
    const band = (t) => {
      const y = by - t * r.h * 0.62;
      const half = r.w * (0.36 - t * 0.2);
      return { y, l: cx - half + bend * t * t, r: cx + half + bend * t * t };
    };
    const cols = ["#ff5c5c", "#ffd166", "#7ee787"];
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = band(i / 3), b = band((i + 1) / 3);
      ctx.strokeStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo(a.l, a.y); ctx.lineTo(b.l, b.y);
      ctx.moveTo(a.r, a.y); ctx.lineTo(b.r, b.y);
      ctx.moveTo(b.l, b.y); ctx.lineTo(b.l + 10, b.y);
      ctx.moveTo(b.r, b.y); ctx.lineTo(b.r - 10, b.y);
      ctx.stroke();
    }
    this.#roundRect(r.x + 6, r.y + 6, 62, 18, 4); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill();
    this.#text("● " + t("hud_rear"), r.x + 37, r.y + 15.5, 10, "#ff6b6b", "center", 800);
  }

  #drawFloaters(s) {
    const ctx = this.ctx;
    for (const f of this.floaters) {
      const p = s.project(f.x, f.y, 24);
      if (!p) continue;
      const k = f.t / f.life;
      ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.font = `900 ${Math.round(15 * this.u)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(f.text, p.x, p.y - k * 30);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y - k * 30);
    }
    ctx.globalAlpha = 1;
  }

  #drawBanners(W) {
    const ctx = this.ctx;
    for (const b of this.banners) {
      const k = b.t / b.life;
      ctx.globalAlpha = clamp(Math.min(k * 6, (1 - k) * 3), 0, 1);
      const sc = 1 + (1 - Math.min(1, k * 5)) * 0.3;
      ctx.save();
      ctx.translate(W / 2, 128);
      ctx.scale(sc, sc);
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.font = `900 46px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  #drawJoystick(j) {
    const ctx = this.ctx;
    const R = 58;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(j.ox, j.oy, R, 0, Math.PI * 2); ctx.stroke();
    const dx = clamp(j.x - j.ox, -R, R), dy = clamp(j.y - j.oy, -R, R);
    ctx.fillStyle = "rgba(255,209,102,0.85)";
    ctx.beginPath(); ctx.arc(j.ox + dx, j.oy + dy, 17, 0, Math.PI * 2); ctx.fill();
    this.#text("▲", j.ox, j.oy - 43, 12, "rgba(255,255,255,0.75)", "center", 800);
    this.#text("R", j.ox, j.oy + 43, 12, "rgba(255,255,255,0.75)", "center", 800);
    ctx.globalAlpha = 1;
  }
}
