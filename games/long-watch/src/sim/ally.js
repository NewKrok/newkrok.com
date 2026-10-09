import { PLAYER, clamp, damp, dampAngle } from "../config.js";
import { Body } from "./body.js";
import { bullet } from "./combat.js";

// ── The defenders ────────────────────────────────────────────────────────
// Kessler and the two rangers hold the base. Each has a post near the
// reactor: they move about it, lean on a wall when there is one, and
// shoot whatever comes within range, the chargers from behind. They get
// the ranger up when they are down nearby, and they cannot be lost:
// knocked down, they are up again after a while. Not under your command.

const _h = {};
const SPOTS = 14;

export class Ally {
  // o: { name, skin, post: { x, z, r }, reach (how far from the post they go for a revive) }
  constructor(x, y, z, yaw = 0, o = {}) {
    this.kind = "ally";
    this.name = o.name ?? "kessler";
    this.skin = o.skin ?? "kessler";
    this.post = o.post ?? { x, z, r: 5 };
    this.reach = o.reach ?? 30;
    this.body = new Body(x, y, z, { radius: 0.36 });
    this.face = yaw;
    this.hp = 120; this.maxHp = 120; this.shield = 40;
    this.calmT = 99;
    this.downed = false; this.downT = 0;
    this.mode = "hold";            // hold | fight | revive
    this.combatT = 0;
    this.crouched = false; this.crouchK = 0;
    this.target = null; this.burst = 0; this.shotT = 0; this.seekT = 0;
    this.spot = null;
    this.coverN = null;
    this.moveK = 0; this.stepPhase = 0;
    this.aimK = 0; this.firing = false;
    this.noiseT = 0;
    this.muzzle = [0, 0, 0];
    this.aimYaw = yaw; this.aimPitch = 0;
    this.stuckT = 0;
    this.holdFire = false;
    this.mag = 36; this.reloadT = 0; this.reloadTime = 1.7;
    this.recoil = 0;
    this.idx = 0;
  }

  get exposure() { return (this.crouchK > 0.5 ? 0.45 : 1) * (this.coverN ? 0.4 : 1); }

