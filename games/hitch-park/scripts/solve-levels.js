// Proves every level can be done: a hybrid-A* search over the kinematic
// car + trailer model (the same one the path guide uses) looks for a
// collision-free manoeuvre — forward and reverse arcs — from the start pose
// to a parked trailer. Parked cars, walls and props are hard obstacles
// (inflated by a small margin); cones are ignored, they only cost points.
//
// Usage: npm run solve-levels [-- <level number>...]

import { LEVELS } from "../src/levels.js";
import { M, VEHICLES, TRAILERS, PARK_ANGLE, wrapPi } from "../src/config.js";
import { createSim } from "../src/sim.js";

const MARGIN = 1.5;               // px of clearance on every obstacle
let STEP = 9;                     // px of rear-axle travel per primitive (15 for a lorry)
let KR = 3, MR = 5;               // state / meeting grid resolution (px)
const SUB = 3;                    // collision checks per primitive
const MAX_EXPAND = 400000;
const MAX_FORWARD_ONLY = 30000;

// ── Occupancy grid (1 px) ────────────────────────────────────────────────
const gridSim = createSim();
function buildGrid(lvl) {
  const W = lvl.w, H = lvl.h;
  const g = new Uint8Array(W * H);
  g.W = W; g.H = H;
  const fillPoly = (pts) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const n = pts.length;
    let cxm = 0, cym = 0;
    for (const [x, y] of pts) { cxm += x / n; cym += y / n; }
    const edges = pts.map((p, i) => {
      const q = pts[(i + 1) % n];
      const ex = q[0] - p[0], ey = q[1] - p[1], len = Math.hypot(ex, ey) || 1;
      let nx = ey / len, ny = -ex / len;
      if ((cxm - p[0]) * nx + (cym - p[1]) * ny < 0) { nx = -nx; ny = -ny; }   // inward normal
      return { px: p[0], py: p[1], nx, ny };
    });
    for (let y = Math.max(0, Math.floor(y0 - MARGIN)); y <= Math.min(H - 1, Math.ceil(y1 + MARGIN)); y++) {
      for (let x = Math.max(0, Math.floor(x0 - MARGIN)); x <= Math.min(W - 1, Math.ceil(x1 + MARGIN)); x++) {
        let inside = true;
        for (const e of edges) if ((x - e.px) * e.nx + (y - e.py) * e.ny < -MARGIN) { inside = false; break; }
        if (inside) g[y * W + x] = 1;
      }
    }
  };
  const fillCircle = (cx, cy, r) => {
    const R = r + MARGIN;
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(H - 1, Math.ceil(cy + R)); y++)
      for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(W - 1, Math.ceil(cx + R)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R) g[y * W + x] = 1;
  };
  // Every static and parked body of the real level, shape by shape.
  gridSim.load(lvl);
  const bodies = [...gridSim.statics.map((st) => st.body), ...gridSim.parked.map((p) => p.body)];
  for (const b of bodies) {
    for (let i = 0; i < b.shapes.length; i++) {
      const sh = b.shapes.at(i);
      if (sh.castCircle) { const c = sh.worldCOM; fillCircle(c.x, c.y, sh.castCircle.radius); }
      else {
        const vs = sh.castPolygon.worldVerts, pts = [];
        for (let k = 0; k < vs.length; k++) { const v = vs.at(k); pts.push([v.x, v.y]); }
        fillPoly(pts);
      }
    }
  }
  // Chamfer distance (px) to the nearest blocked pixel, for quick tests.
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = g[i] ? 0 : 1e9;
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let d = dist[i];
    if (x > 0) d = Math.min(d, dist[i - 1] + D1);
    if (y > 0) {
      d = Math.min(d, dist[i - W] + D1);
      if (x > 0) d = Math.min(d, dist[i - W - 1] + D2);
      if (x < W - 1) d = Math.min(d, dist[i - W + 1] + D2);
    }
    dist[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    let d = dist[i];
    if (x < W - 1) d = Math.min(d, dist[i + 1] + D1);
    if (y < H - 1) {
      d = Math.min(d, dist[i + W] + D1);
      if (x < W - 1) d = Math.min(d, dist[i + W + 1] + D2);
      if (x > 0) d = Math.min(d, dist[i + W - 1] + D2);
    }
    dist[i] = d;
  }
  g.dist = dist;
  return g;
}

