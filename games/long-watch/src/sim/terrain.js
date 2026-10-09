// ── The ground ───────────────────────────────────────────────────────────
// A heightfield over the whole area: a grid of corner heights, each cell
// split into two triangles exactly as the renderer draws it, so feet stand
// on what you see. Everything solid that is not ground (buildings, rocks,
// crates) lives in the World as boxes and cylinders on top of it.

export class Terrain {
  // x0, z0: the corner; n: cells per side; cell: metres per cell;
  // fn(x, z): the height at a corner.
  constructor({ x0, z0, n, cell, fn }) {
    this.x0 = x0; this.z0 = z0; this.n = n; this.cell = cell;
    this.size = n * cell;
    const N = n + 1;
    this.h = new Float32Array(N * N);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) this.h[j * N + i] = fn(x0 + i * cell, z0 + j * cell);
  }

  corner(i, j) {
    const n = this.n;
    i = i < 0 ? 0 : i > n ? n : i; j = j < 0 ? 0 : j > n ? n : j;
    return this.h[j * (n + 1) + i];
  }

  // Height on the drawn triangles (split along the cell's i+j diagonal).
  height(x, z) {
    const u = (x - this.x0) / this.cell, v = (z - this.z0) / this.cell;
    let i = Math.floor(u), j = Math.floor(v);
    if (i < 0) i = 0; if (j < 0) j = 0; if (i >= this.n) i = this.n - 1; if (j >= this.n) j = this.n - 1;
    let fu = u - i, fv = v - j;
    fu = fu < 0 ? 0 : fu > 1 ? 1 : fu; fv = fv < 0 ? 0 : fv > 1 ? 1 : fv;
    const a = this.corner(i, j), b = this.corner(i + 1, j), c = this.corner(i, j + 1), d = this.corner(i + 1, j + 1);
    if (fu + fv <= 1) return a + (b - a) * fu + (c - a) * fv;
    return d + (c - d) * (1 - fu) + (b - d) * (1 - fv);
  }

  // Upward normal (finite differences, good enough for slopes and decals).
  normal(x, z, out = [0, 1, 0]) {
    const e = this.cell * 0.5;
    const hx = this.height(x + e, z) - this.height(x - e, z), hz = this.height(x, z + e) - this.height(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz);
    out[0] = -hx / l; out[1] = 2 * e / l; out[2] = -hz / l;
    return out;
  }

  // Steepness 0 (flat) … 1 (vertical).
  slope(x, z) { const n = this.normal(x, z); return 1 - n[1]; }

  inside(x, z, m = 0) { return x > this.x0 + m && z > this.z0 + m && x < this.x0 + this.size - m && z < this.z0 + this.size - m; }

  // First hit of o + d·t along the ground, t ≤ maxT; marched then refined.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    const step = this.cell * 0.4;
    let tPrev = 0, above = oy - this.height(ox, oz);
    if (above < 0) return 0;
    for (let t = step; t <= maxT + step; t += step) {
      const tt = Math.min(t, maxT);
      const a = oy + dy * tt - this.height(ox + dx * tt, oz + dz * tt);
      if (a < 0) {
        let lo = tPrev, hi = tt;
        for (let k = 0; k < 8; k++) {
          const m = (lo + hi) / 2;
          if (oy + dy * m - this.height(ox + dx * m, oz + dz * m) < 0) hi = m; else lo = m;
        }
        return hi;
      }
      tPrev = tt;
      if (tt >= maxT) break;
    }
    return -1;
  }
}
