import { foamFoe } from "./foes.js";

// ── The Foam Cannon's foam, once it has left the nozzle ──────────────────
// Globs fly in an arc and soak whatever glitch they hit (or pop an orb).
// A blob, the second action, sets where it lands: on a floor into a round
// step you can jump onto, on a wall into a ledge sticking out of it; on
// another step (its top or its side) it sets on top, a stair higher. Steps are real colliders in the World: you,
// the glitches and dream dust stand on them, until they melt away. Only a
// few hold at once; a new one past that melts the oldest.

const SPLASH = 0.2;        // a glob also catches glitches this close to where it bursts

export class Foam {
  constructor() {
    this.globs = [];       // { id, x, y, z, vx, vy, vz, g, r, life, big, soak }
    this.steps = [];       // { id, x, z, y0, y1, r, t, life, warn, wall, c }
    this._hit = {};
  }

  spray(run, tool) {
    const d = tool.def;
    this.throw(run, d.speed, d.up, d.gravity, d.r, d.life, d.spread, { soak: d.soak, hold: d.hold });
    run.events.push({ type: "foamSpray" });
  }

  blob(run, tool) {
    const B = tool.def.blob;
    this.throw(run, B.speed, B.up, B.gravity, B.r, 4, 0, { big: true, step: tool.def.step, hold: tool.def.hold * 1.5 });
    run.events.push({ type: "foamBlob" });
  }

  throw(run, speed, up, g, r, life, spread, o) {
    const b = run.body, [dx, dy, dz] = run.aimDir(spread);
    run.stats.shots++;
    this.globs.push({
      id: ++run.foeSeq, x: b.x + dx * 0.6, y: b.eyeY + dy * 0.6 - 0.12, z: b.z + dz * 0.6,
      vx: dx * speed + b.vx * 0.3, vy: dy * speed + up, vz: dz * speed + b.vz * 0.3, g, r, life, ...o,
    });
  }

  step(run, dt) {
    for (const g of this.globs) {
      g.lx = g.x; g.ly = g.y; g.lz = g.z;      // for the renderer's interpolation
      g.life -= dt;
      g.vy -= g.g * dt;
      const l = Math.hypot(g.vx, g.vy, g.vz) * dt;
      const ux = g.vx * dt / l, uy = g.vy * dt / l, uz = g.vz * dt / l;
      if (this.hitSomething(run, g)) { g.life = 0; continue; }
      // A blob already inside a step (thrown down at your feet) sets on top of it.
      const under = g.big && this.steps.find((p) => g.y > p.y0 && g.y < p.y1 + 0.05 && Math.hypot(g.x - p.x, g.z - p.z) < p.r);
      if (under) {
        g.life = 0;
        if (!this.set(run, g.step, g.x, under.y1, g.z, 0, 1, 0)) this.splat(run, g, g.x, g.y, g.z);
        continue;
      }
      const hit = run.world.raycast(g.x, g.y, g.z, ux, uy, uz, l + g.r * 0.5, this._hit);
      if (hit) {
        const t = Math.max(0, hit.t - 0.02);
        const x = g.x + ux * t, y = g.y + uy * t, z = g.z + uz * t;
        g.life = 0;
        // On the side of another step it builds up: the new one sets on top.
        const onFoam = hit.c.tag === "foam" && hit.ny <= 0.6;
        if (g.big && (onFoam ? this.set(run, g.step, x, hit.c.y1, z, 0, 1, 0) : this.set(run, g.step, x, y, z, hit.nx, hit.ny, hit.nz))) continue;
        this.splat(run, g, x, y, z);
        continue;
      }
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      if (g.y < run.world.killY) g.life = 0;
    }
    this.globs = this.globs.filter((g) => g.life > 0);
    for (const p of [...this.steps]) {
      p.t += dt;
      if (p.t >= p.life) this.melt(run, p);
    }
  }

