import * as T from "three";
import { mulberry } from "../config.js";
import { Batch, GEO, tiltTo } from "./batch.js";
import { canvas, tex, skyTexture, detailTexture, glowTexture, flameTexture, mistTexture } from "./textures.js";
import { at, local, limb, light } from "./propkit.js";
import { CHURCHYARD } from "./churchyard.js";

// ── Stage environments ───────────────────────────────────────────────────
// World (x, y) px → three (x, −y, z) with z up. Built once when a run
// starts: a painted ground, the arena's wall, every static obstacle merged
// into a few batches, the loose props as their own meshes, a pool of point
// lights that follows the hero between the stage's light sources, ambient
// particles (fireflies, ash, snow, dust) and the beacon.

export const LOOKS = {
  churchyard: { fog: 0x0a0e1a, fogD: 0.00058, amb: 0x2c3a5c, ambI: 2.1, hemiSky: 0x5a6aa0, hemiGnd: 0x1a1a14, moon: 0xb8c8ff, moonI: 1.7, outer: 0x1a2620, bloom: 0.7 },
  mill:      { fog: 0x0b1410, fogD: 0.00075, amb: 0x2a3c34, ambI: 2.0, hemiSky: 0x5a7a6a, hemiGnd: 0x141a10, moon: 0xc8e0c8, moonI: 1.4, outer: 0x18221a, bloom: 0.7 },
  ashwood:   { fog: 0x160e0c, fogD: 0.00058, amb: 0x3e3634, ambI: 2.4, hemiSky: 0x6a5a52, hemiGnd: 0x1a100c, moon: 0xffc8a8, moonI: 1.2, outer: 0x1a1210, bloom: 0.55 },
  pass:      { fog: 0x223048, fogD: 0.0005, amb: 0x2a3a5a, ambI: 1.5, hemiSky: 0x6a88b8, hemiGnd: 0x2a3444, moon: 0xc8d8ff, moonI: 1.1, outer: 0x5a6a80, bloom: 0.35 },
  cathedral: { fog: 0x100c1a, fogD: 0.0005, amb: 0x302848, ambI: 2.0, hemiSky: 0x6a5aa0, hemiGnd: 0x18141e, moon: 0xd0c8ff, moonI: 1.6, outer: 0x1a1622, bloom: 0.75 },
};

const std = (o) => new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
// Stages with their own prop modules plug in here.
const PLUG = { churchyard: CHURCHYARD };

export function buildEnv(scene, R, quality) {
  const look = R.stage.look;
  const L = LOOKS[look];
  const world = R.world;
  const { W, H } = world;
  const hi = quality === "high";
  const rnd = mulberry(R.stage.index * 97 + 5);
  const group = new T.Group();
  scene.add(group);
  const env = { group, look, L, sources: [], flames: [], mist: [], props: [], anim: [], beacon: null, points: null };

  // Sky dome.
  const sky = new T.Mesh(new T.SphereGeometry(6000, 32, 16), new T.MeshBasicMaterial({ map: skyTexture(look), side: T.BackSide, depthWrite: false, fog: false }));
  sky.rotation.x = Math.PI / 2;
  sky.position.set(W / 2, -H / 2, -400);
  sky.renderOrder = -30;
  group.add(sky);

  // Ground: one painted texture for the arena plus a tiling bump detail.
  const S = hi ? 3072 : 2048;
  const k = S / Math.max(W, H);
  const gw = Math.round(W * k), gh = Math.round(H * k);
  const gcv = canvas(gw, gh), gc = gcv.getContext("2d");
  const ecv = look === "ashwood" ? canvas(gw >> 1, gh >> 1) : null;
  PAINT[look](gc, k, world, rnd, ecv?.getContext("2d"));
  paintZones(gc, k, world);
  const vig = gc.createRadialGradient(gw / 2, gh / 2, Math.min(gw, gh) * 0.45, gw / 2, gh / 2, Math.max(gw, gh) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  gc.fillStyle = vig;
  gc.fillRect(0, 0, gw, gh);
  const detail = detailTexture(R.stage.index + 3, look === "cathedral" ? "tiles" : look === "pass" ? "snow" : "grain");
  detail.repeat.set(W / (look === "cathedral" ? 240 : 90), H / (look === "cathedral" ? 240 : 90));
  const gmat = hi
    ? std({ map: tex(gcv), bumpMap: detail, bumpScale: look === "cathedral" ? 2.2 : 1.4, roughness: look === "pass" ? 0.75 : 0.95 })
    : new T.MeshLambertMaterial({ map: tex(gcv) });
  if (ecv) { gmat.emissiveMap = tex(ecv); gmat.emissive = new T.Color(0xffffff); gmat.emissiveIntensity = 0.8; env.emberGround = gmat; }
  const ground = new T.Mesh(new T.PlaneGeometry(W, H), gmat);
  ground.position.set(W / 2, -H / 2, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Outside the wall: darker land to the fog, so the camera never sees void.
  const outer = new T.Mesh(new T.PlaneGeometry(W + 5000, H + 5000), std({ color: L.outer, roughness: 1, emissive: L.outer, emissiveIntensity: 0.35 }));
  outer.position.set(W / 2, -H / 2, -3);
  group.add(outer);

  // Standing water and ice sheets on top of the painted ground.
  const water = new Batch(), ice = new Batch();
  for (const z of world.zones) {
    if (z.kind === "mud") water.add(GEO.disc, [z.x, -z.y, 0.6 + rnd() * 0.2], null, [z.r, z.r, 1], 0x1e3a34);
    if (z.kind === "ice") ice.add(GEO.disc, [z.x, -z.y, 0.5 + rnd() * 0.2], null, [z.r, z.r, 1], 0xbfe0ff);
  }
  const wm = water.build(std({ vertexColors: true, roughness: 0.38, metalness: 0.05, emissive: 0x0a1814, emissiveIntensity: 1 }));
  if (wm) { wm.receiveShadow = true; group.add(wm); env.water = wm; }
  const im = ice.build(std({ vertexColors: true, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72 }));
  if (im) group.add(im);

  // Static obstacles, merged.
  const bStone = new Batch(), bWood = new Batch(), bGlow = new Batch(), bFoliage = new Batch();
  const B = { stone: bStone, wood: bWood, glow: bGlow, leaf: bFoliage };
  for (const o of world.obstacles) {
    const fn = PROPS[o.kind];
    if (fn) fn(B, o, rnd, env, look);
  }
  WALLS[look](B, world, rnd, env);
  OUTSIDE[look]?.(B, world, rnd);
  for (const d of world.decor) DECOR[d.kind]?.(B, d, rnd);
  // Lit batches: standard material on high, the cheaper Lambert on low.
  const lit = (o) => (hi ? std(o) : new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const stoneMeshes = bStone.buildChunks(lit({ vertexColors: true, roughness: 0.92, flatShading: true }));
  const woodMeshes = bWood.buildChunks(lit({ vertexColors: true, roughness: 0.85, flatShading: true }));
  const leafMeshes = bFoliage.buildChunks(lit({ vertexColors: true, roughness: 1, flatShading: true }));
  const glowMeshes = bGlow.buildChunks(new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
  for (const m of [...stoneMeshes, ...woodMeshes, ...leafMeshes]) { m.castShadow = hi; m.receiveShadow = true; group.add(m); }
  for (const m of glowMeshes) group.add(m);

  // Loose props: their own meshes, synced from the bodies.
  for (const p of world.props) {
    const g = PROP_MESH[p.kind](p);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } });
    group.add(g);
    env.props.push({ p, g });
  }

  // Flames: additive sprites that flicker (burning trees, braziers, torches).
  const flameMat = new T.SpriteMaterial({ map: flameTexture(), blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  for (const f of env.flames) {
    const s = new T.Sprite(flameMat);
    s.position.set(f.x, -f.y, f.z);
    s.scale.set(f.s, f.s * 1.8, 1);
    group.add(s);
    f.sprite = s;
    const g = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: 0xff8a3a, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }));
    g.position.set(f.x, -f.y, f.z);
    g.scale.set(f.s * 4, f.s * 4, 1);
    group.add(g);
    f.glow = g;
  }

  // Ground mist.
  if (look !== "ashwood") {
    const mt = mistTexture();
    const n = look === "mill" ? 34 : look === "cathedral" ? 14 : 24;
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(GEO.plane, new T.MeshBasicMaterial({ map: mt, color: look === "pass" ? 0xe8f0ff : look === "mill" ? 0xb8d8c0 : 0xb4c3e6, transparent: true, opacity: 0.25, depthWrite: false, fog: false }));
      const s = 260 + rnd() * 340;
      m.scale.set(s, s * 0.7, 1);
      m.position.set(rnd() * W, -rnd() * H, 8 + rnd() * 8);
      m.renderOrder = 5;
      group.add(m);
      env.mist.push({ mesh: m, vx: (rnd() - 0.5) * 14, vy: (rnd() - 0.5) * 8, phase: rnd() * 6, base: look === "mill" ? 0.3 : 0.2 });
    }
  }

  // Ambient particles.
  env.points = ambientPoints(look, W, H, rnd, hi);
  group.add(env.points.obj);

  // The beacon.
  env.beacon = buildBeacon(group, world.beacon, look);

  // A pool of point lights that follows the hero between the light sources.
  env.pool = [];
  const nL = hi ? 4 : 2;
  for (let i = 0; i < nL; i++) {
    const l = new T.PointLight(0xffb25a, 0, 420, 2);
    group.add(l);
    env.pool.push(l);
  }
  env.dispose = () => {
    scene.remove(group);
    group.traverse((o) => {
      if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) { for (const key of ["map", "bumpMap", "emissiveMap"]) if (m[key] && m[key] !== glowTexture() && m[key] !== flameTexture()) m[key].dispose(); m.dispose(); }
    });
  };
  return env;
}

