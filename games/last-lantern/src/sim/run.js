import {
  Space, Body, BodyType, Vec2, Circle, Material,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "@newkrok/nape-js";
import {
  DT, FPS, HERO_R, MAX_MON, MAX_WEAPONS, MAX_PASSIVES, MAX_WLEVEL, MAX_PLEVEL,
  clamp, lerp, hyp, mulberry, xpFor,
} from "../config.js";
import { STAGES, BLOOD } from "../data/stages.js";
import { HEROES, ACTIVES, WEAPON_IDS, PASSIVE_IDS, WEAPON_META, RELIC_IDS, MAX_RELICS } from "../data/meta.js";
import { buildWorld } from "./world.js";
import {
  F, heroX, heroY, spawnMonster, killMonster, damageMonster, hurtHero, killSpit, gemTier,
  burst, floater, particle, explode, pushProps, nearestMonsters,
} from "./core.js";
import { tickMonsters, spawnPoint, spawnBoss, contactDamage, slam } from "./monsters.js";
import {
  WEAPONS, addWeapon, tickWeapons, tickShots, onShotHit, onOrbHit, onThrownHit, landThrown,
  evolvable, evolve, clearOrbs, clearCensers, tickHolyZone, weaponStats, relicStorm,
} from "./weapons.js";

// ── A run ────────────────────────────────────────────────────────────────
// One attempt at one stage with one hero. Owns the nape Space and every
// entity in it, knows nothing about rendering or the DOM: the page reads
// its arrays to draw, and drains R.sfx for sounds. Everything random comes
// from R.rng, so a seed replays a run in Node (scripts/bot.js).
//
// phase: play → levelup / chest (paused, waiting for a pick) → play …
//        → dead (the night takes you) or won (the beacon is lit).

export const PASSIVE_MAX = (id) => (id === "quiver" ? 2 : MAX_PLEVEL);

export function createRun({ stageIndex = 0, heroId = "wren", hearth = {}, blood = false, seed = 1, unlocked = null, title = false } = {}) {
  const stage = STAGES[stageIndex];
  const heroDef = HEROES.find((h) => h.id === heroId) || HEROES[0];
  const space = new Space(new Vec2(0, 0));
  space.worldLinearDrag = 0;
  const R = {
    space, stage, heroDef, blood, seed, hearthLv: hearth,
    rng: mulberry(seed),
    frame: 0, clock: 0, phase: "play", phaseT: 0,
    hpMul: stage.hpMul * (blood ? BLOOD.hp : 1),
    dmgMul: stage.dmgMul * (blood ? BLOOD.dmg : 1),
    rateMul: stage.rate * (blood ? BLOOD.rate : 1),
    monsters: [], byBody: new Map(), shots: [], spits: [], orbs: [], gems: [], pickups: [], censers: [], ravens: [], relics: [], relicPending: 0, martyrT: 0,
    particles: [], floaters: [], arcs: [], bolts: [], rings: [], beams: [], banners: [], globs: [], hazards: [],
    zones: [], elites: [], boss: null, bossSpawned: false, bossKilledAt: 0,
    kills: 0, embers: 0, damageTaken: 0, dmgBy: {}, killsBy: {}, weaponsSeen: new Set(), evolved: [],
    spawnAcc: 0, events: [], cards: [], chest: null, levelUpQueue: 0, chestQueue: 0,
    rerolls: hearth.reroll || 0, banishes: hearth.banish || 0, banished: new Set(),
    unlocked: unlocked || new Set(WEAPON_IDS),
    freeze: 0, flash: 0, eclipse: 0, shakeAmp: 0, shakeT: 0,
    sfx: [], hitsThisFrame: 0, gemStreak: 0, gemStreakT: 0,
    beaconLit: 0,
  };
  R.shake = (amp, dur) => { R.shakeAmp = Math.max(R.shakeAmp, amp); R.shakeT = Math.max(R.shakeT, dur); };
  R.banner = (key, color, frames, vars) => R.banners.push({ key, vars, color, t: 0, T: frames });
  R.heroDown = () => heroDown(R);
  R.bossDown = (m) => bossDown(R, m);
  R.landThrown = (m) => landThrown(R, m);

  installListeners(R);
  R.world = buildWorld(space, stage);
  R.zones.push(...R.world.zones);
  R.hero = makeHero(R);
  recomputeStats(R);
  addWeapon(R, heroDef.weapon);
  for (const c of R.world.candles) spawnMonster(R, "candle", c.x, c.y);
  // The beacons behind you lend their strength: later stages start with a
  // few levels to spend.
  if (!title && stage.index > 0) {
    const extra = stage.index * 2;
    R.hero.level += extra;
    R.hero.xpNext = xpFor(R.hero.level);
    R.levelUpQueue = extra;
    R.startBoost = extra;
  }
  R.events = stage.events.map(([at, kind, id, n]) => ({ at: at * FPS, kind, id, n }));
  if (title) {
    R.title = true;
    spawnTitleHorde(R);
  } else R.banner("b_start", "#ffd166", 160, { stage: stage.id });

  R.step = (input) => step(R, input);
  R.pickCard = (i) => pickCard(R, i);
  R.reroll = () => reroll(R);
  R.banish = (i) => banish(R, i);
  R.skip = () => skipCard(R);
  R.closeChest = () => closeChest(R);
  R.useActive = () => { R.wantActive = true; };
  return R;
}

// ── Listeners ────────────────────────────────────────────────────────────
function installListeners(R) {
  const cb = R.cb = { hero: new CbType(), mon: new CbType(), shot: new CbType(), spit: new CbType(), orb: new CbType(), thrown: new CbType() };
  const bodies = (c) => [c.int1.castBody ?? c.int1.castShape?.body ?? null, c.int2.castBody ?? c.int2.castShape?.body ?? null];
  const add = (ev, type, a, b, fn) => R.space.listeners.add(new InteractionListener(ev, type, a, b, fn));
  // Hero shots → monsters.
  add(CbEvent.BEGIN, InteractionType.SENSOR, cb.shot, cb.mon, (c) => {
    const [b1, b2] = bodies(c);
    const shot = R.shots.find((s) => s.body === b1 || s.body === b2);
    if (!shot?.body) return;
    const m = R.byBody.get(shot.body === b1 ? b2 : b1);
    if (m?.alive) onShotHit(R, shot, m);
  });
  // Orbiting spades → monsters.
  add(CbEvent.BEGIN, InteractionType.SENSOR, cb.orb, cb.mon, (c) => {
    const [b1, b2] = bodies(c);
    const orb = R.orbs.find((o) => o.body === b1 || o.body === b2);
    if (!orb) return;
    const m = R.byBody.get(orb.body === b1 ? b2 : b1);
    if (m?.alive) onOrbHit(R, orb, m);
  });
  // Monster spit → hero.
  add(CbEvent.BEGIN, InteractionType.SENSOR, cb.spit, cb.hero, (c) => {
    const [b1, b2] = bodies(c);
    const sp = R.spits.find((s) => s.body === b1 || s.body === b2);
    if (!sp?.body) return;
    hurtHero(R, sp.dmg, sp.body.position.x, sp.body.position.y);
    killSpit(sp);
  });
  // Contact damage: any monster pressing against the hero.
  add(CbEvent.ONGOING, InteractionType.COLLISION, cb.mon, cb.hero, (c) => {
    const [b1, b2] = bodies(c);
    const m = R.byBody.get(b1) || R.byBody.get(b2);
    if (m?.alive) m.touchFrame = R.frame;
  });
  // A hurled monster slamming into the crowd.
  add(CbEvent.BEGIN, InteractionType.COLLISION, cb.thrown, cb.mon, (c) => {
    const [b1, b2] = bodies(c);
    const a = R.byBody.get(b1), b = R.byBody.get(b2);
    if (!a || !b) return;
    const thrown = a.thrown > 0 ? a : b, other = thrown === a ? b : a;
    onThrownHit(R, thrown, other);
  });
}

// ── Hero ─────────────────────────────────────────────────────────────────
function makeHero(R) {
  const s = R.world.start;
  const body = new Body(BodyType.DYNAMIC, new Vec2(s.x, s.y));
  const shape = new Circle(HERO_R, undefined, new Material(0, 0.3, 0.4, 3));
  shape.filter = F.hero();
  shape.cbTypes.add(R.cb.hero);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.space = R.space;
  return {
    def: R.heroDef, body,
    hp: 100, maxHp: 100,
    face: -Math.PI / 2, moveX: 0, moveY: 0, speedNow: 0, dist: 0,
    iframes: 0, hitFlash: 0, attackFlash: 0,
    level: 1, xp: 0, xpNext: xpFor(1),
    weapons: [], passives: {},
    regenAcc: 0, stats: null,
    activeCd: 60, activeMax: ACTIVES[R.heroDef.active].cd * FPS, activeT: 0,
    tumble: 0, sanct: 0, dig: 0, flareT: 0,
    revives: R.hearthLv.revival || 0, onIce: false,
  };
}

export function recomputeStats(R) {
  const h = R.hero, d = R.heroDef, H = R.hearthLv;
  const lv = (id) => h.passives[id] || 0;
  const hl = (id) => H[id] || 0;
  h.stats = {
    speed: d.speed * (1 + 0.08 * lv("boots") + 0.06 * hl("swift")),
    magnet: 90 * (1 + 0.3 * lv("magnet") + 0.2 * hl("reach")),
    cdMul: Math.max(0.35, (1 - 0.07 * lv("tome")) * (1 - 0.04 * hl("haste"))),
    dmgMul: 0.82 * d.might * (1 + 0.1 * lv("fist")) * (1 + 0.08 * hl("might")),
    armor: d.armor + lv("plate") + hl("armor"),
    regen: 0.3 * lv("root") + 0.3 * hl("recovery"),
    area: d.area * (1 + 0.1 * lv("oil")),
    luck: 1 + 0.1 * lv("clover") + 0.08 * hl("luck"),
    amount: lv("quiver"),
    growth: 1 + 0.05 * hl("growth") + 0.1 * lv("feather"),
    dur: 1 + 0.15 * lv("chrism"),
    proj: 1 + 0.1 * lv("chrism"),
    greed: (1 + 0.1 * hl("greed")) * (R.blood ? BLOOD.embers : 1),
    crit: 0.05 * (1 + 0.1 * lv("clover") + 0.08 * hl("luck")),
  };
  // Relics bend the numbers.
  const rel = (id) => R.relics.includes(id);
  if (rel("bloodseal")) h.stats.dmgMul *= 1.3;
  if (rel("hourglass")) h.stats.cdMul = Math.max(0.3, h.stats.cdMul * 0.75);
  if (rel("pilgrim")) h.stats.speed *= 1.1;
  if (rel("souljar")) { h.stats.growth *= 1.3; h.stats.magnet *= 1.5; }
  h.stats.activeMul = rel("wick") ? 0.6 : 1;
  const newMax = Math.round((d.hp + 15 * lv("heart") + 15 * hl("vitality")) * (R.relics.includes("hourglass") ? 0.8 : 1));
  if (newMax !== h.maxHp) {
    if (h.maxHp === 100 && h.level === 1 && h.xp === 0) h.hp = newMax;
    else h.hp += Math.max(0, newMax - h.maxHp);
    h.maxHp = newMax;
    h.hp = Math.min(h.hp, h.maxHp);
  }
}

function onIce(R, x, y) {
  for (const z of R.zones) {
    if (z.kind !== "ice") continue;
    const dx = x - z.x, dy = y - z.y;
    if (dx * dx + dy * dy < z.r * z.r) return true;
  }
  return false;
}
function inMud(R, x, y) {
  for (const z of R.zones) {
    if (z.kind !== "mud") continue;
    const dx = x - z.x, dy = y - z.y;
    if (dx * dx + dy * dy < z.r * z.r) return true;
  }
  return false;
}

function tickHero(R, input) {
  const h = R.hero, st = h.stats;
  if (h.iframes > 0) h.iframes--;
  if (h.hitFlash > 0) h.hitFlash--;
  if (h.attackFlash > 0) h.attackFlash--;
  if (h.activeCd > 0) h.activeCd--;
  let mx = input?.mx || 0, my = input?.my || 0;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  if (len > 0.05) h.face = Math.atan2(my, mx);
  h.moveX = mx; h.moveY = my;
  const x = heroX(R), y = heroY(R);
  h.onIce = onIce(R, x, y);
  const mud = inMud(R, x, y) && h.dig <= 0;
  let sp = st.speed * (mud ? 0.62 : 1) * (h.dig > 0 ? 1.45 : 1);
  const v = h.body.velocity;
  if (h.tumble > 0) {
    h.tumble--;
    h.body.velocity = new Vec2(Math.cos(h.tumbleA) * 720, Math.sin(h.tumbleA) * 720);
    if (h.tumble === 0) activeEnd(R);
  } else {
    // Blended, not written, so a brute's shove still reads; on ice the blend
    // is small and you slide.
    const k = h.onIce ? 0.035 : 0.28;
    h.body.velocity = new Vec2(lerp(v.x, mx * sp, k), lerp(v.y, my * sp, k));
  }
  const nv = h.body.velocity;
  h.speedNow = Math.hypot(nv.x, nv.y);
  h.stillT = h.speedNow < 25 && len < 0.05 ? (h.stillT || 0) + 1 : 0;
  h.dist += h.speedNow * DT;

  if (st.regen > 0 && h.hp < h.maxHp) {
    h.regenAcc += st.regen * DT;
    if (h.regenAcc >= 1) { h.hp = Math.min(h.maxHp, h.hp + 1); h.regenAcc -= 1; }
  }

  // Active ability.
  if (R.wantActive) {
    R.wantActive = false;
    if (h.activeCd <= 0) activeStart(R);
  }
  if (h.sanct > 0) { h.sanct--; if (h.sanct % 10 === 0) pushRing(R, 150, 60); }
  if (h.dig > 0) {
    h.dig--;
    if (h.dig % 4 === 0) particle(R, x, y, (R.rng() - 0.5) * 60, (R.rng() - 0.5) * 60, 0x5a4a3a, 24, 3.5, 2, 60);
    if (h.dig === 0) activeEnd(R);
  }
  if (h.flareT > 0) h.flareT--;
  // Relics that act on their own clock.
  if (R.relics.includes("clapper") && R.clock % 480 === 0 && R.clock > 0) {
    R.rings.push({ x: heroX(R), y: heroY(R), r: 10, max: 220, t: 0, T: 22, color: 0xe0c070 });
    for (const m of R.monsters) {
      if (!m.alive || m.def.prop) continue;
      const p = m.body.position, dx = p.x - heroX(R), dy = p.y - heroY(R), d = hyp(dx, dy);
      if (d < 220 + m.def.r) damageMonster(R, m, 24, dx / d, dy / d, 380, "#e0c070", "clapper");
    }
    R.sfx.push(["bigtoll"]);
  }
  if (R.relics.includes("stormglass") && R.clock % 360 === 180) relicStorm(R);
}

function pushRing(R, radius, kick) {
  const x = heroX(R), y = heroY(R);
  for (const m of R.monsters) {
    if (!m.alive || m.def.boss || m.def.prop || m.def.part) continue;
    const p = m.body.position, dx = p.x - x, dy = p.y - y, d = hyp(dx, dy);
    if (d < radius + m.def.r) m.body.applyImpulse(new Vec2(dx / d * kick * m.body.mass, dy / d * kick * m.body.mass));
  }
}

function activeStart(R) {
  const h = R.hero, st = h.stats, x = heroX(R), y = heroY(R);
  const id = R.heroDef.active;
  h.activeCd = Math.round(h.activeMax * st.cdMul * st.activeMul);
  h.activeT = 30;
  R.sfx.push(["active_" + id]);
  if (id === "flare") {
    // A burst of the old sun: hurts, stuns and throws everything near.
    const r = 250 * st.area;
    R.rings.push({ x, y, r: 10, max: r, t: 0, T: 22, color: 0xfff0b0 });
    R.flash = 0.9;
    h.flareT = 40;
    for (const m of [...R.monsters]) {
      if (!m.alive) continue;
      const p = m.body.position, dx = p.x - x, dy = p.y - y, d = hyp(dx, dy);
      if (d > r + m.def.r) continue;
      damageMonster(R, m, 40, dx / d, dy / d, 320, "#fff0b0", "flare");
      if (m.alive && !m.def.boss) m.stun = 100;
    }
    pushProps(R, x, y, r, 300);
    R.shake(8, 0.3);
  } else if (id === "tumble") {
    const a = h.moveX || h.moveY ? Math.atan2(h.moveY, h.moveX) : h.face;
    h.tumbleA = a;
    h.tumble = 12;
    h.iframes = Math.max(h.iframes, 26);
  } else if (id === "sanctuary") {
    h.sanct = 190;
    const heal = Math.round(h.maxHp * 0.25);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floater(R, x, y - 26, `+${heal}`, "#7ee787", 1.2);
    pushRing(R, 170, 420);
    R.rings.push({ x, y, r: 10, max: 170, t: 0, T: 20, color: 0xffe9a8 });
  } else if (id === "dig") {
    h.dig = 100;
    const s = h.body.shapes.at(0);
    s.filter = F.heroDig();
    burst(R, x, y, 20, 0x5a4a3a, 3);
  }
}
function activeEnd(R) {
  const h = R.hero, id = R.heroDef.active, x = heroX(R), y = heroY(R);
  if (id === "tumble") {
    // Coming out of the roll: a ring of bolts.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      spawnVolleyBolt(R, a);
    }
    R.sfx.push(["bow", 0]);
  } else if (id === "dig") {
    h.body.shapes.at(0).filter = F.hero();
    h.iframes = Math.max(h.iframes, 30);
    const r = 170 * h.stats.area;
    R.rings.push({ x, y, r: 10, max: r, t: 0, T: 20, color: 0xa08060 });
    burst(R, x, y, 30, 0x6a5a4a, 3.5);
    for (const m of [...R.monsters]) {
      if (!m.alive) continue;
      const p = m.body.position, dx = p.x - x, dy = p.y - y, d = hyp(dx, dy);
      if (d < r + m.def.r) { damageMonster(R, m, 55, dx / d, dy / d, 380, "#d0b090", "dig"); if (m.alive && !m.def.boss) m.stun = 60; }
    }
    pushProps(R, x, y, r, 340);
    R.shake(10, 0.35);
    R.sfx.push(["slam"]);
  }
}
// The tumble's bolt ring shares the crossbow's projectile code path.
function spawnVolleyBolt(R, a) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(heroX(R) + Math.cos(a) * 18, heroY(R) + Math.sin(a) * 18));
  const shape = new Circle(5);
  shape.sensorEnabled = true;
  shape.filter = F.shot();
  shape.cbTypes.add(R.cb.shot);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(a) * 560, Math.sin(a) * 560);
  body.space = R.space;
  R.shots.push({ kind: "bolt", w: "tumble", body, angle: a, dmg: 18, pierce: 2, r: 5, life: 50, speed: 560, delay: 0, blast: 0, hit: new Set() });
}

