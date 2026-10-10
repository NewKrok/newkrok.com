import { bullet } from "./combat.js";

// ── Drones and turrets ───────────────────────────────────────────────────
// Bought at the base. A drone hovers beside the ranger and does one thing:
// support (heals and keeps the stamina up), ammo (feeds rounds into the
// reserve), attack (shoots what hunts you), detector (the minimap shows
// bugs and pickups). A turret stands at a slot round the reactor and
// shoots whatever comes within range. Neither can be destroyed.

export const DRONES = {
  support: { heal: 2.2, stamina: 0.6, color: 0x8fe8d0 },
  ammo: { every: 2.5, rounds: 4, color: 0xf0b860 },
  attack: { range: 24, dmg: 6, rate: 0.28, color: 0xff6a5a },
  detector: { range: 90, color: 0x9cff3a },
};
export const TURRET = { range: 30, dmg: 8, rate: 0.22, color: 0xd8862e };

export class Drone {
  constructor(type, idx) {
    this.kind = "drone"; this.type = type; this.def = DRONES[type]; this.idx = idx;
    this.x = 0; this.y = 0; this.z = 0; this.px = 0; this.py = 0; this.pz = 0;
    this.t = 0; this.shotT = 0; this.feedT = 0; this.yaw = 0;
    this.target = null; this.muzzle = [0, 0, 0];
  }
  step(run, dt) {
    const p = run.player, b = p.body, d = this.def;
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.t += dt;
    // Hover behind and beside the ranger, each drone on its own spot.
    // Out to the sides and a little ahead, where the camera does not stare at them.
    const side = this.idx % 2 ? 1 : -1, a = p.face + side * (1.35 + Math.floor(this.idx / 2) * 0.5);
    const wx = b.x + Math.sin(a) * 2.4, wz = b.z + Math.cos(a) * 2.4, wy = b.y + 1.9 + Math.sin(this.t * 2 + this.idx) * 0.15;
    const k = Math.min(1, dt * 4);
    if (Math.hypot(wx - this.x, wz - this.z) > 30) { this.x = wx; this.y = wy; this.z = wz; }
    this.x += (wx - this.x) * k; this.y += (wy - this.y) * k; this.z += (wz - this.z) * k;
    this.yaw = p.face;
    switch (this.type) {
      case "support":
        if (!p.downed) { p.hp = Math.min(p.maxHp, p.hp + d.heal * dt); p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * d.stamina * 0.12 * dt); }
        break;
      case "ammo":
        this.feedT -= dt;
        if (this.feedT <= 0) {
          this.feedT = d.every;
          for (const g of p.slots) if (g.reserve !== Infinity) { const W = run.weaponDef(g.id); if (W.reserve) g.reserve = Math.min(W.reserve * p.reserveMul, g.reserve + d.rounds); }
        }
        break;
      case "attack": {
        this.shotT -= dt;
        if (!this.target?.alive || this.target.hidden || Math.hypot(this.target.x - this.x, this.target.z - this.z) > d.range) {
          let best = null, bd = d.range;
          for (const g of run.bugs) {
            if (!g.alive || g.hidden || g.def.fly) continue;
            const dd = Math.hypot(g.x - this.x, g.z - this.z) - (g.state === "hunt" ? 6 : 0);
            if (dd < bd && run.space.clear(this.x, this.y, this.z, g.x, g.y + g.def.height * 0.6, g.z)) { bd = dd; best = g; }
          }
          this.target = best;
        }
        const g = this.target;
        if (g) { this.yaw = Math.atan2(-(g.x - this.x), -(g.z - this.z)); if (this.shotT <= 0) { this.shotT = d.rate; shoot(run, this, this.x, this.y - 0.1, this.z, g.x, g.y + g.def.height * 0.55, g.z, d.dmg, 0xff8a6a); } }
        break;
      }
    }
  }
}

export class Turret {
  constructor(x, y, z, idx) {
    this.kind = "turret"; this.idx = idx;
    this.x = x; this.y = y; this.z = z;
    this.yaw = 0; this.pitch = 0; this.shotT = 0; this.target = null; this.firing = false;
    this.muzzle = [x, y + 1.3, z];
  }
  step(run, dt) {
    const d = TURRET;
    this.shotT -= dt; this.firing = false;
    if (!this.target?.alive || this.target.hidden || Math.hypot(this.target.x - this.x, this.target.z - this.z) > d.range || (run.frame & 15) === this.idx) {
      let best = null, bd = d.range;
      for (const g of run.bugs) {
        if (!g.alive || g.hidden) continue;
        const dd = Math.hypot(g.x - this.x, g.z - this.z) - (g.target === run.core ? 8 : 0) - (g.boss ? 10 : 0);
        if (dd < bd && run.space.clear(this.x, this.y + 1.3, this.z, g.x, g.y + g.def.height * 0.6, g.z)) { bd = dd; best = g; }
      }
      this.target = best;
    }
    const g = this.target;
    if (!g) return;
    const ty = g.y + g.def.height * 0.55;
    this.yaw = Math.atan2(-(g.x - this.x), -(g.z - this.z));
    this.pitch = Math.atan2(ty - (this.y + 1.3), Math.hypot(g.x - this.x, g.z - this.z));
    if (this.shotT <= 0) { this.shotT = d.rate; this.firing = true; shoot(run, this, this.x, this.y + 1.3, this.z, g.x, ty, g.z, d.dmg, 0xffc46a); }
  }
}

function shoot(run, src, x, y, z, tx, ty, tz, dmg, color) {
  let dx = tx - x, dy = ty - y, dz = tz - z;
  const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  const sp = 0.03;
  dx += (run.rng() - 0.5) * sp; dy += (run.rng() - 0.5) * sp; dz += (run.rng() - 0.5) * sp;
  const l2 = Math.hypot(dx, dy, dz); dx /= l2; dy /= l2; dz /= l2;
  src.muzzle[0] = x; src.muzzle[1] = y; src.muzzle[2] = z;
  bullet(run, src, x, y, z, dx, dy, dz, 60, dmg, color);
  run.fx({ type: "shot", id: "turret", x, y, z, dx, dy, dz, src: src.kind, who: src.idx });
  run.noise(x, z, 20, src, true);
}
