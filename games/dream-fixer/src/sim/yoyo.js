import { damageFoe, yankFoe, yankable } from "./foes.js";

// ── Sophie's yo-yo, the Star Yo-Yo ───────────────────────────────────────
// Thrown, it flies straight out along the view on its string and comes
// back to your hand. The first glitch it meets is stung, and a small one
// is yanked to you (it lands dizzy in front of you, see foes.js); the
// nightmare may answer it (`yanked`). Orbs on its way pop. A wall sends it
// back.
//
// Star handles hang about the dream (kit.hook): one the view points at
// lights up, and the yo-yo goes straight for it, catches and reels you in.
// Jump to let go early; you come off it with a little hop.
//
// Held second action: round and round you at arm's length plus a bit,
// knocking back whatever it meets (each glitch once every `spin.every`).

export class YoYo {
  constructor(kit) {
    this.hooks = kit.hooks.map((h) => ({ ...h }));
    this.ball = null;          // out on its string: { state: "out" | "back" | "hooked", x, y, z, dx, dy, dz, gone, hook }
    this.reeling = null;       // the handle pulling you in: { hook, t, best, stuckT, v }
    this.spin = null;          // going round you: { a, x, y, z, hits }
    this.aimHook = null;       // the handle the view points at, in reach (it lights up)
  }

  tool(run) { return run.tools.find((t) => t.id === "yoyo") ?? null; }

  // Where the string starts: your hand, a little right of and below the eye.
  hand(run) {
    const b = run.body, sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
    return [b.x + cs * 0.22 - sn * 0.35, b.eyeY - 0.25, b.z - sn * 0.22 - cs * 0.35];
  }

  // Back in your hand at once (a faint, a fall, another tool).
  reset(run) {
    const t = this.tool(run);
    if (t) { t.out = false; t.spinning = false; }
    this.ball = null; this.reeling = null; this.spin = null;
    run.body.reel = null;
  }

  // The handle the view points at: in reach, nothing in between, the
  // nearest to the crosshair (a generous aim, it is a small thing).
  findHook(run, d) {
    const b = run.body, [ax, ay, az] = run.aimDir(), ox = b.x, oy = b.eyeY, oz = b.z;
    let best = null, bestA = 0.06;
    for (const h of this.hooks) {
      const ex = h.x - ox, ey = h.y - oy, ez = h.z - oz, l = Math.hypot(ex, ey, ez);
      if (l > d.range + h.r || l < 1.2) continue;
      const a = Math.acos(Math.min(1, (ex * ax + ey * ay + ez * az) / l)) - Math.atan(h.r * 1.5 / l);
      if (a >= bestA) continue;
      if (run.world.raycast(ox, oy, oz, ex / l, ey / l, ez / l, l - 0.4)) continue;
      best = h; bestA = a;
    }
    return best;
  }

  throw(run, tool) {
    const [hx, hy, hz] = this.hand(run);
    let [dx, dy, dz] = run.aimDir();
    const aim = (x, y, z) => { const ex = x - hx, ey = y - hy, ez = z - hz, l = Math.hypot(ex, ey, ez) || 1; dx = ex / l; dy = ey / l; dz = ez / l; };
    // The view's crosshair is at the eye: aim from the hand at what it points at.
    const h = this.aimHook;
    if (h) aim(h.x, h.y, h.z);
    else {
      const f = run.opts.aimAssist > 0 ? run.target(run.opts.aimAssist) : null;
      if (f) aim(f.px, f.cy, f.pz);
      else {
        const b = run.body, hit = run.world.raycast(b.x, b.eyeY, b.z, dx, dy, dz, tool.def.range);
        const t = hit ? hit.t : tool.def.range;
        aim(b.x + dx * t, b.eyeY + dy * t, b.z + dz * t);
      }
    }
    this.ball = { state: "out", x: hx, y: hy, z: hz, dx, dy, dz, gone: 0, hook: null };
    tool.out = true;
    run.stats.shots++;
    run.events.push({ type: "yoyoThrow", dir: [dx, dy, dz] });
  }

