import * as T from "three";
import { mulberry } from "../config.js";
import { GEO } from "./batch.js";
import { at, local, limb, light, vary, mix } from "./propkit.js";

// ── Hollowmere churchyard ────────────────────────────────────────────────
// An old village churchyard in late autumn: a ruined chapel of coursed
// stone, dry-stone walls, box tombs, Celtic crosses, open graves, yews and
// a great oak shedding its leaves. Everything is built from small faceted
// pieces into the static batches, so it stays a handful of draw calls.

const STONE = 0x7c7a82, STONE_D = 0x5a5862, MOSS = 0x4a5a34, SOIL = 0x3a2a1c, WOOD = 0x4a3526, IRON = 0x24222a;
const LEAVES = [0x9a4a18, 0xb8702a, 0x7a3212, 0xc88a3a, 0x6a4a1c, 0x8a5a24];

// A wall built of coursed blocks between two points, with a broken top
// profile and optional window gaps. u runs along the wall, v across it.
function coursedWall(B, cx, cy, yaw, L, thick, rnd, { base = 60, rag = 30, windows = [] } = {}) {
  const du = [Math.cos(yaw), Math.sin(yaw)], dv = [-Math.sin(yaw), Math.cos(yaw)];
  const course = 12;
  const profile = (u) => base + Math.sin(u * 0.03 + rnd() * 0.2) * rag * 0.35 + (Math.abs(Math.sin(u * 0.011 + 1.7)) > 0.8 ? -rag : 0);
  const top = [];
  for (let z = 0; z < base + rag; z += course) {
    let u = -L / 2 + (Math.floor(z / course) % 2 ? 0 : -8);
    while (u < L / 2) {
      const len = 16 + rnd() * 18;
      const u0 = Math.max(-L / 2, u), u1 = Math.min(L / 2, u + len);
      const um = (u0 + u1) / 2;
      u += len + 1;
      if (u1 - u0 < 4) continue;
      if (z > profile(um)) continue;
      if (windows.some(([wu, wz0, wz1]) => Math.abs(um - wu) < 15 && z >= wz0 && z < wz1)) continue;
      const x = cx + du[0] * um, y = cy + du[1] * um;
      const tone = z < 13 ? STONE_D : rnd() < 0.15 ? mix(STONE, MOSS, 0.5) : vary(STONE, rnd, 0.14);
      B.stone.add(GEO.box, [x, y, z + course / 2], [0, 0, yaw], [u1 - u0 - 1, thick * (0.92 + rnd() * 0.12), course - 1], tone);
      top[Math.round(um)] = z;
    }
  }
  // Arched window heads above the gaps.
  for (const [wu, , wz1] of windows) {
    const x = cx + du[0] * wu, y = cy + du[1] * wu;
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (k / 4);
      B.stone.add(GEO.box, [x + du[0] * Math.cos(a) * 16, y + du[1] * Math.cos(a) * 16, wz1 + Math.sin(a) * 12], [0, -(a - Math.PI / 2), yaw], [8, thick + 2, 6], STONE_D);
    }
  }
  // Rubble at the foot and ivy on the stones.
  for (let i = 0; i < L / 30; i++) {
    const u = (rnd() - 0.5) * L, side = rnd() < 0.5 ? -1 : 1;
    B.stone.add(GEO.dodeca, [cx + du[0] * u + dv[0] * side * (thick / 2 + 6), cy + du[1] * u + dv[1] * side * (thick / 2 + 6), 3], [rnd() * 3, rnd() * 3, rnd() * 3], [4 + rnd() * 5, 4 + rnd() * 5, 3 + rnd() * 3], vary(STONE_D, rnd));
    if (rnd() < 0.5) B.leaf.add(GEO.ico, [cx + du[0] * u + dv[0] * side * (thick / 2 + 1), cy + du[1] * u + dv[1] * side * (thick / 2 + 1), 10 + rnd() * 40], [rnd() * 3, rnd() * 3, 0], [8 + rnd() * 8, 3, 7 + rnd() * 10], vary(0x2e4a26, rnd, 0.2));
  }
}

