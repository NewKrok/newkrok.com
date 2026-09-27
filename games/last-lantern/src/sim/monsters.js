import { Vec2, DistanceJoint } from "@newkrok/nape-js";
import { DT, HERO_R, RECYCLE_DIST, SPAWN_MIN, SPAWN_MAX, clamp, lerp, hyp, wrapPi } from "../config.js";
import { MON, WORM_SEGMENTS, WORM_SEG_R } from "../data/monsters.js";
import {
  F, heroX, heroY, spawnMonster, spawnSpit, hurtHero, burst, particle, pushProps, damageMonster, floater,
} from "./core.js";

// ── Monster behaviour ────────────────────────────────────────────────────
// Every monster is a dynamic circle and the contact solver is the crowd:
// steering only blends a desired velocity into the body's own, so shoves
// from the crowd, the weapons and the props survive into the next frame.

export function spawnPoint(R, minD = SPAWN_MIN, maxD = SPAWN_MAX) {
  const { W, H } = R.world;
  const hx = heroX(R), hy = heroY(R);
  for (let i = 0; i < 12; i++) {
    const a = R.rng() * Math.PI * 2, d = minD + R.rng() * (maxD - minD);
    const x = hx + Math.cos(a) * d, y = hy + Math.sin(a) * d;
    if (x > 40 && x < W - 40 && y > 40 && y < H - 40) return { x, y };
  }
  for (let i = 0; i < 20; i++) {
    const x = 60 + R.rng() * (W - 120), y = 60 + R.rng() * (H - 120);
    if (Math.hypot(x - hx, y - hy) > minD) return { x, y };
  }
  return { x: 60 + R.rng() * (W - 120), y: 60 + R.rng() * (H - 120) };
}

function steer(m, tx, ty, mul = 1, blend = 0.16) {
  const p = m.body.position;
  const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
  const sp = m.def.speed * mul * m.slow;
  const v = m.body.velocity;
  m.body.velocity = new Vec2(lerp(v.x, (dx / d) * sp, blend), lerp(v.y, (dy / d) * sp, blend));
  m.face = Math.atan2(dy, dx);
}
const setVel = (m, a, sp) => { m.body.velocity = new Vec2(Math.cos(a) * sp, Math.sin(a) * sp); };
const brake = (m, k = 0.8) => { const v = m.body.velocity; m.body.velocity = new Vec2(v.x * k, v.y * k); };

// Surfaces under a walker: mud pools slow, ash beds a little.
function surfaceSlow(R, m) {
  if (m.def.boss) return 1;
  const p = m.body.position;
  let s = 1;
  for (const z of R.zones) {
    if (z.kind === "smoke") { const dx = p.x - z.x, dy = p.y - z.y; if (dx * dx + dy * dy < z.r * z.r) s = Math.min(s, 0.5); continue; }
    if (m.def.fly || m.def.ghost) continue;
    if (z.kind !== "mud" && z.kind !== "ash") continue;
    const dx = p.x - z.x, dy = p.y - z.y;
    if (dx * dx + dy * dy < z.r * z.r) s = Math.min(s, z.kind === "mud" ? 0.55 : 0.82);
  }
  return s;
}

export function tickMonsters(R) {
  const hx = heroX(R), hy = heroY(R);
  const frozen = R.freeze > 0;
  for (let i = R.monsters.length - 1; i >= 0; i--) {
    const m = R.monsters[i];
    if (!m.alive) { R.monsters.splice(i, 1); continue; }
    const def = m.def;
    if (m.hitFlash > 0) m.hitFlash--;
    if (def.prop) continue;
    if (m.orbCd > 0) m.orbCd--;
    m.t++;
    m.anim += DT * (def.speed / 40 + 2) * (frozen || m.stun > 0 ? 0.1 : 1);
    if (m.burn > 0) {
      m.burn--;
      if (m.burn % 20 === 0) damageMonster(R, m, m.burnDmg, 0, 0, 0, "#ff9a4a", "burn");
      if (m.burn % 6 === 0) particle(R, m.body.position.x, m.body.position.y, 0, 0, 0xff8a3a, 20, 2.5, def.r * 1.5, 40);
      if (!m.alive) continue;
    }
    if (m.thrown > 0) { m.thrown--; if (m.thrown === 0) R.landThrown(m); continue; }
    if (def.part) continue;
    if ((R.frame + i) % 6 === 0) m.slow = surfaceSlow(R, m);
    if (frozen && !def.boss) { brake(m, 0.7); continue; }
    if (m.stun > 0) { m.stun--; brake(m, 0.85); continue; }

    const p = m.body.position;
    const dx = hx - p.x, dy = hy - p.y, d = hyp(dx, dy);
    if (d > RECYCLE_DIST && !def.elite && !def.boss) {
      const s = spawnPoint(R, SPAWN_MIN, SPAWN_MAX - 20);
      m.body.position = new Vec2(s.x, s.y);
      m.body.velocity = new Vec2(0, 0);
      continue;
    }
    const ai = AI[def.ai];
    if (ai) ai(R, m, dx, dy, d, hx, hy); else steer(m, hx, hy);
  }
}