function heroDown(R) {
  const h = R.hero;
  if (h.revives > 0) {
    h.revives--;
    h.hp = Math.round(h.maxHp * 0.5);
    h.iframes = 150;
    R.banner("b_revive", "#ffd166", 150);
    R.sfx.push(["revive"]);
    explode(R, heroX(R), heroY(R), 360, 120, 0xffd166);
    R.flash = 1;
    return;
  }
  h.hp = 0;
  R.phase = "dead";
  // The night's tithe: even a lost run brings embers home, more the longer
  // you held out.
  R.tithe = Math.round((Math.floor(R.clock / FPS / 5) + h.level * 3) * h.stats.greed);
  R.embers += R.tithe;
  R.phaseT = 0;
  R.shake(18, 0.6);
  burst(R, heroX(R), heroY(R), 40, 0xe5484d, 4);
  R.banner("b_dead", "#ff6b6b", 240);
  R.sfx.push(["death"]);
}

function bossDown(R, m) {
  R.bossKilledAt = R.frame;
  R.eclipse = 0;
  R.hazards.length = 0;
  R.flash = 1;
  R.banner("b_beacon", "#ffd166", 300);
  R.sfx.push(["beacon"]);
  // The beacon's light burns the rest of the night away.
  for (const o of [...R.monsters]) if (o.alive && !o.def.prop) { burst(R, o.body.position.x, o.body.position.y, 3, o.def.c, 2); killMonster(R, o, true); }
  // Pull every gem and ember in.
  for (const g of R.gems) g.pull = true;
  R.clearBonus = 60 + R.stage.index * 40;
  void m;
}