// Per-frame: flicker, drift, and hand the light pool to the nearest sources.
export function syncEnv(env, R, t, dt, focus) {
  for (const f of env.flames) {
    const k = 0.85 + Math.sin(t * 13 + f.ph) * 0.08 + Math.sin(t * 31 + f.ph * 2) * 0.06;
    f.sprite.scale.set(f.s * k, f.s * 1.8 * (0.9 + Math.sin(t * 9 + f.ph) * 0.12), 1);
    f.glow.material.opacity = 0.35 + k * 0.2;
  }
  for (const m of env.mist) {
    const p = m.mesh.position;
    p.x += m.vx * dt; p.y += m.vy * dt;
    if (p.x < -300) p.x = R.world.W + 300; else if (p.x > R.world.W + 300) p.x = -300;
    if (p.y > 300) p.y = -R.world.H - 300; else if (p.y < -R.world.H - 300) p.y = 300;
    m.mesh.material.opacity = m.base + Math.sin(t * 0.6 + m.phase) * 0.08;
  }
  for (const { p, g } of env.props) {
    const b = p.body.position;
    g.position.set(b.x, -b.y, 0);
    g.rotation.z = -p.body.rotation;
  }
  for (const a of env.anim) a(t, dt);
  if (env.emberGround) env.emberGround.emissiveIntensity = 0.7 + Math.sin(t * 1.3) * 0.15;
  env.points.update(t, dt, focus);
  // Light pool: nearest sources to the focus point.
  const fx = focus.x, fy = focus.y;
  const src = env.sources;
  // The nearest sources change slowly: re-pick every eighth frame.
  env.tick = (env.tick || 0) + 1;
  if (src.length && env.tick % 8 === 1) {
    const sorted = src.map((s) => [Math.hypot(s.x - fx, s.y - fy), s]).sort((a, b) => a[0] - b[0]);
    env.pool.forEach((l, i) => {
      const e = sorted[i];
      l.userData.src = e && e[0] <= 1100 ? e[1] : null;
      if (!l.userData.src) return;
      const s = e[1];
      l.position.set(s.x, -s.y, s.z);
      l.color.setHex(s.color);
      l.distance = s.d || 420;
    });
  }
  // The flicker itself runs every frame.
  for (const l of env.pool) {
    const s = l.userData.src;
    if (!s) { l.intensity = 0; continue; }
    const fl = s.flicker ? 0.86 + Math.sin(t * 13 + s.ph) * 0.07 + Math.sin(t * 29 + s.ph * 2) * 0.05 : 1;
    l.intensity = s.i * fl;
  }
  // The beacon catches when the keeper falls.
  const b = env.beacon;
  if (b) {
    const lit = R.beaconLit || (R.bossKilledAt ? Math.min(1, (R.frame - R.bossKilledAt) / 90) : 0);
    b.fire.visible = lit > 0.02;
    b.fire.scale.set(70 * lit + 1, 120 * lit + 1, 1);
    b.fireGlow.material.opacity = 0.8 * lit;
    b.fireGlow.scale.setScalar(420 * lit + 1);
    b.pillar.material.opacity = 0.3 * lit * (0.85 + Math.sin(t * 3) * 0.15);
    b.pillar.visible = lit > 0.02;
    b.light.intensity = 90000 * lit;
    { const e = (0.35 + 0.65 * (0.5 + Math.sin(t * 2) * 0.5)) * (1 - lit); b.ember.material.color.setRGB(e, e * 0.4, e * 0.12); }
  }
}

