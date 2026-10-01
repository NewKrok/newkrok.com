import { DT, PARK_HOLD, SCORE, clamp, fmtTime, fmtPar } from "./config.js";
import { quantizeInput, createRecorder, scoreRun, holdStep } from "./run.js";
import { LEVELS, CHAPTERS } from "./levels.js";
import { createSim } from "./sim.js";
import { Scene3D } from "./render/scene3d.js";
import { drawLevelThumb, drawRigIcon } from "./render/topdown.js";
import { Hud } from "./hud.js";
import { Audio } from "./audio.js";
import { Gamepad, BTN } from "./gamepad.js";
import { track } from "./analytics.js";
import { lb } from "./leaderboard.js";
import {
  loadSettings, saveSettings, loadProgress, recordResult, isUnlocked, totalStars, firstUnfinished,
  saveProgress,
} from "./storage.js";
import { t, levelText, setLang, detectLang, getLang, LANGS } from "./i18n/index.js";

// ── Hitch & Park ─────────────────────────────────────────────────────────
// Phases: menu (DOM menus over a slowly orbiting site) → intro (brief card,
// overview camera) → play → done (result card). "paused" freezes play.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const app = $("#app");
const settings = loadSettings();
setLang(detectLang(settings.lang));
const trailerName = (L) => (L.trailer === "semi" ? t("tractorSemi") : `${t("veh_" + (L.vehicle ?? "car"))} + ${t("tr_" + L.trailer)}`);
const camName = (m) => t("cam" + m);
const progress = loadProgress(LEVELS);
const audio = new Audio();
const hud = new Hud($("#hud"));
let scene;

const G = {
  phase: "menu",
  levelIdx: 0,
  clock: 0,
  hold: 0,
  result: null,
  time: 0,            // render clock (s)
  shake: 0,
  camMode: settings.camMode,
  camDist: 1,
  look: 0,            // camera turned round the rig (rad), smoothed
  mouseX: null,       // mouse position across the screen, 0..1 (mouse look)
  snapCam: true,
  resultAt: 0,        // when the result card should appear
};

const sim = createSim({ onEvent: onSimEvent });

// ── Screens ──────────────────────────────────────────────────────────────
let screenStack = [];          // for "back"
function showScreen(id, { push = false } = {}) {
  const cur = $(".screen.active:not(#loading)");
  if (push && cur) screenStack.push(cur.id);
  if (!push) screenStack = [];
  $$(".screen:not(#loading)").forEach((s) => s.classList.toggle("active", s.id === id));
  updateIngameButtons();
  const first = id && ($(`#${id} .btn.primary`) ?? $(`#${id} .btn`));
  if (first && matchMedia("(hover: hover)").matches) first.focus({ preventScroll: true });
}
function hideScreens() {
  $$(".screen:not(#loading)").forEach((s) => s.classList.remove("active"));
  screenStack = [];
  updateIngameButtons();
}
function back() {
  audio.play("back");
  const prev = screenStack.pop();
  if (prev) {
    $$(".screen:not(#loading)").forEach((s) => s.classList.toggle("active", s.id === prev));
    updateIngameButtons();
    if (prev === "menu-levels") renderLevelSelect();
    if (prev === "menu-main") renderMain();
    return;
  }
  goMain();
}
function updateIngameButtons() {
  const anyScreen = !!$(".screen.active:not(#loading)");
  $("#hud").style.visibility = $(".screen.scroll.active") ? "hidden" : "";
  $("#ingame").classList.toggle("hidden", G.phase !== "play" || anyScreen);
}
function toast(msg, ms = 1800) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), ms);
}
const bind = (name, value, root = document) => $$(`[data-bind="${name}"]`, root).forEach((el) => { el.textContent = value; });

// ── Main menu ────────────────────────────────────────────────────────────
function renderMain() {
  bind("stars", totalStars(progress));
  bind("maxStars", LEVELS.length * 3);
  const any = progress.best.some(Boolean);
  const next = firstUnfinished(progress, LEVELS.length);
  bind("continueLabel", any ? t("continueJob", { n: next + 1 }) : t("play"));
  const link = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
  $("[data-bind=madeBy]").innerHTML = t("madeBy", { name: link("https://x.com/KSomoracz", "Krisztian Somoracz") });
  $("[data-bind=techLine]").innerHTML = t("techLine", { nape: link("https://napejs.org/", "nape-js"), three: link("https://threejs.org/", "three.js") });
}

function goMain() {
  trackQuit();
  G.phase = "menu";
  audio.setMusic(true);
  const idx = firstUnfinished(progress, LEVELS.length);
  if (sim.level !== LEVELS[idx]) { G.levelIdx = idx; sim.load(LEVELS[idx]); }
  hud.clearFx();
  renderMain();
  showScreen("menu-main");
}

