import { WEAPONS } from "../data/weapons.js";
import { Core } from "../sim/core.js";
import { BUGS } from "../sim/bugs.js";
import { WARDEN } from "../sim/warden.js";

// ── Hold the line: the siege of Dustnest ─────────────────────────────────
// One sitting, about twenty minutes and then as long as you last. The
// reactor in the middle of the colony is the base; Kessler and two rangers
// hold it. A wave comes every five minutes, warned 45 seconds ahead, each
// bigger than the last. Between waves you go out: crates, patrols, the
// skimmer, weapons; crystals from all of them, banked only back at the
// base, where the supply terminal sells heal, ammo and upgrades. After the
// fourth wave the Hive Warden comes up somewhere far out and marches on
// the reactor. Kill it and the run goes on endless: a wave every four
// minutes, a bigger Warden every third. Lose the reactor and it is over.

export const SIEGE = {
  waveEvery: 300, warn: 45, bossWave: 4, bossDelay: 20, endlessEvery: 240, bossEvery: 3,
  coreHp: 1500,
  base: { x: 0, z: -2, r: 46 },
  patrolEvery: 20, patrolCap: 52, scatter: 8,
  crateEvery: 40, crateCap: 10,
  skimmerEvery: 75,
};

// What the terminal sells: price per level (the array's length is the cap).
export const SHOP = {
  heal: { price: [15], repeat: true },
  ammo: { price: [20], repeat: true },
  repair: { price: [25], repeat: true },
  dmg: { price: [40, 70, 110, 160] },
  mag: { price: [30, 60, 100] },
  hp: { price: [40, 80, 130] },
  shield: { price: [40, 80] },
  speed: { price: [50, 100] },
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const SCRIPT = {
  start(run) {
    const K = run.kit.marks, B = SIEGE.base;
    run.siege = { t: 0, wave: 0, next: SIEGE.waveEvery, warned: false, bossT: null, bosses: 0, endless: false, patrolT: 12, crateT: 8, skimmerT: SIEGE.skimmerEvery, lastBank: 0, survived: null };
    const S = run.siege;
    // The reactor and the defenders.
    run.core = new Core(K.reactor.x, run.kit.h(K.reactor.x, K.reactor.z), K.reactor.z, SIEGE.coreHp);
    run.addAlly(K.postKessler.x, K.postKessler.z, { name: "kessler", skin: "kessler", post: { x: K.postKessler.x, z: K.postKessler.z, r: 6 }, reach: 48, yaw: Math.PI });
    run.addAlly(K.postRuiz.x, K.postRuiz.z, { name: "ruiz", skin: "guard", post: { x: K.postRuiz.x, z: K.postRuiz.z, r: 6 }, reach: 34, yaw: -Math.PI / 2 });
    run.addAlly(K.postOkafor.x, K.postOkafor.z, { name: "okafor", skin: "guard", post: { x: K.postOkafor.x, z: K.postOkafor.z, r: 6 }, reach: 34, yaw: Math.PI / 2 });
    // The terminal, the racks, a few ammo boxes out on the dust.
    run.addUse({ id: "shop", x: K.terminal.x, z: K.terminal.z + 1.0, r: 2.2, repeat: true, label: () => ["use_shop"], act: (r) => r.fx({ type: "shop" }) });
    rack(run, "launcher", K.armory.x, K.armory.z + 0.6);
    rack(run, "laser", K.laser.x, K.laser.z + 0.9);
    for (const [x, z] of [[-13, 120], [K.relay.x - 2, K.relay.z - 2], [2, -54], [K.ammoPit.x, K.ammoPit.z], [-18, -121], [56, 30], [-60, -40]]) ammo(run, x, z);
    run.obj("base", { marker: { x: run.core.x, z: run.core.z, y: run.core.body.y + 2 }, hidden: true, minDist: 50 });
    // Bugs already out there: packs scattered well away from the base, and some patrols.
    for (let i = 0; i < SIEGE.scatter; i++) {
      const p = run.openSpot(B.x, B.z, 75, 135, 60);
      if (!p) continue;
      const n = 2 + Math.floor(run.rng() * 2);
      for (let k = 0; k < n; k++) run.spawn("swarmer", p.x + (run.rng() - 0.5) * 6, p.z + (run.rng() - 0.5) * 6, { roam: 6 });
      if (i % 3 === 1) run.spawn("spitter", p.x + 3, p.z - 3, { roam: 5 });
      if (i % 5 === 4) run.spawn("charger", p.x - 4, p.z + 4, { roam: 5 });
    }
    for (let i = 0; i < 3; i++) this.patrol(run, true);
    for (let i = 0; i < 5; i++) this.crate(run);
    run.say("oduya_siege_intro"); run.say("kessler_siege_intro");
    run.fx({ type: "powerOn", instant: true });
  },

  update(run, dt) {
    const S = run.siege, p = run.player, B = SIEGE.base;
    S.t += dt;
    // ── The wave clock ──
    S.next -= dt;
    if (!S.warned && S.next <= SIEGE.warn) { S.warned = true; run.fx({ type: "waveWarn", n: S.wave + 1, s: SIEGE.warn }); run.say(S.wave === 0 ? "oduya_wave_first" : "oduya_wave_warn"); }
    if (S.next <= 0) this.wave(run);
    // ── The boss ──
    if (S.bossT != null) { S.bossT -= dt; if (S.bossT <= 0) { S.bossT = null; this.boss(run); } }
    if (run.boss?.alive && (run.frame & 15) === 0) run.obj("warden", { marker: { x: run.boss.x, z: run.boss.z, y: run.boss.y + 2 } });
    // ── Patrols, crates, the skimmer ──
    S.patrolT -= dt;
    if (S.patrolT <= 0) { S.patrolT = SIEGE.patrolEvery * (0.7 + run.rng() * 0.6); this.patrol(run, false); }
    S.crateT -= dt;
    if (S.crateT <= 0) { S.crateT = SIEGE.crateEvery; this.crate(run); }
    S.skimmerT -= dt;
    if (S.skimmerT <= 0) { S.skimmerT = SIEGE.skimmerEvery; this.skimmer(run); }
    // ── Banking: crystals count once you are back inside the base ──
    const home = Math.hypot(p.body.x - B.x, p.body.z - B.z) < B.r;
    if (home && run.crystals > 0 && !p.downed) { run.bank += run.crystals; run.fx({ type: "bank", n: run.crystals, total: run.bank }); run.crystals = 0; }
    // Old crystals fade (so the ground does not fill up).
    if ((run.frame & 63) === 0) run.uses = run.uses.filter((u) => !(u.auto && u.born != null && run.time - u.born > 150));
    // ── Barks ──
    const hunting = run.bugs.some((b) => b.alive && b.state === "hunt");
    if (hunting) run.flags.fighting = true;
    else if (run.flags.fighting && !run.boss?.alive) { run.flags.fighting = false; run.say("kessler_clear", { gap: 60 }); }
    if (run.core.hitT > 0 && run.time - (run.flags.coreBark ?? -99) > 25) { run.flags.coreBark = run.time; run.say("kessler_core_hit", { gap: 25 }); }
    if (!home && run.crystals >= 30) run.say("kessler_bank", { gap: 120 });
  },

  // ── Waves ──
  wave(run) {
    const S = run.siege;
    S.wave++; run.stats.waves = S.wave;
    S.warned = false;
    S.next = S.endless ? SIEGE.endlessEvery : SIEGE.waveEvery;
    const n = S.wave;
    // Size: grows with the wave; chargers from the third, more of everything endless.
    const sw = 10 + 5 * n, sp = n + 1, ch = n >= 2 ? Math.floor(n / 2) : 0;
    const list = [["swarmer", sw], ["spitter", sp]];
    if (ch) list.push(["charger", ch]);
    // Three ring burrows, spread round the base, plus one far one for the late arrivals.
    const ring = run.kit.burrows.filter((h) => h.name.startsWith("ring")).map((h) => h.name);
    const picks = [];
    const start = Math.floor(run.rng() * ring.length);
    for (let i = 0; i < 3; i++) picks.push(ring[(start + i * 2) % ring.length]);
    const hpMul = S.endless ? 1 + 0.08 * (n - SIEGE.bossWave) : 1;
    run.wave(picks, list, { group: `wave${n}`, hpMul });
    run.fx({ type: "wave", n });
    run.say("kessler_wave");
    // The Warden after the fourth wave, and every third wave endless.
    if (n === SIEGE.bossWave || (S.endless && (n - SIEGE.bossWave) % SIEGE.bossEvery === 0)) S.bossT = SIEGE.bossDelay;
  },

  boss(run) {
    const S = run.siege, B = SIEGE.base;
    if (run.boss?.alive) return;
    const p = run.openSpot(B.x, B.z, 100, 135, 80) ?? { x: 98, z: 6 };
    S.bosses++;
    const w = run.spawn("warden", p.x, p.z, { emerge: true, hpMul: 1 + 0.25 * (S.bosses - 1) });
    w.emergeT = 2.0;
    w.hunt(run, run.core, false);
    run.fx({ type: "bossEmerge", x: p.x, z: p.z });
    run.obj("warden", { marker: { x: p.x, z: p.z, y: run.kit.h(p.x, p.z) }, boss: true, hidden: true });
    run.say("voss_warden_siege"); run.say("kessler_warden_siege");
  },

  // ── Patrols: a small pack out of a far burrow, wandering the area ──
  patrol(run, initial) {
    const p = run.player.body, B = SIEGE.base;
    const alive = run.bugs.filter((b) => b.alive && !b.boss).length;
    if (alive >= SIEGE.patrolCap) return;
    const holes = run.kit.burrows.filter((h) => Math.hypot(h.x - p.x, h.z - p.z) > 70 && Math.hypot(h.x - B.x, h.z - B.z) > 55);
    if (!holes.length) return;
    const h = holes[Math.floor(run.rng() * holes.length)];
    const min = run.siege.t / 60;
    const n = 2 + Math.floor(run.rng() * 2) + (min > 10 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const type = i === n - 1 && min > 3 && run.rng() < 0.5 ? "spitter" : i === 0 && min > 8 && run.rng() < 0.25 ? "charger" : "swarmer";
      const b = run.spawn(type, h.x + (run.rng() - 0.5) * 3, h.z + (run.rng() - 0.5) * 3, { emerge: !initial, patrol: true, group: "patrol" });
      const g = run.openSpot(h.x, h.z, 30, 70);
      if (g) { b.goalX = g.x; b.goalZ = g.z; }
    }
    if (!initial) run.fx({ type: "burrow", x: h.x, y: h.y, z: h.z, quiet: true });
  },

  // ── Crates: random loot out on the dust ──
  crate(run) {
    const B = SIEGE.base;
    if (run.uses.filter((u) => u.crate).length >= SIEGE.crateCap) return;
    const p = run.openSpot(B.x, B.z, 55, 130, 60);
    if (!p) return;
    const r = run.rng();
    const kind = r < 0.45 ? "crystal" : r < 0.8 ? "ammo" : "upgrade";
    run.addUse({ id: `crate${run.time.toFixed(1)}`, x: p.x, z: p.z, r: 2.0, crate: true, model: "lootCrate", label: () => ["use_crate"], act: (rr, u) => {
      if (kind === "ammo") { for (const g of rr.player.slots) { const W = WEAPONS[g.id]; if (g.reserve !== Infinity && W.reserve) g.reserve = Math.min(W.reserve * 1.5, g.reserve + W.reserve * 0.5); } rr.fx({ type: "ammo" }); rr.fx({ type: "loot", kind }); }
      else if (kind === "upgrade") { const n = 25 + Math.floor(rr.rng() * 20); rr.dropCrystal(u.x + 0.6, u.z + 0.6, n, u.y); rr.fx({ type: "loot", kind }); }
      else { const n = 8 + Math.floor(rr.rng() * 14); rr.dropCrystal(u.x + 0.6, u.z + 0.6, n, u.y); rr.fx({ type: "loot", kind }); }
    } });
  },

  // ── The skimmer: a flyer that runs from you and pays well ──
  skimmer(run) {
    if (run.bugs.some((b) => b.alive && b.type === "skimmer")) return;
    const p = run.openSpot(run.player.body.x, run.player.body.z, 40, 90, 40);
    if (!p || !BUGS.skimmer) return;
    run.spawn("skimmer", p.x, p.z, {});
    run.say("voss_skimmer", { once: true });
  },

  onKill(run, b, src) {
    const n = b.def.crystal ?? 0;
    if (n) run.dropCrystal(b.x, b.z, n, b.y);
    if (b.boss) {
      run.objDone("warden");
      run.fx({ type: "bossDead" });
      run.say("kessler_warden_dead_siege"); run.say("oduya_survived");
      if (!run.siege.endless) { run.siege.endless = true; run.siege.survived = run.stats.time; run.fx({ type: "survived", score: this.score(run) }); run.siege.next = Math.min(run.siege.next, SIEGE.endlessEvery); }
    }
    if (b.type === "skimmer") run.say("voss_skimmer_down", { gap: 60 });
  },
  onEngage(run, b) {
    if (b.type === "charger") run.say("kessler_charger", { gap: 90 });
    if (b.type === "spitter") run.say("kessler_spitter", { gap: 90 });
  },
  onCoreDown(run) {
    run.say("kessler_core_down");
    run.fail();
  },

  // ── Down out on the field: back at the base, lighter ──
  onDead(run) {
    const p = run.player, K = run.kit.marks;
    const drop = Math.floor(run.crystals / 2);
    if (drop > 0) { run.dropCrystal(p.body.x, p.body.z, drop); run.crystals -= drop; run.fx({ type: "crystalLost", n: drop, x: p.body.x, z: p.body.z }); }
    p.respawn(run, K.start.x, K.start.z, K.start.yaw ?? 0);
    run.say("kessler_respawn");
  },

  // ── The shop ──
  shop(run) {
    const p = run.player;
    return Object.entries(SHOP).map(([id, d]) => {
      const level = d.repeat ? 0 : p.up[id];
      const price = d.price[Math.min(level, d.price.length - 1)];
      const maxed = !d.repeat && level >= d.price.length;
      let useless = false;
      if (id === "heal") useless = p.hp >= p.maxHp;
      if (id === "ammo") useless = p.slots.every((g) => g.reserve === Infinity || g.reserve >= WEAPONS[g.id].reserve);
      if (id === "repair") useless = run.core.hp >= run.core.maxHp;
      return { id, price, level, max: d.price.length, maxed, ok: !maxed && !useless && run.bank >= price, useless };
    });
  },
  buy(run, id) {
    const it = this.shop(run).find((q) => q.id === id);
    if (!it || !it.ok) return false;
    const p = run.player;
    run.bank -= it.price;
    switch (id) {
      case "heal": p.hp = p.maxHp; p.shield = p.maxShield; break;
      case "ammo": for (const g of p.slots) { const W = WEAPONS[g.id]; if (g.reserve !== Infinity) g.reserve = Math.max(g.reserve, W.reserve); if (g.mag < p.magOf(g.id) && W.mag) g.mag = p.magOf(g.id); } break;
      case "repair": run.core.repair(450); break;
      case "dmg": p.up.dmg++; p.dmgMul = 1 + 0.15 * p.up.dmg; break;
      case "mag": p.up.mag++; p.magMul = 1 + 0.3 * p.up.mag; break;
      case "hp": p.up.hp++; p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); break;
      case "shield": p.up.shield++; p.maxShield += 25; break;
      case "speed": p.up.speed++; p.speedMul = 1 + 0.08 * p.up.speed; break;
    }
    run.fx({ type: "bought", id });
    return true;
  },

  // The score: seconds survived count most; kills and crystals a little.
  score(run) { return Math.floor(run.stats.time) + run.stats.kills * 2 + run.stats.crystals; },
  summary(run) {
    const S = run.siege;
    return { time: run.stats.time, timeText: fmt(run.stats.time), waves: S.wave, kills: run.stats.kills, crystals: run.stats.crystals, downs: run.stats.downs, bosses: S.bosses - (run.boss?.alive ? 1 : 0), score: this.score(run), survived: S.survived != null };
  },
};