const AI = {
  chase(R, m, dx, dy, d, hx, hy) { steer(m, hx, hy); },

  // Bats and wisps swoop: a sideways sine on top of the chase.
  swoop(R, m, dx, dy, d, hx, hy) {
    const s = Math.sin(R.frame * 0.09 + m.wobble) * 90;
    steer(m, hx - (dy / d) * s, hy + (dx / d) * s);
  },
  wiggle(R, m, dx, dy, d, hx, hy) {
    const s = Math.sin(R.frame * 0.3 + m.wobble) * 26;
    steer(m, hx - (dy / d) * s, hy + (dx / d) * s, 1, 0.22);
  },

  // Spitters keep their distance, strafe and spit.
  ranged(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (d > 250) steer(m, hx, hy);
    else if (d < 170) steer(m, p.x - dx, p.y - dy, 0.8);
    else {
      const side = Math.sin(R.frame * 0.02 + m.wobble) > 0 ? 1 : -1;
      steer(m, p.x - dy * side, p.y + dx * side, 0.45);
      m.face = Math.atan2(dy, dx);
    }
    if (--m.spitCd <= 0 && d < 340) {
      m.spitCd = 140 + Math.floor(R.rng() * 60);
      spawnSpit(R, p.x, p.y, Math.atan2(dy, dx), m.def.spit);
      m.hitFlash = 2;
      m.wind = 8;
      R.sfx.push(["spit"]);
    }
    if (m.wind > 0) m.wind--;
  },

  // Healers hang back behind the crowd and, every few seconds, mend the
  // monsters around them. Kill them first.
  healer(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (d > 300) steer(m, hx, hy, 0.9);
    else if (d < 220) steer(m, p.x - dx, p.y - dy, 0.9);
    else { const side = Math.sin(R.frame * 0.015 + m.wobble) > 0 ? 1 : -1; steer(m, p.x - dy * side, p.y + dx * side, 0.4); m.face = Math.atan2(dy, dx); }
    if (m.wind > 0) m.wind--;
    if (--m.spitCd <= 0) {
      m.spitCd = 170 + Math.floor(R.rng() * 50);
      let n = 0;
      for (const o of R.monsters) {
        if (!o.alive || o === m || o.def.prop || o.def.part || o.hp >= o.maxHp) continue;
        const q = o.body.position;
        if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 > 170 * 170) continue;
        const heal = o.maxHp * (o.def.boss ? 0.02 : o.def.elite ? 0.08 : m.def.heal);
        o.hp = Math.min(o.maxHp, o.hp + heal);
        particle(R, q.x, q.y, 0, 0, m.def.c3, 26, 2.6, o.def.r * 2, 70);
        if (heal > 30) floater(R, q.x, q.y - o.def.r - 6, `+${Math.round(heal)}`, "#9aff7a", 0.8);
        n++;
      }
      if (n) {
        R.rings.push({ x: p.x, y: p.y, r: 10, max: 170, t: 0, T: 26, color: m.def.c3 });
        m.wind = 20;
        R.sfx.push(["mend"]);
      }
    }
  },

  // Wolves stalk, crouch and leap at where you will be.
  lunge(R, m, dx, dy, d, hx, hy) {
    if (m.dash > 0) {
      m.dash--;
      setVel(m, m.face, (m.def.elite ? 560 : 470) * m.slow);
      if (m.dash % 3 === 0) particle(R, m.body.position.x, m.body.position.y, 0, 0, m.def.c2, 14, 2.4, 6, 20);
      return;
    }
    if (m.wind > 0) {
      m.wind--;
      brake(m, 0.75);
      const hv = R.hero.body.velocity;
      m.face = Math.atan2(hy + hv.y * 0.25 - m.body.position.y, hx + hv.x * 0.25 - m.body.position.x);
      if (m.wind === 0) { m.dash = m.def.elite ? 22 : 16; R.sfx.push(["lunge"]); }
      return;
    }
    if (--m.dashCd <= 0 && d < (m.def.elite ? 320 : 220) && d > 60) {
      m.dashCd = (m.def.elite ? 150 : 200) + Math.floor(R.rng() * 120);
      m.wind = m.def.elite ? 26 : 22;
      return;
    }
    // Packs circle a little before closing in.
    const s = Math.sin(R.frame * 0.03 + m.wobble) * 60;
    steer(m, hx - (dy / d) * s, hy + (dx / d) * s);
  },

  // Gargoyles circle overhead and dive.
  diver(R, m, dx, dy, d, hx, hy) {
    m.z = m.z ?? 30;
    if (m.dash > 0) {
      m.dash--;
      setVel(m, m.face, 400);
      m.z = Math.max(4, m.z - 3);
      return;
    }
    m.z = Math.min(40, m.z + 0.8);
    if (--m.dashCd <= 0 && d < 260) {
      m.dashCd = 180 + Math.floor(R.rng() * 100);
      m.face = Math.atan2(dy, dx);
      m.dash = 34;
      R.sfx.push(["dive"]);
      return;
    }
    const a = Math.atan2(-dy, -dx) + 0.9 * (m.seed > 0.5 ? 1 : -1);
    steer(m, hx + Math.cos(a) * 170, hy + Math.sin(a) * 170, 1.1);
  },

  // Knights walk at you, and every few seconds wind up and charge.
  charger(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (m.dash > 0) {
      m.dash--;
      setVel(m, m.face, 520);
      if (m.dash % 3 === 0) particle(R, p.x, p.y, 0, 0, m.def.c, 18, 3, 10, 10);
      return;
    }
    if (m.wind > 0) {
      m.wind--;
      brake(m, 0.5);
      m.face = Math.atan2(dy, dx);
      if (m.wind === 0) { m.dash = 24; R.sfx.push(["charge"]); }
      return;
    }
    if (--m.dashCd <= 0 && d < 420 && d > 90) { m.dashCd = 230 + Math.floor(R.rng() * 90); m.wind = 36; return; }
    steer(m, hx, hy);
  },

  // ── Bosses ────────────────────────────────────────────────────────────
  // The Bone Colossus: a charge, a ground slam that throws everything in
  // reach (the crowd too) and skeleton summons.
  colossus(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (m.dash > 0) { m.dash--; setVel(m, m.face, 380); return; }
    if (m.wind > 0) {
      m.wind--;
      brake(m, 0.5);
      if (m.wind === 0) {
        if (m.windKind === "slam") slam(R, p.x, p.y, 240, 26, 440, m.def.c);
        else { m.face = Math.atan2(dy, dx); m.dash = 42; R.sfx.push(["charge"]); }
      }
      return;
    }
    const enraged = m.hp < m.maxHp * 0.4;
    if (--m.slamCd <= 0 && d < 260) { m.slamCd = (enraged ? 300 : 420) + Math.floor(R.rng() * 120); m.wind = 48; m.windKind = "slam"; return; }
    if (--m.dashCd <= 0 && d < 520 && d > 160) { m.dashCd = 330 + Math.floor(R.rng() * 120); m.wind = 40; m.windKind = "dash"; return; }
    if (--m.summonCd <= 0) {
      m.summonCd = enraged ? 360 : 480;
      summonRing(R, "gravebound", p.x, p.y, 10, 70);
    }
    steer(m, hx, hy);
  },

  // The Bog Mother: lobs mud that turns into slowing pools, spawns leeches,
  // and sinks into the bog to come up under you.
  bogmother(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (m.hidden > 0) {
      m.hidden--;
      // Under the water: glide toward the hero, untouchable.
      steer(m, hx, hy, 2.8, 0.2);
      if (m.hidden % 5 === 0) particle(R, p.x, p.y, 0, 0, 0x4f6a3a, 30, 4, 2, 10);
      if (m.hidden === 0) {
        setFilter(m, F.mon());
        slam(R, p.x, p.y, 210, 24, 420, 0x6a8a4a);
        m.zones = (m.zones || 0) + 1;
        R.zones.push({ kind: "mud", x: p.x, y: p.y, r: 120, life: 900, T: 900 });
      }
      return;
    }
    if (m.wind > 0) { m.wind--; brake(m, 0.5); if (m.wind === 0) { m.hidden = 110; setFilter(m, F.none()); R.sfx.push(["submerge"]); } return; }
    if (--m.slamCd <= 0) { m.slamCd = 640 + Math.floor(R.rng() * 120); m.wind = 40; return; }
    if (--m.spitCd <= 0) {
      m.spitCd = m.hp < m.maxHp * 0.5 ? 150 : 210;
      for (let k = 0; k < 3; k++) {
        const hv = R.hero.body.velocity;
        const tx = hx + hv.x * 0.6 + (R.rng() - 0.5) * 160, ty = hy + hv.y * 0.6 + (R.rng() - 0.5) * 160;
        R.globs.push({ x0: p.x, y0: p.y, x1: tx, y1: ty, t: -k * 8, T: 60, kind: "mud", r: 70, dmg: 14 * R.dmgMul, color: 0x5a7a3a });
      }
      R.sfx.push(["lob"]);
    }
    if (--m.summonCd <= 0) { m.summonCd = 420; summonRing(R, "leech", p.x, p.y, 12, 80); }
    steer(m, hx, hy);
  },

  // The Charred Stag: charges three times in a row, leaving burning ground,
  // sweeps with its antlers up close and calls the wolves.
  stag(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (m.dash > 0) {
      m.dash--;
      setVel(m, m.face, 560);
      if (m.dash % 5 === 0) R.zones.push({ kind: "fire", x: p.x, y: p.y, r: 34, life: 260, T: 260 });
      pushProps(R, p.x, p.y, 70, 120);
      if (m.dash === 0 && m.combo > 0) { m.combo--; m.wind = 24; m.windKind = "dash"; }
      return;
    }
    if (m.wind > 0) {
      m.wind--;
      brake(m, 0.5);
      if (m.windKind === "dash") m.face = Math.atan2(dy, dx);
      if (m.wind === 0) {
        if (m.windKind === "sweep") slam(R, p.x, p.y, 170, 22, 380, 0xff7a3a);
        else { m.dash = 38; R.sfx.push(["charge"]); }
      }
      return;
    }
    const enraged = m.hp < m.maxHp * 0.5;
    if (--m.slamCd <= 0 && d < 170) { m.slamCd = 200; m.wind = 30; m.windKind = "sweep"; return; }
    if (--m.dashCd <= 0 && d > 140) { m.dashCd = enraged ? 330 : 420; m.combo = enraged ? 3 : 2; m.wind = 40; m.windKind = "dash"; return; }
    if (--m.summonCd <= 0) {
      m.summonCd = 600;
      for (let k = 0; k < 6; k++) { const s = spawnPoint(R, 380, 460); spawnMonster(R, "ashwolf", s.x, s.y); }
      R.sfx.push(["howl"]);
    }
    steer(m, hx, hy);
  },

  // The Rimeworm: a head that weaves at you, dragging a chain of segment
  // bodies on distance joints; it charges and sheds ice shards.
  worm(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    if (m.dash > 0) {
      m.dash--;
      // Charge with a slow turn, so it can be sidestepped.
      const want = Math.atan2(dy, dx);
      m.face += clamp(wrapPi(want - m.face), -0.02, 0.02);
      setVel(m, m.face, 440);
      return;
    }
    if (m.wind > 0) { m.wind--; brake(m, 0.7); m.face = Math.atan2(dy, dx); if (m.wind === 0) { m.dash = 90; R.sfx.push(["roar"]); } return; }
    if (--m.dashCd <= 0 && d > 200) { m.dashCd = 380 + Math.floor(R.rng() * 100); m.wind = 40; return; }
    if (--m.spitCd <= 0) {
      m.spitCd = m.hp < m.maxHp * 0.5 ? 260 : 360;
      m.segs.forEach((s, k) => {
        if (!s.alive || k % 2) return;
        const q = s.body.position;
        const a = Math.atan2(hy - q.y, hx - q.x) + (R.rng() - 0.5) * 0.6;
        spawnSpit(R, q.x, q.y, a, { dmg: 10, speed: 230, color: 0xaadcff, r: 6 });
      });
      R.sfx.push(["shards"]);
    }
    // Weave: aim a little off to one side and swing across.
    const want = Math.atan2(dy, dx) + Math.sin(R.frame * 0.025 + m.wobble) * 0.7;
    m.face += clamp(wrapPi(want - m.face), -0.05, 0.05);
    const v = m.body.velocity;
    m.body.velocity = new Vec2(lerp(v.x, Math.cos(m.face) * m.def.speed, 0.1), lerp(v.y, Math.sin(m.face) * m.def.speed, 0.1));
  },

  // The Hollow King. Three phases: moon orbs and summons, then orbiting
  // scythes and blinking, then the eclipse, which drags everything to him.
  king(R, m, dx, dy, d, hx, hy) {
    const p = m.body.position;
    const f = m.hp / m.maxHp;
    const want = f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
    if (want > m.phase) {
      m.phase = want;
      R.banner(want === 1 ? "b_king2" : "b_king3", "#c0c8ff", 150);
      slam(R, p.x, p.y, 260, 10, 520, 0xc0c8ff);
      R.sfx.push(["roar"]);
      if (want === 2) R.eclipse = 1;
    }
    // Scythes from phase two on.
    if (m.phase >= 1) {
      m.scA = (m.scA || 0) + DT * (m.phase === 2 ? 2.2 : 1.6);
      const n = m.phase === 2 ? 4 : 3;
      R.hazards.length = 0;
      for (let k = 0; k < n; k++) {
        const a = m.scA + (k / n) * Math.PI * 2;
        R.hazards.push({ x: p.x + Math.cos(a) * 120, y: p.y + Math.sin(a) * 120, r: 18, dmg: 18 * R.dmgMul, a, kind: "scythe" });
      }
    }
    // The eclipse pulls the hero (and the crowd) toward the king.
    if (m.phase === 2) {
      const hv = R.hero.body.velocity;
      R.hero.body.velocity = new Vec2(hv.x - (dx / d) * 5, hv.y - (dy / d) * 5);
      if (R.frame % 4 === 0) particle(R, hx + (R.rng() - 0.5) * 300, hy + (R.rng() - 0.5) * 300, -dx * 0.4, -dy * 0.4, 0xc0c8ff, 24, 2, 4, 0);
    }
    if (m.hidden > 0) {
      m.hidden--;
      if (m.hidden === 20) {
        const a = R.rng() * 6.28;
        m.body.position = new Vec2(clamp(hx + Math.cos(a) * 240, 80, R.world.W - 80), clamp(hy + Math.sin(a) * 240, 80, R.world.H - 80));
        burst(R, m.body.position.x, m.body.position.y, 30, 0xc0c8ff, 3);
      }
      if (m.hidden === 0) setFilter(m, F.mon());
      brake(m, 0.5);
      return;
    }
    if (m.phase >= 1 && --m.dashCd <= 0) { m.dashCd = 420; m.hidden = 40; setFilter(m, F.none()); R.sfx.push(["blink"]); return; }
    if (--m.spitCd <= 0) {
      m.spitCd = m.phase === 0 ? 220 : m.phase === 1 ? 170 : 120;
      const n = m.phase === 2 ? 22 : 16, off = R.rng() * 6.28;
      for (let k = 0; k < n; k++) spawnSpit(R, p.x, p.y, off + (k / n) * Math.PI * 2, { dmg: 12, speed: 200, color: 0xc0c8ff, r: 7, life: 260, big: true });
      R.sfx.push(["orbs"]);
    }
    if (m.phase >= 1 && R.frame % (m.phase === 2 ? 8 : 12) === 0 && (R.frame / 120 | 0) % 3 === 0) {
      m.spiral = (m.spiral || 0) + 0.45;
      spawnSpit(R, p.x, p.y, m.spiral, { dmg: 10, speed: 240, color: 0xe0d0ff, r: 5, life: 200 });
    }
    if (--m.summonCd <= 0) {
      m.summonCd = m.phase === 2 ? 420 : 540;
      summonRing(R, m.phase === 2 ? "specter" : "hollow", hx, hy, 10, 300);
    }
    steer(m, hx, hy, m.phase === 2 ? 0.7 : 1);
  },
};