// ── Spawns ───────────────────────────────────────────────────────────────
function weightedPick(R, list) {
  let total = 0;
  for (const e of list) total += e[1];
  let r = R.rng() * total;
  for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
  return list[list.length - 1][0];
}

function tickSpawns(R) {
  if (R.bossKilledAt) return;
  const sec = R.clock / FPS;
  const st = R.stage;
  const t = clamp(sec / st.bossAt, 0, 1);
  let rate = (0.8 + (sec / 60) * 1.35) * R.rateMul;
  if (t > 0.8) rate *= 1.4;
  if (R.bossSpawned) rate *= 0.55;
  if (R.freeze > 0) rate = 0;
  let alive = 0;
  for (const m of R.monsters) if (m.alive && !m.def.prop) alive++;
  if (alive >= MAX_MON) rate = 0;
  R.spawnAcc += rate * DT;
  const w = [];
  for (const [id, from, w0, w1] of st.mix) if (sec >= from) w.push([id, lerp(w0, w1, t)]);
  while (R.spawnAcc >= 1 && alive < MAX_MON) {
    R.spawnAcc -= 1;
    const s = spawnPoint(R);
    spawnMonster(R, weightedPick(R, w), s.x, s.y);
    alive++;
  }
  // Scripted events.
  while (R.events.length && R.events[0].at <= R.clock) {
    const ev = R.events.shift();
    const hx = heroX(R), hy = heroY(R);
    R.banner("ev_" + ev.kind + "_" + ev.id, ev.kind === "elite" ? "#ff9a5a" : "#ffd166", 150);
    R.sfx.push([ev.kind === "elite" ? "elite" : "horde"]);
    if (ev.kind === "ring") {
      for (let i = 0; i < ev.n; i++) {
        const a = (i / ev.n) * Math.PI * 2;
        spawnMonster(R, ev.id, hx + Math.cos(a) * 520, hy + Math.sin(a) * 520);
      }
    } else if (ev.kind === "wall") {
      const side = R.rng() < 0.5 ? -1 : 1;
      for (let i = 0; i < ev.n; i++) spawnMonster(R, ev.id, hx + side * 560, hy - 520 + i * (1040 / ev.n));
    } else if (ev.kind === "pack") {
      const s = spawnPoint(R, 500, 560);
      for (let i = 0; i < ev.n; i++) spawnMonster(R, ev.id, s.x + (R.rng() - 0.5) * 120, s.y + (R.rng() - 0.5) * 120);
    } else {
      for (let k = 0; k < ev.n; k++) {
        const s = spawnPoint(R, 480, 560);
        const m = spawnMonster(R, ev.id, s.x, s.y);
        if (m) burst(R, s.x, s.y, 30, m.def.c, 3);
      }
      R.shake(6, 0.3);
    }
  }
  // The keeper of the beacon.
  if (!R.bossSpawned && sec >= st.bossAt) {
    R.bossSpawned = true;
    spawnBoss(R, st.boss);
    R.banner("boss_" + st.boss, "#f85149", 200);
    R.sfx.push(["bossArrive"]);
    R.shake(10, 0.6);
  }
}

