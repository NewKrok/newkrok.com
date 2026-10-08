import { World } from "./world.js";

// ── Finding the way to you ───────────────────────────────────────────────
// A walking grid over the level, baked once: each half-metre cell knows the
// floor a glitch could stand on there (or that it cannot: a wall, a tree,
// the void). From the cell you stand in a distance field spreads over the
// grid (Dijkstra, eight neighbours), and a walker that cannot simply come
// straight at you follows it downhill: round the pond, over the bridge,
// up the terrace stairs. Steps up to STEP are walked, drops up to DROP are
// taken one way.

const CELL = 0.5;
const STEP = 0.5;          // highest rise between two cells
const DROP = 1.4;          // deepest drop a walker takes
const CLEAR = 0.3;         // half the width a walker needs
const HEAD = 0.8;          // headroom it needs
const REACH = 140;         // how far the field spreads (metres of path)
const EDGE = 0.2;          // how far from the brink a walker keeps
const JUMP = 4.5;          // longest hop over a gap (metres)
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

export class Nav {
  constructor(world) {
    this.world = world;
    // Bounds of everything solid.
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const c of world.colliders) { x0 = Math.min(x0, c.minX); x1 = Math.max(x1, c.maxX); z0 = Math.min(z0, c.minZ); z1 = Math.max(z1, c.maxZ); }
    this.x0 = x0; this.z0 = z0;
    this.nx = Math.ceil((x1 - x0) / CELL) + 1; this.nz = Math.ceil((z1 - z0) / CELL) + 1;
    const n = this.nx * this.nz;
    this.floor = new Float32Array(n).fill(NaN);
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) this.floor[j * this.nx + i] = this.bake(x0 + i * CELL, z0 + j * CELL);
    // Keep off the brink: a cell whose floor ends within EDGE of its centre
    // (the void, or a drop too deep to take) is not walked on, so a walker
    // never treads the very edge. Narrow things (a bone step) keep their
    // middle.
    const F = this.floor, edge = [];
    this.gap = new Uint8Array(n);           // void or brink: what a jump crosses
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const k = j * this.nx + i, f = F[k];
      if (f === -Infinity) { this.gap[k] = 1; continue; }
      if (Number.isNaN(f)) continue;
      let near = false;
      for (const [di, dj] of D8) {
        const ii = i + di, jj = j + dj;
        const g = ii < 0 || jj < 0 || ii >= this.nx || jj >= this.nz ? -Infinity : F[jj * this.nx + ii];
        if (g === -Infinity || g < f - DROP) { near = true; break; }
      }
      if (!near) continue;
      const x = x0 + i * CELL, z = z0 + j * CELL;
      for (const [di, dj] of D8) {
        const l = Math.hypot(di, dj);
        if (this.ground(x + di / l * EDGE, z + dj / l * EDGE, f) < f - DROP) { edge.push(k); break; }
      }
    }
    for (const k of edge) { F[k] = NaN; this.gap[k] = 1; }
    for (let k = 0; k < n; k++) if (F[k] === -Infinity) F[k] = NaN;
    this.jumps();
    this.dist = new Float32Array(n).fill(Infinity);
    this.heap = new Int32Array(n * 4);
    this.hk = new Float32Array(n * 4);
    this.from = -1;
    this.t = 0;
  }

  // Highest top under (x, z) a body at y could stand on, −Infinity if none.
  ground(x, z, y) {
    const w = this.world;
    let best = -Infinity;
    for (const c of w.query(x, z, 0.05)) {
      if (!w.overlaps(c, x, z, 0.05)) continue;
      const t = World.topAt(c, x, z);
      if (t <= y + STEP && t > best) best = t;
    }
    return best;
  }

  // Hops over the gaps: from a cell at the brink to one across the void
  // (another island, the next bone step), up to JUMP away and 1.6 m up,
  // or up onto / down off a ledge close by, with nothing solid in the way. jumpOut[k] / jumpIn[k]: [cell, cost].
  jumps() {
    const { floor: F, gap, nx, nz, world: w } = this;
    this.jumpOut = new Map(); this.jumpIn = new Map();
    const R = Math.ceil(JUMP / CELL);
    // By a gap, or by a ledge too high to step.
    const brink = (i, j) => {
      const f = F[j * nx + i];
      for (const [di, dj] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const q = jj * nx + ii;
        if (gap[q] || Math.abs(F[q] - f) > STEP) return true;
      }
      return false;
    };
    const hit = {};
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * nx + i, fa = F[a];
      if (Number.isNaN(fa) || !brink(i, j)) continue;
      // The nearest landing in each of 16 directions, one going up or
      // level and one going down.
      const best = new Array(32).fill(null);
      for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const b = jj * nx + ii, fb = F[b];
        if (Number.isNaN(fb) || !brink(ii, jj)) continue;
        const d = Math.hypot(di, dj) * CELL, rise = fb - fa;
        if (d < 0.7 || d > JUMP || rise > 1.6 || rise < -3) continue;
        const sec = Math.round((Math.atan2(dj, di) / (2 * Math.PI) + 1) * 16) % 16 + (rise < -0.5 ? 16 : 0);
        if (best[sec] && best[sec][1] <= d) continue;
        // Over a real gap, well below both ends (not just along the island
        // or over a narrow step) …
        let over = false, walled = false;
        const steps = Math.ceil(d / CELL) * 2, hi = Math.max(fa, fb), lo = Math.min(fa, fb);
        for (let s = 1; s < steps; s++) {
          const u = s / steps, x = this.x0 + (i + di * u) * CELL, z = this.z0 + (j + dj * u) * CELL;
          const g = this.ground(x, z, hi + 0.3);
          if (g < lo - 1) over = true;
          if (this.ground(x, z, hi + 2) > hi + 0.5) walled = true;
        }
        // … or straight up onto (or down off) a ledge too high to walk.
        const ledge = (rise > STEP || rise < -DROP) && d <= 2.6;
        if (!(over || ledge) || walled) continue;
        // … with room for the arc.
        const ax = this.x0 + i * CELL, az = this.z0 + j * CELL, bx = this.x0 + ii * CELL, bz = this.z0 + jj * CELL, y = Math.max(fa, fb) + 0.7;
        if (w.raycast(ax, y, az, (bx - ax) / d, 0, (bz - az) / d, d, hit)) continue;
        best[sec] = [b, d];
      }
      for (const L of best) {
        if (!L) continue;
        const cost = L[1] * 1.3 + 1.5;
        if (!this.jumpOut.has(a)) this.jumpOut.set(a, []);
        this.jumpOut.get(a).push([L[0], cost]);
        if (!this.jumpIn.has(L[0])) this.jumpIn.set(L[0], []);
        this.jumpIn.get(L[0]).push([a, cost]);
      }
    }
  }

  // The floor a walker can stand on at (x, z): the highest top with room
  // above it and no wall within CLEAR. NaN when walled in, −Infinity over
  // the void.
  bake(x, z) {
    const w = this.world;
    const under = w.query(x, z, 0.05).filter((c) => w.overlaps(c, x, z, 0.05)).map((c) => World.topAt(c, x, z)).sort((a, b) => b - a);
    if (!under.length) return -Infinity;
    const round = w.query(x, z, CLEAR).filter((c) => w.overlaps(c, x, z, CLEAR));
    for (const top of under) {
      let ok = true;
      for (const c of round) {
        if (c.y0 >= top + HEAD) continue;                  // overhead
        if (World.topAt(c, x, z) <= top + STEP) continue;  // floor or a step
        ok = false; break;
      }
      if (ok) return top;
    }
    return NaN;
  }

  cellOf(x, z) {
    const i = Math.round((x - this.x0) / CELL), j = Math.round((z - this.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }

  // The walkable cell nearest (x, z) at about height y (within a metre).
  near(x, z, y) {
    const c = this.cellOf(x, z);
    if (c < 0) return -1;
    const ci = c % this.nx, cj = (c / this.nx) | 0;
    let best = -1, bd = Infinity;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
      const k = j * this.nx + i, f = this.floor[k];
      if (Number.isNaN(f) || Math.abs(f - y) > 1) continue;
      const d = di * di + dj * dj;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // Spread the distance field from you (at most every 0.3 s, and only when
  // you have moved to another cell).
  update(body, dt) {
    this.t -= dt;
    if (this.t > 0) return;
    const c = this.near(body.x, body.z, body.y);
    if (c < 0 || c === this.from) { this.t = 0.3; return; }
    this.t = 0.3;
    this.from = c;
    const { dist, heap, hk, nx, nz } = this;
    dist.fill(Infinity);
    dist[c] = 0;
    let size = 0;
    const push = (k, d) => {
      let i = size++;
      while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= d) break; heap[i] = heap[p]; hk[i] = hk[p]; i = p; }
      heap[i] = k; hk[i] = d;
    };
    const pop = () => {
      const top = heap[0], last = heap[--size], ld = hk[size];
      let i = 0;
      for (;;) {
        let ch = 2 * i + 1;
        if (ch >= size) break;
        if (ch + 1 < size && hk[ch + 1] < hk[ch]) ch++;
        if (hk[ch] >= ld) break;
        heap[i] = heap[ch]; hk[i] = hk[ch]; i = ch;
      }
      heap[i] = last; hk[i] = ld;
      return top;
    };
    push(c, 0);
    while (size > 0 && size < heap.length - 8) {
      const d0 = hk[0], k = pop();
      if (d0 > dist[k] || d0 > REACH) continue;
      const i = k % nx, j = (k / nx) | 0;
      for (const [di, dj, w] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const q = jj * nx + ii;
        // The field runs from you outwards, so a walker goes q → k.
        if (!this.link(ii, jj, i, j)) continue;
        const nd = d0 + w * CELL;
        if (nd < dist[q]) { dist[q] = nd; push(q, nd); }
      }
      const jin = this.jumpIn.get(k);
      if (jin) for (const [q, c] of jin) { const nd = d0 + c; if (nd < dist[q]) { dist[q] = nd; push(q, nd); } }
    }
  }

  // Can a walker go from cell (i, j) to the neighbour (ii, jj)? Up a step,
  // or down a drop; diagonals only where both sides are open.
  link(i, j, ii, jj) {
    const F = this.floor, nx = this.nx;
    const a = F[j * nx + i], b = F[jj * nx + ii];
    if (Number.isNaN(a) || Number.isNaN(b) || b - a > STEP || a - b > DROP) return false;
    if (i !== ii && j !== jj && (Number.isNaN(F[j * nx + ii]) || Number.isNaN(F[jj * nx + i]))) return false;
    return true;
  }

  // Every cell on the straight line between two cells is walkable.
  open(a, b) {
    const nx = this.nx, ai = a % nx, aj = (a / nx) | 0, bi = b % nx, bj = (b / nx) | 0;
    const n = Math.max(Math.abs(bi - ai), Math.abs(bj - aj)) * 3;
    for (let s = 1; s < n; s++) {
      const u = s / n;
      if (Number.isNaN(this.floor[Math.round(aj + (bj - aj) * u) * nx + Math.round(ai + (bi - ai) * u)])) return false;
    }
    return true;
  }

  // The best hop out of the cell at (x, z, y) towards you, if any:
  // [x, z, y] of the landing (for a walker held up at the brink).
  jumpFrom(x, z, y) {
    const k = this.near(x, z, y), jo = k >= 0 ? this.jumpOut.get(k) : null;
    if (!jo) return null;
    let best = null, bd = this.dist[k];
    for (const [t, c] of jo) if (this.dist[t] + c * 0.5 < bd) { bd = this.dist[t] + c * 0.5; best = t; }
    return best === null ? null : [this.x0 + (best % this.nx) * CELL, this.z0 + ((best / this.nx) | 0) * CELL, this.floor[best]];
  }

  // Where a walker at (x, z, y) should head next to reach you: the point a
  // few cells down the field, or null when it is off the field (then it
  // just comes straight).
  next(x, z, y) {
    let k = this.near(x, z, y);
    if (k < 0 || this.dist[k] === Infinity) return null;
    const start = k;
    // Does the way go over a gap from here? Then hop.
    const jo = this.jumpOut.get(k);
    if (jo) {
      let walk = Infinity, jump = null, jd = Infinity;
      const i = k % this.nx, j = (k / this.nx) | 0;
      for (const [di, dj, w] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= this.nx || jj >= this.nz || !this.link(i, j, ii, jj)) continue;
        walk = Math.min(walk, this.dist[jj * this.nx + ii] + w * CELL);
      }
      for (const [t, c] of jo) if (this.dist[t] + c < jd) { jd = this.dist[t] + c; jump = t; }
      if (jump !== null && jd < walk - 0.01) return [this.x0 + (jump % this.nx) * CELL, this.z0 + ((jump / this.nx) | 0) * CELL, this.dist[jump], this.floor[jump]];
    }
    const { dist, nx } = this;
    // Walk the field downhill for a few cells and aim there: smoother than
    // stepping cell by cell.
    for (let s = 0; s < 4; s++) {
      const i = k % nx, j = (k / nx) | 0;
      let best = k;
      for (const [di, dj] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= this.nz) continue;
        const q = jj * nx + ii;
        if (dist[q] < dist[best] && this.link(i, j, ii, jj)) best = q;
      }
      // Only as far as it can see in a straight line over open cells (no
      // cutting a corner over the void beside a bridge).
      if (best === k || (s > 0 && !this.open(start, best))) break;
      k = best;
    }
    return [this.x0 + (k % nx) * CELL, this.z0 + ((k / nx) | 0) * CELL, dist[k]];
  }
}