// ── Rig geometry ─────────────────────────────────────────────────────────
function rigFor(vehicleKey, trailerKey) {
  const v = VEHICLES[vehicleKey], t = TRAILERS[trailerKey];
  const L = v.wheelbase * M;
  const hitchX = -v.hitchX * M;                        // body centre → tow point
  const b = hitchX - L / 2;                            // rear axle → tow point (negative: ahead of it)
  const coupler = (t.len / 2 + t.bar) * M;             // tow point → bed centre
  const d = coupler - t.axle * M;                      // tow point → trailer axle
  const fenderW = t.wheelOut > 0 ? (t.wid / 2 + t.wheelOut + t.wheelW / 2 + 0.04) * 2 * M : t.wid * M;
  // Sample points (local, px) on the outlines.
  const outline = (len, wid, step = 3.5) => {
    const pts = [];
    const hl = len / 2 - 0.5, hw = wid / 2 - 0.5;
    for (let u = -hl; u <= hl; u += step) pts.push([u, -hw], [u, hw]);
    for (let v = -hw; v <= hw; v += step) pts.push([-hl, v], [hl, v]);
    return pts;
  };
  const carPts = outline(v.len * M, v.wid * M);
  const bedPts = outline(t.len * M, t.wid * M);
  const fenderPts = outline(t.wheelR * 2.5 * M, fenderW).map(([u, v]) => [u + t.axle * M, v]);
  // Radii for the quick distance test: inside `rIn` of the centre is surely
  // covered by the outline, beyond `rOut` surely not.
  const carR = { rIn: v.wid * M / 2 - 1, rOut: Math.hypot(v.len * M, v.wid * M) / 2 + 1 };
  const trR = { rIn: Math.min(t.wid * M, t.len * M) / 2 - 1, rOut: Math.hypot(t.len * M, Math.max(t.wid * M, fenderW)) / 2 + 1 };
  return { L, b, coupler, d, carPts, trailerPts: [...bedPts, ...fenderPts], t, v, carR, trR };
}

// State: rear axle (x, y), car heading th, trailer heading ph.
function poses(rig, s) {
  const c = { x: s.x + Math.cos(s.th) * rig.L / 2, y: s.y + Math.sin(s.th) * rig.L / 2, a: s.th };
  const hx = s.x - Math.cos(s.th) * rig.b, hy = s.y - Math.sin(s.th) * rig.b;
  const t = { x: hx - Math.cos(s.ph) * rig.coupler, y: hy - Math.sin(s.ph) * rig.coupler, a: s.ph };
  return { c, t };
}

function collides(grid, rig, s) {
  const { c, t } = poses(rig, s);
  const test = (pts, p, R) => {
    const cx = Math.round(p.x), cy = Math.round(p.y);
    if (cx < 0 || cy < 0 || cx >= grid.W || cy >= grid.H) return true;
    const dc = grid.dist[cy * grid.W + cx];
    if (dc > R.rOut) return false;
    if (dc < R.rIn) return true;
    const cs = Math.cos(p.a), sn = Math.sin(p.a);
    for (const [u, v] of pts) {
      const x = Math.round(p.x + u * cs - v * sn), y = Math.round(p.y + u * sn + v * cs);
      if (x < 0 || y < 0 || x >= grid.W || y >= grid.H || grid[y * grid.W + x]) return true;
    }
    return false;
  };
  return test(rig.carPts, c, rig.carR) || test(rig.trailerPts, t, rig.trR);
}

function parked(lvl, rig, s) {
  const { t } = poses(rig, s);
  const bay = lvl.bay;
  let err = Math.abs(wrapPi(t.a - bay.a));
  if (bay.both) err = Math.min(err, Math.abs(wrapPi(t.a - bay.a - Math.PI)));
  if (err > (bay.tol ?? PARK_ANGLE * 0.8)) return false;
  const ca = Math.cos(-bay.a), sa = Math.sin(-bay.a);
  const hl = rig.t.len * M / 2, hw = rig.t.wid * M / 2;
  const cs = Math.cos(t.a), sn = Math.sin(t.a);
  for (const [u, v] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]]) {
    const x = t.x + u * cs - v * sn - bay.x, y = t.y + u * sn + v * cs - bay.y;
    const lx = x * ca - y * sa, ly = x * sa + y * ca;
    if (Math.abs(lx) > bay.l / 2 - 1 || Math.abs(ly) > bay.w / 2 - 1) return false;
  }
  return true;
}

