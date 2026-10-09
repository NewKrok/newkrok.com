import { PLAYER, NOISE, clamp, damp, dampAngle } from "../config.js";
import { Body } from "./body.js";
import { bullet } from "./combat.js";

// ── Sergeant Kessler, the ally ───────────────────────────────────────────
// Not under your command. She follows you; while you are not fighting she
// keeps low, stays near and takes cover when you stop. The moment you open
// fire (or the bugs come for either of you) she fights too, and from then
// on she is as loud and as visible as you are: the bugs can go for her.
// She gets you up when you are down, and she cannot be lost: knocked down,
// she gets up again after a while.

const _h = {};
const SPOTS = 20;

export class Ally {
  constructor(x, y, z, yaw = 0) {
    this.kind = "ally";
    this.body = new Body(x, y, z, { radius: 0.36 });
    this.face = yaw;
    this.hp = 150; this.maxHp = 150; this.shield = 40;
    this.calmT = 99;
    this.downed = false; this.downT = 0;
    this.mode = "follow";          // follow | fight | revive
    this.combatT = 0;              // how long ago the fight was hot
    this.crouched = false; this.crouchK = 0;
    this.target = null; this.burst = 0; this.shotT = 0; this.seekT = 0;
    this.spot = null;              // where she wants to be
    this.coverN = null;            // the wall she leans on
    this.moveK = 0; this.stepPhase = 0;
    this.aimK = 0; this.firing = false;
    this.noiseT = 0;
    this.muzzle = [0, 0, 0];
    this.aimYaw = yaw; this.aimPitch = 0;
    this.stuckT = 0;
    this.holdFire = false;         // a cutscene or the script can tell her to keep quiet
  }

  get exposure() { return (this.crouchK > 0.5 ? 0.45 : 1) * (this.coverN ? 0.4 : 1); }

