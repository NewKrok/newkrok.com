import { lullFoe, startle, damageFoe } from "./foes.js";

// ── The Dream Sand sack ──────────────────────────────────────────────────
// The Sandman's sack, the finale's tool. A pinch of dream sand (held, a
// pinch every `interval`) goes out in a short cone ahead: every glitch it
// reaches (and can see: not through a wall) gets drowsier, and once full
// of it a small one falls asleep, a big one only goes drowsy (the bell's
// sleep: the first hit on a sleeper counts double). It barely stings an
// awake one, and does not wake a sleeper.
//
// The second action pours a sand path from your feet the way you look: a
// walkway as long as `len` (shorter if a wall is in the way), tipped up or
// down with the view (`rise` at most). It holds for `life` seconds, sifts
// and blinks for the last `warn`, and crumbles. Sand does not hold on
// sand: a path starts only from solid ground, so one gap, one path.

export class Sand {
  constructor() {
    this.paths = [];       // { id, x, z, yaw, len, w, ya, yb, t, life, warn, c }
    this._hit = {};
  }

  // A pinch: what is in the cone gets its share of sand.
  pinch(run, tool) {
    const d = tool.def, b = run.body, [ax, ay, az] = run.aimDir();
    const ox = b.x, oy = b.eyeY - 0.2, oz = b.z;
    run.stats.shots++;
    run.events.push({ type: "sandPinch" });
    const reaches = (x, y, z, R) => {
      const ex = x - ox, ey = y - oy, ez = z - oz, l = Math.hypot(ex, ey, ez);
      if (l - R > d.range) return false;
      if (l > 0.6 && (ex * ax + ey * ay + ez * az) / l < Math.cos(d.cone + Math.atan(R / Math.max(l, 0.6)))) return false;
      if (l < 0.6) return true;
      const hit = run.world.raycast(ox, oy, oz, ex / l, ey / l, ez / l, l);
      return !hit || hit.t > l - R - 0.15;
    };
    for (const f of run.foes) {
      if (!f.alive || f.state === "spawn" || !reaches(f.px, f.cy, f.pz, f.def.hitR)) continue;
      // Asleep already: it sleeps on (a little longer), undisturbed.
      if (f.sleepT > 0) { f.sleepT = Math.max(f.sleepT, d.sleep * 0.5); continue; }
      f.sand = Math.min(1, (f.sand || 0) + d.drowse);
      run.events.push({ type: "foeSandy", id: f.id, x: f.px, y: f.cy, z: f.pz, k: f.sand });
      if (f.sand >= 1) { f.sand = 0; lullFoe(run, f, d.sleep, d.drowsy); continue; }
      startle(run, f);
      if (damageFoe(run, f, d.damage, 0, 0, false)) run.stats.popped++;
    }
    const B = run.boss;
    if (B?.alive && !B.invulnerable) for (const [x, y, z, r, , part] of B.hitSpheres()) {
      if (!reaches(x, y, z, r)) continue;
      B.sanded?.(run, d.drowse, part);
      break;
    }
  }

  // A path from your feet the way you look. Returns whether it poured.
  pour(run, tool) {
    const P = tool.def.path, b = run.body;
    if (!b.grounded || this.onSand(run)) { run.events.push({ type: "sandFizzle", x: b.x, y: b.y, z: b.z }); return false; }
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
    // As far as nothing stands in the way (at knee height, and up the
    // slope; a path down only minds walls).
    const tilt = Math.max(-0.35, Math.min(0.42, b.pitch + 0.12)), up = Math.max(0, tilt);
    let len = P.len;
    const hit = run.world.raycast(b.x, b.y + 0.5, b.z, fx * Math.cos(up), Math.sin(up), fz * Math.cos(up), P.len, this._hit);
    if (hit) len = Math.max(0, hit.t - 0.3);
    if (len < 1.5) { run.events.push({ type: "sandFizzle", x: b.x, y: b.y, z: b.z }); return false; }
    const back = 0.6, L = len + back, rise = Math.max(-P.rise * 0.6, Math.min(P.rise, Math.tan(tilt) * len));
    const ya = b.y - back * rise / len, yb = b.y + rise;
    const cx = b.x + fx * (len - back) / 2, cz = b.z + fz * (len - back) / 2;
    const c = run.world.ramp({ x: cx, z: cz, y0: Math.min(ya, yb) - P.thick, ya, yb, hx: L / 2, hz: P.w / 2, yaw: b.yaw + Math.PI / 2, tag: "sand" });
    const p = { id: ++run.foeSeq, x: cx, z: cz, yaw: b.yaw, len: L, w: P.w, ya, yb, thick: P.thick, t: 0, life: P.life, warn: P.warn, c };
    this.paths.push(p);
    while (this.paths.length > P.max) this.crumble(run, this.paths[0]);
    run.events.push({ type: "sandPath", id: p.id, x: cx, y: (ya + yb) / 2, z: cz });
    return true;
  }

  // Standing on a sand path (not on solid ground)?
  onSand(run) {
    const b = run.body;
    return this.paths.some((p) => Math.abs(b.y - run.topAt(p.c, b.x, b.z)) < 0.12 && run.world.push2D(p.c, b.x, b.z, 0.01) > 0);
  }

  step(run, dt, tool) {
    // Sand on a glitch sifts off by itself.
    const fade = (tool?.def.fade ?? 0.3) * dt;
    for (const f of run.foes) if (f.sand > 0) f.sand = Math.max(0, f.sand - fade);
    for (const p of [...this.paths]) {
      p.t += dt;
      if (p.t >= p.life) this.crumble(run, p);
    }
  }

  crumble(run, p) {
    run.world.remove(p.c);
    this.paths.splice(this.paths.indexOf(p), 1);
    run.events.push({ type: "sandGone", id: p.id, x: p.x, y: (p.ya + p.yb) / 2, z: p.z });
  }

  reset(run) { for (const p of [...this.paths]) this.crumble(run, p); }
}