// ── Search ───────────────────────────────────────────────────────────────
class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

// Obstacle-aware distance (px) from the bay to every 3 px cell, for a disc
// the width of the rig — the usual hybrid-A* heuristic, so the search knows
// it has to go round walls instead of pushing at them.
const CELL = 3;
function distanceField(grid, origin, radius, passR = 0) {
  const cw = Math.ceil(grid.W / CELL), ch = Math.ceil(grid.H / CELL);
  const free = new Uint8Array(cw * ch);
  const r = Math.ceil(radius), r2 = radius * radius;
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const x = cx * CELL + 1, y = cy * CELL + 1;
    let ok = x >= radius && y >= radius && x < grid.W - radius && y < grid.H - radius;
    for (let dy = -r; ok && dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) {
      if (dx * dx + dy * dy > r2) continue;
      if (grid[(y + dy) * grid.W + (x + dx)]) { ok = false; break; }
    }
    free[cy * cw + cx] = ok ? 1 : 0;
  }
  const dist = new Float32Array(cw * ch).fill(Infinity);
  const bx = Math.min(cw - 1, Math.round(origin.x / CELL)), by = Math.min(ch - 1, Math.round(origin.y / CELL));
  const heap = new Heap();
  dist[by * cw + bx] = 0;
  heap.push({ i: by * cw + bx, f: 0 });
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.size) {
    const { i, f } = heap.pop();
    if (f > dist[i]) continue;
    const x = i % cw, y = (i / cw) | 0;
    for (const [dx, dy, c] of nb) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const j = ny * cw + nx;
      // The bay itself is always passable (its sides may be tight).
      if (!free[j] && Math.hypot(nx * CELL - origin.x, ny * CELL - origin.y) > passR) continue;
      const nd = f + c * CELL;
      if (nd < dist[j]) { dist[j] = nd; heap.push({ i: j, f: nd }); }
    }
  }
  return (x, y) => {
    const cx = Math.min(cw - 1, Math.max(0, Math.round(x / CELL))), cy = Math.min(ch - 1, Math.max(0, Math.round(y / CELL)));
    const d = dist[cy * cw + cx];
    return Number.isFinite(d) ? d : Math.hypot(x - origin.x, y - origin.y) * 3;
  };
}

const startState = (lvl, rig) => {
  const st = lvl.start;
  return { x: st.x - Math.cos(st.a) * rig.L / 2, y: st.y - Math.sin(st.a) * rig.L / 2, th: st.a, ph: st.a };
};

