import { PLAYER as P, NOISE, clamp, damp, dampAngle } from "../config.js";
import { WEAPONS } from "../data/weapons.js";
import { Body } from "./body.js";
import { cameraRig } from "./camrig.js";
import { bullet, trace } from "./combat.js";

// ── The ranger ───────────────────────────────────────────────────────────
// Movement (walk, sprint, crouch, jump, dash), cover against walls and
// low barriers, two weapons, health with a recharging shield, and being
// downed (the ally gets you up, or the mission falls back to the last
// checkpoint). Everything here also makes noise: that is what the bugs
// hunt by.

const _h = {};
const COVER_REACH = 1.5;

export class Ranger {
  constructor(x, y, z, yaw = 0) {
    this.kind = "player";
    this.body = new Body(x, y, z);
    this.yaw = yaw; this.pitch = -0.08;
    this.face = yaw;                 // which way the figure faces
    this.shoulder = 1;
    this.aimK = 0; this.crouchK = 0;
    this.crouched = false;
    this.sprinting = false;
    this.aiming = false;
    this.cover = null;               // { nx, nz (out of the wall), low, snapT, edge }
    this.peekX = 0; this.peekZ = 0; this.peekUp = 0;
    this.hp = P.hp; this.shield = P.shield; this.calmT = 99;
    this.downed = false; this.downT = 0; this.reviveK = 0;
    this.dead = false;
    this.slots = [];                 // { id, mag, reserve, heat, hot }
    this.cur = 0;
    this.fireT = 0; this.reloadT = 0; this.swapT = 0;
    this.dashCool = 0; this.airDash = true; this.iframes = 0;
    this.noiseT = 0; this.noiseR = 0;   // the loudness of the last stretch (for the HUD)
    this.lastShotT = -99;
    this.recoil = 0;
    this.moveK = 0;                  // 0 standing … 1 running (animation)
    this.stepPhase = 0;
    this.interact = null;            // the use point in reach
    this.useK = 0;
    this.hurtDir = null;
    this.cam = {};
    this.firing = false;
    this.beam = null;                // the laser's current beam end (for the renderer)
    this.muzzle = [0, 0, 0];
    this.godMode = false;
  }

  give(id, slot = null) {
    const w = WEAPONS[id];
    const g = { id, mag: w.mag, reserve: w.reserve, heat: 0, hot: false };
    if (slot === null) { if (this.slots.length < 2) { this.slots.push(g); return g; } slot = this.cur; }
    this.slots[slot] = g;
    return g;
  }
  get weapon() { return this.slots[this.cur]; }
  get def() { return WEAPONS[this.weapon?.id]; }

