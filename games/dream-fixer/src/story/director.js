// ── Story beats ──────────────────────────────────────────────────────────
// Watches a Run (its events and state) and queues the radio lines at the
// right moments. One director per level; a line is said once per visit.
// Lines are spread out: the intro comes in pieces as you start to move,
// and a glitch is introduced when you first meet it, only after a quiet
// spell (S.quiet: seconds since the radio last fell silent). Warnings and
// story events still come at once.

const near = (run, kind, d) => run.foes.some((f) => f.alive && f.kind === kind && Math.hypot(f.px - run.body.x, f.pz - run.body.z) < d);
const from = (run, x, z) => Math.hypot(run.body.x - x, run.body.z - z);

// A random line from a pool (ids prefix_1 … prefix_n) not yet said this
// visit; null when they have all been used.
function pick(D, prefix, n) {
  const left = Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`).filter((id) => !D.said.has(id));
  return left.length ? left[Math.floor(Math.random() * left.length)] : null;
}
const sayOne = (D, prefix, n) => { const id = pick(D, prefix, n); if (id) D.say(id); return !!id; };

const DIRECTORS = {
  park: {
    start(D) { D.say("park_in1"); },
    events(D, run, e, S) {
      if (e.type === "tuneStart") D.say("park_tune");
      if (e.type === "anchorFixed") {
        if (e.left === 2) D.say("park_fix1");
        else if (e.left === 1) { D.say("park_fix2"); if (run.anchors.find((a) => a.id === "island")?.state !== "fixed") D.say("park_island"); }
        else D.say("park_all");
      }
      if (e.type === "spawn" && e.kind === "knot") D.say("park_knot");
      if (e.type === "memory") D.say("park_memory");
      if (e.type === "nut") D.say("park_nut");
      if (e.type === "bossRise") D.say("park_boss");
      if (e.type === "bossAttack" && e.attack === "suck") D.say("park_suck");
      if (e.type === "bossClog") D.say("park_clog");
      if (e.type === "bossPhase") D.say("park_phase");
      if (e.type === "faint") D.say("park_faint");
      if (e.type === "heal") D.say("park_heart");
      // Falling off now and then: a dig from Margo (on the 2nd, 4th, 7th…).
      if (e.type === "respawn") {
        S.falls = (S.falls || 0) + 1;
        if ([2, 4, 7, 11].includes(S.falls)) sayOne(D, "park_fall", 4);
      }
      if (e.type === "bossPop") D.say("park_win");
    },
    frame(D, run, dt, S) {
      const q = (s) => S.quiet > s, sp = run.kit.spawn;
      // The intro, a piece at a time: what is wrong here once you take a
      // look round, where the anchors are once you set off.
      if (!D.said.has("park_in2") && q(3) && (from(run, sp.x, sp.z) > 5 || S.time > 10)) D.say("park_in2");

      // Each glitch the first time you meet it (one at a time).
      if (q(2.5)) {
        if (near(run, "bunny", 12)) D.say("park_bunny");
        else if (near(run, "fuzz", 14)) D.say("park_foe");
        else if (near(run, "tub", 18)) D.say("park_tub");
        else if (near(run, "buzzer", 16)) D.say("park_buzzer");
      }
      if (run.nearAnchor && q(1)) D.say("park_anchor");
      // In between: a quip when a crowd is after you, a warning when you
      // are fading, a bit of chatter after a long quiet.
      S.cool = Math.max(0, (S.cool || 0) - dt);
      if (S.cool <= 0 && !run.boss) {
        const chasing = run.foes.filter((f) => f.alive && (f.aware || f.group) && Math.hypot(f.px - run.body.x, f.pz - run.body.z) < 12).length;
        if (run.hp < run.maxHp * 0.3 && q(3) && sayOne(D, "park_low", 2)) S.cool = 30;
        else if (chasing >= 4 && q(20) && sayOne(D, "park_swarm", 3)) S.cool = 40;
        else if (q(55) && !run.tuning && sayOne(D, "park_idle", 4)) S.cool = 30;
      }
      const tu = run.tuning;
      S.outT = tu && !tu.inside ? (S.outT || 0) + dt : 0;
      if (S.outT > 1.5 && (S.ringT || 0) <= 0) { D.say("park_ring", true); S.ringT = 14; }
      S.ringT = (S.ringT || 0) - dt;
    },
  },
  factory: {
    start(D, run, P) {
      // First time in: the welcome. Back from a dream: how it went. Any
      // other time: one of a handful of greetings, at random.
      if (P.justBack) D.say("hub_back1");
      else if (!P.log.includes("hub_intro1")) { D.say("hub_intro1"); D.say("hub_intro2"); }
      else sayOne(D, "hub_greet", 6);
    },
    events() {},
    frame(D, run, dt, S) {
      const q = (s) => S.quiet > s;
      if (D.said.has("hub_intro2") && q(4)) D.say("hub_intro3");
      if (D.said.has("hub_back1") && q(3)) D.say("hub_back2");
      // The journal when you wander over to it (or a while later).
      // The journal: once ever, when you wander over to it (or a while later).
      if (!S.P?.log.includes("hub_journal") && (from(run, -8.7, -4.2) < 3.5 || (S.time > 40 && (D.said.has("hub_intro3") || D.said.has("hub_back2")))) && q(2)) D.say("hub_journal");
    },
  },
};

export class Director {
  constructor(dialog) { this.dialog = dialog; this.d = null; this.state = {}; }
  begin(run, progress) {
    this.d = DIRECTORS[run.def.id] ?? null;
    this.state = { P: progress };
    this.dialog.reset();
    this.d?.start(this.dialog, run, progress);
  }
  events(run, events) { if (this.d) for (const e of events) this.d.events(this.dialog, run, e, this.state); }
  frame(run, dt) {
    const S = this.state;
    S.time = (S.time || 0) + dt;
    S.quiet = this.dialog.busy ? 0 : (S.quiet || 0) + dt;
    this.d?.frame(this.dialog, run, dt, S);
  }
}
