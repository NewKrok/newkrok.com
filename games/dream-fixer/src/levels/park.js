import { rng } from "../rng.js";

// ── Morzsa's park (chapter 1) ────────────────────────────────────────────
// An island of lawn floating in a warm evening sky: the main lawn with
// the path, a terrace with Morzsa's doghouse, and a small island up a
// staircase of giant bones. One anchor in each part.

const LAWN = { cap: 0x62b04e, capD: 0x4a9440, side: 0x9a6a44, sideD: 0x5e3c28 };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };
const PATH = { top: 0xd9bf8a, side: 0xb89a68 };

export const park = {
  id: "park",
  killY: -25,
  sky: { top: 0x3f7fd8, horizon: 0xffc9a0, bottom: 0xe8a8c8, sunDir: [-0.5, 0.35, -0.7], sunGlow: 0xffe0b0 },
  fog: { color: 0xf0c4a8, near: 70, far: 260 },
  sun: { color: 0xffe2c0, intensity: 2.4, dir: [-0.5, 0.75, -0.6], sky: 0xb0c8f0, ground: 0x5a6a3a, hemi: 0.85 },

  build(k) {
    const rnd = rng(7);

    // ── Main island ──
    k.block(0, 0, 48, 44, -5, 0, { ...LAWN, lip: true });
    // Rocky underside, hanging in steps.
    k.block(0, 0, 40, 36, -9, -5, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(-2, 2, 26, 22, -13, -9, { side: 0x6e4c36, sideD: 0x3e2a1e });
    k.block(1, -1, 12, 10, -17, -13, { side: 0x5e4030, sideD: 0x33231a });
    // The path: a flat ribbon just above the lawn (walked over, not into).
    for (const [x, z, w, d, yaw] of [[0, 12, 3, 20, 0], [3.5, -1, 3, 10, -0.7], [-0.5, 8.5, 3, 12, 0.75]])
      k.block(x, z, w, d, -0.2, 0.03, { flat: PATH }, yaw);

    // ── Terrace (north-west) with stone walls ──
    k.block(-13, -10, 14, 12, -1, 1.5, { ...STONE });
    k.block(-13, -10, 13.6, 11.6, 1.3, 1.52, { flat: { top: 0x86c870, side: 0x6aa85a } });
    // Stairs up its east side, a grassy ramp up the south.
    k.stairs(-3.2, -10, 3, 5, 0.3, 0.55, 0, { ...STONE, bevel: 0.04 }, Math.PI / 2);
    k.ramp(-16, -1.4, 5.2, 3.4, 0, 1.52, { ...LAWN }, Math.PI / 2, -0.2);
    k.prop("doghouse", -14.5, -13, { y: 1.52, yaw: 0.25, collide: { w: 2.1, d: 1.9, h: 2.2 } });
    k.prop("bench", -8.4, -14.2, { y: 1.52, yaw: 0, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("lamp", -7, -5, { y: 1.52, collide: { r: 0.2, h: 3.4 } });
    k.light(-7, 1.52 + 3.2, -5, 0xffd08a, 5, 10);
    k.prop("bush", -18.5, -6, { y: 1.52, opts: { seed: 4, s: 1.1 } });
    k.prop("bush", -18, -14.5, { y: 1.52, opts: { seed: 9, s: 0.9 } });
    k.prop("flowers", -11, -7, { y: 1.52, opts: { seed: 3, n: 9, r: 1 } });

    // ── Staircase of floating bones to the little island (north-east) ──
    // Laid along the way up, so each hop is short.
    const BONE = { w: 3.2, d: 1.1, h: 0.62 };
    for (const [x, z, y] of [[8, -10, 0], [10, -13.5, 0.95], [12, -17, 1.95], [14, -20.5, 2.3]])
      k.prop("bone", x, z, { y, yaw: 1.05, collide: BONE });
    k.block(16.5, -28, 11, 10, 0.2, 3.0, { ...LAWN, lip: true });
    k.block(16.5, -28, 8, 7, -2.5, 0.2, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(17, -28.5, 4, 3.5, -5, -2.5, { side: 0x6e4c36, sideD: 0x3e2a1e });
    k.prop("tree", 19.5, -31, { y: 3, opts: { seed: 12, h: 5 }, collide: { r: 0.45, h: 4 } });
    k.prop("flowers", 13.5, -25.5, { y: 3, opts: { seed: 5, n: 8 } });

    // ── On the lawn ──
    k.prop("hydrant", -6, 9, { s: 1.4, collide: { r: 0.42, h: 1.5 } });
    k.prop("tennisBall", 8, 7, { opts: { r: 1.3 }, collide: { r: 1.25, h: 2.4 } });
    k.prop("tennisBall", 11.5, 4.5, { opts: { r: 0.6 }, yaw: 1, collide: { r: 0.58, h: 1.1 } });
    k.prop("bench", 4.2, 15, { yaw: -Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("bench", -4.2, 6, { yaw: Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    for (const [x, z] of [[3, 20], [-3, 3], [6.5, -1.5]]) {
      k.prop("lamp", x, z, { collide: { r: 0.2, h: 3.4 } });
      k.light(x, 3.2, z, 0xffd08a, 5, 10);
    }
    k.prop("fence", -12, 21.4, { opts: { len: 16, seed: 2 } });
    k.prop("fence", 14, 21.4, { opts: { len: 12, seed: 5 } });
    k.prop("rock", 16, 12, { opts: { seed: 3, s: 1.6 }, collide: { r: 0.9, h: 0.7 } });
    k.prop("rock", -19, 14, { opts: { seed: 8, s: 1.2 }, collide: { r: 0.7, h: 0.5 } });

    // Trees round the edge of the lawn.
    for (const [x, z, h] of [[-20, 17, 4.6], [-15, 19, 4], [19, 17, 5], [21, 8, 4.4], [-21, 4, 4.8], [20, -3, 4.2], [-6, 19.5, 3.8], [9, 19, 4.2]]) {
      k.prop("tree", x, z, { opts: { seed: Math.round(x * 7 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    }
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, r = 17 + rnd() * 3;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      if (x < -5 && z < -3) continue;   // not on the terrace
      k.prop("bush", x, z, { yaw: rnd() * 6, opts: { seed: i + 20, s: 0.8 + rnd() * 0.5 } });
    }
    // Grass tufts and flowers scattered over the lawn (not on the path).
    for (let i = 0; i < 90; i++) {
      const x = (rnd() - 0.5) * 44, z = (rnd() - 0.5) * 40;
      if (Math.abs(x) < 2.5 && z > 1) continue;
      if (x < -5 && z < -3) continue;
      k.prop(rnd() < 0.8 ? "grass" : "flowers", x, z, { yaw: rnd() * 6, opts: { seed: i + 100, n: rnd() < 0.8 ? 5 : 4 } });
    }

    // ── Anchors ──
    k.anchor("lawn", 12, 11);
    k.anchor("terrace", -10, -10);
    k.anchor("island", 16.5, -28);

    k.start(0, 18, 0);
  },
};
