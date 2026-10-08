import { damageFoe, lullFoe } from "./foes.js";

// ── The Lullaby Bell's sound, once it has left the bell ──────────────────
// A ring is a wave front running out in a cone ahead of you: whatever it
// passes (and can hear it: no wall between) is shoved back and shaken a
// little, and orbs in its way are batted back at whoever threw them,
// harmless to you and not to them. The lullaby, the second action, is a
// soft sphere spreading out round you: small glitches it reaches fall
// asleep (a hit wakes them, and that first hit counts double), big ones
// only get drowsy and slow.
//
// Some things in a dream answer the bell (kit.ringable): a jelly wobbles,
// and while it does it is a trampoline; a soufflé falls flat for good
// and leaves the way open.

const BACK = { speed: 15, dmg: 3 };     // a batted orb: its speed, and what it does to a glitch

export class Bell {
  constructor() {
    this.waves = [];       // { id, x, y, z, dx, dy, dz, r, max, speed, cone, lull, … }
  }

  ring(run, tool) {
    const d = tool.def, b = run.body, [dx, dy, dz] = run.aimDir();
    run.stats.shots++;
    this.waves.push({ id: ++run.foeSeq, x: b.x, y: b.eyeY - 0.1, z: b.z, dx, dy, dz, r: 0, max: d.range, speed: d.speed, cone: d.cone, dmg: d.damage, push: d.push, hit: new Set() });
    run.events.push({ type: "bellRing" });
  }

  // k: how long the lullaby was hummed (0…1): a wider sphere.
  lull(run, tool, k) {
    const L = tool.def.lull, b = run.body;
    this.waves.push({ id: ++run.foeSeq, x: b.x, y: b.y + 1, z: b.z, r: 0, max: L.r0 + (L.r1 - L.r0) * k, speed: L.speed, lull: true, sleep: L.sleep, drowsy: L.drowsy, hit: new Set() });
    run.events.push({ type: "bellLull", k });
  }

  step(run, dt) {
    for (const w of this.waves) {
      const r0 = w.r;
      w.r = Math.min(w.max, w.r + w.speed * dt);
      // Everything the front passed over this step.
      const passes = (x, y, z, R = 0) => {
        const ex = x - w.x, ey = y - w.y, ez = z - w.z, l = Math.hypot(ex, ey, ez);
        if (l - R > w.r || l + R < r0 - 0.5) return false;
        if (!w.lull && l > 0.5 && (ex * w.dx + ey * w.dy + ez * w.dz) / l < Math.cos(w.cone + Math.atan(R / Math.max(l, 0.5)))) return false;
        return this.hears(run, w, x, y, z, l, R);
      };
      for (const f of run.foes) {
        if (!f.alive || w.hit.has(f.id) || f.state === "spawn") continue;
        if (!passes(f.px, f.cy, f.pz, f.def.hitR)) continue;
        w.hit.add(f.id);
        if (w.lull) { lullFoe(run, f, w.sleep, w.drowsy); continue; }
        const ex = f.px - w.x, ez = f.pz - w.z, l = Math.hypot(ex, ez) || 1;
        // Shoved straight away from you, harder up close.
        const k = w.push * (1.15 - 0.5 * Math.min(1, l / w.max)) / 3.5;
        if (damageFoe(run, f, w.dmg, ex / l * k, ez / l * k, true)) run.stats.popped++;
        else run.stats.hits++;
      }
      if (!w.lull) for (const s of run.spits) {
        if (s.back || s.life <= 0 || w.hit.has(s.id) || !passes(s.x, s.y, s.z, 0.4)) continue;
        w.hit.add(s.id);
        this.batBack(run, s, w);
      }
      const B = run.boss;
      if (B?.alive && !B.invulnerable && !w.hit.has("boss")) {
        for (const [x, y, z, r, mul, part] of B.hitSpheres()) {
          if (!passes(x, y, z, r)) continue;
          w.hit.add("boss");
          if (w.lull) B.lulled?.(run, w);
          else { B.damage(run, w.dmg * mul, part); B.rung?.(run, w, part); }
          break;
        }
      }
      // A ring blows pepper clouds away.
      if (!w.lull) for (const c of run.clouds) {
        if (w.hit.has(c.id) || !passes(c.x, c.y + 0.8, c.z, c.r)) continue;
        w.hit.add(c.id);
        c.life = Math.min(c.life, c.t + 0.3);
        run.events.push({ type: "cloudBlown", x: c.x, y: c.y + 0.8, z: c.z });
      }
      for (const g of run.ringables) {
        if (w.hit.has(g.id) || !passes(g.x, g.y + g.h * 0.5, g.z, g.r)) continue;
        w.hit.add(g.id);
        this.setOff(run, g);
      }
    }
    this.waves = this.waves.filter((w) => w.r < w.max);
  }