function solve(lvl, { forwardOnly = false, from = null, heur = "field", weight = 1.6, cap: capIn = null } = {}) {
  const grid = buildGrid(lvl);
  const rig = rigFor(lvl.vehicle ?? "car", lvl.trailer);
  const start = from ?? startState(lvl, rig);
  if (collides(grid, rig, start)) return { ok: false, why: "start pose collides" };
  const bay = lvl.bay;
  const goalA = bay.a;
  const field = distanceField(grid, lvl.bay, 8, lvl.bay.l / 2);
  const h = (s) => {
    const { t } = poses(rig, s);
    let err = Math.abs(wrapPi(t.a - goalA));
    if (bay.both) err = Math.min(err, Math.abs(wrapPi(t.a - goalA - Math.PI)));
    return (heur === "field" ? field(t.x, t.y) : Math.hypot(t.x - bay.x, t.y - bay.y)) + err * 30;
  };
  const key = (s) => ((Math.round(s.x / KR) * 500 + Math.round(s.y / KR)) * 70 + Math.round(wrapPi(s.th) / 0.1) + 35) * 40 + Math.round(wrapPi(s.th - s.ph) / 0.1) + 20;
  const steers = [-1, -0.5, 0, 0.5, 1].map((k) => Math.tan(k * rig.v.maxSteer));
  const open = new Heap();
  const seen = new Map();
  open.push({ s: start, g: 0, f: h(start) * weight, dir: 0, parent: null });
  seen.set(key(start), 0);
  let n = 0;
  const cap = capIn ?? (forwardOnly ? MAX_FORWARD_ONLY : MAX_EXPAND);
  while (open.size && n < cap) {
    const node = open.pop();
    n++;
    if (parked(lvl, rig, node.s)) {
      let len = 0, rev = 0, switches = 0, p = node;
      while (p.parent) { len += STEP; if (p.dir < 0) rev += STEP; if (p.parent.dir && p.parent.dir !== p.dir) switches++; p = p.parent; }
      return { ok: true, expanded: n, length: Math.round(len), reverse: Math.round(rev), switches, end: node.s };
    }
    for (const dir of forwardOnly ? [1] : [1, -1]) {
      for (const tanD of steers) {
        let s = node.s, bad = false;
        const ds = dir * STEP / SUB;
        for (let i = 0; i < SUB; i++) {
          const rel = s.th - s.ph;
          const dth = ds / rig.L * tanD;
          const dph = (ds / rig.d) * Math.sin(rel) - (rig.b * dth / rig.d) * Math.cos(rel);
          s = { x: s.x + Math.cos(s.th) * ds, y: s.y + Math.sin(s.th) * ds, th: s.th + dth, ph: s.ph + dph };
          if (Math.abs(wrapPi(s.th - s.ph)) > rig.v.hitchWarn + 0.2 || collides(grid, rig, s)) { bad = true; break; }
        }
        if (bad) continue;
        const g = node.g + STEP * (dir < 0 ? 1.15 : 1) + (node.dir && node.dir !== dir ? 25 : 0) + Math.abs(tanD) * 0.8;
        const k = key(s);
        const prev = seen.get(k);
        if (prev !== undefined && prev <= g) continue;
        seen.set(k, g);
        open.push({ s, g, f: g + h(s) * weight, dir, parent: node });
      }
    }
  }
  return { ok: false, why: open.size ? `no plan within ${cap} expansions` : "search space exhausted", expanded: n };
}