  // A glitch, an orb or the boss in the glob's way: soaked (or popped).
  hitSomething(run, g) {
    for (const f of run.foes) {
      if (!f.alive) continue;
      const R = f.def.hitR + g.r;
      if ((f.px - g.x) ** 2 + (f.cy - g.y) ** 2 + (f.pz - g.z) ** 2 > R * R) continue;
      // A blob wraps it up whole, and for longer.
      if (g.big) foamFoe(run, f, 1, g.hold);
      else {
        foamFoe(run, f, g.soak, g.hold);
        for (const o of run.foes) if (o !== f && o.alive && Math.hypot(o.px - g.x, o.pz - g.z) < o.def.hitR + SPLASH + g.r) foamFoe(run, o, g.soak * 0.5, g.hold);
      }
      run.stats.hits++;
      this.splat(run, g, g.x, g.y, g.z, f.id);
      return true;
    }
    for (const s of run.spits) {
      if ((s.x - g.x) ** 2 + (s.y - g.y) ** 2 + (s.z - g.z) ** 2 > (0.38 + g.r) ** 2) continue;
      s.life = 0; s.harmless = true;
      run.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, kind: s.kind });
      this.splat(run, g, g.x, g.y, g.z);
      return true;
    }
    const B = run.boss;
    if (B?.alive) for (const [x, y, z, r] of B.hitSpheres()) {
      if ((x - g.x) ** 2 + (y - g.y) ** 2 + (z - g.z) ** 2 > (r + g.r) ** 2) continue;
      B.foamed?.(run, g.big ? 1 : g.soak);
      this.splat(run, g, g.x, g.y, g.z);
      return true;
    }
    return false;
  }

  splat(run, g, x, y, z, foe = null) {
    run.events.push({ type: "foamSplat", x, y, z, big: !!g.big, foe });
  }

  // A blob sets: a step on a floor, a ledge on a wall (on a ceiling it
  // just splats). Returns whether it set.
  set(run, S, x, y, z, nx, ny, nz) {
    let c, wall = false;
    if (ny > 0.6) c = run.world.cyl({ x, z, r: S.r, y0: y - 0.3, y1: y + S.h, tag: "foam" });
    else if (Math.abs(ny) < 0.5) {
      // Stuck to the wall, a little more than half of it sticking out.
      const h = Math.hypot(nx, nz) || 1, r = S.r * 0.8;
      c = run.world.cyl({ x: x + nx / h * r * 0.55, z: z + nz / h * r * 0.55, r, y0: y + 0.15 - S.ledge, y1: y + 0.15, tag: "foam" });
      wall = true;
    } else return false;
    const p = { id: ++run.foeSeq, x: c.x, z: c.z, y0: c.y0, y1: c.y1, r: c.r, t: 0, life: S.life, warn: S.warn, wall, c };
    this.steps.push(p);
    while (this.steps.length > S.max) this.melt(run, this.steps[0]);
    // Whatever stood where it set is lifted on top.
    lift(run.body, p);
    for (const f of run.foes) if (f.alive && f.body) lift(f.body, p);
    run.events.push({ type: "foamSet", id: p.id, x: p.x, y: p.y1, z: p.z, r: p.r, wall });
    return true;
  }

  melt(run, p) {
    run.world.remove(p.c);
    this.steps.splice(this.steps.indexOf(p), 1);
    run.events.push({ type: "foamGone", id: p.id, x: p.x, y: p.y1, z: p.z, r: p.r });
  }

  // How many more steps can set before the oldest has to go.
  left(tool) { return tool.def.step.max - this.steps.length; }
}

function lift(b, p) {
  if (Math.hypot(b.x - p.x, b.z - p.z) > p.r + b.r * 0.3) return;
  if (b.y < p.y0 - 0.2 || b.y >= p.y1) return;
  b.stepUp = (b.stepUp || 0) + p.y1 - b.y;    // (the camera eases it)
  b.y = p.y1;
  b.vy = Math.max(0, b.vy);
}