// ── Level select ─────────────────────────────────────────────────────────
let thumbsBuilt = false, thumbsLang = "";
function buildLevelSelect() {
  const root = $("#sites");
  root.innerHTML = "";
  CHAPTERS.forEach((ch, ci) => {
    const sec = document.createElement("section");
    sec.className = "site";
    const levels = LEVELS.filter((l) => l.chapter === ci);
    sec.innerHTML = `<h3>${t("chapter", { n: ci + 1, name: t("ch" + (ci + 1)) })} <small>${t("chs" + (ci + 1))}</small></h3><div class="grid"></div>`;
    const grid = $(".grid", sec);
    for (const l of levels) {
      const lt = levelText(l);
      const b = document.createElement("button");
      b.className = "lvl";
      b.dataset.level = l.index;
      b.innerHTML = `<canvas width="360" height="200"></canvas><span class="num">${l.index + 1}</span>
        <div class="meta"><div class="title">${lt.title}</div><div class="sub">${lt.name} · ${t("tr_" + l.trailer)} · ${t("par", { t: fmtPar(l.par) })}</div>
        <div class="st"><span class="stars"></span><small class="score"></small></div></div>`;
      grid.appendChild(b);
    }
    root.appendChild(sec);
  });
}
function renderLevelSelect() {
  if (!thumbsBuilt || thumbsLang !== getLang()) {
    thumbsLang = getLang();
    buildLevelSelect();
    // Thumbnails are drawn a few per frame so the screen opens at once.
    const cards = $$(".lvl");
    let i = 0;
    const drawSome = () => {
      for (let k = 0; k < 3 && i < cards.length; k++, i++) drawLevelThumb($("canvas", cards[i]), LEVELS[Number(cards[i].dataset.level)]);
      if (i < cards.length) requestAnimationFrame(drawSome);
    };
    requestAnimationFrame(drawSome);
    thumbsBuilt = true;
  }
  bind("stars", totalStars(progress));
  const next = firstUnfinished(progress, LEVELS.length);
  for (const card of $$(".lvl")) {
    const i = Number(card.dataset.level);
    const best = progress.best[i];
    const open = isUnlocked(progress, i);
    card.classList.toggle("locked", !open);
    card.classList.toggle("next", open && !best && i === next);
    let lock = $(".lock", card);
    if (!open && !lock) { lock = document.createElement("span"); lock.className = "lock"; lock.textContent = "🔒"; card.appendChild(lock); }
    if (open && lock) lock.remove();
    const st = best?.stars ?? 0;
    $(".stars", card).innerHTML = [0, 1, 2].map((k) => `<span class="${k < st ? "star-i" : "off"}">★</span>`).join("");
    $(".score", card).textContent = best ? t("pts", { n: best.score }) : "";
    card.setAttribute("aria-label", `${t("job", { n: i + 1 })}: ${levelText(LEVELS[i]).title}${open ? "" : " 🔒"}`);
  }
}

// ── Intro ────────────────────────────────────────────────────────────────
function openIntro(idx) {
  G.levelIdx = idx;
  const L = LEVELS[idx];
  sim.load(L);
  G.phase = "intro";
  G.clock = 0; G.hold = 0; G.result = null; G.shake = 0;
  hud.clearFx();
  audio.setMusic(true);
  G.camMode = settings.camMode;
  G.introPreview = false;           // intro shows the whole site until a view is picked
  const root = $("#intro");
  const lt = levelText(L);
  bind("introSite", `${t("job", { n: idx + 1 })} · ${lt.name}`, root);
  bind("introTitle", lt.title, root);
  bind("introBrief", lt.brief, root);
  bind("introTrailer", trailerName(L), root);
  bind("introPar", t("par", { t: fmtPar(L.par) }), root);
  const best = progress.best[idx];
  bind("introBest", best ? `${t("best", { score: best.score })} · ${"★".repeat(best.stars)}${"☆".repeat(3 - best.stars)}` : "", root);
  bind("introRecord", "", root);
  if (lb.available) lb.level(L.id, 1).then((r) => {
    const top = r.top?.[0];
    if (top && G.phase === "intro" && G.levelIdx === idx) bind("introRecord", `🏆 ${t("lb_record", { score: top.score, name: top.name })}`, root);
  });
  renderViewPick();
  renderPadHint();
  const cv = $("canvas.rig", root);
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawRigIcon(ctx, L.vehicle ?? "car", L.trailer, cv.width / 2, cv.height / 2, cv.width - 30, L.color);
  showScreen("intro");
}

const cleared = () => progress.best.filter(Boolean).length;
// Leaving a level from the pause menu: how far they got before giving up.
function trackQuit() {
  if (G.phase === "paused") track("level_quit", { ...levelInfo(LEVELS[G.levelIdx]), time_s: Math.round(G.clock), bumps: sim.hits + sim.crashes });
}
const levelInfo = (L) => ({ level_id: L.id, level_number: L.index + 1, chapter: L.chapter + 1, vehicle: L.vehicle });

function startDriving({ retry = false } = {}) {
  if (G.phase !== "intro" && G.phase !== "play") return;
  if (G.phase === "intro") track("level_start", { ...levelInfo(LEVELS[G.levelIdx]), retry });
  audio.setMusic(false);
  audio.play("go");
  G.phase = "play";
  sim.scoring = true;
  G.rec = createRecorder();         // every input from here to the bay: the run's replay
  lb.prepare(LEVELS[G.levelIdx]);
  G.snapCam = true;                 // start in the chosen view, no glide from the overview
  G.look = 0;
  hideScreens();
  hud.banner(t("banner_go"), "#7ee787", 0.9);
  hud.markPlayer();
  updateCamLabel();
}

function restart() {
  if (G.phase === "menu") return;
  const idx = G.levelIdx;
  sim.load(LEVELS[idx]);
  G.clock = 0; G.hold = 0; G.result = null; G.shake = 0; G.resultAt = 0;
  hud.clearFx();
  G.phase = "intro";
  startDriving({ retry: true });
}

