// ── What the dream sounds like ───────────────────────────────────────────
// Turns the sim's events into one-shots, keeps the held loops (charge,
// vacuum, the boss's suction, a tuning anchor, buzzing wings) in step with
// the state, and picks the music and how busy it is.

export class Sfx {
  constructor(audio) {
    this.a = audio;
    this.dustCombo = 0; this.dustT = 0;
    this.wasHot = false;
  }

  events(events) {
    const A = this.a;
    for (const e of events) {
      switch (e.type) {
        case "shot": A.play(e.big ? "bigZap" : "zap"); if (e.foe || e.boss) A.play(e.boss ? "bossHit" : "hit", e.boss === "bag" ? 1 : 0); break;
        case "pop": A.play(e.big ? "bigPop" : "pop", 0, e.x, e.z); break;
        case "spawn": if (e.kind === "knot") A.play("knotSpawn", 0, e.x, e.z); break;
        case "spit": A.play("spit", 0, e.x, e.z); break;
        case "spitPop": A.play(e.splash ? "splash" : e.kind === "nut" ? "nutHit" : "orbPop", 0, e.x, e.z); break;
        case "nutWindup": A.play("chitter", 0, e.x, e.z); break;
        case "nut": A.play("nut", 0, e.x, e.z); break;
        case "leap": A.play("leap", 0, e.x, e.z); break;
        case "notice": A.play("notice", 0, e.x, e.z); break;
        case "winded": A.play("winded"); break;
        case "wade": A.play(e.big ? "splash" : "wade", 0, e.x, e.z); break;
        case "tubWindup": A.play("tubWindup", 0, e.x, e.z); break;
        case "windup": A.play(e.kind === "bunny" ? "squeak" : "windup", 0, e.x, e.z); break;
        case "bonk": A.play("bonk", 0, e.x, e.z); break;
        case "hurt": A.play("hurt"); break;
        case "faint": A.play("faint"); break;
        case "jump": A.play("jump"); break;
        case "land": A.play("land", e.speed); break;
        case "respawn": A.play("respawn"); break;
        case "dust":
          this.dustCombo = this.dustT > 0 ? this.dustCombo + 1 : 0;
          this.dustT = 0.5;
          A.play("dust", this.dustCombo);
          break;
        case "toolSwitch": A.play("switch"); break;
        case "toolUnlocked": A.play("newTool"); break;
        case "catch": A.play("catch"); break;
        case "launch": A.play("launch"); break;
        case "blast": A.play("blast"); break;
        case "ballPop": A.play("ballPop", 0, e.x, e.z); break;
        case "tuneStart": A.play("tuneStart"); break;
        case "wave": A.play("wave"); break;
        case "anchorFixed": A.play("anchorFixed"); break;
        case "coreOpen": A.play("coreOpen"); break;
        case "bossRise": A.play("bossRise", 0, e.x, e.z); break;
        case "bossGulp": A.play("gulp"); break;
        case "bossBurp": A.play("burp", 0, e.x, e.z); break;
        case "bossClog": A.play("clog", 0, e.x, e.z); break;
        case "bossSweep": A.play("sweep"); break;
        case "bossPhase": A.play("roar"); break;
        case "bossDown": A.play("bossDown"); break;
        case "bossPop": A.play("bossPop"); break;
        case "dreamFixed": A.play("win"); break;
        default:
      }
    }
  }

  frame(run, dt, playing) {
    const A = this.a;
    if (!A.ctx) return;
    this.dustT -= dt;
    const b = run.body;
    A.listener(b.x, b.z, b.yaw);
    if (!playing) { A.stopLoops(); return; }
    const tool = run.activeTool;
    A.loop("charge", tool.charging ? 0.05 + tool.charge : 0);
    A.loop("suck", tool.sucking ? 0.6 + Math.min(0.4, tool.heat) : 0);
    if (tool.overheated && !this.wasHot) A.play("overheat");
    if (!tool.overheated && this.wasHot) A.play("cooled");
    this.wasHot = tool.overheated;
    const B = run.boss;
    const bossSucking = B?.alive && B.state === "suck" && B.t > 0.4;
    A.loop("bossSuck", bossSucking ? Math.max(0.2, 1 - Math.hypot(B.x - b.x, B.z - b.z) / 16) : 0);
    const tu = run.tuning;
    A.loop("tune", tu ? tu.progress : 0);
    let near = 99;
    for (const f of run.foes) if (f.alive && f.kind === "buzzer") near = Math.min(near, Math.hypot(f.px - b.x, f.pz - b.z));
    A.loop("buzz", near < 12 ? 1 - near / 12 : 0);
    // Music: the dream's tune, busier with glitches about, the nightmare's own theme for the boss.
    const alive = run.foes.filter((f) => f.alive).length;
    A.setSong(run.won ? "win" : B?.alive || run.coreT > 0 ? "boss" : run.def.song ?? "park");
    A.setIntensity(Math.min(1, alive / 6 + (tu ? 0.35 : 0)));
  }
}
