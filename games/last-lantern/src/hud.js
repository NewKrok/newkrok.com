import { FPS, MAX_WEAPONS, MAX_PASSIVES, MAX_WLEVEL, fmtSec, clamp } from "./config.js";
import { PASSIVE_MAX } from "./sim/run.js";
import { drawIcon } from "./icons.js";
import { t, monsterName } from "./i18n/index.js";

// ── HUD ──────────────────────────────────────────────────────────────────
// A carved panel along the bottom: the health orb on the left, the lantern
// orb (the hero's ability charging) on the right, and between them the
// belt of weapons and relics under the experience bar. A plaque at the top
// holds the clock or the keeper's health. Drawn on a 2D canvas over the
// WebGL view in CSS pixels; the static stonework is cached per size.

const SERIF = '"Cinzel", "Georgia", serif';
const DECO = '"Cinzel Decorative", "Cinzel", serif';

const TAU = Math.PI * 2;
const PW = 760, PH = 118;               // panel design size

export class Hud {
  constructor(cv) {
    this.cv = cv;
    this.c = cv.getContext("2d");
    this.W = 1; this.H = 1; this.dpr = 1;
    this.hpShown = 1;
    this.frame = null;
    this.orbRects = { active: null };
  }
  resize(w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w; this.H = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.scale = clamp(Math.min((w - 16) / PW, (h / 720) * 0.86, 0.9), 0.46, 0.9);
    this.frame = null;
  }

  // Where the lantern orb sits in CSS px (the page puts its touch button there).
  activeRect() {
    const s = this.scale, px = this.W / 2 - (PW * s) / 2, py = this.H - PH * s - 6;
    return { x: px + (PW - 62) * s - 50 * s, y: py + 58 * s - 50 * s, size: 100 * s };
  }

