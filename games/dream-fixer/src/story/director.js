import { hasLine } from "../i18n/index.js";

// ── Story beats ──────────────────────────────────────────────────────────
// Watches a Run (its events and state) and queues the radio lines at the
// right moments. One director per level; a line is said once per visit.
// Lines are spread out: the intro comes in pieces as you start to move,
// and a glitch is introduced when you first meet it, only after a quiet
// spell (S.quiet: seconds since the radio last fell silent). Warnings and
// story events still come at once.

const near = (run, kind, d) => run.foes.some((f) => f.alive && f.kind === kind && Math.hypot(f.px - run.body.x, f.pz - run.body.z) < d);
const from = (run, x, z) => Math.hypot(run.body.x - x, run.body.z - z);

// A random line from a pool (ids prefix_1 … prefix_n, as many as are
// written) not yet said this visit; null when they have all been used.
function pick(D, prefix) {
  const left = [];
  for (let i = 1; hasLine(`${prefix}_${i}`); i++) if (!D.said.has(`${prefix}_${i}`)) left.push(`${prefix}_${i}`);
  return left.length ? left[Math.floor(Math.random() * left.length)] : null;
}
const sayOne = (D, prefix) => { const id = pick(D, prefix); if (id) D.say(id); return !!id; };
// A line only if the dream has one written for that beat.
const sayIf = (D, id, again) => { if (hasLine(id)) D.say(id, again); };

// ── What every dream's radio does ──
// The same beats in every dream, each in that dream's own lines (ids
// `<dream>_<beat>`): the intro in two pieces, tuning, each anchor fixed,
// memories, fainting, hearts, falls, a crowd, a long quiet, leaving the
// ring. A dream adds:
//   meet   [kind, metres, beat]: a glitch introduced the first time you
//          come that close to one (one at a time, after a quiet spell)
//   on     { "event" or "event:kind": beat } for its own events (the boss…)
//   events (D, run, e, S) and frame (D, run, dt, S, q) for anything more
//          particular.
function dreamDirector(dream, o = {}) {
  const L = (beat) => `${dream}_${beat}`;
  return {
    start(D) { sayIf(D, L("in1")); },
    events(D, run, e, S) {
      if (e.type === "tuneStart") sayIf(D, L("tune"));
      if (e.type === "anchorFixed") sayIf(D, L(e.left ? `fix${run.anchors.length - e.left}` : "all"));
      if (e.type === "memory") sayIf(D, L("memory"));
      if (e.type === "faint") sayIf(D, L("faint"));
      if (e.type === "heal") sayIf(D, L("heart"));
      if (e.type === "bossReset") sayIf(D, L("retry"), true);
      // Falling off now and then: a dig from Margo (on the 2nd, 4th, 7th…).
      if (e.type === "respawn" && !e.pulled) {
        S.falls = (S.falls || 0) + 1;
        if ([2, 4, 7, 11].includes(S.falls)) sayOne(D, L("fall"));
      }
      const beat = o.on?.[`${e.type}:${e.kind ?? e.attack}`] ?? o.on?.[e.type];
      if (beat) sayIf(D, L(beat));
      o.events?.(D, run, e, S);
    },
    frame(D, run, dt, S) {
      const q = (s) => S.quiet > s, sp = run.kit.spawn;
      // The intro, a piece at a time: what is wrong here once you take a
      // look round, where the anchors are once you set off.
      if (!D.said.has(L("in2")) && q(3) && (from(run, sp.x, sp.z) > 5 || S.time > 10)) sayIf(D, L("in2"));

      // Each glitch the first time you meet it (one at a time).
      if (q(2.5)) {
        const m = o.meet?.find(([kind, d, beat]) => !D.said.has(L(beat)) && near(run, kind, d));
        if (m) sayIf(D, L(m[2]));
      }
      if (run.nearAnchor && q(1)) sayIf(D, L("anchor"));
      // Where the nightmare waits, once the anchors hold (and you have not gone in yet).
      if (run.coreOpen && !run.boss && D.said.has(L("all")) && q(1.5)) sayIf(D, L("core"));
      // In between: a quip when a crowd is after you, a warning when you
      // are fading, a bit of chatter after a long quiet.
      S.cool = Math.max(0, (S.cool || 0) - dt);
      if (S.cool <= 0 && !run.boss) {
        const chasing = run.foes.filter((f) => f.alive && (f.aware || f.group) && Math.hypot(f.px - run.body.x, f.pz - run.body.z) < 12).length;
        if (run.hp < run.maxHp * 0.3 && q(3) && sayOne(D, L("low"))) S.cool = 30;
        else if (chasing >= 4 && q(20) && sayOne(D, L("swarm"))) S.cool = 40;
        else if (q(55) && !run.tuning && sayOne(D, L("idle"))) S.cool = 30;
      }
      const tu = run.tuning;
      S.outT = tu && !tu.inside ? (S.outT || 0) + dt : 0;
      if (S.outT > 1.5 && (S.ringT || 0) <= 0) { sayIf(D, L("ring"), true); S.ringT = 14; }
      S.ringT = (S.ringT || 0) - dt;
      o.frame?.(D, run, dt, S, q);
    },
  };
}

