import { Body, BodyType, Vec2, Circle } from "@newkrok/nape-js";
import { DT, HERO_R, MAX_WLEVEL, clamp, hyp } from "../config.js";
import { WEAPON_META } from "../data/meta.js";
import {
  F, heroX, heroY, damageMonster, burnMonster, nearestMonsters, explode, burst, particle, pushProps,
} from "./core.js";

// ── The arsenal ──────────────────────────────────────────────────────────
// Everything fires on its own. stats(lv) gives the numbers for a level (the
// level-up cards show the difference), fire() runs when the cooldown lapses,
// tick() runs every step for weapons that live continuously (orbiting
// spades). The hero's area, amount, cooldown and damage multipliers apply
// on top.

const ceil = Math.ceil, floor = Math.floor;

export const WEAPONS = {
  // Lantern Flail: a burning arc toward the nearest monster in reach, else
  // where you face. Lv3 lashes behind you too.
  flail: {
    stats: (lv) => ({ dmg: 14 + lv * 5, range: 100 + lv * 8, cd: 50 - lv * 3, arcs: lv >= 3 ? 2 : 1, width: lv >= 5 ? 1.35 : 1.15 }),
    fire(R, w, s) { swing(R, w, s, false); },
  },
  sunflail: {
    stats: () => ({ dmg: 62, range: 175, cd: 34, arcs: 2, width: 1.6 }),
    fire(R, w, s) { swing(R, w, s, true); },
  },

  // Crossbow: bolts at the nearest monsters, piercing.
  crossbow: {
    stats: (lv) => ({ dmg: 12 + lv * 4, n: 1 + floor((lv - 1) / 2), pierce: 1 + floor(lv / 3), cd: 64 - lv * 4 }),
    fire(R, w, s) { volley(R, w, s, 520, 0); },
  },
  dawnbreaker: {
    stats: () => ({ dmg: 38, n: 4, pierce: 99, cd: 40 }),
    fire(R, w, s) { volley(R, w, s, 620, 64); },
  },

  // Throwing knives: a fan the way you run.
  knives: {
    stats: (lv) => ({ dmg: 8 + lv * 2, n: 2 + lv, pierce: lv >= 6 ? 1 : 0, cd: 58 - lv * 3 }),
    fire(R, w, s) {
      const h = R.hero;
      const base = h.moveX || h.moveY ? Math.atan2(h.moveY, h.moveX) : h.face;
      const n = s.n + h.stats.amount;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.09;
        spawnShot(R, w, "knife", a, { speed: 660, dmg: s.dmg, pierce: s.pierce, r: 4, life: 70, delay: i * 2 });
      }
      R.sfx.push(["knives"]);
    },
  },
  edges: {
    stats: () => ({ dmg: 20, n: 2, pierce: 2, cd: 6 }),
    fire(R, w, s) {
      const h = R.hero;
      w.spin = (w.spin || 0) + 0.55;
      const base = h.moveX || h.moveY ? Math.atan2(h.moveY, h.moveX) : h.face;
      const n = s.n + h.stats.amount;
      for (let i = 0; i < n; i++) {
        const a = i === 0 ? base + Math.sin(w.spin) * 0.25 : w.spin + (i / n) * Math.PI * 2;
        spawnShot(R, w, "knife", a, { speed: 700, dmg: s.dmg, pierce: s.pierce, r: 4, life: 60 });
      }
      if (R.frame % 18 === 0) R.sfx.push(["knives"]);
    },
  },

  // Chapel Bell: a ring around you that tolls, hurts and shoves.
  bell: {
    stats: (lv) => ({ dmg: 5 + lv * 2, radius: 58 + lv * 10, cd: 32, knock: 100 + lv * 10 }),
    fire(R, w, s) { toll(R, w, s, s.radius * R.hero.stats.area, s.dmg, s.knock); },
  },
  toll: {
    stats: () => ({ dmg: 22, radius: 190, cd: 30, knock: 180 }),
    fire(R, w, s) {
      w.count = (w.count || 0) + 1;
      const big = w.count % 5 === 0;
      toll(R, w, s, (big ? 310 : s.radius) * R.hero.stats.area, big ? 70 : s.dmg, big ? 420 : s.knock);
      if (big) { R.rings.push({ x: heroX(R), y: heroY(R), r: 20, max: 310 * R.hero.stats.area, t: 0, T: 24, color: 0xffe9a8 }); R.sfx.push(["bigtoll"]); }
    },
  },

  // Grave spades circling you, striking whatever they pass through.
  spades: {
    stats: (lv) => ({ dmg: 9 + lv * 3, n: 1 + ceil(lv * 0.72), radius: 72 + lv * 5, speed: 2.6 + lv * 0.25 }),
    tick(R, w, s) { orbit(R, w, s); },
  },
  halo: {
    stats: () => ({ dmg: 34, n: 8, radius: 112, speed: 4.2 }),
    tick(R, w, s) { orbit(R, w, s); },
  },

  // Storm Call: lightning on monsters around you; later bolts chain.
  storm: {
    stats: (lv) => ({ dmg: 24 + lv * 7, n: 1 + floor(lv / 2), chain: lv >= 6 ? 2 : lv >= 3 ? 1 : 0, cd: 100 - lv * 6 }),
    fire(R, w, s) { lightning(R, w, s, 320); },
  },
  wrath: {
    stats: () => ({ dmg: 72, n: 6, chain: 3, cd: 54 }),
    fire(R, w, s) { lightning(R, w, s, 380); },
  },

  // Holy water: flasks lobbed at the crowd, each leaving a burning pool.
  water: {
    stats: (lv) => ({ dmg: 6 + lv * 2, n: 1 + floor(lv / 3), radius: 42 + lv * 5, dur: 150 + lv * 18, cd: 150 - lv * 8 }),
    fire(R, w, s) { flasks(R, w, s); },
  },
  font: {
    stats: () => ({ dmg: 20, n: 4, radius: 85, dur: 320, cd: 110 }),
    fire(R, w, s) { flasks(R, w, s); },
  },

  // Grave hook: hook the nearest monster and hurl it into the rest. The
  // thrown body is a real missile: whatever it hits takes the damage and the
  // shove, through a collision listener.
  hook: {
    stats: (lv) => ({ dmg: 20 + lv * 6, n: 1 + floor(lv / 3), cd: 96 - lv * 5 }),
    fire(R, w, s) { hurl(R, w, s, false); },
  },
  reaper: {
    stats: () => ({ dmg: 60, n: 4, cd: 60 }),
    fire(R, w, s) { hurl(R, w, s, true); },
  },
};

