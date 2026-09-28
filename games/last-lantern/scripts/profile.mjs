// Where the frame goes: sim step, rig sync, fx sync, env sync and HUD,
// timed separately in a crowded late-stage scene (GPU time not included).
// node scripts/profile.mjs [stage] [seconds-in]
import { launch, URL } from "./browser.mjs";
const [stage = "4", secs = "200"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(1500);
const r = await p.evaluate(async ([s, secs]) => {
  const L = window.__lastLantern; L.settings.safetySeen = true; L.settings.stage = s; L.startRun();
  const R = L.G.run; R.levelUpQueue = 0; R.clock = secs * 60;
  // Let the full crowd gather first (no weapons), then arm the hero so the
  // measured frames have both a crowd and a busy effects load.
  R.hero.weapons = [];
  for (let i = 0; i < 60 * 45; i++) { if (R.phase !== "play") { R.levelUpQueue = 0; R.chestQueue = 0; R.phase = "play"; } R.step({ mx: Math.cos(i / 90) * 0.6, my: Math.sin(i / 110) * 0.6 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp; }
  R.hero.weapons = [{ id: "knives", level: 1, cd: 5, pulse: 0 }, { id: "spades", level: 1, cd: 5, pulse: 0, angle: 0 }];
  for (let i = 0; i < 60 * 2; i++) { if (R.phase !== "play") { R.levelUpQueue = 0; R.chestQueue = 0; R.phase = "play"; } R.step({ mx: Math.cos(i / 90) * 0.6, my: Math.sin(i / 110) * 0.6 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp; }
  L.G.phase = "paused";
  const sc = L.scene, t = { sim: 0, rigs: 0, fx: 0, env: 0, hud: 0 };
  const hud = document.getElementById("hud");
  const N = 120;
  const heap0 = performance.memory?.usedJSHeapSize || 0;
  for (let i = 0; i < N; i++) {
    let a = performance.now();
    if (R.phase !== "play") { R.levelUpQueue = 0; R.chestQueue = 0; R.phase = "play"; }
    R.step({ mx: 0.4, my: 0.2 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp;
    let b2 = performance.now(); t.sim += b2 - a;
    sc.rigs.sync(R, i / 60, sc.viewRect(90)); a = performance.now(); t.rigs += a - b2;
    sc.fx.sync(R, i / 60, 0.5, { x0: -1e4, x1: 1e4, y0: -1e4, y1: 1e4 }); b2 = performance.now(); t.fx += b2 - a;
    window.__envSync?.(sc, R, i / 60); a = performance.now(); t.env += a - b2;
  }
  for (const k in t) t[k] = +(t[k] / N).toFixed(3);
  // One real frame, for the renderer's own counters.
  sc.useBloom = false;
  sc.renderer.info.autoReset = false; sc.renderer.info.reset();
  sc.render(R, { time: 1, dt: 1 / 60, mode: "play", shake: [0, 0] });
  const info = { calls: sc.renderer.info.render.calls, tris: sc.renderer.info.render.triangles, geos: sc.renderer.info.memory.geometries, tex: sc.renderer.info.memory.textures, programs: sc.renderer.info.programs?.length };
  sc.renderer.info.autoReset = true;
  let lights = 0; sc.scene.traverse((o) => { if (o.isPointLight && o.intensity > 0) lights++; });
  // Triangles by kind: instanced monster parts, instanced effects, static.
  const triOf = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const tb = { rigs: 0, fx: 0, statics: 0, other: 0 };
  const rigMeshes = new Set(); for (const rig of sc.rigs.rigs.values()) for (const { mesh } of rig.parts) rigMeshes.add(mesh);
  sc.scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.isInstancedMesh) { const n = triOf(o.geometry) * o.count; if (rigMeshes.has(o)) tb.rigs += n; else tb.fx += n; }
    else if (o.geometry.attributes.color) tb.statics += triOf(o.geometry); else tb.other += triOf(o.geometry);
  });
  for (const k in tb) tb[k] = Math.round(tb[k] / 1000) + "k";
  const inView = R.monsters.filter((m) => { const v = sc.viewRect(90), q = m.body.position; return m.alive && q.x > v.x0 && q.x < v.x1 && q.y > v.y0 && q.y < v.y1; }).length;
  let inst = 0, instVisible = 0; sc.scene.traverse((o) => { if (o.isInstancedMesh) { inst++; if (o.visible && o.count > 0) instVisible++; } });
  return { tb, inView, info, pointLights: lights, instanced: inst, instancedVisible: instVisible, alive: R.monsters.filter((m) => m.alive).length, shots: R.shots.length, particles: R.particles.length, gems: R.gems.length, ms: t, heapGrowthMB: +(((performance.memory?.usedJSHeapSize || 0) - heap0) / 1e6).toFixed(1) };
}, [Number(stage), Number(secs)]);
console.log(JSON.stringify(r));
await b.close();
