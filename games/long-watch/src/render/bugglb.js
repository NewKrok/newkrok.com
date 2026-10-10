import { instanceAsset } from "./glb.js";
import { damp } from "../config.js";

// ── A bug on a generated, rigged model ───────────────────────────────────
// The walk clip runs with the bug's speed; the acts (bite, windup, stun,
// emerge, death) move the whole body, as BugFigure does with its nodes.
// Only the types listed here have a model; the others stay code-built.

export const BUG_ASSETS = { swarmer: ["swarmer_p2", { height: 0.85 }] };
const WALK_REF = 2.2;                    // m/s the walk clip covers at speed 1 (by eye)

export class BugGlb {
  constructor(scene, bug) {
    const F = this.F = instanceAsset(BUG_ASSETS[bug.type][0]);
    this.obj = F.root;
    this.inner = F.inner;
    this.type = bug.type;
    this.base = F.inner.position.y;
    this.walk = Object.values(F.actions)[0] ?? null;
    if (this.walk) { this.walk.play(); this.walk.time = Math.random() * this.walk.getClip().duration; }
    this.rate = 0;
    this.scale = 1;
    scene.add(this.obj);
  }
  pose(g, a, dt, t) {
    const b = g.body, o = this.obj, inner = this.inner;
    o.position.set(b.px + (b.x - b.px) * a, b.py + (b.y - b.py) * a, b.pz + (b.z - b.pz) * a);
    o.rotation.y = g.face;
    const sp = b.speed2D;
    const fast = g.act === "charge" ? 2.2 : g.act === "leap" ? 0 : 1;
    const want = (sp / WALK_REF + (g.act === "windup" ? 2 : 0)) * fast;
    this.rate = damp(this.rate, Math.min(3, want), 12, dt);
    if (this.walk) this.walk.timeScale = this.rate;
    this.F.mixer.update(dt);
    let by = this.base, bz = 0, rx = 0, rz = 0;
    const at = g.actT;
    switch (g.act) {
      case "bite": bz = -Math.sin(Math.min(1, at / 0.3) * Math.PI) * 0.25; rx = Math.sin(Math.min(1, at / 0.3) * Math.PI) * 0.2; break;
      case "spit": bz = at < 0.5 ? at * 0.3 : 0; rx = at < 0.5 ? -at * 0.6 : -Math.max(0, 0.3 - (at - 0.5) * 2); break;
      case "windup": rz = Math.sin(t * 40) * 0.04; by -= 0.08; break;
      case "stun": case "stagger": rz = Math.sin(t * 9) * 0.12; by -= 0.06; break;
      case "alert": rx = Math.sin(at * 12) * 0.1; break;
    }
    if (g.hidden) { o.visible = false; return; }
    o.visible = true;
    if (g.act === "emerge") by -= Math.max(0, 1 - at / 0.6) * (g.def.height + 0.5);
    const hit = g.hitT > 0 ? g.hitT / 0.12 : 0;
    this.scale += ((1 + hit * 0.08) - this.scale) * Math.min(1, dt * 30);
    // Dead: the body tips, sinks and shrinks away.
    if (!g.alive) {
      const d = Math.min(1, g.deadT / 0.5);
      by -= d * this.base * 0.9;
      rz = d * 0.5; rx = d * 0.25;
      if (this.walk) this.walk.timeScale = 0;
      const fade = Math.max(0, (g.deadT - 1.5) / 1);
      this.scale = 1 - fade;
    }
    inner.position.y = by; inner.position.z = bz;
    inner.rotation.set(rx, 0, rz);
    o.scale.setScalar(Math.max(0.001, this.scale));
  }
  dispose(scene) { scene.remove(this.obj); }
}
