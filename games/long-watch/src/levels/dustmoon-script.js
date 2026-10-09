import { WEAPONS } from "../data/weapons.js";
import { PIT, RIDGE } from "./dustmoon.js";

// ── Dustnest: the mission ────────────────────────────────────────────────
// Stages, in order (a checkpoint remembers the stage and the flags):
//   approach   land, walk up the road, first contact at the rover
//   colony     search the ops centre (the logs)
//   tasks      power (hold the generator shed against waves) and the relay
//              on the west ridge, in either order
//   survivors  through the sentries' canyon to the bunker
//   vents      charges on the three nest vents in the pit
//   boss       the Hive Warden
//   extract    back to the landing zone
// Data pads (5) and the weapon racks are there all along.

const LOGS = ["log1", "log2", "log3", "log4", "log5"];

// Bug groups, placed at the start (skipped once wiped out).
const GROUPS = {
  rover: [["swarmer", 4, 82, { roam: 4 }], ["swarmer", 10, 77, { roam: 4 }], ["swarmer", 12, 84, { roam: 4 }], ["swarmer", 6, 86, { roam: 4 }]],
  colonyS: [["swarmer", -4, 28, {}], ["swarmer", 2, 24, {}], ["swarmer", 20, 34, {}], ["spitter", -18, 22, {}]],
  colonyN: [["swarmer", -8, -32, {}], ["swarmer", -2, -28, {}], ["swarmer", 6, -36, {}], ["sentry", -30, -40, { roam: 2 }]],
  east: [["swarmer", 54, 0, {}], ["swarmer", 58, 6, {}], ["swarmer", 50, -6, {}]],
  west: [["swarmer", -62, 8, {}], ["swarmer", -66, 14, {}], ["spitter", -80, 2, {}]],
  ridge: [["swarmer", -104, -18, { roam: 6 }], ["swarmer", -110, -14, { roam: 6 }], ["charger", -116, -28, { roam: 6 }], ["sentry", -122, -20, { roam: 2 }]],
  can1: [["sentry", -5, -72, { roam: 1.5, yaw: 0 }], ["swarmer", 2, -80, { roam: 3 }], ["swarmer", 4, -76, { roam: 3 }]],
  can2: [["sentry", 9, -92, { roam: 1.5, yaw: 0.6 }], ["charger", -2, -94, { roam: 3 }], ["swarmer", -6, -88, { roam: 3 }], ["swarmer", -4, -96, { roam: 3 }]],
  can3: [["sentry", -14, -106, { roam: 1.5, yaw: 0.2 }], ["swarmer", -16, -114, { roam: 3 }], ["swarmer", -22, -110, { roam: 3 }], ["spitter", -10, -116, { roam: 3 }]],
  pit1: [["swarmer", PIT.x - 22, PIT.z - 10, {}], ["swarmer", PIT.x - 26, PIT.z - 16, {}], ["spitter", PIT.x - 30, PIT.z - 8, {}]],
  pit2: [["swarmer", PIT.x + 20, PIT.z + 14, {}], ["swarmer", PIT.x + 24, PIT.z + 20, {}], ["sentry", PIT.x + 30, PIT.z + 12, { roam: 2 }]],
  pit3: [["swarmer", PIT.x + 6, PIT.z - 22, {}], ["swarmer", PIT.x + 12, PIT.z - 28, {}], ["charger", PIT.x, PIT.z - 4, {}]],
};

const STAGES = ["approach", "colony", "tasks", "survivors", "vents", "boss", "extract"];
const after = (run, s) => STAGES.indexOf(run.stage) >= STAGES.indexOf(s);

