// ── The solid world ──────────────────────────────────────────────────────
// A level's solid geometry as simple convex pieces: boxes (turned about
// y), ramps (a box whose top slopes along its own x) and upright
// cylinders. Each piece knows its floor height, pushes circles out of
// itself in the ground plane and answers ray casts. Pieces may overlap and
// stack: a bridge over a path is just a box with its bottom above head
// height. A uniform grid over (x, z) keeps the queries local. Nearly all
// of it is the level; foam steps are added and taken out while you play.

const CELL = 4;

export class World {
  constructor() {
    this.colliders = [];
    this.grid = new Map();
    this.stamp = 0;
    this.killY = -40;
    this.gravity = 1;                  // a dream may be lighter (scales every body's fall)
    this.nx = 0; this.nz = 0;          // last push2D normal
    this._q = [];
  }

  // Box: centre (x, z), bottom y0, top y1, half sizes hx, hz, turned by yaw.
  box({ x, z, y0 = 0, y1, hx, hz, yaw = 0, tag = null }) { return this._add({ kind: "box", x, z, y0, y1, hx, hz, yaw, tag }); }
  // Ramp: like a box, its top rising from ya at local −x to yb at local +x.
  ramp({ x, z, y0 = 0, ya, yb, hx, hz, yaw = 0, tag = null }) { return this._add({ kind: "ramp", x, z, y0, ya, yb, y1: Math.max(ya, yb), hx, hz, yaw, tag }); }
  cyl({ x, z, r, y0 = 0, y1, tag = null }) { return this._add({ kind: "cyl", x, z, r, y0, y1, hx: r, hz: r, yaw: 0, tag }); }

  _add(c) {
    c.cos = Math.cos(c.yaw); c.sin = Math.sin(c.yaw);
    c.k = c.kind === "ramp" ? (c.yb - c.ya) / (2 * c.hx) : 0;
    const ex = Math.abs(c.hx * c.cos) + Math.abs(c.hz * c.sin), ez = Math.abs(c.hx * c.sin) + Math.abs(c.hz * c.cos);
    c.minX = c.x - ex; c.maxX = c.x + ex; c.minZ = c.z - ez; c.maxZ = c.z + ez;
    c.mark = 0;
    c.id = this.colliders.length;
    this.colliders.push(c);
    for (let i = Math.floor(c.minX / CELL); i <= Math.floor(c.maxX / CELL); i++)
      for (let j = Math.floor(c.minZ / CELL); j <= Math.floor(c.maxZ / CELL); j++) {
        const key = i * 73856093 ^ j * 19349663;
        let a = this.grid.get(key);
        if (!a) this.grid.set(key, a = []);
        a.push(c);
      }
    return c;
  }

  // Take a piece out again (foam that has set and then melts away). The
  // walking grid of the glitches is baked once and does not see these.
  remove(c) {
    for (let i = Math.floor(c.minX / CELL); i <= Math.floor(c.maxX / CELL); i++)
      for (let j = Math.floor(c.minZ / CELL); j <= Math.floor(c.maxZ / CELL); j++) {
        const a = this.grid.get(i * 73856093 ^ j * 19349663);
        const k = a ? a.indexOf(c) : -1;
        if (k >= 0) a.splice(k, 1);
      }
    const k = this.colliders.indexOf(c);
    if (k >= 0) this.colliders.splice(k, 1);
  }