function pause() {
  if (G.phase !== "play") return;
  G.phase = "paused";
  joy = null;
  audio.play("click");
  showScreen("pause");
}
function resume() {
  if (G.phase !== "paused") return;
  G.phase = "play";
  hideScreens();
}

// ── Scoring ──────────────────────────────────────────────────────────────
function finishLevel() {
  const L = sim.level, ps = sim.park;
  const bumps = sim.hits + sim.crashes;
  const stats = { steps: G.rec.steps, hits: sim.hits, crashes: sim.crashes, cones: sim.coneHits, acc: ps.acc };
  const { score, stars, time, timeBonus, accBonus } = scoreRun(L, stats);
  const rec = recordResult(progress, G.levelIdx, { stars, score, time });
  track("level_complete", { ...levelInfo(L), stars, score, time_s: Math.round(time), bumps, first_clear: rec.first });
  if (rec.first && cleared() === LEVELS.length) track("all_complete", { stars: totalStars(progress) });
  G.run = { level: L, ...stats, score, stars, replay: G.rec.encode(), sent: false };
  G.lbState = lb.available ? (lb.player ? { kind: "sending" } : { kind: "join" }) : null;
  if (lb.available && lb.player) submitRun(G.run);
  G.result = { score, stars, time, hits: sim.hits, crashes: sim.crashes, cones: sim.coneHits, acc: ps.acc, timeBonus, accBonus, isBest: rec.isBest && !rec.first };
  G.phase = "done";
  sim.scoring = false;
  G.resultAt = G.time + 1.1;
  hud.banner(t("banner_parked"), "#7ee787", 1.8);
  audio.play("parked");
}

function showResult() {
  const r = G.result, L = sim.level;
  const root = $("#result");
  const row = (a, b, c, cls) => `<tr><td>${a}</td><td>${b}</td><td class="${cls}">${c}</td></tr>`;
  const bumpPts = r.hits * SCORE.bump + r.crashes * SCORE.crash;
  $("[data-bind=resultRows]", root).innerHTML = [
    row(t("r_time"), `${fmtTime(r.time)} <span style="color:var(--faint)">(${t("par", { t: fmtPar(L.par) })})</span>`, r.timeBonus ? `+${r.timeBonus}` : "0", r.timeBonus ? "plus" : "zero"),
    row(t("r_acc"), `${Math.round(r.acc)} %`, `+${r.accBonus}`, "plus"),
    row(t("r_bumps"), t("bumpsLine", { h: r.hits, c: r.crashes }), bumpPts ? `−${bumpPts}` : "0", bumpPts ? "minus" : "zero"),
    row(t("r_cones"), String(r.cones), r.cones ? `−${r.cones * SCORE.cone}` : "0", r.cones ? "minus" : "zero"),
  ].join("");
  bind("resultScore", String(r.score), root);
  renderLbLine();
  $("[data-bind=resultBest]", root).classList.toggle("hidden", !r.isBest);
  const last = G.levelIdx === LEVELS.length - 1;
  bind("nextLabel", last ? t("allJobs") : t("nextJob"), root);
  const stars = $$(".rs", root);
  stars.forEach((s) => s.classList.remove("on", "shown"));
  stars.forEach((s, i) => setTimeout(() => {
    if (G.phase !== "done") return;
    if (i < r.stars) { s.classList.add("on"); audio.play("star", i); } else { s.classList.add("shown"); audio.play("nostar"); }
    if (i === 2 && r.isBest) setTimeout(() => audio.play("best"), 250);
  }, 350 + i * 260));
  showScreen("result");
}

function nextLevel() {
  const n = G.levelIdx + 1;
  if (n >= LEVELS.length) { openLevels(); toast(t("lastJob")); return; }
  openIntro(n);
}

function openLevels() {
  trackQuit();
  if (G.phase === "paused" || G.phase === "done" || G.phase === "intro") {
    G.phase = "menu";
    audio.setMusic(true);
  }
  renderLevelSelect();
  showScreen("menu-levels", { push: G.phase === "menu" && !!$("#menu-main.active") });
  // Start at the job last picked, not at the top of the list.
  const card = $(`.lvl[data-level="${G.levelIdx}"]`);
  if (card) {
    card.focus({ preventScroll: true });
    requestAnimationFrame(() => card.scrollIntoView({ block: "center" }));
  }
}

// ── Leaderboard ──────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const LB_ERRORS = { outdated: "lb_outdated", slow_down: "lb_slow", offline: "lb_offline", not_configured: "lb_offline", db_unavailable: "lb_offline" };

async function submitRun(run) {
  run.sent = true;
  const r = await lb.submit(run);
  if (G.run !== run) return;             // already on another job
  if (r.error === "no_player") G.lbState = { kind: "join" };
  else G.lbState = r.error ? { kind: "error", msg: t(LB_ERRORS[r.error] ?? "lb_err") } : { kind: "done", ...r };
  if (!r.error) track("leaderboard_submit", { ...levelInfo(run.level), rank: r.rank, improved: r.improved });
  renderLbLine();
}

