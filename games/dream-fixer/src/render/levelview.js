import * as T from "three";
import { Builder, SHAPE, compose } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── Level meshes ─────────────────────────────────────────────────────────
// Turns a Kit's draw records into merged static meshes: terrain blocks
// get a dirt body and a grass cap with a little overhanging lip (the
// cartoon look), props are baked in place. One mesh per (chunk, material).

export function buildLevelMeshes(kit) {
  const b = new Builder();
  for (const d of kit.draw) {
    if (d.kind === "block") block(b, d);
    else if (d.kind === "wedge") wedge(b, d);
    else if (d.kind === "model") {
      const def = MODELS[d.model];
      if (!def) { console.warn("unknown model", d.model); continue; }
      const mb = new Builder();
      def.build(mb, d.opts);
      mb.flattenInto(b, compose([d.x, d.y, d.z], [0, d.yaw, 0], d.s, new T.Matrix4()));
    }
  }
  return b.buildChunks(20);
}

function block(b, d) {
  const L = d.look, h = d.y1 - d.y0;
  const big = Math.min(d.w, d.d);
  const bevel = L.bevel ?? Math.min(0.18, big * 0.04, h * 0.2);
  b.at([d.x, 0, d.z], [0, d.yaw, 0], 1, () => {
    if (L.flat) {
      b.add(SHAPE.box(d.w, h, d.d, Math.min(0.03, h * 0.3)), { p: [0, d.y0 + h / 2, 0], grad: [L.flat.side, L.flat.top], facet: 0.02 });
      return;
    }
    const capH = L.cap ? Math.min(0.35, h * 0.5) : 0;
    const bodyH = h - capH * 0.6;
    b.add(SHAPE.box(d.w, bodyH, d.d, bevel), { p: [0, d.y0 + bodyH / 2, 0], grad: [L.sideD ?? L.side, L.side], facet: 0.04 });
    if (L.cap) {
      const lip = L.lip ? 0.14 : 0.04;
      b.add(SHAPE.box(d.w + lip * 2, capH, d.d + lip * 2, Math.min(0.12, capH * 0.45)), { p: [0, d.y1 - capH / 2, 0], grad: [L.capD ?? L.cap, L.cap], facet: 0.025 });
    }
  });
}

function wedge(b, d) {
  const L = d.look;
  b.at([d.x, d.y0, d.z], [0, d.yaw, 0], 1, () => {
    b.add(SHAPE.wedge(d.w, d.d, d.ya - d.y0, d.yb - d.y0), { grad: [L.capD ?? L.side, L.cap ?? L.side], facet: 0.03 });
  });
}
