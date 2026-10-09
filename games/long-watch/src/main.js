import "./analytics.js";
import { track } from "./analytics.js";
import { DT } from "./config.js";
import { setLang, guessLang, t } from "./i18n/index.js";
import { loadSettings, saveSettings, loadSave, saveSave, clearSave } from "./storage.js";
import { Audio } from "./audio.js";
import { Voice } from "./voice.js";
import { Director } from "./story/director.js";
import { Input } from "./input/index.js";
import { GameView } from "./render/scene.js";
import { Hud } from "./hud.js";
import { Menus } from "./ui/menus.js";
import { PadNav } from "./ui/padnav.js";
import { buildDustmoon } from "./levels/dustmoon.js";
import { SCRIPT } from "./levels/dustmoon-script.js";
import { Run } from "./sim/run.js";
import { Nav } from "./sim/nav.js";
import { rayBugs } from "./sim/combat.js";

// ── The Long Watch ───────────────────────────────────────────────────────────
// Wires it together: the menus, the fixed-step sim, the renderer, sound,
// voices and the HUD. The level is built once; a Run is rebuilt from a
// checkpoint whenever the mission falls back.

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

const menus = new Menus(app, settings, {
  start: () => { clearSave(); begin(null); track("start", { difficulty: settings.difficulty }); },
  cont: () => { const s = loadSave(); begin(s?.cp ?? null); track("continue", { stage: s?.cp?.stage }); },
  resume: () => resume(),
  restartCp: () => { begin(run?.cp ?? loadSave()?.cp ?? null); },
  restart: () => { clearSave(); begin(null); },
  quit: () => toTitle(),
  settingsChanged: (k) => applySettings(k),
  click: () => audio.play("click"),
  padInfo: () => (input.pad.info?.length ? input.pad.info.map((p) => p.id.slice(0, 40)).join(", ") : null),
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
  menus.show("title", { canContinue: !!loadSave()?.cp });
  padnav.focusMain();
  // A slow look over the colony behind the title.
  if (!run) run = new Run(level, { stage: "approach", at: { x: 0, z: 70, yaw: 0 } }, { difficulty: settings.difficulty });
  run.lines.length = 0;
}

function begin(cp) {
  audio.unlock();
  view.reset();
  director.clear();
  run = new Run(level, cp, { difficulty: settings.difficulty });
  input.setView(run.player.yaw, -0.08);
  acc = 0;
  state = "play";
  menus.close();
  input.enabled = true;
  input.lock();
  audio.music(true);
}

function pause() {
  if (state !== "play") return;
  state = "paused";
  input.unlock();
  voice.pause(true);
  audio.suspend(false);
  menus.show("pause");
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
      case "shot": if (e.src === "ally") at("allyRifle"); else if (e.id !== "laser") audio.play(e.id); break;
      case "tracer": if (e.hit === "armor") at("armor"); else if (e.hit === "splat") { at("splat"); if (e.src === "player") hud.hitMarker(false); } else if (e.hit === "spark" && Math.random() < 0.3) at("spark"); break;
      case "bugHit": if (e.armour) at("armor"); break;
      case "kill": hud.hitMarker(true); break;
      case "bugDie": at("die"); break;
      case "blast": at("blast"); break;
      case "reload": audio.play("reload"); break;
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
      case "bugAlert": at("chitter"); break;
      case "leap": at("leap"); break;
      case "spit": at("spit"); break;
      case "acidSplash": case "acidHit": at("acid"); break;
      case "windup": at("windup"); break;
      case "charge": at("charge"); break;
      case "stun": at("stun"); break;
      case "shriek": at("shriek"); hud.spotted(); break;
      case "emerge": case "burrow": at("emerge"); break;
      case "roar": if (!e.quiet) at("roar"); else at("windup"); break;
      case "slam": at("slam"); break;
      case "swipe": at("swipe"); break;
      case "sacPop": at("sacPop"); break;
      case "quake": audio.play("quake"); break;
      case "use": audio.play("use"); break;
      case "objNew": audio.play("objective"); break;
      case "objDone": audio.play("objDone"); hud.showToast(t(`obj_${e.id}`, { n: 3, s: 0 })); break;
      case "checkpoint": hud.showToast(t("checkpoint")); audio.play("checkpoint"); saveSave({ cp: run.cp }); break;
      case "hint": hud.showHint(e.key); audio.play("hint"); break;
      case "powerOn": if (!e.instant) audio.play("powerOn"); break;
      case "genSpin": audio.play("genSpin"); break;
      case "relayOn": if (!e.instant) audio.play("relay"); break;
      case "bunkerOpen": audio.play("door"); break;
      case "ventCharge": if (!e.instant) audio.play("beep"); break;
      case "ventBlown": if (!e.instant) audio.play("blast"); break;
      case "log": openLog(e); break;
      case "won": endT = 1.5; track("won", { time: Math.round(run.stats.time), kills: run.stats.kills }); clearSave(); break;
      case "failed": endT = 2.2; track("failed", { stage: run.stage }); break;
      case "cutStart": hud.root.classList.add("cut"); break;
      case "cutEnd": if (e.skipped) director.clear(); break;
    }
  }
}