// The line under the score on the result card.
function renderLbLine() {
  const el = $("[data-bind=lbLine]");
  const s = G.lbState;
  el.classList.toggle("hidden", !s);
  el.classList.toggle("err", s?.kind === "error");
  if (!s) return;
  const open = `<button class="btn small" data-action="board">${t("lb_open")}</button>`;
  if (s.kind === "join") el.innerHTML = `<button class="btn small" data-action="lbName">🏆 ${t("lb_join")}</button>${open}`;
  else if (s.kind === "sending") el.innerHTML = `<span>${t("lb_sending")}</span>`;
  else if (s.kind === "error") el.innerHTML = `<span>${esc(s.msg)}</span>`;
  else {
    const line = t(s.improved ? "lb_rank" : "lb_rankBest", { rank: `<b>${s.rank}</b>`, total: s.total });
    el.innerHTML = `<span>🏆 ${line}</span>${open}${s.verified ? "" : `<small>${t("lb_checking")}</small>`}`;
  }
}

function openNameDialog() {
  const form = $("[data-form=lbName]");
  form.name.value = lb.player?.name ?? "";
  bind("lbNameErr", "");
  showScreen("lb-name", { push: true });
  setTimeout(() => form.name.focus(), 50);
}
async function saveName(form) {
  const btn = $("[type=submit]", form);
  btn.disabled = true;
  const r = await lb.setName(form.name.value);
  btn.disabled = false;
  if (r.error) {
    const msg = t(`lb_err_${r.error}`);   // name_invalid, name_taken, name_rude; t() returns the key when there is none
    bind("lbNameErr", msg.startsWith("lb_err_") ? t(LB_ERRORS[r.error] ?? "lb_err") : msg);
    return;
  }
  track("leaderboard_name", { renamed: !!G.lbRenaming });
  back();
  if (G.phase === "done" && G.run && !G.run.sent) { G.lbState = { kind: "sending" }; renderLbLine(); submitRun(G.run); }
  if ($("#menu-board.active")) renderBoard();
}

const board = { tab: "job", level: 0, seq: 0 };
function openBoard() {
  board.level = G.levelIdx;
  showScreen("menu-board", { push: true });
  renderBoard();
}
async function renderBoard() {
  const seq = ++board.seq;
  const overall = board.tab === "overall";
  $$(".lb-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === board.tab));
  $(".board").classList.toggle("overall", overall);
  const L = LEVELS[board.level];
  const lt = levelText(L);
  bind("boardSite", t("job", { n: board.level + 1 }));
  bind("boardTitle", `${lt.name} · ${lt.title}`);
  $("[data-bind=boardHead]").innerHTML = `<tr><th>#</th><th>${t("lb_col_name")}</th>${overall ? `<th class="num t">${t("lb_col_jobs")}</th>` : `<th class="num t">${t("lb_col_time")}</th>`}<th class="num">${t("lb_col_score")}</th></tr>`;
  bind("boardMe", lb.player ? t("lb_playingAs", { name: lb.player.name }) : "");
  bind("boardNameBtn", lb.player ? t("lb_change") : t("lb_setName"));
  bind("boardMsg", "…");
  $("[data-bind=boardRows]").innerHTML = "";
  const r = overall ? await lb.overall(10) : await lb.level(L.id, 10);
  if (seq !== board.seq) return;
  if (r.error) { bind("boardMsg", t(LB_ERRORS[r.error] ?? "lb_err")); return; }
  bind("boardMsg", r.top.length ? "" : t("lb_empty"));
  const row = (e) => {
    const you = e.you ? ` <small>${t("lb_you")}${e.verified ? "" : " · ⏳"}</small>` : "";
    const mid = overall ? `${e.levels} <span class="stars">★</span>${e.stars}` : `${fmtTime(e.steps * DT)} <span class="stars">${"★".repeat(e.stars)}</span>`;
    return `<tr class="${e.you ? "me" : ""}"><td class="r">${e.rank}</td><td class="n">${esc(e.name)}${you}</td><td class="num t">${mid}</td><td class="num s">${e.score}</td></tr>`;
  };
  $("[data-bind=boardRows]").innerHTML = r.top.map(row).join("") + (r.you ? `<tr class="gap"><td colspan="4"></td></tr>${row(r.you)}` : "");
}
// What the replay check did to runs sent earlier, one toast after another.
function showNotices(list) {
  const msgs = list.map((n) => {
    const L = LEVELS.find((l) => l.id === n.level);
    if (!L) return null;
    const job = L.index + 1;
    return n.status === "rejected"
      ? t("lb_notice_rejected", { n: job })
      : t("lb_notice_adjusted", { n: job, score: n.score, time: fmtTime(n.steps * DT) });
  }).filter(Boolean);
  msgs.forEach((m, i) => setTimeout(() => toast(m, 5500), 1200 + i * 6000));
}

function boardStep(d) {
  board.level = (board.level + d + LEVELS.length) % LEVELS.length;
  renderBoard();
}

// ── Sim events → sound, floaters, shake ──────────────────────────────────
function onSimEvent(type, e) {
  if (type === "bump") {
    hud.floater(e.x, e.y, `${t("fl_bump")} −${SCORE.bump}`, "#ffd166");
    audio.play("bump", e.speed / 30);
    G.shake = Math.max(G.shake, 0.45);
  } else if (type === "crash") {
    hud.floater(e.x, e.y, `${t("fl_crash")} −${SCORE.crash}`, "#ff5c5c");
    audio.play("crash");
    G.shake = Math.max(G.shake, 1);
  } else if (type === "mine") {
    // A mine: the rig is thrown, and the job starts again after a moment.
    hud.blast(e.x, e.y);
    hud.banner(t("banner_mine"), "#ff5c5c", 2.4);
    audio.play("boom");
    G.shake = 2.2;
    G.phase = "boom";
    G.boomAt = G.time + 2.6;
    sim.scoring = false;
    track("level_mine", { ...levelInfo(LEVELS[G.levelIdx]), time_s: Math.round(G.clock) });
  } else if (type === "cone") {
    hud.floater(e.x, e.y - 8, `${t("fl_cone")} −${SCORE.cone}`, "#ffb347");
    audio.play("cone");
  }
}

// ── Input ────────────────────────────────────────────────────────────────
const keys = {};
let joy = null;                // { id, ox, oy, x, y } in CSS px
const pad = new Gamepad();
let padActive = false;         // the pad drove this frame (else keys / pointer)
let digitalSteer = true;       // last steering came from keys or the pad (can hold)

// For parking the wheel can be set to stay where it is left instead of
// centring itself (the `autoCentre` setting): keys, d-pad and the pad's
// stick; pointer drag is absolute and always centres.
function readInput() {
  let throttle = 0, steer = 0;
  if (keys.ArrowUp || keys.KeyW) throttle += 1;
  if (keys.ArrowDown || keys.KeyS) throttle -= 1;
  if (keys.ArrowLeft || keys.KeyA) steer -= 1;
  if (keys.ArrowRight || keys.KeyD) steer += 1;
  let brake = !!keys.Space;
  if (steer) digitalSteer = true;
  if (padActive) {
    const p = pad.drive();
    if (p.throttle) throttle = clamp(throttle + p.throttle, -1, 1);
    // The stick follows the centring setting too, like the d-pad.
    if (p.steer) { steer = p.steer; digitalSteer = true; }
    brake ||= p.brake;
  }
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy;
    steer = clamp(dx / 55, -1, 1);
    if (Math.abs(steer) < 0.12) steer = 0;
    digitalSteer = false;
    if (settings.pointer !== "steer") {
      if (dy < -14) throttle = clamp(-dy / 60, 0, 1);
      else if (dy > 14) throttle = -clamp(dy / 60, 0, 1);
    }
  }
  const centre = settings.autoCentre;
  const holdSteer = digitalSteer && !joy && (centre === "never" || (centre === "forward" && sim.veh.gear < 0));
  return quantizeInput({ throttle, steer, brake, holdSteer });
}

