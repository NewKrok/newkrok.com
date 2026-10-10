// Plays the siege headless, no god mode, for the first N minutes: a bot
// that fights what hunts it, goes out for crystals and crates between
// waves, gets back to the reactor for a wave and buys heal and ammo at the
// terminal. Reports per minute: the reactor's health, the bot's downs, kills,
// crystals banked, bugs alive. The wave clock is real time (60 steps = 1 s).
// node scripts/siege.mjs [minutes] [seed]
import { launch, URL } from "./browser.mjs";
const minutes = Number(process.argv[2] ?? 11), seed = Number(process.argv[3] ?? 1);
const b = await launch();
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message + "\n" + e.stack));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__longWatch, null, { timeout: 60000 });
const res = await p.evaluate(async ([minutes, seed]) => {
  const D = window.__longWatch;
  D.play({ seed });
  const run = D.run, pl = run.player;
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const out = [], base = { x: run.core.x, z: run.core.z };
  let downs = 0, wasDown = false, goal = null, goalT = 0, lowHp = 999, shopT = 0;
  const steps = minutes * 60 * 60;
  for (let i = 0; i < steps; i++) {
    if (run.over) { out.push({ over: run.over, at: Math.round(run.time) }); break; }
    const b0 = pl.body, S = run.siege;
    const I = { forward: 0, strafe: 0, yaw: D.input.yaw, pitch: D.input.pitch, use: true, usePressed: i % 20 === 0 };
    let tgt = null, best = 1e9, nearest = 1e9;
    for (const g of run.bugs) {
      if (!g.alive || g.hidden) continue;
      const d = Math.hypot(g.x - b0.x, g.z - b0.z);
      if (g.state === "hunt" || g.boss) { nearest = Math.min(nearest, d); if (d < 45 && d < best) { best = d; tgt = g; } }
    }
    const home = Math.hypot(b0.x - base.x, b0.z - base.z) < 14;
    const waveSoon = S.next < 60 || (S.wave > 0 && run.time - (S.lastWaveAt ?? 0) < 1) || run.bugs.some((g) => g.alive && g.target === run.core);
    if (tgt && !pl.downed) {
      const sp = tgt.spheres(); let k = 0; for (let j = 0; j < sp.length; j += 5) if (sp[j + 4] !== "plate") { k = j; if (sp[j + 4] === "body" || sp[j + 4] === "sac") break; }
      const cx = pl.cam.x ?? b0.x, cy = pl.cam.y ?? b0.y + 1.5, cz = pl.cam.z ?? b0.z;
      const dx = sp[k] - cx, dy = sp[k + 1] - cy, dz = sp[k + 2] - cz;
      D.input.setView(Math.atan2(-dx, -dz) + (rnd() - 0.5) * 0.03, Math.atan2(dy, Math.hypot(dx, dz)) + (rnd() - 0.5) * 0.02);
      I.yaw = D.input.yaw; I.pitch = D.input.pitch; I.aim = true; I.fire = i % 3 !== 0; I.firePressed = i % 8 === 0;
      const w = pl.weapon;
      if (w && w.mag === 0) { if (w.reserve > 0) I.reloadPressed = true; else if (pl.slots.length > 1) I.swapPressed = true; }
      if (nearest < 3.5) { I.forward = -1; I.aim = false; if (nearest < 1.6 && i % 40 === 0) I.dashPressed = true; }
    } else if (!pl.downed) {
      // Nothing hunting: back for a wave, else shop, else out for loot.
      if (waveSoon && !home) goal = { x: base.x + 3, z: base.z + 6, why: "wave" };
      else if (home && run.bank >= 20 && (pl.hp < pl.maxHp * 0.6 || pl.slots[0].reserve < 80) && shopT <= 0) {
        const sh = run.script.shop(run);
        for (const id of ["heal", "ammo", "repair", "dmg", "hp"]) { const it = sh.find((q) => q.id === id); if (it?.ok && (id !== "repair" || run.core.hp < run.core.maxHp * 0.7)) { run.script.buy(run, id); break; } }
        shopT = 600;
      } else if (!waveSoon && (!goal || goalT > 1500 || Math.hypot(goal.x - b0.x, goal.z - b0.z) < 1.8 || (goalT > 240 && b0.speed2D < 0.3))) {
        let bestU = null, bd = 1e9;
        for (const u of run.uses) { if (!(u.auto || u.crate)) continue; const d = Math.hypot(u.x - b0.x, u.z - b0.z) + Math.hypot(u.x - base.x, u.z - base.z) * 0.3; if (d < bd) { bd = d; bestU = u; } }
        const stuck = goal && goalT > 240 && b0.speed2D < 0.3 ? goal : null;
        if (stuck && bestU && Math.hypot(bestU.x - stuck.x, bestU.z - stuck.z) < 3) bestU = null;   // give up on what it cannot reach
        goal = bestU ? { x: bestU.x, z: bestU.z, why: "loot" } : { x: base.x + 3 + (rnd() - 0.5) * 20, z: base.z + 6 + (rnd() - 0.5) * 20, why: "idle" };
        goalT = 0;
      }
      if (goal) {
        const dx = goal.x - b0.x, dz = goal.z - b0.z, d = Math.hypot(dx, dz);
        if (d > 1.2) {
          // Walk by the grid so buildings do not stop the bot.
          const f = run.nav.field("bot", goal.x, goal.z, run.time, 0.5), w = run.nav.dir(f, b0.x, b0.z) ?? [dx / d, dz / d];
          D.input.setView(Math.atan2(-w[0], -w[1]), -0.1); I.yaw = D.input.yaw; I.forward = 1; I.sprint = d > 8;
          if (i % 120 === 0 && b0.speed2D < 0.5) I.jumpPressed = true;
        }
        goalT++;
      }
    }
    shopT--;
    run.step(I);
    run.drain();
    if (S.wave !== (S._seen ?? 0)) { S._seen = S.wave; S.lastWaveAt = run.time; }
    lowHp = Math.min(lowHp, pl.hp);
    if (pl.downed && !wasDown) downs++;
    wasDown = pl.downed;
    if (i % 3600 === 3599) {
      out.push({ min: (i + 1) / 3600, pos: [Math.round(b0.x), Math.round(b0.z)], goal: goal ? [Math.round(goal.x), Math.round(goal.z)] : null, core: Math.round(run.core.hp), wave: S.wave, downs, lowHp: Math.round(lowHp), hp: Math.round(pl.hp), kills: run.stats.kills, bank: run.bank, carried: run.crystals, alive: run.bugs.filter((g) => g.alive).length, hunting: run.bugs.filter((g) => g.alive && g.state === "hunt").length, ammo: pl.slots.map((g) => `${g.id}:${g.mag}/${g.reserve === Infinity ? "inf" : g.reserve}`).join(" "), up: { ...pl.up }, at: goal?.why });
      lowHp = 999;
    }
    if (i % 600 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  out.push({ summary: run.script.summary(run) });
  return out;
}, [minutes, seed]);
for (const r of res) console.log(JSON.stringify(r));
console.log(logs.slice(0, 3).join("\n"));
await b.close();
