import "./analytics.js";
import { track } from "./analytics.js";
import { DT } from "./config.js";
import { setLang, guessLang, t } from "./i18n/index.js";
import { loadSettings, saveSettings } from "./storage.js";
import { Audio } from "./audio.js";
import { Voice } from "./voice.js";
import { Director } from "./story/director.js";
import { Input } from "./input/index.js";
import { GameView } from "./render/scene.js";
import { Hud } from "./hud.js";
import { Menus } from "./ui/menus.js";
import { PadNav } from "./ui/padnav.js";
import { buildDustmoon } from "./levels/dustmoon.js";
import { SCRIPT } from "./levels/siege.js";
import { Run } from "./sim/run.js";
import { Nav } from "./sim/nav.js";
import { rayBugs } from "./sim/combat.js";

// ── The Long Watch ───────────────────────────────────────────────────────────
// Wires it together: the menus, the fixed-step sim, the renderer, sound,
// voices and the HUD. The level is built once; every run is a fresh Run
// on it.

const app = document.getElementById("app");
const settings = loadSettings();
setLang(settings.lang ?? guessLang());
document.title = t("title");

const audio = new Audio();
const voice = new Voice(audio, settings);
const director = new Director(voice);
const view = new GameView(app, settings);
const input = new Input(view.renderer.domElement, settings);
const hud = new Hud(app);
const loading = document.createElement("div");
loading.className = "loading";
loading.textContent = t("loading");
app.appendChild(loading);

// The level (built once; the walking grid takes a moment).
const kit = buildDustmoon();
const level = { kit, script: SCRIPT, nav: new Nav(kit.space) };
view.load(level);
loading.remove();

let run = null;
let state = "menu";            // menu | play | paused | end
let acc = 0, last = performance.now(), time = 0;
let speech = null;
let endT = 0;
let frozen = false;            // dev: the sim holds still (for pictures of a pose)

const menus = new Menus(app, settings, {
  start: () => { begin(); track("start", { difficulty: settings.difficulty }); },
  resume: () => resume(),
  restart: () => begin(),
  quit: () => toTitle(),
  settingsChanged: (k) => applySettings(k),
  click: () => audio.play("click"),
  padInfo: () => (input.pad.info?.length ? input.pad.info.map((p) => p.id.slice(0, 40)).join(", ") : null),
  shop: (station) => (run ? SCRIPT.shop(run, station) : []),
  bank: () => run?.bank ?? 0,
  buy: (id) => { const ok = run ? SCRIPT.buy(run, id) : false; if (ok) { audio.play("pickup"); events(); } else audio.play("dry"); return ok; },
});
const padnav = new PadNav(app, audio);

function applySettings(k) {
  saveSettings(settings);
  audio.setVolumes({ master: settings.master, sfx: settings.sfx, music: settings.music });
  voice.setVolume();
  if (k === "quality") view.setQuality(settings.quality);
  if (k === "lang") { setLang(settings.lang); document.title = t("title"); }
}
applySettings();

function toTitle() {
  state = "menu";
  input.enabled = true;
  input.unlock();
  director.clear();
  audio.stopMusic();
  menus.show("title");
  padnav.focusMain();
  // A slow look over the colony behind the title.
  if (!run) { view.reset(); run = new Run(level, { difficulty: settings.difficulty, seed: 1 }); }
  run.lines.length = 0;
}

function begin(opts = {}) {
  audio.unlock();
  view.reset();
  director.clear();
  run = new Run(level, { difficulty: settings.difficulty, ...opts });
  input.setView(run.player.yaw, -0.08);
  acc = 0; endT = 0;
  state = "play";
  menus.close();
  input.enabled = true;
  input.lock();
  audio.music(true);
  hud.showHint("hint_move");
  setTimeout(() => { if (state === "play") hud.showHint("hint_siege"); }, 9000);
}

function pause(screen = "pause", data) {
  if (state !== "play") return;
  state = "paused";
  input.unlock();
  voice.pause(true);
  audio.suspend(false);
  menus.show(screen, data);
  padnav.focusMain();
}
function resume() {
  if (state !== "paused") return;
  state = "play";
  menus.close();
  voice.pause(false);
  input.lock();
  last = performance.now();
}

input.onLockChange = (locked) => { if (!locked && state === "play" && !run?.cut) pause(); };
input.canLock = () => state === "play";
input.enabled = true;

