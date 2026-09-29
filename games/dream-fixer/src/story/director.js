// ── Story beats ──────────────────────────────────────────────────────────
// Watches a Run (its events and state) and queues the radio lines at the
// right moments. One director per level; a line is said once per visit.

const near = (run, kind, d) => run.foes.some((f) => f.alive && f.kind === kind && Math.hypot(f.px - run.body.x, f.pz - run.body.z) < d);

const DIRECTORS = {
  park: {
    start(D) { D.say("park_in1"); D.say("park_in2"); },
    events(D, run, e) {
      if (e.type === "tuneStart") D.say("park_tune");
      if (e.type === "anchorFixed") {
        if (e.left === 2) D.say("park_fix1");
        else if (e.left === 1) { D.say("park_fix2"); if (run.anchors.find((a) => a.id === "island")?.state !== "fixed") D.say("park_island"); }
        else D.say("park_all");
      }
      if (e.type === "spawn" && e.kind === "knot") D.say("park_knot");
      if (e.type === "memory") D.say("park_memory");
      if (e.type === "bossRise") D.say("park_boss");
      if (e.type === "bossAttack" && e.attack === "suck") D.say("park_suck");
      if (e.type === "bossClog") D.say("park_clog");
      if (e.type === "bossPhase") D.say("park_phase");
      if (e.type === "faint") D.say("park_faint");
      if (e.type === "bossPop") D.say("park_win");
    },
    frame(D, run, dt, S) {
      if (near(run, "fuzz", 14)) D.say("park_foe");
      if (near(run, "buzzer", 16)) D.say("park_buzzer");
      if (run.nearAnchor) D.say("park_anchor");
      const tu = run.tuning;
      S.outT = tu && !tu.inside ? (S.outT || 0) + dt : 0;
      if (S.outT > 1.5 && (S.ringT || 0) <= 0) { D.say("park_ring", true); S.ringT = 14; }
      S.ringT = (S.ringT || 0) - dt;
    },
  },
  factory: {
    start(D, run, P) {
      if (!P.done.includes("park")) { D.say("hub_intro1"); D.say("hub_intro2"); D.say("hub_intro3"); }
      else if (P.justBack) { D.say("hub_back1"); D.say("hub_back2"); }
    },
    events() {},
    frame() {},
  },
};

export class Director {
  constructor(dialog) { this.dialog = dialog; this.d = null; this.state = {}; }
  begin(run, progress) {
    this.d = DIRECTORS[run.def.id] ?? null;
    this.state = {};
    this.dialog.reset();
    this.d?.start(this.dialog, run, progress);
  }
  events(run, events) { if (this.d) for (const e of events) this.d.events(this.dialog, run, e); }
  frame(run, dt) { this.d?.frame(this.dialog, run, dt, this.state); }
}