// ── Ground painting ──────────────────────────────────────────────────────
function speckle(c, w, h, rnd, n, cols, rmin, rmax) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = cols[Math.floor(rnd() * cols.length)];
    const r = rmin + rnd() * (rmax - rmin);
    c.beginPath(); c.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 6.3); c.fill();
  }
}
function path(c, k, pts, width, col) {
  c.strokeStyle = col; c.lineWidth = width * k; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)));
  c.stroke();
}

const PAINT = {
  churchyard(c, k, w, rnd) {
    const gw = c.canvas.width, gh = c.canvas.height;
    c.fillStyle = "#34503f"; c.fillRect(0, 0, gw, gh);
    speckle(c, gw, gh, rnd, 14000, ["rgba(150,200,150,0.08)", "rgba(0,0,0,0.12)", "rgba(70,130,95,0.14)", "rgba(90,80,50,0.1)"], 2, 12);
    // Paths: a cross and a ring round the mausoleum.
    path(c, k, [[w.W / 2, 0], [w.W / 2, w.H]], 90, "rgba(110,95,70,0.6)");
    path(c, k, [[0, w.H * 0.62], [w.W, w.H * 0.62]], 80, "rgba(110,95,70,0.6)");
    c.beginPath(); c.lineWidth = 60 * k; c.arc(w.W / 2 * k, w.H * 0.28 * k, 210 * k, 0, 6.3); c.stroke();
    speckle(c, gw, gh, rnd, 3000, ["rgba(255,255,255,0.03)"], 1, 3);
    // Grave mounds in front of every stone.
    for (const o of w.obstacles) {
      if (o.kind !== "stone" && o.kind !== "cross") continue;
      c.save(); c.translate(o.x * k, (o.y + 30) * k); c.rotate(o.rot || 0);
      c.fillStyle = "rgba(55,40,28,0.7)"; c.beginPath(); c.ellipse(0, 0, 20 * k, 34 * k, 0, 0, 6.3); c.fill();
      c.fillStyle = "rgba(30,22,14,0.35)"; c.beginPath(); c.ellipse(0, 4 * k, 14 * k, 26 * k, 0, 0, 6.3); c.fill();
      c.restore();
    }
    c.fillStyle = "rgba(90,95,105,0.6)";
    c.fillRect((w.W / 2 - 140) * k, (w.H * 0.28 - 95) * k, 280 * k, 210 * k);
  },
  mill(c, k, w, rnd) {
    const gw = c.canvas.width, gh = c.canvas.height;
    c.fillStyle = "#3a4a32"; c.fillRect(0, 0, gw, gh);
    speckle(c, gw, gh, rnd, 14000, ["rgba(120,150,80,0.1)", "rgba(0,0,0,0.14)", "rgba(80,70,40,0.14)", "rgba(60,90,60,0.12)"], 2, 14);
    // Muddy banks around the pools (the water itself is a mesh).
    for (const z of w.zones) if (z.kind === "mud") {
      const g = c.createRadialGradient(z.x * k, z.y * k, z.r * k * 0.7, z.x * k, z.y * k, z.r * k * 1.35);
      g.addColorStop(0, "rgba(40,34,20,0.9)"); g.addColorStop(1, "rgba(40,34,20,0)");
      c.fillStyle = g; c.beginPath(); c.arc(z.x * k, z.y * k, z.r * k * 1.35, 0, 6.3); c.fill();
    }
    // Boardwalk to the mill.
    c.save();
    c.fillStyle = "rgba(90,70,45,0.9)";
    for (let y = w.H * 0.33; y < w.H * 0.6; y += 14) c.fillRect((w.W / 2 - 34) * k, y * k, 68 * k, 11 * k);
    c.restore();
    path(c, k, [[0, w.H * 0.62], [w.W * 0.3, w.H * 0.58], [w.W * 0.7, w.H * 0.64], [w.W, w.H * 0.6]], 70, "rgba(90,80,55,0.55)");
  },
  ashwood(c, k, w, rnd, e) {
    const gw = c.canvas.width, gh = c.canvas.height;
    c.fillStyle = "#2a2422"; c.fillRect(0, 0, gw, gh);
    speckle(c, gw, gh, rnd, 16000, ["rgba(120,110,100,0.12)", "rgba(0,0,0,0.2)", "rgba(80,50,40,0.14)", "rgba(160,150,140,0.06)"], 2, 12);
    for (const z of w.zones) if (z.kind === "ash") {
      const g = c.createRadialGradient(z.x * k, z.y * k, 0, z.x * k, z.y * k, z.r * k);
      g.addColorStop(0, "rgba(150,140,130,0.5)"); g.addColorStop(1, "rgba(150,140,130,0)");
      c.fillStyle = g; c.beginPath(); c.arc(z.x * k, z.y * k, z.r * k, 0, 6.3); c.fill();
    }
    // Glowing cracks and embers on the emissive map.
    const ew = e.canvas.width, eh = e.canvas.height, ek = ew / gw;
    e.fillStyle = "#000"; e.fillRect(0, 0, ew, eh);
    e.lineCap = "round";
    for (let i = 0; i < 90; i++) {
      let x = rnd() * ew, y = rnd() * eh;
      e.strokeStyle = `rgba(255,${80 + rnd() * 70},20,${0.4 + rnd() * 0.5})`;
      e.lineWidth = 0.8 + rnd() * 1.6;
      e.beginPath(); e.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; e.lineTo(x, y); }
      e.stroke();
    }
    for (const d of w.decor) if (d.kind === "ember") {
      const x = d.x * k * ek, y = d.y * k * ek, r = (4 + d.s * 10) * k * ek;
      const g = e.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,170,60,0.9)"); g.addColorStop(1, "rgba(255,60,0,0)");
      e.fillStyle = g; e.beginPath(); e.arc(x, y, r, 0, 6.3); e.fill();
    }
  },
  pass(c, k, w, rnd) {
    const gw = c.canvas.width, gh = c.canvas.height;
    c.fillStyle = "#8e9cb2"; c.fillRect(0, 0, gw, gh);
    speckle(c, gw, gh, rnd, 12000, ["rgba(255,255,255,0.14)", "rgba(80,100,130,0.12)", "rgba(60,80,110,0.1)"], 3, 16);
    // Trodden trail.
    path(c, k, [[w.W * 0.1, w.H], [w.W * 0.3, w.H * 0.7], [w.W * 0.55, w.H * 0.55], [w.W * 0.7, w.H * 0.3], [w.W * 0.5, 0]], 90, "rgba(120,130,150,0.35)");
    for (const o of w.obstacles) if (o.kind === "boulder" || o.kind === "pine") {
      c.fillStyle = "rgba(60,80,110,0.18)"; c.beginPath(); c.ellipse((o.x + 10) * k, (o.y + 18) * k, o.r * 1.5 * k, o.r * 1.1 * k, 0, 0, 6.3); c.fill();
    }
  },
  cathedral(c, k, w) {
    const gw = c.canvas.width, gh = c.canvas.height;
    // Flagstones.
    const tile = 80 * k;
    for (let y = 0; y < gh; y += tile) for (let x = 0; x < gw; x += tile) {
      const v = 58 + ((x * 7 + y * 13) % 17);
      c.fillStyle = `rgb(${v},${v - 4},${v + 8})`;
      c.fillRect(x, y, tile - 1.5, tile - 1.5);
    }
    // The nave: a long runner to the altar.
    c.fillStyle = "#5a1a24";
    c.fillRect((w.W / 2 - 80) * k, w.H * 0.16 * k, 160 * k, w.H * k);
    c.strokeStyle = "#c9a35a"; c.lineWidth = 5 * k;
    c.strokeRect((w.W / 2 - 72) * k, w.H * 0.16 * k, 144 * k, w.H * k);
    // A rose window of light on the floor.
    const cx = w.W / 2 * k, cy = w.H * 0.45 * k;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillStyle = ["rgba(200,80,120,0.2)", "rgba(80,120,220,0.2)", "rgba(220,190,90,0.2)"][i % 3];
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 260 * k, a, a + 0.5); c.closePath(); c.fill();
    }
    c.fillStyle = "rgba(0,0,0,0.25)";
    for (const sx of [-1, 1]) c.fillRect((w.W / 2 + sx * 520 - 40) * k, 0, 80 * k, gh);
  },
};