  // Pieces whose footprint may touch the circle (x, z, r). The returned
  // array is reused: copy it if you need it past the next query.
  query(x, z, r) {
    const out = this._q; out.length = 0;
    const s = ++this.stamp;
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const a = this.grid.get(i * 73856093 ^ j * 19349663);
        if (!a) continue;
        for (const c of a) {
          if (c.mark === s) continue;
          c.mark = s;
          if (x + r < c.minX || x - r > c.maxX || z + r < c.minZ || z - r > c.maxZ) continue;
          out.push(c);
        }
      }
    return out;
  }

  // World → the piece's own frame.
  static local(c, x, z) {
    const dx = x - c.x, dz = z - c.z;
    return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
  }

  // Height of the piece's top above (x, z) (clamped onto the piece).
  static topAt(c, x, z) {
    if (c.kind !== "ramp") return c.y1;
    const [lx] = World.local(c, x, z);
    const u = lx < -c.hx ? -c.hx : lx > c.hx ? c.hx : lx;
    return c.ya + (u + c.hx) * c.k;
  }

  // How far the circle (x, z, r) is inside the piece's footprint; the
  // direction out is left in this.nx / this.nz. 0 when apart.
  push2D(c, x, z, r) {
    if (c.kind === "cyl") {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), pen = c.r + r - d;
      if (pen <= 0) return 0;
      if (d > 1e-6) { this.nx = dx / d; this.nz = dz / d; } else { this.nx = 1; this.nz = 0; }
      return pen;
    }
    const [lx, lz] = World.local(c, x, z);
    const qx = lx < -c.hx ? -c.hx : lx > c.hx ? c.hx : lx;
    const qz = lz < -c.hz ? -c.hz : lz > c.hz ? c.hz : lz;
    let dx = lx - qx, dz = lz - qz, nlx, nlz, pen;
    const d2 = dx * dx + dz * dz;
    if (d2 > 1e-12) {
      if (d2 >= r * r) return 0;
      const d = Math.sqrt(d2);
      nlx = dx / d; nlz = dz / d; pen = r - d;
    } else {
      // Centre inside: out through the nearest side.
      const ex = c.hx - Math.abs(lx), ez = c.hz - Math.abs(lz);
      if (ex < ez) { nlx = lx < 0 ? -1 : 1; nlz = 0; pen = ex + r; } else { nlx = 0; nlz = lz < 0 ? -1 : 1; pen = ez + r; }
    }
    // Back to world: rotate by the piece's yaw.
    this.nx = nlx * c.cos + nlz * c.sin;
    this.nz = -nlx * c.sin + nlz * c.cos;
    return pen;
  }

  // Does the circle touch the footprint at all?
  overlaps(c, x, z, r) {
    if (c.kind === "cyl") return Math.hypot(x - c.x, z - c.z) < c.r + r;
    const [lx, lz] = World.local(c, x, z);
    const qx = lx < -c.hx ? -c.hx : lx > c.hx ? c.hx : lx;
    const qz = lz < -c.hz ? -c.hz : lz > c.hz ? c.hz : lz;
    return (lx - qx) ** 2 + (lz - qz) ** 2 < r * r;
  }

  // First hit of the ray o + d·t (d normalised), t ≤ maxT. Returns
  // { t, nx, ny, nz, c } in `out`, or null.
  raycast(ox, oy, oz, dx, dy, dz, maxT, out = {}) {
    let best = maxT, hit = null, bnx = 0, bny = 0, bnz = 0;
    // Walk the grid cells along the ray (2D DDA), testing pieces once.
    const s = ++this.stamp;
    let cx = Math.floor(ox / CELL), cz = Math.floor(oz / CELL);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CELL / dx) : Infinity, tdz = dz !== 0 ? Math.abs(CELL / dz) : Infinity;
    let tmx = dx !== 0 ? ((dx > 0 ? (cx + 1) * CELL : cx * CELL) - ox) / dx : Infinity;
    let tmz = dz !== 0 ? ((dz > 0 ? (cz + 1) * CELL : cz * CELL) - oz) / dz : Infinity;
    let tCell = 0;
    for (let guard = 0; guard < 512 && tCell <= best; guard++) {
      const a = this.grid.get(cx * 73856093 ^ cz * 19349663);
      if (a) for (const c of a) {
        if (c.mark === s) continue;
        c.mark = s;
        const t = c.kind === "cyl" ? rayCyl(c, ox, oy, oz, dx, dy, dz, best, _n) : rayBox(c, ox, oy, oz, dx, dy, dz, best, _n);
        if (t >= 0 && t < best) { best = t; hit = c; bnx = _n[0]; bny = _n[1]; bnz = _n[2]; }
      }
      if (tmx < tmz) { tCell = tmx; tmx += tdx; cx += stepX; } else { tCell = tmz; tmz += tdz; cz += stepZ; }
    }
    if (!hit) return null;
    out.t = best; out.nx = bnx; out.ny = bny; out.nz = bnz; out.c = hit;
    return out;
  }
}

const _n = [0, 0, 0];

// Ray against a box or ramp, clipped plane by plane in its own frame.
function rayBox(c, ox, oy, oz, dx, dy, dz, maxT, n) {
  const px = ox - c.x, pz = oz - c.z;
  const lox = px * c.cos - pz * c.sin, loz = px * c.sin + pz * c.cos;
  const ldx = dx * c.cos - dz * c.sin, ldz = dx * c.sin + dz * c.cos;
  let tE = 0, tX = maxT, enx = 0, eny = 0, enz = 0;
  // Planes n·p ≤ d: ±x, ±z, bottom, top (sloped for ramps).
  const top = c.kind === "ramp";
  for (let i = 0; i < 6; i++) {
    let ax = 0, ay = 0, az = 0, d;
    switch (i) {
      case 0: ax = 1; d = c.hx; break;
      case 1: ax = -1; d = c.hx; break;
      case 2: az = 1; d = c.hz; break;
      case 3: az = -1; d = c.hz; break;
      case 4: ay = -1; d = -c.y0; break;
      default: if (top) { ax = -c.k; ay = 1; d = c.ya + c.k * c.hx; } else { ay = 1; d = c.y1; }
    }
    const den = ax * ldx + ay * dy + az * ldz;
    const dist = d - (ax * lox + ay * oy + az * loz);
    if (den === 0) { if (dist < 0) return -1; continue; }
    const t = dist / den;
    if (den < 0) { if (t > tE) { tE = t; enx = ax; eny = ay; enz = az; } }
    else if (t < tX) tX = t;
    if (tE > tX) return -1;
  }
  if (tE === 0 && enx === 0 && eny === 0 && enz === 0) return -1;   // started inside
  const l = Math.hypot(enx, eny, enz);
  // Local normal back to world.
  n[0] = (enx * c.cos + enz * c.sin) / l; n[1] = eny / l; n[2] = (-enx * c.sin + enz * c.cos) / l;
  return tE;
}

function rayCyl(c, ox, oy, oz, dx, dy, dz, maxT, n) {
  const px = ox - c.x, pz = oz - c.z;
  let best = -1;
  const a = dx * dx + dz * dz;
  if (a > 1e-9) {
    const b = px * dx + pz * dz, cc = px * px + pz * pz - c.r * c.r;
    const disc = b * b - a * cc;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / a;
      const y = oy + dy * t;
      if (t >= 0 && t <= maxT && y >= c.y0 && y <= c.y1) {
        best = t;
        n[0] = (px + dx * t) / c.r; n[1] = 0; n[2] = (pz + dz * t) / c.r;
      }
    }
  }
  // Caps.
  if (dy !== 0) for (const [yy, ny] of [[c.y1, 1], [c.y0, -1]]) {
    if ((ny > 0 && dy >= 0) || (ny < 0 && dy <= 0)) continue;
    const t = (yy - oy) / dy;
    if (t < 0 || t > maxT || (best >= 0 && t >= best)) continue;
    const x = px + dx * t, z = pz + dz * t;
    if (x * x + z * z <= c.r * c.r) { best = t; n[0] = 0; n[1] = ny; n[2] = 0; }
  }
  return best;
}
