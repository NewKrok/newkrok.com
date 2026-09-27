import { Body, BodyType, Vec2, Circle, Material, InteractionFilter } from "@newkrok/nape-js";
import {
  G_HERO, G_MON, G_SOLID, G_SHOT, G_SPIT, G_ORB, G_PROP, G_THROWN, G_CENSER,
  S_HERO, S_MON, S_SPIT, S_SHOT, S_ORB,
  HERO_R, MAX_MON, clamp, hyp,
} from "../config.js";
import { MON } from "../data/monsters.js";

// ── Shared entity plumbing ───────────────────────────────────────────────
// Spawning, damage, death, drops and effects. Every function takes the run
// state R, so the monster AI, the weapons and the run loop can all use them
// without knowing about each other.

export const F = {
  hero: () => new InteractionFilter(G_HERO, G_MON | G_SOLID | G_PROP, S_HERO, S_SPIT),
  heroDig: () => new InteractionFilter(G_HERO, G_SOLID, S_HERO, 0),
  mon: () => new InteractionFilter(G_MON, G_HERO | G_MON | G_SOLID | G_PROP | G_THROWN | G_CENSER, S_MON, S_SHOT | S_ORB),
  ghost: () => new InteractionFilter(G_MON, G_HERO, S_MON, S_SHOT | S_ORB),
  worm: () => new InteractionFilter(G_MON, G_HERO | G_MON | G_PROP | G_THROWN, S_MON, S_SHOT | S_ORB),
  thrown: () => new InteractionFilter(G_THROWN, G_MON | G_SOLID | G_PROP, S_MON, S_SHOT | S_ORB),
  candle: () => new InteractionFilter(0, 0, S_MON, S_SHOT | S_ORB),
  shot: () => new InteractionFilter(G_SHOT, 0, S_SHOT, S_MON),
  spit: () => new InteractionFilter(G_SPIT, 0, S_SPIT, S_HERO),
  orb: () => new InteractionFilter(G_ORB, 0, S_ORB, S_MON),
  none: () => new InteractionFilter(0, 0, 0, 0),
  censer: () => new InteractionFilter(G_CENSER, G_MON | G_PROP, 0, 0),
};

export const heroX = (R) => R.hero.body.position.x;
export const heroY = (R) => R.hero.body.position.y;

// ── Monsters ─────────────────────────────────────────────────────────────
export function spawnMonster(R, id, x, y, opts = {}) {
  const def = MON[id];
  if (!def) return null;
  const { W, H } = R.world;
  x = clamp(x, def.r + 8, W - def.r - 8);
  y = clamp(y, def.r + 8, H - def.r - 8);
  const sc = def.scale || 1;
  const prop = def.prop;
  const body = new Body(prop ? BodyType.STATIC : BodyType.DYNAMIC, new Vec2(x, y));
  const shape = new Circle(opts.r ?? def.r, undefined, new Material(0.05, 0.2, 0.3, def.mass));
  shape.filter = prop ? F.candle() : def.ghost ? F.ghost() : def.part || def.ai === "worm" ? F.worm() : F.mon();
  shape.cbTypes.add(R.cb.mon);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.space = R.space;
  const t = R.clock / (R.stage.bossAt * 60);
  const grow = def.boss || prop ? 1 : 1 + Math.min(1.2, t) * 1.25;     // the night hardens
  // The stage's toughness comes in over the first half of the night, so a
  // fresh hero is not facing its full weight at 0:00.
  const stageK = def.boss || def.elite ? 1 : Math.min(1, 0.35 + t * 1.3);
  const hp = def.hp * (prop ? 1 : 1 + (R.hpMul - 1) * stageK) * grow * (opts.hpMul ?? 1);
  const m = {
    def, body, alive: true, id,
    hp, maxHp: hp, scale: sc,
    face: Math.atan2(heroY(R) - y, heroX(R) - x), wobble: R.rng() * 6.28, seed: R.rng(),
    hitFlash: 0, touchFrame: -9, orbCd: 0,
    spitCd: 90 + Math.floor(R.rng() * 120),
    dash: 0, dashCd: 200 + Math.floor(R.rng() * 90), wind: 0, windKind: "", t: 0,
    slamCd: 420, summonCd: 360, phase: 0,
    stun: 0, burn: 0, burnDmg: 0, slow: 1, thrown: 0,
    anim: R.rng() * 6.28, born: R.frame, hidden: 0,
  };
  R.monsters.push(m);
  R.byBody.set(body, m);
  if (def.boss) R.boss = m;
  if (def.elite) R.elites.push(m);
  return m;
}