  step(run, dt) {
    const b = this.body, p = run.player;
    this.shotT -= dt; this.calmT += dt; this.seekT -= dt;
    this.firing = false;
    this.recoil = damp(this.recoil, 0, 10, dt);
    if (this.reloadT > 0) this.reloadT = Math.max(0, this.reloadT - dt);
    if (this.downed) {
      this.downT -= dt;
      b.step(run.space, { vx: 0, vz: 0 }, dt);
      b.h = 0.7;
      if (this.downT <= 0) {
        this.downed = false; this.hp = this.maxHp * 0.5; this.shield = 0;
        run.fx({ type: "allyUp", who: this.idx }); if (this.idx === 0) run.say("kessler_up");
      }
      return;
    }
    if (this.calmT > 4) this.shield = Math.min(40, this.shield + 16 * dt);

    // A fight is on when anything hunts within range of the post.
    let fight = false;
    for (const g of run.bugs) {
      if (!g.alive || g.hidden || !(g.state === "hunt" || g.boss)) continue;
      if (Math.hypot(g.x - b.x, g.z - b.z) < 42) { fight = true; break; }
    }
    this.hunted = fight;
    if (fight && !this.holdFire) this.combatT = 5; else this.combatT -= dt;
    fight = this.combatT > 0;

    let gx = b.x, gz = b.z, speed = PLAYER.walk;
    const pd = Math.hypot(p.body.x - this.post.x, p.body.z - this.post.z);
    // Someone else already on the way? The nearest defender goes.
    const nearestReviver = p.downed ? run.allies.filter((a) => !a.downed && Math.hypot(p.body.x - a.post.x, p.body.z - a.post.z) < a.reach).sort((u, v) => Math.hypot(p.body.x - u.body.x, p.body.z - u.body.z) - Math.hypot(p.body.x - v.body.x, p.body.z - v.body.z))[0] : null;
    if (p.downed && nearestReviver === this && pd < this.reach) {
      this.mode = "revive";
      gx = p.body.x; gz = p.body.z;
      const d = Math.hypot(gx - b.x, gz - b.z);
      speed = PLAYER.run;
      if (d < 1.4) { speed = 0; p.reviveK += dt / PLAYER.revive; this.crouched = true; if (p.reviveK > 0.05 && !this.saidRevive) { this.saidRevive = true; if (this.idx === 0) run.say("kessler_reviving"); } }
    } else {
      this.saidRevive = false;
      this.mode = fight ? "fight" : "hold";
      if (this.seekT <= 0 || !this.spot) { this.spot = this.#pickSpot(run, fight); this.seekT = fight ? 1.6 : 3; }
      gx = this.spot.x; gz = this.spot.z;
      const d = Math.hypot(gx - b.x, gz - b.z);
      speed = d > 8 ? PLAYER.run : PLAYER.walk;
      if (d < 0.5) speed = 0;
      this.crouched = !!this.spot.cover && !this.firing;
    }

    // Walk there: straight if it can, else round things on the field.
    let wx = 0, wz = 0;
    const dx = gx - b.x, dz = gz - b.z, d = Math.hypot(dx, dz);
    if (d > 0.4 && speed > 0) {
      if (d < 10 && run.space.clear(b.x, b.y + 0.6, b.z, gx, run.space.terrain.height(gx, gz) + 0.6, gz)) { wx = dx / d; wz = dz / d; }
      else {
        const f = run.nav.field(`ally${this.idx}`, gx, gz, run.time, 0.6), w = run.nav.dir(f, b.x, b.z);
        if (w) [wx, wz] = w; else { wx = dx / d; wz = dz / d; }
      }
    }
    const sp = this.crouched && this.mode !== "revive" ? Math.min(speed, PLAYER.crouch * 1.4) : speed;
    const ox = b.x, oz = b.z;
    b.step(run.space, { vx: wx * sp, vz: wz * sp, jump: false, jumpPressed: false }, dt);
    if (sp > 0 && Math.hypot(b.x - ox, b.z - oz) < sp * dt * 0.2) { this.stuckT += dt; if (this.stuckT > 0.6 && b.grounded) { b.vy = 6.5; b.grounded = false; this.stuckT = 0; } } else this.stuckT = 0;
    b.h = this.crouched ? PLAYER.crouchHeight : PLAYER.height;
    this.crouchK = damp(this.crouchK, this.crouched ? 1 : 0, 10, dt);
    this.moveK = damp(this.moveK, clamp(b.speed2D / PLAYER.run, 0, 1), 10, dt);
    if (b.speed2D > 0.3 && b.grounded) this.stepPhase += dt * b.speed2D * 1.25;

    this.#shoot(run, dt, fight && this.mode !== "revive");
    const faceTo = this.firing || this.aimK > 0.5 ? this.aimYaw : b.speed2D > 0.5 ? Math.atan2(-b.vx, -b.vz) : this.coverN ? Math.atan2(this.coverN[0], this.coverN[1]) : this.#outward();
    this.face = dampAngle(this.face, faceTo, 9, dt);
  }

  // Facing away from the reactor when there is nothing to do.
  #outward() { const c = this.post; return Math.atan2(-(c.x - this.body.x) || 0.01, -(c.z - this.body.z) || 0.01) + Math.PI; }

  // Where to stand: round the post, in cover when there is a wall, with a
  // line to the target in a fight, not on top of the other defenders.
  #pickSpot(run, fight) {
    const b = this.body, P = this.post;
    let best = null;
    const T = this.target;
    for (let i = 0; i < SPOTS; i++) {
      const a = (i / SPOTS) * Math.PI * 2 + (fight ? run.rng() * 0.4 : 0);
      const r = (i % 3) * (P.r / 3) + 1.2;
      const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
      if (!run.nav.isOpen(x, z)) continue;
      const y = run.space.floor(x, z, b.y + 1.5);
      if (Math.abs(y - b.y) > 2.5) continue;
      let cover = null;
      for (let k = 0; k < 8; k++) {
        const ca = (k / 8) * Math.PI * 2, cx = Math.sin(ca), cz = Math.cos(ca);
        const h = run.space.world.raycast(x, y + 0.55, z, cx, 0, cz, 1.0, _h);
        if (h && Math.abs(h.ny) < 0.3) { cover = [h.nx, h.nz]; break; }
      }
      let score = Math.hypot(x - b.x, z - b.z) * 0.2 + (cover ? -1.5 : 0);
      for (const o of run.allies) if (o !== this && Math.hypot(o.body.x - x, o.body.z - z) < 2.2) score += 5;
      if (fight && T?.alive) {
        if (!run.space.clear(x, y + 1.2, z, T.x, T.y + T.def.height * 0.6, T.z)) score += 4;
        // Toward the trouble, a little.
        const dx = T.x - P.x, dz = T.z - P.z, l = Math.hypot(dx, dz) || 1;
        score -= ((x - P.x) * dx + (z - P.z) * dz) / l * 0.15;
      }
      if (!best || score < best.score) best = { x, z, score, cover };
    }
    this.coverN = best?.cover ?? null;
    return best ?? { x: P.x, z: P.z, cover: null };
  }