function paintZones(c, k, w) {
  for (const z of w.zones) if (z.kind === "ice") {
    c.fillStyle = "rgba(180,215,245,0.6)";
    c.beginPath(); c.arc(z.x * k, z.y * k, z.r * k * 1.04, 0, 6.3); c.fill();
  }
}

// ── Static props ─────────────────────────────────────────────────────────
// Each adds parts to the batches in world space (three coords).
const PROPS = {
  stone(B, o, rnd) {
    const a = [0, 0, -(o.rot || 0)];
    const c = rnd() < 0.5 ? 0x7a8088 : 0x6c727c;
    B.stone.add(GEO.boxUp, at(o), a, [o.w, 9, o.tall], c);
    B.stone.add(GEO.cyl, local(o, 0, 0, o.tall), [Math.PI / 2, 0, -(o.rot || 0)], [o.w / 2, o.w / 2, 9], c);
    B.stone.add(GEO.boxUp, at(o), a, [o.w + 8, o.h + 6, 5], 0x565c66);
    if (rnd() < 0.4) B.leaf.add(GEO.sphLo, local(o, (rnd() - 0.5) * o.w, 0, o.tall * 0.3), null, [5, 5, 4], 0x3a5a3a);
  },
  cross(B, o) {
    const a = [0, 0, -(o.rot || 0)];
    B.stone.add(GEO.boxUp, at(o), a, [7, 7, o.tall + 10], 0x7a8290);
    B.stone.add(GEO.box, local(o, 0, 0, o.tall - 6), a, [o.w + 8, 7, 7], 0x7a8290);
    B.stone.add(GEO.boxUp, at(o), a, [o.w, o.h + 4, 5], 0x565c66);
  },
  deadtree(B, o, rnd) {
    const base = at(o);
    const trunkH = 110 + o.r * 0.8;
    limb(B.wood, base, [0, 0, 1], trunkH, o.r * 0.95, 0x3a2f27);
    const r2 = mulberry(Math.floor(o.seed * 1e6));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r2() * 0.9, tilt = 0.55 + r2() * 0.5;
      const bs = [base[0], base[1], trunkH * (0.55 + r2() * 0.4)];
      const L = 40 + r2() * 50;
      const end = limb(B.wood, bs, [Math.cos(a) * Math.sin(tilt), Math.sin(a) * Math.sin(tilt), Math.cos(tilt)], L, o.r * 0.28, 0x2a221c);
      const a2 = a + (r2() - 0.5) * 1.4, t2 = 0.35 + r2() * 0.5;
      limb(B.wood, end, [Math.cos(a2) * Math.sin(t2), Math.sin(a2) * Math.sin(t2), Math.cos(t2)], L * 0.6, o.r * 0.13, 0x2a221c);
    }
    B.wood.add(GEO.cyl, [base[0], base[1], 3], null, [o.r * 1.6, o.r * 1.6, 6], 0x2a221c);
    void rnd;
  },
  mausoleum(B, o, rnd, env) {
    const [x, y] = at(o);
    B.stone.add(GEO.boxUp, [x, y, 0], null, [o.w, o.h, 90], 0x4b525c);
    B.stone.add(GEO.boxUp, [x, y, 90], null, [o.w + 18, o.h + 18, 10], 0x5c6470);
    B.stone.add(new T.ConeGeometry(1, 1, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 0.5), [x, y, 100], null, [o.w * 0.78, o.h * 0.78, 44], 0x3a4049);
    B.stone.add(GEO.boxUp, [x, y - o.h / 2 - 1, 0], null, [38, 4, 58], 0x0d1016);
    for (const s of [-1, 1]) {
      B.stone.add(GEO.cylUp, [x + s * 66, y - 90, 0], null, [10, 10, 90], 0x7a8290);
      B.stone.add(GEO.boxUp, [x + s * 66, y - 90, 88], null, [24, 24, 8], 0x8a929e);
    }
    B.stone.add(GEO.boxUp, [x, y - 90, 96], null, [158, 26, 10], 0x5c6470);
    // An angel on the roof.
    B.stone.add(GEO.cylUp, [x, y, 144], null, [6, 6, 26], 0x8a929e);
    B.stone.add(GEO.sph, [x, y, 176], null, [6, 6, 6], 0x8a929e);
    for (const s of [-1, 1]) B.stone.add(GEO.box, [x + s * 12, y + 2, 164], [0, s * 0.5, 0], [18, 3, 26], 0x8a929e);
    // Candles in the doorway.
    for (const s of [-1, 1]) { B.glow.add(GEO.sph, [x + s * 26, y - o.h / 2 - 6, 8], null, [2.5, 2.5, 4], 0xffd28a); }
    light(env, o.x, o.y + o.h / 2 + 20, 30, 0xffb25a, 9000, true, 260);
    void rnd;
  },
  column() {},
  lamppost(B, o, rnd, env) {
    const [x, y] = at(o);
    B.wood.add(GEO.cylUp, [x, y, 0], null, [3, 3, 74], 0x2b2f36);
    B.wood.add(GEO.boxUp, [x, y, 72], null, [15, 15, 20], 0x3a3f48);
    B.glow.add(GEO.boxUp, [x, y, 74], null, [10, 10, 14], 0xffd28a);
    B.wood.add(GEO.cone, [x, y, 98], null, [12, 12, 12], 0x2b2f36);
    env.flames.push({ x: o.x, y: o.y, z: 81, s: 7, ph: rnd() * 6 });
    light(env, o.x, o.y, 84, 0xffb25a, 16000);
  },
  beacon() {},
  millhouse(B, o, rnd, env) {
    const [x, y] = at(o);
    B.stone.add(GEO.boxUp, [x, y, 0], null, [o.w, o.h, 34], 0x5a5a52);
    B.wood.add(GEO.boxUp, [x, y, 34], null, [o.w - 8, o.h - 8, 60], 0x5a4632);
    // Pitched roof: two slabs.
    for (const s of [-1, 1]) {
      B.wood.add(GEO.box, [x, y + s * o.h * 0.26, 116], [-s * 0.62, 0, 0], [o.w + 20, o.h * 0.62, 8], 0x7a5a44);
      // Rows of shingles down each slope, laid on the slab's top face.
      const th = -s * 0.62, cy = y + s * o.h * 0.26;
      for (let k = 0; k < 5; k++) {
        const u = ((k + 0.5) / 5 - 0.5) * o.h * 0.62;
        B.wood.add(GEO.box, [x, cy + u * Math.cos(th) - 4.4 * Math.sin(th), 116 + u * Math.sin(th) + 4.4 * Math.cos(th)], [th, 0, 0], [o.w + 22, 3, 1.5], 0x4a3226);
      }
    }
    B.wood.add(GEO.box, [x, y, 128], null, [o.w + 24, 8, 8], 0x4a3226);
    B.wood.add(GEO.boxUp, [x - o.w * 0.3, y - 10, 110], null, [18, 18, 40], 0x4a4a44);
    for (const s of [-1, 1]) B.glow.add(GEO.box, [x + s * 50, y - o.h / 2 - 0.5, 64], null, [18, 1, 20], 0xffc070);
    light(env, o.x, o.y + o.h / 2 + 30, 60, 0xffb060, 16000, true, 360);
  },
  wheel(B, o, rnd, env) {
    const g = new T.Group();
    const wood = std({ color: 0x4a3626 });
    const rim = new T.Mesh(new T.TorusGeometry(46, 5, 6, 20), wood);
    g.add(rim);
    for (let i = 0; i < 8; i++) {
      const p = new T.Mesh(GEO.box, wood);
      p.scale.set(92, 5, 4); p.rotation.z = (i / 8) * Math.PI;
      g.add(p);
      const pad = new T.Mesh(GEO.box, wood);
      const a = (i / 8) * Math.PI * 2;
      pad.position.set(Math.cos(a) * 48, Math.sin(a) * 48, 0); pad.rotation.z = a; pad.scale.set(4, 16, 22);
      g.add(pad);
    }
    g.rotation.y = Math.PI / 2;
    const holder = new T.Group();
    holder.add(g);
    holder.position.set(o.x, -o.y, 46);
    env.group.add(holder);
    env.anim.push((t) => { g.rotation.z = t * 0.6; });
    void B; void rnd;
  },
  pier(B, o) { B.wood.add(GEO.cyl6, at(o), null, [o.r, o.r, 30], 0x4a3a2a); },
  rock(B, o) {
    const r2 = mulberry(Math.floor((o.seed || 0.5) * 1e6));
    B.stone.add(GEO.dodeca, at(o, o.r * 0.35), [r2() * 3, r2() * 3, r2() * 3], [o.r * 1.05, o.r * 0.95, o.r * 0.7], 0x5e6258);
    B.stone.add(GEO.dodeca, local(o, o.r * 0.6, o.r * 0.3, 3), [r2() * 3, 0, r2() * 3], [o.r * 0.45, o.r * 0.4, o.r * 0.3], 0x505448);
  },
  stump(B, o) {
    B.wood.add(GEO.cylUp, at(o), null, [o.r, o.r, 18], 0x4a3626);
    B.wood.add(GEO.cyl, at(o, 18.2), null, [o.r * 0.85, o.r * 0.85, 0.5], 0x8a6a4a);
  },
  ashtree(B, o, rnd, env) {
    const base = at(o);
    const r2 = mulberry(Math.floor(o.seed * 1e6));
    const h = 130 + r2() * 60;
    limb(B.wood, base, [0, 0, 1], h, o.r, 0x1e1614);
    for (let i = 0; i < 5; i++) {
      const a = r2() * 6.28, tilt = 0.5 + r2() * 0.6;
      const bs = [base[0], base[1], h * (0.45 + r2() * 0.45)];
      const end = limb(B.wood, bs, [Math.cos(a) * Math.sin(tilt), Math.sin(a) * Math.sin(tilt), Math.cos(tilt)], 34 + r2() * 40, o.r * 0.3, 0x1a1210);
      if (o.burning && i < 2) env.flames.push({ x: end[0], y: -end[1], z: end[2] + 4, s: 10 + r2() * 6, ph: r2() * 6 });
    }
    if (o.burning) {
      env.flames.push({ x: o.x, y: o.y, z: h * 0.6, s: 16, ph: r2() * 6 });
      B.glow.add(GEO.cyl, [base[0], base[1], h * 0.35], null, [o.r * 0.55, o.r * 0.55, 20], 0xff7a2a);
      light(env, o.x, o.y, h * 0.7, 0xff7a30, 20000, true, 380);
    }
    B.wood.add(GEO.cyl, [base[0], base[1], 3], null, [o.r * 1.7, o.r * 1.7, 6], 0x1a1210);
    void rnd;
  },
  log(B, o, rnd) {
    B.wood.add(GEO.cyl, at(o, 11), [Math.PI / 2, 0, -(o.rot || 0) + Math.PI / 2], [11, 11, o.w], 0x241a16);
    if (rnd() < 0.5) B.glow.add(GEO.box, local(o, o.w * 0.2, 0, 21), [0, 0, -(o.rot || 0)], [o.w * 0.3, 3, 1], 0xff6a20);
  },
  boulder(B, o) {
    const r2 = mulberry(Math.floor((o.seed || 0.5) * 1e6));
    B.stone.add(GEO.dodeca, at(o, o.r * 0.4), [r2() * 3, r2() * 3, r2() * 3], [o.r * 1.08, o.r, o.r * 0.9], 0x6a7282);
    // Snow cap.
    B.leaf.add(GEO.sph, at(o, o.r * 1.05), null, [o.r * 0.8, o.r * 0.7, o.r * 0.28], 0xf4f8ff);
  },
  pine(B, o) {
    const [x, y] = at(o);
    B.wood.add(GEO.cylUp, [x, y, 0], null, [5, 5, 30], 0x3a2a1e);
    for (let i = 0; i < 4; i++) {
      const z = 22 + i * 26, r = o.r * (2.9 - i * 0.55);
      B.leaf.add(GEO.cone, [x, y, z + 22], null, [r, r, 46], 0x2e5a4a);
      B.leaf.add(GEO.cone, [x, y, z + 32], null, [r * 0.8, r * 0.8, 26], 0xe8f0fa);
    }
  },
  crystal(B, o, rnd, env) {
    const r2 = mulberry(Math.floor((o.seed || 0.5) * 1e6));
    for (let i = 0; i < 3; i++) {
      const tilt = [(r2() - 0.5) * 0.7, (r2() - 0.5) * 0.7, r2() * 3];
      B.glow.add(new T.OctahedronGeometry(1, 0), local(o, (r2() - 0.5) * 16, (r2() - 0.5) * 16, o.tall * 0.4), tilt, [7 + r2() * 4, 7 + r2() * 4, o.tall * (0.5 + r2() * 0.5)], 0x7ab8ff);
    }
    light(env, o.x, o.y, 30, 0x6ab0ff, 6000, false, 220);
  },
  altar(B, o, rnd, env) {
    const [x, y] = at(o);
    B.stone.add(GEO.boxUp, [x, y, 0], null, [o.w + 40, o.h + 40, 10], 0x4a4452);
    B.stone.add(GEO.boxUp, [x, y, 10], null, [o.w, o.h, 34], 0x6a6070);
    B.stone.add(GEO.boxUp, [x, y + 20, 44], null, [o.w * 0.4, 12, 110], 0x3a3444);
    B.glow.add(GEO.torus, [x, y + 14, 150], [Math.PI / 2, 0, 0], [30, 30, 30], 0xc0c8ff);
    for (let i = -3; i <= 3; i++) {
      B.wood.add(GEO.cylUp, [x + i * 24, y - 10, 44], null, [2.5, 2.5, 14], 0xe8e0d0);
      env.flames.push({ x: o.x + i * 24, y: o.y + 10, z: 62, s: 4, ph: rnd() * 6 });
    }
    light(env, o.x, o.y + 40, 80, 0xb0a8ff, 26000, true, 500);
  },
  statue(B, o) {
    const [x, y] = at(o);
    B.stone.add(GEO.boxUp, [x, y, 0], null, [34, 34, 24], 0x55505c);
    B.stone.add(GEO.taper, [x, y, 24], null, [12, 12, 50], 0x7a7482);
    B.stone.add(GEO.sph, [x, y, 82], null, [8, 8, 9], 0x7a7482);
    for (const s of [-1, 1]) B.stone.add(GEO.box, [x + s * 14, y + 4, 64], [0, s * 0.4, 0], [22, 4, 34], 0x6a6472);
  },
  pillar(B, o) {
    const [x, y] = at(o);
    B.stone.add(GEO.cyl6, [x, y, 0], null, [o.r * 1.4, o.r * 1.4, 14], 0x5a5462);
    B.stone.add(GEO.cyl6, [x, y, 14], null, [o.r, o.r, 96], 0x6e6878);
    B.stone.add(GEO.cyl6, [x, y, 104], null, [o.r * 1.35, o.r * 1.35, 12], 0x5a5462);
  },
};

