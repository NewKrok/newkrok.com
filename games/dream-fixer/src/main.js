import { DT } from "./config.js";
import { loadSettings, saveSettings, loadProgress, saveProgress, resetProgress } from "./storage.js";
import { setLang, detectLang } from "./i18n/index.js";
import { Input } from "./input/index.js";
import { Hud } from "./hud.js";
import { Run } from "./sim/run.js";
import { park } from "./levels/park.js";
import { factory } from "./levels/factory.js";
import { Audio } from "./audio.js";
import { Sfx } from "./sfx.js";
import { Dialog } from "./story/dialog.js";
import { Director } from "./story/director.js";
import { Menus } from "./ui/menus.js";
import { PadNav } from "./ui/padnav.js";
import { UPGRADES } from "./data/upgrades.js";
import { track } from "./analytics.js";

// ── Boot ─────────────────────────────────────────────────────────────────
// ?model=<id> (dev only) opens the model viewer instead of the game.

const q = new URLSearchParams(location.search);
if (import.meta.env.DEV && q.has("model")) import("./viewer.js").then((m) => m.startViewer(q.get("model")));
else startGame();

const LEVELS = { park, factory };

async function startGame() {
  const { GameView } = await import("./render/scene.js");
  const settings = loadSettings();
  const progress = loadProgress();
  setLang(detectLang(settings.lang));
  const app = document.getElementById("app");

  const view = new GameView(app, settings);
  const input = new Input(app, settings);
  const audio = new Audio();
  audio.setVolumes(settings);
  const sfx = new Sfx(audio);
  let hud = new Hud(app);
  const dialog = new Dialog(app, audio);
  const director = new Director(dialog);
  const menus = new Menus(app, audio);
  const padNav = new PadNav(app, audio);

  const save = () => saveProgress(progress);
  const runOpts = (def) => ({
    difficulty: settings.difficulty,
    aimAssist: settings.aimAssist ? (input.isTouch ? 0.045 : input.usingPad ? 0.035 : 0.015) : 0,
    autoFire: settings.autoFire && input.isTouch,
    upgrades: progress.upgrades,
    memoriesFound: progress.memories,
    noTools: !!def.hub,
    tools: progress.vacuum && !def.hub ? ["stabilizer", "vacuum"] : ["stabilizer"],
  });

  let run = null;
  let state = "title";                 // title | play | menu
  let expectUnlock = false;
  const inDream = () => run && !run.def.hub;

  function startLevel(id) {
    const def = LEVELS[id];
    run = new Run(def, runOpts(def));
    view.load(run);
    director.begin(run, progress);
    progress.justBack = false;
    hud.hub(!!def.hub);
    hud.clear();
    input.touch.ui.classList.toggle("hub", !!def.hub);
    if (def.hub) run.dust = progress.dust;      // the purse, shown in the HUD
    audio.setSong(def.song ?? id);
    if (!def.hub) track("dream_start", { dream: id });
  }

  // ── Screens ──
  const setState = (s) => {
    state = s;
    const playing = s === "play";
    hud.show(playing);
    input.touch.show(playing);
    dialog.hide(s === "title");
    if (!playing) input.touch.release();
  };
  // Go (back) into the game: pointer lock on desktop, straight on touch.
  const resume = () => {
    menus.close();
    audio.unlock();
    // (A pad plays without the mouse grabbed; a click grabs it again.)
    if (!input.isTouch && !input.usingPad) input.lock();
    setState("play");
  };
  // Open a menu from play without the lock loss counting as a pause.
  const openMenu = (fn) => {
    if (document.pointerLockElement) { expectUnlock = true; input.unlock(); }
    setState("menu");
    fn();
  };

  const showTitle = () => {
    setState("title");
    menus.title(progress, {
      onPlay: () => { progress.introSeen = true; save(); resume(); },
      onSettings: () => showSettings(showTitle),
      onHowto: () => menus.howto(showTitle),
    });
  };

  const liveOpts = () => ({ difficulty: settings.difficulty, aimAssist: runOpts(run.def).aimAssist, autoFire: runOpts(run.def).autoFire });
  const showSettings = (back) => menus.settings(settings, {
    onChange: (k, v) => {
      settings[k] = v;
      saveSettings(settings);
      if (k === "lang") { setLang(v); hud.destroy(); hud = new Hud(app); hud.hub(!!run?.def.hub); showSettings(back); }
      if (k === "master" || k === "sfx" || k === "music") audio.setVolumes(settings);
      if (k === "quality") view.setQuality(v);
      if (k === "difficulty" || k === "aimAssist" || k === "autoFire") Object.assign(run.opts, liveOpts());
    },
    onBack: back,
    onReset: () => { resetProgress(progress); startLevel("factory"); showTitle(); },
  });

  // Dust gathered in a dream is kept even if you leave early.
  const bankDust = () => { if (inDream() && !run.banked) { progress.dust += run.dust; run.banked = true; save(); } };

  const showPause = () => menus.pause({
    inDream: inDream(),
    onResume: resume,
    onSettings: () => showSettings(showPause),
    onFactory: () => { bankDust(); menus.close(); menus.fade(() => startLevel("factory")); resume(); },
    onMain: () => { bankDust(); startLevel("factory"); showTitle(); },
  });

  input.enabled = true;
  input.canLock = () => state === "play";
  input.onLockChange = (locked) => {
    if (locked) return;
    if (expectUnlock) { expectUnlock = false; return; }
    if (state === "play" && !input.isTouch && !run.won) openMenu(showPause);
  };
  input.onTouchStart = () => { if (run) Object.assign(run.opts, liveOpts()); };
  app.addEventListener("pointerdown", () => audio.unlock());

  // ── Things used in the Factory ──
  function interact(id) {
    if (id === "board") openMenu(() => menus.board(progress, {
      onTake: (level) => { progress.picked = level; save(); dialog.say("hub_picked"); resume(); },
      onClose: resume,
    }));
    else if (id === "bench") {
      dialog.say("hub_bench");
      const open = () => menus.bench(progress, {
        onBuy: (uid) => {
          const u = UPGRADES.find((x) => x.id === uid);
          if (!u || progress.upgrades[uid] || progress.dust < u.cost) return;
          progress.dust -= u.cost; progress.upgrades[uid] = true; save();
          run.dust = progress.dust;
          audio.play("buy");
          track("upgrade", { id: uid });
          open();
        },
        onClose: resume,
      });
      openMenu(open);
    } else if (id === "radio") dialog.say(dialog.last && dialog.last !== "hub_radio" ? dialog.last : "hub_radio", true);
    else if (id === "lift") {
      if (!progress.picked) { dialog.say("hub_nojob", true); return; }
      const lvl = progress.picked;
      menus.fade(() => startLevel(lvl), 400);
    }
  }

  function onEvents(events) {
    for (const e of events) {
      hud.onEvent(e);
      if (e.type === "interact") interact(e.id);
      else if (e.type === "memory") {
        menus.memory(e.id);
        if (!progress.memories.includes(e.id)) { progress.memories.push(e.id); save(); }
      } else if (e.type === "toolUnlocked" && e.tool === "vacuum") { progress.vacuum = true; save(); }
      else if (e.type === "dreamFixed") {
        const id = run.def.id;
        bankDust();
        if (!progress.done.includes(id)) progress.done.push(id);
        progress.picked = null; progress.night = (progress.night || 0) + 1;
        save();
        track("dream_fixed", { dream: id, time: Math.round(run.time), faints: run.faints });
        const done = run;
        setTimeout(() => openMenu(() => menus.result(done, {
          onFactory: () => {
            menus.close();
            menus.fade(() => { startLevel("factory"); progress.justBack = true; director.begin(run, progress); progress.justBack = false; });
            resume();
          },
          onAgain: () => { menus.close(); menus.fade(() => startLevel(id)); resume(); },
        })), 1500);
      }
    }
    director.events(run, events);
    sfx.events(events);
  }

  const resize = () => view.resize(innerWidth, innerHeight);
  addEventListener("resize", resize);
  resize();

  startLevel("factory");
  showTitle();

  // ── Loop ──
  let last = performance.now(), acc = 0, time = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    // (A frame stamp can be older than `last` after a long level build.)
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    let look = [0, 0];
    const wasPad = input.usingPad;
    input.poll(dt, state === "play");
    if (input.usingPad !== wasPad && run) Object.assign(run.opts, liveOpts());
    if (input.padOn && input.pad.any()) audio.unlock();
    const edges = input.pressed();
    if (state !== "play" && input.padOn) padNav.frame(input.pad, time);
    if (state === "play") {
      hud.touch = input.isTouch;
      hud.pad = input.usingPad;
      hud.unlocked(!input.isTouch && !input.locked && !input.usingPad);
      if (edges.has("pause")) { if (input.isTouch || !input.locked) openMenu(showPause); else input.unlock(); }
      look = input.look();
      run.body.look(look[0], look[1]);
      acc += dt;
      let first = true;
      while (acc >= DT) {
        const intent = input.intent();
        intent.jumpPressed = first && edges.has("jump");
        intent.usePressed = first && edges.has("use");
        if (first) {
          const n = run.tools.length;
          if (edges.has("tool1")) intent.toolTo = 0;
          else if (edges.has("tool2") && n > 1) intent.toolTo = 1;
          else if (edges.has("toolNext")) intent.toolTo = (run.tool + 1) % n;
          else if (edges.has("toolPrev")) intent.toolTo = (run.tool - 1 + n) % n;
        }
        run.step(intent, DT);
        first = false;
        acc -= DT;
      }
      // Presses between two steps must not be lost.
      if (first) for (const k of ["jump", "use", "tool1", "tool2", "toolNext", "toolPrev"]) if (edges.has(k)) input.edges.add(k);
      onEvents(run.events);
      view.consume(run.events);
      run.events.length = 0;
      director.frame(run, dt);
      hud.update(run, dt);
    } else {
      input.look();
      // Behind the title the camera looks slowly round the Factory.
      if (state === "title") { run.body.yaw = Math.sin(time * 0.1) * 0.6; run.body.pitch = 0.05; }
    }
    dialog.update(state === "play" ? dt : 0);
    view.talking = !!dialog.cur;
    sfx.frame(run, dt, state === "play");
    time += dt;
    view.frame(run, acc / DT, dt, look, time);
  };
  requestAnimationFrame(loop);

  if (import.meta.env.DEV) {
    window.__dreamFixer = {
      get run() { return run; }, view, input, settings, progress, menus, dialog,
      play: () => { menus.close(); setState("play"); },
      level: (id) => { startLevel(id); menus.close(); setState("play"); },
      // Advance the sim n steps with a fixed intent (for headless checks).
      steps(n, intent = {}) {
        for (let i = 0; i < n; i++) run.step({ forward: 0, strafe: 0, ...intent, jumpPressed: i === 0 && intent.jumpPressed, usePressed: i === 0 && intent.usePressed }, DT);
        onEvents(run.events); view.consume(run.events); run.events.length = 0;
      },
      place(x, z, yaw = 0, pitch = 0) { const b = run.body; b.place(x, run.kit.floorAt(x, z), z, yaw); b.pitch = pitch; b.px = b.x; b.py = b.y; b.pz = b.z; },
      spawn(kind, x, z) { return run.spawn(kind, x, z); },
      // Jump to the boss fight: all anchors fixed, both tools.
      toBoss() { for (const a of run.anchors) { a.state = "fixed"; a.progress = 1; } run.unlockTool("vacuum"); run.foes.forEach((f) => { f.alive = false; }); },
    };
  }
}