  // Before the body moves: reeled in on the string.
  carry(run, intent, dt) {
    const b = run.body, R = this.reeling;
    if (!R) { b.reel = null; return; }
    const d = this.tool(run).def.reel, h = R.hook;
    R.t += dt;
    // Feet just under the handle: it ends up at your chest.
    const ex = h.x - b.x, ey = h.y - 1.25 - b.y, ez = h.z - b.z, l = Math.hypot(ex, ey, ez);
    if (l < R.best - 0.03) { R.best = l; R.stuckT = 0; } else R.stuckT += dt;
    if (l < 0.8 || intent.jumpPressed || R.stuckT > 0.3 || R.t > d.time) { this.letGo(run, intent.jumpPressed); return; }
    R.v = Math.min(d.speed, R.v + d.accel * dt);
    const v = Math.min(R.v, l / dt);
    b.reel = { vx: ex / l * v, vy: ey / l * v, vz: ez / l * v };
  }

  // Off the string: a little hop up (a jump, if you jumped), keeping some
  // of the speed, and the yo-yo comes home.
  letGo(run, jumped) {
    const b = run.body, d = this.tool(run).def.reel;
    b.reel = null;
    b.vx *= 0.4; b.vz *= 0.4;
    b.vy = Math.max(b.vy * 0.4, jumped ? b.P.jump : d.pop);
    b.grounded = false;
    this.reeling = null;
    if (this.ball) this.ball.state = "back";
    run.events.push({ type: "yoyoLetGo", x: b.x, y: b.y, z: b.z });
  }

  step(run, dt) {
    const tool = this.tool(run);
    if (!tool) return;
    const held = run.activeTool === tool && run.switchT <= 0 && !run.opts.noTools;
    if (!held && (this.ball || this.reeling || this.spin)) this.reset(run);
    this.aimHook = held && !this.ball ? this.findHook(run, tool.def) : null;
    if (held && tool.spinning) this.spinRound(run, tool, dt); else this.spin = null;
    if (this.ball) this.fly(run, tool, dt);
  }

