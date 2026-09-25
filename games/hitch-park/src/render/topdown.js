import { M, VEHICLES, TRAILERS, CAR_TYPES, PLAYER_COLOR, lcg } from "../config.js";

// ── Top-down 2D drawing ──────────────────────────────────────────────────
// The ground of every site (surface, paint, water, gravel) is baked into a
// canvas that becomes the 3D ground texture. The same painter draws the
// level thumbnails in the level select and the rig icons in the menus.

export const hexCss = (h) => "#" + (h >>> 0).toString(16).padStart(6, "0");
export function shade(hex, k) {
  // k < 0 darkens, k > 0 lightens.
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export class Painter {
  constructor(ctx) { this.ctx = ctx; }
  poly(pts, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  circle(x, y, r, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  line(pts, color, width = 1, alpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.globalAlpha = alpha;
    c.strokeStyle = hexCss(color);
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
    c.globalAlpha = 1;
  }
}

// Local shapes → flat world point arrays.
export function xform(x, y, a, pts) {
  const c = Math.cos(a), s = Math.sin(a);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const lx = pts[i], ly = pts[i + 1];
    out[i] = x + lx * c - ly * s;
    out[i + 1] = y + lx * s + ly * c;
  }
  return out;
}
export function rectPts(x0, y0, x1, y1) { return [x0, y0, x1, y0, x1, y1, x0, y1]; }
function rrectPts(cx, cy, l, w, r, seg = 3) {
  const out = [];
  const hl = l / 2, hw = w / 2;
  r = Math.min(r, hl, hw);
  const corners = [[hl - r, hw - r, 0], [-hl + r, hw - r, Math.PI / 2], [-hl + r, -hw + r, Math.PI], [hl - r, -hw + r, Math.PI * 1.5]];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * Math.PI / 2;
      out.push(cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r);
    }
  }
  return out;
}

// ── Car, top-down ────────────────────────────────────────────────────────
// `spec` in metres; drawn in px around (x, y, a). Front is +x.
// ── Vehicles, top-down ───────────────────────────────────────────────────
// `spec` in metres; drawn in px around (x, y, a). Front is +x.
export function drawCarTop(p, spec, color, x, y, a) {
  const L = spec.len * M, W = spec.wid * M;
  const P = (pts) => xform(x, y, a, pts);
  p.poly(xform(x + 1.8, y + 2.6, a, rrectPts(0, 0, L + 1, W + 1, 4)), 0x000000, 0.28);
  if (spec.lorry || spec.tractor) {
    // Cab at the front, box body (or chassis) behind.
    const cab = (spec.tractor ? 0.42 : 0.26) * L;
    p.poly(P(rrectPts(L / 2 - cab / 2, 0, cab, W, 2.5, 2)), color, 1, shade(color, -0.45), 0.8);
    p.poly(P(rectPts(L / 2 - cab + 1, -W / 2 + 2, L / 2 - cab + 5, W / 2 - 2)), 0x1b2430);
    if (spec.lorry) p.poly(P(rectPts(-L / 2, -W / 2, L / 2 - cab - 1, W / 2)), 0xe8e8e4, 1, 0x8a8f96, 1);
    else {
      p.poly(P(rectPts(-L / 2, -W / 2 + 4, L / 2 - cab, W / 2 - 4)), 0x2a2d33);
      p.circle(...xform(x, y, a, [-L * 0.28, 0]), W * 0.26, 0x4a4f55);
    }
    return;
  }
  p.poly(P(rrectPts(0, 0, L, W, 4.2, 3)), color, 1, shade(color, -0.45), 0.8);
  const X = (f) => L / 2 - f * L;
  const ws = X(spec.ws), rf = X(spec.rf), rb = X(spec.rb), rg = X(spec.rg);
  const gw = W * 0.86, rw = W * 0.74;
  p.poly(P([ws, -gw / 2 + 1.5, ws, gw / 2 - 1.5, rf, rw / 2 + 0.6, rb, rw / 2 + 0.6, rg, gw / 2 - 1.2, rg, -gw / 2 + 1.2, rb, -rw / 2 - 0.6, rf, -rw / 2 - 0.6]), 0x1b2430);
  p.poly(P(rrectPts((rf + rb) / 2, 0, rf - rb, rw, 2.2, 2)), shade(color, spec === CAR_TYPES.van ? 0.08 : -0.08));
  if (spec.bed) p.poly(P(rrectPts(X(0.78), 0, 0.4 * L, W * 0.8, 1.5, 1)), 0x2a2c30, 1, shade(color, -0.4), 1);
}

