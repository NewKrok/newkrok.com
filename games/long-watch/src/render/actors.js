import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";
import { RangerFigure } from "./rangerfig.js";
import { angDiff, clamp, lerp } from "../config.js";

// ── Everyone who moves ───────────────────────────────────────────────────
// The two rangers, the survivors, the bugs, the dropship and the use
// points' little models. Bodies are drawn between the last two sim steps
// (alpha) and posed procedurally: legs swing with the stride, the arms
// carry the gun up when aiming, bugs scuttle on alternating legs.

// One built model per kind, cloned for each copy (the clone shares the
// geometry; its nodes are found again by name).
const proto = new Map();
function instance(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  let p = proto.get(key);
  if (!p) { p = make(MODELS[name], opts); proto.set(key, p); }
  const o = p.clone(true);
  o.userData.nodes = {};
  for (const n of Object.keys(p.userData.nodes)) o.userData.nodes[n] = o.getObjectByName(n);
  return o;
}

const _r = new T.Vector3();
const lerpPos = (o, b, a) => o.position.set(b.px + (b.x - b.px) * a, b.py + (b.y - b.py) * a, b.pz + (b.z - b.pz) * a);

// ── A bug ──
class BugFigure {
  constructor(scene, bug) {
    this.obj = instance(bug.type);
    this.n = this.obj.userData.nodes;
    this.type = bug.type;
    this.legs = Object.keys(this.n).filter((k) => /^l\d$/.test(k)).map((k) => this.n[k]);
    // Thin legs cast no shadow (half the draw calls of a bug).
    for (const l of this.legs) l.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    this.phase = Math.random() * 6;
    this.base = this.n.body.position.y;
    this.scale = 1;
    scene.add(this.obj);
  }
  pose(g, a, dt, t) {
    const b = g.body, o = this.obj, n = this.n;
    lerpPos(o, b, a);
    o.rotation.y = g.face;
    const sp = b.speed2D;
    const fast = g.act === "charge" ? 2.2 : g.act === "leap" ? 0 : 1;
    this.phase += dt * (sp * 2.6 + (g.act === "windup" ? 14 : 0)) * fast;
    const k = Math.min(1, sp / 2 + (g.act === "windup" ? 0.5 : 0));
    this.legs.forEach((l, i) => {
      const side = i % 2 ? 1 : -1, tri = (i + Math.floor(i / 2)) % 2 ? 0 : Math.PI;
      l.rotation.y = Math.sin(this.phase + tri) * 0.35 * k * side;
      l.rotation.z = Math.max(0, Math.sin(this.phase + tri + 1.2)) * 0.25 * k * side;
    });
    let by = this.base + Math.abs(Math.sin(this.phase * 2)) * 0.04 * k, bx = 0, rz = 0;
    const head = n.head;
    // Acts.
    const at = g.actT;
    switch (g.act) {
      case "bite": if (head) head.position.z = this.headZ(head) - Math.sin(Math.min(1, at / 0.3) * Math.PI) * 0.25; break;
      case "spit": bx = at < 0.5 ? -at * 0.5 : 0; n.body.rotation.x = at < 0.5 ? at * 0.6 : Math.max(0, 0.3 - (at - 0.5) * 2); break;
      case "windup": rz = Math.sin(t * 40) * 0.04; by -= 0.12; break;
      case "stun": case "stagger": rz = Math.sin(t * 9) * 0.12; by -= 0.1; break;
      case "shriek": if (n.frill) n.frill.scale.setScalar(1 + Math.min(1, at * 4) * 0.6); if (head) head.rotation.x = 0.5; break;
      case "alert": if (head) head.rotation.x = Math.sin(at * 12) * 0.2; break;
      default:
        if (head && head.userData.z0 !== undefined) head.position.z = head.userData.z0;
        n.body.rotation.x *= 0.9;
        if (n.frill) n.frill.scale.setScalar(1 + (g.detect ?? 0) * 0.4);
        if (head && g.type !== "warden") head.rotation.x *= 0.9;
    }
    if (g.type === "sentry" && head) head.rotation.y = Math.sin(t * 0.7 + g.id) * 0.3 * (g.watching ? 0 : 1);
    if (g.type === "warden") {
      n.jaw.rotation.x = g.maw * 0.75;
      n.sacL.visible = g.sacs.sacL > 0; n.sacR.visible = g.sacs.sacR > 0; n.sacT.visible = g.sacs.sacT > 0;
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      for (const s of ["sacL", "sacR", "sacT"]) n[s].scale.setScalar(pulse);
      n.head.rotation.x = g.act === "roar" || g.act === "summon" ? -0.35 : 0;
      if (g.act === "slam" && at < 0.2) by -= 0.3;
    }
    // Coming up out of the ground.
    if (g.hidden) { o.visible = false; return; }
    o.visible = true;
    if (g.act === "emerge") by -= Math.max(0, 1 - at / 0.6) * (g.def.height + 0.5);
    // Hit: a flinch.
    const hit = g.hitT > 0 ? g.hitT / 0.12 : 0;
    this.scale += ((1 + hit * 0.08) - this.scale) * Math.min(1, dt * 30);
    // Dead: legs curl, the body sinks and shrinks away.
    if (!g.alive) {
      const d = Math.min(1, g.deadT / 0.5);
      this.legs.forEach((l, i) => { l.rotation.z = (i % 2 ? 1 : -1) * -1.2 * d; });
      by -= d * this.base * 0.6;
      rz = d * 0.4;
      const fade = Math.max(0, (g.deadT - 1.5) / 1);
      this.scale = 1 - fade;
    }
    n.body.position.y = by; n.body.position.z = bx; n.body.rotation.z = rz;
    o.scale.setScalar(Math.max(0.001, this.scale));
  }
  headZ(h) { if (h.userData.z0 === undefined) h.userData.z0 = h.position.z; return h.userData.z0; }
  dispose(scene) { scene.remove(this.obj); }
}

