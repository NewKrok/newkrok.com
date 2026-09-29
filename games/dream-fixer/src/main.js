import { DT } from "./config.js";
import { loadSettings } from "./storage.js";
import { setLang, detectLang, t } from "./i18n/index.js";
import { Input } from "./input/index.js";
import { Hud } from "./hud.js";
import { Run } from "./sim/run.js";
import { park } from "./levels/park.js";

// ── Boot ─────────────────────────────────────────────────────────────────
// ?model=<id> (dev only) opens the model viewer instead of the game.

const q = new URLSearchParams(location.search);
if (import.meta.env.DEV && q.has("model")) import("./viewer.js").then((m) => m.startViewer(q.get("model")));
else startGame();

async function startGame() {
  const { GameView } = await import("./render/scene.js");
  const settings = loadSettings();
  setLang(detectLang(settings.lang));
  const app = document.getElementById("app");

  const view = new GameView(app, settings);
  const input = new Input(app, settings);
  const hud = new Hud(app);

  // Start / pause card.
  const card = document.createElement("div");
  card.className = "start-card";
  card.innerHTML = `<div class="logo">${t("title")}</div><div class="go"></div><div class="keys">${t("controls")}</div><div class="credit">${t("madeBy")}</div>`;
  app.appendChild(card);
  const go = card.querySelector(".go");

  const runOpts = () => ({
    difficulty: settings.difficulty,
    aimAssist: settings.aimAssist ? (input.isTouch ? 0.07 : 0.03) : 0,
    autoFire: settings.autoFire && input.isTouch,
  });
  let run = new Run(park, runOpts());
  view.load(run);

  // Result card when the dream is fixed.
  const result = document.createElement("div");
  result.className = "result hidden";
  app.appendChild(result);
  const showResult = () => {
    const s = run.stats, m = Math.floor(run.time / 60), sec = String(Math.floor(run.time % 60)).padStart(2, "0");
    result.innerHTML = `<div class="card"><h2>${t("dreamFixed")}</h2><p>${t("dreamFixedSub")}</p><table>
      <tr><td>${t("r_time")}</td><td>${m}:${sec}</td></tr><tr><td>${t("r_dust")}</td><td>${run.dust}</td></tr>
      <tr><td>${t("r_popped")}</td><td>${s.popped}</td></tr><tr><td>${t("r_faints")}</td><td>${run.faints}</td></tr></table>
      <button class="btn" data-a="again">${t("again")}</button></div>`;
    result.classList.remove("hidden");
    result.querySelector("[data-a=again]").onclick = () => {
      result.classList.add("hidden");
      run = new Run(park, runOpts()); view.load(run);
      if (input.isTouch) setState("play"); else input.lock();
    };
    setState("done");
  };

  let state = "menu";
  const setState = (s) => {
    state = s;
    const playing = s === "play";
    card.classList.toggle("hidden", playing || s === "done");
    hud.show(playing);
    input.touch.show(playing);
    go.textContent = s === "pause" ? t("resume") : input.isTouch ? t("tapToPlay") : t("clickToPlay");
    if (!playing) input.touch.release();
  };
  input.enabled = true;
  input.onLockChange = (locked) => {
    if (locked && state !== "play") setState("play");
    else if (!locked && state === "play" && !input.isTouch && !run.won) setState("pause");
  };
  input.onTouchStart = () => { Object.assign(run.opts, runOpts()); if (state !== "play") setState("play"); };
  card.addEventListener("click", () => { if (!input.isTouch) input.lock(); });
  setState("menu");

  const resize = () => view.resize(innerWidth, innerHeight);
  addEventListener("resize", resize);
  resize();

  let last = performance.now(), acc = 0, time = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    let look = [0, 0];
    const edges = input.pressed();
    if (state === "play") {
      hud.touch = input.isTouch;
      if (edges.has("pause")) { if (input.isTouch) setState("pause"); else input.unlock(); }
      look = input.look();
      run.body.look(look[0], look[1]);
      acc += dt;
      let first = true;
      while (acc >= DT) {
        const intent = input.intent();
        intent.jumpPressed = first && edges.has("jump");
        intent.usePressed = first && edges.has("use");
        if (first) {
          if (edges.has("tool1")) intent.toolTo = 0;
          else if (edges.has("tool2")) intent.toolTo = 1;
          else if (edges.has("toolNext")) intent.toolTo = run.tool + 1;
          else if (edges.has("toolPrev")) intent.toolTo = run.tool - 1;
          if (intent.toolTo !== undefined && (intent.toolTo < 0 || intent.toolTo >= run.tools.length)) intent.toolTo = ((intent.toolTo % run.tools.length) + run.tools.length) % run.tools.length;
        }
        run.step(intent, DT);
        first = false;
        acc -= DT;
      }
      // A jump pressed between steps must not be lost.
      if (first && edges.has("jump")) input.edges.add("jump");
      if (first && edges.has("use")) input.edges.add("use");
      for (const e of run.events) { hud.onEvent(e); if (e.type === "dreamFixed") { input.unlock(); setTimeout(showResult, 50); } }
      view.consume(run.events);
      run.events.length = 0;
      hud.update(run, dt);
    } else input.look();
    time += dt;
    view.frame(run, acc / DT, dt, look, time);
  };
  requestAnimationFrame(loop);

  if (import.meta.env.DEV) {
    window.__dreamFixer = {
      get run() { return run; }, view, input, settings,
      play: () => setState("play"),
      // Advance the sim n steps with a fixed intent (for headless checks).
      steps(n, intent = {}) { for (let i = 0; i < n; i++) run.step({ forward: 0, strafe: 0, ...intent, jumpPressed: i === 0 && intent.jumpPressed, usePressed: i === 0 && intent.usePressed }, DT); view.consume(run.events); run.events.length = 0; },
      place(x, z, yaw = 0, pitch = 0) { const b = run.body; b.place(x, run.kit.floorAt(x, z), z, yaw); b.pitch = pitch; },
      restart() { run = new Run(park, runOpts()); view.load(run); },
      spawn(kind, x, z) { return run.spawn(kind, x, z); },
      // Jump to the boss fight: all anchors fixed, both tools.
      toBoss() { for (const a of run.anchors) { a.state = "fixed"; a.progress = 1; } run.unlockTool("vacuum"); run.foes.forEach((f) => { f.alive = false; }); },
    };
  }
}
