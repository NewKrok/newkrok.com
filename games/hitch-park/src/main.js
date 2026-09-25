import { DT, PARK_HOLD, SCORE, clamp, fmtTime, fmtPar } from "./config.js";
import { LEVELS, CHAPTERS } from "./levels.js";
import { createSim } from "./sim.js";
import { Scene3D } from "./render/scene3d.js";
import { drawLevelThumb, drawRigIcon } from "./render/topdown.js";
import { Hud } from "./hud.js";
import { Audio } from "./audio.js";
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
const trailerName = (L) => (L.vehicle === "truck" ? t("tractorSemi") : `${t("veh_" + (L.vehicle ?? "car"))} + ${t("tr_" + L.trailer)}`);
const camName = (m) => t("cam" + m);
const progress = loadProgress();
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
  const first = id && $(`#${id} .btn.primary, #${id} .btn`);
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
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
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
  $("[data-bind=madeBy]").textContent = t("madeBy", { name: "Krisztian Somoracz" });
  $("[data-bind=techLine]").innerHTML = t("techLine", { nape: link("https://napejs.org/", "nape-js"), three: link("https://threejs.org/", "three.js") });
}

function goMain() {
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
  renderViewPick();
  const cv = $("canvas.rig", root);
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawRigIcon(ctx, L.vehicle ?? "car", L.trailer, cv.width / 2, cv.height / 2, cv.width - 30);
  showScreen("intro");
}

function startDriving() {
  if (G.phase !== "intro" && G.phase !== "play") return;
  audio.setMusic(false);
  audio.play("go");
  G.phase = "play";
  sim.scoring = true;
  G.snapCam = true;                 // start in the chosen view, no glide from the overview
  hideScreens();
  hud.banner(t("banner_go"), "#7ee787", 0.9);
  updateCamLabel();
}

function restart() {
  if (G.phase === "menu") return;
  const idx = G.levelIdx;
  sim.load(LEVELS[idx]);
  G.clock = 0; G.hold = 0; G.result = null; G.shake = 0; G.resultAt = 0;
  hud.clearFx();
  G.phase = "intro";
  startDriving();
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
  const timeBonus = Math.max(0, Math.round((L.par - G.clock) * SCORE.perSecond));
  const accBonus = Math.round(ps.acc * SCORE.accuracy);
  const penalty = sim.hits * SCORE.bump + sim.crashes * SCORE.crash + sim.coneHits * SCORE.cone;
  const score = Math.max(0, SCORE.base + timeBonus + accBonus - penalty);
  const stars = 1 + (bumps === 0 ? 1 : 0) + (G.clock <= L.par ? 1 : 0);
  const rec = recordResult(progress, G.levelIdx, { stars, score, time: G.clock });
  G.result = { score, stars, time: G.clock, hits: sim.hits, crashes: sim.crashes, cones: sim.coneHits, acc: ps.acc, timeBonus, accBonus, isBest: rec.isBest && !rec.first };
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
  if (G.phase === "paused" || G.phase === "done" || G.phase === "intro") {
    G.phase = "menu";
    audio.setMusic(true);
  }
  renderLevelSelect();
  showScreen("menu-levels", { push: G.phase === "menu" && !!$("#menu-main.active") });
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
  } else if (type === "cone") {
    hud.floater(e.x, e.y - 8, `${t("fl_cone")} −${SCORE.cone}`, "#ffb347");
    audio.play("cone");
  }
}

// ── Input ────────────────────────────────────────────────────────────────
const keys = {};
let joy = null;                // { id, ox, oy, x, y } in CSS px

function readInput() {
  let throttle = 0, steer = 0;
  if (keys.ArrowUp || keys.KeyW) throttle += 1;
  if (keys.ArrowDown || keys.KeyS) throttle -= 1;
  if (keys.ArrowLeft || keys.KeyA) steer -= 1;
  if (keys.ArrowRight || keys.KeyD) steer += 1;
  const brake = !!keys.Space;
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy;
    steer = clamp(dx / 55, -1, 1);
    if (Math.abs(steer) < 0.12) steer = 0;
    if (dy < -14) throttle = clamp(-dy / 60, 0, 1);
    else if (dy > 14) throttle = -clamp(dy / 60, 0, 1);
  }
  return { throttle, steer, brake };
}

