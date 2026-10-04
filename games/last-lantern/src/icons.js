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
  wisps(c) {
    for (const [x, y, r] of [[-0.35, 0.25, 0.3], [0.3, -0.2, 0.38], [0.1, 0.55, 0.22]]) {
      c.fillStyle = "#ff8a3a"; c.beginPath(); c.moveTo(x, y - r * 1.8); c.quadraticCurveTo(x + r, y - r * 0.2, x, y + r); c.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.8); c.fill();
      circ(c, x, y + r * 0.1, r * 0.45, "#fff0c0");
    }
  },
  choir(c) { D.wisps(c); c.strokeStyle = "#ffd8a0"; c.lineWidth = 0.06; c.beginPath(); c.arc(0, 0, 0.92, 0, TAU); c.stroke(); },
  sickle(c) {
    c.strokeStyle = "#d8e0e8"; c.lineWidth = 0.2; c.lineCap = "round";
    c.beginPath(); c.arc(0.05, -0.1, 0.62, -2.6, 0.2); c.stroke();
    line(c, [[0.62, 0.0], [0.25, 0.85]], 0.14, "#6a4020");
  },
  harvest(c) { for (let i = 0; i < 3; i++) { c.save(); c.rotate((i / 3) * TAU); c.strokeStyle = "#ffffff"; c.lineWidth = 0.14; c.beginPath(); c.arc(0, -0.3, 0.5, -2.8, -0.2); c.stroke(); c.restore(); } circ(c, 0, 0, 0.14, "#ffd166"); },
  censer(c) {
    line(c, [[0, -0.95], [0, -0.45]], 0.06, "#8b949e");
    poly(c, [[-0.2, -0.45], [0.2, -0.45], [0.35, -0.25], [-0.35, -0.25]], "#b08a40");
    c.fillStyle = "#c9a35a"; c.beginPath(); c.arc(0, 0.12, 0.45, 0, TAU); c.fill();
    for (const x of [-0.2, 0, 0.2]) circ(c, x, 0.12, 0.07, "#ffb050");
    c.strokeStyle = "rgba(200,190,210,0.7)"; c.lineWidth = 0.08; c.beginPath(); c.moveTo(0.4, 0.5); c.quadraticCurveTo(0.8, 0.3, 0.6, 0.0); c.quadraticCurveTo(0.45, -0.2, 0.75, -0.4); c.stroke();
  },
  thurible(c) { c.save(); c.translate(-0.3, 0); c.scale(0.7, 0.7); D.censer(c); c.restore(); c.save(); c.translate(0.35, 0.1); c.scale(0.7, 0.7); D.censer(c); c.restore(); },
  raven(c) {
    c.fillStyle = "#2a2a3a";
    c.beginPath(); c.moveTo(-0.9, -0.1); c.quadraticCurveTo(-0.4, -0.6, 0, -0.15); c.quadraticCurveTo(0.4, -0.6, 0.9, -0.1); c.quadraticCurveTo(0.4, -0.2, 0.15, 0.2); c.lineTo(0, 0.7); c.lineTo(-0.15, 0.2); c.quadraticCurveTo(-0.4, -0.2, -0.9, -0.1); c.fill();
    poly(c, [[-0.06, -0.2], [0.06, -0.2], [0, -0.42]], "#8a8070");
    circ(c, 0.04, -0.12, 0.04, "#ffd060");
  },
  unkindness(c) { c.save(); c.translate(-0.3, -0.25); c.scale(0.6, 0.6); D.raven(c); c.restore(); c.save(); c.translate(0.35, 0.05); c.scale(0.6, 0.6); D.raven(c); c.restore(); c.save(); c.translate(-0.15, 0.45); c.scale(0.5, 0.5); D.raven(c); c.restore(); },
  // Relics.
  wick(c) { poly(c, [[-0.3, -0.1], [0.3, -0.1], [0.34, 0.85], [-0.34, 0.85]], "#d8c8a8"); line(c, [[0, -0.1], [0.05, -0.35]], 0.06, "#2a2020"); c.fillStyle = "#7ad8ff"; c.beginPath(); c.moveTo(0.05, -0.95); c.quadraticCurveTo(0.35, -0.55, 0.05, -0.35); c.quadraticCurveTo(-0.25, -0.55, 0.05, -0.95); c.fill(); circ(c, 0.05, -0.5, 0.08, "#ffffff"); },
  souljar(c) { poly(c, [[-0.3, -0.85], [0.3, -0.85], [0.3, -0.6], [0.6, -0.3], [0.55, 0.8], [-0.55, 0.8], [-0.6, -0.3], [-0.3, -0.6]], "rgba(150,200,255,0.35)"); for (const [x, y] of [[-0.2, 0.3], [0.2, 0.1], [0, 0.5], [0.15, -0.2]]) { poly(c, [[x, y - 0.14], [x + 0.1, y], [x, y + 0.14], [x - 0.1, y]], "#58a6ff"); } line(c, [[-0.35, -0.85], [0.35, -0.85]], 0.1, "#8a6a3a"); },
  clapper(c) { line(c, [[0, -0.9], [0, 0.3]], 0.12, "#8a7a5a"); circ(c, 0, 0.5, 0.3, "#c9a35a"); c.strokeStyle = "#e0c070"; c.lineWidth = 0.06; for (const r of [0.55, 0.8]) { c.beginPath(); c.arc(0, 0.5, r, -2.6, -0.5); c.stroke(); } line(c, [[-0.2, 0.2], [0.25, 0.7]], 0.05, "#3a2a1a"); },
  reliquary(c) { poly(c, [[-0.6, -0.2], [0.6, -0.2], [0.6, 0.75], [-0.6, 0.75]], "#b08a40"); poly(c, [[-0.7, -0.2], [0, -0.8], [0.7, -0.2]], "#c9a35a"); poly(c, [[-0.25, 0.05], [0.25, 0.05], [0.25, 0.5], [-0.25, 0.5]], "#2a1a10"); c.fillStyle = "#ff8a3a"; c.beginPath(); c.moveTo(0, 0.1); c.quadraticCurveTo(0.18, 0.3, 0, 0.45); c.quadraticCurveTo(-0.18, 0.3, 0, 0.1); c.fill(); },
  keys(c) { for (const [a, col] of [[-0.35, "#c9a35a"], [0.3, "#8b949e"]]) { c.save(); c.rotate(a); c.strokeStyle = col; c.lineWidth = 0.12; c.beginPath(); c.arc(0, -0.55, 0.25, 0, TAU); c.stroke(); line(c, [[0, -0.3], [0, 0.85]], 0.12, col); line(c, [[0, 0.6], [0.22, 0.6]], 0.1, col); line(c, [[0, 0.8], [0.18, 0.8]], 0.1, col); c.restore(); } },
  leechtooth(c) { poly(c, [[-0.35, -0.8], [0.35, -0.8], [0.2, 0.2], [0, 0.9], [-0.2, 0.2]], "#e8e0c8"); circ(c, 0.35, 0.5, 0.18, "#c0303a"); circ(c, 0.5, 0.75, 0.1, "#c0303a"); },
  stormglass(c) { poly(c, [[-0.35, -0.9], [0.35, -0.9], [0.45, 0.8], [-0.45, 0.8]], "rgba(150,170,220,0.35)"); c.strokeStyle = "#9aa6b6"; c.lineWidth = 0.06; c.strokeRect(-0.45, -0.9, 0.9, 1.7); poly(c, [[0.05, -0.55], [-0.2, 0.05], [0.02, 0.05], [-0.12, 0.6], [0.25, -0.1], [0.04, -0.1], [0.18, -0.55]], "#ffe066"); },
  ghostlamp(c) { poly(c, [[-0.35, -0.5], [0.35, -0.5], [0.4, 0.6], [-0.4, 0.6]], "rgba(180,220,255,0.3)"); c.strokeStyle = "#8aa0c0"; c.lineWidth = 0.07; c.strokeRect(-0.4, -0.5, 0.8, 1.1); line(c, [[-0.2, -0.5], [0, -0.85], [0.2, -0.5]], 0.07, "#8aa0c0"); circ(c, 0, 0.05, 0.22, "#d8f0ff"); circ(c, -0.07, 0.0, 0.05, "#2a3a5a"); circ(c, 0.07, 0.0, 0.05, "#2a3a5a"); },
  martyr(c) { poly(c, [[-0.22, -0.2], [0.22, -0.2], [0.26, 0.85], [-0.26, 0.85]], "#e8e0d0"); line(c, [[-0.26, 0.4], [0.26, 0.5]], 0.08, "#c05050"); c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(0, -0.95); c.quadraticCurveTo(0.25, -0.5, 0, -0.25); c.quadraticCurveTo(-0.25, -0.5, 0, -0.95); c.fill(); },
  ravenskull(c) { D.skull(c); c.fillStyle = "#2a2a3a"; c.beginPath(); c.moveTo(-0.7, -0.6); c.quadraticCurveTo(0, -1.05, 0.7, -0.6); c.quadraticCurveTo(0, -0.8, -0.7, -0.6); c.fill(); poly(c, [[-0.08, 0.1], [0.08, 0.1], [0, 0.5]], "#8a8070"); },
  bloodseal(c) { circ(c, 0, 0, 0.8, "#8a1418"); circ(c, 0, 0, 0.62, "#b8262a"); c.fillStyle = "#ffb0a0"; c.beginPath(); c.arc(0.1, -0.05, 0.36, 0, TAU); c.fill(); c.fillStyle = "#b8262a"; c.beginPath(); c.arc(0.26, -0.12, 0.3, 0, TAU); c.fill(); },
  pilgrim(c) { line(c, [[-0.5, 0.9], [0.35, -0.7]], 0.12, "#8a6a4a"); c.strokeStyle = "#8a6a4a"; c.lineWidth = 0.12; c.beginPath(); c.arc(0.5, -0.6, 0.2, Math.PI, 0.3); c.stroke(); circ(c, 0.05, -0.1, 0.16, "#d8c8a0"); },
  hourglass(c) { poly(c, [[-0.5, -0.8], [0.5, -0.8], [0.08, 0], [0.5, 0.8], [-0.5, 0.8], [-0.08, 0]], "#9fd8ff"); poly(c, [[-0.3, -0.6], [0.3, -0.6], [0, -0.2]], "#ffd166"); poly(c, [[-0.35, 0.72], [0.35, 0.72], [0, 0.35]], "#ffd166"); line(c, [[-0.6, -0.85], [0.6, -0.85]], 0.1, "#8a6a3a"); line(c, [[-0.6, 0.85], [0.6, 0.85]], 0.1, "#8a6a3a"); line(c, [[-0.3, -0.5], [0.3, 0.5]], 0.04, "#2a2a3a"); },
  saintsbone(c) { c.save(); c.rotate(-0.7); poly(c, [[-0.12, -0.6], [0.12, -0.6], [0.12, 0.6], [-0.12, 0.6]], "#e8e0c8"); for (const y of [-0.62, 0.62]) { circ(c, -0.14, y, 0.17, "#e8e0c8"); circ(c, 0.14, y, 0.17, "#e8e0c8"); } c.restore(); c.strokeStyle = "#ffd166"; c.lineWidth = 0.06; c.beginPath(); c.arc(0, 0, 0.9, 0, TAU); c.stroke(); },
  thorns(c) { c.strokeStyle = "#6a4a8a"; c.lineWidth = 0.12; c.beginPath(); c.arc(0, 0, 0.6, 0, TAU); c.stroke(); for (let i = 0; i < 10; i++) { c.save(); c.rotate((i / 10) * TAU); poly(c, [[0.55, -0.06], [0.95, 0], [0.55, 0.06]], "#c8a0ff"); c.restore(); } },
  mirror(c) { c.fillStyle = "#6a6a80"; c.beginPath(); c.ellipse(0, -0.1, 0.55, 0.7, 0, 0, TAU); c.fill(); c.fillStyle = "#c8d4ff"; c.beginPath(); c.ellipse(0, -0.1, 0.42, 0.56, 0, 0, TAU); c.fill(); c.fillStyle = "#f0f4ff"; c.beginPath(); c.arc(-0.12, -0.3, 0.14, 0, TAU); c.fill(); line(c, [[0, 0.6], [0, 0.95]], 0.14, "#6a6a80"); },
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
  chrism(c) { poly(c, [[-0.18, -0.9], [0.18, -0.9], [0.18, -0.5], [0.5, -0.1], [0.45, 0.8], [-0.45, 0.8], [-0.5, -0.1], [-0.18, -0.5]], "#f0c070"); poly(c, [[-0.4, 0.1], [0.4, 0.1], [0.38, 0.72], [-0.38, 0.72]], "#c89040"); circ(c, 0, 0.4, 0.14, "#fff0c0"); },
  feather(c) { c.save(); c.rotate(0.6); c.fillStyle = "#3a3a50"; c.beginPath(); c.moveTo(0, -0.95); c.quadraticCurveTo(0.45, -0.1, 0, 0.8); c.quadraticCurveTo(-0.45, -0.1, 0, -0.95); c.fill(); line(c, [[0, -0.8], [0, 0.95]], 0.05, "#8a8aa8"); c.restore(); },
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
  greed(c) { D.ember(c); }, radiance(c) { D.oil(c); }, legion(c) { D.quiver(c); }, headstart(c) { D.growth(c); c.fillStyle = "#ffd166"; c.beginPath(); c.arc(0, 0.62, 0.16, 0, TAU); c.fill(); }, luck(c) { D.clover(c); }, haste(c) { c.strokeStyle = "#d2a8ff"; c.lineWidth = 0.14; c.beginPath(); c.arc(0, 0, 0.75, 0, TAU); c.stroke(); line(c, [[0, 0], [0, -0.5]], 0.12, "#d2a8ff"); line(c, [[0, 0], [0.35, 0.2]], 0.12, "#d2a8ff"); },
  reroll(c) { c.strokeStyle = "#79c0ff"; c.lineWidth = 0.16; c.beginPath(); c.arc(0, 0, 0.6, 0.3, 5.2); c.stroke(); poly(c, [[0.62, -0.15], [0.95, 0.2], [0.35, 0.3]], "#79c0ff"); },
  banish(c) { D.skull(c); line(c, [[-0.85, -0.85], [0.85, 0.85]], 0.14, "#ff6b6b"); },
  revival(c) { c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(0, -0.95); c.bezierCurveTo(0.7, -0.3, 0.6, 0.6, 0, 0.9); c.bezierCurveTo(-0.6, 0.6, -0.7, -0.3, 0, -0.95); c.fill(); c.fillStyle = "#fff3c0"; c.beginPath(); c.moveTo(0, -0.3); c.bezierCurveTo(0.3, 0, 0.25, 0.5, 0, 0.6); c.bezierCurveTo(-0.25, 0.5, -0.3, 0, 0, -0.3); c.fill(); },
  // The Pedlar's wares.
  tonic_s(c) { D.flask(c, 0.7, "#ff7b72"); },
  tonic_m(c) { D.flask(c, 0.85, "#ff5a48"); },
  tonic_l(c) { D.flask(c, 1, "#e0302a"); circ(c, 0.55, -0.6, 0.12, "#fff0c0"); circ(c, -0.55, -0.35, 0.08, "#fff0c0"); },
  flask(c, k = 1, col = "#ff5a48") {
    c.save(); c.translate(0, 0.12 * (1 - k)); c.scale(k, k);
    c.fillStyle = "rgba(230,240,255,0.25)"; c.beginPath(); c.arc(0, 0.3, 0.58, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(0, 0.3, 0.5, -0.25, Math.PI + 0.25); c.closePath(); c.fill();
    circ(c, -0.18, 0.18, 0.1, "rgba(255,255,255,0.6)");
    poly(c, [[-0.16, -0.25], [0.16, -0.25], [0.16, -0.62], [-0.16, -0.62]], "rgba(230,240,255,0.35)");
    poly(c, [[-0.2, -0.62], [0.2, -0.62], [0.17, -0.88], [-0.17, -0.88]], "#a0703a");
    c.restore();
  },
  ward(c) {
    c.fillStyle = "rgba(159,216,255,0.25)"; c.beginPath(); c.arc(0, 0, 0.9, 0, TAU); c.fill();
    c.strokeStyle = "#9fd8ff"; c.lineWidth = 0.09; c.beginPath(); c.arc(0, 0, 0.88, 0, TAU); c.stroke();
    poly(c, [[0, -0.6], [0.48, -0.38], [0.42, 0.2], [0, 0.62], [-0.42, 0.2], [-0.48, -0.38]], "#d8f0ff");
    line(c, [[0, -0.35], [0, 0.35]], 0.1, "#5a8ab8"); line(c, [[-0.22, -0.08], [0.22, -0.08]], 0.1, "#5a8ab8");
  },
  draught(c) {
    D.flask(c, 0.9, "#7ee787");
    for (const y of [-0.3, 0.05, 0.4]) line(c, [[-0.95, y], [-0.62, y]], 0.08, "#c8ffd0");
  },
  firebomb(c) {
    circ(c, 0.05, 0.2, 0.62, "#3a2a24"); circ(c, -0.15, 0.02, 0.16, "#6a5040");
    poly(c, [[-0.12, -0.42], [0.22, -0.42], [0.22, -0.6], [-0.12, -0.6]], "#8a6a4a");
    c.strokeStyle = "#c9a36a"; c.lineWidth = 0.06; c.beginPath(); c.moveTo(0.05, -0.6); c.quadraticCurveTo(0.2, -0.85, 0.45, -0.78); c.stroke();
    c.fillStyle = "#ffb347"; c.beginPath(); c.moveTo(0.5, -1); c.quadraticCurveTo(0.75, -0.75, 0.5, -0.6); c.quadraticCurveTo(0.3, -0.78, 0.5, -1); c.fill();
    circ(c, 0.5, -0.76, 0.06, "#fff0c0");
  },
  lodestone(c) {
    poly(c, [[-0.55, -0.35], [-0.1, -0.75], [0.5, -0.55], [0.7, 0.05], [0.35, 0.65], [-0.35, 0.7], [-0.7, 0.2]], "#4a5068");
    poly(c, [[-0.3, -0.3], [0.05, -0.55], [0.4, -0.35], [0.2, 0.0], [-0.2, 0.05]], "#6a7490");
    for (const [x, y] of [[-0.85, -0.8], [0.85, 0.75], [0.9, -0.6]]) poly(c, [[x, y - 0.13], [x + 0.09, y], [x, y + 0.13], [x - 0.09, y]], "#79c0ff");
  },
  satchel(c) {
    poly(c, [[-0.75, -0.2], [0.75, -0.2], [0.65, 0.8], [-0.65, 0.8]], "#7a5230");
    c.fillStyle = "#9a6a3a"; c.beginPath(); c.moveTo(-0.75, -0.2); c.quadraticCurveTo(0, -0.5, 0.75, -0.2); c.lineTo(0.6, 0.25); c.quadraticCurveTo(0, 0.4, -0.6, 0.25); c.closePath(); c.fill();
    c.strokeStyle = "#5a3a20"; c.lineWidth = 0.1; c.beginPath(); c.arc(0, -0.25, 0.5, Math.PI, 0); c.stroke();
    circ(c, 0, 0.3, 0.1, "#ffd166");
  },
  // Deeds.
  beacon(c) {
    poly(c, [[-0.45, 0.9], [0.45, 0.9], [0.25, -0.1], [-0.25, -0.1]], "#6a6470");
    poly(c, [[-0.5, -0.1], [0.5, -0.1], [0.38, -0.3], [-0.38, -0.3]], "#3a342e");
    c.fillStyle = "#ffb347"; c.beginPath(); c.moveTo(0, -0.98); c.quadraticCurveTo(0.42, -0.55, 0.22, -0.3); c.lineTo(-0.22, -0.3); c.quadraticCurveTo(-0.42, -0.55, 0, -0.98); c.fill();
    c.fillStyle = "#fff0c0"; c.beginPath(); c.moveTo(0, -0.7); c.quadraticCurveTo(0.18, -0.48, 0.08, -0.32); c.lineTo(-0.08, -0.32); c.quadraticCurveTo(-0.18, -0.48, 0, -0.7); c.fill();
  },
  crown(c) {
    poly(c, [[-0.8, 0.45], [-0.85, -0.45], [-0.4, 0], [0, -0.7], [0.4, 0], [0.85, -0.45], [0.8, 0.45]], "#d4a24c");
    poly(c, [[-0.8, 0.45], [0.8, 0.45], [0.75, 0.7], [-0.75, 0.7]], "#a07428");
    circ(c, 0, -0.7, 0.12, "#c0c8ff"); circ(c, -0.85, -0.45, 0.1, "#ff7b72"); circ(c, 0.85, -0.45, 0.1, "#ff7b72"); circ(c, 0, 0.2, 0.13, "#c0c8ff");
  },
  bloodmoon(c) {
    circ(c, 0, 0, 0.78, "#b3262a"); circ(c, 0.22, -0.18, 0.18, "#8a1418"); circ(c, -0.28, 0.25, 0.13, "#8a1418"); circ(c, 0.2, 0.35, 0.09, "#8a1418");
    c.strokeStyle = "rgba(255,120,100,0.5)"; c.lineWidth = 0.06; c.beginPath(); c.arc(0, 0, 0.92, 0, TAU); c.stroke();
  },
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