const DIRECTORS = {
  park: dreamDirector("park", {
    meet: [["bunny", 12, "bunny"], ["fuzz", 14, "foe"], ["tub", 18, "tub"], ["buzzer", 16, "buzzer"]],
    on: { "spawn:knot": "knot", nut: "nut", bossRise: "boss", "bossAttack:suck": "suck", bossClog: "clog", bossPhase: "phase", bossPop: "win" },
    events(D, run, e) {
      // Two down: where the last one is, if it is the island.
      if (e.type === "anchorFixed" && e.left === 1 && run.anchors.find((a) => a.id === "island")?.state !== "fixed") D.say("park_island");
    },
  }),
  school: dreamDirector("school", {
    meet: [["pencil", 12, "pencil"], ["clock", 16, "clock"], ["backpack", 16, "backpack"]],
    // Under the library gallery: Cog says it is too high, or (with the
    // Foam Cannon) how to get up.
    frame(D, run, dt, S, q) {
      const b = run.body, under = b.x > 33.5 && b.x < 38 && Math.abs(b.z) < 10 && b.y < 1;
      if (!under || !q(1.5)) return;
      D.say(run.tools.some((t) => t.id === "foam") ? "school_climb" : "school_high");
    },
    on: { "spawn:sharpener": "sharpener", dizzy: "dizzy", slowed: "slowed", bossRise: "boss", "bossAttack:strike": "strike", penBlot: "blot", bossPhase: "phase", bossPop: "win" },
  }),
  kitchen: dreamDirector("kitchen", {
    meet: [["meatball", 12, "meatball"], ["pepper", 16, "pepper"], ["rollingpin", 16, "rollingpin"]],
    // By the pantry door or under the counter: Cog says what is in the
    // way, or (with the Lullaby Bell) what to do about it.
    frame(D, run, dt, S, q) {
      if (!q(1.5)) return;
      const b = run.body, bell = run.tools.some((t) => t.id === "bell"), on = (id) => run.ringables.find((g) => g.id === id);
      if (b.y < 1 && !on("door")?.flat && Math.abs(b.x + 12.5) < 3 && Math.abs(b.z + 4.8) < 3.5) D.say(bell ? "kitchen_flatten" : "kitchen_puffy");
      else if ((b.y < 1 && Math.hypot(b.x + 13, b.z + 16.4) < 4.5) || run.ringables.some((g) => g.under && !(g.wobbleT > 0))) D.say(bell ? "kitchen_bounce" : "kitchen_wobbly");
    },
    on: { "spawn:grinder": "grinder", meatSplit: "split", sneeze: "sneeze", dizzy: "dizzy", bossRise: "boss", cookerWhistle: "whistle", cookerLid: "lid", bossPhase: "phase", bossPop: "win" },
  }),
  factory: {
    start(D, run, P) {
      // First time in: the welcome. Back from a dream: how it went. Any
      // other time: one of a handful of greetings, at random.
      if (P.justBack) D.say("hub_back1");
      else if (!P.log.includes("hub_intro1")) { D.say("hub_intro1"); D.say("hub_intro2"); }
      else sayOne(D, "hub_greet");
    },
    events() {},
    frame(D, run, dt, S) {
      const q = (s) => S.quiet > s;
      if (D.said.has("hub_intro2") && q(4)) D.say("hub_intro3");
      if (D.said.has("hub_back1") && q(3)) D.say("hub_back2");
      // The journal when you wander over to it (or a while later).
      // The journal: once ever, when you wander over to it (or a while later).
      // A new client calls once the last dream is done (not straight after it: that night is over).
      if (S.P?.done.includes("park") && !S.P.done.includes("school") && !S.P.log.includes("hub_newjob") && !D.said.has("hub_back1") && q(3)) D.say("hub_newjob");
      if (S.P?.done.includes("school") && !S.P.done.includes("kitchen") && !S.P.log.includes("hub_newjob2") && !D.said.has("hub_back1") && q(3)) D.say("hub_newjob2");
      if (!S.P?.log.includes("hub_journal") && (from(run, -8.7, -4.2) < 3.5 || (S.time > 40 && (D.said.has("hub_intro3") || D.said.has("hub_back2")))) && q(2)) D.say("hub_journal");
    },
  },
};

export class Director {
  constructor(dialog) { this.dialog = dialog; this.d = null; this.state = {}; }
  begin(run, progress) {
    // A dream without its own director still gets the common beats.
    this.d = DIRECTORS[run.def.id] ?? (run.def.hub ? null : dreamDirector(run.def.id));
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
