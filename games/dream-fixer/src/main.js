import { DT } from "./config.js";
import { loadSettings, saveSettings, loadProgress, saveProgress, resetProgress } from "./storage.js";
import { setLang, detectLang, hasLine, t } from "./i18n/index.js";
import { Input } from "./input/index.js";
import { Hud } from "./hud.js";
import { Run } from "./sim/run.js";
import { LEVELS } from "./levels/index.js";
import { TOOL_ORDER } from "./sim/tools.js";
import { Audio } from "./audio.js";
import { Sfx } from "./sfx.js";
import { Dialog } from "./story/dialog.js";
import { Voice } from "./voice.js";
import { Director } from "./story/director.js";
import { Menus } from "./ui/menus.js";
import { PadNav } from "./ui/padnav.js";
import { UPGRADES, ITEMS, level, nextCost, pocketFor, isLocked } from "./data/upgrades.js";
import { XP, rankFor, checkAchievements } from "./data/progression.js";
import { track } from "./analytics.js";

// ── Boot ─────────────────────────────────────────────────────────────────
// ?model=<id> (dev only) opens the model viewer instead of the game.

const q = new URLSearchParams(location.search);
if (import.meta.env.DEV && q.has("model")) import("./viewer.js").then((m) => m.startViewer(q.get("model")));
else startGame();

