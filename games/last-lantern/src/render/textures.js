import * as T from "three";
import { mulberry } from "../config.js";

// ── Painted textures ─────────────────────────────────────────────────────
// No image files: skies, grounds, glows and detail maps are painted on
// canvases when a stage loads.

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
export function tex(cv, { srgb = true, repeat = 0 } = {}) {
  const t = new T.CanvasTexture(cv);
  t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 8;
  return t;
}

// A soft round glow for additive sprites (lanterns, gems, sparks).
let _glow = null;
export function glowTexture() {
  if (_glow) return _glow;
  const cv = canvas(128, 128), c = cv.getContext("2d");
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.75)");
  g.addColorStop(0.45, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  _glow = tex(cv);
  return _glow;
}

// A flame tongue for fire sprites.
let _flame = null;
export function flameTexture() {
  if (_flame) return _flame;
  const cv = canvas(64, 128), c = cv.getContext("2d");
  const g = c.createRadialGradient(32, 96, 2, 32, 80, 60);
  g.addColorStop(0, "rgba(255,245,200,1)");
  g.addColorStop(0.3, "rgba(255,170,60,0.9)");
  g.addColorStop(0.7, "rgba(200,60,10,0.35)");
  g.addColorStop(1, "rgba(120,20,0,0)");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(32, 4);
  c.bezierCurveTo(52, 50, 60, 80, 56, 100);
  c.bezierCurveTo(52, 124, 12, 124, 8, 100);
  c.bezierCurveTo(4, 80, 12, 50, 32, 4);
  c.fill();
  _flame = tex(cv);
  return _flame;
}

// Tiling grey noise: bump detail for grounds, so close-ups are not blurry.
export function detailTexture(seed = 1, kind = "grain") {
  const S = 256, cv = canvas(S, S), c = cv.getContext("2d");
  const rnd = mulberry(seed);
  c.fillStyle = "#808080";
  c.fillRect(0, 0, S, S);
  const n = kind === "tiles" ? 900 : 2600;
  for (let i = 0; i < n; i++) {
    const v = Math.floor(90 + rnd() * 80);
    c.fillStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.4})`;
    const x = rnd() * S, y = rnd() * S, r = 0.8 + rnd() * (kind === "snow" ? 5 : 3);
    for (const [ox, oy] of [[0, 0], [S, 0], [0, S], [-S, 0], [0, -S]]) {
      c.beginPath(); c.ellipse(x + ox, y + oy, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 6.3); c.fill();
    }
  }
  if (kind === "tiles") {
    c.strokeStyle = "rgba(40,40,40,0.9)";
    c.lineWidth = 3;
    for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(0, k * 64); c.lineTo(S, k * 64); c.stroke(); }
    for (let r = 0; r < 4; r++) for (let k = 0; k <= 2; k++) {
      const x = k * 128 + (r % 2) * 64;
      c.beginPath(); c.moveTo(x, r * 64); c.lineTo(x, r * 64 + 64); c.stroke();
    }
  }
  return tex(cv, { srgb: false, repeat: 1 });
}

// Sky dome: gradient, stars, a moon (or a red glow for Ashwood) and a far
// silhouette band on the horizon.
export function skyTexture(look) {
  const W = 2048, H = 1024;
  const cv = canvas(W, H), c = cv.getContext("2d");
  const P = SKIES[look];
  const g = c.createLinearGradient(0, 0, 0, H);
  P.grad.forEach(([k, col]) => g.addColorStop(k, col));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const rnd = mulberry(look.length * 131);
  for (let i = 0; i < P.stars; i++) {
    const y = rnd() * H * 0.55;
    c.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.7})`;
    const r = rnd() < 0.06 ? 1.8 : 0.9;
    c.beginPath(); c.arc(rnd() * W, y, r, 0, 6.3); c.fill();
  }
  if (P.moon) {
    const [mx, my, mr, col] = P.moon;
    const halo = c.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5);
    halo.addColorStop(0, col.replace("1)", "0.4)"));
    halo.addColorStop(1, col.replace("1)", "0)"));
    c.fillStyle = halo;
    c.beginPath(); c.arc(mx, my, mr * 5, 0, 6.3); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.arc(mx, my, mr, 0, 6.3); c.fill();
    c.fillStyle = "rgba(120,130,170,0.35)";
    for (const [ox, oy, r] of [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.4, 0.1]]) {
      c.beginPath(); c.arc(mx + ox * mr, my + oy * mr, r * mr, 0, 6.3); c.fill();
    }
  }
  // Horizon silhouettes.
  const hz = H * 0.62;
  c.fillStyle = P.far;
  for (let x = 0; x < W; x += 4) {
    const h = P.hills(x, rnd);
    c.fillRect(x, hz - h, 4, h + 4);
  }
  c.fillRect(0, hz, W, H - hz);
  return tex(cv);
}

const SKIES = {
  graveyard: {
    grad: [[0, "#02040a"], [0.42, "#0a1020"], [0.6, "#1a2440"], [1, "#0a0e18"]], stars: 1400,
    moon: [1400, 230, 46, "rgba(232,238,255,1)"], far: "#050710",
    hills: (x) => 18 + Math.abs(Math.sin(x * 0.05) * 14 + Math.sin(x * 0.017) * 22) + (Math.sin(x * 0.31) > 0.93 ? 30 : 0),
  },
  mill: {
    grad: [[0, "#020605"], [0.45, "#0a1612"], [0.6, "#1c3026"], [1, "#08100c"]], stars: 700,
    moon: [600, 260, 38, "rgba(220,240,210,1)"], far: "#040a07",
    hills: (x) => 10 + Math.abs(Math.sin(x * 0.012) * 26) + Math.abs(Math.sin(x * 0.2)) * 6,
  },
  ashwood: {
    grad: [[0, "#070203"], [0.38, "#1a0806"], [0.58, "#5a1e0a"], [0.63, "#8a3210"], [1, "#120604"]], stars: 250,
    moon: [1200, 300, 40, "rgba(255,150,90,1)"], far: "#0a0302",
    hills: (x) => 20 + ((x * 7) % 23) * 1.4 + Math.abs(Math.sin(x * 0.09)) * 30,
  },
  pass: {
    grad: [[0, "#03060e"], [0.4, "#0e1a30"], [0.6, "#34507a"], [1, "#0c1424"]], stars: 1600,
    moon: [900, 200, 52, "rgba(240,248,255,1)"], far: "#0a1222",
    hills: (x) => 40 + Math.abs(((x % 300) - 150)) * 0.5 + Math.sin(x * 0.02) * 30,
  },
  cathedral: {
    grad: [[0, "#040208"], [0.42, "#140a24"], [0.6, "#2a1a44"], [1, "#0a0612"]], stars: 1800,
    moon: [1000, 170, 80, "rgba(226,222,255,1)"], far: "#07040e",
    hills: (x) => 14 + (Math.sin(x * 0.04) > 0.6 ? 70 : 0) + Math.abs(Math.sin(x * 0.013)) * 16,
  },
};

export function mistTexture() {
  const cv = canvas(256, 256), c = cv.getContext("2d");
  const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return tex(cv);
}