// ── Sim events → sound, effects and the HUD ──
function events() {
  const p = run.player;
  for (const e of run.drain()) {
    view.handle(e, run);
    const at = (s, k) => audio.play(s, k ?? 0, e.x, e.z);
    switch (e.type) {
      case "shot": if (e.src === "ally" || e.src === "turret" || e.src === "drone") at("allyRifle"); else if (e.id !== "laser") audio.play(e.id); break;
      case "tracer": if (e.hit === "armor") at("armor"); else if (e.hit === "splat") { at("splat"); if (e.src === "player") hud.hitMarker(false); } else if (e.hit === "spark" && Math.random() < 0.3) at("spark"); break;
      case "bugHit": if (e.armour) at("armor"); break;
      case "kill": hud.hitMarker(true); break;
      case "bugDie": at("die"); break;
      case "blast": at("blast"); break;
      case "reload": if (e.src === "ally") at("reload"); else audio.play("reload"); break;
      case "reloaded": audio.play("reloaded"); break;
      case "swap": audio.play("swap"); break;
      case "dry": audio.play("dry"); break;
      case "overheat": audio.play("overheat"); break;
      case "cooled": audio.play("cooled"); break;
      case "pickup": audio.play("pickup"); break;
      case "ammo": audio.play("ammo"); break;
      case "jump": audio.play("jump"); break;
      case "land": audio.play("land", e.k); break;
      case "dash": audio.play("dash"); break;
      case "cover": audio.play("cover"); break;
      case "vault": audio.play("dash"); break;
      case "hurt": audio.play(e.shield ? "shield" : "hurt"); if (p.hurtDir) hud.hurtFrom(p.hurtDir.a); break;
      case "downed": audio.play("downed"); break;
      case "revived": audio.play("revived"); break;
      case "respawn": audio.play("revived"); hud.showToast(t("downedAlone", { s: 0 }).split("…")[0]); break;
      case "bugAlert": at("chitter"); break;
      case "leap": at("leap"); break;
      case "spit": at("spit"); break;
      case "acidSplash": case "acidHit": at("acid"); break;
      case "windup": at("windup"); break;
      case "charge": at("charge"); break;
      case "stun": at("stun"); break;
      case "shriek": at("shriek"); hud.spotted(); break;
      case "emerge": at("emerge"); break;
      case "burrow": if (!e.quiet) at("emerge"); break;
      case "roar": if (!e.quiet) at("roar"); else at("windup"); break;
      case "slam": at("slam"); break;
      case "swipe": at("swipe"); break;
      case "sacPop": at("sacPop"); break;
      case "quake": audio.play("quake"); break;
      case "use": audio.play("use"); break;
      case "hint": hud.showHint(e.key); audio.play("hint"); break;
      case "powerOn": if (!e.instant) audio.play("powerOn"); break;
      // The siege.
      case "waveWarn": hud.showToast(t("toast_warn", { n: e.n, s: e.s })); audio.play("objective"); break;
      case "wave": hud.showToast(t("toast_wave", { n: e.n })); audio.play("checkpoint"); break;
      case "coreHit": if (Math.random() < 0.4) at("armor"); view.kick(0.08); break;
      case "coreDown": audio.play("blast"); view.kick(1); break;
      case "crystal": audio.play("pickup"); break;
      case "bank": hud.showToast(t("toast_bank", { n: e.n, total: e.total })); audio.play("objDone"); break;
      case "crystalLost": hud.showToast(t("toast_lost", { n: e.n })); break;
      case "loot": audio.play("ammo"); break;
      case "bossEmerge": audio.play("quake"); audio.play("roar"); hud.showToast(t("toast_boss")); break;
      case "bossDead": audio.play("objDone"); break;
      case "survived": hud.showToast(t("toast_survived", { score: e.score })); track("survived", { time: Math.round(run.stats.time), kills: run.stats.kills, score: e.score }); break;
      case "bought": hud.showToast(t("toast_bought")); break;
      case "station": pause("station", { station: e.station, bank: run.bank }); break;
      case "healed": audio.play("revived"); hud.showToast(t("toast_healed")); break;
      case "turretUp": audio.play("powerOn"); break;
      case "failed": endT = 2.2; track("failed", { time: Math.round(run.stats.time), waves: run.stats.waves, score: SCRIPT.score(run) }); break;
      case "cutStart": hud.root.classList.add("cut"); break;
      case "cutEnd": if (e.skipped) director.clear(); break;
    }
  }
}