export function drawTrailerTop(p, key, x, y, a, color = 0xd6d9de) {
  const t = TRAILERS[key];
  const L = t.len * M, W = t.wid * M;
  const P = (pts) => xform(x, y, a, pts);
  p.poly(xform(x + 1.8, y + 2.6, a, rrectPts(0, 0, L + 1, W + 1, key === "caravan" ? 5 : 1.5)), 0x000000, 0.26);
  if (t.bar > 0) {
    const cx = (L / 2 + t.bar * M);
    p.line(P([L / 2 - 2, -W * 0.3, cx - 1.5, 0, L / 2 - 2, W * 0.3]), 0x2a2e35, 2.2);
  }
  if (key === "box") {
    p.poly(P(rectPts(-L / 2, -W / 2, L / 2, W / 2)), 0x59606a, 1, 0x2b3038, 1);
    p.poly(P(rrectPts(-1, 0, L * 0.72, W * 0.7, 3, 2)), 0x2f6d57, 1, 0x1d4536, 0.8);
  } else if (key === "boat") {
    const hull = [L / 2 + 2, 0, L * 0.28, W / 2, -L / 2 + 1, W / 2 - 0.6, -L / 2 + 1, -W / 2 + 0.6, L * 0.28, -W / 2];
    p.poly(P(hull), 0xf4f3ee, 1, 0x1f5a8a, 1.6);
    p.poly(P([L * 0.16, -W * 0.3, L * 0.22, 0, L * 0.16, W * 0.3, L * 0.1, W * 0.3, L * 0.14, 0, L * 0.1, -W * 0.3]), 0x2c4a63, 0.9);
  } else if (key === "semi") {
    p.poly(P(rectPts(-L / 2, -W / 2, L / 2, W / 2)), color, 1, shade(color, -0.35), 1);
    for (let k = 1; k < 6; k++) p.line(P([-L / 2 + (L * k) / 6, -W / 2 + 1, -L / 2 + (L * k) / 6, W / 2 - 1]), shade(color, -0.15), 0.8);
  } else {
    p.poly(P(rrectPts(0, 0, L, W, 4.5, 3)), 0xf3f1ea, 1, 0x9a968c, 0.8);
    p.poly(P(rrectPts(-L * 0.1, 0, L * 0.18, W * 0.42, 1.5, 1)), 0xd9dde2, 1, 0xa7adb5, 0.6);
    p.line(P([-L / 2 + 3, -W / 2 + 0.6, L / 2 - 4, -W / 2 + 0.6]), 0xc0392b, 1.2);
    p.line(P([-L / 2 + 3, W / 2 - 0.6, L / 2 - 4, W / 2 - 0.6]), 0xc0392b, 1.2);
  }
}

const TRACTOR_TOP = { ...VEHICLES.truck, tractor: true };

// The player's rig at a pose (car centre at x, y).
export function drawRigTop(p, vehicle, trailer, x, y, a) {
  const v = VEHICLES[vehicle], t = TRAILERS[trailer];
  const d = (-v.hitchX + t.len / 2 + t.bar) * M;
  const drawTrailer = () => drawTrailerTop(p, trailer, x - Math.cos(a) * d, y - Math.sin(a) * d, a, trailer === "semi" ? 0xe8e8e4 : undefined);
  const drawCar = () => drawCarTop(p, vehicle === "truck" ? TRACTOR_TOP : CAR_TYPES[v.body ?? "wagon"], PLAYER_COLOR, x, y, a);
  // A semi-trailer's nose sits over the tractor's fifth wheel: tractor first.
  if (trailer === "semi") { drawCar(); drawTrailer(); } else { drawTrailer(); drawCar(); }
}

