import * as T from "three";
import { buildHero, monsterFigure } from "./rigs.js";
import { HEROES } from "../data/meta.js";
import { mulberry } from "../config.js";

// ── Menu art ─────────────────────────────────────────────────────────────
// Hero portraits are the in-game figures rendered once by a small offscreen
// renderer; stage vignettes are painted silhouettes on a canvas. Both are
// cached as data URLs for the DOM screens.

const cache = new Map();

export function heroPortraits() {
  if (cache.has("heroes")) return cache.get("heroes");
  const out = {};
  const W = 220, H = 300;
  let r;
  try {
    r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch { return out; }
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  r.toneMapping = T.ACESFilmicToneMapping;
  const cam = new T.PerspectiveCamera(30, W / H, 1, 1000);
  cam.up.set(0, 0, 1);
  for (const h of HEROES) {
    const scene = new T.Scene();
    scene.add(new T.AmbientLight(0x6a5a7a, 1.6));
    const key = new T.PointLight(0xffc070, 9000, 400, 1.6); key.position.set(-40, 60, 70); scene.add(key);
    const rim = new T.DirectionalLight(0x8aa0ff, 2.2); rim.position.set(60, -80, 60); scene.add(rim);
    const fig = buildHero(h);
    fig.g.rotation.z = 0.5;                            // face the camera, a little turned
    fig.armR.rotation.x = -0.5;
    scene.add(fig.g);
    cam.position.set(0, 120, 40);
    cam.lookAt(0, 0, 20);
    r.render(scene, cam);
    out[h.id] = r.domElement.toDataURL("image/png");
    scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }
  r.dispose();
  r.forceContextLoss?.();
  cache.set("heroes", out);
  return out;
}

// Bestiary portraits: each monster rig posed and rendered once, framed to
// its own size.
export function monsterPortraits(ids) {
  const out = cache.get("monsters") || {};
  const todo = ids.filter((id) => !out[id]);
  if (!todo.length) return out;
  const S = 150;
  let r;
  try { r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return out; }
  r.setPixelRatio(1); r.setSize(S, S, false);
  r.toneMapping = T.ACESFilmicToneMapping;
  const cam = new T.PerspectiveCamera(28, 1, 1, 5000);
  cam.up.set(0, 0, 1);
  const box = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
  for (const id of todo) {
    const scene = new T.Scene();
    scene.add(new T.AmbientLight(0x8a7a9a, 1.8));
    const key = new T.DirectionalLight(0xffd8a0, 2.4); key.position.set(-1, 2, 2); scene.add(key);
    const rim = new T.DirectionalLight(0x8aa0ff, 1.6); rim.position.set(2, -1, 1.5); scene.add(rim);
    const fig = monsterFigure(id);
    const holder = new T.Group(); holder.add(fig); holder.rotation.z = 0.55;
    scene.add(holder);
    holder.updateMatrixWorld(true);
    box.setFromObject(holder); box.getCenter(c); box.getSize(sz);
    const radius = Math.max(sz.x, sz.y, sz.z) * 0.62 + 2;
    const dist = radius / Math.tan((28 * Math.PI) / 360);
    cam.position.set(c.x, c.y + dist * 0.88, c.z + dist * 0.45);
    cam.lookAt(c);
    r.render(scene, cam);
    out[id] = r.domElement.toDataURL("image/png");
    scene.traverse((o) => o.material?.dispose?.());
  }
  r.dispose(); r.forceContextLoss?.();
  cache.set("monsters", out);
  return out;
}

// Painted vignettes: sky, moon, far silhouettes and the stage's landmark.
const SCENES = {
  churchyard: { sky: ["#0c0a1e", "#2a2448", "#5a4a5a"], moon: "#f0e2c4", far: "#1a1622", near: "#0a080e",
    draw(c, w, h, rnd) {
      // Hill, a ruined chapel with a bell tower, crosses and yews.
      c.fillStyle = "#120e18";
      c.beginPath(); c.moveTo(0, h * 0.8); c.quadraticCurveTo(w * 0.5, h * 0.5, w, h * 0.78); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = "#0a080e";
      c.fillRect(w * 0.56, h * 0.36, w * 0.22, h * 0.3);
      c.fillRect(w * 0.6, h * 0.2, w * 0.06, h * 0.2);
      c.beginPath(); c.moveTo(w * 0.595, h * 0.2); c.lineTo(w * 0.63, h * 0.1); c.lineTo(w * 0.665, h * 0.2); c.fill();
      c.beginPath(); c.moveTo(w * 0.55, h * 0.37); c.lineTo(w * 0.67, h * 0.27); c.lineTo(w * 0.79, h * 0.37); c.fill();
      c.fillStyle = "#ffb050"; c.fillRect(w * 0.615, h * 0.24, w * 0.03, h * 0.05);
      for (let i = 0; i < 9; i++) {
        const x = rnd() * w, y = h * (0.72 + rnd() * 0.2);
        c.fillStyle = "#0a080e"; c.fillRect(x, y - 16, 3, 16); c.fillRect(x - 5, y - 12, 13, 3);
      }
      for (const x of [0.12, 0.3, 0.9]) { c.beginPath(); c.ellipse(w * x, h * 0.7, 14, 34, 0, 0, 6.3); c.fill(); }
    } },
  mill: { sky: ["#06100c", "#18302a", "#3a5244"], moon: "#e0f0d0", far: "#0e1a14", near: "#060c09",
    draw(c, w, h) {
      c.fillStyle = "#1a2e28"; c.fillRect(0, h * 0.72, w, h * 0.28);
      c.fillStyle = "rgba(180,220,200,0.12)"; for (let i = 0; i < 6; i++) c.fillRect(w * (0.1 + i * 0.14), h * (0.78 + (i % 2) * 0.05), w * 0.08, 1.5);
      c.fillStyle = "#060c09";
      c.fillRect(w * 0.3, h * 0.38, w * 0.3, h * 0.36);
      c.beginPath(); c.moveTo(w * 0.27, h * 0.4); c.lineTo(w * 0.45, h * 0.22); c.lineTo(w * 0.63, h * 0.4); c.fill();
      c.strokeStyle = "#060c09"; c.lineWidth = 4;
      c.beginPath(); c.arc(w * 0.68, h * 0.58, h * 0.16, 0, 6.3); c.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.3; c.beginPath(); c.moveTo(w * 0.68, h * 0.58); c.lineTo(w * 0.68 + Math.cos(a) * h * 0.16, h * 0.58 + Math.sin(a) * h * 0.16); c.stroke(); }
      c.fillStyle = "#ffc070"; c.fillRect(w * 0.37, h * 0.5, 8, 10); c.fillRect(w * 0.5, h * 0.5, 8, 10);
    } },
  ashwood: { sky: ["#120404", "#4a1408", "#a0400e"], moon: "#ffb070", far: "#200806", near: "#0c0302",
    draw(c, w, h, rnd) {
      for (let i = 0; i < 14; i++) {
        const x = rnd() * w, th = h * (0.3 + rnd() * 0.4);
        c.fillStyle = "#0c0302"; c.fillRect(x, h - th, 5 + rnd() * 5, th);
        c.strokeStyle = "#0c0302"; c.lineWidth = 2.5;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + 3, h - th * (0.5 + k * 0.15)); c.lineTo(x + 3 + (rnd() - 0.5) * 40, h - th * (0.65 + k * 0.15)); c.stroke(); }
        if (rnd() < 0.5) { const g = c.createRadialGradient(x, h - th, 0, x, h - th, 22); g.addColorStop(0, "rgba(255,170,60,0.9)"); g.addColorStop(1, "rgba(255,80,0,0)"); c.fillStyle = g; c.fillRect(x - 22, h - th - 22, 44, 44); }
      }
      c.fillStyle = "#0c0302"; c.fillRect(0, h * 0.9, w, h * 0.1);
    } },
  pass: { sky: ["#080e1e", "#1e3252", "#6a86aa"], moon: "#ffffff", far: "#3a4a66", near: "#dfe8f4",
    draw(c, w, h, rnd) {
      c.fillStyle = "#2a3a56";
      c.beginPath(); c.moveTo(0, h * 0.75); c.lineTo(w * 0.25, h * 0.3); c.lineTo(w * 0.45, h * 0.6); c.lineTo(w * 0.7, h * 0.22); c.lineTo(w, h * 0.65); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = "#e8eef8";
      c.beginPath(); c.moveTo(w * 0.62, h * 0.33); c.lineTo(w * 0.7, h * 0.22); c.lineTo(w * 0.78, h * 0.34); c.lineTo(w * 0.7, h * 0.3); c.fill();
      c.beginPath(); c.moveTo(w * 0.18, h * 0.42); c.lineTo(w * 0.25, h * 0.3); c.lineTo(w * 0.31, h * 0.4); c.fill();
      c.fillStyle = "#c8d4e6"; c.fillRect(0, h * 0.84, w, h * 0.16);
      for (let i = 0; i < 8; i++) { const x = rnd() * w, s = 10 + rnd() * 10; c.fillStyle = "#12202a"; c.beginPath(); c.moveTo(x, h * 0.86 - s * 3); c.lineTo(x + s, h * 0.86); c.lineTo(x - s, h * 0.86); c.fill(); }
    } },
  cathedral: { sky: ["#08040e", "#20123a", "#4a2e6a"], moon: "#e8e0ff", far: "#140a22", near: "#07040c",
    draw(c, w, h) {
      c.fillStyle = "#07040c";
      c.fillRect(w * 0.3, h * 0.35, w * 0.4, h * 0.65);
      for (const [x, tw, th] of [[0.3, 0.07, 0.62], [0.63, 0.07, 0.62], [0.47, 0.06, 0.8]]) {
        c.fillRect(w * x, h * (1 - th), w * tw, h * th);
        c.beginPath(); c.moveTo(w * x - 2, h * (1 - th)); c.lineTo(w * (x + tw / 2), h * (1 - th - 0.14)); c.lineTo(w * (x + tw) + 2, h * (1 - th)); c.fill();
      }
      const rg = c.createRadialGradient(w * 0.5, h * 0.55, 2, w * 0.5, h * 0.55, h * 0.1);
      rg.addColorStop(0, "#fff0ff"); rg.addColorStop(0.5, "#a070ff"); rg.addColorStop(1, "#3a1a6a");
      c.fillStyle = rg; c.beginPath(); c.arc(w * 0.5, h * 0.55, h * 0.08, 0, 6.3); c.fill();
      c.fillStyle = "#6a4aa0"; for (const x of [0.36, 0.6]) { c.beginPath(); c.moveTo(w * x, h * 0.75); c.lineTo(w * x, h * 0.6); c.arc(w * (x + 0.02), h * 0.6, w * 0.02, Math.PI, 0); c.lineTo(w * (x + 0.04), h * 0.75); c.fill(); }
    } },
};

