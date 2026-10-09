import { World } from "./world.js";

// ── Space: the ground and the solid world together ───────────────────────
// Rays (shots, sight lines, the camera) and floor lookups ask both the
// heightfield and the boxes, and take whichever comes first.

export class Space {
  constructor(terrain) {
    this.terrain = terrain;
    this.world = new World();
    this.world.killY = -60;
    this._hit = {};
  }

  // First hit along o + d·t (d normalised), t ≤ maxT: { t, nx, ny, nz, c }
  // (c null for the ground), or null.
  ray(ox, oy, oz, dx, dy, dz, maxT, out = {}) {
    let best = maxT, hit = false;
    const w = this.world.raycast(ox, oy, oz, dx, dy, dz, maxT, this._hit);
    if (w) { best = w.t; hit = true; out.nx = w.nx; out.ny = w.ny; out.nz = w.nz; out.c = w.c; }
    const g = this.terrain.raycast(ox, oy, oz, dx, dy, dz, best);
    if (g >= 0 && g < best) {
      best = g; hit = true;
      const n = this.terrain.normal(ox + dx * g, oz + dz * g);
      out.nx = n[0]; out.ny = n[1]; out.nz = n[2]; out.c = null;
    }
    if (!hit) return null;
    out.t = best;
    return out;
  }

  // Can a straight line get from a to b unblocked?
  clear(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    if (L < 1e-4) return true;
    return !this.ray(ax, ay, az, dx / L, dy / L, dz / L, L - 0.05, this._los ??= {});
  }

  // Highest floor at (x, z) at or below y + reach (ground or a box top).
  floor(x, z, y = 1e4, reach = 0.5, r = 0.05) {
    let best = this.terrain.height(x, z);
    for (const c of this.world.query(x, z, r)) {
      if (!this.world.overlaps(c, x, z, r)) continue;
      const top = World.topAt(c, x, z);
      if (top <= y + reach && top > best && c.y0 < y + reach) best = top;
    }
    return best;
  }
}
