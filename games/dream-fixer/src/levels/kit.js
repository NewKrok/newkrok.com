import { World } from "../sim/world.js";

// ── Level kit ────────────────────────────────────────────────────────────
// A level is a build(k) function over this kit. Every call adds the solid
// part to the sim's World and records what to draw; the renderer turns the
// records into meshes later, so levels load headless too (bots, checks).

export class Kit {
  constructor() {
    this.world = new World();
    this.draw = [];            // { kind: "block" | "wedge" | "model", … }
    this.spawn = { x: 0, y: 0, z: 0, yaw: 0 };
    this.anchors = [];
    this.foes = [];
    this.marks = {};           // named points for the story and the spawner
    this.lights = [];
  }

  // A solid block: centre (x, z), from y0 to y1, size w × d, turned by yaw.
  // look: { top, side, bottom colours, bevel, mat, grad: false }
  block(x, z, w, d, y0, y1, look = {}, yaw = 0) {
    const c = this.world.box({ x, z, y0, y1, hx: w / 2, hz: d / 2, yaw });
    if (look !== null) this.draw.push({ kind: "block", x, z, w, d, y0, y1, yaw, look });
    return c;
  }

  // A ramp rising from y = ya at its local −x end to yb at +x.
  ramp(x, z, w, d, ya, yb, look = {}, yaw = 0, y0 = 0) {
    const c = this.world.ramp({ x, z, y0, ya, yb, hx: w / 2, hz: d / 2, yaw });
    if (look !== null) this.draw.push({ kind: "wedge", x, z, w, d, y0, ya, yb, yaw, look });
    return c;
  }

  // Stairs from (x, z) going along yaw's forward (−z turned by yaw).
  stairs(x, z, w, n, rise, run, y0 = 0, look = {}, yaw = 0) {
    const sn = Math.sin(yaw), cs = Math.cos(yaw);
    for (let i = 0; i < n; i++) {
      const f = run * (i + 0.5);
      this.block(x - sn * f, z - cs * f, w, run, y0 - 0.2, y0 + rise * (i + 1), look, yaw);
    }
  }

  // A model from the registry. collide: { r, h } (upright cylinder),
  // { w, d, h } (block, turned with the model) or undefined for decoration.
  prop(model, x, z, o = {}) {
    const y = o.y ?? 0, yaw = o.yaw ?? 0, s = o.s ?? 1;
    this.draw.push({ kind: "model", model, x, y, z, yaw, s, opts: o.opts ?? {} });
    const col = o.collide;
    if (col?.r) this.world.cyl({ x: x + (col.dx ?? 0), z: z + (col.dz ?? 0), r: col.r * s, y0: y + (col.y0 ?? 0) * s, y1: y + col.h * s });
    else if (col?.w) this.world.box({ x, z, y0: y + (col.y0 ?? 0) * s, y1: y + col.h * s, hx: col.w * s / 2, hz: col.d * s / 2, yaw });
  }

  // Floor height at (x, z) from above y (for dropping props onto terrain).
  floorAt(x, z, y = 50) {
    let best = -Infinity;
    for (const c of this.world.query(x, z, 0.01)) {
      if (!this.world.overlaps(c, x, z, 0.01)) continue;
      const t = World.topAt(c, x, z);
      if (t <= y && t > best) best = t;
    }
    return best === -Infinity ? 0 : best;
  }

  start(x, z, yaw = 0) { this.spawn = { x, y: this.floorAt(x, z), z, yaw }; }
  // A dream anchor. o: { waves: [[progress, [kind, n], …], …], spawns: [[x, z], …], ring, duration }
  anchor(id, x, z, o = {}) {
    const y = this.floorAt(x, z);
    this.anchors.push({ id, x, y, z, ...o });
    this.world.cyl({ x, z, r: 1.0, y0: y, y1: y + 0.8 });
  }
  // A glitch already loose when you arrive.
  foe(kind, x, z) { this.foes.push({ kind, x, z }); }
  mark(name, x, z, y) { this.marks[name] = { x, y: y ?? this.floorAt(x, z), z }; }
  light(x, y, z, color, intensity = 6, dist = 9) { this.lights.push({ x, y, z, color, intensity, dist }); }
}

export function buildLevel(def) {
  const k = new Kit();
  def.build(k);
  k.world.killY = def.killY ?? -30;
  return k;
}