// ── Gems and pickups ─────────────────────────────────────────────────────
function tickGems(R) {
  const h = R.hero, hx = heroX(R), hy = heroY(R);
  const mag = h.stats.magnet;
  if (R.gemStreakT > 0 && --R.gemStreakT === 0) R.gemStreak = 0;
  for (let i = R.gems.length - 1; i >= 0; i--) {
    const g = R.gems[i];
    const dx = hx - g.x, dy = hy - g.y, d = hyp(dx, dy);
    if (!g.pull && d < mag) g.pull = true;
    if (g.pull) {
      const sp = clamp(900 - d * 1.5, 380, 900);
      g.vx = lerp(g.vx, (dx / d) * sp, 0.2);
      g.vy = lerp(g.vy, (dy / d) * sp, 0.2);
      g.x += g.vx * DT; g.y += g.vy * DT;
      if (d < HERO_R + 6) {
        R.gems.splice(i, 1);
        gainXp(R, g.xp);
        R.gemStreak++;
        R.gemStreakT = 40;
        if (R.frame % 2 === 0 || gemTier(g.xp) > 0) R.sfx.push(["gem", Math.min(24, R.gemStreak)]);
      }
    }
  }
  for (let i = R.pickups.length - 1; i >= 0; i--) {
    const p = R.pickups[i];
    p.t++;
    const dx = hx - p.x, dy = hy - p.y, d = hyp(dx, dy);
    // Embers roll to you from a little further than gems.
    if (p.kind === "ember" && (d < mag * 1.2 || R.bossKilledAt)) {
      const sp = clamp(900 - d, 300, 900);
      p.x += (dx / d) * sp * DT; p.y += (dy / d) * sp * DT;
    }
    if (d < HERO_R + 14) {
      R.pickups.splice(i, 1);
      usePickup(R, p);
    }
  }
}

