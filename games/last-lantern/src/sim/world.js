import { Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter } from "@newkrok/nape-js";
import { mulberry, G_SOLID, G_PROP, G_HERO, G_MON, G_THROWN, S_PROP } from "../config.js";

// ── Arenas ───────────────────────────────────────────────────────────────
// Every stage is a walled rectangle dressed with static obstacles the crowd
// has to stream around, a few loose props it can shove (crates, barrels,
// pews, snow boulders), ground zones (mud, ice) and breakable candles that
// hide pickups. The layout is built from a fixed seed, so the arena is the
// same every run and the renderer can build its meshes from the same list.

const F_SOLID = () => new InteractionFilter(G_SOLID, ~0, 1 << 20, 0);
const F_PROP = () => new InteractionFilter(G_PROP, G_HERO | G_MON | G_SOLID | G_PROP | G_THROWN, S_PROP, 0);

export function buildWorld(space, stage) {
  const [W, H] = stage.world;
  const rnd = mulberry(stage.index * 7919 + 20260926);
  const W0 = { W, H, obstacles: [], walls: [], props: [], zones: [], candles: [], decor: [], start: { x: W / 2, y: H * 0.6 } };
  const start = W0.start;
  const nearStart = (x, y, r) => Math.hypot(x - start.x, y - start.y) < r;

  const addSolid = (body, rec) => {
    for (let i = 0; i < body.shapes.length; i++) body.shapes.at(i).filter = F_SOLID();
    body.space = space;
    Object.assign(rec, { body, x: body.position.x, y: body.position.y });
    (rec.kind === "wall" ? W0.walls : W0.obstacles).push(rec);
    return rec;
  };
  const box = (kind, x, y, w, h, rot = 0, extra = {}) => {
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.rotation = rot;
    b.shapes.add(new Polygon(Polygon.box(w, h)));
    return addSolid(b, { kind, w, h, rot, ...extra });
  };
  const circle = (kind, x, y, r, extra = {}) => {
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.shapes.add(new Circle(r));
    return addSolid(b, { kind, r, ...extra });
  };
  const prop = (kind, x, y, shape, density, extra = {}) => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    const mat = new Material(0.1, 0.9, 1.1, density);
    const s = shape.r ? new Circle(shape.r, undefined, mat) : new Polygon(Polygon.box(shape.w, shape.h), mat);
    s.filter = F_PROP();
    b.shapes.add(s);
    if (extra.rot) b.rotation = extra.rot;
    // Heavy drag, so a shoved crate slides a little and stops.
    b.space = space;
    const rec = { kind, body: b, ...shape, ...extra };
    W0.props.push(rec);
    return rec;
  };
  const zone = (kind, x, y, r) => W0.zones.push({ kind, x, y, r });
  const candle = (x, y) => W0.candles.push({ x, y });
  // Sample a free spot: away from the start and from what is already there.
  const free = (r, pad = 40, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const x = pad + r + rnd() * (W - 2 * (pad + r)), y = pad + r + rnd() * (H - 2 * (pad + r));
      if (nearStart(x, y, 230)) continue;
      let ok = true;
      for (const o of W0.obstacles) {
        const or = o.r ?? Math.max(o.w, o.h) / 2;
        if (Math.hypot(o.x - x, o.y - y) < or + r + 36) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return null;
  };

  // Boundary walls.
  const T = 80;
  box("wall", W / 2, -T / 2, W + T * 2, T);
  box("wall", W / 2, H + T / 2, W + T * 2, T);
  box("wall", -T / 2, H / 2, T, H);
  box("wall", W + T / 2, H / 2, T, H);

  // The beacon this stage is fought for, by the north wall. It is dark until
  // the keeper falls.
  W0.beacon = circle("beacon", W / 2, 130, 38);

  LAYOUTS[stage.look]({ W, H, rnd, box, circle, prop, zone, candle, free, nearStart, start, decor: W0.decor });
  return W0;
}