  draw(R, { project, joy, settings, time, mode }) {
    const c = this.c, W = this.W, H = this.H;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (!R || mode === "title") return;
    const h = R.hero;
    const low = h.hp / h.maxHp;

    // Tints under everything.
    if (R.eclipse) { c.fillStyle = "rgba(10,6,30,0.25)"; c.fillRect(0, 0, W, H); }
    if (R.freeze > 0) { c.fillStyle = `rgba(120,190,255,${0.08 + 0.04 * Math.sin(time * 6)})`; c.fillRect(0, 0, W, H); }
    // A dark vignette frames the play field the way a lantern would.
    const vg = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.42, W / 2, H * 0.45, Math.max(W, H) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, low < 0.35 && R.phase === "play" ? `rgba(120,8,8,${0.4 + (settings.calm ? 0 : 0.15 * Math.sin(time * 3))})` : "rgba(0,0,0,0.5)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    if (h.hitFlash > 0 && !settings.calm) { c.fillStyle = `rgba(255,40,40,${h.hitFlash / 8 * 0.16})`; c.fillRect(0, 0, W, H); }

    this.#floaters(R, project, settings);

    // Health under the feet.
    const hs = project(h.body.position.x, h.body.position.y, 0);
    this.hpShown += (low - this.hpShown) * 0.15;
    if (R.phase === "play") {
      const bw = 36, bx = hs.x - bw / 2, by = hs.y + 14;
      c.fillStyle = "rgba(0,0,0,0.65)"; c.fillRect(bx - 1, by - 1, bw + 2, 5);
      c.fillStyle = low < 0.35 ? "#ff5a4a" : "#c8302a"; c.fillRect(bx, by, bw * low, 3);
    }

    this.#arrows(R, project);
    this.#plaque(R, time);
    this.#panel(R, time);
    this.#banners(R);

    // Screen flashes are soft and never strobe; none at all with reduced flashing.
    if (R.flash > 0.02 && !settings.calm) { c.fillStyle = `rgba(255,248,220,${Math.min(0.3, R.flash * 0.3)})`; c.fillRect(0, 0, W, H); }

    if (joy) {
      c.save();
      c.globalAlpha = 0.55;
      c.strokeStyle = "#d4a24c"; c.lineWidth = 2;
      c.beginPath(); c.arc(joy.ox, joy.oy, 50, 0, TAU); c.stroke();
      c.strokeStyle = "rgba(212,162,76,0.35)"; c.lineWidth = 8;
      c.beginPath(); c.arc(joy.ox, joy.oy, 44, 0, TAU); c.stroke();
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), m = Math.min(1, 50 / (d || 1));
      const g = c.createRadialGradient(joy.ox + dx * m - 6, joy.oy + dy * m - 6, 2, joy.ox + dx * m, joy.oy + dy * m, 22);
      g.addColorStop(0, "#ffe9b0"); g.addColorStop(1, "#b0741e");
      c.fillStyle = g; c.beginPath(); c.arc(joy.ox + dx * m, joy.oy + dy * m, 20, 0, TAU); c.fill();
      c.restore();
    }
  }

  #floaters(R, project, settings) {
    if (!settings.numbers) return;
    const c = this.c, W = this.W, H = this.H;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const f of R.floaters) {
      const s = project(f.x, f.y, 30);
      if (s.behind || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) continue;
      const k = f.t / f.T;
      c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const size = Math.round(15 * f.scale * (k < 0.15 ? 0.7 + k * 2 : 1));
      c.font = `700 ${size}px ${SERIF}`;
      c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,0.8)";
      c.strokeText(f.text, s.x, s.y);
      c.fillStyle = f.color; c.fillText(f.text, s.x, s.y);
    }
    c.globalAlpha = 1;
  }

  #arrows(R, project) {
    const c = this.c, W = this.W, H = this.H;
    const bottom = PH * this.scale + 10;
    const arrow = (x, y, col, big) => {
      const s = project(x, y, 20);
      const m = 34;
      if (!s.behind && s.x > m && s.x < W - m && s.y > m && s.y < H - bottom) return;
      const cx = W / 2, cy = (H - bottom) / 2;
      let dx = s.x - cx, dy = s.y - cy;
      if (s.behind) { dx = -dx; dy = -dy; }
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), ((H - bottom) / 2 - m) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
      c.save(); c.translate(ax, ay); c.rotate(a);
      const z = big ? 1.4 : 1;
      c.fillStyle = col; c.strokeStyle = "rgba(0,0,0,0.7)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(13 * z, 0); c.lineTo(-7 * z, -9 * z); c.lineTo(-2 * z, 0); c.lineTo(-7 * z, 9 * z); c.closePath(); c.stroke(); c.fill();
      c.restore();
    };
    for (const e of R.elites) if (e.alive) arrow(e.body.position.x, e.body.position.y, "#ff9a5a");
    if (R.boss?.alive) arrow(R.boss.body.position.x, R.boss.body.position.y, "#e0302a", true);
    for (const p of R.pickups) if (p.kind === "chest") arrow(p.x, p.y, p.relic ? "#c8a0ff" : "#ffd166", p.relic);
  }

  // ── Top plaque: the clock and the keeper's approach, or the keeper ──
  #plaque(R, time) {
    const c = this.c, W = this.W;
    const s = Math.min(1, this.scale * 1.05);
    const sec = R.clock / FPS, bossAt = R.stage.bossAt;
    c.save();
    c.translate(W / 2, 10);
    c.scale(s, s);
    if (R.boss?.alive) {
      const b = R.boss, k = clamp(b.hp / b.maxHp, 0, 1);
      const bw = Math.min(560, (this.W - 30) / s);
      ornateBar(c, -bw / 2, 8, bw, 22);
      const g = c.createLinearGradient(0, 12, 0, 26);
      g.addColorStop(0, "#e04030"); g.addColorStop(0.5, "#9a1810"); g.addColorStop(1, "#5a0806");
      c.fillStyle = g; c.fillRect(-bw / 2 + 6, 12, (bw - 12) * k, 14);
      c.fillStyle = "rgba(255,200,160,0.25)"; c.fillRect(-bw / 2 + 6, 12, (bw - 12) * k, 3);
      if (b.def.ai === "king") for (const m of [0.66, 0.33]) { c.fillStyle = "rgba(255,230,190,0.6)"; c.fillRect(-bw / 2 + 6 + (bw - 12) * m, 12, 1.5, 14); }
      c.font = `700 15px ${DECO}`; c.textAlign = "center"; c.textBaseline = "top";
      c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,0.8)";
      const name = monsterName(b.id);
      c.strokeText(name, 0, 34); c.fillStyle = "#f0d8a8"; c.fillText(name, 0, 34);
    } else {
      // Plaque with the clock.
      const pw = 150, ph = 40;
      plaqueShape(c, -pw / 2, 0, pw, ph);
      c.font = `700 24px ${SERIF}`; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#f3e3bf";
      c.shadowColor = "rgba(255,170,60,0.6)"; c.shadowBlur = 8;
      c.fillText(fmtSec(sec), 0, ph / 2 + 1);
      c.shadowBlur = 0;
      if (!R.bossSpawned) {
        // A chain of links fills as the keeper nears; a skull waits at the end.
        const k = clamp(sec / bossAt, 0, 1), n = 16, lw = 11;
        const x0 = -(n * lw) / 2;
        for (let i = 0; i < n; i++) {
          const on = i / n < k;
          c.strokeStyle = on ? (i / n > 0.8 ? "#e05030" : "#c9913a") : "rgba(160,140,110,0.35)";
          c.lineWidth = 2;
          c.beginPath(); c.ellipse(x0 + i * lw + lw / 2, ph + 10, lw * 0.6, i % 2 ? 2.2 : 3.6, 0, 0, TAU); c.stroke();
        }
        drawIcon(c, "skull", -x0 + 12, ph + 10, 14 + (k > 0.9 ? Math.sin(time * 8) * 2 : 0));
      }
    }
    c.restore();
  }

  // ── Bottom panel ──
  #panel(R, time) {
    const c = this.c, s = this.scale, h = R.hero;
    const px = this.W / 2 - (PW * s) / 2, py = this.H - PH * s - 6;
    if (!this.frame) this.frame = buildFrame(s, this.dpr);
    c.drawImage(this.frame, px - 10 * s, py - 30 * s, (PW + 20) * s, (PH + 36) * s);
    c.save();
    c.translate(px, py);
    c.scale(s, s);
    // Orbs.
    const low = clamp(h.hp / h.maxHp, 0, 1);
    orb(c, 62, 58, 46, low, ["#ff5a48", "#a0140e", "#3a0404"], time, 0);
    const k = 1 - clamp(h.activeCd / Math.max(1, h.activeMax * h.stats.cdMul), 0, 1);
    const ready = h.activeCd <= 0;
    orb(c, PW - 62, 58, 46, k, ready ? ["#fff0b0", "#e0a030", "#6a3a08"] : ["#e8c070", "#9a6a20", "#3a2206"], time, 1.7);
    drawIcon(c, R.heroDef.active, PW - 62, 56, 44);
    if (ready) {
      c.strokeStyle = `rgba(255,220,130,${0.5 + 0.4 * Math.sin(time * 5)})`; c.lineWidth = 3;
      c.beginPath(); c.arc(PW - 62, 58, 49, 0, TAU); c.stroke();
    }
    c.font = `700 13px ${SERIF}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,0.85)";
    const hpText = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    c.strokeText(hpText, 62, 60); c.fillStyle = "#fff0e0"; c.fillText(hpText, 62, 60);
    if (!("ontouchstart" in window)) {
      c.font = `600 10px ${SERIF}`; c.fillStyle = "rgba(240,220,180,0.75)";
      c.fillText(t("hud_space"), PW - 62, 100);
    }

    // Experience bar across the belt.
    const bx = 128, bw = PW - 256, by = 10;
    const xk = clamp(h.xp / h.xpNext, 0, 1);
    c.fillStyle = "#0a0806"; c.fillRect(bx, by, bw, 9);
    const g = c.createLinearGradient(0, by, 0, by + 9);
    g.addColorStop(0, "#9fd0ff"); g.addColorStop(0.5, "#3a7ad0"); g.addColorStop(1, "#1a3a78");
    c.fillStyle = g; c.fillRect(bx, by, bw * xk, 9);
    for (let i = 1; i < 10; i++) { c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(bx + (bw * i) / 10, by, 1, 9); }
    c.strokeStyle = "#8a6a34"; c.lineWidth = 1.5; c.strokeRect(bx - 0.5, by - 0.5, bw + 1, 10);

    // Level medallion, kills and embers.
    medallion(c, PW / 2, by + 4, 17);
    c.font = `700 16px ${SERIF}`; c.fillStyle = "#ffe6b0"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(String(h.level), PW / 2, by + 5);
    c.font = `700 14px ${SERIF}`;
    c.textAlign = "right"; c.fillStyle = "#e8dcc4"; c.fillText(String(R.kills), PW / 2 - 40, by + 28);
    drawIcon(c, "skull", PW / 2 - 30, by + 28, 13);
    c.textAlign = "left"; c.fillStyle = "#ffb85a"; c.fillText(String(R.embers), PW / 2 + 40, by + 28);
    drawIcon(c, "ember", PW / 2 + 30, by + 28, 13);

    // The belt: weapons on the upper row, relics below.
    const ws = 36, gap = 5, wrow = MAX_WEAPONS * (ws + gap) - gap;
    let x0 = PW / 2 - wrow / 2, y0 = 46;
    // Split the rows either side of the counters: weapons row spans centre.
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const w = h.weapons[i], x = x0 + i * (ws + gap);
      slot(c, x, y0, ws, !!w, w?.evolved);
      if (w) {
        drawIcon(c, w.id, x + ws / 2, y0 + ws / 2, ws * 0.72);
        pips(c, x + 3, y0 + ws - 5, ws - 6, w.evolved ? 1 : w.level, w.evolved ? 1 : MAX_WLEVEL, w.evolved ? "#ffd166" : "#f0dcb0");
      }
    }
    const ps = Object.keys(h.passives), pz = 24, prow = MAX_PASSIVES * (pz + gap) - gap;
    x0 = PW / 2 - prow / 2; y0 = 88;
    // Relics: two gold-rimmed diamonds either side of the relic row.
    for (let i = 0; i < 2; i++) {
      const id = R.relics[i], cx = i === 0 ? x0 - 24 : x0 + prow + 24, cy = y0 + pz / 2;
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4);
      c.fillStyle = id ? "#2a1e14" : "#120c0e"; c.fillRect(-11, -11, 22, 22);
      c.strokeStyle = id ? "#ffd166" : "rgba(212,162,76,0.35)"; c.lineWidth = id ? 2 : 1.2; c.strokeRect(-11, -11, 22, 22);
      c.restore();
      if (id) drawIcon(c, id, cx, cy, 20);
    }
    for (let i = 0; i < MAX_PASSIVES; i++) {
      const id = ps[i], x = x0 + i * (pz + gap);
      slot(c, x, y0, pz, !!id);
      if (id) {
        drawIcon(c, id, x + pz / 2, y0 + pz / 2, pz * 0.74);
        pips(c, x + 2, y0 + pz - 4, pz - 4, h.passives[id], PASSIVE_MAX(id), "#9fd0ff");
      }
    }
    c.restore();
  }

  #banners(R) {
    const c = this.c, W = this.W;
    let by = this.H * 0.24;
    const small = W < 700;
    for (const b of R.banners) {
      const k = b.t / b.T;
      const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      c.globalAlpha = a;
      const text = t(b.key, b.vars);
      const fs = Math.min(small ? 22 : 34, (W - 60) / Math.max(8, text.length) * 1.6);
      c.font = `700 ${fs}px ${DECO}`; c.textAlign = "center"; c.textBaseline = "middle";
      const tw = c.measureText(text).width;
      // Flourishes either side.
      c.strokeStyle = b.color; c.lineWidth = 1.5;
      for (const sgn of [-1, 1]) {
        const x1 = W / 2 + sgn * (tw / 2 + 14), x2 = W / 2 + sgn * (tw / 2 + 70);
        c.beginPath(); c.moveTo(x1, by); c.lineTo(x2, by); c.stroke();
        c.beginPath(); c.moveTo(x1 + sgn * 6, by - 5); c.lineTo(x1, by); c.lineTo(x1 + sgn * 6, by + 5); c.stroke();
        c.fillStyle = b.color; c.beginPath(); c.arc(x2, by, 2.5, 0, TAU); c.fill();
      }
      c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,0.75)";
      c.strokeText(text, W / 2, by);
      c.shadowColor = b.color; c.shadowBlur = 14;
      c.fillStyle = b.color; c.fillText(text, W / 2, by);
      c.shadowBlur = 0;
      by += fs + 14;
    }
    c.globalAlpha = 1;
  }
}

// ── Stonework ────────────────────────────────────────────────────────────
// The panel's static frame: carved stone, gold trim, rivets, and the
// sockets the orbs sit in, painted once per size.
function buildFrame(s, dpr) {
  const w = PW + 20, h = PH + 36;
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * s * dpr); cv.height = Math.round(h * s * dpr);
  const c = cv.getContext("2d");
  c.scale(s * dpr, s * dpr);
  c.translate(10, 30);
  // Main slab: a low arch in the middle rising over the level medallion.
  const slab = () => {
    c.beginPath();
    c.moveTo(0, PH);
    c.lineTo(0, 30);
    c.quadraticCurveTo(10, 8, 60, 6);
    c.lineTo(PW / 2 - 60, 6);
    c.quadraticCurveTo(PW / 2, -22, PW / 2 + 60, 6);
    c.lineTo(PW - 60, 6);
    c.quadraticCurveTo(PW - 10, 8, PW, 30);
    c.lineTo(PW, PH);
    c.closePath();
  };
  slab();
  const g = c.createLinearGradient(0, -20, 0, PH);
  g.addColorStop(0, "#3a3036"); g.addColorStop(0.35, "#221c20"); g.addColorStop(1, "#0e0b0d");
  c.fillStyle = g; c.fill();
  // Stone grain.
  c.save(); slab(); c.clip();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rnd() < 0.5 ? "rgba(255,240,220,0.035)" : "rgba(0,0,0,0.18)";
    c.fillRect(rnd() * PW, rnd() * PH - 20, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  // Mortar lines of the carved blocks.
  c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 1;
  for (const x of [130, 250, PW - 250, PW - 130]) { c.beginPath(); c.moveTo(x, 30); c.lineTo(x, PH); c.stroke(); }
  c.restore();
  // Gold trim.
  c.strokeStyle = "#b8873a"; c.lineWidth = 2.5; slab(); c.stroke();
  c.strokeStyle = "rgba(255,220,150,0.25)"; c.lineWidth = 1;
  c.save(); c.translate(0, 4); c.scale(1, 0.97); slab(); c.stroke(); c.restore();
  // Belt recess.
  const rx = 118, rw = PW - 236;
  c.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(c, rx, 40, rw, 76, 8); c.fill();
  c.strokeStyle = "#6a4e26"; c.lineWidth = 1.5; c.stroke();
  // Orb sockets: iron rings with rivets and little wings.
  for (const [ox, flip] of [[62, 1], [PW - 62, -1]]) {
    // Wing.
    c.save(); c.translate(ox, 58); c.scale(flip, 1);
    c.fillStyle = "#1a1416"; c.strokeStyle = "#8a6a34"; c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(40, -38); c.quadraticCurveTo(80, -58, 104, -34); c.quadraticCurveTo(86, -30, 78, -18);
    c.quadraticCurveTo(70, -20, 60, -10); c.closePath(); c.fill(); c.stroke();
    c.restore();
    const rg = c.createRadialGradient(ox, 58, 44, ox, 58, 60);
    rg.addColorStop(0, "#2a2226"); rg.addColorStop(0.5, "#5a4a3e"); rg.addColorStop(1, "#1a1416");
    c.fillStyle = rg;
    c.beginPath(); c.arc(ox, 58, 58, 0, TAU); c.arc(ox, 58, 46, 0, TAU, true); c.fill();
    c.strokeStyle = "#b8873a"; c.lineWidth = 2;
    c.beginPath(); c.arc(ox, 58, 58, 0, TAU); c.stroke();
    c.beginPath(); c.arc(ox, 58, 46.5, 0, TAU); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const x = ox + Math.cos(a) * 52, y = 58 + Math.sin(a) * 52;
      const rv = c.createRadialGradient(x - 1, y - 1, 0, x, y, 3);
      rv.addColorStop(0, "#f0d090"); rv.addColorStop(1, "#6a4a1a");
      c.fillStyle = rv; c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill();
    }
  }
  return cv;
}

// A glass orb filled to `k` with a liquid that sways.
function orb(c, x, y, r, k, [hi, mid, lo], time, phase) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.fillStyle = "#070506"; c.fillRect(x - r, y - r, r * 2, r * 2);
  const top = y + r - k * r * 2;
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.2, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, hi); g.addColorStop(0.55, mid); g.addColorStop(1, lo);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - r, y + r);
  for (let i = 0; i <= 24; i++) {
    const xx = x - r + (i / 24) * r * 2;
    const yy = top + Math.sin(time * 2.4 + phase + i * 0.5) * 2.2 + Math.sin(time * 1.3 + i * 0.9) * 1.2;
    c.lineTo(xx, k >= 0.995 ? y - r : yy);
  }
  c.lineTo(x + r, y + r);
  c.closePath();
  c.fill();
  // Bubbles.
  for (let i = 0; i < 5; i++) {
    const by = y + r - ((time * 18 + i * 23 + phase * 40) % (r * 2));
    if (by < top) continue;
    c.fillStyle = "rgba(255,255,255,0.18)";
    c.beginPath(); c.arc(x - r * 0.5 + ((i * 37) % (r)), by, 1.5 + (i % 2), 0, TAU); c.fill();
  }
  // Glass: inner shadow and a highlight.
  const sh = c.createRadialGradient(x, y, r * 0.6, x, y, r);
  sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.55)");
  c.fillStyle = sh; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.fillStyle = "rgba(255,255,255,0.22)";
  c.beginPath(); c.ellipse(x - r * 0.32, y - r * 0.45, r * 0.34, r * 0.18, -0.6, 0, TAU); c.fill();
  c.fillStyle = "rgba(255,255,255,0.5)";
  c.beginPath(); c.arc(x - r * 0.45, y - r * 0.5, r * 0.06, 0, TAU); c.fill();
}

function medallion(c, x, y, r) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, "#5a4428"); g.addColorStop(1, "#1a120a");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = "#d4a24c"; c.lineWidth = 2; c.stroke();
  c.strokeStyle = "rgba(255,220,150,0.3)"; c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, r - 4, 0, TAU); c.stroke();
}

function plaqueShape(c, x, y, w, h) {
  c.beginPath();
  c.moveTo(x + 14, y); c.lineTo(x + w - 14, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w - 14, y + h);
  c.lineTo(x + 14, y + h); c.lineTo(x, y + h / 2); c.closePath();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#3a3036"); g.addColorStop(1, "#140f12");
  c.fillStyle = g; c.fill();
  c.strokeStyle = "#b8873a"; c.lineWidth = 2; c.stroke();
  c.strokeStyle = "rgba(255,220,150,0.2)"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + 18, y + 4); c.lineTo(x + w - 18, y + 4); c.stroke();
}

function ornateBar(c, x, y, w, h) {
  c.fillStyle = "rgba(10,6,8,0.85)";
  roundRect(c, x, y, w, h, 4); c.fill();
  c.strokeStyle = "#b8873a"; c.lineWidth = 2; c.stroke();
  for (const ex of [x, x + w]) {
    c.fillStyle = "#b8873a";
    c.beginPath(); c.moveTo(ex, y - 4); c.lineTo(ex + (ex === x ? -10 : 10), y + h / 2); c.lineTo(ex, y + h + 4); c.closePath(); c.fill();
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
  const g = c.createLinearGradient(0, y, 0, y + s);
  g.addColorStop(0, filled ? "#2a2024" : "#141012"); g.addColorStop(1, filled ? "#120c0e" : "#0a0809");
  c.fillStyle = g;
  roundRect(c, x, y, s, s, 4); c.fill();
  c.strokeStyle = gold ? "#ffd166" : filled ? "#8a6a34" : "rgba(138,106,52,0.35)";
  c.lineWidth = gold ? 2 : 1.2; c.stroke();
  if (gold) { c.shadowColor = "#ffb040"; c.shadowBlur = 8; c.stroke(); c.shadowBlur = 0; }
}
function pips(c, x, y, w, lv, max, col) {
  const pw = w / max;
  for (let i = 0; i < max; i++) {
    c.fillStyle = i < lv ? col : "rgba(255,255,255,0.12)";
    c.fillRect(x + i * pw + 0.5, y, Math.max(1, pw - 1), 2.5);
  }
}