// Bidirectional search. One tree grows from the start pose, the other from
// the parked pose in the bay (time-reversed: the final reverse into the bay
// becomes a forward drive out of it, which is easy to find). The kinematics
// are reversible, so when the trees meet (same state to within 5 px and
// 0.15 rad) the joined path is a valid manoeuvre.
const MAX_BIDIR = 900000;
function solveBidirectional(lvl, { from = null } = {}) {
  const grid = buildGrid(lvl);
  const rig = rigFor(lvl.vehicle ?? "car", lvl.trailer);
  const start = from ?? startState(lvl, rig);
  if (collides(grid, rig, start)) return { ok: false, why: "start pose collides" };
  const bay = lvl.bay;
  const key = (s) => ((Math.round(s.x / KR) * 500 + Math.round(s.y / KR)) * 70 + Math.round(wrapPi(s.th) / 0.1) + 35) * 40 + Math.round(wrapPi(s.th - s.ph) / 0.1) + 20;
  const meet = (s) => ((Math.round(s.x / MR) * 500 + Math.round(s.y / MR)) * 50 + Math.round(wrapPi(s.th) / 0.15) + 25) * 30 + Math.round(wrapPi(s.th - s.ph) / 0.15) + 15;
  const steers = [-1, -0.5, 0, 0.5, 1].map((k) => Math.tan(k * rig.v.maxSteer));

  const toBay = distanceField(grid, bay, 8, bay.l / 2);
  const toStart = distanceField(grid, start, 8, 20);
  const fwd = {
    h: (s) => {
      const { t } = poses(rig, s);
      let err = Math.abs(wrapPi(t.a - bay.a));
      if (bay.both) err = Math.min(err, Math.abs(wrapPi(t.a - bay.a - Math.PI)));
      return toBay(t.x, t.y) + err * 30;
    },
    open: new Heap(), seen: new Map(), meets: new Map(), n: 0,
  };
  const bwd = {
    h: (s) => toStart(s.x, s.y) + Math.abs(wrapPi(s.th - start.th)) * 30 + Math.abs(wrapPi(s.th - s.ph)) * 15,
    open: new Heap(), seen: new Map(), meets: new Map(), n: 0,
  };
  const push = (side, node) => {
    side.open.push(node);
    side.seen.set(key(node.s), node.g);
    const m = meet(node.s);
    if (!side.meets.has(m)) side.meets.set(m, node);
  };
  push(fwd, { s: start, g: 0, f: fwd.h(start) * 1.6, dir: 0, parent: null });
  const heads = bay.both ? [bay.a, bay.a + Math.PI] : [bay.a];
  for (const ph of heads) {
    for (const rel of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8]) {
      const th = ph + rel;
      const hx = bay.x + Math.cos(ph) * rig.coupler, hy = bay.y + Math.sin(ph) * rig.coupler;
      const s0 = { x: hx + Math.cos(th) * rig.b, y: hy + Math.sin(th) * rig.b, th, ph };
      if (collides(grid, rig, s0) || !parked(lvl, rig, s0)) continue;
      push(bwd, { s: s0, g: 0, f: bwd.h(s0) * 1.6, dir: 0, parent: null });
    }
  }
  if (!bwd.open.size) return { ok: false, why: "no collision-free parked pose in the bay" };

  const stats = (a, b, playerRevA) => {
    // a: node in the forward tree, b: node in the backward tree.
    let len = 0, rev = 0;
    for (let p = a; p.parent; p = p.parent) { len += STEP; if (p.dir < 0) rev += STEP; }
    for (let p = b; p.parent; p = p.parent) { len += STEP; if (p.dir > 0) rev += STEP; }
    void playerRevA;
    return { length: Math.round(len), reverse: Math.round(rev) };
  };

  const expand = (side, other, reversedTime) => {
    const node = side.open.pop();
    side.n++;
    const s = node.s;
    if (!reversedTime && parked(lvl, rig, s)) return { a: node, b: null };
    for (const dir of [1, -1]) {
      for (const tanD of steers) {
        let q = s, bad = false;
        const ds = dir * STEP / SUB;
        for (let i = 0; i < SUB; i++) {
          const rel = q.th - q.ph;
          const dth = ds / rig.L * tanD;
          const dph = (ds / rig.d) * Math.sin(rel) - (rig.b * dth / rig.d) * Math.cos(rel);
          q = { x: q.x + Math.cos(q.th) * ds, y: q.y + Math.sin(q.th) * ds, th: q.th + dth, ph: q.ph + dph };
          if (Math.abs(wrapPi(q.th - q.ph)) > rig.v.hitchWarn + 0.2 || collides(grid, rig, q)) { bad = true; break; }
        }
        if (bad) continue;
        // Reversing costs a little more in player time.
        const playerRev = reversedTime ? dir > 0 : dir < 0;
        const g = node.g + STEP * (playerRev ? 1.15 : 1) + (node.dir && node.dir !== dir ? 25 : 0) + Math.abs(tanD) * 0.8;
        const k = key(q);
        const prev = side.seen.get(k);
        if (prev !== undefined && prev <= g) continue;
        const child = { s: q, g, f: g + side.h(q) * 1.6, dir, parent: node };
        push(side, child);
        const hit = other.meets.get(meet(q));
        if (hit) return reversedTime ? { a: hit, b: child } : { a: child, b: hit };
      }
    }
    return null;
  };

  while ((fwd.open.size || bwd.open.size) && fwd.n + bwd.n < MAX_BIDIR) {
    const r1 = fwd.open.size ? expand(fwd, bwd, false) : null;
    if (r1) return { ok: true, expanded: fwd.n + bwd.n, ...stats(r1.a, r1.b ?? { parent: null }) };
    const r2 = bwd.open.size ? expand(bwd, fwd, true) : null;
    if (r2) return { ok: true, expanded: fwd.n + bwd.n, ...stats(r2.a, r2.b) };
  }
  return { ok: false, why: `no plan within ${MAX_BIDIR} expansions`, expanded: fwd.n + bwd.n };
}