// Escape (and the pad's B): one step back from wherever we are.
function escapeAction() {
  const onScreen = (id) => $(`#${id}.active`);
  if (G.phase === "play") pause();
  else if (G.phase === "paused" && onScreen("pause")) resume();
  else if (G.phase === "paused" && onScreen("menu-settings")) back();
  else if (G.phase === "intro" || (G.phase === "done" && onScreen("result"))) openLevels();
  else if (screenStack.length || onScreen("menu-levels") || onScreen("menu-howto") || onScreen("menu-settings")) back();
}
const toggleRearCam = () => { settings.rearCam = !settings.rearCam; saveSettings(settings); toast(t(settings.rearCam ? "rearOn" : "rearOff")); };
const toggleGuide = () => { settings.guide = !settings.guide; saveSettings(settings); toast(t(settings.guide ? "guideOn" : "guideOff")); };

// The last camera picked (here or in the intro) is where the next job starts.
function setCamMode(m, { announce = false } = {}) {
  G.camMode = m;
  settings.camMode = m;
  saveSettings(settings);
  updateCamLabel();
  renderViewPick();
  if (announce) toast(t("camToast", { mode: camName(m) }));
}
function cycleCamera() { setCamMode((G.camMode + 1) % 3, { announce: true }); trackCamera("in_game"); }
const trackCamera = (from) => track("camera_change", { camera: ["follow", "chase", "overview"][G.camMode] ?? G.camMode, from, level_number: G.levelIdx + 1 });
function updateCamLabel() { const el = $(".cam-label"); if (el) el.textContent = camName(G.camMode); }
function renderViewPick() {
  for (const b of $$(".vp")) b.classList.toggle("on", Number(b.dataset.cam) === G.camMode);
}

window.addEventListener("keydown", (e) => {
  audio.unlock();
  const code = e.code;
  if (/input|textarea|select/i.test(e.target?.tagName || "") && code !== "Escape") return;
  keys[code] = true;
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(code) && G.phase === "play") e.preventDefault();
  if (e.repeat) return;
  const onScreen = (id) => $(`#${id}.active`);
  document.body.classList.remove("pad-nav");
  if (code === "Escape") {
    e.preventDefault();
    escapeAction();
    return;
  }
  if (G.phase === "play") {
    if (code === "KeyR") restart();
    if (code === "KeyP") pause();
    if (code === "KeyC") cycleCamera();
    if (code === "KeyV") toggleRearCam();
    if (code === "KeyG") toggleGuide();
  } else if (G.phase === "intro" && onScreen("intro")) {
    if (code === "Enter" || code === "Space") { e.preventDefault(); startDriving(); }
  } else if (G.phase === "done" && onScreen("result")) {
    if (code === "Enter") { e.preventDefault(); nextLevel(); }
    if (code === "KeyR") restart();
  } else if (G.phase === "paused" && onScreen("pause")) {
    if (code === "KeyR") restart();
  }
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; joy = null; });