// ── The loop ──
let stepSound = 0;
const allyStep = [];
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  if (import.meta.env.DEV && now < last) (window.__negDt = (window.__negDt ?? 0) + 1);
  last = now; time += dt;
  const playing = state === "play";
  // Aim assist (pad): the look slows over a bug.
  let over = false;
  if (run && playing && !run.cut) {
    const c = run.player.cam;
    if (c.dx !== undefined) over = !!rayBugs(run, c.x, c.y, c.z, c.dx, c.dy, c.dz, 70);
  }
  hud.overBug = over;
  hud.pad = input.usingPad;
  input.poll(dt, playing && !run?.cut, over && settings.aimAssist && input.usingPad);

  if (menus.open) {
    padnav.frame(input.pad, time);
    menus.tick();
    if (state === "paused" && (input.take("pause"))) { if (menus.top?.name === "settings") menus.pop(); else resume(); }
  }

  if (run && playing) {
    if (input.edges.has("pause") && !run.cut) { input.take("pause"); pause(); }
    acc += frozen ? 0 : dt;
    let n = 0;
    while (acc >= DT && n++ < 6) {
      const I = input.intent();
      run.step(I);
      events();
      acc -= DT;
      if (state !== "play") break;
    }
    if (acc > DT * 6) acc = 0;
    // Footsteps.
    const p = run.player;
    if (Math.floor(p.stepPhase) !== stepSound) { stepSound = Math.floor(p.stepPhase); audio.play("step", p.sprinting ? 1.6 : p.crouchK > 0.5 ? 0.4 : 1); }
    run.allies.forEach((A, i) => { if (Math.floor(A.stepPhase) !== allyStep[i]) { allyStep[i] = Math.floor(A.stepPhase); audio.play("step", A.crouched ? 0.25 : 0.6, A.body.x, A.body.z); } });
    // Loops and music.
    audio.listener(p.body.x, p.body.z, input.yaw);
    audio.loop("laser", !!p.beam, p.weapon?.heat ?? 0);
    audio.loop("dropship", false, 1, 0, 0);
    const near = run.bugs.filter((b) => b.alive && b.state === "hunt" && Math.hypot(b.x - p.body.x, b.z - p.body.z) < 40).length;
    const waveOn = run.siege && (run.siege.next < 45 || run.bugs.some((b) => b.alive && b.target === run.core));
    audio.intensity += ((Math.min(1, near / 5) + (waveOn ? 0.4 : 0)) - audio.intensity) * Math.min(1, dt * 0.8);
    audio.boss = !!run.boss?.alive;
    // Over.
    if (run.over && endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = "end";
        input.unlock();
        director.clear();
        menus.show("end", { summary: SCRIPT.summary(run) });
        padnav.focusMain();
      }
    }
  }

  if (run) {
    // The menu backdrop: the camera drifts over the colony.
    if (state === "menu") {
      const a = time * 0.03;
      input.setView(a, -0.12);
      run.player.body.place(Math.sin(a) * -60, 12, 30 + Math.cos(a) * -60);
    }
    director.take(run);
    if (state !== "paused") speech = director.update(performance.now());
    view.render(run, { yaw: input.yaw, pitch: input.pitch }, Math.min(1, acc / DT), dt, time, settings);
    if (state === "play" || state === "end") hud.update(run, view, dt, speech, settings);
    hud.root.classList.toggle("hidden", state === "menu");
  }
}

addEventListener("resize", () => view.resize(innerWidth, innerHeight));
view.resize(innerWidth, innerHeight);
toTitle();
requestAnimationFrame(frame);

// Dev handle for headless checks.
if (import.meta.env.DEV) {
  window.__longWatch = {
    get run() { return run; }, get state() { return state; }, view, input, settings,
    play: (opts) => begin(opts ?? {}),
    place: (x, z, yaw = 0, pitch = -0.1) => {
      const g = (x2, z2) => run.space.floor(x2, z2, run.space.terrain.height(x2, z2) + 0.6) + 0.05;
      run.player.body.place(x, g(x, z), z); input.setView(yaw, pitch);
    },
    steps: (n, I = {}) => { for (let i = 0; i < n; i++) { run.step({ forward: 0, strafe: 0, yaw: input.yaw, pitch: input.pitch, ...I }); events(); } },
    skipCut: () => { if (run.cut) run.step({ skipPressed: true, yaw: input.yaw, pitch: input.pitch, forward: 0, strafe: 0 }); },
    god: (on = true) => { run.player.godMode = on; },
    freeze: (on = true) => { frozen = on; },
    warp: (minutes) => { run.siege.next -= minutes * 60; run.siege.t += minutes * 60; },
  };
}
