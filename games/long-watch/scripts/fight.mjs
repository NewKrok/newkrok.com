// Fights through the early mission headless without god mode, to measure
// how hard the scraps are: the rover pack, the colony, the generator
// waves. The bot aims at the nearest hunting bug, fires, reloads, backs
// off from anything in biting range and swaps to the pistol when the
// rifle runs dry. Reports kills, hits taken, times downed, lowest hp and
// ammo left per scrap.
// node scripts/fight.mjs [seed]
import { launch, URL } from "./browser.mjs";
const seed = Number(process.argv[2] ?? 1);
const b = await launch();
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__longWatch, null, { timeout: 60000 });
const res = await p.evaluate((seed) => {
  const D = window.__longWatch;
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const nearAmmo = (run, b0) => { let best = null, bd = 22; for (const u of run.uses) { if (u.model !== "ammoBox" || u.done) continue; const d = Math.hypot(u.x - b0.x, u.z - b0.z); if (d < bd) { bd = d; best = u; } } return best; };
  const fight = (name, steps, goal, stay) => {
    const run = D.run, pl = run.player;
    const out = { name, kills0: run.stats.kills, downs: 0, lowHp: 999, hits: 0, hunting0: 0 };
    let lastHp = pl.hp + pl.shield, wasDown = false, back = 0;
    for (let i = 0; i < steps; i++) {
      if (run.cut) { D.skipCut(); continue; }
      if (run.over) { out.over = run.over; break; }
      const b0 = pl.body;
      const I = { forward: 0, strafe: 0, yaw: D.input.yaw, pitch: D.input.pitch, use: true };
      let tgt = null, best = 1e9, nearest = 1e9;
      for (const g of run.bugs) {
        if (!g.alive || g.hidden) continue;
        const d = Math.hypot(g.x - b0.x, g.z - b0.z);
        if (g.state === "hunt" || g.boss) { nearest = Math.min(nearest, d); if (d < 45 && d < best) { best = d; tgt = g; } }
      }
      if (tgt && !pl.downed) {
        const sp = tgt.spheres(); let k = 0; for (let j = 0; j < sp.length; j += 5) if (sp[j + 4] !== "plate") { k = j; if (sp[j + 4] === "body") break; }
        const cx = pl.cam.x ?? b0.x, cy = pl.cam.y ?? b0.y + 1.5, cz = pl.cam.z ?? b0.z;
        const dx = sp[k] - cx, dy = sp[k + 1] - cy, dz = sp[k + 2] - cz;
        // A human aim: a little slow and a little off.
        const yaw = Math.atan2(-dx, -dz) + (rnd() - 0.5) * 0.03, pitch = Math.atan2(dy, Math.hypot(dx, dz)) + (rnd() - 0.5) * 0.02;
        D.input.setView(yaw, pitch);
        I.yaw = D.input.yaw; I.pitch = D.input.pitch; I.aim = true; I.fire = i % 3 !== 0; I.firePressed = i % 8 === 0;
        const w = pl.weapon;
        if (w && w.mag === 0) { if (w.reserve > 0) I.reloadPressed = true; else if (pl.slots.length > 1 && pl.cur === 0) I.swapPressed = true; }
        // Back away from the ones about to bite; dash when one is on top of you.
        if (nearest < 3.5) { I.forward = -1; I.aim = false; back++; if (nearest < 1.6 && i % 40 === 0) I.dashPressed = true; }
        else if (back > 0 && nearest > 6) back = 0;
      } else if (!pl.downed && pl.slots[0] && pl.slots[0].reserve < 120 && nearAmmo(run, b0)) {
        // Low on rifle ammo and nothing hunting: fetch the nearest box.
        const u = nearAmmo(run, b0), dx = u.x - b0.x, dz = u.z - b0.z;
        if (Math.hypot(dx, dz) > 1.0) { D.input.setView(Math.atan2(-dx, -dz), -0.1); I.yaw = D.input.yaw; I.forward = 1; }
      } else if (goal && !pl.downed) {
        const dx = goal[0] - b0.x, dz = goal[1] - b0.z;
        if (Math.hypot(dx, dz) > 1.2) { D.input.setView(Math.atan2(-dx, -dz), -0.1); I.yaw = D.input.yaw; I.forward = 1; }
      }
      if (stay && !tgt && Math.hypot(b0.x - stay[0], b0.z - stay[1]) > 1) { const dx = stay[0] - b0.x, dz = stay[1] - b0.z; D.input.setView(Math.atan2(-dx, -dz), -0.1); I.yaw = D.input.yaw; I.forward = 1; }
      run.step(I);
      for (const e of run.drain()) if (["objDone", "checkpoint", "failed", "won"].includes(e.type)) (out.msgs ??= []).push(e.type + (e.id ? ":" + e.id : ""));
      const hp = pl.hp + pl.shield;
      if (hp < lastHp) out.hits++;
      lastHp = hp;
      out.lowHp = Math.min(out.lowHp, pl.hp);
      if (pl.downed && !wasDown) out.downs++;
      wasDown = pl.downed;
    }
    out.kills = run.stats.kills - out.kills0; delete out.kills0;
    out.hp = Math.round(pl.hp); out.shield = Math.round(pl.shield);
    out.ammo = pl.slots.map((g) => `${g.id}:${g.mag}/${g.reserve === Infinity ? "inf" : g.reserve}`).join(" ");
    out.alive = run.bugs.filter((g) => g.alive && !g.hidden).length;
    out.hunting = run.bugs.filter((g) => g.alive && g.state === "hunt").length;
    return out;
  };
  const R = [];
  D.play(null); D.skipCut();
  const run = D.run;
  // The rover pack: walk straight at it.
  R.push(fight("rover", 1500, [8, 82]));
  // The colony south: on to the gate and the terminal.
  R.push(fight("colonyS", 1500, [0, 30]));
  R.push(fight("toTerminal", 1500, [run.kit.marks.terminal.x, run.kit.marks.terminal.z + 1.2]));
  // The generator: hold it.
  D.place(run.kit.marks.generator.x, run.kit.marks.generator.z + 2.6, 0, -0.1);
  R.push(fight("generator", 4200, null, [run.kit.marks.generator.x, run.kit.marks.generator.z + 2.6]));
  R.push({ total: { kills: run.stats.kills, time: Math.round(run.time), stage: run.stage, over: run.over } });
  return R;
}, seed);
for (const r of res) console.log(JSON.stringify(r));
console.log(logs.slice(0, 5).join("\n"));
await b.close();