// Touch / mouse joystick on the open road.
app.addEventListener("pointerdown", (e) => {
  audio.unlock();
  window.focus();
  if (G.phase !== "play" || e.target.closest("button, .screen")) return;
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  app.setPointerCapture?.(e.pointerId);
});
app.addEventListener("pointermove", (e) => {
  if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; }
  if (e.pointerType === "mouse") G.mouseX = e.clientX / Math.max(1, app.clientWidth);
});
document.addEventListener("mouseleave", () => { G.mouseX = null; });
const endJoy = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
app.addEventListener("pointerup", endJoy);
app.addEventListener("pointercancel", endJoy);
app.addEventListener("wheel", (e) => {
  if (G.phase !== "play" && G.phase !== "paused") return;
  G.camDist = clamp(G.camDist * (e.deltaY > 0 ? 1.08 : 1 / 1.08), 0.55, 1.7);
}, { passive: true });

// ── Buttons ──────────────────────────────────────────────────────────────
app.addEventListener("click", (e) => {
  const lvl = e.target.closest(".lvl");
  if (lvl) {
    const i = Number(lvl.dataset.level);
    if (!isUnlocked(progress, i)) { audio.play("locked"); toast(t("locked")); return; }
    audio.play("click");
    openIntro(i);
    return;
  }
  const tab = e.target.closest(".lb-tabs button");
  if (tab) { audio.play("click"); board.tab = tab.dataset.tab; renderBoard(); return; }
  const vp = e.target.closest(".vp");
  if (vp) { audio.play("click"); G.introPreview = true; setCamMode(Number(vp.dataset.cam)); trackCamera("intro"); return; }
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action;
  if (a !== "back") audio.play("click");
  switch (a) {
    case "continue": openIntro(firstUnfinished(progress, LEVELS.length)); break;
    case "levels": openLevels(); break;
    case "howto": showScreen("menu-howto", { push: true }); break;
    case "settings": renderSettings(); showScreen("menu-settings", { push: true }); break;
    case "back": back(); break;
    case "drive": startDriving(); break;
    case "resume": resume(); break;
    case "restart": restart(); break;
    case "next": nextLevel(); break;
    case "main": goMain(); break;
    case "pause": pause(); break;
    case "camera": cycleCamera(); break;
    case "board": openBoard(); break;
    case "boardPrev": boardStep(-1); break;
    case "boardNext": boardStep(1); break;
    case "lbName": G.lbRenaming = !!lb.player; openNameDialog(); break;
    case "reset":
      if (confirm(t("confirmReset"))) {
        progress.best = [];
        saveProgress(progress);
        toast(t("progressReset"));
      }
      break;
    default:
  }
});
app.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.dataset.form === "lbName") saveName(e.target);
});
app.addEventListener("pointerover", (e) => {
  const b = e.target.closest(".btn, .lvl:not(.locked)");
  if (b && b !== app.lastHover && e.pointerType === "mouse") audio.play("hover");
  app.lastHover = b;
});

// ── Settings ─────────────────────────────────────────────────────────────
function renderSettings() {
  const sel = $("#lang-select");
  if (!sel.options.length) sel.innerHTML = LANGS.map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
  sel.value = getLang();
  for (const el of $$("#menu-settings [data-setting]")) {
    const k = el.dataset.setting;
    if (k === "lang") continue;
    if (el.type === "range") el.value = settings[k];
    else if (el.type === "checkbox") el.checked = !!settings[k];
    else $$("button", el).forEach((b) => b.classList.toggle("on", String(settings[k]) === b.dataset.value));
  }
}
function applySettings() {
  audio.setVolumes({ master: settings.master, sfx: settings.sfx, music: settings.music });
  saveSettings(settings);
}
$("#menu-settings").addEventListener("change", (e) => {
  if (e.target.id !== "lang-select") return;
  settings.lang = e.target.value;
  setLang(settings.lang);
  track("language_change", { lang: settings.lang });
  saveSettings(settings);
  renderMain();
  updateCamLabel();
});
$("#menu-settings").addEventListener("input", (e) => {
  const k = e.target.dataset.setting;
  if (!k || k === "lang") return;
  settings[k] = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
  applySettings();
});
$("#menu-settings").addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (!b) return;
  const k = b.closest("[data-setting]").dataset.setting;
  settings[k] = k === "camMode" ? Number(b.dataset.value) : b.dataset.value;
  if (k === "autoCentre" || k === "pointer") track("controls_change", { setting: k, value: settings[k] });
  if (k === "camMode") { setCamMode(settings.camMode); trackCamera("settings"); return renderSettings(); }
  if (k === "quality") { scene.setQuality(settings.quality); scene.lv && (scene.lv.gen = -1); }
  applySettings();
  renderSettings();
});