// ── Belt management ──────────────────────────────────────────────────────
export function addWeapon(R, id) {
  const h = R.hero;
  const w = h.weapons.find((x) => x.id === id);
  if (w) { w.level = Math.min(MAX_WLEVEL, w.level + 1); return w; }
  const nw = { id, level: 1, cd: 20, pulse: 0, radius: 0, angle: 0 };
  h.weapons.push(nw);
  R.weaponsSeen.add(id);
  return nw;
}

// Chest: a max-level weapon whose partner passive you hold evolves.
export function evolvable(R) {
  const h = R.hero;
  return h.weapons.filter((w) => {
    const meta = WEAPON_META[w.id];
    return meta.into && w.level >= MAX_WLEVEL && (h.passives[meta.evo] || 0) > 0;
  });
}
export function evolve(R, w) {
  const into = WEAPON_META[w.id].into;
  if (w.id === "spades") clearOrbs(R);
  w.id = into;
  w.level = 1;
  w.evolved = true;
  w.cd = 10;
  R.weaponsSeen.add(into);
  R.evolved.push(into);
}

export function weaponStats(id, lv) { return WEAPONS[id].stats(lv); }

export function tickWeapons(R) {
  const h = R.hero;
  if (h.dig > 0) return;     // underground: nothing fires
  for (const w of h.weapons) {
    const def = WEAPONS[w.id];
    const s = def.stats(w.level);
    if (def.tick) { def.tick(R, w, s); continue; }
    w.pulse *= 0.9;
    if (--w.cd <= 0) {
      w.cd = Math.max(5, Math.round(s.cd * h.stats.cdMul));
      def.fire(R, w, s);
    }
    if (w.extra > 0 && --w.extra === 0) def.fire(R, { ...w, extraShot: true }, s);
  }
}