export const SCRIPT = {
  start(run, cp) {
    const K = run.kit.marks;
    run.stage = cp?.stage ?? "approach";
    run.npcs = [];
    run.dropship = null;
    run.hints = [];
    for (const [name, list] of Object.entries(GROUPS)) {
      // The canyon and the pit only wake once you get there (fewer bugs to step).
      if (name.startsWith("pit") && !after(run, "survivors")) continue;
      if (name.startsWith("can") && !after(run, "tasks")) continue;
      if ((name === "rover" || name === "colonyS") && after(run, "colony") && !run.flags[`cleared_${name}`]) continue;
      run.spawnGroup(name, list);
    }

    // ── Use points that are always there ──
    for (const [i, id] of LOGS.entries()) {
      if (run.flags[id]) continue;
      const m = K[id];
      run.addUse({ id, x: m.x, z: m.z, r: 1.6, label: () => ["use_log"], model: "datapad", act: (r) => { r.flags[id] = true; r.stats.logs++; r.fx({ type: "log", id, n: i + 1 }); r.say("kessler_log_found", { once: true }); r.obj("logs", { optional: true, n: r.stats.logs }); } });
    }
    rack(run, "launcher", K.armory.x, K.armory.z + 0.6);
    rack(run, "laser", K.laser.x, K.laser.z + 0.9);
    rack(run, "rifle", 16, -9.5);
    for (const [x, z] of [[-13, 120], [-12, -16.5], [24.5, -9.5], [RIDGE.x - 2, RIDGE.z - 2], [2, -54], [K.ammoPit.x, K.ammoPit.z], [-18, -121]]) ammo(run, x, z);
    if (run.stats.logs) run.obj("logs", { optional: true, n: run.stats.logs });

    this.enter(run, run.stage, !!cp);
    if (!cp) this.intro(run);
  },

  // ── Entering a stage (also when coming back from a checkpoint) ──
  enter(run, stage, restored = false) {
    const K = run.kit.marks;
    run.stage = stage;
    const done = (id) => run.objDone(id);
    switch (stage) {
      case "approach":
        run.obj("reach", { marker: K.gate });
        break;
      case "colony":
        done("reach");
        run.obj("ops", { marker: K.terminal });
        run.addUse({ id: "terminal", x: K.terminal.x, z: K.terminal.z + 0.5, r: 1.8, hold: 1.4, label: () => ["use_terminal"], act: (r) => {
          r.say("kessler_log"); r.say("oduya_tasks"); r.say("kessler_tasks");
          r.objDone("ops"); this.enter(r, "tasks"); r.checkpoint("tasks");
        } });
        if (!restored) { run.say("kessler_colony", { once: true }); run.say("oduya_ops", { once: true }); }
        break;
      case "tasks":
        done("ops");
        for (const [n, l] of Object.entries(GROUPS)) if (n.startsWith("can")) run.spawnGroup(n, l);
        if (!run.flags.power) {
          run.obj("power", { marker: K.generator });
          run.addUse({ id: "generator", x: K.generator.x, z: K.generator.z + 2.3, r: 2.2, hold: 2, loud: 18, label: () => ["use_generator"], act: (r) => this.defend(r) });
        }
        if (!run.flags.relay) {
          run.obj("relay", { marker: K.relay });
          run.addUse({ id: "relay", x: K.relay.x, z: K.relay.z, r: 2, hold: 3, loud: 12, label: () => ["use_relay"], act: (r) => {
            r.flags.relay = true; r.objDone("relay"); r.fx({ type: "relayOn" });
            r.say("kessler_relay_up"); r.say("oduya_relay"); r.say("marsh_intro"); r.say("kessler_marsh");
            this.taskDone(r);
          } });
        }
        if (run.flags.power) run.fx({ type: "powerOn", instant: true });
        if (run.flags.relay) run.fx({ type: "relayOn", instant: true });
        break;
      case "survivors":
        done("power"); done("relay");
        run.obj("bunker", { marker: K.bunker });
        run.addUse({ id: "bunker", x: K.bunker.x, z: K.bunker.z + 0.8, r: 2.2, hold: 1, label: () => ["use_bunker"], act: (r) => this.survivors(r) });
        if (!restored) run.say("oduya_bunker", { once: true });
        run.fx({ type: "powerOn", instant: true }); run.fx({ type: "relayOn", instant: true });
        break;
      case "vents": {
        done("bunker");
        run.fx({ type: "powerOn", instant: true }); run.fx({ type: "relayOn", instant: true }); run.fx({ type: "bunkerOpen" });
        this.placeSurvivors(run);
        for (const [n, l] of Object.entries(GROUPS)) if (n.startsWith("pit")) run.spawnGroup(n, l);
        const n = [1, 2, 3].filter((i) => run.flags[`vent${i}`]).length;
        run.obj("vents", { n, markers: [1, 2, 3].filter((i) => !run.flags[`vent${i}`]).map((i) => K[`vent${i}`]) });
        for (const i of [1, 2, 3]) {
          if (run.flags[`vent${i}`]) { run.fx({ type: "ventCharge", vent: i, instant: true }); continue; }
          const m = K[`vent${i}`];
          run.addUse({ id: `vent${i}`, x: m.x, z: m.z, r: 2.8, hold: 3, loud: 26, label: () => ["use_vent"], act: (r) => this.charge(r, i) });
        }
        if (!restored) run.say("kessler_vents", { once: true });
        break;
      }
      case "boss":
        done("vents");
        run.fx({ type: "powerOn", instant: true }); run.fx({ type: "relayOn", instant: true }); run.fx({ type: "bunkerOpen" });
        for (const i of [1, 2, 3]) run.fx({ type: "ventBlown", vent: i, instant: true });
        this.placeSurvivors(run);
        run.obj("warden", { marker: K.pit, boss: true });
        if (restored) this.spawnWarden(run, true);
        break;
      case "extract":
        done("warden");
        run.fx({ type: "powerOn", instant: true }); run.fx({ type: "relayOn", instant: true }); run.fx({ type: "bunkerOpen" });
        for (const i of [1, 2, 3]) run.fx({ type: "ventBlown", vent: i, instant: true });
        run.obj("extract", { marker: K.lz });
        break;
    }
  },

  update(run, dt) {
    const K = run.kit.marks, p = run.player.body;
    const near = (m, r) => Math.hypot(p.x - m.x, p.z - m.z) < r;
    const once = (flag, fn) => { if (!run.flags[flag]) { run.flags[flag] = true; fn(); } };

    // Hints as you go.
    if (run.time > 2) once("h_move", () => run.fx({ type: "hint", key: "hint_move" }));
    if (run.time > 9) once("h_noise", () => run.fx({ type: "hint", key: "hint_noise" }));
    for (const r of run.uses) if (r.weapon && !r.done && near(r, 4)) once("h_carry", () => run.fx({ type: "hint", key: "hint_carry" }));

    switch (run.stage) {
      case "approach":
        if (near(K.rover, 34)) once("rover_seen", () => { if (run.groupAlive("rover")) { run.say("kessler_rover"); run.fx({ type: "hint", key: "hint_crouch" }); } });
        if (run.flags.rover_seen && !run.groupAlive("rover")) once("rover_done", () => { run.say("voss_hearing", { once: true }); run.say("kessler_sneak", { once: true }); run.fx({ type: "hint", key: "hint_cover" }); });
        if (near(K.gate, 10)) { run.say("kessler_gate", { once: true }); this.enter(run, "colony"); run.checkpoint("colony"); }
        break;
      case "tasks":
        if (run.defend) this.defendStep(run, dt);
        break;
      case "survivors": {
        const s = run.bugs.find((b) => b.type === "sentry" && b.alive && b.z < -60);
        if ((s && Math.hypot(s.x - p.x, s.z - p.z) < 42) || p.z < -62) once("sentry_talk", () => { run.say("voss_sentry"); run.say("kessler_sentry"); run.fx({ type: "hint", key: "hint_sentry" }); });
        break;
      }
      case "vents":
        if (run.flags.detonate != null) {
          run.flags.detonate -= dt;
          if (run.flags.detonate <= 0) { delete run.flags.detonate; this.warden(run); }
        }
        break;
      case "extract":
        if (near(K.lz, 9)) once("outro", () => this.outro(run));
        break;
    }
    // A generic "all clear" after a scrap, now and then.
    const hunting = run.bugs.some((b) => b.alive && b.state === "hunt");
    if (hunting) run.flags.fighting = true;
    else if (run.flags.fighting && !run.defend && run.stage !== "boss") { run.flags.fighting = false; run.say("kessler_clear", { gap: 45 }); }
  },

  onEngage(run, b) {
    once(run, "contact", () => { run.say("kessler_contact"); run.fx({ type: "hint", key: "hint_fight" }); });
    if (b.type === "charger") once(run, "seen_charger", () => run.say("kessler_charger"));
    if (b.type === "spitter") once(run, "seen_spitter", () => run.say("kessler_spitter"));
  },
  onKill(run, b, src) {
    once(run, "first_kill", () => { run.say("voss_first"); run.say("kessler_voss"); });
    if (b.type === "sentry" && b.state !== "shriek" && src?.kind === "player" && !run.bugs.some((g) => g.alive && g.state === "hunt")) run.say("kessler_quiet", { gap: 60 });
    if (b.boss) {
      run.objDone("warden");
      run.say("kessler_warden_dead"); run.say("oduya_extract");
      for (const g of run.bugs) if (g.alive && !g.boss) g.search(g.x + (g.x - PIT.x), g.z + (g.z - PIT.z));
      this.enter(run, "extract"); run.checkpoint("extract");
    }
  },
  onSpotted(run) { once(run, "h_dash", () => run.fx({ type: "hint", key: "hint_dash" })); },

  // ── The generator: hold the shed against waves ──
  defend(run) {
    run.say("kessler_gen_start"); run.say("voss_gen");
    run.defend = { t: 45, next: 0, i: 0 };
    run.obj("defend", { s: 45, marker: run.kit.marks.generator });
    run.fx({ type: "genSpin" });
  },
  defendStep(run, dt) {
    const d = run.defend;
    d.t -= dt; d.next -= dt;
    const W = [[["swarmer", 4]], [["swarmer", 5], ["spitter", 1]], [["swarmer", 3], ["charger", 1]], [["swarmer", 6], ["spitter", 2]]];
    if (d.i < W.length && d.next <= 0 && d.t > 4) {
      run.wave(["col1", "col2", "col3", "col4"], W[d.i], { group: "defend" });
      if (d.i === 0) run.say("kessler_gen_wave");
      d.i++; d.next = 10.5;
    }
    run.obj("defend", { s: Math.max(0, Math.ceil(d.t)) });
    // Done when the clock has run out and the last wave is down.
    if (d.t <= 0 && !run.groupAlive("defend")) {
      run.defend = null;
      run.flags.power = true;
      run.objDone("defend"); run.objDone("power");
      run.fx({ type: "powerOn" });
      run.say("kessler_gen_done"); run.say("oduya_gen");
      this.taskDone(run);
    }
  },
  taskDone(run) {
    if (run.flags.power && run.flags.relay) { this.enter(run, "survivors"); run.checkpoint("survivors"); }
    else run.checkpoint("tasks");
  },

  // ── The bunker ──
  survivors(run) {
    const K = run.kit.marks, b = K.bunker, y = b.y;
    run.say("kessler_bunker");
    run.fx({ type: "bunkerOpen" });
    this.placeSurvivors(run);
    // The rangers step inside for the talk.
    const put = (who, x, z) => who.body.place(x, run.space.floor(x, z, y + 0.5) + 0.02, z);
    put(run.player, b.x + 0.9, b.z - 3); put(run.ally, b.x - 0.9, b.z - 3.4);
    run.player.face = run.ally.face = 0;
    run.cutscene("survivors", [
      { dur: 4.2, from: [b.x + 3.4, y + 1.7, b.z - 2.6], look: [b.x - 1, y + 1.3, b.z - 7.6], line: "brandt_1" },
      { dur: 7.5, from: [b.x - 4, y + 1.6, b.z - 4], to: [b.x - 3.6, y + 1.7, b.z - 4.8], look: [b.x + 0.5, y + 1.3, b.z - 8.4], line: "brandt_2" },
      { dur: 2.6, from: [b.x + 1.5, y + 1.6, b.z - 6.8], look: [b.x - 0.9, y + 1.4, b.z - 3.4], line: "kessler_brandt" },
      { dur: 5.8, from: [b.x - 0.5, y + 1.5, b.z - 3.6], look: [b.x - 1, y + 1.4, b.z - 7.6], line: "brandt_3" },
      { dur: 4.8, from: [b.x, y + 9, b.z + 14], to: [b.x + 6, y + 13, b.z + 24], look: [b.x, y + 1, b.z], line: "oduya_vents" },
    ], (r) => { this.enter(r, "vents"); r.checkpoint("vents"); });
  },
  placeSurvivors(run) {
    if (run.npcs.length) return;
    const b = run.kit.marks.bunker;
    run.npcs.push({ model: "survivor", x: b.x - 1, y: b.y, z: b.z - 7.6, yaw: Math.PI, opts: { c: 0xd08a2a } });
    run.npcs.push({ model: "survivor", x: b.x + 2.4, y: b.y, z: b.z - 8.6, yaw: Math.PI + 0.5, opts: { c: 0x4a7ab0, sit: true } });
    run.npcs.push({ model: "survivor", x: b.x - 3.4, y: b.y, z: b.z - 8.2, yaw: Math.PI - 0.4, opts: { c: 0x7a8a4a } });
  },

  // ── The vents ──
  charge(run, i) {
    run.flags[`vent${i}`] = true;
    run.fx({ type: "ventCharge", vent: i });
    const n = [1, 2, 3].filter((k) => run.flags[`vent${k}`]).length;
    const K = run.kit.marks;
    run.obj("vents", { n, markers: [1, 2, 3].filter((k) => !run.flags[`vent${k}`]).map((k) => K[`vent${k}`]) });
    const holes = { 1: ["pit1", "pit3"], 2: ["pit2", "pit4"], 3: ["pit3", "pit4"] }[i];
    run.wave(holes, n === 3 ? [["swarmer", 5], ["spitter", 1]] : [["swarmer", 3 + n], ["spitter", n === 2 ? 1 : 0]].filter(([, c]) => c), { group: `ventwave${i}` });
    if (n === 1) run.say("voss_vent_wave");
    if (n < 3) { run.say("kessler_charge", { gap: 5 }); run.checkpoint("vents"); }
    else { run.say("kessler_charges_done"); run.flags.detonate = 4; }
  },
  warden(run) {
    for (const i of [1, 2, 3]) run.fx({ type: "ventBlown", vent: i });
    run.fx({ type: "quake" });
    // Whatever was still hunting you is swallowed by the blasts' dust.
    this.enter(run, "boss");
    run.checkpoint("boss");
    run.say("voss_warden");
    const y = run.kit.h(PIT.x, PIT.z);
    run.cutscene("warden", [
      { dur: 2.2, from: [PIT.x - 26, y + 14, PIT.z - 22], look: [PIT.x, y + 1, PIT.z], act: (r) => this.spawnWarden(r, false) },
      { dur: 3.6, from: [PIT.x - 15, y + 4, PIT.z - 9], to: [PIT.x - 13, y + 3, PIT.z - 7], look: [PIT.x, y + 2.5, PIT.z], lookTo: [PIT.x, y + 3.5, PIT.z], line: "kessler_warden" },
    ], (r) => { r.say("voss_maw", { once: true }); });
  },
  spawnWarden(run, quick) {
    if (run.boss?.alive) return;
    run.spawn("warden", PIT.x, PIT.z, { emerge: true, arena: { x: PIT.x, z: PIT.z, r: 27 } });
    run.boss.emergeT = quick ? 1.5 : 1.0;
  },

  // ── The intro and the end ──
  intro(run) {
    const L = run.kit.marks.lz;
    run.dropship = { path: [[24, 55, 190], [4, 20, 148], [0, 5.5, 125], [0, 0.4, 125]], t0: run.time, dur: 9, yaw: 0 };
    run.ally.holdFire = true;
    run.cutscene("intro", [
      { dur: 5.5, from: [-30, 20, 98], to: [-22, 15, 104], look: [4, 16, 150], lookTo: [0, 4, 124], line: "oduya_intro1" },
      { dur: 4.4, from: [-18, 5, 140], to: [-14, 4, 136], look: [0, 3, 124], lookTo: [0, 2, 122], line: "oduya_intro2" },
      { dur: 3.4, from: [4.2, 2.3, 121], to: [3.2, 2.1, 119.5], look: [0, 1.4, 108], line: "kessler_intro1" },
    ], (r) => {
      r.ally.holdFire = false;
      r.dropship = { path: [[0, 0.4, 125], [0, 8, 128], [-30, 40, 170], [-80, 90, 260]], t0: r.time, dur: 10, yaw: 0, leaving: true };
      r.say("kessler_intro2"); r.say("kessler_road");
      r.fx({ type: "hint", key: "hint_move" }); r.flags.h_move = true;
    });
    void L;
  },
  outro(run) {
    run.dropship = { path: [[-60, 70, 220], [-10, 20, 150], [0, 5.5, 126], [0, 0.4, 126]], t0: run.time, dur: 8, yaw: 0 };
    run.cutscene("outro", [
      { dur: 6.5, from: [22, 6, 136], to: [18, 7, 140], look: [0, 3, 124], line: "marsh_outro" },
      { dur: 2.6, from: [3, 2.2, 116], look: [0, 1.6, 122], line: "kessler_outro" },
      { dur: 4.6, from: [10, 3, 130], to: [14, 9, 140], look: [0, 2, 124], line: "oduya_outro1" },
      { dur: 4.2, from: [0, 30, 160], to: [0, 60, 190], look: [0, 0, 120], line: "oduya_outro2" },
    ], (r) => r.win());
  },
};

