import { PARKED_COLORS, CAR_TYPES, TRAILERS, VEHICLES, M, lcg } from "../config.js";

// ── Level-building kit ───────────────────────────────────────────────────
// Small helpers so a level reads as a description of the place: surfaces,
// paint, rows of bays, walls along a lane, sheds, scattered trees …
// Coordinates are world px (12 px = 1 m), y grows downwards, angles in rad
// (0 = east, π/2 = south).

export const PI = Math.PI;
export const BAY_W = 31, BAY_L = 60;   // a painted car bay, 2.6 × 5 m

export const range = (a, b) => { const r = []; for (let i = a; i < b; i++) r.push(i); return r; };
export const except = (n, skip) => range(0, n).filter((i) => !skip.includes(i));
// Seeded random pick of a row that always leaves `keep` empty.
export const fill = (n, p, seed, keep = []) => { const rnd = lcg(seed); return range(0, n).filter((i) => rnd() < p && !keep.includes(i)); };

// A row of bays: `n` bays starting at (x, y), stepping by (dx, dy), each
// with its nose pointing along `a`.
export function row({ x, y, n, dx = 0, dy = 0, a, l = BAY_L, w = BAY_W }) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x + dx * i, y: y + dy * i, a, w, l });
  return out;
}
// Side by side along x (step = bay width) or along y.
export const hrow = (x, y, n, a, o = {}) => row({ x, y, n, dx: o.step ?? (o.w ?? BAY_W), a, ...o });
export const vrow = (x, y, n, a, o = {}) => row({ x, y, n, dy: o.step ?? (o.w ?? BAY_W), a, ...o });
// Slanted bays along x: the step keeps the painted width `w` between them.
export const angledRow = (x, y, n, a, o = {}) => row({ x, y, n, dx: (o.w ?? BAY_W) / Math.abs(Math.sin(a)), a, ...o });

const TYPES = ["hatch", "sedan", "wagon", "suv", "sedan", "hatch", "van", "suv", "pickup"];
// Cars in some of the bays (60 % nose in, 40 % nose out), seeded.
export function park(bays, idxs, seed, types = TYPES) {
  const rnd = lcg(seed);
  const out = [];
  for (const i of idxs) {
    const b = bays[i];
    if (!b) continue;
    const type = types[Math.floor(rnd() * types.length)];
    const flip = rnd() < 0.6 ? PI : 0;
    const spec = CAR_TYPES[type];
    // Long cars would poke out of the bay's back line: slide them forward.
    const over = Math.max(0, spec.len * M - (b.l - 3)) / 2;
    out.push({
      x: b.x + (rnd() - 0.5) * 3 + Math.cos(b.a) * over,
      y: b.y + (rnd() - 0.5) * 3 + Math.sin(b.a) * over,
      a: b.a + flip + (rnd() - 0.5) * 0.06,
      type, color: PARKED_COLORS[Math.floor(rnd() * PARKED_COLORS.length)],
    });
  }
  return out;
}
export const car = (x, y, a, type = "sedan", color = PARKED_COLORS[(Math.abs(x * 7 + y * 3) | 0) % PARKED_COLORS.length]) => ({ x, y, a, type, color });

// ── Surfaces (ground texture) ────────────────────────────────────────────
// k: asphalt | concrete | pavement | cobble | grass | gravel | dirt | sand |
//    snow | water | ramp | tarmac (dark) | mud
export const rect = (k, x0, y0, x1, y1, r = 0) => ({ k, x0, y0, x1, y1, r });
export const road = (k, pts, width) => ({ k, pts, width });
export const poly = (k, pts) => ({ k, poly: pts });
export const disc = (k, x, y, r) => ({ k, x, y, rad: r });

// ── Paint ────────────────────────────────────────────────────────────────
export const WHITE = "rgba(236,236,230,0.9)";
export const YELLOW = "rgba(236,200,70,0.95)";
export const paintBays = (bays, color = WHITE) => ({ p: "bays", bays, color });
export const line = (pts, o = {}) => ({ p: "line", pts, color: o.color ?? WHITE, width: o.width ?? 2, dash: o.dash ?? null });
export const arrow = (x, y, a, color = "rgba(236,236,230,0.7)", s = 1) => ({ p: "arrow", x, y, a, color, s });
export const text = (x, y, s, o = {}) => ({ p: "text", x, y, text: s, a: o.a ?? 0, size: o.size ?? 16, color: o.color ?? WHITE });
export const zebra = (x, y, a, l, w = 40) => ({ p: "zebra", x, y, a, l, w });
export const hatch = (x0, y0, x1, y1, color = YELLOW) => ({ p: "hatch", x0, y0, x1, y1, color });

// ── Polylines ────────────────────────────────────────────────────────────
// Points every `spacing` px along a polyline, shifted `offset` px to its
// left (negative = right), with the local heading.
export function sample(pts, spacing, offset = 0, from = 0) {
  const out = [];
  let carry = from;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const a = Math.atan2(y1 - y0, x1 - x0);
    const nx = Math.sin(a), ny = -Math.cos(a);   // left normal
    for (let d = carry; d <= len; d += spacing) {
      const t = d / len;
      out.push({ x: x0 + (x1 - x0) * t + nx * offset, y: y0 + (y1 - y0) * t + ny * offset, a });
    }
    carry = (carry - len) % spacing;
    if (carry < 0) carry += spacing;
  }
  return out;
}