  step(run, dt) {
    const b = this.body, p = run.player;
    this.shotT -= dt; this.calmT += dt; this.seekT -= dt;
    this.firing = false;
    if (this.downed) {
      this.downT -= dt;
      b.step(run.space, { vx: 0, vz: 0 }, dt);
      b.h = 0.7;
      if (this.downT <= 0) {
        this.downed = false; this.hp = this.maxHp * 0.5; this.shield = 0;
        run.fx({ type: "allyUp" }); run.say("kessler_up");
      }
      return;
    }
    if (this.calmT > 4) this.shield = Math.min(40, this.shield + 16 * dt);

    // Is there a fight on? You fired, or something hunts one of us.
    const hunted = run.bugs.some((g) => g.alive && !g.hidden && g.state === "hunt" && (g.target === this || g.target === p) && Math.hypot(g.x - b.x, g.z - b.z) < 45);
    this.hunted = hunted;
    if ((run.time - p.lastShotT < 2 || hunted) && !this.holdFire) this.combatT = 6; else this.combatT -= dt;
    const fight = this.combatT > 0;

    let gx = b.x, gz = b.z, speed = PLAYER.walk;
    if (p.downed) {
      // Get to the ranger and pull them up.
      this.mode = "revive";
      gx = p.body.x; gz = p.body.z;
      const d = Math.hypot(gx - b.x, gz - b.z);
      speed = PLAYER.run;
      if (d < 1.4) { speed = 0; p.reviveK += dt / PLAYER.revive; this.crouched = true; if (p.reviveK > 0.05 && !this.saidRevive) { this.saidRevive = true; run.say("kessler_reviving"); } }
    } else {
      this.saidRevive = false;
      this.mode = fight ? "fight" : "follow";
      if (this.seekT <= 0 || !this.spot) { this.spot = this.#pickSpot(run, fight); this.seekT = fight ? 1.4 : 0.8; }
      gx = this.spot.x; gz = this.spot.z;
      const d = Math.hypot(gx - b.x, gz - b.z), pd = Math.hypot(p.body.x - b.x, p.body.z - b.z);
      speed = pd > 14 || d > 8 ? PLAYER.run : p.crouched || p.cover ? PLAYER.crouch * 1.3 : PLAYER.walk;
      if (d < 0.5) speed = 0;
      this.crouched = !fight ? (p.crouched || !!p.cover || this.spot.cover) : !!this.spot.cover && !this.firing;
    }

    // Walk there: straight if it can, else round things on the field.
    let wx = 0, wz = 0;
    const dx = gx - b.x, dz = gz - b.z, d = Math.hypot(dx, dz);
    if (d > 0.4 && speed > 0) {
      if (d < 10 && run.space.clear(b.x, b.y + 0.6, b.z, gx, run.space.terrain.height(gx, gz) + 0.6, gz)) { wx = dx / d; wz = dz / d; }
      else {
        const f = run.nav.field("allyGoal", gx, gz, run.time, 0.6), w = run.nav.dir(f, b.x, b.z);
        if (w) [wx, wz] = w; else { wx = dx / d; wz = dz / d; }
      }
    }
    const sp = this.crouched && this.mode !== "revive" ? Math.min(speed, PLAYER.crouch * 1.4) : speed;
    const ox = b.x, oz = b.z;
    b.step(run.space, { vx: wx * sp, vz: wz * sp, jump: false, jumpPressed: false }, dt);
    // Stuck on something: hop.
    if (sp > 0 && Math.hypot(b.x - ox, b.z - oz) < sp * dt * 0.2) { this.stuckT += dt; if (this.stuckT > 0.6 && b.grounded) { b.vy = 6.5; b.grounded = false; this.stuckT = 0; } } else this.stuckT = 0;
    // Far behind and out of sight: catch up.
    const pd = Math.hypot(p.body.x - b.x, p.body.z - b.z);
    if (pd > 50 && !this.#seenBy(run, p)) {
      const a = p.face + Math.PI + 0.5;
      const x = p.body.x + Math.sin(a) * 4, z = p.body.z + Math.cos(a) * 4;
      if (run.nav.isOpen(x, z)) b.place(x, run.space.floor(x, z, p.body.y + 1) + 0.05, z);
    }
    b.h = this.crouched ? PLAYER.crouchHeight : PLAYER.height;
    this.crouchK = damp(this.crouchK, this.crouched ? 1 : 0, 10, dt);
    this.moveK = damp(this.moveK, clamp(b.speed2D / PLAYER.run, 0, 1), 10, dt);
    if (b.speed2D > 0.3 && b.grounded) this.stepPhase += dt * b.speed2D * 1.25;

    // Noise: like yours.
    this.noiseT -= dt;
    // She knows how to move: while you sneak she is as quiet as you, and
    // she only makes running noise once there is a fight.
    if (b.speed2D > 0.6 && this.noiseT <= 0) {
      const sneak = !fight && (p.crouched || p.cover);
      run.noise(b.x, b.z, sneak ? NOISE.crouch : fight && b.speed2D > 5 ? NOISE.run : NOISE.walk, this);
      this.noiseT = 0.35;
    }

    // Shoot.
    this.#shoot(run, dt, fight && this.mode !== "revive");
    const faceTo = this.firing || this.aimK > 0.5 ? this.aimYaw : b.speed2D > 0.5 ? Math.atan2(-b.vx, -b.vz) : this.coverN ? Math.atan2(this.coverN[0], this.coverN[1]) : p.face;
    this.face = dampAngle(this.face, faceTo, 9, dt);
  }

  #seenBy(run, p) {
    const c = p.cam; if (!c.dx) return false;
    const dx = this.body.x - c.x, dz = this.body.z - c.z, l = Math.hypot(dx, dz) || 1;
    return (dx * c.dx + dz * c.dz) / l > 0.5 && run.space.clear(c.x, c.y, c.z, this.body.x, this.body.y + 1, this.body.z);
  }