export function removeMonster(R, m) {
  m.alive = false;
  // Joints go first: nape refuses a constraint whose body left the space.
  if (m.joint?.space) m.joint.space = null;
  if (m.segs) for (const sg of m.segs) if (sg.joint?.space) sg.joint.space = null;
  if (m.body.space) m.body.space = null;
  R.byBody.delete(m.body);
}

export function killMonster(R, m, silent = false) {
  if (!m.alive) return;
  removeMonster(R, m);
  const p = m.body.position, x = p.x, y = p.y, def = m.def;
  if (m.segs) for (const s of m.segs) if (s.alive) { removeMonster(R, s); burst(R, s.body.position.x, s.body.position.y, 12, def.c, 3); }
  if (silent) return;
  if (def.prop) {
    burst(R, x, y, 14, 0xffd28a, 2.5);
    R.sfx.push(["candle"]);
    dropCandle(R, x, y);
    return;
  }
  R.kills++;
  // The Raven Skull: a chest every 150 kills.
  if (R.relics.includes("ravenskull") && R.kills % 150 === 0) R.pickups.push({ kind: "chest", x, y, t: 0 });
  R.killsBy[m.lastSrc] = (R.killsBy[m.lastSrc] || 0) + 1;
  burst(R, x, y, def.boss ? 70 : def.elite ? 30 : 5, def.c, def.boss ? 4 : 2);
  if (def.xp) dropGem(R, x, y, def.xp);
  dropPickup(R, m);
  if (R.kills % 3 === 0 || def.elite || def.boss) R.sfx.push(["kill", def.heavy || def.elite ? 1 : 0]);
  if (def.split) {
    for (let i = 0; i < 2; i++) {
      const a = R.rng() * 6.28;
      const c = spawnMonster(R, def.split, x + Math.cos(a) * 10, y + Math.sin(a) * 10);
      if (c) c.body.applyImpulse(new Vec2(Math.cos(a) * 120 * c.body.mass, Math.sin(a) * 120 * c.body.mass));
    }
  }
  if (def.explode) explode(R, x, y, def.explode.r, def.explode.dmg * R.dmgMul, 0xff7a3a, true);
  if (def.elite || def.boss) {
    const relic = !def.boss && R.relics.length + R.relicPending < 2 && (!R.relicDropped || R.rng() < 0.4);
    if (relic) { R.relicDropped = true; R.banner("b_relicChest", "#c8a0ff", 150); }
    R.pickups.push({ kind: "chest", x, y, t: 0, relic });
    R.banner(def.boss ? "b_bossDown" : "b_eliteDown", def.boss ? "#ffd166" : "#ffd166", 150);
    R.shake(def.boss ? 18 : 8, 0.5);
    R.sfx.push([def.boss ? "bossDie" : "eliteDie"]);
    addEmbers(R, x, y, def.boss ? 60 : 10);
    if (def.boss) { R.boss = null; R.bossDown(m); }
    else R.elites = R.elites.filter((e) => e !== m);
  }
}

// Damage with the hero's multipliers, a crit roll, knockback as an impulse
// scaled by mass (bats fly, brutes shrug) and a floating number.
export function damageMonster(R, m, dmg, kx = 0, ky = 0, knock = 0, color = "#ffffff", src = "") {
  if (!m.alive) return 0;
  if (m.def.part) {
    // Worm segments share the head's health.
    m.hitFlash = 5;
    const head = m.parent;
    if (!head?.alive) return 0;
    return damageMonster(R, head, dmg * 0.35, 0, 0, 0, color, src);
  }
  if (m.hidden > 0) return 0;
  const st = R.hero.stats;
  const crit = R.rng() < st.crit;
  const still = R.relics.includes("pilgrim") && R.hero.stillT > 45 ? 1.4 : 1;
  const real = Math.max(1, Math.round(dmg * st.dmgMul * still * (0.9 + R.rng() * 0.2) * (crit ? 2 : 1)));
  m.hp -= real;
  m.hitFlash = 6;
  m.lastSrc = src;
  R.dmgBy[src] = (R.dmgBy[src] || 0) + real;
  if (knock > 0 && !m.def.boss && !m.def.prop && m.body.type !== BodyType.STATIC) {
    const k = knock / Math.sqrt(m.def.mass) * (m.def.heavy ? 0.6 : 1);
    m.body.applyImpulse(new Vec2(kx * k * m.body.mass, ky * k * m.body.mass));
  }
  if (R.floaters.length < 40 || crit || m.def.elite || m.def.boss) {
    floater(R, m.body.position.x, m.body.position.y - m.def.r - 6, String(real), crit ? "#ffe066" : color, crit ? 1.25 : m.def.boss ? 1.1 : 0.85);
  }
  R.hitsThisFrame++;
  if (m.hp <= 0) killMonster(R, m);
  return real;
}