// The boss (or the nearest elite) in range, for weapons that pick targets.
function bigTarget(R, range) {
  const hx = heroX(R), hy = heroY(R);
  let best = null, bd = range;
  const cand = R.boss?.alive ? [R.boss] : R.elites;
  for (const m of cand) {
    if (!m.alive || m.hidden > 0) continue;
    const d = Math.hypot(m.body.position.x - hx, m.body.position.y - hy);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// ── Weapon bodies ────────────────────────────────────────────────────────
function swing(R, w, s, sun) {
  const h = R.hero;
  const range = s.range * h.stats.area;
  const arc = s.width;
  let base = h.face;
  const near = nearestMonsters(R, 1, range * 1.4)[0];
  if (near) base = Math.atan2(near.body.position.y - heroY(R), near.body.position.x - heroX(R));
  const sides = s.arcs >= 2 ? [0, Math.PI] : [0];
  const hx = heroX(R), hy = heroY(R);
  for (const off of sides) {
    const a = base + off;
    R.arcs.push({ x: hx, y: hy, a, arc, r: range, t: 0, T: 10, color: sun ? 0xffb347 : 0xffd166, sun });
    for (const m of R.monsters) {
      if (!m.alive) continue;
      const p = m.body.position;
      const dx = p.x - hx, dy = p.y - hy, d = Math.hypot(dx, dy);
      if (d > range + m.def.r) continue;
      let da = Math.atan2(dy, dx) - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > arc) continue;
      damageMonster(R, m, s.dmg, dx / (d || 1), dy / (d || 1), 170, sun ? "#ffb347" : "#ffd166", w.id);
      if (sun) burnMonster(m, 8, 120);
    }
  }
  // Amount: one more lash, a moment later.
  if (!w.extraShot && h.stats.amount > 0) w.extra = 9;
  h.attackFlash = 6;
  R.sfx.push(["whip", sun ? 1 : 0]);
}

function volley(R, w, s, speed, blast) {
  const n = s.n + R.hero.stats.amount;
  const targets = nearestMonsters(R, n, 480);
  if (!targets.length) { w.cd = 10; return; }
  const big = bigTarget(R, 480);
  if (big && !targets.includes(big)) targets.unshift(big);
  for (let i = 0; i < n; i++) {
    const t = targets[i % targets.length];
    const p = t.body.position;
    const a = Math.atan2(p.y - heroY(R), p.x - heroX(R)) + (i >= targets.length ? (i - targets.length + 1) * 0.12 : 0);
    spawnShot(R, w, "bolt", a, { speed, dmg: s.dmg, pierce: s.pierce, r: blast ? 7 : 5, life: 90, blast, delay: i * 3 });
  }
  R.hero.attackFlash = 6;
  R.sfx.push(["bow", blast ? 1 : 0]);
}

function toll(R, w, s, r, dmg, knock) {
  w.radius = r;
  const hx = heroX(R), hy = heroY(R);
  for (const m of R.monsters) {
    if (!m.alive) continue;
    const p = m.body.position;
    const dx = p.x - hx, dy = p.y - hy, d = Math.hypot(dx, dy);
    if (d > r + m.def.r) continue;
    damageMonster(R, m, dmg, dx / (d || 1), dy / (d || 1), knock, "#e0c070", w.id);
  }
  pushProps(R, hx, hy, r, knock * 0.4);
  w.pulse = 1;
  if (R.frame % 64 < 32) R.sfx.push(["bell"]);
}

function orbit(R, w, s) {
  const n = s.n + R.hero.stats.amount;
  const orbs = R.orbs;
  while (orbs.length < n) spawnOrb(R, w);
  while (orbs.length > n) killOrb(orbs.pop());
  const R0 = s.radius * R.hero.stats.area;
  w.angle = (w.angle || 0) + s.speed * DT * (1 / Math.max(0.5, R.hero.stats.cdMul));
  const hx = heroX(R), hy = heroY(R);
  const under = R.hero.dig > 0;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    const a = w.angle + (i / n) * Math.PI * 2;
    const tx = hx + Math.cos(a) * R0, ty = hy + Math.sin(a) * R0;
    const p = o.body.position;
    // Kinematic: the velocity that lands the orb on its orbit point this step.
    o.body.velocity = new Vec2((tx - p.x) / DT, (ty - p.y) / DT);
    o.dmg = s.dmg;
    o.a = a;
    o.w = w;
    o.hidden = under;
  }
}
function spawnOrb(R, w) {
  const body = new Body(BodyType.KINEMATIC, new Vec2(heroX(R), heroY(R) - 70));
  const shape = new Circle(w.id === "halo" ? 13 : 10);
  shape.sensorEnabled = true;
  shape.filter = F.orb();
  shape.cbTypes.add(R.cb.orb);
  body.shapes.add(shape);
  body.space = R.space;
  R.orbs.push({ body, dmg: 10, a: 0, w });
}
function killOrb(o) { if (o?.body?.space) o.body.space = null; }
export function clearOrbs(R) { for (const o of R.orbs) killOrb(o); R.orbs.length = 0; }
export function onOrbHit(R, orb, m) {
  if (m.orbCd > 0 || orb.hidden) return;
  m.orbCd = 18;
  const p = m.body.position;
  const dx = p.x - heroX(R), dy = p.y - heroY(R), d = hyp(dx, dy);
  const halo = orb.w?.id === "halo";
  damageMonster(R, m, orb.dmg, dx / d, dy / d, halo ? 260 : 150, "#c9d4e0", orb.w?.id || "spades");
  if (R.frame % 3 === 0) R.sfx.push(["spade"]);
}