async function startGame() {
  const { GameView } = await import("./render/scene.js");
  const { BenchPreview } = await import("./render/preview.js");
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
  dialog.voice = new Voice(audio, settings);
  const director = new Director(dialog);
  // Every line heard goes into the journal, to read again later.
  dialog.onLine = (id) => { if (!progress.log.includes(id)) { progress.log.push(id); save(); } };
  const menus = new Menus(app, audio);
  menus.preview = new BenchPreview();
  const padNav = new PadNav(app, audio);

  const save = () => saveProgress(progress);
  // A dream is played normal, or (once fixed) in deep sleep: hard.
  const runOpts = (def, hard = false) => ({
    difficulty: hard ? "hard" : "normal",
    aimAssist: settings.aimAssist ? (input.isTouch ? 0.045 : input.usingPad ? 0.035 : 0.015) : 0,
    autoFire: settings.autoFire && input.isTouch,
    upgrades: progress.upgrades,
    items: progress.items,
    memoriesFound: progress.memories,
    noTools: !!def.hub,
    // A dream starts with the Stabilizer only: its own tool comes down
    // after the first anchor (a test level brings its own).
    tools: [...(def.tools ?? ["stabilizer"])].sort((a, b) => TOOL_ORDER.indexOf(a) - TOOL_ORDER.indexOf(b)),
    // The Factory hangs up what you have done (fixed dreams, trophies).
    progress,
    // Dropping into a dream: the arrival.
    arrive: !def.hub,
  });

  let run = null;
  let state = "title";                 // title | play | menu
  let expectUnlock = false;
  const inDream = () => run && !run.def.hub;

  let runXp = 0;
  function startLevel(id, hard = false) {
    const def = LEVELS[id];
    run = new Run(def, runOpts(def, hard));
    runXp = 0;
    view.load(run);
    director.begin(run, progress);
    progress.justBack = false;
    hud.hub(!!def.hub);
    hud.clear();
    input.touch.ui.classList.toggle("hub", !!def.hub);
    if (def.hub) run.dust = progress.dust;      // the purse, shown in the HUD
    // A job taken: Cog flies over to the lift to show the way.
    if (def.hub && progress.picked) run.guide = run.kit.marks.lift;
    hud.rank(progress.xp);
    audio.setSong(def.song ?? id);
    if (!def.hub) audio.play("arrive");
    if (!def.hub && !def.dev) track("dream_start", { dream: id, hard });
  }

  // ── Screens ──
  let menuAt = 0;
  const setState = (s) => {
    if (s !== state) menuAt = performance.now();
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

  const liveOpts = () => ({ aimAssist: runOpts(run.def).aimAssist, autoFire: runOpts(run.def).autoFire });
  const showSettings = (back) => menus.settings(settings, {
    onChange: (k, v) => {
      settings[k] = v;
      saveSettings(settings);
      if (k === "lang") { setLang(v); hud.destroy(); hud = new Hud(app); hud.hub(!!run?.def.hub); hud.rank(progress.xp); showSettings(back); }
      if (k === "master" || k === "sfx" || k === "music") audio.setVolumes(settings);
      if (k === "voiceVol" || k === "master") dialog.voice.setVolume();
      if (k === "voice" && !v) dialog.voice.stop();
      if (k === "quality") view.setQuality(v);
      if (k === "aimAssist" || k === "autoFire") Object.assign(run.opts, liveOpts());
    },
    onBack: back,
    onReset: () => { resetProgress(progress); startLevel("factory"); showTitle(); },
  });

  // Dust gathered in a dream is kept even if you leave early (not from a test level).
  const bankDust = () => { if (inDream() && !run.def.dev && !run.banked) { progress.dust += run.dust; progress.stats.dust += run.dust; run.banked = true; achieve(); save(); } };

  // ── Rank and achievements ──
  // Experience is counted as it comes (not from a test level); a rank up
  // says so at once, and so does an achievement.
  const counts = () => inDream() && !run.def.dev;
  function gainXp(n) {
    if (!counts()) return;
    n = Math.round(n * (run.opts.difficulty === "hard" ? XP.hard : 1));
    const before = rankFor(progress.xp);
    progress.xp += n; runXp += n;
    hud.rank(progress.xp, n);
    if (rankFor(progress.xp) > before) { hud.banner(t("rankUp", { n: rankFor(progress.xp) }), true); audio.play("rankUp"); achieve(); save(); }
  }
  function achieve(ctx) {
    const got = checkAchievements(progress, ctx);
    for (const id of got) { menus.achievement(id); audio.play("achievement"); track("achievement", { id }); }
    if (got.length) save();
  }

  const showPause = () => menus.pause({
    inDream: inDream(),
    onResume: resume,
    onJournal: () => menus.journal(progress, { onClose: showPause }),
    onAchievements: () => menus.achievements(progress, { onClose: showPause }),
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
  let lastRadio = null, lastWindow = null;
  // Cog's beep when he loops round you to show the way.
  view.companion.onPing = () => { if (state === "play") audio.play("ping"); };
  function interact(id) {
    if (id === "board") openMenu(() => menus.board(progress, {
      onTake: (level, hard) => { progress.picked = level; progress.pickedHard = hard; save(); run.guide = run.kit.marks.lift; dialog.say("hub_picked"); resume(); },
      onClose: resume,
    }));
    else if (id === "bench") {
      dialog.say("hub_bench");
      const open = () => menus.bench(progress, {
        onBuy: (id) => {
          // An upgrade goes up a level; kit goes into your pockets, while they hold it.
          const u = UPGRADES.find((x) => x.id === id), it = ITEMS.find((x) => x.id === id);
          const cost = u ? nextCost(u, progress.upgrades) : it?.cost;
          if (cost == null || progress.dust < cost) return;
          if (isLocked(u ?? it, progress)) return;
          if (u) {
            progress.upgrades[id] = level(progress.upgrades, id) + 1;
          } else {
            const n = progress.items[id] || 0;
            if (n >= pocketFor(progress.upgrades)) return;
            progress.items[id] = n + 1;
          }
          progress.dust -= cost; save();
          run.dust = progress.dust;
          audio.play("buy");
          track(u ? "upgrade" : "kit_buy", { id, level: u ? progress.upgrades[id] : undefined });
          achieve();
          open();
        },
        onClose: resume,
      });
      openMenu(open);
    } else if (id === "journal") openMenu(() => menus.journal(progress, { onClose: resume }));
    else if (id === "trophies") openMenu(() => menus.achievements(progress, { onClose: resume }));
    else if (id === "window") {
      // Stand and gaze out at the night (and Álmos); Margo now and then has a word.
      run.gaze = { t: 0 };
      if (!dialog.busy && Math.random() < 0.6) {
        const all = [];
        for (let i = 1; hasLine(`hub_window_${i}`); i++) if (`hub_window_${i}` !== lastWindow) all.push(`hub_window_${i}`);
        lastWindow = all[Math.floor(Math.random() * all.length)];
        if (lastWindow) dialog.say(lastWindow, true);
      }
    }
    else if (id === "radio") {
      // Margo picks up with one of her lines, never the same one twice running.
      const all = ["hub_radio"];
      for (let i = 2; hasLine(`hub_radio_${i}`); i++) all.push(`hub_radio_${i}`);
      const pool = all.filter((x) => x !== lastRadio);
      lastRadio = pool[Math.floor(Math.random() * pool.length)];
      if (!dialog.busy) { dialog.say(lastRadio, true); progress.stats.radio++; achieve(); save(); }
    }
    else if (id === "lift") {
      if (!progress.picked) { dialog.say("hub_nojob", true); return; }
      const lvl = progress.picked, hard = !!progress.pickedHard;
      menus.fade(() => startLevel(lvl, hard), 400);
    }
  }

  function onEvents(events) {
    for (const e of events) {
      hud.onEvent(e);
      // Experience, lifetime counters, achievements.
      if (counts()) {
        const S = progress.stats;
        if ((e.type === "pop" && !e.calm) || e.type === "catch") { S.popped++; gainXp(e.big ? XP.big : XP.small); }
        else if (e.type === "anchorFixed") { S.anchors++; gainXp(XP.anchor); save(); }
        else if (e.type === "bossPop") { S.bosses++; gainXp(XP.boss); }
        else if (e.type === "memory") gainXp(XP.memory);
        else if (e.type === "cogZap") S.zaps++;
        else if (e.type === "itemUse") S.kit++;
        else if (e.type === "faint") S.faints++;
        else if (e.type === "respawn" && !e.pulled) S.falls++;
        if (["pop", "catch", "cogZap", "itemUse", "respawn", "anchorFixed", "bossPop", "bossClog", "penBlot", "cookerLid", "bigclockUnwound", "moonTethered"].includes(e.type)) achieve({ event: e });
      }
      if (e.type === "interact") interact(e.id);
      else if (e.type === "memory") {
        menus.memory(e.id);
        if (!progress.memories.includes(e.id)) { progress.memories.push(e.id); save(); }
        if (counts()) achieve();
      } else if (e.type === "toolUnlocked" && !run.def.dev && !progress.tools.includes(e.tool)) { progress.tools.push(e.tool); save(); }
      else if (e.type === "itemUse" && !run.def.dev) {
        progress.items[e.id] = Math.max(0, (progress.items[e.id] || 0) - 1); save();
        track("kit_use", { id: e.id, dream: run.def.id });
      }
      else if (e.type === "dreamFixed") {
        const id = run.def.id;
        if (!run.def.dev) gainXp(XP.fixed);
        bankDust();
        if (!progress.done.includes(id)) progress.done.push(id);
        if (run.opts.difficulty === "hard" && !progress.hard.includes(id)) progress.hard.push(id);
        if (!run.def.dev) achieve({ fixed: run });
        progress.picked = null; progress.night = (progress.night || 0) + 1;
        save();
        track("dream_fixed", { dream: id, time: Math.round(run.time), faints: run.faints });
        const done = run, xp = runXp, hard = run.opts.difficulty === "hard";
        setTimeout(() => openMenu(() => menus.result(done, {
          xp,
          onFactory: () => {
            menus.close();
            menus.fade(() => { startLevel("factory"); progress.justBack = true; director.begin(run, progress); progress.justBack = false; });
            resume();
          },
          onAgain: () => { menus.close(); menus.fade(() => startLevel(id, hard)); resume(); },
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
  // (dev) ?level=<id> starts there instead, Play goes straight in.
  if (import.meta.env.DEV && LEVELS[q.get("level")]) startLevel(q.get("level"));

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
    // Esc in a menu: back, close or resume (not the moment a menu opens, nor on the title).
    if (state !== "play" && edges.has("pause") && performance.now() - menuAt > 300 && menus.open !== "title") { padNav.press("[data-a=back], [data-a=close], [data-a=resume]"); edges.delete("pause"); }
    if (state === "play") {
      hud.touch = input.isTouch;
      hud.pad = input.usingPad;
      hud.unlocked(!input.isTouch && !input.locked && !input.usingPad);
      input.touch.items(run.items);
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
          intent.item = ["pillow", "espresso", "cocoa"].find((id) => edges.has(`item_${id}`));
          const n = run.tools.length;
          const k = [1, 2, 3, 4, 5, 6].find((i) => edges.has(`tool${i}`) && i <= n);
          if (k) intent.toolTo = k - 1;
          else if (edges.has("toolNext")) intent.toolTo = (run.tool + 1) % n;
          else if (edges.has("toolPrev")) intent.toolTo = (run.tool - 1 + n) % n;
        }
        run.step(intent, DT);
        first = false;
        acc -= DT;
      }
      // Presses between two steps must not be lost.
      if (first) for (const k of ["jump", "use", "tool1", "tool2", "tool3", "tool4", "tool5", "tool6", "toolNext", "toolPrev", "item_pillow", "item_espresso", "item_cocoa"]) if (edges.has(k)) input.edges.add(k);
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
    dialog.pause(state !== "play");
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
      // Hand yourself a tool (its bench upgrades open up) or some dust to spend.
      tool(id) { if (!progress.tools.includes(id)) { progress.tools.push(id); save(); } },
      dust(n = 500) { progress.dust += n; if (run.def.hub) run.dust = progress.dust; save(); },
      // Jump to the boss fight: all anchors fixed, both tools.
      toBoss() { for (const a of run.anchors) { a.state = "fixed"; a.progress = 1; } if (run.def.unlockTool) run.unlockTool(run.def.unlockTool.id); run.foes.forEach((f) => { f.alive = false; }); },
    };
  }
}