  // ── Out on its string, and back ──
  fly(run, tool, dt) {
    const B = this.ball, d = tool.def;
    if (B.state === "hooked") return;
    if (B.state === "back") {
      const [hx, hy, hz] = this.hand(run), ex = hx - B.x, ey = hy - B.y, ez = hz - B.z, l = Math.hypot(ex, ey, ez), s = d.back * dt;
      if (l <= s + 0.15) {
        this.ball = null; tool.out = false;
        run.events.push({ type: "yoyoCatch" });
        return;
      }
      B.x += ex / l * s; B.y += ey / l * s; B.z += ez / l * s;
      return;
    }
    // Out: what does it meet first on this step's way?
    const step = Math.min(d.speed * dt, d.range - B.gone);
    let t = step, what = null, target = null, mul = 1, part = null;
    const wall = run.world.raycast(B.x, B.y, B.z, B.dx, B.dy, B.dz, step);
    if (wall) { t = wall.t; what = "wall"; }
    for (const h of this.hooks) {
      // (Not the one you are hanging from, right by your hand.)
      if ((h.x - B.x) ** 2 + (h.y - B.y) ** 2 + (h.z - B.z) ** 2 < h.r * h.r) continue;
      const tt = raySphere(B.x, B.y, B.z, B.dx, B.dy, B.dz, h.x, h.y, h.z, h.r);
      if (tt >= 0 && tt < t) { t = tt; what = "hook"; target = h; }
    }
    for (const f of run.foes) {
      if (!f.alive || f.state === "spawn") continue;
      const tt = raySphere(B.x, B.y, B.z, B.dx, B.dy, B.dz, f.px, f.cy, f.pz, f.def.hitR + d.r);
      if (tt >= 0 && tt < t) { t = tt; what = "foe"; target = f; }
    }
    const Bo = run.boss;
    if (Bo?.alive && !Bo.invulnerable) {
      for (const [x, y, z, r, m, p] of Bo.hitSpheres()) {
        const tt = raySphere(B.x, B.y, B.z, B.dx, B.dy, B.dz, x, y, z, r + d.r);
        if (tt >= 0 && tt < t) { t = tt; what = "boss"; mul = m; part = p; }
      }
    }
    // Orbs on the way pop (it flies on).
    for (const s of run.spits) {
      if (s.life <= 0 || s.harmless) continue;
      const tt = raySphere(B.x, B.y, B.z, B.dx, B.dy, B.dz, s.x, s.y, s.z, 0.38 + d.r);
      if (tt < 0 || tt > t) continue;
      s.life = 0; s.harmless = true;
      run.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, kind: s.kind });
    }
    B.x += B.dx * t; B.y += B.dy * t; B.z += B.dz * t;
    B.gone += t;
    if (what === "hook") {
      B.state = "hooked"; B.hook = target;
      B.x = target.x; B.y = target.y; B.z = target.z;
      const b = run.body;
      this.reeling = { hook: target, t: 0, best: Infinity, stuckT: 0, v: Math.max(4, Math.hypot(b.vx, b.vy, b.vz)) };
      run.events.push({ type: "yoyoHook", id: target.id, x: target.x, y: target.y, z: target.z });
      return;
    }
    if (what === "foe") {
      const f = target, b = run.body;
      run.stats.hits++;
      if (damageFoe(run, f, d.damage, B.dx, B.dz, false)) run.stats.popped++;
      else if (yankable(f)) {
        // To just in front of you (not off the edge of anything).
        const fx = f.px - b.x, fz = f.pz - b.z, l = Math.hypot(fx, fz) || 1;
        const k = Math.min(d.yank, l), tx = b.x + fx / l * k, tz = b.z + fz / l * k;
        const floor = run.kit.floorAt(tx, tz, b.y + 1);
        const ok = floor > b.y - 1.5 || f.def.fly;
        if (ok) yankFoe(run, f, tx, f.def.fly ? b.y + 1.4 : floor, tz);
      }
      run.events.push({ type: "yoyoHit", x: B.x, y: B.y, z: B.z, id: f.id });
      B.state = "back";
      return;
    }
    if (what === "boss") {
      run.stats.hits++;
      Bo.yanked?.(run, part);
      Bo.damage(run, d.damage * mul, part);
      run.events.push({ type: "yoyoHit", x: B.x, y: B.y, z: B.z, boss: true });
      B.state = "back";
      return;
    }
    if (what === "wall") {
      run.events.push({ type: "yoyoClack", x: B.x, y: B.y, z: B.z, n: [wall.nx, wall.ny, wall.nz] });
      B.state = "back";
      return;
    }
    if (B.gone >= d.range - 1e-3) B.state = "back";
  }

  // ── Round and round you ──
  spinRound(run, tool, dt) {
    const b = run.body, d = tool.def, S = d.spin;
    if (!this.spin) {
      this.spin = { a: -b.yaw, hits: new Map() };
      run.events.push({ type: "yoyoSpin" });
    }
    const sp = this.spin;
    sp.a += S.speed * dt;
    const cx = b.x, cy = b.y + 1.05, cz = b.z;
    sp.x = cx + Math.cos(sp.a) * S.r; sp.y = cy; sp.z = cz + Math.sin(sp.a) * S.r;
    const again = (id) => {
      if (run.time - (sp.hits.get(id) ?? -9) < S.every) return false;
      sp.hits.set(id, run.time);
      return true;
    };
    for (const f of run.foes) {
      if (!f.alive || f.state === "spawn") continue;
      const R = f.def.hitR + d.r + 0.15;
      if ((f.px - sp.x) ** 2 + (f.pz - sp.z) ** 2 > R * R || Math.abs(f.cy - sp.y) > R + 0.5 || !again(f.id)) continue;
      const ox = f.px - cx, oz = f.pz - cz, l = Math.hypot(ox, oz) || 1;
      run.stats.hits++;
      if (damageFoe(run, f, S.damage, ox / l * S.push, oz / l * S.push, false)) run.stats.popped++;
      run.events.push({ type: "yoyoSpinHit", x: sp.x, y: sp.y, z: sp.z });
    }
    for (const s of run.spits) {
      if (s.life <= 0 || s.harmless || (s.x - sp.x) ** 2 + (s.y - sp.y) ** 2 + (s.z - sp.z) ** 2 > 0.6 ** 2) continue;
      s.life = 0; s.harmless = true;
      run.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, kind: s.kind });
    }
    const Bo = run.boss;
    if (Bo?.alive && !Bo.invulnerable) {
      for (const [x, y, z, r, m, p] of Bo.hitSpheres()) {
        if ((x - sp.x) ** 2 + (y - sp.y) ** 2 + (z - sp.z) ** 2 > (r + d.r + 0.1) ** 2 || !again(`boss:${p}`)) continue;
        run.stats.hits++;
        Bo.damage(run, S.damage * m, p);
        run.events.push({ type: "yoyoSpinHit", x: sp.x, y: sp.y, z: sp.z, boss: true });
        break;
      }
    }
  }
}

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  const t = tca - Math.sqrt(r * r - d2);
  // (Starting inside it counts as meeting it at once.)
  return t < 0 ? (tca + Math.sqrt(r * r - d2) >= 0 ? 0 : -1) : t;
}