  // Can the sound get from the wave's start to (x, y, z)? (Not through a
  // wall; something wide counts if the line reaches its edge.)
  hears(run, w, x, y, z, l, R) {
    if (l < 0.5) return true;
    const hit = run.world.raycast(w.x, w.y, w.z, (x - w.x) / l, (y - w.y) / l, (z - w.z) / l, l);
    return !hit || hit.t > l - R - 0.15;
  }

  // An orb the ring caught: back where it came from (at its thrower if
  // that is still about), no longer a danger to you.
  batBack(run, s, w) {
    const o = run.foes.find((f) => f.id === s.owner && f.alive);
    const tx = o ? o.px : s.x + w.dx * 12, ty = o ? o.cy : s.y + w.dy * 12, tz = o ? o.pz : s.z + w.dz * 12;
    const ex = tx - s.x, ez = tz - s.z, l = Math.hypot(ex, ez) || 1;
    if (s.g) {
      // A lob: a new arc that comes down on it.
      const T = Math.min(1.6, Math.max(0.5, l / BACK.speed));
      s.vx = ex / T; s.vz = ez / T; s.vy = (ty - s.y + 0.5 * s.g * T * T) / T;
      if (s.splash) { s.tx = tx; s.tz = tz; s.ty = o ? o.py : run.kit.floorAt(tx, tz, s.y); }
    } else {
      const ey = ty - s.y, L = Math.hypot(ex, ey, ez) || 1, v = Math.max(BACK.speed, Math.hypot(s.vx, s.vy, s.vz));
      s.vx = ex / L * v; s.vy = ey / L * v; s.vz = ez / L * v;
    }
    s.back = true; s.harmless = true; s.backDmg = BACK.dmg; s.life = Math.max(s.life, 2.5);
    run.events.push({ type: "bellBat", x: s.x, y: s.y, z: s.z });
  }

  // Something in the dream the bell sets off.
  setOff(run, g) {
    if (g.kind === "jelly") {
      g.wobbleT = g.wobble;
      run.events.push({ type: "jellyWobble", id: g.id, x: g.x, y: g.y + g.h, z: g.z });
    } else if (g.kind === "souffle" && !g.flat) {
      // It sinks to a puddle you can walk over.
      g.flat = true; g.t = 0;
      run.world.remove(g.c);
      g.c = run.world.cyl({ x: g.x, z: g.z, r: g.r, y0: g.y - 0.3, y1: g.y + g.low });
      g.h = g.low;
      run.events.push({ type: "souffleFall", id: g.id, x: g.x, y: g.y, z: g.z });
    }
  }

  // After the body has moved: a wobbling jelly under your feet throws you up.
  bounce(run) {
    const b = run.body;
    for (const g of run.ringables) g.under = false;
    if (!b.grounded) return;
    for (const g of run.ringables) {
      if (g.kind !== "jelly") continue;
      if (Math.abs(b.y - (g.y + g.h)) > 0.06 || Math.hypot(b.x - g.x, b.z - g.z) > g.r + b.r * 0.5) continue;
      // A still jelly only squishes a little under you: it has to be rung first.
      if (!(g.wobbleT > 0)) { if (b.landSpeed > 2) run.events.push({ type: "jellySquish", id: g.id, x: g.x, y: g.y + g.h, z: g.z }); g.under = true; return; }
      b.vy = g.boing; b.grounded = false;
      run.events.push({ type: "boing", id: g.id, x: g.x, y: g.y + g.h, z: g.z });
      return;
    }
  }

  stepRingables(run, dt) {
    for (const g of run.ringables) {
      if (g.wobbleT > 0) g.wobbleT = Math.max(0, g.wobbleT - dt);
      if (g.flat) g.t += dt;
    }
  }
}

// Where a batted orb hits a glitch: it stings it (a bubble splashes all round).
export function backHit(run, s) {
  for (const f of run.foes) {
    if (!f.alive) continue;
    const R = f.def.hitR + (s.splash ? 0.3 : 0.4);
    if ((f.px - s.x) ** 2 + (f.cy - s.y) ** 2 + (f.pz - s.z) ** 2 > R * R) continue;
    return f;
  }
  return null;
}