// A weapon rack: take the gun (it swaps with the one in your hands).
function rack(run, id, x, z) {
  run.addUse({ id: `rack_${id}`, x, z, r: 1.8, weapon: id, model: "rackGun", repeat: true,
    label: (r) => (r.player.slots.some((g) => g.id === id) ? ["use_ammo"] : [r.player.slots.length < 2 ? "use_take" : "use_swap", { w: `w_${id}` }]),
    act: (r, u) => { takeWeapon(r, id, null, u); if (id === "launcher") r.say("kessler_launcher", { once: true }); if (id === "laser") r.say("kessler_laser", { once: true }); } });
}

// A weapon on the ground (dropped in a swap): takes back its own ammo.
function dropped(run, g, x, z) {
  run.addUse({ id: `drop_${g.id}_${Math.round(run.time * 10)}`, x, z, r: 1.6, weapon: g.id, model: "dropGun", ammo: g,
    label: (r) => (r.player.slots.some((s) => s.id === g.id) ? ["use_ammo"] : [r.player.slots.length < 2 ? "use_take" : "use_swap", { w: `w_${g.id}` }]),
    act: (r, u) => takeWeapon(r, g.id, g, u) });
}

function takeWeapon(run, id, state, u) {
  const p = run.player, have = p.slots.find((s) => s.id === id), W = WEAPONS[id];
  if (have) {
    if (u.repeat && (run.time - (u.lastAmmo ?? -99)) < 60) { run.fx({ type: "dry" }); return; }   // a rack refills once a minute
    u.lastAmmo = run.time;
    have.reserve = have.reserve === Infinity ? Infinity : Math.min(W.reserve * 1.5, have.reserve + (state ? state.mag + state.reserve : W.mag + W.reserve));
    run.fx({ type: "ammo" });
    return;
  }
  if (p.slots.length >= 2) {
    const old = p.slots[p.cur];
    dropped(run, old, p.body.x + Math.sin(p.face) * 0.8, p.body.z + Math.cos(p.face) * 0.8);
  }
  const g = p.give(id, p.slots.length < 2 ? null : p.cur);
  if (state) { g.mag = state.mag; g.reserve = state.reserve; g.heat = state.heat; }
  p.cur = p.slots.indexOf(g); p.reloadT = 0; p.swapT = 0.5;
  run.fx({ type: "pickup", id });
}

function ammo(run, x, z) {
  run.addUse({ id: `ammo_${Math.round(x)}_${Math.round(z)}`, x, z, r: 1.7, model: "ammoBox", label: () => ["use_ammo"], act: (r) => {
    for (const g of r.player.slots) { const W = WEAPONS[g.id]; if (g.reserve !== Infinity && W.reserve) g.reserve = Math.min(W.reserve * 1.5, g.reserve + W.reserve * 0.6); }
    r.fx({ type: "ammo" }); r.say("kessler_ammo", { gap: 90 });
  } });
}