export function stageVignette(look, lit, blood) {
  const key = `${look}|${lit}|${blood}`;
  if (cache.has(key)) return cache.get(key);
  const w = 360, h = 220;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  const S = SCENES[look];
  const rnd = mulberry(look.length * 31 + 7);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, S.sky[0]); g.addColorStop(0.6, S.sky[1]); g.addColorStop(1, S.sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`; c.fillRect(rnd() * w, rnd() * h * 0.5, 1, 1); }
  const mx = w * 0.22, my = h * 0.24;
  const halo = c.createRadialGradient(mx, my, 6, mx, my, 60);
  halo.addColorStop(0, blood ? "rgba(255,80,80,0.5)" : "rgba(255,240,220,0.35)"); halo.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = halo; c.fillRect(0, 0, w, h);
  c.fillStyle = blood ? "#e03030" : S.moon;
  c.beginPath(); c.arc(mx, my, 16, 0, 6.3); c.fill();
  c.fillStyle = S.far;
  c.beginPath(); c.moveTo(0, h * 0.66);
  for (let x = 0; x <= w; x += 12) c.lineTo(x, h * 0.62 - Math.abs(Math.sin(x * 0.03 + look.length)) * 22);
  c.lineTo(w, h); c.lineTo(0, h); c.fill();
  S.draw(c, w, h, rnd);
  // The beacon on the ridge: dark, or burning once lit.
  const bx = w * 0.86, by = h * 0.5;
  c.fillStyle = "#050305"; c.fillRect(bx - 4, by, 8, h * 0.3); c.fillRect(bx - 10, by - 4, 20, 6);
  if (lit) {
    const fg = c.createRadialGradient(bx, by - 10, 1, bx, by - 10, 40);
    fg.addColorStop(0, blood ? "rgba(255,210,210,1)" : "rgba(255,245,200,1)"); fg.addColorStop(0.3, blood ? "rgba(255,60,60,0.8)" : "rgba(255,170,60,0.8)"); fg.addColorStop(1, "rgba(255,80,0,0)");
    c.fillStyle = fg; c.fillRect(bx - 40, by - 50, 80, 80);
  }
  const vg = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)");
  c.fillStyle = vg; c.fillRect(0, 0, w, h);
  const url = cv.toDataURL("image/jpeg", 0.85);
  cache.set(key, url);
  return url;
}
