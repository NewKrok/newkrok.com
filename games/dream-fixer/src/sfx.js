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
        case "spawn": if (e.kind === "knot" || e.kind === "sharpener" || e.kind === "grinder" || e.kind === "sunflower") A.play("knotSpawn", 0, e.x, e.z); break;
        case "spit": A.play("spit", 0, e.x, e.z); break;
        case "spitPop": A.play(e.splash ? "splash" : e.kind === "nut" ? "nutHit" : "orbPop", 0, e.x, e.z); break;
        case "nutWindup": A.play("chitter", 0, e.x, e.z); break;
        case "nut": A.play("nut", 0, e.x, e.z); break;
        case "leap": A.play("leap", 0, e.x, e.z); break;
        case "notice": A.play("notice", 0, e.x, e.z); break;
        case "knotWindup": A.play("tubWindup", 0, e.x, e.z); break;
        case "slam": A.play("ballPop", 0, e.x, e.z); break;
        case "heal": A.play("heal"); break;
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
        case "foamSpray": case "foamBlob": A.play(e.type); break;
        case "foamSplat": case "foamSet": case "foamGone": case "foamStuck": case "foamFree": A.play(e.type, 0, e.x, e.z); break;
        case "bellRing": A.play(e.type); break;
        case "gust": case "gustHop": case "umbrellaBlock": A.play(e.type); break;
        case "pinwheel": A.play(e.type, 0, e.x, e.z); break;
        case "yoyoThrow": case "yoyoCatch": case "yoyoLetGo": A.play(e.type); break;
        case "rocketAim": case "rocketDash": case "rocketSputter": case "rocketPuff": case "robotWind": case "robotClap": case "robotCrank": case "robotZap": case "robotDown": case "robotUp":
        case "topWind": case "topGo": case "topBounce": case "topFan": case "mobileThrow": case "mobileSpin": case "mobilePop":
        case "moonBeamOn": case "moonBeam": case "moonTideRing": case "moonRock": case "moonClink":
          A.play(e.type, 0, e.x, e.z); break;
        case "moonTethered": case "moonFree": A.play(e.type); break;
        case "yoyoHit": case "yoyoClack": case "yoyoHook": case "foeTied": case "foeFree": case "foeYank": case "foeDizzy": A.play(e.type, 0, e.x, e.z); break;
        case "rainPat": case "soaked": case "bigclockHit": A.play(e.type); break;
        case "mowerRev": A.play(e.type, e.small ? 1 : 0, e.x, e.z); break;
        case "gnomeStone": case "gnomeGo": case "gnomeWind": case "canWind": case "canPour": case "canSquirt": case "mowerCharge": case "mowerClip":
        case "sunWind": case "sunSeed": case "sunShake": case "sunPetals": case "sunSprout": case "tileWarn": case "tileDrop": case "tileBack":
        case "bigclockRing": case "bigclockSweep": case "bigclockTimesup": case "bigclockClink": case "bigclockUnwound": case "bigclockWound":
          A.play(e.type, 0, e.x, e.z); break;
        case "sneeze": case "steamBurn": A.play(e.type); break;
        case "cookerLid": A.play(e.type, e.off ? 1 : 0, e.x, e.z); break;
        case "meatWind": case "meatRoll": case "meatSplit": case "pepperShake": case "pepperWind": case "pepperBurst": case "pepperDodge": case "cloudBlown":
        case "pinRock": case "pinRoll": case "pinRise": case "grindWind": case "grindPop":
        case "cookerRattle": case "cookerSteam": case "cookerHop": case "cookerLand": case "cookerWhistle": case "cookerBlow":
          A.play(e.type, 0, e.x, e.z); break;
        case "bellLull": A.play(e.type, e.k); break;
        case "bellBat": case "foeSleep": case "foeWake": case "foeDrowsy": case "jellyWobble": case "jellySquish": case "boing": case "souffleFall": A.play(e.type, 0, e.x, e.z); break;
        case "clockSkip": A.play("clockSkip", e.back ? 1 : 0, e.x, e.z); break;
        case "slowed": A.play("slowed"); break;
        case "clockWind": case "clockRing": case "pencilCrouch": case "pencilSpin": case "dizzy":
        case "packWindup": case "packCharge": case "packChomp": case "sharpGrind": case "sharpPop": case "penStrike": case "penLine": case "penCircle":
          A.play(e.type, 0, e.x, e.z); break;
        case "inkBurn": A.play("inkBurn"); break;
        case "penBlot": A.play("foamStuck"); A.play("clog", 0, e.x, e.z); break;
        case "toolSwitch": A.play("switch"); break;
        case "toolUnlocked": A.play("newTool"); break;
        case "catch": A.play("catch"); break;
        case "launch": A.play("launch"); break;
        case "blast": A.play("blast"); break;
        case "ballPop": A.play(e.kind === "pillow" ? "pillowPop" : "ballPop", 0, e.x, e.z); break;
        case "itemUse": A.play(e.id === "pillow" ? "throw" : "sip"); break;
        case "itemNo": A.play("locked"); break;
        case "cogZap": A.play("cogZap", 0, e.to[0], e.to[2]); break;
        case "cogPing": A.play("ping"); break;
        case "cogGrab": A.play("dust", 6); break;
        case "tuneStart": A.play("tuneStart"); break;
        case "wave": A.play("wave"); break;
        case "anchorFixed": A.play("anchorFixed"); break;
        case "coreOpen": A.play("anchorFixed"); break;
        case "coreWake": A.play("coreOpen"); break;
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
    const bell = tool.id === "bell";
    A.loop("charge", tool.charging && !bell ? 0.05 + tool.charge : 0);
    A.loop("hum", tool.charging && bell ? 0.05 + tool.charge : 0);
    A.loop("suck", tool.sucking ? 0.6 + Math.min(0.4, tool.heat) : 0);
    // The umbrella: a fwump as it opens, a flick as it shuts; the wind of a
    // glide, louder up an updraft.
    const open = run.umbrella.open(run);
    if (open !== !!this.wasOpen) A.play(open ? "umbrellaOpen" : "umbrellaShut");
    this.wasOpen = open;
    A.loop("wind", run.umbrella.inDraft ? 0.9 : open && !b.grounded ? 0.45 : 0);
    // The string reeling you in.
    A.loop("whirr", run.yoyo.reeling ? 1 : 0);
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
    A.setSong(run.won ? "win" : B?.alive || run.coreT > 0 ? "boss" : run.def.song ?? run.def.id);
    A.setIntensity(Math.min(1, alive / 6 + (tu ? 0.35 : 0)));
  }
}