// ── Gamepad: driving buttons and menu navigation ─────────────────────────
pad.onConnect = (on) => { toast(t(on ? "padOn" : "padOff")); if (on) track("gamepad_connect", {}); renderPadHint(); };
const renderPadHint = () => bind("padHint", t(pad.info ? "padHintOn" : "padHintOff"));
// Settings: what the controller reports, live, so a pad that misbehaves
// can be checked (name, mapping, pressed buttons, axes).
let padInfoAt = 0;
function renderPadInfo() {
  if (!$("#menu-settings.active") || G.time < padInfoAt) return;
  padInfoAt = G.time + 0.1;
  const info = pad.info;
  bind("padInfo", info ? info.map((p) => `${p.id}\n${t("pad_mapping")}: ${p.mapping} · ${t("pad_buttons")}: ${p.buttons.join(" ") || "–"}\n${t("pad_axes")}: ${p.axes.join("  ")}`).join("\n\n") : t("pad_none"));
}

const visible = (el) => el.offsetParent !== null && !el.disabled;
function focusables() {
  const scr = $(".screen.active:not(#loading)");
  if (!scr) return [];
  return $$("button, select, input, .lvl", scr).filter(visible);
}
// Moves the focus to the nearest control in a direction.
function moveFocus(dir) {
  const list = focusables();
  if (!list.length) return;
  const cur = document.activeElement;
  if (!list.includes(cur)) { (list.find((b) => b.classList.contains("primary")) ?? list[0]).focus(); return; }
  // Sliders and the language list take left / right themselves.
  if ((dir === "left" || dir === "right") && (cur.type === "range" || cur.tagName === "SELECT")) {
    const d = dir === "right" ? 1 : -1;
    if (cur.type === "range") {
      cur.value = clamp(Number(cur.value) + d * Number(cur.step || 0.05), Number(cur.min), Number(cur.max));
      cur.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      cur.selectedIndex = clamp(cur.selectedIndex + d, 0, cur.options.length - 1);
      cur.dispatchEvent(new Event("change", { bubbles: true }));
    }
    audio.play("hover");
    return;
  }
  // Up / down: the nearest row first, then the control in it closest
  // across (the old single score jumped past narrow controls, such as the
  // language list under the Back button). Left / right: within the row.
  const r0 = cur.getBoundingClientRect();
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  const vertical = dir === "up" || dir === "down", sgn = dir === "down" || dir === "right" ? 1 : -1;
  const cands = [];
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
    if (vertical) {
      if ((ey - cy) * sgn <= 4) continue;
      const gap = sgn > 0 ? r.top - r0.bottom : r0.top - r.bottom;
      cands.push({ el, gap: Math.max(0, gap), across: Math.abs(ex - cx) });
    } else {
      if ((ex - cx) * sgn <= 4 || r.top >= r0.bottom - 2 || r.bottom <= r0.top + 2) continue;
      cands.push({ el, gap: Math.abs(ex - cx), across: 0 });
    }
  }
  let best = null;
  if (cands.length) {
    const near = Math.min(...cands.map((c) => c.gap)) + 12;
    best = cands.filter((c) => c.gap <= near).sort((p, q) => p.across - q.across || p.gap - q.gap)[0].el;
  }
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: "nearest", behavior: "smooth" });
    audio.play("hover");
  } else if (vertical) scrollScreen(sgn * 160, true);
}

// Scrolls the open scrolling screen (How to play, levels, settings).
function scrollScreen(dy, smooth = false) {
  const scr = $(".screen.scroll.active");
  if (scr) scr.scrollBy({ top: dy, behavior: smooth ? "smooth" : "instant" });
}

function pollPad() {
  const had = !!pad.info;
  padActive = pad.poll();
  if (had !== !!pad.info) renderPadHint();
  renderPadInfo();
  if (!padActive) return;
  if (pad.any()) audio.unlock();
  const P = (b) => pad.pressed(b);
  if (G.phase === "play") {
    // Zoom on the right stick.
    if (pad.axes[3]) G.camDist = clamp(G.camDist * (1 + pad.axes[3] * 0.02), 0.55, 1.7);
    if (P(BTN.START)) pause();
    else if (P(BTN.BACK)) restart();
    else if (P(BTN.Y)) cycleCamera();
    else if (P(BTN.LB)) toggleRearCam();
    else if (P(BTN.RB)) toggleGuide();
    return;
  }
  // Right stick scrolls the screen.
  if (pad.axes[3]) scrollScreen(pad.axes[3] * 16);
  const dir = pad.nav(G.time);
  if (dir) { document.body.classList.add("pad-nav"); moveFocus(dir); }
  const onScreen = (id) => $(`#${id}.active`);
  if (P(BTN.B)) { escapeAction(); return; }
  if (G.phase === "paused" && onScreen("pause") && P(BTN.START)) { resume(); return; }
  if (G.phase === "intro" && onScreen("intro") && P(BTN.START)) { startDriving(); return; }
  if (G.phase === "done" && onScreen("result")) {
    if (P(BTN.START)) { nextLevel(); return; }
    if (P(BTN.X)) { restart(); return; }
  }
  if (P(BTN.A)) {
    document.body.classList.add("pad-nav");
    const el = document.activeElement;
    const list = focusables();
    // Nothing picked yet: A takes the screen's main button (Drive!, Next …).
    const target = list.includes(el) ? el : list.find((x) => x.classList.contains("primary"));
    if (target?.tagName === "SELECT") moveFocus("right");
    else if (target) target.click();
    else moveFocus("down");
  }
}