// ── Arena walls ──────────────────────────────────────────────────────────
function alongWalls(W, H, step, fn) {
  for (let x = 0; x <= W; x += step) { fn(x, 0, 0); fn(x, H, 0); }
  for (let y = step; y < H; y += step) { fn(0, y, Math.PI / 2); fn(W, y, Math.PI / 2); }
}
const WALLS = {
  churchyard(B, w) {
    alongWalls(w.W, w.H, 22, (x, y) => {
      B.wood.add(GEO.cylUp, [x, -y, 0], null, [1.8, 1.8, 38], 0x2a2f38);
      B.wood.add(GEO.cone, [x, -y, 42], null, [3, 3, 8], 0x3a404a);
    });
    for (const z of [12, 32]) for (const [x, y, sw, sd] of [[w.W / 2, 0, w.W, 2.5], [w.W / 2, w.H, w.W, 2.5], [0, w.H / 2, 2.5, w.H], [w.W, w.H / 2, 2.5, w.H]]) {
      B.wood.add(GEO.box, [x, -y, z], null, [sw, sd, 2.5], 0x353b45);
    }
    for (const [x, y] of [[0, 0], [w.W, 0], [0, w.H], [w.W, w.H]]) {
      B.stone.add(GEO.boxUp, [x, -y, 0], null, [16, 16, 56], 0x4a505a);
      B.stone.add(GEO.sph, [x, -y, 62], null, [9, 9, 9], 0x6a7080);
    }
  },
  mill(B, w) {
    alongWalls(w.W, w.H, 16, (x, y, a) => {
      B.wood.add(GEO.cyl6, [x, -y, 0], [0, 0, a], [6, 6, 44 + ((x * 13 + y * 7) % 11)], 0x4a3a2a);
    });
  },
  ashwood(B, w, rnd) {
    alongWalls(w.W, w.H, 30, (x, y) => {
      B.stone.add(GEO.dodeca, [x + (rnd() - 0.5) * 10, -y + (rnd() - 0.5) * 10, 10], [rnd() * 3, rnd() * 3, 0], [22 + rnd() * 10, 22 + rnd() * 10, 26 + rnd() * 14], 0x2a2422);
    });
  },
  pass(B, w, rnd) {
    alongWalls(w.W, w.H, 46, (x, y) => {
      const r = 34 + rnd() * 24;
      B.stone.add(GEO.dodeca, [x + (rnd() - 0.5) * 20, -y + (rnd() - 0.5) * 20, r * 0.5], [rnd() * 3, rnd() * 3, rnd() * 3], [r, r, r * 1.2], 0x5a6474);
      B.leaf.add(GEO.sph, [x, -y, r * 1.15], null, [r * 0.8, r * 0.8, r * 0.3], 0xf0f6ff);
    });
  },
  cathedral(B, w, rnd, env) {
    const hgt = 110;
    for (const [x, y, sw, sd] of [[w.W / 2, -10, w.W + 40, 20], [w.W / 2, w.H + 10, w.W + 40, 20], [-10, w.H / 2, 20, w.H], [w.W + 10, w.H / 2, 20, w.H]]) {
      B.stone.add(GEO.boxUp, [x, -y, 0], null, [sw, sd, hgt], 0x3e3848);
    }
    // Buttresses and tall windows glowing with moonlight, set a hair in
    // front of the wall's inner face so the two never share a plane.
    alongWalls(w.W, w.H, 240, (x, y, a) => {
      B.stone.add(GEO.boxUp, [x, -y, 0], [0, 0, a], [30, 30, hgt + 20], 0x4a4456);
    });
    for (let x = 120; x < w.W; x += 240) {
      B.glow.add(GEO.box, [x, -w.H + 1.4, 60], null, [40, 1, 70], 0x4a5aa0);
      B.glow.add(GEO.box, [x, -1.4, 60], null, [40, 1, 70], 0x7a4a8a);
    }
    for (let y = 120; y < w.H; y += 240) for (const x of [1.4, w.W - 1.4]) B.glow.add(GEO.box, [x, -y, 60], null, [1, 40, 70], 0x5a4aa0);
    // Wall sconces.
    for (let y = 200; y < w.H; y += 400) for (const x of [16, w.W - 16]) {
      B.wood.add(GEO.boxUp, [x, -y, 70], null, [8, 8, 14], 0x2a2430);
      env.flames.push({ x, y, z: 92, s: 8, ph: rnd() * 6 });
      light(env, x, y, 100, 0xffa050, 14000, true, 360);
    }
  },
};