  // Where to stand: near the ranger, a little behind and to the side; in
  // cover when there is a wall about, with a line to the target in a fight.
  #pickSpot(run, fight) {
    const p = run.player, b = this.body;
    const px = p.body.x, pz = p.body.z, back = p.face + Math.PI;
    let best = null;
    for (let i = 0; i < SPOTS; i++) {
      const a = back + (i / SPOTS - 0.5) * Math.PI * (fight ? 2 : 1.3);
      const r = fight ? 3 + (i % 3) * 1.5 : 2.2 + (i % 2) * 1.2;
      const x = px + Math.sin(a) * r, z = pz + Math.cos(a) * r;
      if (!run.nav.isOpen(x, z)) continue;
      const y = run.space.floor(x, z, p.body.y + 1.5);
      if (Math.abs(y - p.body.y) > 2.5) continue;
      if (!run.space.clear(px, p.body.y + 1, pz, x, y + 1, z)) continue;
      // A wall within reach to lean on?
      let cover = null;
      for (let k = 0; k < 8; k++) {
        const ca = (k / 8) * Math.PI * 2, cx = Math.sin(ca), cz = Math.cos(ca);
        const h = run.space.world.raycast(x, y + 0.55, z, cx, 0, cz, 1.0, _h);
        if (h && Math.abs(h.ny) < 0.3) { cover = [h.nx, h.nz]; break; }
      }
      let score = Math.hypot(x - b.x, z - b.z) * 0.15 + (cover ? -2 : 0);
      // Not in your line of fire.
      const cx = -Math.sin(p.yaw), cz = -Math.cos(p.yaw), ax = x - px, az = z - pz, al = Math.hypot(ax, az) || 1;
      if ((ax * cx + az * cz) / al > 0.7) score += 6;
      // Nor between the camera and you (she would fill the screen).
      const c = p.cam;
      if (c.x !== undefined) {
        const vx = px - c.x, vz = pz - c.z, vl = Math.hypot(vx, vz) || 1, t = ((x - c.x) * vx + (z - c.z) * vz) / (vl * vl);
        if (t > -0.2 && t < 1.3 && Math.abs((x - c.x) * vz - (z - c.z) * vx) / vl < 1.4) score += 8;
      }
      if (fight && this.target?.alive && !run.space.clear(x, y + 1.2, z, this.target.x, this.target.y + 0.6, this.target.z)) score += 3;
      // Sneaking: keep clear of bugs that have not noticed you.
      if (!fight) for (const g of run.bugs) {
        if (!g.alive || g.hidden || g.state === "hunt") continue;
        const d = Math.hypot(g.x - x, g.z - z);
        if (d < 7) score += (7 - d) * 3;
      }
      if (!best || score < best.score) best = { x, z, score, cover };
    }
    this.coverN = best?.cover ?? null;
    return best ?? { x: px - Math.sin(p.face) * -2, z: pz - Math.cos(p.face) * -2, cover: null };
  }

  #shoot(run, dt, fight) {
    const b = this.body;
    this.aimK = damp(this.aimK, fight ? 1 : 0, 6, dt);
    if (!fight) { this.target = null; return; }
    // Nothing hunts us yet (you picked one off quietly): she only helps
    // with the one you are shooting at, so the rest stay asleep.
    if (!this.hunted) {
      const t = run.player.lastHit;
      this.target = t?.alive && run.time - run.player.lastShotT < 2 && run.space.clear(b.x, b.y + 1.4, b.z, t.x, t.y + t.def.height * 0.6, t.z) ? t : null;
    } else if (!this.target?.alive || this.target.hidden || Math.random() < dt * 0.8) {
      let best = null, bs = Infinity;
      for (const g of run.bugs) {
        if (!g.alive || g.hidden) continue;
        const d = Math.hypot(g.x - b.x, g.z - b.z);
        if (d > 38) continue;
        if (!run.space.clear(b.x, b.y + 1.4, b.z, g.x, g.y + g.def.height * 0.6, g.z)) continue;
        const s = d - (g.target === run.player ? 8 : 0) - (g.type === "sentry" ? 10 : 0);
        if (s < bs) { bs = s; best = g; }
      }
      this.target = best;
    }
    const g = this.target;
    if (!g) return;
    const mx = b.x - Math.sin(this.face) * 0.4, mz = b.z - Math.cos(this.face) * 0.4, my = b.y + (this.crouched ? 1.0 : 1.4);
    // Aim at the soft parts she knows about.
    let ax = g.x, ay = g.y + g.def.height * 0.55, az = g.z;
    if (g.type === "charger") { ax += Math.sin(g.face) * 0.9; az += Math.cos(g.face) * 0.9; }
    const dx = ax - mx, dy = ay - my, dz = az - mz, l = Math.hypot(dx, dy, dz);
    this.aimYaw = Math.atan2(-dx, -dz); this.aimPitch = Math.asin(clamp(dy / l, -1, 1));
    if (this.shotT > 0) return;
    if (this.burst <= 0) { this.burst = 3 + Math.floor(Math.random() * 4); }
    this.burst--;
    this.shotT = this.burst > 0 ? 0.11 : 0.55 + Math.random() * 0.5;
    const sp = 0.035 + Math.min(0.04, l * 0.001);
    const sx = (Math.random() - 0.5) * 2 * sp, sy = (Math.random() - 0.5) * 2 * sp;
    let ux = dx / l + Math.cos(this.aimYaw) * sx, uy = dy / l + sy, uz = dz / l - Math.sin(this.aimYaw) * sx;
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    this.muzzle[0] = mx; this.muzzle[1] = my; this.muzzle[2] = mz;
    bullet(run, this, mx, my, mz, ux, uy, uz, 90, 9, 0xb8f0ff);
    this.firing = true; this.lastShot = run.time;
    run.fx({ type: "shot", id: "rifle", x: mx, y: my, z: mz, dx: ux, dy: uy, dz: uz, src: "ally" });
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
      run.fx({ type: "allyDown" }); run.say("kessler_hit");
    }
  }
}