function lightning(R, w, s, radius) {
  const hx = heroX(R), hy = heroY(R);
  const pool = R.monsters.filter((m) => m.alive && !m.def.prop && Math.hypot(m.body.position.x - hx, m.body.position.y - hy) < radius);
  if (!pool.length) { w.cd = 12; return; }
  const n = s.n + R.hero.stats.amount;
  const big = bigTarget(R, radius);
  for (let i = 0; i < n; i++) strike(R, w, big && i % 2 === 0 ? big : pool[Math.floor(R.rng() * pool.length)], s.dmg, s.chain);
  R.sfx.push(["thunder", w.id === "wrath" ? 1 : 0]);
}
function strike(R, w, m, dmg, chain) {
  const p = m.body.position;
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push({ x: p.x + (1 - k) * (R.rng() - 0.5) * 80 * (i === 0 ? 0 : 1), y: p.y, z: (1 - k) * 300 });
  }
  pts[n] = { x: p.x, y: p.y, z: 0 };
  R.bolts.push({ pts, t: 0, T: 10, color: 0xfff3a0 });
  R.flash = Math.max(R.flash, 0.2);
  burst(R, p.x, p.y, 8, 0xffe066, 3);
  let from = m;
  const hitSet = new Set([m]);
  damageMonster(R, m, dmg, 0, 0, 0, "#ffe066", w.id);
  for (let c = 0; c < chain; c++) {
    let best = null, bd = 140;
    const fp = from.body.position;
    for (const o of R.monsters) {
      if (!o.alive || hitSet.has(o) || o.def.prop) continue;
      const d = Math.hypot(o.body.position.x - fp.x, o.body.position.y - fp.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) break;
    const bp = best.body.position;
    R.bolts.push({ pts: [{ x: fp.x, y: fp.y, z: 20 }, { x: (fp.x + bp.x) / 2 + (R.rng() - 0.5) * 40, y: (fp.y + bp.y) / 2 + (R.rng() - 0.5) * 40, z: 34 }, { x: bp.x, y: bp.y, z: 4 }], t: 0, T: 10, color: 0xfff3a0 });
    damageMonster(R, best, dmg * 0.7, 0, 0, 0, "#ffe066", w.id);
    hitSet.add(best);
    from = best;
  }
}

