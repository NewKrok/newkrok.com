import { damageFoe, tossFoe, tossable, slapFoe } from "./foes.js";

// ── Grandpa Joe's umbrella, the Gust Umbrella ────────────────────────────
// A gust (snapped open and shut) runs out in a cone ahead: a small walker
// is tossed up in the air, a flyer slapped down to the ground, a big one
// shoved, and orbs are blown off harmless. Nothing goes through a wall.
// Aimed at your feet in mid-air it lifts you once per jump.
//
// Held open over you it is a shield in front and above: orbs stop on it,
// a bonk from the front only half lands. In the air you glide, and an
// updraft (kit.updraft) carries an open umbrella up to its top. Some
// updrafts sleep until a gust sets their pinwheel spinning (kit.pinwheel).

export class Umbrella {
  constructor(kit) {
    this.drafts = kit.updrafts.map((d) => ({ ...d, k: d.pinwheel ? 0 : 1 }));
    this.wheels = kit.pinwheels.map((p) => ({ ...p, spinT: 0, speed: 0 }));
    this.hopped = false;       // the lift off a gust at your feet: once per jump
    this.inDraft = null;       // the updraft carrying you (for the sound and the view)
  }

  // Is the umbrella in hand and held open (not while switching tools)?
  open(run) {
    const t = run.activeTool;
    return t.id === "umbrella" && t.open && run.switchT <= 0 && !run.opts.noTools;
  }

  // Before the body moves: a glide under an open umbrella, an updraft's lift.
  carry(run, dt) {
    const b = run.body, tool = run.activeTool, open = this.open(run);
    if (b.grounded) this.hopped = false;
    b.glide = open ? tool.def.glide.fall : 0;
    b.airMul = open ? tool.def.glide.air : 1;
    this.inDraft = null;
    if (!open) return;
    const D = tool.def;
    for (const d of this.drafts) {
      if (d.k <= 0.02 || Math.hypot(b.x - d.x, b.z - d.z) > d.r || b.y < d.y - 0.5 || b.y > d.top) continue;
      // Strongest low down, easing off near the top so you bob there.
      const k = d.k * Math.min(1, (d.top - b.y) / 2.5);
      b.vy = Math.min(b.vy + D.lift * k * dt, D.rise * Math.max(0.15, k));
      if (b.vy > 0) b.grounded = false;
      this.inDraft = d;
      break;
    }
  }