// A low dry-stone wall: rough stones in two courses and a row of cope
// stones set on edge.
function dryStones(B, cx, cy, yaw, L, rnd) {
  const du = [Math.cos(yaw), Math.sin(yaw)];
  for (const [z, r] of [[7, 9], [18, 8]]) {
    for (let u = -L / 2 + 4; u < L / 2 - 2; u += r * 1.5) {
      const tone = rnd() < 0.25 ? mix(STONE, MOSS, 0.55) : vary(0x76747a, rnd, 0.16);
      B.stone.add(GEO.dodeca, [cx + du[0] * u, cy + du[1] * u, z], [rnd() * 3, rnd() * 3, rnd() * 3], [r * (0.8 + rnd() * 0.4), 9 + rnd() * 2, r * 0.75], tone);
    }
  }
  for (let u = -L / 2 + 3; u < L / 2; u += 6) {
    B.stone.add(GEO.box, [cx + du[0] * u, cy + du[1] * u, 28], [0, (rnd() - 0.5) * 0.3, yaw], [4, 16, 8 + rnd() * 3], vary(0x68666e, rnd, 0.14));
  }
}

function autumnCluster(B, x, y, z, r, rnd) {
  for (let k = 0; k < 4; k++) {
    B.leaf.add(GEO.ico, [x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, z + (rnd() - 0.5) * r * 0.5], [rnd() * 3, rnd() * 3, rnd() * 3], [r * (0.5 + rnd() * 0.4), r * (0.5 + rnd() * 0.4), r * (0.35 + rnd() * 0.3)], LEAVES[Math.floor(rnd() * LEAVES.length)]);
  }
}

