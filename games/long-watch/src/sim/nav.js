// ── Finding the way ──────────────────────────────────────────────────────
// A coarse walking grid over the whole area (2 m cells), baked once: a
// cell is open when the ground is not too steep and nothing solid stands
// there at body height. Toward a goal a distance field spreads over the
// grid (Dijkstra, eight neighbours); a bug that cannot go straight at its
// prey follows the field downhill, round buildings and along the canyon.
// Fields are cached per goal cell and rebuilt only when the goal moves to
// another cell.
//
// A cell has three states: open, blocked, or "low": something a leaper
// can jump (a barrier, a crate, a low rock) stands there. Fields asked for
// with `jump` cross low cells at a price, so swarmers come over the
// perimeter barriers while chargers and spitters go round by the gates.

const CELL = 2;
const RISE = 0.7;          // the steepest a bug walks between two cells: metres up per metre along (about 35°)
const STEEP = 0.22;        // ground steeper than this (about 39°) is not walked on
const LOW_TOP = 1.35;      // a solid piece no higher than this over the ground can be jumped
const JUMP_COST = 5;       // metres a jump "costs" in the field, so it is taken only when it pays
const MAX_FIELDS = 48;     // cached fields (each is a float per cell)
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

export class Nav {
  constructor(space) {
    this.space = space;
    const T = space.terrain;
    this.x0 = T.x0; this.z0 = T.z0;
    this.n = Math.floor(T.size / CELL);
    const n = this.n, N = n * n;
    this.open = new Uint8Array(N);
    this.h = new Float32Array(N);
    const w = space.world;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = this.x0 + (i + 0.5) * CELL, z = this.z0 + (j + 0.5) * CELL, k = j * n + i;
      let g = space.floor(x, z, T.height(x, z) + 0.6, 0.1, 0.3);
      this.h[k] = g;
      let open = T.slope(x, z) < STEEP ? 1 : 0;
      if (open) for (const c of w.query(x, z, 0.75)) {
        if (!w.overlaps(c, x, z, 0.75)) continue;
        if (c.y1 > g + 0.7 && c.y0 < g + 1.4) { open = c.y1 - g <= LOW_TOP && c.y0 < g + 0.5 ? 2 : 0; if (!open) break; }
      }
      this.open[k] = open;
    }
    this.fields = new Map();
    this.heap = new Int32Array(N * 12);      // (cell, cost) pairs; relaxations push duplicates, so room for a few per cell
    this.margin = T.size / 2 - 25;      // how far out from the centre things may be put
  }

  cell(x, z) {
    const i = Math.floor((x - this.x0) / CELL), j = Math.floor((z - this.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -1;
    return j * this.n + i;
  }
  centre(k) { return [this.x0 + ((k % this.n) + 0.5) * CELL, this.z0 + (Math.floor(k / this.n) + 0.5) * CELL]; }

  // The field toward (x, z), rebuilt at most every `every` seconds per key.
  // jump: the walker can hop low obstacles (its own fields, under its own key).
  field(key, x, z, time, every = 0.35, jump = false) {
    if (jump) key += "+j";
    let f = this.fields.get(key);
    const goal = this.cell(x, z);
    if (f && (f.goal === goal || time - f.t < every)) { f.used = time; return f; }
    if (!f) {
      if (this.fields.size >= MAX_FIELDS) {
        // Drop the field nobody has asked for the longest.
        let old = null;
        for (const [k2, q] of this.fields) if (!old || q.used < old[1].used) old = [k2, q];
        if (old) this.fields.delete(old[0]);
      }
      f = { dist: new Float32Array(this.n * this.n), goal: -1, t: 0, used: time, jump }; this.fields.set(key, f);
    }
    f.goal = goal; f.t = time; f.used = time;
    this.#spread(f.dist, goal, jump);
    return f;
  }

  #spread(dist, goal, jump) {
    dist.fill(Infinity);
    if (goal < 0) return;
    const n = this.n, open = this.open, H = this.h, heap = this.heap;
    let size = 0;
    const push = (k, d) => {
      let i = size++;
      heap[i * 2] = k; heap[i * 2 + 1] = d * 1000;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p * 2 + 1] <= heap[i * 2 + 1]) break;
        const a = heap[p * 2], b = heap[p * 2 + 1]; heap[p * 2] = heap[i * 2]; heap[p * 2 + 1] = heap[i * 2 + 1]; heap[i * 2] = a; heap[i * 2 + 1] = b;
        i = p;
      }
    };
    const pop = () => {
      const k = heap[0];
      size--;
      heap[0] = heap[size * 2]; heap[1] = heap[size * 2 + 1];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < size && heap[l * 2 + 1] < heap[m * 2 + 1]) m = l;
        if (r < size && heap[r * 2 + 1] < heap[m * 2 + 1]) m = r;
        if (m === i) break;
        const a = heap[m * 2], b = heap[m * 2 + 1]; heap[m * 2] = heap[i * 2]; heap[m * 2 + 1] = heap[i * 2 + 1]; heap[i * 2] = a; heap[i * 2 + 1] = b;
        i = m;
      }
      return k;
    };
    dist[goal] = 0; push(goal, 0);
    let guard = 0;
    while (size > 0 && guard++ < n * n * 4) {
      const kd = heap[1], k = pop(), d = dist[k], i = k % n, j = (k - i) / n;
      if (kd > d * 1000 + 1) continue;                      // a stale entry: this cell was reached cheaper since
      for (const [di, dj, c] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
        const q = jj * n + ii, oq = open[q];
        if (!oq || (oq === 2 && !jump)) continue;
        if (di && dj && (!open[j * n + ii] || !open[jj * n + i])) continue;   // no cutting corners
        if (Math.abs(H[q] - H[k]) > RISE * c * CELL) continue;
        const nd = d + c * CELL + (oq === 2 ? JUMP_COST : 0);
        if (nd < dist[q]) { dist[q] = nd; push(q, nd); }
      }
    }
  }

  // Direction (unit [dx, dz]) to walk from (x, z) along the field, or null
  // when there is no way (or already at the goal cell).
  dir(f, x, z) {
    const n = this.n, k = this.cell(x, z);
    if (k < 0) return null;
    const i = k % n, j = (k - i) / n;
    let best = f.dist[k], bi = -1;
    const open = this.open;
    for (const [di, dj] of D8) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const q = jj * n + ii;
      if (di && dj && (!open[j * n + ii] || !open[jj * n + i])) continue;   // no cutting corners (as the field was built)
      if (f.dist[q] < best) { best = f.dist[q]; bi = q; }
    }
    if (bi < 0) return null;
    const [cx, cz] = this.centre(bi), dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }

  distAt(f, x, z) { const k = this.cell(x, z); return k < 0 ? Infinity : f.dist[k]; }

  isOpen(x, z) { const k = this.cell(x, z); return k >= 0 && this.open[k] === 1; }
  // Something jumpable stands on this cell.
  isLow(x, z) { const k = this.cell(x, z); return k >= 0 && this.open[k] === 2; }
  // Ground a body can walk from (x, z) to (gx, gz) in a straight line:
  // every cell on the way open (or low, for a jumper) and no step too high.
  straight(x, z, gx, gz, jump = false) {
    const dx = gx - x, dz = gz - z, L = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(L / (CELL * 0.5)));
    let prev = this.cell(x, z);
    if (prev < 0) return false;
    for (let i = 1; i <= n; i++) {
      const k = this.cell(x + dx * i / n, z + dz * i / n);
      if (k < 0) return false;
      const o = this.open[k];
      if (!o || (o === 2 && !jump)) return false;
      if (k !== prev && Math.abs(this.h[k] - this.h[prev]) > RISE * CELL * 1.5) return false;
      prev = k;
    }
    return true;
  }
}