// Stop-overs for levels whose route is too long for one search: the rig
// is first driven to each box (trailer inside it, heading `a`) in turn.
const PI = Math.PI;
const VIA = {
  club: [
    { x: 1075, y: 600, a: -PI / 2, w: 70, l: 150 },
    { x: 900, y: 440, a: PI, w: 60, l: 150 },
    { x: 520, y: 440, a: PI, w: 60, l: 140 },
  ],
  terminal: [{ x: 1070, y: 510, a: 0, w: 70, l: 120 }],
  retail: [{ x: 1100, y: 300, a: -PI / 2, w: 90, l: 130 }],
  ferry: [{ x: 1150, y: 520, a: 0, w: 70, l: 130 }],
  oldtown: [{ x: 820, y: 200, a: 0, w: 90, l: 160 }, { x: 1080, y: 170, a: 0, w: 60, l: 120 }],
  timber: [{ x: 980, y: 300, a: PI, w: 60, l: 120 }],
  beach: [{ x: 720, y: 420, a: -PI / 2, w: 60, l: 120 }],
  site: [{ x: 880, y: 625, a: 0, w: 60, l: 120 }],
  dealer: [{ x: 800, y: 330, a: PI / 2, w: 60, l: 120 }],
  hangar: [{ x: 795, y: 380, a: PI / 2, w: 60, l: 130 }],
  mountain: [
    { x: 560, y: 772, a: -0.19, w: 80, l: 130 },
    { x: 560, y: 460, a: -3.0, w: 80, l: 130 },
    { x: 1000, y: 230, a: 0, w: 120, l: 160 },
  ],
  harbour: [{ x: 720, y: 225, a: 0, w: 50, l: 110 }],
  market: [{ x: 500, y: 355, a: PI, w: 70, l: 120 }],
  farm: [{ x: 1640, y: 360, a: PI / 2, w: 60, l: 130 }],
  festival: [{ x: 1290, y: 650, a: 0, w: 60, l: 130 }],
  dc: [{ x: 1200, y: 560, a: 0, w: 90, l: 200 }],
  truckstop: [{ x: 980, y: 560, a: 0, w: 90, l: 200 }],
  port: [{ x: 1320, y: 455, a: 0, w: 90, l: 200 }],
  delivery: [{ x: 1360, y: 690, a: 0, w: 80, l: 200 }],
  ferrydeck: [{ x: 1150, y: 700, a: 0, w: 90, l: 220 }],
};

// Try the strategies in turn: forward search (straight-line heuristic),
// then the bidirectional one; stop-overs first where defined.
function plan(lvl) {
  const truck = lvl.vehicle === "truck";
  STEP = truck ? 15 : 9; KR = truck ? 5 : 3; MR = truck ? 8 : 5;
  let from = null, length = 0, reverse = 0, expanded = 0;
  for (const box of VIA[lvl.id] ?? []) {
    let r = solve({ ...lvl, bay: { tol: 0.35, ...box } }, { from, weight: 3, cap: 600000 });
    if (!r.ok) r = solve({ ...lvl, bay: { tol: 0.35, ...box } }, { from, weight: 1.6, cap: 1200000 });
    if (!r.ok) return { ok: false, why: `stop-over ${JSON.stringify(box)} not reached (${r.why})` };
    from = r.end; length += r.length; reverse += r.reverse; expanded += r.expanded;
  }
  const add = (r, how) => ({ ...r, how, length: r.length + length, reverse: r.reverse + reverse, expanded: r.expanded + expanded });
  const a = solve(lvl, { from, heur: "euclid" });
  if (a.ok) return add(a, "forward");
  const b = solveBidirectional(lvl, { from });
  if (b.ok) return add(b, "bidirectional");
  return b;
}

const only = process.argv.slice(2).map(Number).filter(Boolean);
let failed = 0;
for (const lvl of LEVELS) {
  if (only.length && !only.includes(lvl.index + 1)) continue;
  const t0 = Date.now();
  const r = plan(lvl);
  const fwd = r.ok ? solve(lvl, { forwardOnly: true }) : { ok: false };
  if (fwd.ok || (r.ok && r.reverse < 30)) { r.why = "can be parked without reversing"; fwd.ok = true; }
  const tag = `${String(lvl.index + 1).padStart(2)} ${lvl.id.padEnd(10)} ${lvl.title.padEnd(18)}`;
  const ms = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
  if (r.ok && fwd.ok) { failed++; console.log(`✗ ${tag} ${r.why} · ${ms}`); }
  else if (r.ok) console.log(`✓ ${tag} path ${r.length} px (${r.reverse} reversing, ${r.how}) · ${r.expanded} nodes · ${ms}`);
  else { failed++; console.log(`✗ ${tag} ${r.why} · ${ms}`); }
}
console.log(failed ? `\n${failed} level(s) without a plan` : "\nEvery level has a collision-free plan");
process.exit(failed ? 1 : 0);