export function burnMonster(m, dmg, frames) {
  if (!m.alive || m.def.prop) return;
  m.burn = Math.max(m.burn, frames);
  m.burnDmg = Math.max(m.burnDmg, dmg);
}

// A radial blast: damage and an outward impulse for monsters (and props);
// `hurtsHero` for monster explosions.
export function explode(R, x, y, radius, dmg, color, hurtsHero = false, src = "") {
  R.rings.push({ x, y, r: 8, max: radius, t: 0, T: 18, color });
  burst(R, x, y, 16, color, 3);
  R.sfx.push(["boom", radius > 150 ? 1 : 0]);
  for (const o of R.monsters) {
    if (!o.alive) continue;
    const q = o.body.position, dx = q.x - x, dy = q.y - y, d = hyp(dx, dy);
    if (d < radius + o.def.r) {
      if (hurtsHero) {
        if (!o.def.boss && !o.def.part) { o.hp -= dmg * 0.6; o.hitFlash = 4; if (o.hp <= 0) killMonster(R, o); }
      } else damageMonster(R, o, dmg, dx / d, dy / d, 200, "#ffb347", src);
    }
  }
  pushProps(R, x, y, radius, 260);
  if (hurtsHero) {
    const d = Math.hypot(heroX(R) - x, heroY(R) - y);
    if (d < radius + HERO_R) hurtHero(R, dmg, x, y);
  }
}

// Radial impulse on the loose props.
export function pushProps(R, x, y, radius, kick) {
  for (const p of R.world.props) {
    const q = p.body.position, dx = q.x - x, dy = q.y - y, d = hyp(dx, dy);
    if (d < radius) {
      const k = kick * (1 - d / radius);
      p.body.applyImpulse(new Vec2(dx / d * k * p.body.mass, dy / d * k * p.body.mass));
    }
  }
}

export function nearestMonsters(R, n, maxD, fromX = heroX(R), fromY = heroY(R)) {
  const list = [];
  const md2 = maxD * maxD;
  for (const m of R.monsters) {
    if (!m.alive || m.def.prop || m.hidden > 0) continue;
    const dx = m.body.position.x - fromX, dy = m.body.position.y - fromY;
    const d2 = dx * dx + dy * dy;
    if (d2 < md2) list.push([d2, m]);
  }
  if (n === 1) {
    let best = null;
    for (const e of list) if (!best || e[0] < best[0]) best = e;
    return best ? [best[1]] : [];
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, n).map((e) => e[1]);
}

// ── The hero getting hurt ────────────────────────────────────────────────
export function hurtHero(R, dmg, sx, sy, src) {
  const h = R.hero;
  if (R.phase !== "play" || h.iframes > 0 || h.hp <= 0 || h.dig > 0 || h.sanct > 0) return;
  const real = Math.max(1, Math.round(dmg * (R.relics.includes("bloodseal") ? 1.2 : 1) - h.stats.armor));
  // The Thorned Shroud answers every touch.
  if (src?.alive && R.relics.includes("thorns")) {
    const dx = src.body.position.x - heroX(R), dy = src.body.position.y - heroY(R), d = hyp(dx, dy);
    damageMonster(R, src, real * 2 + 10, dx / d, dy / d, 260, "#c8a0ff", "thorns");
  }
  h.hp -= real;
  h.iframes = 30;
  h.hitFlash = 8;
  R.damageTaken += real;
  R.shake(Math.min(10, 3 + real * 0.3), 0.18);
  floater(R, heroX(R), heroY(R) - 22, `-${real}`, "#ff6b6b", 1.1);
  burst(R, heroX(R), heroY(R), 6, 0xff6b6b, 2.2);
  R.sfx.push(["hurt"]);
  if (sx !== undefined) {
    const dx = heroX(R) - sx, dy = heroY(R) - sy, d = hyp(dx, dy);
    h.body.applyImpulse(new Vec2((dx / d) * 90 * h.body.mass, (dy / d) * 90 * h.body.mass));
  }
  // The Martyr's Candle: a burst of the old sun when you are nearly gone.
  if (h.hp > 0 && h.hp < h.maxHp * 0.3 && R.relics.includes("martyr") && R.frame > R.martyrT) {
    R.martyrT = R.frame + 60 * 60;
    h.hp = Math.min(h.maxHp, h.hp + 20);
    R.banner("b_martyr", "#ffd166", 90);
    explode(R, heroX(R), heroY(R), 380, 140, 0xffd166, false, "martyr");
  }
  if (h.hp <= 0) R.heroDown();
}