function usePickup(R, p) {
  const h = R.hero, hx = heroX(R), hy = heroY(R);
  if (p.kind === "ember") {
    const v = Math.max(1, Math.round(p.v * h.stats.greed));
    R.embers += v;
    if (v > 2) floater(R, hx, hy - 24, `+${v}`, "#ffb347", 0.9);
    R.sfx.push(["ember"]);
  } else if (p.kind === "bread") {
    const heal = Math.round(h.maxHp * 0.2);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    floater(R, hx, hy - 24, `+${heal}`, "#7ee787", 1.1);
    burst(R, hx, hy, 10, 0x7ee787, 2);
    R.sfx.push(["heal"]);
  } else if (p.kind === "magnet") {
    for (const g of R.gems) g.pull = true;
    R.banner("b_magnet", "#79c0ff", 60);
    R.rings.push({ x: hx, y: hy, r: 10, max: 700, t: 0, T: 30, color: 0x79c0ff });
    R.sfx.push(["magnet"]);
  } else if (p.kind === "flare") {
    R.flash = 1;
    R.banner("b_flare", "#ffd166", 60);
    explode(R, hx, hy, 540, 100, 0xffd166, false, "flare");
    for (const m of R.monsters) if (m.alive && m.def.boss) damageMonster(R, m, 200, 0, 0, 0, "#ffd166", "flare");
    R.shake(14, 0.4);
  } else if (p.kind === "hourglass") {
    R.freeze = 6 * FPS;
    R.banner("b_freeze", "#9fd8ff", 90);
    R.sfx.push(["freeze"]);
  } else if (p.kind === "chest") {
    R.chestQueue++;
    if (p.relic && R.relics.length + R.relicPending < MAX_RELICS) R.relicPending++;
    R.sfx.push(["chestGet"]);
  }
}

