import { PLAYER as P, clamp } from "../config.js";
import { World } from "./world.js";

// ── The player's body ────────────────────────────────────────────────────
// An upright cylinder (feet at y) moved kinematically through the World:
// walls push it out in the ground plane, floors and ledges up to a step
// high are walked onto, ramps are followed, ceilings stop jumps. Tuned
// forgiving: coyote time, a jump buffer, and heavier gravity on the way
// down so jumps are quick and easy to judge.

export class Body {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.px = x; this.py = y; this.pz = z;     // previous step, for interpolation
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0;
    this.grounded = false;
    this.coyoteT = 0; this.bufferT = 0;
    this.landSpeed = 0;                        // how hard the last landing was (for the camera dip)
    this.stepUp = 0;                           // height climbed this step (the camera smooths it)
    this.fell = false;                         // dropped out of the world this step
    this.r = P.radius; this.h = P.height;
  }

  place(x, y, z, yaw = this.yaw) {
    this.x = this.px = x; this.y = this.py = y; this.z = this.pz = z;
    this.vx = this.vy = this.vz = 0;
    this.yaw = yaw; this.pitch = 0;
    this.grounded = false;
  }

  // intent: { forward, strafe (−1…1), jump (held), jumpPressed }
  step(world, intent, dt, speedMul = 1) {
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.landSpeed = 0; this.stepUp = 0; this.fell = false;

    // ── Wanted velocity from the stick / keys, in the look direction ──
    let f = intent.forward || 0, s = intent.strafe || 0;
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    const sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
    const wx = (-sn * f + cs * s) * P.speed * speedMul, wz = (-cs * f - sn * s) * P.speed * speedMul;
    const moving = len > 0.05;
    const a = (this.grounded ? (moving ? P.accel : P.friction * P.speed) : P.airAccel) * dt;
    let ddx = wx - this.vx, ddz = wz - this.vz;
    const dl = Math.hypot(ddx, ddz);
    if (dl > a) { ddx *= a / dl; ddz *= a / dl; }
    if (this.grounded || moving) { this.vx += ddx; this.vz += ddz; }

    // ── Jump ──
    if (intent.jumpPressed) this.bufferT = P.buffer; else this.bufferT -= dt;
    this.coyoteT = this.grounded ? P.coyote : this.coyoteT - dt;
    if (this.bufferT > 0 && this.coyoteT > 0) {
      this.vy = P.jump;
      this.grounded = false;
      this.coyoteT = 0; this.bufferT = 0;
      this.jumped = true;
    } else this.jumped = false;

    // ── Gravity: lighter while rising with the button held ──
    if (!this.grounded) {
      const g = this.vy > 0 && intent.jump ? P.gravity : P.fallGravity;
      this.vy = Math.max(this.vy - g * dt, -P.maxFall);
    }

    // ── Across: in small steps so a fast body cannot tunnel through thin walls ──
    const mx = this.vx * dt, mz = this.vz * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / (this.r * 0.5)));
    for (let i = 0; i < n; i++) {
      this.x += mx / n; this.z += mz / n;
      this.resolveWalls(world);
    }

    // ── Up and down ──
    const y0 = this.y;
    const support = this.supportAt(world, this.x, this.z, y0);
    if (this.grounded && this.vy <= 0) {
      if (support > -Infinity && support >= y0 - P.step) {
        if (support > y0) this.stepUp = support - y0;
        this.y = support; this.vy = 0;         // follow stairs and slopes, up and down
      } else this.grounded = false;            // walked off a ledge
    } else {
      this.y += this.vy * dt;
      if (this.vy <= 0 && support > -Infinity && this.y <= support) {
        this.landSpeed = -this.vy;
        this.y = support; this.vy = 0; this.grounded = true;
      } else if (this.vy > 0) {
        const ceil = this.ceilingAt(world, this.x, this.z, y0);
        if (this.y + this.h > ceil) { this.y = ceil - this.h; this.vy = 0; }
      }
    }
    if (this.y < world.killY) this.fell = true;
  }

  // Highest floor under the body that it can stand on from height y.
  supportAt(world, x, z, y) {
    let best = -Infinity;
    for (const c of world.query(x, z, this.r)) {
      if (!world.overlaps(c, x, z, this.r * 0.85)) continue;
      const top = World.topAt(c, x, z);
      if (top <= y + P.step && top > best && c.y0 < y + P.step) best = top;
    }
    return best;
  }

  // Lowest ceiling above a body standing at y.
  ceilingAt(world, x, z, y) {
    let best = Infinity;
    for (const c of world.query(x, z, this.r)) {
      if (c.y0 >= y + this.h - 0.05 && c.y0 < best && world.overlaps(c, x, z, this.r * 0.85)) best = c.y0;
    }
    return best;
  }

  resolveWalls(world) {
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      const feet = this.y, head = this.y + this.h;
      const list = world.query(this.x, this.z, this.r + 0.05);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.y0 >= head - 0.02) continue;                        // overhead
        if (World.topAt(c, this.x, this.z) <= feet + P.step) continue;   // a floor or a step
        const pen = world.push2D(c, this.x, this.z, this.r);
        if (pen <= 0) continue;
        const nx = world.nx, nz = world.nz;
        this.x += nx * pen; this.z += nz * pen;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) { this.vx -= vn * nx; this.vz -= vn * nz; }
        moved = true;
      }
      if (!moved) break;
    }
  }

  get eyeY() { return this.y + P.eye; }
  get speed2D() { return Math.hypot(this.vx, this.vz); }
  look(dyaw, dpitch) {
    this.yaw += dyaw;
    this.pitch = clamp(this.pitch + dpitch, -1.45, 1.45);
  }
}