function flasks(R, w, s) {
  const n = s.n + R.hero.stats.amount;
  const hx = heroX(R), hy = heroY(R);
  const near = nearestMonsters(R, 12, 360);
  for (let i = 0; i < n; i++) {
    let tx, ty;
    if (near.length) {
      const m = near[Math.floor(R.rng() * near.length)];
      tx = m.body.position.x; ty = m.body.position.y;
    } else {
      const a = R.rng() * 6.28, d = 80 + R.rng() * 160;
      tx = hx + Math.cos(a) * d; ty = hy + Math.sin(a) * d;
    }
    R.globs.push({ x0: hx, y0: hy, x1: tx, y1: ty, t: -i * 6, T: 34, kind: "holy", r: s.radius * R.hero.stats.area, dmg: s.dmg, dur: s.dur, src: w.id, color: 0x7ad8ff, friendly: true });
  }
  R.sfx.push(["throw"]);
}

// Holy pools burn whatever stands in them; ticked from the run loop.
export function tickHolyZone(R, z) {
  if (z.life % 12 !== 0) return;
  for (const m of R.monsters) {
    if (!m.alive) continue;
    const p = m.body.position, dx = p.x - z.x, dy = p.y - z.y;
    if (dx * dx + dy * dy < (z.r + m.def.r) * (z.r + m.def.r)) {
      damageMonster(R, m, z.dmg, 0, 0, 0, "#7ad8ff", z.src);
      // The pool drags at whatever wades through it.
      const v = m.body.velocity;
      m.body.velocity = new Vec2(v.x * 0.7, v.y * 0.7);
    }
  }
}

function hurl(R, w, s, reap) {
  const n = s.n + R.hero.stats.amount;
  const cands = nearestMonsters(R, n * 3, 320).filter((m) => !m.def.boss && !m.def.part && !m.thrown);
  if (!cands.length) { w.cd = 12; return; }
  const hx = heroX(R), hy = heroY(R);
  for (let i = 0; i < Math.min(n, cands.length); i++) {
    const m = cands[i];
    const p = m.body.position;
    let a = Math.atan2(p.y - hy, p.x - hx);
    // Aim the throw at the thickest part of the crowd beyond the target.
    let best = 0, bestA = a;
    for (const off of [-0.6, -0.3, 0, 0.3, 0.6]) {
      const aa = a + off;
      let c = 0;
      for (const o of R.monsters) {
        if (!o.alive || o === m) continue;
        const ox = o.body.position.x - p.x, oy = o.body.position.y - p.y;
        const along = ox * Math.cos(aa) + oy * Math.sin(aa);
        if (along < 0 || along > 300) continue;
        const across = Math.abs(-ox * Math.sin(aa) + oy * Math.cos(aa));
        if (across < 40) c++;
      }
      if (c > best) { best = c; bestA = aa; }
    }
    a = bestA;
    const sp = 780 / Math.sqrt(Math.max(1, m.def.mass * 0.6));
    m.body.velocity = new Vec2(Math.cos(a) * sp, Math.sin(a) * sp);
    m.thrown = 36;
    m.thrownDmg = s.dmg;
    m.thrownSrc = w.id;
    m.reap = reap;
    const shape = m.body.shapes.at(0);
    shape.filter = F.thrown();
    shape.cbTypes.add(R.cb.thrown);
    damageMonster(R, m, s.dmg * 0.5, 0, 0, 0, "#d2a8ff", w.id);
    R.beams.push({ x0: hx, y0: hy, x1: p.x, y1: p.y, t: 0, T: 10, color: 0xd2a8ff });
  }
  R.hero.attackFlash = 6;
  R.sfx.push(["hook"]);
}