// Car + trailer rig, centred on (x, y) and scaled to fit `maxW`.
export function drawRigIcon(ctx, vehicle, trailer, x, y, maxW) {
  const v = VEHICLES[vehicle], t = TRAILERS[trailer];
  const d = (-v.hitchX + t.len / 2 + t.bar) * M;
  const front = v.len / 2 * M, back = d + t.len / 2 * M;
  const total = front + back;
  const s = Math.min(2, maxW / total);
  ctx.save();
  ctx.translate(x - (front - back) / 2 * s, y);
  ctx.scale(s, s);
  drawRigTop(new Painter(ctx), vehicle, trailer, 0, 0, 0);
  ctx.restore();
}

// ── Ground ───────────────────────────────────────────────────────────────
// Each surface kind is a small tile, used as a repeating pattern, so
// rectangles, polygons and road strokes all get the same texture.
const SURF = {
  asphalt:  { base: "#3f4247", dots: ["#2a2c2f", "#5b5e63", "#4a4d52"], a: 0.22, size: 1.3 },
  tarmac:   { base: "#33363a", dots: ["#26282b", "#4a4d52"], a: 0.2, size: 1.3 },
  concrete: { base: "#8f918f", dots: ["#7a7c7a", "#a8aaa6", "#858783"], a: 0.14, size: 1.4, joints: 64 },
  pavement: { base: "#a39e94", dots: ["#8f8a80"], a: 0.1, size: 1.2, tiles: 16 },
  cobble:   { base: "#7d746a", cobbles: true },
  grass:    { base: "#5d8b3b", dots: ["#3f6d27", "#7aa84d", "#4d7c30", "#8fbf5a"], a: 0.24, size: 2.2 },
  gravel:   { base: "#b2a27c", dots: ["#8c7d5a", "#d2c49e", "#9d8f6a"], a: 0.38, size: 1.6 },
  dirt:     { base: "#8a6a48", dots: ["#6f5236", "#a3825a", "#7a5c3e"], a: 0.28, size: 2 },
  mud:      { base: "#5e4630", dots: ["#4a3624", "#6f5236"], a: 0.3, size: 2.4 },
  sand:     { base: "#d9c48e", dots: ["#c9b27a", "#ead8a4", "#bfa870"], a: 0.28, size: 1.5 },
  snow:     { base: "#e8eef4", dots: ["#d3dde8", "#ffffff", "#c9d4e0"], a: 0.35, size: 2.4 },
  water:    { base: "#23657f", water: true },
  ramp:     { base: "#86826f", grooves: 5 },
  deck:     { base: "#5a6068", dots: ["#4a4f55", "#6b7179"], a: 0.2, size: 1.4, joints: 48 },
};

function makeTile(kind, S) {
  const spec = SURF[kind] ?? SURF.asphalt;
  const T = 128;
  const c = makeCanvas(Math.round(T * S), Math.round(T * S));
  const ctx = c.getContext("2d");
  ctx.scale(S, S);
  const rnd = lcg(kind.length * 977 + 13);
  ctx.fillStyle = spec.base;
  ctx.fillRect(0, 0, T, T);
  if (spec.dots) {
    const n = Math.round(T * T / (spec.size * spec.size * 4));
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = spec.a * (0.5 + rnd());
      ctx.fillStyle = spec.dots[i % spec.dots.length];
      const s = spec.size * (0.5 + rnd());
      ctx.fillRect(rnd() * T, rnd() * T, s, s);
    }
    ctx.globalAlpha = 1;
  }
  if (spec.joints) {
    ctx.strokeStyle = "rgba(40,42,46,0.28)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0, 0, spec.joints, spec.joints);
    ctx.strokeRect(spec.joints, spec.joints, spec.joints, spec.joints);
  }
  if (spec.tiles) {
    ctx.strokeStyle = "rgba(90,86,78,0.35)";
    ctx.lineWidth = 0.8;
    for (let k = 0; k <= T; k += spec.tiles) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, T); ctx.moveTo(0, k); ctx.lineTo(T, k); ctx.stroke(); }
  }
  if (spec.cobbles) {
    for (let yy = 0; yy < T; yy += 6) for (let xx = (yy / 6) % 2 ? 3 : 0; xx < T; xx += 6) {
      const v = 100 + Math.floor(rnd() * 40);
      ctx.fillStyle = `rgb(${v + 20},${v + 10},${v})`;
      ctx.beginPath(); ctx.ellipse(xx + 3, yy + 3, 2.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (spec.water) {
    const g = ctx.createLinearGradient(0, 0, 0, T);
    g.addColorStop(0, "#1f5d77"); g.addColorStop(0.5, "#2a7390"); g.addColorStop(1, "#1f5d77");
    ctx.fillStyle = g; ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = "rgba(200,235,245,0.18)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const x = rnd() * T, y = rnd() * T;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y - 2, x + 12, y); ctx.stroke();
    }
  }
  if (spec.grooves) {
    ctx.strokeStyle = "rgba(50,48,40,0.45)";
    ctx.lineWidth = 1;
    for (let yy = 2; yy < T; yy += spec.grooves) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(T, yy); ctx.stroke(); }
  }
  return c;
}