// ── Beyond the wall ──────────────────────────────────────────────────────
const OUTSIDE = {
  churchyard(B, w, rnd) {
    for (let i = 0; i < 70; i++) {
      const side = i % 4, d = 90 + rnd() * 500;
      const x = side < 2 ? rnd() * w.W : side === 2 ? -d : w.W + d;
      const y = side >= 2 ? rnd() * w.H : side === 0 ? -d : w.H + d;
      PROPS.deadtree(B, { x, y, r: 16 + rnd() * 8, seed: rnd() }, rnd);
    }
  },
  ashwood(B, w, rnd, env) {
    for (let i = 0; i < 90; i++) {
      const side = i % 4, d = 80 + rnd() * 500;
      const x = side < 2 ? rnd() * w.W : side === 2 ? -d : w.W + d;
      const y = side >= 2 ? rnd() * w.H : side === 0 ? -d : w.H + d;
      PROPS.ashtree(B, { x, y, r: 16 + rnd() * 10, seed: rnd(), burning: false }, rnd, env || { flames: [], sources: [] });
    }
  },
  pass(B, w, rnd) {
    for (let i = 0; i < 80; i++) {
      const side = i % 4, d = 120 + rnd() * 600;
      const x = side < 2 ? rnd() * w.W : side === 2 ? -d : w.W + d;
      const y = side >= 2 ? rnd() * w.H : side === 0 ? -d : w.H + d;
      if (rnd() < 0.5) PROPS.pine(B, { x, y, r: 14 + rnd() * 6 });
      else PROPS.boulder(B, { x, y, r: 50 + rnd() * 70, seed: rnd() });
    }
  },
  mill(B, w, rnd) {
    for (let i = 0; i < 60; i++) {
      const side = i % 4, d = 80 + rnd() * 400;
      const x = side < 2 ? rnd() * w.W : side === 2 ? -d : w.W + d;
      const y = side >= 2 ? rnd() * w.H : side === 0 ? -d : w.H + d;
      PROPS.deadtree(B, { x, y, r: 12 + rnd() * 6, seed: rnd() }, rnd);
    }
  },
};