function openLog(e) {
  state = "paused";
  input.unlock();
  voice.pause(true);
  menus.show("log", e);
  padnav.focusMain();
}

// ── The loop ──
let stepSound = 0, allyStep = 0;
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
    acc += dt;
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
    const p = run.player, A = run.ally;
    if (Math.floor(p.stepPhase) !== stepSound) { stepSound = Math.floor(p.stepPhase); audio.play("step", p.sprinting ? 1.6 : p.crouchK > 0.5 ? 0.4 : 1); }
    if (Math.floor(A.stepPhase) !== allyStep) { allyStep = Math.floor(A.stepPhase); audio.play("step", A.crouched ? 0.25 : 0.6, A.body.x, A.body.z); }
    // Loops and music.
    audio.listener(p.body.x, p.body.z, input.yaw);
    audio.loop("laser", !!p.beam, p.weapon?.heat ?? 0);
    const D = run.dropship, ds = view.actors.dropship;
    audio.loop("dropship", !!D && ds.visible, 1, ds.position.x, ds.position.z);
    const near = run.bugs.filter((b) => b.alive && b.state === "hunt" && Math.hypot(b.x - p.body.x, b.z - p.body.z) < 40).length;
    audio.intensity += ((Math.min(1, near / 5) + (run.defend ? 0.4 : 0)) - audio.intensity) * Math.min(1, dt * 0.8);
    audio.boss = !!run.boss?.alive;
    // Over.
    if (run.over && endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = "end";
        input.unlock();
        if (run.over === "failed") director.clear();
        menus.show("end", { won: run.over === "won", stats: run.stats });
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
    play: (cp) => begin(cp ?? null),
    stage: (stage) => begin({ stage, flags: stage === "survivors" || stage === "vents" || stage === "boss" ? { power: true, relay: true } : {} }),
    place: (x, z, yaw = 0, pitch = -0.1) => {
      const g = (x2, z2) => run.space.floor(x2, z2, run.space.terrain.height(x2, z2) + 0.6) + 0.05;
      run.player.body.place(x, g(x, z), z); input.setView(yaw, pitch);
      run.ally.body.place(x + 1.5, g(x + 1.5, z + 1.5), z + 1.5);
    },
    steps: (n, I = {}) => { for (let i = 0; i < n; i++) { run.step({ forward: 0, strafe: 0, yaw: input.yaw, pitch: input.pitch, ...I }); events(); } },
    skipCut: () => { if (run.cut) run.step({ skipPressed: true, yaw: input.yaw, pitch: input.pitch, forward: 0, strafe: 0 }); },
    god: (on = true) => { run.player.godMode = on; },
  };
}
