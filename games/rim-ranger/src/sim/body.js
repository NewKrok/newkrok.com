import { PLAYER, clamp } from "../config.js";
import { World } from "./world.js";

// ── A body that walks ────────────────────────────────────────────────────
// An upright cylinder (feet at y) moved kinematically: walls push it out
// in the ground plane, floors and ledges up to a step high are walked
// onto, the heightfield is always a floor, ceilings stop jumps. Used for
// the ranger, the ally and the bugs (with their own sizes and speeds).
// Taken over from Dream Fixer, with the ground added.

export class Body {
  constructor(x = 0, y = 0, z = 0, o = {}) {
    this.P = { ...PLAYER, ...o };
    this.x = x; this.y = y; this.z = z;
    this.px = x; this.py = y; this.pz = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.grounded = false;
    this.coyoteT = 0; this.bufferT = 0;
    this.landSpeed = 0;
    this.fell = false;
    this.jumped = false;
    this.r = this.P.radius; this.h = this.P.height;
    this.dashT = 0; this.dashX = 0; this.dashZ = 0;
  }

  place(x, y, z) {
    this.x = this.px = x; this.y = this.py = y; this.z = this.pz = z;
    this.vx = this.vy = this.vz = 0;
    this.grounded = false;
  }

  // wish: { vx, vz } wanted ground velocity (m/s), jump (held),
  // jumpPressed (this step). accelMul scales how quickly it is reached.
  step(space, wish, dt, accelMul = 1) {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.landSpeed = 0; this.fell = false;
    const P = this.P;

    if (this.dashT > 0) {
      // A dash overrides the walk: a straight burst, then back to normal.
      this.dashT -= dt;
      this.vx = this.dashX; this.vz = this.dashZ;
      if (this.dashT <= 0) { this.vx *= 0.45; this.vz *= 0.45; }
    } else {
      const moving = Math.hypot(wish.vx, wish.vz) > 0.05;
      const a = (this.grounded ? (moving ? P.accel : P.friction * Math.max(4, Math.hypot(this.vx, this.vz))) : P.airAccel) * accelMul * dt;
      let ddx = wish.vx - this.vx, ddz = wish.vz - this.vz;
      const dl = Math.hypot(ddx, ddz);
      if (dl > a) { ddx *= a / dl; ddz *= a / dl; }
      if (this.grounded || moving) { this.vx += ddx; this.vz += ddz; }
    }

    if (wish.jumpPressed) this.bufferT = P.buffer; else this.bufferT -= dt;
    this.coyoteT = this.grounded ? P.coyote : this.coyoteT - dt;
    if (this.bufferT > 0 && this.coyoteT > 0 && !wish.noJump) {
      this.vy = P.jump;
      this.grounded = false;
      this.coyoteT = 0; this.bufferT = 0;
      this.jumped = true;
    } else this.jumped = false;

    if (!this.grounded) {
      const g = this.vy > 0 && wish.jump ? P.gravity : P.fallGravity;
      this.vy = Math.max(this.vy - g * dt, -P.maxFall);
    }
    this.move(space, dt);
  }

  dash(dx, dz) {
    const l = Math.hypot(dx, dz) || 1;
    this.dashX = dx / l * this.P.dash; this.dashZ = dz / l * this.P.dash;
    this.dashT = this.P.dashTime;
    if (this.vy < 0) this.vy *= 0.3;
  }

  move(space, dt) {
    const world = space.world;
    const mx = this.vx * dt, mz = this.vz * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / (this.r * 0.5)));
    const T = space.terrain;
    for (let i = 0; i < n; i++) {
      const ox = this.x, oz = this.z;
      this.x += mx / n; this.z += mz / n;
      this.resolveWalls(space);
      // Ground too steep to walk up (about 50°) stops you like a wall.
      if (this.grounded && this.dashT <= 0) {
        const d = Math.hypot(this.x - ox, this.z - oz), rise = T.height(this.x, this.z) - T.height(ox, oz);
        if (rise > 0.06 && rise > d * 1.25 && T.height(this.x, this.z) > this.y + 0.05) {
          this.x = ox; this.z = oz;
          const nrm = T.normal(ox, oz), l = Math.hypot(nrm[0], nrm[2]) || 1, gx = nrm[0] / l, gz = nrm[2] / l;
          const vn = this.vx * gx + this.vz * gz;
          if (vn < 0) { this.vx -= vn * gx; this.vz -= vn * gz; }
        }
      }
    }
    // Keep inside the map.
    const m = 2;
    this.x = clamp(this.x, T.x0 + m, T.x0 + T.size - m);
    this.z = clamp(this.z, T.z0 + m, T.z0 + T.size - m);

    const y0 = this.y;
    const support = this.supportAt(space, this.x, this.z, y0);
    if (this.grounded && this.vy <= 0) {
      if (support >= y0 - this.P.step * 1.4) { this.y = support; this.vy = 0; }
      else this.grounded = false;
    } else {
      this.y += this.vy * dt;
      if (this.vy <= 0 && this.y <= support) {
        this.landSpeed = -this.vy;
        this.y = support; this.vy = 0; this.grounded = true;
      } else if (this.vy > 0) {
        const ceil = this.ceilingAt(world, this.x, this.z, y0);
        if (this.y + this.h > ceil) { this.y = ceil - this.h; this.vy = 0; }
      }
    }
    if (this.y < world.killY) this.fell = true;
  }

  supportAt(space, x, z, y) {
    const world = space.world;
    let best = space.terrain.height(x, z);
    for (const c of world.query(x, z, this.r)) {
      if (!world.overlaps(c, x, z, this.r * 0.85)) continue;
      const top = World.topAt(c, x, z);
      if (top <= y + this.P.step && top > best && c.y0 < y + this.P.step) best = top;
    }
    return best;
  }

  ceilingAt(world, x, z, y) {
    let best = Infinity;
    for (const c of world.query(x, z, this.r)) {
      if (c.y0 >= y + this.h - 0.05 && c.y0 < best && world.overlaps(c, x, z, this.r * 0.85)) best = c.y0;
    }
    return best;
  }

  resolveWalls(space) {
    const world = space.world;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      const feet = this.y, head = this.y + this.h;
      const list = world.query(this.x, this.z, this.r + 0.05);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.y0 >= head - 0.02) continue;
        if (World.topAt(c, this.x, this.z) <= feet + this.P.step) continue;
        const pen = world.push2D(c, this.x, this.z, this.r);
        if (pen <= 0) continue;
        const nx = world.nx, nz = world.nz;
        this.x += nx * pen; this.z += nz * pen;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) { this.vx -= vn * nx; this.vz -= vn * nz; }
        if (this.dashT > 0) { const dn = this.dashX * nx + this.dashZ * nz; if (dn < 0) { this.dashX -= dn * nx; this.dashZ -= dn * nz; } }
        moved = true;
      }
      if (!moved) break;
    }
  }

  get speed2D() { return Math.hypot(this.vx, this.vz); }
}