// ── Monster projectiles ──────────────────────────────────────────────────
export function spawnSpit(R, x, y, angle, spec) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16));
  const shape = new Circle(spec.r || 5);
  shape.sensorEnabled = true;
  shape.filter = F.spit();
  shape.cbTypes.add(R.cb.spit);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(angle) * spec.speed, Math.sin(angle) * spec.speed);
  body.space = R.space;
  R.spits.push({ body, dmg: spec.dmg * R.dmgMul, life: spec.life || 150, angle, color: spec.color, r: spec.r || 5, big: spec.big, arrow: spec.arrow });
}
export function killSpit(sp) {
  if (sp.body?.space) sp.body.space = null;
  sp.body = null;
}

// ── Gems, pickups, embers ────────────────────────────────────────────────
export function dropGem(R, x, y, xp) {
  R.gems.push({ x: x + (R.rng() - 0.5) * 12, y: y + (R.rng() - 0.5) * 12, xp, vx: 0, vy: 0, pull: false, bob: R.rng() * 6.28 });
  if (R.gems.length > 360) {
    // Too many on the ground: fold the oldest far-away ones into one big gem.
    let sum = 0, cx = 0, cy = 0, n = 0;
    const hx = heroX(R), hy = heroY(R);
    for (let i = 0; i < R.gems.length && n < 80; i++) {
      const g = R.gems[i];
      if (!g.pull && Math.hypot(g.x - hx, g.y - hy) > 300) { sum += g.xp; cx += g.x; cy += g.y; n++; R.gems.splice(i, 1); i--; }
    }
    if (n > 0) R.gems.push({ x: cx / n, y: cy / n, xp: sum, vx: 0, vy: 0, pull: false, bob: 0 });
  }
}
export const gemTier = (xp) => (xp >= 30 ? 3 : xp >= 8 ? 2 : xp >= 3 ? 1 : 0);

export function addEmbers(R, x, y, n) {
  // Big amounts drop as a few coins so they scatter nicely.
  const coins = Math.min(8, Math.max(1, Math.ceil(n / 5)));
  let left = n;
  for (let i = 0; i < coins; i++) {
    const v = i === coins - 1 ? left : Math.ceil(n / coins);
    left -= v;
    const a = R.rng() * 6.28, d = coins > 1 ? 10 + R.rng() * 26 : 0;
    R.pickups.push({ kind: "ember", x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t: 0, v });
  }
}

function dropPickup(R, m) {
  const r = R.rng(), luck = R.hero.stats.luck, def = m.def;
  const x = m.body.position.x, y = m.body.position.y;
  let kind = null;
  if (def.heavy) kind = r < 0.14 * luck ? "bread" : null;
  else if (def.ai === "ranged") kind = r < 0.06 * luck ? "magnet" : null;
  else if (def.ghost) kind = r < 0.045 * luck ? "flare" : null;
  else kind = r < 0.006 * luck ? "bread" : r < 0.0085 * luck ? "hourglass" : null;
  if (kind) R.pickups.push({ kind, x, y, t: 0 });
  if (R.rng() < (def.heavy ? 0.3 : 0.05) * luck) addEmbers(R, x, y, def.heavy ? 3 : 1);
}

function dropCandle(R, x, y) {
  const r = R.rng();
  if (r < 0.14) R.pickups.push({ kind: "bread", x, y, t: 0 });
  else if (r < 0.30) R.pickups.push({ kind: "magnet", x, y, t: 0 });
  else if (r < 0.50) R.pickups.push({ kind: "flare", x, y, t: 0 });
  else if (r < 0.58) R.pickups.push({ kind: "hourglass", x, y, t: 0 });
  else addEmbers(R, x, y, r < 0.64 ? 15 : 3 + Math.floor(R.rng() * 4));
}

// ── Effects (render-only records, cheap to keep in the sim) ──────────────
export function particle(R, x, y, vx, vy, color, life, size, z = 0, vz = 0) {
  if (R.particles.length > 600) return;
  R.particles.push({ x, y, z, vx, vy, vz, color, life, T: life, size });
}
export function burst(R, x, y, n, color, size = 2) {
  if (R.particles.length > 520) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = R.rng() * Math.PI * 2, s = 40 + R.rng() * 160;
    particle(R, x, y, Math.cos(a) * s, Math.sin(a) * s, color, 18 + Math.floor(R.rng() * 16), size * (0.6 + R.rng() * 0.7), 8, 60 + R.rng() * 120);
  }
}
export function floater(R, x, y, text, color, scale = 1) {
  R.floaters.push({ x, y, text, color, t: 0, T: 42, scale });
}

export { MAX_MON };