function once(run, flag, fn) { if (!run.flags[flag]) { run.flags[flag] = true; fn(); } }

// A weapon rack: take the gun (it swaps with the one in your hands).
function rack(run, id, x, z) {
  if (run.flags[`took_${id}`]) return;
  run.addUse({ id: `rack_${id}`, x, z, r: 1.8, weapon: id, model: "rackGun",
    label: (r) => (r.player.slots.some((g) => g.id === id) ? ["use_ammo"] : [r.player.slots.length < 2 ? "use_take" : "use_swap", { w: `w_${id}` }]),
    act: (r, u) => { r.flags[`took_${id}`] = true; takeWeapon(r, id, null, u); if (id === "launcher") r.say("kessler_launcher", { once: true }); if (id === "laser") r.say("kessler_laser", { once: true }); } });
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
    // Already carrying one: take its ammo.
    have.reserve = have.reserve === Infinity ? Infinity : have.reserve + (state ? state.mag + state.reserve : W.mag + W.reserve);
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
  void u;
}

function ammo(run, x, z) {
  const id = `ammo_${Math.round(x)}_${Math.round(z)}`;
  if (run.flags[id]) return;
  run.addUse({ id, x, z, r: 1.7, model: "ammoBox", label: () => ["use_ammo"], act: (r) => {
    r.flags[id] = true;
    for (const g of r.player.slots) { const W = WEAPONS[g.id]; if (g.reserve !== Infinity && W.reserve) g.reserve = Math.min(W.reserve * 1.5, g.reserve + W.reserve * 0.6); }
    r.fx({ type: "ammo" }); r.say("kessler_ammo", { gap: 90 });
  } });
}
