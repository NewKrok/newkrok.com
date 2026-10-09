// Plays the whole mission headless, fast: teleports to each objective,
// holds "use", lets the fights happen (the ranger cannot be hurt) and
// shoots what hunts it. Reports the stage reached, errors and timings.
// node scripts/flow.mjs [shot-prefix]
import { launch, URL } from "./browser.mjs";
const shots = process.argv[2];
const b = await launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message + "\n" + e.stack));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__rimRanger, null, { timeout: 60000 });
const step = (fn, arg) => p.evaluate(fn, arg);
await step(() => { const D = window.__rimRanger; D.play(null); });
let n = 0;
const shot = async (name) => { if (shots) { await p.waitForTimeout(600); await p.screenshot({ path: `${shots}-${String(n++).padStart(2, "0")}-${name}.png` }); } };
await shot("intro");
// Fight bot: aim at the nearest hunting bug and fire, a number of steps.
const play = (steps, goal, stay) => step(([steps, goal, stay]) => {
  const D = window.__rimRanger, run = D.run;
  const out = { stage: run.stage, msgs: [] };
  for (let i = 0; i < steps; i++) {
    if (run.cut) { D.skipCut(); continue; }
    if (run.over) break;
    const pl = run.player, b0 = pl.body;
    if (stay && Math.hypot(b0.x - stay[0], b0.z - stay[1]) > 0.6) D.place(stay[0], stay[1], D.input.yaw, D.input.pitch);
    let tgt = null, best = 1e9;
    for (const g of run.bugs) { if (!g.alive || g.hidden) continue; const d = Math.hypot(g.x - b0.x, g.z - b0.z); if (d < 40 && (g.state === "hunt" || g.boss) && d < best) { best = d; tgt = g; } }
    const I = { forward: 0, strafe: 0, yaw: D.input.yaw, pitch: D.input.pitch, use: true };
    if (tgt) {
      const s = tgt.spheres(); let k = 0; for (let j = 0; j < s.length; j += 5) if (s[j + 4] !== "plate") { k = j; if (s[j + 4] !== "body") break; }
      const cx = pl.cam.x ?? b0.x, cy = pl.cam.y ?? b0.y + 1.5, cz = pl.cam.z ?? b0.z;
      const dx = s[k] - cx, dy = s[k + 1] - cy, dz = s[k + 2] - cz;
      D.input.setView(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
      I.yaw = D.input.yaw; I.pitch = D.input.pitch; I.fire = true; I.aim = true; I.firePressed = i % 10 === 0;
      if (pl.weapon && pl.weapon.mag === 0 && pl.weapon.reserve === 0 && pl.slots.length > 1) I.swapPressed = true;
    } else if (goal) {
      const dx = goal[0] - b0.x, dz = goal[1] - b0.z;
      if (Math.hypot(dx, dz) > 1.2) { D.input.setView(Math.atan2(-dx, -dz), -0.1); I.yaw = D.input.yaw; I.forward = 1; I.sprint = true; }
    }
    run.step(I);
    for (const e of run.drain()) if (["objDone", "checkpoint", "failed", "won", "cutStart"].includes(e.type)) out.msgs.push(e.type + (e.id ? ":" + e.id : ""));
  }
  out.stage2 = run.stage; out.bugs = run.bugs.filter((g) => g.alive).length; out.hunting = run.bugs.filter((g) => g.alive && g.state === "hunt").length;
  out.pos = [Math.round(run.player.body.x), Math.round(run.player.body.z)]; out.over = run.over;
  out.objs = run.objectives.filter((o) => !o.done).map((o) => o.id);
  return out;
}, [steps, goal, stay]);
const tp = (x, z) => { at = [x, z]; return step(([x, z]) => { const D = window.__rimRanger; D.place(x, z, 0, -0.1); D.god(true); }, [x, z]); };
let at = null;
const log = (s, r) => console.log(s.padEnd(14), JSON.stringify(r));
const M = await step(() => window.__rimRanger.run.kit.marks);
const t0 = Date.now();
log("intro", await play(30));
await step(() => window.__rimRanger.god(true));
log("road", await play(900, [0, 60]));
await shot("road");
log("gate", await play(400, [M.gate.x, M.gate.z - 2]));
await tp(M.terminal.x, M.terminal.z + 1.2);
log("terminal", await play(200, null, at));
await shot("ops");
await tp(M.generator.x, M.generator.z + 2.6);
log("generator", await play(200, null, at));
await shot("defend");
log("defend", await play(3600));
await tp(M.relay.x, M.relay.z + 1);
log("relay", await play(600, null, at));
await shot("relay");
await tp(-5, -60);
log("canyon", await play(300, [M.bunker.x, M.bunker.z + 4]));
await shot("canyon");
await tp(M.bunker.x, M.bunker.z + 1.4);
log("bunker", await play(400, null, at));
await shot("bunker");
for (const i of [1, 2, 3]) { const v = M[`vent${i}`]; await tp(v.x + 1.5, v.z + 1.5); log(`vent${i}`, await play(800, null, at)); await shot(`vent${i}`); }
log("detonate", await play(600));
await shot("warden");
log("boss", await play(6000));
await shot("bossfight");
log("boss2", await play(6000));
await tp(M.lz.x, M.lz.z - 4);
log("extract", await play(1500));
await shot("end");
console.log("wall time", ((Date.now() - t0) / 1000).toFixed(1), "s");
console.log(logs.slice(0, 20).join("\n"));
await b.close();