function gainXp(R, xp) {
  const h = R.hero;
  h.xp += xp * h.stats.growth;
  while (h.xp >= h.xpNext) {
    h.xp -= h.xpNext;
    h.level++;
    h.xpNext = xpFor(h.level);
    R.levelUpQueue++;
  }
}

// ── Level-up cards ───────────────────────────────────────────────────────
function rollCards(R) {
  const h = R.hero;
  const opts = [];
  const nW = h.weapons.length, nP = Object.keys(h.passives).length;
  for (const id of WEAPON_IDS) {
    if (R.banished.has(id) || !R.unlocked.has(id)) continue;
    const w = h.weapons.find((x) => x.id === id || WEAPON_META[x.id].evolved && evolvedFrom(x.id) === id);
    if (w && (w.evolved || w.level >= MAX_WLEVEL)) continue;
    if (!w && nW >= MAX_WEAPONS) continue;
    opts.push({ kind: "weapon", id, wt: w ? 3 : nW >= 4 ? 1 : 2.2 });
  }
  for (const id of PASSIVE_IDS) {
    if (R.banished.has(id)) continue;
    const lv = h.passives[id] || 0;
    if (lv >= PASSIVE_MAX(id)) continue;
    if (!lv && nP >= MAX_PASSIVES) continue;
    // A passive that would evolve a weapon you own is a little more likely.
    const pairs = h.weapons.some((w) => WEAPON_META[w.id].evo === id);
    opts.push({ kind: "passive", id, wt: (lv ? 2 : 1.5) * (pairs ? 1.4 : 1) });
  }
  const n = 3 + (R.rng() < (h.stats.luck - 1) * 1.5 ? 1 : 0);
  const out = [];
  while (out.length < n && opts.length) {
    let total = 0;
    for (const o of opts) total += o.wt;
    let r = R.rng() * total, idx = 0;
    for (; idx < opts.length; idx++) { r -= opts[idx].wt; if (r <= 0) break; }
    out.push(opts.splice(Math.min(idx, opts.length - 1), 1)[0]);
  }
  if (!out.length) out.push({ kind: "gold", id: "gold" }, { kind: "heal", id: "heal" });
  R.cards = out.map((o) => describeCard(R, o));
  R.rollId = (R.rollId || 0) + 1;
}
const evolvedFrom = (id) => Object.keys(WEAPON_META).find((k) => WEAPON_META[k].into === id);

export function describeCard(R, o) {
  const h = R.hero;
  if (o.kind === "weapon") {
    const w = h.weapons.find((x) => x.id === o.id);
    const lv = w ? w.level : 0;
    const next = weaponStats(o.id, lv + 1);
    const prev = lv ? weaponStats(o.id, lv) : null;
    const diff = [];
    if (prev) for (const k of Object.keys(next)) if (next[k] !== prev[k]) diff.push([k, prev[k], next[k]]);
    return { ...o, level: lv + 1, isNew: !w, diff, color: WEAPON_META[o.id].color };
  }
  if (o.kind === "passive") {
    const lv = h.passives[o.id] || 0;
    return { ...o, level: lv + 1, isNew: !lv, max: PASSIVE_MAX(o.id), color: "#9aa6b6" };
  }
  return { ...o, level: 0, color: o.kind === "gold" ? "#ffb347" : "#7ee787" };
}

function openLevelUp(R) {
  R.phase = "levelup";
  R.phaseT = 0;
  rollCards(R);
  R.sfx.push(["levelup"]);
}
function pickCard(R, i) {
  if (R.phase !== "levelup") return;
  const c = R.cards[i];
  if (!c) return;
  applyCard(R, c);
  R.levelUpQueue = Math.max(0, R.levelUpQueue - 1);
  if (R.levelUpQueue > 0) { rollCards(R); R.sfx.push(["levelup"]); return; }
  R.phase = "play";
}
function applyCard(R, c) {
  const h = R.hero;
  if (c.kind === "weapon") addWeapon(R, c.id);
  else if (c.kind === "passive") { h.passives[c.id] = (h.passives[c.id] || 0) + 1; recomputeStats(R); }
  else if (c.kind === "gold") R.embers += 10;
  else h.hp = Math.min(h.maxHp, h.hp + 30);
  burst(R, heroX(R), heroY(R), 16, 0xffd166, 3);
  R.rings.push({ x: heroX(R), y: heroY(R), r: 10, max: 120, t: 0, T: 18, color: 0xffd166 });
  R.sfx.push(["pick"]);
}
function reroll(R) {
  if (R.phase !== "levelup" || R.rerolls <= 0) return;
  R.rerolls--;
  rollCards(R);
  R.sfx.push(["reroll"]);
}
function banish(R, i) {
  if (R.phase !== "levelup" || R.banishes <= 0) return;
  const c = R.cards[i];
  if (!c || (c.kind !== "weapon" && c.kind !== "passive")) return;
  R.banishes--;
  R.banished.add(c.id);
  R.cards.splice(i, 1);
  if (!R.cards.length) rollCards(R);
  R.sfx.push(["banish"]);
}
function skipCard(R) {
  if (R.phase !== "levelup") return;
  R.levelUpQueue = Math.max(0, R.levelUpQueue - 1);
  if (R.levelUpQueue > 0) { rollCards(R); return; }
  R.phase = "play";
}