  gust(run, tool) {
    const d = tool.def, b = run.body, [ax, ay, az] = run.aimDir();
    const ox = b.x, oy = b.eyeY - 0.1, oz = b.z;
    run.stats.shots++;
    run.events.push({ type: "gust", dir: [ax, ay, az] });
    // At your feet in mid-air: a little lift.
    if (!b.grounded && ay < -0.6 && !this.hopped) {
      this.hopped = true;
      b.vy = Math.max(b.vy, d.hop);
      run.events.push({ type: "gustHop", x: b.x, y: b.y, z: b.z });
    }
    // How much of the gust reaches (x, y, z), 0 if none: in the cone, in
    // range, nothing in between; stronger close up.
    const reach = (x, y, z, R = 0) => {
      const ex = x - ox, ey = y - oy, ez = z - oz, l = Math.hypot(ex, ey, ez);
      if (l - R > d.range) return 0;
      if (l > 0.6 && (ex * ax + ey * ay + ez * az) / l < Math.cos(d.cone + Math.atan(R / Math.max(l, 0.6)))) return 0;
      if (l > 0.6) {
        const hit = run.world.raycast(ox, oy, oz, ex / l, ey / l, ez / l, l);
        if (hit && hit.t < l - R - 0.15) return 0;
      }
      return 1.15 - 0.5 * Math.min(1, l / d.range);
    };
    for (const f of run.foes) {
      if (!f.alive || f.state === "spawn") continue;
      const k = reach(f.px, f.cy, f.pz, f.def.hitR);
      if (!k) continue;
      const ex = f.px - ox, ez = f.pz - oz, l = Math.hypot(ex, ez) || 1, ux = ex / l, uz = ez / l;
      // Small walkers go up, flyers go down, the big ones are only shoved.
      const toss = tossable(f) && !f.aloft && !(f.stuckT > 0), shove = !toss && !f.def.fly && !f.def.still;
      const p = shove ? d.push / 3.5 * k : 0;
      if (damageFoe(run, f, d.damage, ux * p, uz * p, shove)) { run.stats.popped++; continue; }
      run.stats.hits++;
      if (f.def.fly) slapFoe(run, f, d.slap);
      else if (toss) tossFoe(run, f, d.toss * Math.min(1, k + 0.15), ux * d.push * 0.45 * k, uz * d.push * 0.45 * k);
    }
    for (const s of run.spits) {
      if (s.harmless || s.life <= 0 || !reach(s.x, s.y, s.z, 0.4)) continue;
      s.vx = ax * 14; s.vy = Math.max(s.vy, 2); s.vz = az * 14; s.harmless = true;
      run.events.push({ type: "spitBlown", x: s.x, y: s.y, z: s.z });
    }
    for (const c of run.clouds) if (reach(c.x, c.y + 0.8, c.z, c.r)) { c.life = Math.min(c.life, c.t + 0.3); run.events.push({ type: "cloudBlown", x: c.x, y: c.y + 0.8, z: c.z }); }
    for (const w of this.wheels) {
      if (!reach(w.x, w.y + w.h, w.z, 0.8)) continue;
      if (!(w.spinT > 0)) run.events.push({ type: "pinwheel", id: w.id, x: w.x, y: w.y + w.h, z: w.z });
      w.spinT = w.time;
    }
    const B = run.boss;
    if (B?.alive && !B.invulnerable) {
      for (const [x, y, z, r, mul, part] of B.hitSpheres()) {
        if (!reach(x, y, z, r)) continue;
        B.damage(run, d.damage * mul, part);
        B.gusted?.(run, ax, az, part);
        break;
      }
    }
  }

  // An orb about to hit you: does the open umbrella catch it? (It covers
  // the front, the way you look, and everything from above.)
  covers(run, x, y, z) {
    if (!this.open(run) || run.activeTool.overheated) return false;
    const b = run.body, ex = x - b.x, ey = y - (b.y + 1.1), ez = z - b.z, l = Math.hypot(ex, ey, ez) || 1;
    if (ey / l > 0.55) return true;
    const yaw = b.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), lh = Math.hypot(ex, ez) || 1;
    return (ex * fx + ez * fz) / lh > Math.cos(run.activeTool.def.shield.cone);
  }

  // A bonk from (x, z): does the open umbrella face it?
  guards(run, x, z) {
    if (!this.open(run) || run.activeTool.overheated) return false;
    const b = run.body, ex = x - b.x, ez = z - b.z, l = Math.hypot(ex, ez);
    if (l < 0.5) return false;
    return (ex * -Math.sin(b.yaw) + ez * -Math.cos(b.yaw)) / l > Math.cos(run.activeTool.def.shield.cone);
  }

  // It caught one: a pat on the canopy, a little heat.
  block(run, x, y, z) {
    const tool = run.activeTool;
    tool.addHeat(tool.def.shield.heat);
    run.events.push({ type: "umbrellaBlock", x, y, z });
  }

  step(run, dt) {
    for (const w of this.wheels) {
      w.spinT = Math.max(0, w.spinT - dt);
      w.speed += ((w.spinT > 0 ? 1 : 0) - w.speed) * Math.min(1, dt * (w.spinT > 0 ? 3 : 0.8));
    }
    // An updraft with a pinwheel blows while it turns.
    for (const d of this.drafts) {
      if (!d.pinwheel) continue;
      const w = this.wheels.find((o) => o.id === d.pinwheel);
      d.k = w ? Math.min(1, w.speed * 1.25) : 0;
    }
  }
}