// Rounds a polyline's corners (Chaikin corner cutting); the two ends stay.
export function smooth(pts, iterations = 3) {
  let out = pts;
  for (let it = 0; it < iterations; it++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [x0, y0] = out[i], [x1, y1] = out[i + 1];
      next.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

// Shortest distance (px) from a point to a polyline.
export function distToLine(pts, x, y) {
  let best = Infinity;
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
    best = Math.min(best, Math.hypot(x - x0 - dx * t, y - y0 - dy * t));
  }
  return best;
}

// Offset copy of a polyline (mitred joints), `offset` px to the left.
export function offsetLine(pts, offset) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a0 = i > 0 ? Math.atan2(p[1] - pts[i - 1][1], p[0] - pts[i - 1][0]) : null;
    const a1 = i < pts.length - 1 ? Math.atan2(pts[i + 1][1] - p[1], pts[i + 1][0] - p[0]) : null;
    const n0 = a0 == null ? null : [Math.sin(a0), -Math.cos(a0)];
    const n1 = a1 == null ? null : [Math.sin(a1), -Math.cos(a1)];
    if (!n0 || !n1) { const n = n0 || n1; out.push([p[0] + n[0] * offset, p[1] + n[1] * offset]); continue; }
    const mx = n0[0] + n1[0], my = n0[1] + n1[1], ml = Math.hypot(mx, my) || 1;
    const cos = (mx / ml) * n0[0] + (my / ml) * n0[1];
    const k = offset / Math.max(0.35, cos);
    out.push([p[0] + (mx / ml) * k, p[1] + (my / ml) * k]);
  }
  return out;
}

// A wall (or fence, hedge, kerb, rail …) along a polyline, as rotated box
// segments no longer than `maxLen`. `skip(x, y)` leaves gaps.
export function wallLine(pts, { kind = "wall", thick = 6, maxLen = 90, skip = null, ...o } = {}) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / maxLen));
    const a = Math.atan2(y1 - y0, x1 - x0);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const cx = x0 + (x1 - x0) * (t0 + t1) / 2, cy = y0 + (y1 - y0) * (t0 + t1) / 2;
      if (skip && skip(cx, cy)) continue;
      // Overlap a little so joints stay closed.
      out.push({ kind, x: cx, y: cy, a, w: len / n + thick * 0.6, h: thick, ...o });
    }
  }
  return out;
}

// A shed / barn / garage around an interior of `iw` (across) × `il` (along
// `a`) centred on (x, y), open on the side `a` points to.
export function shed(x, y, a, iw, il, { thick = 6, kind = "wall", ...o } = {}) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const hw = iw / 2 + thick / 2, hl = il / 2 + thick / 2;
  const back = P(-hl, 0), left = P(0, -hw), right = P(0, hw);
  return [
    { kind, x: back[0], y: back[1], a: a + PI / 2, w: iw + thick * 2, h: thick, ...o },
    { kind, x: left[0], y: left[1], a, w: il + thick, h: thick, ...o },
    { kind, x: right[0], y: right[1], a, w: il + thick, h: thick, ...o },
  ];
}

export const building = (x, y, w, h, o = {}) => ({ kind: "building", x, y, w, h, ...o });
export const tree = (x, y, r = 18) => ({ kind: "tree", x, y, r });
export const pine = (x, y, r = 16) => ({ kind: "pine", x, y, r });

// Scatter `n` things in a rectangle, avoiding keep-out rectangles.
export function scatter(seed, n, [x0, y0, x1, y1], make, avoid = []) {
  const rnd = lcg(seed);
  const out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (avoid.some(([a0, b0, a1, b1]) => x > a0 && x < a1 && y > b0 && y < b1)) continue;
    out.push(make(x, y, rnd));
  }
  return out;
}

// Containers stacked along x between x0 and x1, `rows` deep from y (each
// 2.44 m wide), 12 m (or 6 m) long.
const CONTAINER_COLORS = [0xb03a2e, 0x2e86c1, 0x1e8449, 0xd68910, 0x7d3c98, 0x566573, 0xcb4335, 0x17a589];
export function containers(x0, x1, y, rows = 3, seed = 1, len = 145) {
  const rnd = lcg(seed);
  const out = [];
  const n = Math.floor((x1 - x0 + 2) / (len + 2));
  const start = x0 + ((x1 - x0) - n * (len + 2) + 2) / 2;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      out.push({ kind: "container", x: start + i * (len + 2) + len / 2, y: y + r * 31 + 14.5, w: len, h: 29, stack: 1 + Math.floor(rnd() * 3), color: CONTAINER_COLORS[Math.floor(rnd() * CONTAINER_COLORS.length)] });
    }
  }
  return out;
}

// A parked articulated lorry (tractor + trailer) whose trailer centre is at
// (x, y), heading a.
export const parkedSemi = (x, y, a, color = 0x3d6fb6, company) => ({ kind: "parkedsemi", x, y, a, color, company });

// Where the rig's trailer sits for a start pose (for sanity checks).
export function trailerCentre(start, vehicle, trailer) {
  const v = VEHICLES[vehicle], t = TRAILERS[trailer];
  const d = (-v.hitchX + t.len / 2 + t.bar) * M;
  return { x: start.x - Math.cos(start.a) * d, y: start.y - Math.sin(start.a) * d };
}

// Final assembly with defaults.
export function level(o) {
  const paint = o.paint ?? [];
  const bays = paint.filter((p) => p.p === "bays").flatMap((p) => p.bays);
  return {
    vehicle: "car", walls: "nsew", edge: "fence", backdrop: "trees", base: "asphalt",
    surfaces: [], parked: [], statics: [], cones: [], decor: [],
    ...o, paint, bays,
  };
}