function surfaceStyle(ctx, kind, S, cache) {
  if (!cache.has(kind)) {
    const pat = ctx.createPattern(makeTile(kind, S), "repeat");
    pat.setTransform?.(new DOMMatrix().scaleSelf(1 / S, 1 / S));
    cache.set(kind, pat);
  }
  return cache.get(kind);
}

function paintBay(ctx, b, color, width = 1.5) {
  // Two side lines and the back line (the open end faces `a`).
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(b.l / 2, -b.w / 2); ctx.lineTo(-b.l / 2, -b.w / 2); ctx.lineTo(-b.l / 2, b.w / 2); ctx.lineTo(b.l / 2, b.w / 2);
  ctx.stroke();
  ctx.restore();
}

function paintArrow(ctx, x, y, a, color, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(4, -8); ctx.lineTo(4, -3); ctx.lineTo(-12, -3); ctx.lineTo(-12, 3); ctx.lineTo(4, 3); ctx.lineTo(4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function shapePath(ctx, s) {
  ctx.beginPath();
  if (s.poly) {
    ctx.moveTo(s.poly[0][0], s.poly[0][1]);
    for (const [x, y] of s.poly.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
  } else if (s.rad != null) {
    ctx.arc(s.x, s.y, s.rad, 0, Math.PI * 2);
  } else if (ctx.roundRect && s.r) ctx.roundRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, s.r);
  else ctx.rect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
}

// An irregular blob inscribed in a rectangle (mud patches).
function blobPath(ctx, x0, y0, x1, y1, seed, shrink = 1) {
  const rnd = lcg(seed);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 * shrink, ry = (y1 - y0) / 2 * shrink;
  const n = 18, k = [];
  for (let i = 0; i < n; i++) k.push(0.78 + rnd() * 0.22);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, f = k[i % n];
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Mud: a wet, irregular patch with a puddle and tyre ruts through it.
function drawMud(ctx, s, style) {
  const seed = (s.x0 * 7 + s.y0 * 13) | 0;
  ctx.fillStyle = style;
  blobPath(ctx, s.x0, s.y0, s.x1, s.y1, seed);
  ctx.fill();
  ctx.fillStyle = "rgba(35,25,15,0.35)";
  blobPath(ctx, s.x0, s.y0, s.x1, s.y1, seed + 1, 0.7);
  ctx.fill();
  ctx.fillStyle = "rgba(85,100,105,0.45)";
  blobPath(ctx, s.x0, s.y0, s.x1, s.y1, seed + 2, 0.38);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Two ruts across the long side.
  const horiz = s.x1 - s.x0 >= s.y1 - s.y0;
  ctx.save();
  blobPath(ctx, s.x0, s.y0, s.x1, s.y1, seed);
  ctx.clip();
  ctx.strokeStyle = "rgba(25,18,10,0.45)";
  ctx.lineWidth = 3;
  for (const o of [-0.18, 0.18]) {
    ctx.beginPath();
    if (horiz) { const y = (s.y0 + s.y1) / 2 + o * (s.y1 - s.y0); ctx.moveTo(s.x0, y + 4); ctx.quadraticCurveTo((s.x0 + s.x1) / 2, y - 6, s.x1, y + 3); }
    else { const x = (s.x0 + s.x1) / 2 + o * (s.x1 - s.x0); ctx.moveTo(x + 4, s.y0); ctx.quadraticCurveTo(x - 6, (s.y0 + s.y1) / 2, x + 3, s.y1); }
    ctx.stroke();
  }
  ctx.restore();
}

// Draws the whole ground of a level into ctx (already scaled by S so that
// one unit is one world px).
export function drawGround(ctx, lvl, S = 1) {
  const cache = new Map();
  const rnd = lcg(lvl.id.length * 7919 + 17);
  ctx.fillStyle = surfaceStyle(ctx, lvl.base, S, cache);
  ctx.fillRect(-40, -40, lvl.w + 80, lvl.h + 80);
  for (const s of lvl.surfaces) {
    const style = surfaceStyle(ctx, s.k, S, cache);
    if (s.pts) {
      ctx.strokeStyle = style;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
    } else if (s.k === "mud" && s.x0 != null) {
      drawMud(ctx, s, style);
    } else {
      ctx.fillStyle = style;
      shapePath(ctx, s);
      ctx.fill();
    }
  }
  // Oil stains in the painted bays.
  for (const b of lvl.bays) {
    if (rnd() < 0.5 && lvl.base !== "grass") {
      ctx.globalAlpha = 0.08 + rnd() * 0.1;
      ctx.fillStyle = "#15161a";
      ctx.beginPath();
      ctx.ellipse(b.x + (rnd() - 0.5) * 8, b.y + (rnd() - 0.5) * 12, 5 + rnd() * 6, 4 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const p of lvl.paint) {
    if (p.p === "bays") for (const b of p.bays) paintBay(ctx, b, p.color);
    else if (p.p === "line") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.lineCap = "butt";
      ctx.setLineDash(p.dash ?? []);
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (const [x, y] of p.pts.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (p.p === "arrow") paintArrow(ctx, p.x, p.y, p.a, p.color, p.s);
    else if (p.p === "text") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.color;
      ctx.font = `800 ${p.size}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    } else if (p.p === "zebra") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = "rgba(236,236,230,0.85)";
      for (let u = -p.l / 2; u < p.l / 2; u += 12) ctx.fillRect(u, -p.w / 2, 6, p.w);
      ctx.restore();
    } else if (p.p === "hatch") {
      ctx.save();
      ctx.beginPath(); ctx.rect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0); ctx.clip();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      const h = p.y1 - p.y0;
      for (let k = p.x0 - h; k < p.x1; k += 9) { ctx.beginPath(); ctx.moveTo(k, p.y0); ctx.lineTo(k + h, p.y1); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = p.color;
      ctx.strokeRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
    }
  }
}

// ── Static obstacles, top-down (thumbnails) ──────────────────────────────
const WALL_COLORS = { stone: 0x9a9184, brick: 0xa0523d, barn: 0x9a3b2a, wood: 0x8a6238, white: 0xf2f2ee, hangar: 0x9aa3ab, hull: 0x2b3a4a, site: 0xa3a6aa };
function drawStaticTop(p, def) {
  const k = def.kind, x = def.x, y = def.y, a = def.a ?? 0;
  const box = (w, h) => xform(x, y, a, rectPts(-w / 2, -h / 2, w / 2, h / 2));
  const circle = (r, col) => p.circle(x, y, r, col);
  switch (k) {
    case "water": case "boundary": return;
    case "pillar": p.poly(box(def.s + 2, def.s + 2), 0xe8c547); p.poly(box(def.s - 1, def.s - 1), 0xa3a6aa); return;
    case "bollard": case "post": circle(def.r ?? 2.5, def.flag ?? 0xf2c230); return;
    case "lamp": case "hydrant": case "bin": case "barrel": circle(3.5, 0x3d434b); return;
    case "tree": p.circle(x + 3, y + 4, def.r, 0x000000, 0.22); circle(def.r, 0x3d7a2a); p.circle(x - def.r * 0.25, y - def.r * 0.3, def.r * 0.4, 0x5f9e3f); return;
    case "pine": circle(def.r * 0.8, 0x24502f); p.circle(x, y, def.r * 0.4, 0x2f6a3c); return;
    case "bush": circle(def.r, 0x4d7c30); return;
    case "rock": circle(def.r, 0x8a8f96); return;
    case "hay": circle(def.r, 0xd9b95a); return;
    case "firepit": circle(7, 0x6d6a64); return;
    case "table": p.poly(box(12, 20), 0x8a6238); return;
    case "planter": p.poly(box(def.w, def.h), 0xa7a39a); p.poly(box(def.w - 4, def.h - 4), 0x3f7a2c); return;
    case "hedge": p.poly(box(def.w, def.h), 0x2f5f22); return;
    case "snowbank": p.poly(box(def.w, def.h), 0xf6f9fc, 1, 0xc9d4e0, 1); return;
    case "fence": p.poly(box(def.w, def.h), 0x8a6238); return;
    case "vancaravan": drawTrailerTop(p, "caravan", x, y, a); return;
    case "parkedsemi": {
      const t = TRAILERS.semi, v = VEHICLES.truck;
      const d = (t.len / 2 + t.bar - v.hitchX) * M;
      drawCarTop(p, TRACTOR_TOP, def.color ?? 0x3d6fb6, x + Math.cos(a) * d, y + Math.sin(a) * d, a);
      drawTrailerTop(p, "semi", x, y, a, 0xe8e8e4);
      return;
    }
    case "plane": {
      const s = def.s ?? 1;
      p.poly(xform(x, y, a, rectPts(-35 * s, -5 * s, 35 * s, 5 * s)), def.color ?? 0xf2f2ee);
      p.poly(xform(x, y, a, rectPts(1 * s, -48 * s, 15 * s, 48 * s)), def.color ?? 0xf2f2ee);
      p.poly(xform(x, y, a, rectPts(-34 * s, -15 * s, -26 * s, 15 * s)), def.color ?? 0xf2f2ee);
      return;
    }
    case "tent": p.poly(box(def.w, def.h), def.w > 28 ? 0xd9822b : 0x2f7fbf); return;
    case "wall": p.poly(box(def.w, def.h), WALL_COLORS[def.style] ?? 0x9a9da2); return;
    case "kerb": p.poly(box(def.w, def.h), 0xc9c5bc); return;
    case "barrier": p.poly(box(def.w, def.h), 0xd33a2c); return;
    case "tractor": p.poly(box(44, 24), def.color ?? 0x2f7a3a); return;
    case "digger": p.poly(box(def.w ?? 60, def.h ?? 30), def.color ?? 0xe8a33a); return;
    case "logs": p.poly(box(def.w, def.h), 0x8a6238, 1, 0x5a3f1e, 1); return;
    case "stall": p.poly(box(def.w, def.h), def.color ?? 0xd33a2c); return;
    case "marquee": p.poly(box(def.w, def.h), 0xf2f2ee, 1, 0xb8bcc2, 1); return;
    default:
      p.poly(box(def.w ?? 10, def.h ?? 10), def.roof ?? def.color ?? 0x8a8176, 1, 0x000000, 0.6, 0.25);
  }
}

// Level thumbnail: ground, obstacles, parked cars, the target bay and the
// rig at its start, fitted into the canvas.
export function drawLevelThumb(canvas, lvl) {
  const ctx = canvas.getContext("2d");
  const s = Math.min(canvas.width / lvl.w, canvas.height / lvl.h);
  ctx.fillStyle = "#11161f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate((canvas.width - lvl.w * s) / 2, (canvas.height - lvl.h * s) / 2);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.rect(0, 0, lvl.w, lvl.h); ctx.clip();
  drawGround(ctx, lvl, Math.max(0.5, s));
  const p = new Painter(ctx);
  for (const c of lvl.parked) drawCarTop(p, CAR_TYPES[c.type], c.color, c.x, c.y, c.a);
  for (const st of lvl.statics) drawStaticTop(p, st);
  const b = lvl.bay;
  p.poly(xform(b.x, b.y, b.a, rectPts(-b.l / 2, -b.w / 2, b.l / 2, b.w / 2)), 0xffd166, 0.55, 0xffd166, 3 / s * 0.6);
  drawRigTop(p, lvl.vehicle ?? "car", lvl.trailer, lvl.start.x, lvl.start.y, lvl.start.a);
  ctx.restore();
}