const DECOR = {
  reed(B, d, rnd) {
    for (let i = 0; i < 3; i++) {
      const h = 22 + rnd() * 26;
      B.leaf.add(GEO.cone, [d.x + (rnd() - 0.5) * 12, -d.y + (rnd() - 0.5) * 12, h / 2], [(rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, 0], [1.6, 1.6, h], rnd() < 0.5 ? 0x5a6a3a : 0x4a5a2a);
    }
    if (rnd() < 0.3) B.wood.add(GEO.cylUp, [d.x, -d.y, 22], null, [2, 2, 10], 0x5a3a20);
  },
};

// ── Loose props ──────────────────────────────────────────────────────────
const PROP_MESH = {
  coffin(p) {
    const g = new T.Group();
    const m = new T.Mesh(GEO.boxUp, std({ color: 0x3a2a20 })); m.scale.set(p.w, p.h, 12); g.add(m);
    const l = new T.Mesh(GEO.boxUp, std({ color: 0x4a3626 })); l.scale.set(p.w - 4, p.h - 4, 2); l.position.z = 12; g.add(l);
    const c = new T.Mesh(GEO.boxUp, std({ color: 0xa08a50 })); c.scale.set(3, p.h * 0.6, 1); c.position.set(-p.w * 0.1, 0, 14); g.add(c);
    const c2 = c.clone(); c2.scale.set(p.w * 0.35, 3, 1); c2.position.set(-p.w * 0.1, 0, 14); g.add(c2);
    return g;
  },
  barrel(p) {
    const g = new T.Group();
    const m = new T.Mesh(new T.CylinderGeometry(p.r, p.r * 0.92, 26, 12).rotateX(Math.PI / 2).translate(0, 0, 13), std({ color: 0x5a3e26 })); g.add(m);
    for (const z of [5, 21]) { const h = new T.Mesh(GEO.cyl, std({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.6 })); h.scale.set(p.r + 0.6, p.r + 0.6, 2); h.position.z = z; g.add(h); }
    return g;
  },
  crate(p) {
    const g = new T.Group();
    const m = new T.Mesh(GEO.boxUp, std({ color: 0x6a4e30 })); m.scale.set(p.w, p.h, p.w); g.add(m);
    for (const s of [-1, 1]) { const b = new T.Mesh(GEO.box, std({ color: 0x4a3420 })); b.scale.set(p.w + 1, 4, p.w + 1); b.position.set(0, s * p.h * 0.3, p.w / 2); g.add(b); }
    return g;
  },
  snowball(p) {
    const g = new T.Group();
    const m = new T.Mesh(new T.IcosahedronGeometry(p.r, 1), std({ color: 0xf0f6ff, roughness: 0.8, flatShading: true })); m.position.z = p.r * 0.9; g.add(m);
    return g;
  },
  pew(p) {
    const g = new T.Group();
    const wood = std({ color: 0x4a2e1e });
    const seat = new T.Mesh(GEO.boxUp, wood); seat.scale.set(p.w, p.h, 16); g.add(seat);
    const back = new T.Mesh(GEO.boxUp, wood); back.scale.set(p.w, 5, 34); back.position.set(0, p.h * 0.5, 0); g.add(back);
    for (const s of [-1, 1]) { const e = new T.Mesh(GEO.boxUp, std({ color: 0x3a2216 })); e.scale.set(5, p.h + 4, 38); e.position.x = s * p.w / 2; g.add(e); }
    return g;
  },
};

// ── The beacon ───────────────────────────────────────────────────────────
function buildBeacon(group, b, look) {
  const g = new T.Group();
  g.position.set(b.x, -b.y, 0);
  const stone = std({ color: look === "pass" ? 0x6a7282 : look === "ashwood" ? 0x3a3230 : 0x5a5a64 });
  const base = new T.Mesh(GEO.cyl6, stone); base.scale.set(46, 46, 20); g.add(base);
  const col = new T.Mesh(GEO.taper, stone); col.scale.set(26, 26, 120); col.position.z = 20; g.add(col);
  const bowl = new T.Mesh(new T.CylinderGeometry(40, 22, 22, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, 11), std({ color: 0x3a342e, metalness: 0.6, roughness: 0.5, side: T.DoubleSide }));
  bowl.position.z = 140; g.add(bowl);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = new T.Mesh(GEO.box, stone); r.scale.set(8, 8, 60); r.position.set(Math.cos(a) * 30, Math.sin(a) * 30, 110); r.rotation.set(Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0); g.add(r);
  }
  // A dim coal while unlit.
  const ember = new T.Mesh(GEO.sph, new T.MeshBasicMaterial({ color: 0xff7a30 })); ember.scale.set(14, 14, 5); ember.position.z = 152; g.add(ember);
  const fire = new T.Sprite(new T.SpriteMaterial({ map: flameTexture(), blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  fire.position.z = 190; fire.visible = false; g.add(fire);
  const fireGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: 0xffc070, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  fireGlow.position.z = 180; g.add(fireGlow);
  const pillar = new T.Mesh(new T.CylinderGeometry(30, 60, 1600, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, 900), new T.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
  pillar.visible = false; g.add(pillar);
  const light = new T.PointLight(0xffc070, 0, 1600, 1.6); light.position.z = 200; g.add(light);
  group.add(g);
  return { g, fire, fireGlow, pillar, light, ember };
}

// ── Ambient particles ────────────────────────────────────────────────────
function ambientPoints(look, W, H, rnd, hi) {
  const cfg = {
    churchyard: { n: 90, color: 0xc6ff7a, size: 7, kind: "fly" },
    mill: { n: 140, color: 0x9aff9a, size: 6, kind: "fly" },
    ashwood: { n: 420, color: 0xff9a40, size: 6, kind: "ember" },
    pass: { n: 700, color: 0xffffff, size: 5, kind: "snow" },
    cathedral: { n: 220, color: 0xd8d0ff, size: 5, kind: "dust" },
  }[look];
  const n = hi ? cfg.n : Math.round(cfg.n * 0.5);
  const pos = new Float32Array(n * 3);
  const seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ x: rnd() * W, y: rnd() * H, z: rnd() * 160, p: rnd() * 6.28, q: rnd() * 6.28, v: 0.5 + rnd() });
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ color: cfg.color, size: cfg.size, map: glowTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, sizeAttenuation: true, opacity: cfg.kind === "snow" ? 0.85 : 1 });
  const obj = new T.Points(geo, mat);
  obj.frustumCulled = false;
  // Weather lives around the camera, fireflies stay where they are.
  const update = (t, dt, focus) => {
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      let x, y, z;
      if (cfg.kind === "fly") {
        x = s.x + Math.sin(t * 0.7 + s.p) * 30; y = s.y + Math.cos(t * 0.5 + s.q) * 24; z = 18 + (s.z % 50) + Math.sin(t * 1.3 + s.q) * 8;
      } else {
        const spanX = 1500, spanY = 1100;
        if (cfg.kind === "snow") { s.z -= 30 * s.v * dt; s.x += Math.sin(t * 0.8 + s.p) * 12 * dt + 8 * dt; }
        else if (cfg.kind === "ember") { s.z += 26 * s.v * dt; s.x += Math.sin(t + s.p) * 14 * dt; }
        else { s.z += Math.sin(t * 0.3 + s.p) * 4 * dt; }
        if (s.z < 0) s.z += 220; if (s.z > 220) s.z -= 220;
        x = focus.x + ((((s.x - focus.x) % spanX) + spanX * 1.5) % spanX) - spanX / 2;
        y = focus.y + ((((s.y - focus.y) % spanY) + spanY * 1.5) % spanY) - spanY / 2;
        z = s.z;
      }
      pos[i * 3] = x; pos[i * 3 + 1] = -y; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    if (cfg.kind === "fly") mat.opacity = 0.7 + Math.sin(t * 2.2) * 0.3;
  };
  return { obj, update };
}

for (const [look, m] of Object.entries(PLUG)) {
  LOOKS[look] = m.look;
  PAINT[look] = m.paint;
  WALLS[look] = m.walls;
  OUTSIDE[look] = m.outside;
  Object.assign(PROPS, m.props);
  Object.assign(DECOR, m.decor);
  Object.assign(PROP_MESH, m.propMesh);
}