// A hurled monster hits another one.
export function onThrownHit(R, thrown, m) {
  if (!m.alive || m === thrown) return;
  const v = thrown.body.velocity, sp = hyp(v.x, v.y);
  if (sp < 120) return;
  damageMonster(R, m, thrown.thrownDmg, v.x / sp, v.y / sp, 140, "#d2a8ff", thrown.thrownSrc);
  if (thrown.alive) damageMonster(R, thrown, thrown.thrownDmg * 0.3, 0, 0, 0, "#d2a8ff", thrown.thrownSrc);
  particle(R, m.body.position.x, m.body.position.y, 0, 0, 0xd2a8ff, 14, 3, 10, 30);
  if (R.frame % 2 === 0) R.sfx.push(["thud"]);
}
export function landThrown(R, m) {
  const shape = m.body.shapes.at(0);
  shape.cbTypes.remove(R.cb.thrown);
  shape.filter = m.def.ghost ? F.ghost() : F.mon();
  if (m.reap) explode(R, m.body.position.x, m.body.position.y, 80, m.thrownDmg * 0.8, 0xd2a8ff, false, m.thrownSrc);
}

// ── Hero projectiles (sensor bodies) ─────────────────────────────────────
function spawnShot(R, w, kind, angle, o) {
  const shot = { kind, w: w.id, body: null, angle, dmg: o.dmg, pierce: o.pierce, r: o.r, life: o.life, speed: o.speed, delay: o.delay || 0, blast: o.blast || 0, hit: new Set() };
  if (shot.delay <= 0) armShot(R, shot);
  R.shots.push(shot);
}
function armShot(R, shot) {
  const a = shot.angle;
  const body = new Body(BodyType.DYNAMIC, new Vec2(heroX(R) + Math.cos(a) * (HERO_R + 4), heroY(R) + Math.sin(a) * (HERO_R + 4)));
  const shape = new Circle(shot.r);
  shape.sensorEnabled = true;
  shape.filter = F.shot();
  shape.cbTypes.add(R.cb.shot);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(a) * shot.speed, Math.sin(a) * shot.speed);
  body.space = R.space;
  shot.body = body;
}
function killShot(R, shot) {
  if (shot.blast && shot.body) explode(R, shot.body.position.x, shot.body.position.y, shot.blast, shot.dmg * 0.6, 0xbfe3ff, false, shot.w);
  if (shot.body?.space) shot.body.space = null;
  shot.body = null;
  shot.done = true;
}
export function onShotHit(R, shot, m) {
  if (shot.hit.has(m) || shot.done) return;
  shot.hit.add(m);
  damageMonster(R, m, shot.dmg, Math.cos(shot.angle), Math.sin(shot.angle), shot.kind === "knife" ? 60 : 110, shot.kind === "knife" ? "#e6edf3" : "#9fd0ff", shot.w);
  particle(R, m.body.position.x, m.body.position.y, 0, 0, shot.kind === "knife" ? 0xe6edf3 : 0x9fd0ff, 12, 2, 10, 20);
  if (shot.pierce-- <= 0) killShot(R, shot);
}
export function tickShots(R) {
  const { W, H } = R.world;
  for (let i = R.shots.length - 1; i >= 0; i--) {
    const s = R.shots[i];
    if (!s.body && !s.done) {
      if (--s.delay <= 0) armShot(R, s);
      continue;
    }
    if (s.body) {
      if (--s.life <= 0) killShot(R, s);
      else {
        const p = s.body.position;
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) killShot(R, s);
      }
    }
    if (s.done) R.shots.splice(i, 1);
  }
}
export { clamp };