// The last camera picked (here or in the intro) is where the next job starts.
function setCamMode(m, { announce = false } = {}) {
  G.camMode = m;
  settings.camMode = m;
  saveSettings(settings);
  updateCamLabel();
  renderViewPick();
  if (announce) toast(t("camToast", { mode: camName(m) }));
}
function cycleCamera() { setCamMode((G.camMode + 1) % 3, { announce: true }); }
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
  if (code === "Escape") {
    e.preventDefault();
    if (G.phase === "play") pause();
    else if (G.phase === "paused" && onScreen("pause")) resume();
    else if (G.phase === "paused" && onScreen("menu-settings")) back();
    else if (G.phase === "intro" || (G.phase === "done" && onScreen("result"))) openLevels();
    else if (screenStack.length || onScreen("menu-levels") || onScreen("menu-howto") || onScreen("menu-settings")) back();
    return;
  }
  if (G.phase === "play") {
    if (code === "KeyR") restart();
    if (code === "KeyP") pause();
    if (code === "KeyC") cycleCamera();
    if (code === "KeyV") { settings.rearCam = !settings.rearCam; saveSettings(settings); toast(t(settings.rearCam ? "rearOn" : "rearOff")); }
    if (code === "KeyG") { settings.guide = !settings.guide; saveSettings(settings); toast(t(settings.guide ? "guideOn" : "guideOff")); }
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
app.addEventListener("pointermove", (e) => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
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
  const vp = e.target.closest(".vp");
  if (vp) { audio.play("click"); G.introPreview = true; setCamMode(Number(vp.dataset.cam)); return; }
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
  if (k === "camMode") { setCamMode(settings.camMode); return renderSettings(); }
  if (k === "quality") { scene.setQuality(settings.quality); scene.lv && (scene.lv.gen = -1); }
  applySettings();
  renderSettings();
});

// ── Loop ─────────────────────────────────────────────────────────────────
let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  G.time += dt;

  if (G.phase === "play" || G.phase === "done") {
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      const playing = G.phase === "play";
      const input = playing ? readInput() : { throttle: 0, steer: 0, brake: true };
      const prevGear = sim.veh.gear;
      const ps = sim.step(input);
      if (playing) {
        G.clock += DT;
        if (sim.veh.gear !== prevGear) audio.play("gear");
        if (ps.inside && ps.aligned && ps.stopped) {
          G.hold += DT;
          if (G.hold >= PARK_HOLD) finishLevel();
        } else G.hold = Math.max(0, G.hold - DT * 2);
      }
    }
  } else acc = 0;
  if (G.phase === "done" && G.resultAt && G.time >= G.resultAt) { G.resultAt = 0; showResult(); }

  G.shake = Math.max(0, G.shake - dt * 2.5);
  hud.tick(G.phase === "paused" ? 0 : dt);

  const v = sim.veh;
  const driving = G.phase === "play";
  audio.drive({
    active: driving || G.phase === "done",
    speed: v.speed, throttle: driving ? v.throttle : 0, skid: v.skid,
    reverse: driving && v.gear < 0, clearance: driving && v.gear < 0 ? sim.rearClearance() : Infinity,
    hazard: driving && sim.parked.some((p) => p.hazard > 0), dt, truck: v.key === "truck",
  });

  const shake = G.shake > 0
    ? [(Math.sin(G.time * 91) + Math.sin(G.time * 53)) * G.shake * 1.6, (Math.cos(G.time * 77) + Math.sin(G.time * 61)) * G.shake * 1.6]
    : [0, 0];
  const pip = scene.render(sim, {
    // In the intro, a picked view is previewed behind the card.
    phase: G.phase === "paused" || G.phase === "done" || (G.phase === "intro" && G.introPreview) ? "play" : G.phase,
    time: G.time, dt, camMode: G.camMode, camDist: G.camDist,
    showGuide: settings.guide && G.phase === "play", rearCam: settings.rearCam && G.phase === "play",
    hold: G.hold, shake, snap: G.snapCam,
  });
  G.snapCam = false;
  hud.draw({
    sim, phase: G.phase, clock: G.clock, hold: G.hold,
    levelIndex: G.levelIdx, levelCount: LEVELS.length,
    joy: G.phase === "play" ? joy : null, pip,
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
  requestAnimationFrame((t) => { last = t; frame(t); });
  // Let the first frames render behind the loader, then reveal.
  setTimeout(() => $("#loading").classList.remove("active"), 250);
}

// Debug handle for automated checks (dev server only).
if (import.meta.env.DEV) window.__hitchPark = { G, sim, LEVELS, openIntro, startDriving, finishLevel, keys };

boot();
window.focus();
