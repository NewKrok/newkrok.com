// ── Finding the way ──────────────────────────────────────────────────────
// A coarse walking grid over the whole area (2 m cells), baked once: a
// cell is open when the ground is not too steep and nothing solid stands
// there at body height. Toward a goal a distance field spreads over the
// grid (Dijkstra, eight neighbours); a bug that cannot go straight at its
// prey follows the field downhill, round buildings and along the canyon.
// Fields are cached per goal cell and rebuilt only when the goal moves to
// another cell.

const CELL = 2;
const RISE = 1.3;          // the highest step between two cells a bug takes
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
      let open = T.slope(x, z) < 0.45;
      if (open) for (const c of w.query(x, z, 0.75)) {
        if (!w.overlaps(c, x, z, 0.75)) continue;
        if (c.y1 > g + 0.7 && c.y0 < g + 1.4) { open = false; break; }
      }
      this.open[k] = open ? 1 : 0;
    }
    this.fields = new Map();
    this.heap = new Int32Array(N * 4);
  }

  cell(x, z) {
    const i = Math.floor((x - this.x0) / CELL), j = Math.floor((z - this.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -1;
    return j * this.n + i;
  }
  centre(k) { return [this.x0 + ((k % this.n) + 0.5) * CELL, this.z0 + (Math.floor(k / this.n) + 0.5) * CELL]; }

  // The field toward (x, z), rebuilt at most every `every` seconds per key.
  field(key, x, z, time, every = 0.35) {
    let f = this.fields.get(key);
    const goal = this.cell(x, z);
    if (f && (f.goal === goal || time - f.t < every)) return f;
    if (!f) { f = { dist: new Float32Array(this.n * this.n), goal: -1, t: 0 }; this.fields.set(key, f); }
    f.goal = goal; f.t = time;
    this.#spread(f.dist, goal);
    return f;
  }

  #spread(dist, goal) {
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
    while (size > 0 && guard++ < n * n * 3) {
      const k = pop(), d = dist[k], i = k % n, j = (k - i) / n;
      for (const [di, dj, c] of D8) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
        const q = jj * n + ii;
        if (!open[q]) continue;
        if (di && dj && (!open[j * n + ii] || !open[jj * n + i])) continue;   // no cutting corners
        if (Math.abs(H[q] - H[k]) > RISE) continue;
        const nd = d + c * CELL;
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
    for (const [di, dj] of D8) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const q = jj * n + ii;
      if (f.dist[q] < best) { best = f.dist[q]; bi = q; }
    }
    if (bi < 0) return null;
    const [cx, cz] = this.centre(bi), dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }

  distAt(f, x, z) { const k = this.cell(x, z); return k < 0 ? Infinity : f.dist[k]; }

  isOpen(x, z) { const k = this.cell(x, z); return k >= 0 && this.open[k] === 1; }
}