function setFilter(m, f) {
  const s = m.body.shapes.at(0);
  s.filter = f;
}

function summonRing(R, id, x, y, n, r) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    spawnMonster(R, id, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  burst(R, x, y, 20, MON[id].c, 3);
  R.sfx.push(["summon"]);
}

// A radial shock from (x, y): the crowd and the props are thrown, the hero
// too, and hurt when close.
export function slam(R, x, y, radius, dmg, kick, color) {
  R.rings.push({ x, y, r: 10, max: radius, t: 0, T: 22, color });
  R.shake(14, 0.45);
  R.sfx.push(["slam"]);
  for (const o of R.monsters) {
    if (!o.alive || o.def.boss || o.def.part || o.def.prop) continue;
    const q = o.body.position, dx = q.x - x, dy = q.y - y, dd = Math.hypot(dx, dy);
    if (dd < radius && dd > 1) {
      const k = kick * (1 - dd / radius) / Math.sqrt(o.def.mass) + 60;
      o.body.applyImpulse(new Vec2((dx / dd) * k * o.body.mass, (dy / dd) * k * o.body.mass));
    }
  }
  pushProps(R, x, y, radius, kick * 0.8);
  const hx = heroX(R) - x, hy = heroY(R) - y, hd = hyp(hx, hy);
  if (hd < radius) {
    const k = kick * 0.9 * (1 - hd / radius) + 120;
    R.hero.body.applyImpulse(new Vec2((hx / hd) * k * R.hero.body.mass, (hy / hd) * k * R.hero.body.mass));
    hurtHero(R, dmg * R.dmgMul);
  }
}