export const CHURCHYARD = {
  look: { fog: 0x14101c, fogD: 0.0005, amb: 0x4a4466, ambI: 3.0, hemiSky: 0x7a74b0, hemiGnd: 0x3a2a1a, moon: 0xd4ccff, moonI: 2.1, outer: 0x1e1c16, bloom: 0.7 },

  paint(c, k, w, rnd) {
    const gw = c.canvas.width, gh = c.canvas.height;
    c.fillStyle = "#3e4a32"; c.fillRect(0, 0, gw, gh);
    const blot = (n, cols, r0, r1) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = cols[Math.floor(rnd() * cols.length)];
        const r = r0 + rnd() * (r1 - r0);
        c.beginPath(); c.ellipse(rnd() * gw, rnd() * gh, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 6.3); c.fill();
      }
    };
    blot(9000, ["rgba(90,110,60,0.12)", "rgba(0,0,0,0.13)", "rgba(60,80,40,0.16)", "rgba(110,100,60,0.08)"], 2, 14);
    // Winding gravel paths from the lych-gate to the chapel door, and round it.
    const path = (pts, width) => {
      c.lineCap = "round"; c.lineJoin = "round";
      for (const [lw, col] of [[width + 12, "rgba(30,24,16,0.45)"], [width, "rgba(92,84,70,0.8)"], [width * 0.5, "rgba(104,96,82,0.45)"]]) {
        c.strokeStyle = col; c.lineWidth = lw * k;
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)));
        c.stroke();
      }
    };
    const cx = w.W / 2;
    path([[cx, w.H], [cx - 40, w.H - 260], [cx + 50, w.H - 520], [cx - 20, w.H - 820], [cx, 600]], 46);
    path([[cx - 20, 900], [cx - 380, 880], [cx - 700, 940], [cx - 1050, 900]], 34);
    path([[cx + 20, 900], [cx + 380, 870], [cx + 720, 930], [cx + 1060, 910]], 34);
    path([[cx - 230, 640], [cx - 250, 380], [cx - 200, 300]], 28);
    path([[cx + 230, 640], [cx + 250, 380], [cx + 200, 300]], 28);
    // Pebbles on the gravel.
    for (let i = 0; i < 5000; i++) { c.fillStyle = rnd() < 0.5 ? "rgba(200,190,170,0.25)" : "rgba(40,30,20,0.25)"; c.fillRect(rnd() * gw, rnd() * gh, 1.2, 1.2); }
    // The chapel floor: worn flagstones.
    const fx0 = (cx - 162) * k, fy0 = 388 * k, fw = 324 * k, fh = 174 * k, tile = 26 * k;
    for (let y = fy0; y < fy0 + fh; y += tile) for (let x = fx0; x < fx0 + fw; x += tile) {
      const v = 70 + Math.floor(rnd() * 22);
      c.fillStyle = `rgb(${v},${v - 4},${v + 2})`;
      if (rnd() > 0.08) c.fillRect(x, y, tile - 1.5, tile - 1.5);
    }
    // Soil and moss under the graves.
    for (const o of w.obstacles) {
      if (!["headstone", "celtic", "marker", "tomb", "opengrave"].includes(o.kind)) continue;
      c.save(); c.translate(o.x * k, (o.y + (o.kind === "tomb" || o.kind === "opengrave" ? 0 : 28)) * k); c.rotate(o.rot || 0);
      c.fillStyle = o.kind === "tomb" ? "rgba(30,34,22,0.55)" : "rgba(58,42,28,0.75)";
      c.beginPath(); c.ellipse(0, 0, (o.kind === "tomb" ? 44 : 18) * k, (o.kind === "tomb" ? 28 : 32) * k, 0, 0, 6.3); c.fill();
      c.restore();
    }
    // Leaf litter: heavy under the oaks, scattered everywhere else.
    for (const o of w.obstacles) if (o.kind === "greatoak" || o.kind === "yew") {
      const R = (o.kind === "greatoak" ? 190 : 50) * k;
      const g = c.createRadialGradient(o.x * k, o.y * k, 0, o.x * k, o.y * k, R);
      g.addColorStop(0, o.kind === "greatoak" ? "rgba(120,60,20,0.55)" : "rgba(20,26,16,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.arc(o.x * k, o.y * k, R, 0, 6.3); c.fill();
      if (o.kind === "greatoak") for (let i = 0; i < 700; i++) {
        const a = rnd() * 6.3, d = Math.sqrt(rnd()) * R;
        c.fillStyle = ["#9a4a18", "#c07a2a", "#7a3212", "#d8a040"][Math.floor(rnd() * 4)];
        c.beginPath(); c.ellipse(o.x * k + Math.cos(a) * d, o.y * k + Math.sin(a) * d, 2.2 * k * 1.4, 1.2 * k * 1.4, rnd() * 3, 0, 6.3); c.fill();
      }
    }
    blot(6000, ["rgba(170,90,30,0.45)", "rgba(200,130,50,0.4)", "rgba(120,50,20,0.45)", "rgba(210,170,70,0.3)"], 1, 2.6);
  },

  props: {
    chapelwall(B, o, rnd) {
      const long = o.w >= o.h, L = Math.max(o.w, o.h), th = Math.min(o.w, o.h);
      const r2 = mulberry(Math.floor(o.seed * 1e6));
      const windows = L > 250 ? [[-L * 0.28, 24, 50], [L * 0.28, 24, 50]] : L > 160 ? [[0, 24, 50]] : [];
      coursedWall(B, o.x, -o.y, long ? 0 : Math.PI / 2, L, th, r2, { base: 66, rag: 34, windows });
      void rnd;
    },
    belltower(B, o, rnd, env) {
      const [x, y] = at(o), s = o.w;
      B.stone.add(GEO.boxUp, [x, y, 0], null, [s + 12, s + 12, 10], STONE_D);
      for (let z = 10, i = 0; z < 170; z += 16, i++) B.stone.add(GEO.boxUp, [x, y, z], null, [s - (i % 2) * 2, s - (i % 2) * 2, 15.5], vary(STONE, rnd, 0.08));
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.stone.add(GEO.boxUp, [x + dx * s / 2, y + dy * s / 2, 0], null, [14, 14, 120], STONE_D);
      // Belfry openings, pierced through on all four sides.
      for (const u of [-14, 14]) {
        B.stone.add(GEO.box, [x + u, y, 150], null, [16, s + 2, 26], 0x0c0a10);
        B.stone.add(GEO.box, [x, y + u, 150], null, [s + 2, 16, 26], 0x0c0a10);
      }
      B.stone.add(GEO.boxUp, [x, y, 170], null, [s + 10, s + 10, 8], STONE_D);
      B.stone.add(new T.ConeGeometry(1, 1, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 0.5), [x, y, 178], null, [s * 0.78, s * 0.78, 76], 0x3a3848);
      B.wood.add(GEO.boxUp, [x, y, 252], null, [3, 3, 22], IRON);
      B.wood.add(GEO.box, [x, y, 266], null, [12, 3, 3], IRON);
      // A bell glints inside.
      B.wood.add(new T.CylinderGeometry(0.55, 1, 1, 10).rotateX(Math.PI / 2), [x, y, 150], null, [11, 11, 16], 0x8a6a2a);
      light(env, o.x, o.y + s / 2 + 10, 150, 0x8a8ac8, 4000, false, 200);
    },
    chapelaltar(B, o, rnd, env) {
      const [x, y] = at(o);
      B.stone.add(GEO.boxUp, [x, y, 0], null, [o.w + 16, o.h + 12, 6], STONE_D);
      B.stone.add(GEO.boxUp, [x, y, 6], null, [o.w - 8, o.h - 6, 24], STONE);
      B.stone.add(GEO.boxUp, [x, y, 30], null, [o.w + 4, o.h + 4, 5], vary(STONE, rnd));
      B.wood.add(GEO.boxUp, [x, y - 2, 35], null, [o.w * 0.7, o.h + 5, 0.8], 0x6a1a1e);
      for (const dx of [-24, 0, 24]) {
        const hgt = 8 + rnd() * 6;
        B.wood.add(GEO.cylUp, [x + dx, y + 4, 35], null, [2.4, 2.4, hgt], 0xe8e0d0);
        env.flames.push({ x: o.x + dx, y: o.y - 4, z: 36 + hgt + 3, s: 3.6, ph: rnd() * 6 });
      }
      light(env, o.x, o.y + 20, 60, 0xffb060, 12000, true, 300);
    },
    brokenpillar(B, o, rnd) {
      const r2 = mulberry(Math.floor(o.seed * 1e6)), [x, y] = at(o), h = 36 + r2() * 40;
      B.stone.add(GEO.boxUp, [x, y, 0], null, [o.r * 2.6, o.r * 2.6, 8], STONE_D);
      B.stone.add(GEO.cyl6, [x, y, 8], null, [o.r, o.r, h], STONE);
      B.stone.add(GEO.cyl6, [x + 2, y, 8 + h], [0.35, 0.2, 0], [o.r * 0.95, o.r * 0.95, 8], STONE);
      B.stone.add(GEO.cyl6, [x + o.r * 2.4, y - o.r, 4], [Math.PI / 2, 0, r2() * 3], [o.r * 0.95, o.r * 0.95, 18], vary(STONE, r2));
      void rnd;
    },
    drywall(B, o) {
      const r2 = mulberry(Math.floor(o.seed * 1e6));
      dryStones(B, o.x, -o.y, -(o.rot || 0), o.w, r2);
    },
    tomb(B, o, rnd) {
      const a = [0, 0, -(o.rot || 0)], w = o.w, h = o.h;
      B.stone.add(GEO.boxUp, at(o), a, [w + 10, h + 10, 6], STONE_D);
      B.stone.add(GEO.boxUp, at(o, 6), a, [w, h, 24], vary(STONE, rnd, 0.08));
      for (const s of [-1, 1]) {
        B.stone.add(GEO.box, local(o, 0, s * (h / 2 + 0.2), 18), a, [w * 0.82, 1, 12], STONE_D);
        for (const u of [-0.25, 0.25]) B.stone.add(GEO.box, local(o, w * u, s * (h / 2 + 0.6), 18), a, [2, 1, 10], vary(STONE, rnd, 0.1));
      }
      B.stone.add(GEO.boxUp, at(o, 30), a, [w + 6, h + 6, 5], vary(0x8a888e, rnd, 0.06));
      B.stone.add(GEO.boxUp, at(o, 35), a, [w - 6, h - 8, 3], vary(0x8a888e, rnd, 0.06));
      B.stone.add(GEO.box, at(o, 38.5), a, [w * 0.6, 3, 1.2], STONE_D);
      B.stone.add(GEO.box, local(o, -w * 0.14, 0, 38.5), a, [3, h * 0.6, 1.2], STONE_D);
      if (rnd() < 0.6) B.leaf.add(GEO.ico, local(o, w * (rnd() - 0.5) * 0.8, h / 2, 6), [rnd() * 3, 0, 0], [10, 4, 8], mix(MOSS, 0x3a4a2a, rnd()));
    },
    celtic(B, o, rnd) {
      const a = [0, 0, -(o.rot || 0)], t = o.tall;
      B.stone.add(GEO.boxUp, at(o), a, [24, 18, 7], STONE_D);
      B.stone.add(GEO.boxUp, at(o, 7), a, [16, 12, 6], vary(STONE, rnd));
      B.stone.add(GEO.boxUp, at(o, 13), a, [9, 7, t - 13], vary(0x8a8890, rnd, 0.06));
      B.stone.add(GEO.box, at(o, t - 14), a, [30, 7, 8], vary(0x8a8890, rnd, 0.06));
      B.stone.add(new T.TorusGeometry(1, 0.16, 5, 14), at(o, t - 14), [Math.PI / 2, 0, -(o.rot || 0)], [11, 11, 11], vary(0x86848c, rnd, 0.06));
      B.stone.add(GEO.box, local(o, 0, -3.8, t - 14), a, [4, 1, 4], STONE_D);
      if (rnd() < 0.5) B.leaf.add(GEO.ico, local(o, 4, -4, t * 0.4), [0, 0, 0], [4, 2, 10], 0x3a5a2a);
    },
    marker(B, o, rnd) {
      const tilt = [(rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25, -(o.rot || 0)];
      B.wood.add(GEO.boxUp, at(o), tilt, [4, 3, o.tall], vary(WOOD, rnd));
      B.wood.add(GEO.box, local(o, 0, 0, o.tall * 0.72), tilt, [16, 3, 3.5], vary(WOOD, rnd));
      if (rnd() < 0.4) B.leaf.add(GEO.torus, local(o, 0, -2, o.tall * 0.72), [Math.PI / 2, 0, 0], [5, 5, 5], 0x5a2a2a);
    },
    opengrave(B, o, rnd) {
      const a = [0, 0, -(o.rot || 0)];
      B.stone.add(GEO.box, at(o, 0.5), a, [o.w - 6, o.h - 8, 1], 0x07050a);
      for (const s of [-1, 1]) B.stone.add(GEO.box, local(o, s * (o.w / 2 - 2), 0, 1.5), a, [4, o.h - 4, 3], SOIL);
      B.stone.add(GEO.sph, local(o, o.w / 2 + 18, 0, 0), a, [16, o.h * 0.5, 11], vary(SOIL, rnd));
      B.stone.add(GEO.sph, local(o, o.w / 2 + 14, o.h * 0.3, 0), a, [10, 12, 7], vary(0x4a3624, rnd));
      // The spade left standing in the dirt.
      B.wood.add(GEO.cylUp, local(o, o.w / 2 + 20, -4, 8), [0.3, -0.2, -(o.rot || 0)], [1.2, 1.2, 34], WOOD);
      B.wood.add(GEO.box, local(o, o.w / 2 + 16, -3, 8), [0.3, -0.2, -(o.rot || 0)], [9, 1.5, 12], 0x8a8a92);
      void rnd;
    },
    headstone(B, o, rnd) {
      const a = [0, 0, -(o.rot || 0)], w = o.w, t = o.tall;
      const tone = vary(rnd() < 0.3 ? 0x6a6872 : 0x84828a, rnd, 0.08);
      const lean = [(rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.1, -(o.rot || 0)];
      B.stone.add(GEO.boxUp, at(o), a, [w + 8, o.h + 6, 4], STONE_D);
      if (o.shape === 0) {
        B.stone.add(GEO.boxUp, at(o, 4), lean, [w, 9, t - w / 2], tone);
        B.stone.add(GEO.cyl, local(o, 0, 0, t - w / 2 + 4), [Math.PI / 2, lean[1], lean[2]], [w / 2, w / 2, 9], tone);
      } else if (o.shape === 1) {
        B.stone.add(GEO.boxUp, at(o, 4), lean, [w, 9, t - w * 0.3], tone);
        B.stone.add(GEO.box, local(o, 0, 0, t - w * 0.3 + 4), [0, Math.PI / 4, lean[2]], [w * 0.71, 9, w * 0.71], tone);
      } else if (o.shape === 2) {
        B.stone.add(GEO.boxUp, at(o, 4), lean, [w, 10, t * 0.55], tone);
        B.stone.add(GEO.boxUp, local(o, 0, 0, 4 + t * 0.55), lean, [w * 0.62, 8, t * 0.45], tone);
        B.stone.add(GEO.sph, local(o, 0, 0, 4 + t), null, [w * 0.2, 5, w * 0.2], tone);
      } else {
        B.stone.add(new T.CylinderGeometry(0.6, 1, 1, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 0.5), at(o, 4), a, [w * 0.45, 8, t + 8], tone);
        B.stone.add(new T.ConeGeometry(1, 1, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 0.5), local(o, 0, 0, t + 12), a, [w * 0.28, 6, 10], tone);
      }
      // Carved lines on the face (toward the south, the camera side).
      for (let i = 0; i < 3; i++) B.stone.add(GEO.box, local(o, 0, -5, t * 0.62 - i * 6), a, [w * (0.6 - i * 0.12), 0.8, 1.6], 0x3a3840);
      if (rnd() < 0.45) B.leaf.add(GEO.ico, local(o, (rnd() - 0.5) * w, 3, 5), [rnd(), 0, 0], [7, 4, 6], mix(MOSS, 0x2a3a1e, rnd()));
      if (rnd() < 0.2) for (let i = 0; i < 4; i++) B.glow.add(GEO.sph, local(o, (rnd() - 0.5) * 12, -12 - rnd() * 6, 2), null, [1.6, 1.6, 1.6], [0xd8c8ff, 0xffe0a0, 0xe06060][i % 3]);
    },
    yew(B, o) {
      const r2 = mulberry(Math.floor(o.seed * 1e6)), [x, y] = at(o), r = o.r;
      B.wood.add(GEO.taper, [x, y, 0], null, [r * 0.3, r * 0.3, 30], 0x3a261a);
      for (let i = 0; i < 4; i++) {
        const rr = r * (1.8 - i * 0.3);
        B.leaf.add(new T.IcosahedronGeometry(1, 1), [x + (r2() - 0.5) * 6, y + (r2() - 0.5) * 6, 26 + i * 24], [r2() * 3, r2() * 3, r2() * 3], [rr, rr, rr * 0.75], vary(0x1e3424, r2, 0.15));
      }
      B.leaf.add(GEO.cone, [x, y, 120], null, [r * 0.5, r * 0.5, 22], 0x1a2e20);
    },
    greatoak(B, o) {
      const r2 = mulberry(Math.floor(o.seed * 1e6)), base = at(o);
      limb(B.wood, base, [0, 0, 1], 110, o.r, 0x3a2a20);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + r2();
        limb(B.wood, [base[0], base[1], 12], [Math.cos(a), Math.sin(a), -0.35], 34, o.r * 0.45, 0x33251c);
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + r2() * 0.6, tilt = 0.8 + r2() * 0.4;
        const bs = [base[0], base[1], 70 + r2() * 40];
        const end = limb(B.wood, bs, [Math.cos(a) * Math.sin(tilt), Math.sin(a) * Math.sin(tilt), Math.cos(tilt)], 70 + r2() * 40, o.r * 0.38, 0x3a2a20);
        const a2 = a + (r2() - 0.5), end2 = limb(B.wood, end, [Math.cos(a2), Math.sin(a2), 0.5], 40, o.r * 0.18, 0x33251c);
        autumnCluster(B, end[0], end[1], end[2] + 10, 34, r2);
        autumnCluster(B, end2[0], end2[1], end2[2] + 6, 26, r2);
      }
      autumnCluster(B, base[0], base[1], 190, 44, r2);
    },
    crooklamp(B, o, rnd, env) {
      const [x, y] = at(o), a = o.a || 0, dx = Math.cos(a), dy = -Math.sin(a);
      B.wood.add(GEO.boxUp, [x, y, 0], null, [8, 8, 4], IRON);
      B.wood.add(GEO.cylUp, [x, y, 0], null, [2.2, 2.2, 86], IRON);
      // The crook: a quarter circle of short iron pieces.
      for (let k = 0; k <= 6; k++) {
        const t = (k / 6) * Math.PI * 0.9, px = x + dx * (1 - Math.cos(t)) * 12, py = y + dy * (1 - Math.cos(t)) * 12, pz = 86 + Math.sin(t) * 12;
        B.wood.add(GEO.box, [px, py, pz], [0, 0, 0], [3, 3, 3], IRON);
      }
      const lx = x + dx * 22, ly = y + dy * 22;
      B.wood.add(GEO.boxUp, [lx, ly, 72], null, [1, 1, 16], IRON);
      B.wood.add(GEO.boxUp, [lx, ly, 56], null, [12, 12, 3], IRON);
      B.glow.add(GEO.boxUp, [lx, ly, 59], null, [8, 8, 11], 0xffd28a);
      for (const [ox, oy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) B.wood.add(GEO.boxUp, [lx + ox, ly + oy, 58], null, [1.5, 1.5, 13], IRON);
      B.wood.add(GEO.cone, [lx, ly, 74], null, [9, 9, 7], IRON);
      env.flames.push({ x: o.x + dx * 22, y: o.y - dy * 22, z: 64, s: 5, ph: rnd() * 6 });
      light(env, o.x + dx * 22, o.y - dy * 22, 66, 0xffb25a, 15000);
    },
    gatepost(B, o, rnd) {
      const [x, y] = at(o);
      B.stone.add(GEO.boxUp, [x, y, 0], null, [26, 26, 8], STONE_D);
      for (let z = 8; z < 72; z += 12) B.stone.add(GEO.boxUp, [x, y, z], null, [22, 22, 11.5], vary(STONE, rnd, 0.08));
      B.stone.add(GEO.boxUp, [x, y, 72], null, [28, 28, 6], STONE_D);
      if (o.gate === 1) {
        // The lych-gate roof between the two posts.
        const cx = x - 60;
        for (let s = -1; s <= 1; s += 2) B.wood.add(GEO.box, [cx, y + s * 16, 96], [-s * 0.7, 0, 0], [160, 38, 4], 0x4a3a30);
        B.wood.add(GEO.box, [cx, y, 108], null, [166, 5, 5], 0x3a2a20);
        B.wood.add(GEO.box, [cx, y, 80], null, [150, 6, 6], WOOD);
        for (const u of [-50, 50]) B.wood.add(GEO.box, [cx + u, y, 90], [0, u > 0 ? 0.5 : -0.5, 0], [4, 4, 26], WOOD);
      }
    },
  },

  walls(B, w, rnd) {
    const edge = (x0, y0, x1, y1) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 80);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        dryStones(B, x0 + (x1 - x0) * t, -(y0 + (y1 - y0) * t), -Math.atan2(y1 - y0, x1 - x0), L / n + 2, rnd);
      }
    };
    edge(0, -6, w.W, -6); edge(0, w.H + 6, w.W, w.H + 6); edge(-6, 0, -6, w.H); edge(w.W + 6, 0, w.W + 6, w.H);
    // Hedge rows along parts of the wall.
    for (let i = 0; i < 26; i++) {
      const side = i % 4, u = rnd();
      const x = side < 2 ? u * w.W : side === 2 ? -26 : w.W + 26, y = side >= 2 ? u * w.H : side === 0 ? -26 : w.H + 26;
      B.leaf.add(new T.IcosahedronGeometry(1, 1), [x, -y, 18], [rnd(), rnd(), rnd()], [30 + rnd() * 20, 22, 26], vary(0x223a26, rnd, 0.2));
    }
  },

  outside(B, w, rnd) {
    for (let i = 0; i < 80; i++) {
      const side = i % 4, d = 90 + rnd() * 520;
      const x = side < 2 ? rnd() * w.W : side === 2 ? -d : w.W + d;
      const y = side >= 2 ? rnd() * w.H : side === 0 ? -d : w.H + d;
      if (rnd() < 0.7) CHURCHYARD.props.yew(B, { x, y, r: 20 + rnd() * 10, seed: rnd() });
      else CHURCHYARD.props.greatoak(B, { x, y, r: 22 + rnd() * 8, seed: rnd() });
    }
  },

  decor: {
    tuft(B, d, rnd) {
      for (let i = 0; i < 4; i++) {
        const h = 6 + rnd() * 8;
        B.leaf.add(GEO.cone, [d.x + (rnd() - 0.5) * 8, -d.y + (rnd() - 0.5) * 8, h / 2], [(rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, 0], [1.2, 1.2, h], rnd() < 0.3 ? 0x7a6a3a : vary(0x4a5a30, rnd, 0.2));
      }
    },
    mushroom(B, d, rnd) {
      for (let i = 0; i < 3; i++) {
        const x = d.x + (rnd() - 0.5) * 12, y = -d.y + (rnd() - 0.5) * 12, h = 3 + rnd() * 4;
        B.wood.add(GEO.cylUp, [x, y, 0], null, [0.8, 0.8, h], 0xd8d0b8);
        B.glow.add(GEO.sph, [x, y, h], null, [2.6, 2.6, 1.3], rnd() < 0.5 ? 0x8ab0ff : 0xb07aff);
      }
    },
    bones(B, d, rnd) {
      for (let i = 0; i < 3; i++) B.wood.add(GEO.box, [d.x + (rnd() - 0.5) * 12, -d.y + (rnd() - 0.5) * 12, 1], [0, 0, rnd() * 3], [9, 1.6, 1.6], 0xd8d0bc);
      if (rnd() < 0.4) B.wood.add(GEO.sph, [d.x, -d.y, 2.5], null, [3, 3.4, 2.8], 0xe0d8c4);
    },
  },

  propMesh: {
    urn(p) {
      const pts = [[0, 0], [5, 0], [7, 3], [9, 9], [7, 15], [4, 18], [5.5, 20], [0, 20]].map(([r, z]) => new T.Vector2(r * p.r / 9, z));
      const g = new T.LatheGeometry(pts, 10).rotateX(Math.PI / 2);
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x6a6470, roughness: 0.8, flatShading: true }));
      const grp = new T.Group(); grp.add(m);
      return grp;
    },
    coffin(p) {
      // A proper six-sided coffin, lid and brass handles.
      const s = new T.Shape();
      const l = p.w / 2, w = p.h / 2;
      s.moveTo(-l, -w * 0.6); s.lineTo(-l * 0.45, -w); s.lineTo(l, -w * 0.7); s.lineTo(l, w * 0.7); s.lineTo(-l * 0.45, w); s.lineTo(-l, w * 0.6); s.closePath();
      const body = new T.ExtrudeGeometry(s, { depth: 11, bevelEnabled: false });
      const lid = new T.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 });
      const grp = new T.Group();
      grp.add(new T.Mesh(body, new T.MeshStandardMaterial({ color: 0x3a261c, roughness: 0.8, flatShading: true })));
      const lm = new T.Mesh(lid, new T.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.75, flatShading: true })); lm.position.z = 11; lm.rotation.z = 0.04; grp.add(lm);
      const brass = new T.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.7, roughness: 0.35 });
      for (const u of [-0.4, 0.2]) for (const sgn of [-1, 1]) { const h = new T.Mesh(GEO.box, brass); h.scale.set(6, 1.6, 1.6); h.position.set(u * l * 2 * 0.5, sgn * (w * 0.9 + 1), 6); grp.add(h); }
      const cr = new T.Mesh(GEO.box, brass); cr.scale.set(12, 2, 1); cr.position.set(-l * 0.2, 0, 16); grp.add(cr);
      const cr2 = new T.Mesh(GEO.box, brass); cr2.scale.set(2, 7, 1); cr2.position.set(-l * 0.3, 0, 16); grp.add(cr2);
      return grp;
    },
  },
};