// ── Loop ─────────────────────────────────────────────────────────────────
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  G.time += dt;
  pollPad();

  if (G.phase === "boom" && G.time >= G.boomAt) restart();
  if (G.phase === "play" || G.phase === "done" || G.phase === "boom") {
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      const playing = G.phase === "play";
      const input = playing ? readInput() : { throttle: 0, steer: 0, brake: true };
      if (playing) G.rec.push(input);
      const prevGear = sim.veh.gear;
      const ps = sim.step(input);
      if (playing) {
        G.clock += DT;
        if (sim.veh.gear !== prevGear) audio.play("gear");
        G.hold = holdStep(G.hold, ps);
        if (G.hold >= PARK_HOLD && G.phase === "play") finishLevel();
      }
    }
  } else acc = 0;
  if (G.phase === "done" && G.resultAt && G.time >= G.resultAt) { G.resultAt = 0; showResult(); }

  G.shake = Math.max(0, G.shake - dt * 2.5);
  hud.tick(G.phase === "paused" ? 0 : dt);

  const v = sim.veh;
  const driving = G.phase === "play";
  audio.drive({
    active: driving || G.phase === "done" || G.phase === "boom",
    speed: v.speed, throttle: driving ? v.throttle : 0, skid: v.skid, loose: v.skidLoose,
    reverse: driving && v.gear < 0, clearance: driving && v.gear < 0 ? sim.rearClearance() : Infinity,
    hazard: driving && sim.parked.some((p) => p.hazard > 0), dt, truck: v.key === "truck" || !!v.spec.heavy,
  });

  const shake = G.shake > 0
    ? [(Math.sin(G.time * 91) + Math.sin(G.time * 53)) * G.shake * 1.6, (Math.cos(G.time * 77) + Math.sin(G.time * 61)) * G.shake * 1.6]
    : [0, 0];
  if (G.phase !== "menu" && G.phase !== "paused") scene.adapt(dt);
  // How far the screen is between the last two physics steps.
  const alpha = G.phase === "play" || G.phase === "done" || G.phase === "boom" ? acc / DT : 1;
  // Look round: the pad's right stick (full push = straight back), else
  // the mouse across the screen when mouse look is on.
  // Both on a curve, so small movements barely turn it and only a full
  // push (or the screen's edge) looks behind; eased slowly.
  let lookTo = 0;
  const curve = (v) => Math.sign(v) * Math.abs(v) ** 2.2;
  if (G.phase === "play" && padActive && pad.axes[2]) lookTo = -curve(pad.axes[2]) * Math.PI;
  else if (G.phase === "play" && settings.mouseLook && G.mouseX != null && !joy) {
    const m = clamp((G.mouseX - 0.5) * 2, -1, 1), dead = 0.3;
    lookTo = Math.abs(m) < dead ? 0 : -curve(Math.sign(m) * (Math.abs(m) - dead) / (1 - dead)) * Math.PI * 0.9;
  }
  G.look += (lookTo - G.look) * (1 - Math.exp(-dt * 3.2));
  if (Math.abs(G.look) < 1e-3 && !lookTo) G.look = 0;
  const pip = scene.render(sim, {
    alpha, look: G.look,
    // In the intro, a picked view is previewed behind the card.
    phase: G.phase === "paused" || G.phase === "done" || G.phase === "boom" || (G.phase === "intro" && G.introPreview) ? "play" : G.phase,
    time: G.time, dt, camMode: G.camMode, camDist: G.camDist,
    showGuide: settings.guide && G.phase === "play", rearCam: settings.rearCam && G.phase === "play",
    hold: G.hold, shake, snap: G.snapCam,
  });
  G.snapCam = false;
  hud.draw({
    sim, phase: G.phase, clock: G.clock, hold: G.hold,
    levelIndex: G.levelIdx, levelCount: LEVELS.length,
    joy: G.phase === "play" && joy ? { ...joy, steerOnly: settings.pointer === "steer" } : null, pip,
    project: (x, y, z) => scene.project(x, y, z),
  });
}

function resize() {
  const w = app.clientWidth, h = app.clientHeight;
  scene.resize(w, h);
  hud.resize(w, h);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { pause(); audio.suspend(true); } else audio.suspend(false);
});

// ── Boot ─────────────────────────────────────────────────────────────────
function boot() {
  try {
    scene = new Scene3D(app, settings.quality);
  } catch (err) {
    $("#loading").innerHTML = `<div class="panel card"><h2>${t("webgl_title")}</h2><p class="brief">${t("webgl_text")}</p></div>`;
    console.error(err);
    return;
  }
  $("#hud").style.zIndex = 1;
  audio.setVolumes({ master: settings.master, sfx: settings.sfx, music: settings.music });
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(app);
  resize();
  goMain();
  lb.probe().then((ok) => {
    $$(".lb-only").forEach((el) => el.classList.toggle("hidden", !ok));
    if (ok) lb.notices().then(showNotices);
  });
  track("game_open", { lang: getLang(), returning: cleared() > 0, levels_cleared: cleared(), stars: totalStars(progress), embedded: window.parent !== window });
  requestAnimationFrame((t) => { last = t; frame(t); });
  // Let the first frames render behind the loader, then reveal.
  setTimeout(() => $("#loading").classList.remove("active"), 250);
}

// Debug handle for automated checks (dev server only).
if (import.meta.env.DEV) window.__hitchPark = { G, sim, LEVELS, openIntro, startDriving, finishLevel, keys, get scene() { return scene; } };

boot();
window.focus();