const LAYOUTS = {
  // Hollowmere: plots of crooked stones, a mausoleum, dead trees, lanterns.
  graveyard({ W, H, rnd, box, circle, prop, candle, free, nearStart }) {
    const MX = W / 2, MY = H * 0.28;
    box("mausoleum", MX, MY, 190, 130);
    for (const sx of [-1, 1]) circle("column", MX + sx * 66, MY + 90, 10);
    const plots = [[330, 360], [W - 880, 360], [330, H - 620], [W - 880, H - 620]];
    for (const [x0, y0] of plots) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        if (rnd() < 0.2) continue;
        const x = x0 + c * 110 + (rnd() - 0.5) * 24, y = y0 + r * 120 + (rnd() - 0.5) * 20;
        if (nearStart(x, y, 220)) continue;
        const cross = rnd() < 0.3;
        box(cross ? "cross" : "stone", x, y, cross ? 22 : 30 + rnd() * 10, cross ? 12 : 14, (rnd() - 0.5) * 0.3, { tall: 26 + rnd() * 14 });
      }
    }
    for (const [x, y] of [[180, 200], [W - 200, 240], [220, H - 220], [W - 180, H - 260], [900, 250], [1700, 300], [640, 900], [1960, 900], [1120, 1560], [1480, 1500], [420, 780], [2180, 760], [1300, 700]]) {
      if (!nearStart(x, y, 200)) circle("deadtree", x, y, 15 + rnd() * 6, { seed: rnd() });
    }
    for (const [x, y] of [[560, 560], [W - 560, 560], [560, H - 560], [W - 560, H - 560], [MX, MY + 210]]) circle("lamppost", x, y, 6, { phase: rnd() * 6.28 });
    for (let i = 0; i < 6; i++) { const p = free(20); if (p) prop("coffin", p.x, p.y, { w: 44, h: 20 }, 1.6, { rot: rnd() * 3 }); }
    for (let i = 0; i < 14; i++) { const p = free(12); if (p) candle(p.x, p.y); }
  },

  // The drowned mill: black water pools that slow everything, a mill with its
  // wheel, pier posts, reeds and floating barrels.
  mill({ W, H, rnd, box, circle, prop, zone, candle, free, nearStart, decor }) {
    box("millhouse", W * 0.5, H * 0.24, 220, 150);
    circle("wheel", W * 0.5 + 138, H * 0.24, 20);
    const pools = [[W * 0.2, H * 0.3, 190], [W * 0.78, H * 0.35, 210], [W * 0.25, H * 0.78, 200], [W * 0.72, H * 0.8, 180], [W * 0.5, H * 0.5, 120]];
    for (const [x, y, r] of pools) {
      if (nearStart(x, y, r + 60)) continue;
      zone("mud", x, y, r);
      for (let k = 0; k < 4; k++) {
        const a = rnd() * 6.28, d = r * (0.4 + rnd() * 0.5);
        zone("mud", x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.45 + rnd() * 0.3));
      }
      for (let k = 0; k < 14; k++) { const a = rnd() * 6.28; decor.push({ kind: "reed", x: x + Math.cos(a) * r * 1.02, y: y + Math.sin(a) * r * 1.02, s: rnd() }); }
    }
    for (let i = 0; i < 22; i++) { const p = free(10); if (p) circle("pier", p.x, p.y, 7 + rnd() * 3); }
    for (let i = 0; i < 14; i++) { const p = free(26); if (p) circle("rock", p.x, p.y, 16 + rnd() * 14, { seed: rnd() }); }
    for (let i = 0; i < 9; i++) { const p = free(20); if (p) circle("stump", p.x, p.y, 14 + rnd() * 5, { seed: rnd() }); }
    for (let i = 0; i < 10; i++) { const p = free(16); if (p) prop("barrel", p.x, p.y, { r: 12 }, 1.2); }
    for (let i = 0; i < 6; i++) { const p = free(20); if (p) prop("crate", p.x, p.y, { w: 28, h: 28 }, 1.5, { rot: rnd() * 3 }); }
    for (let i = 0; i < 14; i++) { const p = free(12); if (p) candle(p.x, p.y); }
  },

  // Ashwood: a burnt forest, trunks thick enough to hide behind, fallen logs
  // and ash beds; some trees still burn.
  ashwood({ W, H, rnd, box, circle, prop, candle, free, zone, decor }) {
    for (let i = 0; i < 46; i++) { const p = free(24, 60); if (p) circle("ashtree", p.x, p.y, 15 + rnd() * 9, { seed: rnd(), burning: rnd() < 0.35 }); }
    for (let i = 0; i < 12; i++) { const p = free(60); if (p) box("log", p.x, p.y, 110 + rnd() * 50, 22, rnd() * 3.14, { seed: rnd() }); }
    for (let i = 0; i < 10; i++) { const p = free(26); if (p) circle("rock", p.x, p.y, 16 + rnd() * 12, { seed: rnd() }); }
    for (let i = 0; i < 8; i++) { const p = free(40); if (p) zone("ash", p.x, p.y, 90 + rnd() * 80); }
    for (let i = 0; i < 8; i++) { const p = free(16); if (p) prop("crate", p.x, p.y, { w: 28, h: 28 }, 1.4, { rot: rnd() * 3 }); }
    for (let i = 0; i < 60; i++) decor.push({ kind: "ember", x: rnd() * W, y: rnd() * H, s: rnd() });
    for (let i = 0; i < 14; i++) { const p = free(12); if (p) candle(p.x, p.y); }
  },

  // Frostfang pass: boulders, snowy pines, ice sheets you slide on, and loose
  // snow boulders that roll when something big hits them.
  pass({ W, H, rnd, box, circle, prop, zone, candle, free }) {
    for (let i = 0; i < 18; i++) { const p = free(50, 60); if (p) circle("boulder", p.x, p.y, 28 + rnd() * 26, { seed: rnd() }); }
    for (let i = 0; i < 30; i++) { const p = free(20, 50); if (p) circle("pine", p.x, p.y, 13 + rnd() * 5, { seed: rnd() }); }
    for (let i = 0; i < 10; i++) { const p = free(18); if (p) box("crystal", p.x, p.y, 18, 18, rnd() * 3, { tall: 40 + rnd() * 40, seed: rnd() }); }
    for (let i = 0; i < 7; i++) { const p = free(40); if (p) { zone("ice", p.x, p.y, 110 + rnd() * 90); } }
    for (let i = 0; i < 7; i++) { const p = free(30); if (p) prop("snowball", p.x, p.y, { r: 24 }, 2.2); }
    for (let i = 0; i < 14; i++) { const p = free(12); if (p) candle(p.x, p.y); }
    void box;
  },

  // The moon cathedral: a nave of pillars, rows of heavy pews the crowd can
  // shove about, an altar and statues.
  cathedral({ W, H, rnd, box, circle, prop, candle, start }) {
    start.x = W / 2; start.y = H * 0.62;
    box("altar", W / 2, H * 0.16, 200, 70);
    for (const sx of [-1, 1]) circle("statue", W / 2 + sx * 170, H * 0.16, 18);
    for (let r = 0; r < 7; r++) for (const sx of [-1, 1]) {
      circle("pillar", W / 2 + sx * 520, 300 + r * 280, 24);
    }
    for (let r = 0; r < 6; r++) for (const sx of [-1, 1]) {
      const y = 440 + r * 290;
      if (Math.abs(y - start.y) < 120) continue;
      for (const k of [0, 1]) prop("pew", W / 2 + sx * (150 + k * 180), y, { w: 150, h: 22 }, 2.8);
    }
    for (const sx of [-1, 1]) for (let r = 0; r < 5; r++) circle("statue", W / 2 + sx * 900, 400 + r * 380, 18);
    for (let i = 0; i < 16; i++) {
      const x = W / 2 + (i % 2 ? 1 : -1) * (300 + rnd() * 500), y = 300 + rnd() * (H - 500);
      if (Math.hypot(x - start.x, y - start.y) > 220) candle(x, y);
    }
  },
};
