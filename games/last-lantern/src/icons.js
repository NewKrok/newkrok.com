// ── Icons ────────────────────────────────────────────────────────────────
// Every icon is a few canvas paths, drawn in a unit box (−1…1) and scaled.
// The HUD draws them straight onto its canvas; the DOM screens use cached
// data URLs of the same drawings.

const TAU = Math.PI * 2;

function line(c, pts, w, col) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
}
function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
function circ(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

const D = {
  flail(c) {
    line(c, [[-0.7, 0.8], [-0.1, 0.1]], 0.14, "#8a6a4a");
    line(c, [[-0.1, 0.1], [0.25, -0.2], [0.4, -0.4]], 0.06, "#c9d1d9");
    circ(c, 0.48, -0.5, 0.3, "#ffd166"); circ(c, 0.48, -0.5, 0.16, "#fff3c0");
    c.strokeStyle = "rgba(255,180,70,0.7)"; c.lineWidth = 0.08; c.beginPath(); c.arc(-0.1, 0.1, 0.8, -1.9, -0.4); c.stroke();
  },
  sunflail(c) { D.flail(c); c.strokeStyle = "#ff8a3a"; c.lineWidth = 0.1; c.beginPath(); c.arc(-0.1, 0.1, 0.95, -2.3, 0); c.stroke(); },
  crossbow(c) {
    line(c, [[-0.8, -0.2], [0, -0.6], [0.8, -0.2]], 0.12, "#8a6a4a");
    line(c, [[-0.8, -0.2], [0.8, -0.2]], 0.04, "#e6e1cf");
    line(c, [[0, -0.7], [0, 0.85]], 0.16, "#6a4e30");
    poly(c, [[0, -0.95], [-0.12, -0.7], [0.12, -0.7]], "#9fd0ff");
  },
  dawnbreaker(c) { D.crossbow(c); circ(c, 0, -0.9, 0.18, "#fff3c0"); },
  knives(c) {
    for (const a of [-0.35, 0, 0.35]) {
      c.save(); c.rotate(a);
      poly(c, [[0, -0.95], [0.12, -0.2], [-0.12, -0.2]], "#e6edf3");
      line(c, [[0, -0.2], [0, 0.5]], 0.12, "#6a4e30");
      c.restore();
    }
  },
  edges(c) { for (let i = 0; i < 6; i++) { c.save(); c.rotate((i / 6) * TAU); poly(c, [[0, -0.95], [0.1, -0.35], [-0.1, -0.35]], "#ffffff"); c.restore(); } circ(c, 0, 0, 0.2, "#c9d1d9"); },
  bell(c) {
    poly(c, [[-0.6, 0.55], [-0.45, -0.3], [-0.2, -0.65], [0.2, -0.65], [0.45, -0.3], [0.6, 0.55]], "#e0c070");
    line(c, [[-0.7, 0.55], [0.7, 0.55]], 0.14, "#c9a35a");
    circ(c, 0, 0.72, 0.13, "#8a6a3a");
    line(c, [[0, -0.65], [0, -0.85]], 0.1, "#8a6a3a");
  },
  toll(c) { D.bell(c); c.strokeStyle = "#ffe9a8"; c.lineWidth = 0.07; c.beginPath(); c.arc(0, 0, 0.95, 0, TAU); c.stroke(); },
  spades(c) {
    for (let i = 0; i < 3; i++) {
      c.save(); c.rotate((i / 3) * TAU);
      poly(c, [[0, -0.95], [0.22, -0.7], [0.18, -0.45], [-0.18, -0.45], [-0.22, -0.7]], "#c9d4e0");
      line(c, [[0, -0.45], [0, -0.2]], 0.08, "#8a6a4a");
      c.restore();
    }
    circ(c, 0, 0, 0.14, "#ffd166");
  },
  halo(c) { c.strokeStyle = "#dfe8f0"; c.lineWidth = 0.14; c.beginPath(); c.arc(0, 0, 0.72, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; circ(c, Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.13, "#9aa8b8"); } },
  storm(c) {
    circ(c, -0.25, -0.45, 0.35, "#5a6480"); circ(c, 0.25, -0.5, 0.4, "#5a6480"); circ(c, 0.05, -0.25, 0.35, "#6a7490");
    poly(c, [[0.1, -0.2], [-0.25, 0.3], [0, 0.3], [-0.15, 0.9], [0.35, 0.15], [0.08, 0.15], [0.25, -0.2]], "#ffe066");
  },
  wrath(c) { D.storm(c); poly(c, [[0.55, -0.1], [0.4, 0.3], [0.55, 0.3], [0.45, 0.7], [0.75, 0.2], [0.6, 0.2], [0.7, -0.1]], "#fff3a0"); },
  water(c) {
    poly(c, [[-0.18, -0.85], [0.18, -0.85], [0.18, -0.45], [0.55, 0.1], [0.5, 0.75], [-0.5, 0.75], [-0.55, 0.1], [-0.18, -0.45]], "#7ad8ff");
    poly(c, [[-0.5, 0.2], [0.5, 0.2], [0.5, 0.75], [-0.5, 0.75]], "#3aa8e0");
    line(c, [[0, 0.3], [0, 0.65]], 0.08, "#ffffff"); line(c, [[-0.15, 0.45], [0.15, 0.45]], 0.08, "#ffffff");
    poly(c, [[-0.22, -0.95], [0.22, -0.95], [0.22, -0.82], [-0.22, -0.82]], "#8a6a4a");
  },
  font(c) { D.water(c); c.strokeStyle = "#b8f0ff"; c.lineWidth = 0.06; c.beginPath(); c.ellipse(0, 0.85, 0.9, 0.18, 0, 0, TAU); c.stroke(); },
  hook(c) {
    line(c, [[-0.8, -0.8], [-0.2, -0.2]], 0.07, "#8b949e");
    c.strokeStyle = "#d2a8ff"; c.lineWidth = 0.16; c.lineCap = "round";
    c.beginPath(); c.arc(0.15, 0.25, 0.45, -2.4, 1.6); c.stroke();
    poly(c, [[0.2, 0.7], [0.0, 0.52], [0.3, 0.5]], "#d2a8ff");
  },
  reaper(c) { D.hook(c); circ(c, 0.55, -0.5, 0.2, "#e8c8ff"); },
  // Passives.
  boots(c) { poly(c, [[-0.35, -0.8], [0.15, -0.8], [0.15, 0.3], [0.7, 0.45], [0.7, 0.8], [-0.35, 0.8]], "#7ee787"); line(c, [[-0.8, -0.2], [-0.5, -0.2]], 0.08, "#ffffff"); line(c, [[-0.9, 0.2], [-0.5, 0.2]], 0.08, "#ffffff"); },
  heart(c) { c.fillStyle = "#ff7b72"; c.beginPath(); c.moveTo(0, 0.8); c.bezierCurveTo(-1, 0.1, -0.6, -0.9, 0, -0.35); c.bezierCurveTo(0.6, -0.9, 1, 0.1, 0, 0.8); c.fill(); circ(c, 0, 0.05, 0.2, "#3a1a1a"); },
  magnet(c) { c.strokeStyle = "#d84a4a"; c.lineWidth = 0.35; c.beginPath(); c.arc(0, -0.05, 0.5, Math.PI, 0); c.stroke(); line(c, [[-0.5, -0.05], [-0.5, 0.6]], 0.35, "#d84a4a"); line(c, [[0.5, -0.05], [0.5, 0.6]], 0.35, "#d84a4a"); line(c, [[-0.5, 0.45], [-0.5, 0.75]], 0.36, "#e6edf3"); line(c, [[0.5, 0.45], [0.5, 0.75]], 0.36, "#e6edf3"); },
  tome(c) { poly(c, [[-0.7, -0.75], [0.6, -0.75], [0.7, 0.75], [-0.6, 0.75]], "#6a4a8a"); poly(c, [[-0.5, -0.6], [0.5, -0.6], [0.55, 0.6], [-0.45, 0.6]], "#d2a8ff"); line(c, [[-0.25, -0.2], [0.3, -0.2]], 0.08, "#6a4a8a"); line(c, [[-0.25, 0.1], [0.3, 0.1]], 0.08, "#6a4a8a"); },
  fist(c) { poly(c, [[-0.6, -0.4], [0.5, -0.5], [0.65, 0.1], [0.4, 0.75], [-0.5, 0.75], [-0.7, 0.2]], "#ffa657"); for (let i = 0; i < 4; i++) line(c, [[-0.45 + i * 0.3, -0.45], [-0.45 + i * 0.3, -0.1]], 0.06, "#8a4a1a"); },
  plate(c) { poly(c, [[0, -0.9], [0.7, -0.55], [0.6, 0.35], [0, 0.9], [-0.6, 0.35], [-0.7, -0.55]], "#8b949e"); poly(c, [[0, -0.6], [0.4, -0.35], [0.35, 0.25], [0, 0.6], [-0.35, 0.25], [-0.4, -0.35]], "#5a616a"); line(c, [[0, -0.4], [0, 0.4]], 0.1, "#c9d1d9"); line(c, [[-0.25, -0.1], [0.25, -0.1]], 0.1, "#c9d1d9"); },
  root(c) { poly(c, [[-0.2, -0.5], [0.2, -0.5], [0.35, 0.1], [0.1, 0.9], [-0.1, 0.9], [-0.35, 0.1]], "#c9a36a"); line(c, [[0, -0.5], [-0.35, -0.9]], 0.1, "#3fb950"); line(c, [[0, -0.5], [0.35, -0.9]], 0.1, "#3fb950"); line(c, [[0, -0.5], [0, -0.95]], 0.1, "#3fb950"); },
  oil(c) { poly(c, [[-0.5, -0.1], [0.5, -0.1], [0.6, 0.8], [-0.6, 0.8]], "#8a6a3a"); line(c, [[0, -0.1], [0, -0.45]], 0.14, "#8a6a3a"); c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(0, -0.95); c.quadraticCurveTo(0.25, -0.6, 0, -0.5); c.quadraticCurveTo(-0.25, -0.6, 0, -0.95); c.fill(); },
  clover(c) { for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.785; circ(c, Math.cos(a) * 0.38, Math.sin(a) * 0.38 - 0.1, 0.32, "#56d364"); } line(c, [[0, -0.1], [0.25, 0.85]], 0.1, "#3a8a44"); },
  quiver(c) { poly(c, [[-0.3, -0.3], [0.3, -0.3], [0.25, 0.9], [-0.25, 0.9]], "#8a5a2b"); for (const x of [-0.18, 0, 0.18]) { line(c, [[x, -0.3], [x, -0.8]], 0.06, "#c9d1d9"); poly(c, [[x, -0.95], [x + 0.1, -0.75], [x - 0.1, -0.75]], "#e3b341"); } },
  // Abilities.
  flare(c) { for (let i = 0; i < 12; i++) { c.save(); c.rotate((i / 12) * TAU); poly(c, [[0, -0.95], [0.1, -0.5], [-0.1, -0.5]], "#ffe9a8"); c.restore(); } circ(c, 0, 0, 0.45, "#ffd166"); circ(c, 0, 0, 0.25, "#fffbe0"); },
  tumble(c) { c.strokeStyle = "#7ee787"; c.lineWidth = 0.14; c.beginPath(); c.arc(0, 0, 0.6, -2.5, 1.8); c.stroke(); poly(c, [[-0.1, 0.55], [-0.45, 0.85], [-0.4, 0.35]], "#7ee787"); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; circ(c, Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.07, "#9fd0ff"); } },
  sanctuary(c) { c.fillStyle = "rgba(255,233,168,0.35)"; c.beginPath(); c.arc(0, 0.4, 0.9, Math.PI, 0); c.fill(); c.strokeStyle = "#ffe9a8"; c.lineWidth = 0.08; c.stroke(); line(c, [[0, -0.4], [0, 0.4]], 0.14, "#ffd166"); line(c, [[-0.25, -0.15], [0.25, -0.15]], 0.14, "#ffd166"); },
  dig(c) { poly(c, [[-0.9, 0.35], [0.9, 0.35], [0.9, 0.9], [-0.9, 0.9]], "#6a5040"); line(c, [[0.5, -0.9], [0, 0.2]], 0.1, "#8a6a4a"); poly(c, [[-0.2, 0.1], [0.15, 0.25], [0.05, 0.6], [-0.3, 0.45]], "#c9d4e0"); },
  // Pickups and misc.
  ember(c) { circ(c, 0, 0, 0.75, "#ff8a3a"); circ(c, 0, 0, 0.5, "#ffb040"); c.fillStyle = "#fff0c0"; c.beginPath(); c.moveTo(0, -0.45); c.quadraticCurveTo(0.3, 0, 0, 0.35); c.quadraticCurveTo(-0.3, 0, 0, -0.45); c.fill(); },
  skull(c) { circ(c, 0, -0.15, 0.62, "#e6e1cf"); poly(c, [[-0.35, 0.3], [0.35, 0.3], [0.3, 0.75], [-0.3, 0.75]], "#e6e1cf"); circ(c, -0.24, -0.15, 0.17, "#1a1d24"); circ(c, 0.24, -0.15, 0.17, "#1a1d24"); poly(c, [[0, 0.05], [0.08, 0.2], [-0.08, 0.2]], "#1a1d24"); },
  lock(c) { c.strokeStyle = "#9aa6b6"; c.lineWidth = 0.18; c.beginPath(); c.arc(0, -0.2, 0.38, Math.PI, 0); c.stroke(); poly(c, [[-0.55, -0.2], [0.55, -0.2], [0.55, 0.75], [-0.55, 0.75]], "#9aa6b6"); circ(c, 0, 0.25, 0.12, "#2a2f38"); },
  // Hearth upgrades reuse the passive drawings where they fit.
  might(c) { D.fist(c); }, vitality(c) { D.heart(c); }, armor(c) { D.plate(c); }, recovery(c) { D.root(c); }, swift(c) { D.boots(c); },
  reach(c) { D.magnet(c); }, growth(c) { poly(c, [[0, -0.9], [0.55, -0.1], [0.2, -0.1], [0.2, 0.8], [-0.2, 0.8], [-0.2, -0.1], [-0.55, -0.1]], "#58a6ff"); },
  greed(c) { D.ember(c); }, luck(c) { D.clover(c); }, haste(c) { c.strokeStyle = "#d2a8ff"; c.lineWidth = 0.14; c.beginPath(); c.arc(0, 0, 0.75, 0, TAU); c.stroke(); line(c, [[0, 0], [0, -0.5]], 0.12, "#d2a8ff"); line(c, [[0, 0], [0.35, 0.2]], 0.12, "#d2a8ff"); },
  reroll(c) { c.strokeStyle = "#79c0ff"; c.lineWidth = 0.16; c.beginPath(); c.arc(0, 0, 0.6, 0.3, 5.2); c.stroke(); poly(c, [[0.62, -0.15], [0.95, 0.2], [0.35, 0.3]], "#79c0ff"); },
  banish(c) { D.skull(c); line(c, [[-0.85, -0.85], [0.85, 0.85]], 0.14, "#ff6b6b"); },
  revival(c) { c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(0, -0.95); c.bezierCurveTo(0.7, -0.3, 0.6, 0.6, 0, 0.9); c.bezierCurveTo(-0.6, 0.6, -0.7, -0.3, 0, -0.95); c.fill(); c.fillStyle = "#fff3c0"; c.beginPath(); c.moveTo(0, -0.3); c.bezierCurveTo(0.3, 0, 0.25, 0.5, 0, 0.6); c.bezierCurveTo(-0.25, 0.5, -0.3, 0, 0, -0.3); c.fill(); },
  gold(c) { D.ember(c); }, heal(c) { poly(c, [[-0.7, 0.1], [0.7, 0.1], [0.5, 0.6], [-0.5, 0.6]], "#c8904a"); c.fillStyle = "#e0a060"; c.beginPath(); c.ellipse(0, 0.1, 0.7, 0.35, 0, Math.PI, 0); c.fill(); },
};

export function drawIcon(c, id, x, y, size) {
  const f = D[id];
  if (!f) return;
  c.save();
  c.translate(x, y);
  c.scale(size / 2, size / 2);
  f(c);
  c.restore();
}

const cache = new Map();
export function iconURL(id, size = 64) {
  const key = id + "@" + size;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  drawIcon(cv.getContext("2d"), id, size / 2, size / 2, size * 0.86);
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}
