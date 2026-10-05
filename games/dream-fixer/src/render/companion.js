import * as T from "three";
import { make } from "./modelkit.js";
import { csavar } from "./models/characters.js";
import { memoryBubble } from "./models/dream.js";
import { C } from "./palette.js";
import { damp } from "../config.js";
import { arriveLift } from "../sim/run.js";

// ── Cog, and the memories ─────────────────────────────────────────────
// Cog hovers just ahead and to your left, bobbing, turning his big eye
// towards whatever matters (a broken anchor, the nearest glitch), and
// blinking his antenna when he talks. Memories float in soap bubbles.

export class Companion {
  constructor(scene) {
    this.o = make(csavar);
    this.o.scale.setScalar(0.9);
    scene.add(this.o);
    this.pos = new T.Vector3(); this.vel = new T.Vector3();
    this.placed = false;
    this.look = 0;
    this.light = new T.PointLight(0x7ff5e0, 1.2, 4, 2);
    this.o.add(this.light);
  }

  update(run, dt, t, talking) {
    const b = run.body, N = this.o.userData.nodes, cog = run.cog;
    const sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
    // Ahead-left of you, at shoulder height; in a dream the sim flies him
    // (off to fetch dust, too) and he just bobs about where it says.
    let tx = b.x - sn * 1.6 - cs * 1.1, tz = b.z - cs * 1.6 + sn * 1.1, ty = b.y + 1.9;
    if (cog) { tx = cog.x; ty = cog.y; tz = cog.z; }
    // In the Factory, a job taken: he shows you the way to the lift.
    const G = !cog ? run.guide : null, guiding = !!G && Math.hypot(b.x - G.x, b.z - G.z) > 1.6;
    let gk = 0;
    if (guiding) [tx, ty, tz, gk] = this.lead(run, G, dt, t);
    else this.g = null;
    ty += Math.sin(t * 1.3) * 0.12;
    // Coming down into a dream with you (a little ahead).
    if (run.arriveT > 0) ty += arriveLift(run.arriveT) * 0.85;
    const k = cog?.busy ? 12 : guiding ? gk : run.arriveT > 0 ? 30 : 3;
    this.guiding = guiding;
    if (!this.placed) { this.pos.set(tx, ty, tz); this.placed = true; }
    this.pos.x = damp(this.pos.x, tx, k, dt); this.pos.y = damp(this.pos.y, ty, k, dt); this.pos.z = damp(this.pos.z, tz, k, dt);
    this.o.position.copy(this.pos);
    // Look at what matters, else at you: the dust he is after, a glitch
    // near you, a memory he has scouted, the next anchor.
    let fx = b.x, fz = b.z;
    const foe = run.foes.find((f) => f.alive && Math.hypot(f.px - b.x, f.pz - b.z) < 12);
    const anchor = run.anchors.find((a) => a.state !== "fixed");
    if (cog?.task === "go") { fx = cog.target.x; fz = cog.target.z; }
    else if (guiding && Math.hypot(this.pos.x - tx, this.pos.z - tz) > 1) { fx = tx; fz = tz; }
    else if (foe) { fx = foe.px; fz = foe.pz; } else if (cog?.scout && Math.sin(t * 0.9) > -0.2) { fx = cog.scout.x; fz = cog.scout.z; } else if (anchor) { fx = anchor.x; fz = anchor.z; }
    const want = Math.atan2(-(fx - this.pos.x), -(fz - this.pos.z));
    let d = want - this.o.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.o.rotation.y += d * Math.min(1, dt * 4);
    N.prop.rotation.y += dt * 22;
    N.body.rotation.z = Math.sin(t * 1.7) * 0.08 - d * 0.3;
    N.armL.rotation.z = 0.4 + Math.sin(t * 3) * 0.15 + (talking ? Math.sin(t * 14) * 0.3 : 0);
    N.armR.rotation.z = -0.4 - Math.sin(t * 3 + 1) * 0.15;
    N.eye.rotation.y = Math.sin(t * 0.9) * 0.15;
    // His light says what he is up to: pink while he wakes you up, gold
    // blinking when a memory is near.
    // Winding up a spark: a bright, crackling cyan that swells until it goes.
    const healing = cog?.healing, scouting = cog?.scout && !foe, charge = cog?.charging ? 1 - cog.charging.t / 0.5 : 0;
    this.zapFlash = Math.max(0, (this.zapFlash || 0) - dt * 4);
    if (charge > 0) { const f = cog.charging.f; const w = Math.atan2(-(f.px - this.pos.x), -(f.pz - this.pos.z)); this.o.rotation.y = w; }
    this.light.color.setHex(charge > 0 || this.zapFlash > 0 ? 0x9ffff0 : healing ? 0xff7aa0 : scouting || guiding ? 0xffd27a : 0x7ff5e0);
    this.light.distance = charge > 0 || this.zapFlash > 0 ? 7 : 4;
    this.light.intensity = this.zapFlash > 0 ? 3 + this.zapFlash * 6 : charge > 0 ? 1.5 + charge * 4 + Math.sin(t * 60) * 0.8 : talking ? 1.6 + Math.sin(t * 20) * 0.6 : guiding ? (Math.sin(t * 5) > 0 ? 2 : 0.8) : healing ? 1.3 + Math.sin(t * 4) * 0.5 : scouting ? (Math.sin(t * 6) > 0.3 ? 1.8 : 0.6) : 0.9;
    this.o.scale.setScalar(0.9 * (1 + charge * 0.12 + this.zapFlash * 0.1));
    this.charge = charge;
  }