  // ── One step ──────────────────────────────────────────────────────────
  step(run, I, dt) {
    const b = this.body;
    this.yaw = I.yaw; this.pitch = I.pitch;
    this.fireT -= dt; this.dashCool -= dt; this.iframes -= dt; this.calmT += dt;
    this.recoil = damp(this.recoil, 0, 10, dt);

    if (this.downed) { this.#downedStep(run, I, dt); return; }
    // The pad's X: use what is in reach, else reload. A number key picks a slot.
    if (I.padUse) { if (this.interact) I.usePressed = true; else I.reloadPressed = true; }
    if (I.slot >= 0 && I.slot !== this.cur && this.slots[I.slot]) I.swapPressed = true;

    // ── Stance ──
    if (I.crouchPressed && !this.cover) this.crouched = !this.crouched;
    if (I.coverPressed) { if (this.cover) this.leaveCover(); else this.#takeCover(run, I); }
    const wantAim = I.aim && !this.reloadT;
    this.sprinting = I.sprint && !wantAim && !I.fire && !this.cover && (I.forward > 0.3 || Math.hypot(I.forward, I.strafe) > 0.5);
    if (this.sprinting) this.crouched = false;
    this.aiming = (wantAim || I.fire) && !this.sprinting;
    this.aimK = damp(this.aimK, wantAim && !this.sprinting ? 1 : 0, 14, dt);
    if (I.shoulderPressed) this.shoulder = -this.shoulder;

    // ── Moving ──
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let mx = fx * I.forward + rx * I.strafe, mz = fz * I.forward + rz * I.strafe;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    let speed = this.sprinting ? P.run : this.crouched ? P.crouch : P.walk;
    if (this.aiming && !this.sprinting) speed *= P.aimMul;

    let low = false;
    if (this.cover) {
      const c = this.cover;
      low = c.low;
      // Only along the wall; pushing away from it for a moment leaves.
      const tx = -c.nz, tz = c.nx;
      const along = mx * tx + mz * tz, away = mx * c.nx + mz * c.nz;
      c.awayT = away > 0.75 ? (c.awayT ?? 0) + dt : 0;
      if (c.awayT > 0.22) this.leaveCover();
      else { mx = tx * along; mz = tz * along; speed = P.walk * P.coverMul; }
      if (this.cover && I.jumpPressed && c.low) {
        // Vault over a low barrier.
        this.leaveCover();
        b.vx = -c.nx * 5.2; b.vz = -c.nz * 5.2; b.vy = 6.4; b.grounded = false;
        run.fx({ type: "vault" });
        run.noise(b.x, b.z, NOISE.walk, this);
        I.jumpPressed = false;
      }
    }
    const crouchNow = (this.crouched || (this.cover && low)) && !(this.cover && low && this.aiming);
    this.crouchK = damp(this.crouchK, crouchNow ? 1 : 0, 12, dt);
    b.h = crouchNow ? P.crouchHeight : P.height;

    // ── Dash ──
    if (I.dashPressed && this.dashCool <= 0 && (b.grounded || this.airDash) && !this.cover) {
      let dx = mx, dz = mz;
      if (Math.hypot(dx, dz) < 0.2) { dx = -fx; dz = -fz; }
      b.dash(dx, dz);
      this.dashCool = P.dashCool; this.iframes = 0.22;
      if (!b.grounded) this.airDash = false;
      this.crouched = false;
      run.noise(b.x, b.z, NOISE.dash, this);
      run.fx({ type: "dash", x: b.x, y: b.y, z: b.z });
    }

    const ox = b.x, oz = b.z;
    b.step(run.space, { vx: mx * speed, vz: mz * speed, jump: I.jump, jumpPressed: I.jumpPressed && !this.cover, noJump: crouchNow && this.cover }, dt);
    if (b.grounded) this.airDash = true;
    if (b.jumped) { run.fx({ type: "jump" }); this.crouched = false; }

    // In cover: stop at the end of the wall (and know you are there, to lean out).
    if (this.cover) {
      const c = this.cover;
      c.snapT -= dt;
      if (c.snapT > 0) {
        b.x += (c.tx - b.x) * Math.min(1, dt * 18); b.z += (c.tz - b.z) * Math.min(1, dt * 18);
      }
      const probe = (x, z) => run.space.world.raycast(x, b.y + (c.low ? 0.55 : 1.0), z, -c.nx, 0, -c.nz, b.r + 0.55, _h);
      if (!probe(b.x, b.z)) { b.x = ox; b.z = oz; b.vx = b.vz = 0; }
      const tx = -c.nz, tz = c.nx;
      c.edge = !probe(b.x + tx * 0.55, b.z + tz * 0.55) ? 1 : !probe(b.x - tx * 0.55, b.z - tz * 0.55) ? -1 : 0;
    }

    // Peeking: aiming from high cover at its end leans out round the corner.
    let pk = 0;
    if (this.cover && !this.cover.low && this.aiming && this.cover.edge) pk = this.cover.edge;
    const c = this.cover;
    const tpx = c ? -c.nz * pk * 0.75 : 0, tpz = c ? c.nx * pk * 0.75 : 0;
    this.peekX = damp(this.peekX, tpx, 12, dt); this.peekZ = damp(this.peekZ, tpz, 12, dt);
    if (pk) this.shoulder = pk;

    // ── Facing ──
    const sp = b.speed2D;
    this.moveK = damp(this.moveK, clamp(sp / P.run, 0, 1), 10, dt);
    if (this.aiming || this.firing || this.aimK > 0.3) this.face = dampAngle(this.face, this.yaw, 18, dt);
    else if (this.cover) this.face = dampAngle(this.face, Math.atan2(this.cover.nx, this.cover.nz), 12, dt);
    else if (sp > 0.6) this.face = dampAngle(this.face, Math.atan2(-b.vx, -b.vz), 10, dt);
    if (sp > 0.3 && b.grounded) this.stepPhase += dt * sp * 1.25;

    // ── Noise ──
    this.noiseT -= dt;
    let r = 0;
    if (sp > 0.6 && b.grounded) r = this.sprinting ? NOISE.run : crouchNow ? NOISE.crouch : NOISE.walk;
    if (this.cover) r *= NOISE.coverMul;
    if (b.landSpeed > 6) { r = Math.max(r, NOISE.land); run.fx({ type: "land", k: b.landSpeed }); }
    this.noiseR = Math.max(r, damp(this.noiseR, 0, 3, dt));
    if (r > 0 && (this.noiseT <= 0 || b.landSpeed > 6)) { run.noise(b.x, b.z, r, this); this.noiseT = 0.3; }

    // ── Camera and weapons ──
    cameraRig(run.space, this, b.x, b.y, b.z, this.cam);
    this.#weapons(run, I, dt);

    // ── Shield ──
    if (this.calmT > P.shieldDelay) this.shield = Math.min(P.shield, this.shield + P.shieldRate * dt);

    // ── Use points ──
    this.#use(run, I, dt);
  }

  #downedStep(run, I, dt) {
    const b = this.body;
    this.downT -= dt;
    b.step(run.space, { vx: 0, vz: 0 }, dt);
    b.h = 0.7;
    this.aimK = damp(this.aimK, 0, 10, dt); this.crouchK = damp(this.crouchK, 1, 10, dt);
    cameraRig(run.space, this, b.x, b.y - 0.4, b.z, this.cam);
    this.firing = false; this.beam = null;
    if (this.reviveK >= 1) {
      this.downed = false; this.reviveK = 0;
      this.hp = P.hp * 0.45; this.shield = 0; this.calmT = 0;
      this.iframes = 1.5;
      run.fx({ type: "revived" });
      run.say("kessler_revived");
    } else if (this.downT <= 0) this.dead = true;
  }

  // ── Cover ─────────────────────────────────────────────────────────────
  #takeCover(run, I) {
    const b = this.body;
    // Prefer the wall the stick (or the view) points at; else the nearest.
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let best = null;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
      const h = run.space.world.raycast(b.x, b.y + 0.55, b.z, dx, 0, dz, COVER_REACH + b.r, _h);
      if (!h || Math.abs(h.ny) > 0.3) continue;
      const pref = 1 - (dx * fx + dz * fz) * 0.35;
      const score = h.t * pref;
      if (!best || score < best.score) best = { score, t: h.t, dx, dz, nx: h.nx, nz: h.nz };
    }
    if (!best) { run.fx({ type: "noCover" }); return; }
    const nl = Math.hypot(best.nx, best.nz) || 1, nx = best.nx / nl, nz = best.nz / nl;
    const hx = b.x + best.dx * best.t, hz = b.z + best.dz * best.t;
    // High or low: does it still stop a ray at head height?
    const high = run.space.world.raycast(b.x, b.y + 1.55, b.z, best.dx, 0, best.dz, best.t + 0.4, _h);
    this.cover = { nx, nz, low: !high, tx: hx + nx * (b.r + 0.06), tz: hz + nz * (b.r + 0.06), snapT: 0.18, edge: 0 };
    this.sprinting = false; this.crouched = false;
    run.fx({ type: "cover", x: hx, y: b.y + 0.6, z: hz });
  }
  leaveCover() { this.cover = null; }

  // ── Weapons ───────────────────────────────────────────────────────────
  #weapons(run, I, dt) {
    const g = this.weapon, w = this.def;
    this.firing = false; this.beam = null;
    if (!g) return;
    // Cool the laser (both guns, carried or not).
    for (const s of this.slots) if (WEAPONS[s.id].kind === "beam") {
      const W = WEAPONS[s.id];
      if (!(s === g && I.fire && !s.hot && !this.sprinting)) s.heat = Math.max(0, s.heat - W.coolDown * dt);
      if (s.hot && s.heat < 0.25) { s.hot = false; run.fx({ type: "cooled" }); }
    }
    if (I.swapPressed && this.slots.length > 1 && !this.swapT) {
      this.cur = 1 - this.cur; this.swapT = 0.45; this.reloadT = 0;
      run.fx({ type: "swap", id: this.weapon.id });
      return;
    }
    if (this.swapT) { this.swapT = Math.max(0, this.swapT - dt); return; }
    if (this.reloadT) {
      this.reloadT = Math.max(0, this.reloadT - dt);
      if (!this.reloadT) {
        const need = w.mag - g.mag, take = Math.min(need, g.reserve);
        g.mag += take; if (g.reserve !== Infinity) g.reserve -= take;
        run.fx({ type: "reloaded" });
      }
      return;
    }
    if (I.reloadPressed && w.mag && g.mag < w.mag && g.reserve > 0) { this.#reload(run); return; }
    if (this.sprinting || !I.fire) return;

    // Where the shot goes: what the camera's centre is on, reached from the
    // muzzle (so a wall right in front of the gun still blocks it).
    const b = this.body, cam = this.cam;
    const aimT = trace(run, cam.x, cam.y, cam.z, cam.dx, cam.dy, cam.dz, 140);
    const tx = cam.x + cam.dx * aimT.t, ty = cam.y + cam.dy * aimT.t, tz = cam.z + cam.dz * aimT.t;
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const mh = b.h > 1.4 ? 1.42 : 0.92;
    const mx = b.x + this.peekX + rx * 0.32 * this.shoulder - Math.sin(this.yaw) * 0.45, mz = b.z + this.peekZ + rz * 0.32 * this.shoulder - Math.cos(this.yaw) * 0.45, my = b.y + mh;
    this.muzzle[0] = mx; this.muzzle[1] = my; this.muzzle[2] = mz;
    let dx = tx - mx, dy = ty - my, dz = tz - mz;
    const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    this.firing = true;
    this.lastShotT = run.time;
    this.calmT = Math.min(this.calmT, 1.5);

    if (w.kind === "beam") {
      if (g.hot) { if (I.firePressed) run.fx({ type: "dry" }); this.firing = false; return; }
      g.heat += w.heatUp * dt;
      if (g.heat >= 1) { g.heat = 1; g.hot = true; run.fx({ type: "overheat" }); }
      const h = trace(run, mx, my, mz, dx, dy, dz, w.range);
      if (h.bug) { h.bug.damage(run, w.dmg * dt, this, h.part, dx, dz, true); this.lastHit = h.bug; }
      this.beam = { x0: mx, y0: my, z0: mz, x1: mx + dx * h.t, y1: my + dy * h.t, z1: mz + dz * h.t, hit: !!h.bug || h.solid };
      if (this.fireT <= 0) { run.noise(b.x, b.z, w.noise, this, true); this.fireT = 0.3; }
      this.recoil += w.kick * dt * 60 * 0.3;
      return;
    }
    if (this.fireT > 0) return;
    if (!w.auto && !I.firePressed) return;
    if (g.mag <= 0) {
      if (g.reserve > 0) this.#reload(run); else if (I.firePressed) run.fx({ type: "dry" });
      return;
    }
    g.mag--;
    this.fireT = w.rate;
    const spread = w.spread + (w.aimSpread - w.spread) * this.aimK + (this.body.speed2D > 1 ? 0.01 : 0) + (this.body.grounded ? 0 : 0.02);
    const sx = (run.rng() - 0.5) * 2 * spread, sy = (run.rng() - 0.5) * 2 * spread;
    const ux = Math.cos(this.yaw), uz = -Math.sin(this.yaw);
    let ddx = dx + ux * sx, ddy = dy + sy, ddz = dz + uz * sx;
    const l = Math.hypot(ddx, ddy, ddz); ddx /= l; ddy /= l; ddz /= l;
    if (w.kind === "grenade") run.launchGrenade(this, mx, my, mz, ddx, ddy + 0.06, ddz, w);
    else bullet(run, this, mx, my, mz, ddx, ddy, ddz, w.range, w.dmg, w.color);
    this.recoil += w.kick;
    run.fx({ type: "shot", id: g.id, x: mx, y: my, z: mz, dx, dy, dz, src: "player" });
    run.noise(b.x, b.z, w.noise, this, true);
  }

  #reload(run) {
    this.reloadT = this.def.reload;
    run.fx({ type: "reload", id: this.weapon.id });
  }

  // ── Use points (terminals, racks, crates, charges) ────────────────────
  #use(run, I, dt) {
    const b = this.body;
    let near = null, nd = Infinity;
    for (const u of run.uses) {
      if (u.done || (u.when && !u.when(run))) continue;
      const d = Math.hypot(u.x - b.x, u.z - b.z);
      if (d < (u.r ?? 1.8) && Math.abs(u.y - b.y) < 3 && d < nd) { near = u; nd = d; }
    }
    if (near !== this.interact) this.useK = 0;
    this.interact = near;
    if (!near) return;
    if (near.hold) {
      if (I.use) {
        this.useK += dt / near.hold;
        if (near.loud && this.noiseT <= 0) { run.noise(near.x, near.z, near.loud, this, true); this.noiseT = 0.5; }
        if (this.useK >= 1) { this.useK = 0; run.activate(near); }
      } else this.useK = Math.max(0, this.useK - dt * 2);
    } else if (I.usePressed) run.activate(near);
  }

  // ── Getting hurt ──────────────────────────────────────────────────────
  hurt(run, dmg, fromX, fromZ, kind = "hit") {
    if (this.downed || this.iframes > 0 || this.godMode) return;
    dmg *= run.diff.dmg;
    this.calmT = 0;
    const s = Math.min(this.shield, dmg);
    this.shield -= s; dmg -= s;
    this.hp -= dmg;
    const ang = Math.atan2(fromX - this.body.x, fromZ - this.body.z);
    this.hurtDir = { a: ang, t: run.time };
    run.fx({ type: "hurt", shield: s > 0 && dmg <= 0, kind });
    if (this.hp <= 0) {
      this.hp = 0; this.downed = true; this.downT = P.bleedOut; this.reviveK = 0;
      this.cover = null; this.crouched = false;
      run.fx({ type: "downed" });
      run.say("kessler_downed");
    }
  }

  // The direction of the view (unit), for the renderer and the bots.
  get viewDir() { return [this.cam.dx, this.cam.dy, this.cam.dz]; }
  // How easy you are to see (0 hidden … 1 out in the open, upright).
  get exposure() {
    let k = this.crouchK > 0.5 ? 0.35 : 1;
    if (this.cover && !this.aiming) k *= 0.4;
    if (this.body.speed2D > 3) k *= 1.3;
    return k;
  }
}