// ── Chests ───────────────────────────────────────────────────────────────
// An evolution if one is ready, otherwise one to three free upgrades.
function openChest(R) {
  const h = R.hero;
  const ready = evolvable(R);
  const items = [];
  if (ready.length) {
    const w = ready[0];
    const from = w.id;
    evolve(R, w);
    items.push({ kind: "evolve", from, id: w.id });
  } else {
    const r = R.rng() * h.stats.luck;
    const n = (r > 1.05 ? 3 : r > 0.75 ? 2 : 1) + (R.relics.includes("keys") ? 1 : 0);
    for (let k = 0; k < n; k++) {
      rollCards(R);
      const c = R.cards.find((x) => x.kind === "weapon" && !x.isNew) || R.cards.find((x) => x.kind === "passive" && !x.isNew) || R.cards[0];
      if (!c) break;
      applyCard(R, c);
      items.push(c);
    }
    R.cards = [];
  }
  // A relic, if this chest carried one and there is room.
  if (R.relicPending > 0) {
    R.relicPending--;
    const pool = RELIC_IDS.filter((id) => !R.relics.includes(id));
    if (R.relics.length < MAX_RELICS && pool.length) {
      const id = pool[Math.floor(R.rng() * pool.length)];
      gainRelic(R, id);
      items.unshift({ kind: "relic", id });
    }
  }
  const gold = Math.round((15 + R.stage.index * 5) * h.stats.greed * (R.relics.includes("keys") ? 1.6 : 1));
  R.embers += gold;
  R.chest = { items, gold, t: 0 };
  R.phase = "chest";
  R.sfx.push(["chest", items[0]?.kind === "evolve" || items[0]?.kind === "relic" ? 1 : 0]);
}

function gainRelic(R, id) {
  R.relics.push(id);
  R.relicsSeen = R.relicsSeen || new Set();
  R.relicsSeen.add(id);
  if (id === "saintsbone") R.hero.revives++;
  recomputeStats(R);
}
function closeChest(R) {
  if (R.phase !== "chest") return;
  R.chest = null;
  R.chestQueue = Math.max(0, R.chestQueue - 1);
  R.phase = "play";
}

// ── Globs (lobbed things) and zones ──────────────────────────────────────
function tickGlobs(R) {
  for (let i = R.globs.length - 1; i >= 0; i--) {
    const g = R.globs[i];
    if (++g.t < g.T) continue;
    R.globs.splice(i, 1);
    if (g.kind === "holy") {
      R.zones.push({ kind: "holy", x: g.x1, y: g.y1, r: g.r, life: g.dur, T: g.dur, dmg: g.dmg, src: g.src });
      burst(R, g.x1, g.y1, 8, 0x7ad8ff, 2);
      R.sfx.push(["splash"]);
    } else if (g.kind === "mud") {
      R.zones.push({ kind: "mud", x: g.x1, y: g.y1, r: g.r, life: 600, T: 600 });
      burst(R, g.x1, g.y1, 12, g.color, 3);
      if (Math.hypot(heroX(R) - g.x1, heroY(R) - g.y1) < g.r * 0.7) hurtHero(R, g.dmg, g.x1, g.y1);
      R.sfx.push(["splat"]);
    }
  }
  for (let i = R.zones.length - 1; i >= 0; i--) {
    const z = R.zones[i];
    if (z.life === undefined) continue;
    if (z.kind === "holy") tickHolyZone(R, z);
    if (--z.life <= 0) R.zones.splice(i, 1);
  }
}

// ── Effects ──────────────────────────────────────────────────────────────
function tickEffects(R) {
  for (let i = R.particles.length - 1; i >= 0; i--) {
    const p = R.particles[i];
    p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT;
    p.vx *= 0.9; p.vy *= 0.9; p.vz -= 400 * DT;
    if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    if (--p.life <= 0) R.particles.splice(i, 1);
  }
  for (let i = R.floaters.length - 1; i >= 0; i--) {
    const f = R.floaters[i];
    f.y -= 0.7;
    if (++f.t >= f.T) R.floaters.splice(i, 1);
  }
  for (const list of [R.arcs, R.bolts, R.beams]) for (let i = list.length - 1; i >= 0; i--) if (++list[i].t >= list[i].T) list.splice(i, 1);
  for (let i = R.rings.length - 1; i >= 0; i--) {
    const r = R.rings[i];
    r.t++;
    r.r = r.max * (1 - Math.pow(1 - r.t / r.T, 2));
    if (r.t >= r.T) R.rings.splice(i, 1);
  }
  for (let i = R.banners.length - 1; i >= 0; i--) if (++R.banners[i].t >= R.banners[i].T) R.banners.splice(i, 1);
  R.flash *= 0.88;
  if (R.flash < 0.01) R.flash = 0;
  if (R.shakeT > 0) { R.shakeT -= DT; if (R.shakeT <= 0) R.shakeAmp = 0; }
}