  // Leading you to the lift: a loop round your head to get your attention,
  // then off towards the lift, a little ahead of you. Not followed (you do
  // not come, or look away for a while) and he comes back for you, loops
  // round you again and has another go. By the lift gate he waits.
  // Returns where to fly [x, y, z] and how eagerly.
  lead(run, G, dt, t) {
    const b = run.body, p = this.pos;
    const g = this.g ??= { mode: "loop", t: 0, a0: Math.atan2(p.z - b.z, p.x - b.x), ignored: 0 };
    g.t += dt;
    const lx = G.x - b.x, lz = G.z - b.z, toLift = Math.hypot(lx, lz);
    if (toLift < 3.5) { g.mode = "wait"; return [G.x, G.y + 1.9, G.z, 3]; }
    if (g.mode === "wait") Object.assign(g, { mode: "back", t: 0 });
    if (g.mode === "loop") {
      if (!g.pinged) { g.pinged = true; this.onPing?.(); }
      const a = g.a0 + (g.t / 1.4) * Math.PI * 2;
      if (g.t > 1.4) Object.assign(g, { mode: "lead", t: 0, ignored: 0, pinged: false });
      return [b.x + Math.cos(a) * 1.4, b.y + 1.75 + Math.sin(g.t * 4.5) * 0.15, b.z + Math.sin(a) * 1.4, 9];
    }
    // Is he being followed? You look his way, or walk towards the lift.
    const cx = p.x - b.x, cy = p.y - (b.y + 1.58), cz = p.z - b.z, cl = Math.hypot(cx, cy, cz) || 1;
    const vx = -Math.sin(b.yaw) * Math.cos(b.pitch), vy = Math.sin(b.pitch), vz = -Math.cos(b.yaw) * Math.cos(b.pitch);
    const looking = (cx * vx + cy * vy + cz * vz) / cl > 0.8;
    const coming = (b.vx * lx + b.vz * lz) / toLift > 1.5;
    if (g.mode === "lead") {
      g.ignored = looking || coming ? Math.max(0, g.ignored - dt * 2) : g.ignored + dt;
      if (g.ignored > 2.5 || (cl > 9 && !coming)) Object.assign(g, { mode: "back", t: 0 });
      // Out ahead along the way, as far as the lift (never too far off you).
      const d = Math.min(toLift, 2 + g.t * 3, 7);
      return [b.x + lx / toLift * d, b.y + 1.9 + Math.sin(t * 3) * 0.1, b.z + lz / toLift * d, 2.2];
    }
    // Back: right in front of your eyes, then another loop.
    const fx = b.x + vx * 1.6, fz = b.z + vz * 1.6;
    if (Math.hypot(p.x - fx, p.z - fz) < 0.8 || g.t > 3) Object.assign(g, { mode: "loop", t: 0, a0: Math.atan2(p.z - b.z, p.x - b.x) });
    return [fx, b.y + 1.7, fz, 5];
  }
}

export class MemoryView {
  constructor(group, memories) {
    this.items = memories.map((m) => {
      const o = make(memoryBubble, { item: m.id });
      o.position.set(m.x, m.y, m.z);
      o.visible = !m.got;
      group.add(o);
      return { m, o, gone: m.got ? 1 : 0 };
    });
  }
  update(dt, t, fx) {
    for (const it of this.items) {
      const N = it.o.userData.nodes;
      if (it.m.got) {
        it.gone = Math.min(1, it.gone + dt * 3);
        it.o.scale.setScalar(1 + it.gone * 0.6);
        if (it.gone >= 1) it.o.visible = false;
        continue;
      }
      N.bubble.position.y = N.item.position.y = 1.2 + Math.sin(t * 1.5 + it.m.x) * 0.12;
      N.bubble.scale.set(1 + Math.sin(t * 3) * 0.03, 1 - Math.sin(t * 3) * 0.03, 1);
      N.item.rotation.y = t * 0.8;
      if (Math.random() < dt * 3) fx.spark(it.m.x + (Math.random() - 0.5) * 0.8, it.m.y + 1.2 + (Math.random() - 0.5) * 0.8, it.m.z + (Math.random() - 0.5) * 0.8, 0, 0.3, 0, 0.8, 0.04, C.dreamGold, -0.2);
    }
  }
}
