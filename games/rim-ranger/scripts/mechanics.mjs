// Checks the core mechanics headless, one small scene each:
// cover, sneaking past bugs, a sentry's eye, Kessler holding fire, being
// downed and revived, falling back to a checkpoint.
// node scripts/mechanics.mjs
import { launch, URL } from "./browser.mjs";
const b = await launch();
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__rimRanger, null, { timeout: 60000 });
const res = await p.evaluate(() => {
  const D = window.__rimRanger, out = {};
  const I0 = () => ({ forward: 0, strafe: 0, yaw: D.input.yaw, pitch: D.input.pitch });
  const run = () => D.run;
  const steps = (n, I = {}) => { for (let i = 0; i < n; i++) run().step({ ...I0(), ...I }); };

  // Cover: next to the barrier at (-6, 2), facing it.
  D.stage("tasks"); D.skipCut();
  D.place(-6, 3.2, 0, -0.1);
  steps(1, { coverPressed: true }); steps(20);
  const c = run().player.cover;
  out.cover = c ? { low: c.low, n: [c.nx.toFixed(2), c.nz.toFixed(2)] } : null;
  const x0 = run().player.body.x;
  steps(60, { strafe: 1 });
  out.coverSlide = +(run().player.body.x - x0).toFixed(2);
  out.stillInCover = !!run().player.cover;
  steps(5, { aim: true });
  out.popUpHeight = +run().player.body.h.toFixed(2);
  steps(1, { coverPressed: true }); steps(2);
  out.leftCover = !run().player.cover;

  // Sneaking: walk past the rover pack at 6 m, crouched, then upright.
  const sneak = (crouch) => {
    D.stage("approach"); D.skipCut();
    for (const g of run().bugs) if (g.tag !== "keep" && Math.hypot(g.x - 8, g.z - 82) > 10) g.alive = false;
    D.place(0.5, 92, Math.PI / 2, -0.1);
    if (crouch) steps(1, { crouchPressed: true });
    let most = 0;
    for (let i = 0; i < 300; i++) { steps(1, { strafe: 1 }); most = Math.max(most, run().bugs.filter((g) => g.alive && g.state === "hunt").length); }
    return most;
  };
  out.huntedCrouching = sneak(true);
  out.huntedWalking = sneak(false);

  // A sentry: stand in its view, upright then crouched behind a rock.
  D.stage("survivors"); D.skipCut();
  const s = run().bugs.find((g) => g.type === "sentry" && g.z < -60);
  for (const g of run().bugs) if (g !== s) g.alive = false;
  const fx = -Math.sin(s.face), fz = -Math.cos(s.face);
  // A spot it can see: in front, with a clear line from its eye.
  let spot = null;
  for (let d = 10; d < 24 && !spot; d += 2) for (const side of [0, -3, 3, -6, 6]) {
    const x = s.x + fx * d - fz * side, z = s.z + fz * d + fx * side, y = run().space.floor(x, z, run().space.terrain.height(x, z) + 0.6);
    if (run().space.clear(s.x, s.y + 1.6, s.z, x, y + 1.4, z)) { spot = [x, z]; break; }
  }
  const look = (crouch) => {
    D.stage("survivors"); D.skipCut();
    const s2 = run().bugs.find((g) => g.type === "sentry" && Math.hypot(g.x - s.x, g.z - s.z) < 1);
    for (const g of run().bugs) if (g !== s2) g.alive = false;
    s2.face = s.face;
    D.place(spot[0], spot[1], 0, -0.1);
    run().ally.holdFire = true;
    run().ally.body.place(spot[0] + 1, run().player.body.y, spot[1] + 1);
    if (crouch) steps(1, { crouchPressed: true });
    let at = -1;
    for (let i = 0; i < 900 && at < 0; i++) { steps(1); if (s2.state === "shriek") at = i; }
    return at;
  };
  out.sentrySpot = spot && spot.map((v) => +v.toFixed(1));
  out.sentryShriekUpright = spot ? look(false) : null;
  out.sentryShriekCrouched = spot ? look(true) : null;

  // Kessler holds fire while nobody fights.
  D.stage("approach"); D.skipCut();
  D.place(0, 96, Math.PI, -0.1);
  steps(240);
  out.kesslerFiredUnprovoked = run().stats.kills > 0 || run().ally.firing;

  // Down and revived.
  D.stage("tasks"); D.skipCut();
  for (const g of run().bugs) g.alive = false;
  D.place(0, 20, 0, -0.1);
  run().player.hurt(run(), 999, 0, 10);
  out.downed = run().player.downed;
  steps(600);
  out.revived = !run().player.downed && run().player.hp > 0;

  // Bleeding out alone: the run fails.
  D.stage("tasks"); D.skipCut();
  for (const g of run().bugs) g.alive = false;
  D.place(0, 20, 0, -0.1);
  run().ally.hurt(run(), 999, 0, 0); run().ally.downT = 999;
  run().player.hurt(run(), 999, 0, 10);
  steps(60 * 24);
  out.failed = run().over;
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log(errors.slice(0, 5).join("\n"));
await b.close();