  #shoot(run, dt, fight) {
    const b = this.body;
    this.aimK = damp(this.aimK, fight ? 1 : 0, 6, dt);
    if (!fight) { this.target = null; return; }
    if (!this.target?.alive || this.target.hidden || run.rng() < dt * 0.8) {
      let best = null, bs = Infinity;
      for (const g of run.bugs) {
        if (!g.alive || g.hidden) continue;
        const d = Math.hypot(g.x - b.x, g.z - b.z);
        if (d > 40) continue;
        if (!run.space.clear(b.x, b.y + 1.4, b.z, g.x, g.y + g.def.height * 0.6, g.z)) continue;
        const s = d - (g.target === run.core ? 6 : 0) - (g.target === run.player ? 4 : 0) - (g.boss ? 10 : 0);
        if (s < bs) { bs = s; best = g; }
      }
      this.target = best;
    }
    const g = this.target;
    if (!g) return;
    const mx = b.x - Math.sin(this.face) * 0.4, mz = b.z - Math.cos(this.face) * 0.4, my = b.y + (this.crouched ? 1.0 : 1.4);
    let ax = g.x, ay = g.y + g.def.height * 0.55, az = g.z;
    if (g.type === "charger") { ax += Math.sin(g.face) * 0.9; az += Math.cos(g.face) * 0.9; }
    if (g.boss) { ay = g.y + 2.3; }
    const dx = ax - mx, dy = ay - my, dz = az - mz, l = Math.hypot(dx, dy, dz);
    this.aimYaw = Math.atan2(-dx, -dz); this.aimPitch = Math.asin(clamp(dy / l, -1, 1));
    if (this.shotT > 0 || this.reloadT > 0) return;
    if (this.mag <= 0) {
      this.mag = 36; this.reloadT = this.reloadTime; this.burst = 0;
      run.fx({ type: "reload", id: "rifle", src: "ally", who: this.idx, x: b.x, z: b.z });
      return;
    }
    if (this.burst <= 0) { this.burst = 3 + Math.floor(run.rng() * 4); }
    this.burst--;
    this.shotT = this.burst > 0 ? 0.11 : 0.55 + run.rng() * 0.5;
    const sp = 0.035 + Math.min(0.04, l * 0.001);
    const sx = (run.rng() - 0.5) * 2 * sp, sy = (run.rng() - 0.5) * 2 * sp;
    let ux = dx / l + Math.cos(this.aimYaw) * sx, uy = dy / l + sy, uz = dz / l - Math.sin(this.aimYaw) * sx;
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    this.muzzle[0] = mx; this.muzzle[1] = my; this.muzzle[2] = mz;
    bullet(run, this, mx, my, mz, ux, uy, uz, 90, 7, 0xb8f0ff);
    this.firing = true; this.lastShot = run.time; this.mag--; this.recoil += 0.012;
    run.fx({ type: "shot", id: "rifle", x: mx, y: my, z: mz, dx: ux, dy: uy, dz: uz, src: "ally", who: this.idx });
    run.noise(b.x, b.z, 28, this, true);
  }

  hurt(run, dmg, fromX, fromZ) {
    if (this.downed) return;
    this.calmT = 0;
    dmg *= run.diff.allyDmg;
    const s = Math.min(this.shield, dmg); this.shield -= s; dmg -= s;
    this.hp -= dmg;
    run.fx({ type: "allyHurt", x: this.body.x, y: this.body.y + 1, z: this.body.z });
    if (this.hp <= 0) {
      this.hp = 0; this.downed = true; this.downT = 12;
      run.fx({ type: "allyDown", who: this.idx }); if (this.idx === 0) run.say("kessler_hit");
    }
  }
}
