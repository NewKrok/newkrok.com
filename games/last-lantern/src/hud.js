import { FPS, MAX_WEAPONS, MAX_PASSIVES, fmtSec, clamp } from "./config.js";
import { MAX_WLEVEL } from "./config.js";
import { PASSIVE_MAX } from "./sim/run.js";
import { drawIcon } from "./icons.js";
import { t, monsterName } from "./i18n/index.js";

// ── HUD ──────────────────────────────────────────────────────────────────
// A 2D canvas over the WebGL view: bars, belt, clock, boss bar, banners,
// damage numbers (projected from the 3D camera), edge arrows and the touch
// stick. Drawn in CSS pixels.

const FONT = '"Cinzel", "Georgia", serif';
const UI = '"Inter", system-ui, sans-serif';

export class Hud {
  constructor(cv) {
    this.cv = cv;
    this.c = cv.getContext("2d");
    this.W = 1; this.H = 1; this.dpr = 1;
    this.hpShown = 1;
    this.hurtT = 0;
  }
  resize(w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w; this.H = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
  }

  draw(R, { project, joy, settings, time, mode }) {
    const c = this.c, W = this.W, H = this.H;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!R || mode === "title") return;
    const h = R.hero;
    const small = W < 700;

    // Screen tints first, under everything.
    if (R.eclipse) { c.fillStyle = "rgba(10,6,30,0.25)"; c.fillRect(0, 0, W, H); }
    if (R.freeze > 0) { c.fillStyle = `rgba(120,190,255,${0.08 + 0.04 * Math.sin(time * 6)})`; c.fillRect(0, 0, W, H); }
    const low = h.hp / h.maxHp;
    if (low < 0.35 && R.phase === "play") {
      const k = (0.35 - low) / 0.35 * (0.6 + 0.4 * Math.sin(time * 6));
      const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, "rgba(120,0,0,0)"); g.addColorStop(1, `rgba(150,10,10,${0.45 * k})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    if (h.hitFlash > 0) { c.fillStyle = `rgba(255,40,40,${h.hitFlash / 8 * 0.18})`; c.fillRect(0, 0, W, H); }

    // Floaters.
    if (settings.numbers) {
      c.textAlign = "center"; c.textBaseline = "middle";
      for (const f of R.floaters) {
        const s = project(f.x, f.y, 30);
        if (s.behind || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) continue;
        const k = f.t / f.T;
        c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const size = Math.round(13 * f.scale * (k < 0.15 ? 0.7 + k * 2 : 1));
        c.font = `800 ${size}px ${UI}`;
        c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,0.75)";
        c.strokeText(f.text, s.x, s.y);
        c.fillStyle = f.color; c.fillText(f.text, s.x, s.y);
      }
      c.globalAlpha = 1;
    }

    // Hero health under the feet.
    const hs = project(h.body.position.x, h.body.position.y, 0);
    this.hpShown += (low - this.hpShown) * 0.2;
    if (R.phase === "play") {
      const bw = 38, bx = hs.x - bw / 2, by = hs.y + 14;
      c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(bx - 1, by - 1, bw + 2, 6);
      c.fillStyle = "#6a1a1a"; c.fillRect(bx, by, bw * this.hpShown, 4);
      c.fillStyle = low < 0.35 ? "#ff5a4a" : "#e5484d"; c.fillRect(bx, by, bw * low, 4);
    }

    // Arrows to elites, the boss and chests off screen.
    const arrow = (x, y, col, big) => {
      const s = project(x, y, 20);
      const m = 34;
      if (!s.behind && s.x > m && s.x < W - m && s.y > m && s.y < H - m) return;
      const cx = W / 2, cy = H / 2;
      let dx = s.x - cx, dy = s.y - cy;
      if (s.behind) { dx = -dx; dy = -dy; }
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
      c.save(); c.translate(ax, ay); c.rotate(a);
      c.fillStyle = col; c.globalAlpha = 0.9;
      const z = big ? 1.4 : 1;
      c.beginPath(); c.moveTo(12 * z, 0); c.lineTo(-7 * z, -8 * z); c.lineTo(-3 * z, 0); c.lineTo(-7 * z, 8 * z); c.closePath(); c.fill();
      c.restore();
    };
    for (const e of R.elites) if (e.alive) arrow(e.body.position.x, e.body.position.y, "#ff9a5a");
    if (R.boss?.alive) arrow(R.boss.body.position.x, R.boss.body.position.y, "#f85149", true);
    for (const p of R.pickups) if (p.kind === "chest") arrow(p.x, p.y, "#ffd166");
    c.globalAlpha = 1;

    // ── Top bar: experience ──
    const xpk = clamp(h.xp / h.xpNext, 0, 1);
    c.fillStyle = "rgba(6,8,14,0.75)"; c.fillRect(0, 0, W, 12);
    const xg = c.createLinearGradient(0, 0, W, 0);
    xg.addColorStop(0, "#2f6fd0"); xg.addColorStop(1, "#7ab8ff");
    c.fillStyle = xg; c.fillRect(0, 0, W * xpk, 10);
    c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(0, 0, W * xpk, 3);
    c.font = `800 11px ${UI}`; c.textAlign = "right"; c.textBaseline = "top";
    c.fillStyle = "#e8edf4"; c.fillText(t("hud_lv", { n: h.level }), W - 8, 0);

    // ── Top left: health and belt ──
    const x0 = 14, y0 = 22;
    const hbW = small ? 130 : 190;
    c.fillStyle = "rgba(6,8,14,0.7)"; roundRect(c, x0 - 4, y0 - 4, hbW + 8, 22, 6); c.fill();
    c.fillStyle = "#3a1414"; c.fillRect(x0, y0, hbW, 14);
    c.fillStyle = "#8a2a2a"; c.fillRect(x0, y0, hbW * this.hpShown, 14);
    const hg = c.createLinearGradient(0, y0, 0, y0 + 14);
    hg.addColorStop(0, "#ff7a6a"); hg.addColorStop(1, "#c8302a");
    c.fillStyle = hg; c.fillRect(x0, y0, hbW * low, 14);
    c.font = `700 11px ${UI}`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = "#fff";
    c.fillText(`${Math.ceil(h.hp)} / ${h.maxHp}`, x0 + 6, y0 + 7.5);
    const sz = small ? 24 : 30, gap = 4;
    let yy = y0 + 26;
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const w = h.weapons[i];
      const x = x0 + i * (sz + gap);
      slot(c, x, yy, sz, !!w, w?.evolved);
      if (w) {
        drawIcon(c, w.id, x + sz / 2, yy + sz / 2, sz * 0.72);
        pips(c, x, yy + sz + 2, sz, w.evolved ? 1 : w.level, w.evolved ? 1 : MAX_WLEVEL, w.evolved ? "#ffd166" : "#e8edf4");
      }
    }
    yy += sz + 8;
    const ps = Object.keys(h.passives);
    const psz = small ? 20 : 24;
    for (let i = 0; i < MAX_PASSIVES; i++) {
      const id = ps[i];
      const x = x0 + i * (psz + gap);
      slot(c, x, yy, psz, !!id);
      if (id) {
        drawIcon(c, id, x + psz / 2, yy + psz / 2, psz * 0.72);
        pips(c, x, yy + psz + 2, psz, h.passives[id], PASSIVE_MAX(id), "#9fd0ff");
      }
    }

    // ── Top centre: clock, the keeper's approach, boss bar ──
    const sec = R.clock / FPS, bossAt = R.stage.bossAt;
    c.textAlign = "center"; c.textBaseline = "top";
    c.font = `700 ${small ? 22 : 28}px ${FONT}`;
    c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,0.6)";
    const clock = fmtSec(sec);
    c.strokeText(clock, W / 2, 18); c.fillStyle = "#f4ead0"; c.fillText(clock, W / 2, 18);
    if (!R.bossSpawned) {
      const bw = small ? 140 : 220, bx = W / 2 - bw / 2, by = small ? 46 : 52;
      const k = clamp(sec / bossAt, 0, 1);
      c.fillStyle = "rgba(6,8,14,0.7)"; c.fillRect(bx - 1, by - 1, bw + 2, 6);
      c.fillStyle = "#b08a4a"; c.fillRect(bx, by, bw * k, 4);
      drawIcon(c, "skull", bx + bw + 10, by + 2, 14);
    } else if (R.boss?.alive) {
      const b = R.boss;
      const bw = Math.min(W - 40, small ? 300 : 520), bx = W / 2 - bw / 2, by = small ? 50 : 58;
      const k = clamp(b.hp / b.maxHp, 0, 1);
      c.fillStyle = "rgba(6,8,14,0.8)"; roundRect(c, bx - 3, by - 3, bw + 6, 16, 4); c.fill();
      const bg = c.createLinearGradient(0, by, 0, by + 10);
      bg.addColorStop(0, "#ff5a4a"); bg.addColorStop(1, "#9a1a14");
      c.fillStyle = bg; c.fillRect(bx, by, bw * k, 10);
      for (const m of [0.66, 0.33]) if (b.def.ai === "king") { c.fillStyle = "rgba(255,255,255,0.5)"; c.fillRect(bx + bw * m, by, 1.5, 10); }
      c.font = `700 12px ${FONT}`; c.fillStyle = "#f4ead0"; c.textBaseline = "top";
      c.fillText(monsterName(b.id).toUpperCase(), W / 2, by + 14);
    }

    // ── Top right: kills and embers ──
    c.textAlign = "right"; c.textBaseline = "middle"; c.font = `700 14px ${UI}`;
    const rx = W - 14;
    c.fillStyle = "#e8edf4";
    c.fillText(String(R.kills), rx - 20, 28); drawIcon(c, "skull", rx - 7, 28, 14);
    c.fillStyle = "#ffb347";
    c.fillText(String(R.embers), rx - 20, 50); drawIcon(c, "ember", rx - 7, 50, 14);

    // ── Banners ──
    let by = H * 0.26;
    for (const b of R.banners) {
      const k = b.t / b.T;
      const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      c.globalAlpha = a;
      const text = t(b.key, b.vars);
      const fs = Math.min(small ? 22 : 34, (W - 40) / Math.max(8, text.length) * 1.7);
      c.font = `700 ${fs}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,0.7)";
      c.strokeText(text, W / 2, by); c.fillStyle = b.color; c.fillText(text, W / 2, by);
      by += fs + 12;
    }
    c.globalAlpha = 1;

    // Flash.
    if (R.flash > 0.02) { c.fillStyle = `rgba(255,248,220,${R.flash * 0.55})`; c.fillRect(0, 0, W, H); }

    // Touch stick.
    if (joy) {
      c.globalAlpha = 0.5;
      c.strokeStyle = "#ffffff"; c.lineWidth = 2;
      c.beginPath(); c.arc(joy.ox, joy.oy, 50, 0, Math.PI * 2); c.stroke();
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), m = Math.min(1, 50 / (d || 1));
      c.fillStyle = "#ffd166";
      c.beginPath(); c.arc(joy.ox + dx * m, joy.oy + dy * m, 22, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
}
function slot(c, x, y, s, filled, gold) {
  c.fillStyle = filled ? "rgba(20,24,34,0.85)" : "rgba(10,12,18,0.5)";
  roundRect(c, x, y, s, s, 5); c.fill();
  c.strokeStyle = gold ? "#ffd166" : filled ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)";
  c.lineWidth = gold ? 2 : 1; c.stroke();
}
function pips(c, x, y, s, lv, max, col) {
  const w = (s - 2) / max;
  for (let i = 0; i < max; i++) {
    c.fillStyle = i < lv ? col : "rgba(255,255,255,0.15)";
    c.fillRect(x + 1 + i * w, y, Math.max(1, w - 1), 2.5);
  }
}
