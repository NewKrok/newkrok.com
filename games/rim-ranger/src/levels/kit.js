import { Space } from "../sim/space.js";
import { Terrain } from "../sim/terrain.js";

// ── Level kit ────────────────────────────────────────────────────────────
// A level is a build(k) function over this kit. Every call adds the solid
// part to the Space and records what to draw; the renderer turns the
// records into meshes later, so a level also loads headless.

export class Kit {
  constructor({ size, cell, fn, ground }) {
    this.terrain = new Terrain({ x0: -size / 2, z0: -size / 2, n: Math.round(size / cell), cell, fn });
    this.space = new Space(this.terrain);
    this.world = this.space.world;
    this.ground = ground;      // (x, z, h, slope) → colour, for the terrain mesh
    this.draw = [];            // { kind: "block" | "wedge" | "model", … }
    this.marks = {};           // named points for the script
    this.lights = [];          // { x, y, z, color, r }
    this.burrows = [];         // holes the bugs come out of
    this.decals = [];          // flat marks on the ground (roads, acid, scorch)
  }

  h(x, z) { return this.terrain.height(x, z); }

  // A solid block: centre (x, z), from y0 to y1 (absolute), w × d, turned.
  block(x, z, w, d, y0, y1, look = {}, yaw = 0, tag = null) {
    const c = this.world.box({ x, z, y0, y1, hx: w / 2, hz: d / 2, yaw, tag });
    if (look !== null) this.draw.push({ kind: "block", x, z, w, d, y0, y1, yaw, look });
    return c;
  }

  // A block standing on the ground (its foot sunk in a little on slopes).
  box(x, z, w, d, h, look = {}, yaw = 0) {
    const g = this.#footing(x, z, w, d, yaw);
    return this.block(x, z, w, d, g - 0.4, g + h, look, yaw);
  }

  ramp(x, z, w, d, ya, yb, look = {}, yaw = 0, y0 = null) {
    const base = y0 ?? Math.min(ya, yb) - 1;
    const c = this.world.ramp({ x, z, y0: base, ya, yb, hx: w / 2, hz: d / 2, yaw });
    if (look !== null) this.draw.push({ kind: "wedge", x, z, w, d, y0: base, ya, yb, yaw, look });
    return c;
  }

  // A model from the registry, standing on the ground unless o.y is given.
  // collide: { r, h } upright cylinder, { w, d, h } block, or nothing.
  prop(model, x, z, o = {}) {
    const s = o.s ?? 1, yaw = o.yaw ?? 0;
    const y = o.y ?? (o.sink ?? 0) + (o.flat ? this.#footing(x, z, (o.collide?.w ?? 1) * s, (o.collide?.d ?? 1) * s, yaw) : this.h(x, z));
    this.draw.push({ kind: "model", model, x, y, z, yaw, s, opts: o.opts ?? {} });
    const col = o.collide;
    if (col?.r) this.world.cyl({ x, z, r: col.r * s, y0: y + (col.y0 ?? -0.5) * s, y1: y + col.h * s });
    else if (col?.w) this.world.box({ x: x + (col.dx ?? 0), z: z + (col.dz ?? 0), y0: y + (col.y0 ?? -0.5) * s, y1: y + col.h * s, hx: col.w * s / 2, hz: col.d * s / 2, yaw });
    return y;
  }

  // The lowest ground under a footprint (so nothing floats on a slope).
  #footing(x, z, w, d, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    let lo = Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      const lx = a * w / 2, lz = b * d / 2;
      lo = Math.min(lo, this.h(x + lx * c + lz * s, z - lx * s + lz * c));
    }
    return lo;
  }

  // A building: four walls with doorways, a roof, an inside floor.
  // doors: [{ side: "n" | "s" | "e" | "w", at (along the wall, from the
  // centre), w }]. Returns the floor height.
  building(x, z, w, d, h, o = {}) {
    const wall = o.wall ?? 0.35, look = o.look ?? {}, roofLook = o.roof ?? look;
    const g = o.y ?? this.#footing(x, z, w, d, 0) + 0.15;
    const doors = o.doors ?? [];
    // Plinth / floor.
    this.block(x, z, w, d, g - 1.5, g, o.floor ?? { top: 0x5d5f63, side: 0x4a4c50 });
    const side = (name, cx, cz, len, alongX) => {
      const ds = doors.filter((dd) => dd.side === name).sort((a, b) => a.at - b.at);
      let from = -len / 2;
      const seg = (a, b) => {
        if (b - a < 0.05) return;
        const m = (a + b) / 2;
        if (alongX) this.block(cx + m, cz, b - a, wall, g, g + h, look);
        else this.block(cx, cz + m, wall, b - a, g, g + h, look);
      };
      for (const dd of ds) {
        const a = dd.at - dd.w / 2, b = dd.at + dd.w / 2, dh = dd.h ?? 2.5;
        seg(from, a);
        // Lintel over the doorway.
        if (alongX) this.block(cx + dd.at, cz, dd.w, wall, g + dh, g + h, look);
        else this.block(cx, cz + dd.at, wall, dd.w, g + dh, g + h, look);
        from = b;
      }
      seg(from, len / 2);
    };
    side("n", x, z - d / 2 + wall / 2, w, true);
    side("s", x, z + d / 2 - wall / 2, w, true);
    side("w", x - w / 2 + wall / 2, z, d - wall * 2, false);
    side("e", x + w / 2 - wall / 2, z, d - wall * 2, false);
    if (o.roof !== false) this.block(x, z, w + 0.4, d + 0.4, g + h, g + h + 0.35, roofLook);
    return g;
  }

  // A run of fence or barrier segments along a polyline.
  wallLine(pts, h, thick, look, gap = null) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
      const n = Math.max(1, Math.round(L / 4));
      for (let k = 0; k < n; k++) {
        if (gap && gap(i, k)) continue;
        const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        this.box(x, z, L / n + 0.05, thick, h, look, yaw);
      }
    }
  }

  mark(name, x, z, o = {}) { this.marks[name] = { x, z, y: o.y ?? this.h(x, z), ...o }; return this.marks[name]; }
  light(x, y, z, color = 0xffd9a0, r = 14, k = 1) { this.lights.push({ x, y, z, color, r, k }); }
  burrow(name, x, z) { this.burrows.push({ name, x, z, y: this.h(x, z) }); this.draw.push({ kind: "model", model: "burrow", x, y: this.h(x, z), z, yaw: Math.random() * 6, s: 1, opts: {} }); }
}