// ── Bosses and elites arriving ───────────────────────────────────────────
export function spawnBoss(R, id) {
  const s = spawnPoint(R, 460, 540);
  if (id === "wormhead") return spawnWorm(R, s.x, s.y);
  const m = spawnMonster(R, id, s.x, s.y);
  if (m) burst(R, s.x, s.y, 40, m.def.c, 4);
  return m;
}

// The worm: a head and a chain of segments on distance joints, so the body
// follows the head like a rope, plows through the crowd and wraps around
// the hero.
function spawnWorm(R, x, y) {
  const head = spawnMonster(R, "wormhead", x, y);
  if (!head) return null;
  head.segs = [];
  let prev = head;
  const a = Math.atan2(y - heroY(R), x - heroX(R));
  for (let i = 0; i < WORM_SEGMENTS; i++) {
    const r = WORM_SEG_R * (1 - i / WORM_SEGMENTS * 0.45);
    const sx = x + Math.cos(a) * (i + 1) * 40, sy = y + Math.sin(a) * (i + 1) * 40;
    // Tapering toward the tail.
    const s = spawnMonster(R, "wormseg", sx, sy, { r });
    if (!s) break;
    s.segR = r;
    s.parent = head;
    s.index = i;
    const gap = (prev === head ? head.def.r : prev.segR) + r - 6;
    const j = new DistanceJoint(prev.body, s.body, new Vec2(0, 0), new Vec2(0, 0), gap * 0.8, gap);
    j.space = R.space;
    s.joint = j;
    head.segs.push(s);
    prev = s;
  }
  return head;
}

// Contact damage from the monster touching the hero hardest this frame.
export function contactDamage(R) {
  const h = R.hero;
  if (h.iframes > 0) return;
  let best = null;
  for (const m of R.monsters) {
    if (m.alive && m.touchFrame === R.frame - 1 && m.hidden <= 0 && (!best || m.def.dmg > best.def.dmg)) best = m;
  }
  if (best) hurtHero(R, best.def.dmg * R.dmgMul, best.body.position.x, best.body.position.y, best);
  // Scythes and burning ground.
  const hx = heroX(R), hy = heroY(R);
  for (const z of R.hazards) {
    if (Math.hypot(z.x - hx, z.y - hy) < z.r + HERO_R) { hurtHero(R, z.dmg, z.x, z.y); break; }
  }
  for (const z of R.zones) {
    if (z.kind === "fire" && Math.hypot(z.x - hx, z.y - hy) < z.r + HERO_R * 0.5) { hurtHero(R, 9 * R.dmgMul); break; }
  }
}