function tickSpits(R) {
  for (let i = R.spits.length - 1; i >= 0; i--) {
    const sp = R.spits[i];
    // Some spit bends after you, a little each step.
    if (sp.body && sp.home) {
      const p = sp.body.position, v = sp.body.velocity, speed = Math.hypot(v.x, v.y);
      const want = Math.atan2(heroY(R) - p.y, heroX(R) - p.x);
      const a = sp.angle + Math.max(-sp.home, Math.min(sp.home, Math.atan2(Math.sin(want - sp.angle), Math.cos(want - sp.angle))));
      sp.angle = a;
      sp.body.velocity = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
    }
    if (sp.body && --sp.life <= 0) killSpit(sp);
    if (!sp.body) R.spits.splice(i, 1);
  }
}

// Loose props slide and stop.
function tickProps(R) {
  for (const p of R.world.props) {
    const v = p.body.velocity;
    if (v.x * v.x + v.y * v.y > 0.01) p.body.velocity = new Vec2(v.x * 0.92, v.y * 0.92);
    p.body.angularVel *= 0.9;
  }
}

// ── The step ─────────────────────────────────────────────────────────────
// The menu backdrop: the stage's night gathers around the hero at a
// distance, milling, never attacking.
function spawnTitleHorde(R) {
  const ids = R.stage.mix.map((e) => e[0]);
  const s = R.world.start;
  for (let i = 0; i < 70; i++) {
    const a = R.rng() * Math.PI * 2, d = 230 + R.rng() * 330;
    const id = i === 0 ? R.stage.events.find((e) => e[1] === "elite")[2] : ids[Math.floor(R.rng() * ids.length)];
    const m = spawnMonster(R, id, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d);
    if (m) { m.idleA = a; m.idleR = d; m.born = -100; }
  }
}
function titleStep(R) {
  const s = R.world.start;
  for (const m of R.monsters) {
    if (!m.alive || m.def.prop) continue;
    m.anim += DT * 3;
    m.idleA += DT * 0.1 * (m.seed > 0.5 ? 1 : -1);
    const tx = s.x + Math.cos(m.idleA) * m.idleR, ty = s.y + Math.sin(m.idleA) * m.idleR;
    const p = m.body.position, dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
    const v = m.body.velocity, sp = Math.min(m.def.speed * 0.5, d * 2);
    m.body.velocity = new Vec2(lerp(v.x, dx / d * sp, 0.1), lerp(v.y, dy / d * sp, 0.1));
    const nv = m.body.velocity;
    if (nv.x * nv.x + nv.y * nv.y > 25) m.face = Math.atan2(nv.y, nv.x);
  }
  const hv = R.hero.body.velocity;
  R.hero.body.velocity = new Vec2(hv.x * 0.8, hv.y * 0.8);
  R.hero.face = Math.PI / 2 + Math.sin(R.frame / 200) * 0.6;
  R.space.step(DT, 3, 1);
}

function step(R, input) {
  if (R.title) { R.frame++; titleStep(R); return; }
  R.frame++;
  R.phaseT++;
  R.hitsThisFrame = 0;
  if (R.phase === "levelup" || R.phase === "chest") { tickEffectsLight(R); return; }
  if (R.phase === "play") {
    R.clock++;
    tickHero(R, input);
    tickSpawns(R);
    tickMonsters(R);
    tickWeapons(R);
    tickShots(R);
    tickSpits(R);
    tickGems(R);
    tickGlobs(R);
    contactDamage(R);
    tickProps(R);
    if (R.freeze > 0) R.freeze--;
    for (const z of R.hazards) void z;
    if (R.bossKilledAt && R.frame - R.bossKilledAt > 150 && R.phase === "play") {
      R.phase = "won";
      R.phaseT = 0;
      R.embers += Math.round(R.clearBonus * R.hero.stats.greed);
    }
  } else {
    // dead / won: the world winds down.
    const v = R.hero.body.velocity;
    R.hero.body.velocity = new Vec2(v.x * 0.9, v.y * 0.9);
    if (R.phase === "dead") tickMonsters(R);
    if (R.phase === "won") { tickGems(R); R.beaconLit = Math.min(1, R.beaconLit + DT * 0.5); }
  }
  R.space.step(DT, 5, 2);
  tickEffects(R);
  // Queued picks open after the step, so the world is settled.
  if (R.phase === "play") {
    if (R.chestQueue > 0) openChest(R);
    else if (R.levelUpQueue > 0 && !R.bossKilledAt) openLevelUp(R);
  }
}
function tickEffectsLight(R) {
  // While a card is up only the floaters and banners keep moving.
  for (let i = R.banners.length - 1; i >= 0; i--) if (++R.banners[i].t >= R.banners[i].T) R.banners.splice(i, 1);
  if (R.chest) R.chest.t++;
}

// Summary for the result screen and analytics.
export function runSummary(R) {
  const weapons = R.hero.weapons.map((w) => ({ id: w.id, level: w.level, dmg: Math.round(R.dmgBy[w.id] || 0), kills: R.killsBy[w.id] || 0 }));
  return {
    stage: R.stage.index, stageId: R.stage.id, hero: R.heroDef.id, blood: R.blood,
    won: R.phase === "won", time: R.clock / FPS, kills: R.kills, level: R.hero.level, embers: R.embers, tithe: R.tithe || 0,
    weapons, passives: { ...R.hero.passives }, relics: [...R.relics], damageTaken: R.damageTaken, evolved: [...R.evolved],
  };
}

export { WEAPONS, nearestMonsters, clearOrbs, slam };