export class Actors {
  constructor(scene) {
    this.scene = scene;
    this.player = new RangerFigure(scene, "player", ["rifle", "pistol"]);
    this.kessler = new RangerFigure(scene, "kessler", ["rifle", "pistol"]);
    this.bugs = new Map();
    this.npcs = [];
    this.uses = new Map();
    this.dropship = instance("dropship");
    this.dropship.visible = false;
    scene.add(this.dropship);
    this.dropFlame = new T.PointLight(0x8ad8ff, 0, 30, 2);
    scene.add(this.dropFlame);
  }

  clear() {
    for (const f of this.bugs.values()) f.dispose(this.scene);
    this.bugs.clear();
    for (const o of this.npcs) this.scene.remove(o.obj);
    this.npcs = [];
    for (const o of this.uses.values()) this.scene.remove(o);
    this.uses.clear();
  }

  update(run, a, dt, t) {
    const p = run.player, k = run.ally;
    const pw = p.def;
    this.player.pose({
      body: p.body, face: p.face, yaw: p.yaw, pitch: p.pitch, aimK: p.aimK, crouchK: p.crouchK, moveK: p.moveK, stepPhase: p.stepPhase,
      firing: p.firing, recoil: p.recoil, downed: p.downed, gun: p.weapon?.id, slots: p.slots.map((g) => g.id), sprint: p.sprinting,
      reloadK: p.reloadT > 0 && pw?.reload ? 1 - p.reloadT / pw.reload : -1, swapT: p.swapT,
      cover: p.cover ? (p.cover.low ? "low" : "high") : null, reach: null,
    }, a, dt, t);
    // Kessler reaches for you while she gets you up.
    let reach = null;
    if (k.mode === "revive" && Math.hypot(p.body.x - k.body.x, p.body.z - k.body.z) < 1.6) {
      reach = this.kessler.obj.worldToLocal(_r.set(p.body.x, p.body.y + 0.5, p.body.z));
      reach.y -= k.crouchK > 0.5 ? 0.6 : 1.03; // into the torso's frame (roughly)
      if (reach.length() > 0.5) reach.setLength(0.5);
    }
    this.kessler.pose({
      body: k.body, face: k.face, yaw: k.aimYaw, pitch: k.aimPitch, aimK: k.aimK, crouchK: k.crouchK, moveK: k.moveK, stepPhase: k.stepPhase,
      firing: k.firing, recoil: k.recoil ?? 0, downed: k.downed, gun: "rifle", sprint: k.body.speed2D > 5.5,
      reloadK: k.reloadT > 0 ? 1 - k.reloadT / k.reloadTime : -1, swapT: 0, cover: null, reach,
    }, a, dt, t);

    // Bugs: add new ones, pose all, drop the gone.
    const seen = new Set();
    for (const g of run.bugs) {
      seen.add(g.id);
      let f = this.bugs.get(g.id);
      if (!f) { f = new BugFigure(this.scene, g); this.bugs.set(g.id, f); }
      f.pose(g, a, dt, t);
    }
    for (const [id, f] of this.bugs) if (!seen.has(id)) { f.dispose(this.scene); this.bugs.delete(id); }

    // Survivors.
    while (this.npcs.length < (run.npcs?.length ?? 0)) {
      const d = run.npcs[this.npcs.length];
      const obj = instance(d.model, d.opts);
      obj.position.set(d.x, d.y, d.z); obj.rotation.y = d.yaw;
      this.scene.add(obj);
      this.npcs.push({ obj, d });
    }
    for (const [i, o] of this.npcs.entries()) o.obj.position.y = o.d.y + Math.sin(t * 1.3 + i) * 0.008;

    // Use points with a model (data pads, ammo, guns on racks or the ground).
    const live = new Set();
    for (const u of run.uses) {
      if (!u.model || u.done) continue;
      live.add(u);
      let o = this.uses.get(u);
      if (!o) {
        o = instance(u.model, { gun: u.weapon });
        o.position.set(u.x, u.y, u.z);
        if (u.model === "dropGun") o.rotation.y = Math.random() * 6;
        this.scene.add(o);
        this.uses.set(u, o);
      }
      if (u.model === "dropGun") o.position.y = u.y + 0.1 + Math.sin(t * 2) * 0.03;
    }
    for (const [u, o] of this.uses) if (!live.has(u)) { this.scene.remove(o); this.uses.delete(u); }

    // The dropship flies its path (a smooth curve through the points).
    const D = run.dropship;
    if (D) {
      const k2 = clamp((run.time - D.t0) / D.dur, 0, 1), e = D.leaving ? k2 * k2 : 1 - (1 - k2) * (1 - k2);
      const P = D.path, segs = P.length - 1, f = e * segs, i = Math.min(segs - 1, Math.floor(f)), u = f - i;
      const A = P[i], B = P[i + 1];
      const x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u), z = lerp(A[2], B[2], u);
      const ds = this.dropship;
      const dx = x - ds.position.x, dz = z - ds.position.z;
      ds.position.set(x, y, z);
      if (Math.hypot(dx, dz) > 0.01) ds.rotation.y += angDiff(ds.rotation.y, Math.atan2(-dx, -dz)) * Math.min(1, dt * 2) * (y > 2 ? 1 : 0);
      ds.rotation.z = Math.sin(t * 0.8) * 0.02 * (y > 1 ? 1 : 0);
      ds.visible = !(D.leaving && k2 >= 1);
      this.dropFlame.position.set(x, y - 0.5, z);
      this.dropFlame.intensity = y > 0.6 && ds.visible ? 40 : 0;
    } else { this.dropship.visible = false; this.dropFlame.intensity = 0; }
  }
}
