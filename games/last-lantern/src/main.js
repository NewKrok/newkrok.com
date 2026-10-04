import { DT, FPS, fmtSec, clamp } from "./config.js";
import { createRun, runSummary } from "./sim/run.js";
import { spawnMonster } from "./sim/core.js";
import { STAGES, BEACONS } from "./data/stages.js";
import { ITEMS, ITEM_MAX } from "./data/items.js";
import { ACHIEVEMENTS, checkAchievements } from "./data/achievements.js";
import { Gamepad, BTN } from "./gamepad.js";
import { HEROES, HEARTH, hearthCost, WEAPON_IDS, WEAPON_META, PASSIVE_IDS, RELIC_IDS } from "./data/meta.js";
import { MON } from "./data/monsters.js";
import { Scene3D } from "./render/scene.js";
import { Hud } from "./hud.js";
import { Audio } from "./audio.js";
import { track } from "./analytics.js";
import { iconURL } from "./icons.js";
import { heroPortraits, stageVignette, monsterPortraits } from "./render/portraits.js";
import {
  loadSettings, saveSettings, loadProgress, saveProgress, resetProgress, heroUnlocked, stageUnlocked,
  unlockedWeapons, recordRun, useItem,
} from "./storage.js";
import {
  t, setLang, detectLang, getLang, LANGS, heroText, weaponText, passiveText, stageText, monsterName, monsterLore, storyText, applyDom, relicText, itemText, achText,
} from "./i18n/index.js";

// ── Last Lantern ─────────────────────────────────────────────────────────
// Phases: menu (DOM menus over a title horde) → intro (the stage's story
// card) → play (the sim runs; level-up and chest cards pause it) → result.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $("#app");
const settings = loadSettings();
setLang(detectLang(settings.lang));
const progress = loadProgress();
const audio = new Audio();
const hud = new Hud($("#hud"));
let scene;

const G = {
  phase: "menu",          // menu | intro | play | paused | result
  run: null,              // the active run (or the title backdrop)
  title: null,
  time: 0,
  resultAt: 0,
  banishMode: false,
  shown: "",              // which pick overlay is up for the run's phase
};

// ── Screens ──────────────────────────────────────────────────────────────
let stack = [];
function showScreen(id, { push = false } = {}) {
  const cur = $(".screen.active:not(#loading)");
  if (push && cur && cur.id !== id) stack.push(cur.id);
  if (!push) stack = [];
  $$(".screen:not(#loading)").forEach((s) => s.classList.toggle("active", s.id === id));
  for (const b of $$(`#${id} .scroll-body`)) b.scrollTop = 0;
  updateIngame();
  const first = id && ($(`#${id} .btn.primary`) || $(`#${id} .lcard`) || $(`#${id} .btn`));
  if (first && matchMedia("(hover: hover)").matches) first.focus({ preventScroll: true });
}
function hideScreens() {
  $$(".screen:not(#loading)").forEach((s) => s.classList.remove("active"));
  stack = [];
  updateIngame();
}
function back() {
  audio.play("back");
  const prev = stack.pop();
  if (prev) {
    $$(".screen:not(#loading)").forEach((s) => s.classList.toggle("active", s.id === prev));
    refresh(prev);
    updateIngame();
    return;
  }
  goMain();
}
const onScreen = (id) => !!$(`#${id}.active`);
function refresh(id) {
  if (id === "menu-main") renderMain();
  if (id === "menu-run") renderRunSetup();
  if (id === "menu-hero") renderHeroSetup();
  if (id === "pause") renderPause();
  if (id === "result") { /* static */ }
}
function updateIngame() {
  const any = !!$(".screen.active:not(#loading)");
  $("#hud").style.visibility = $(".screen.scroll.active") ? "hidden" : "";
  $("#ingame").classList.toggle("hidden", G.phase !== "play" || any);
}
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2000);
}
const bind = (name, value, root = document) => $$(`[data-bind="${name}"]`, root).forEach((el) => { el.textContent = value; });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function fillIcons(root = document) { for (const img of $$("img[data-icon]", root)) img.src = iconURL(img.dataset.icon, 48); }

// ── Title backdrop ───────────────────────────────────────────────────────
function titleRun() {
  const st = clamp(settings.stage | 0, 0, STAGES.length - 1);
  const want = stageUnlocked(progress, st) ? st : 0;
  if (!G.title || G.title.stage.index !== want || G.title.heroDef.id !== settings.hero) {
    G.title = createRun({ stageIndex: want, heroId: heroUnlocked(progress, HEROES.find((h) => h.id === settings.hero) || HEROES[0]) ? settings.hero : "wren", seed: 7, title: true });
  }
  G.run = G.title;
}

// ── Main menu ────────────────────────────────────────────────────────────
function renderMain() {
  bind("embers", progress.embers);
  const link = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
  $("[data-bind=madeBy]").innerHTML = t("madeBy", { name: link("https://x.com/KSomoracz", "Krisztian Somoracz") });
  $("[data-bind=techLine]").innerHTML = t("techLine", { nape: link("https://napejs.org/", "nape-js"), three: link("https://threejs.org/", "three.js") });
  $("[data-action=play]").textContent = progress.runs ? t("continue") : t("play");
}
function goMain() {
  G.phase = "menu";
  G.resultAt = 0;
  titleRun();
  audio.setSong("menu");
  renderMain();
  showScreen("menu-main");
}

// ── Prologue ─────────────────────────────────────────────────────────────
function openStory(lines, then) {
  const root = $("#story .story-lines");
  root.innerHTML = lines.map((l, i) => `<p style="animation-delay:${0.2 + i * 0.9}s">${esc(l)}</p>`).join("");
  G.storyThen = then;
  showScreen("story");
}

// ── Run setup ────────────────────────────────────────────────────────────
function renderHeroSetup() {
  bind("embers", progress.embers);
  const hroot = $("#heroes");
  const ports = heroPortraits();
  const roman = ["I", "II", "III", "IV"];
  hroot.innerHTML = HEROES.map((h, i) => {
    const tx = heroText(h.id), open = heroUnlocked(progress, h);
    const lockNote = !open ? `<div class="lock-note"><img src="${iconURL("lock", 32)}" width="14" alt="">${esc(t("unlockStage", { n: h.unlock.stage + 1 }))}</div>` : "";
    return `<button class="hero ${open ? "" : "locked"} ${settings.hero === h.id ? "on" : ""}" data-hero="${h.id}">
      <div class="port"><span class="roman">${roman[i]}</span>${ports[h.id] ? `<img src="${ports[h.id]}" alt="">` : ""}</div>
      <div class="nm">${esc(tx.name)}</div><div class="ep">${esc(tx.epithet)}</div>
      <div class="ln keep"><img src="${iconURL(h.weapon, 32)}" alt=""><span><b>${esc(weaponText(h.weapon).name)}</b></span></div>
      <div class="ln"><img src="${iconURL(h.active, 32)}" alt=""><span><b>${esc(tx.active)}</b> — ${esc(tx.activeDesc)}</span></div>
      <div class="ln"><img src="${iconURL("vitality", 32)}" alt=""><span>${h.hp} · ${esc(tx.trait)}</span></div>
      ${lockNote}</button>`;
  }).join("");
}
function renderRunSetup() {
  // The chosen lantern-bearer, a button back to step one.
  const h = HEROES.find((x) => x.id === settings.hero) || HEROES[0], htx = heroText(h.id), port = heroPortraits()[h.id];
  const chip = $(".hero-chip");
  chip.innerHTML = `${port ? `<img src="${port}" alt="">` : ""}<span><b>${esc(htx.name)}</b><small>${esc(t("changeHero"))}</small></span>`;
  chip.setAttribute("aria-label", t("changeHero"));
  const sroot = $("#stages");
  sroot.innerHTML = STAGES.map((s, i) => {
    const tx = stageText(s.id), open = stageUnlocked(progress, i), b = progress.best[i];
    const lit = progress.cleared[i], blood = progress.clearedBlood[i];
    const best = b ? (s.rush ? t("bestVigil", { n: b.keepers ?? 0, of: s.rush.length, t: fmtSec(b.time) }) : t("best", { t: fmtSec(b.time), k: b.kills })) : "";
    return `<button class="stage ${s.rush ? "rush" : ""} ${open ? "" : "locked"} ${settings.stage === i ? "on" : ""}" data-stage="${i}">
      <div class="art" style="background-image:url(${stageVignette(s.look, !!lit, s.rush ? true : !!blood)})"><span class="num">${esc(stageLabel(s))}</span></div>
      <div class="meta"><div class="nm">${esc(tx.name)}</div><div class="pl">${esc(open ? tx.place : lockText(i))}</div>
      <div class="bst">${esc(best)}</div></div></button>`;
  }).join("");
  const canBlood = !!progress.cleared[settings.stage];
  const bt = $(".blood-toggle");
  bt.classList.toggle("off", !canBlood);
  $("#blood").disabled = !canBlood;
  $("#blood").checked = canBlood && settings.blood;
  bind("bloodDesc", canBlood ? t("bloodMoonDesc") : t("bloodLocked"));
}
const stageLabel = (s) => (s.rush ? t("vigilTag") : t("stageN", { n: s.index + 1 }));
const lockText = (i) => (STAGES[i].rush ? t("unlockVigil") : t("unlockStage", { n: i }));
// Two steps: the lantern-bearer, then the beacon. Both remember the last
// pick, so a returning player starts with two presses of Enter.
function validateSetup() {
  if (!heroUnlocked(progress, HEROES.find((h) => h.id === settings.hero) || HEROES[0])) settings.hero = "wren";
  if (!stageUnlocked(progress, settings.stage)) settings.stage = 0;
}
function openHeroSetup() {
  validateSetup();
  renderHeroSetup();
  showScreen("menu-hero", { push: onScreen("menu-main") });
}
function openStageSetup() {
  validateSetup();
  renderRunSetup();
  showScreen("menu-run", { push: true });
}
// Back to step two from the stage intro: Back still leads through step one.
function openRunSetup() {
  validateSetup();
  renderRunSetup();
  showScreen("menu-run");
  stack = ["menu-main", "menu-hero"];
}

// ── Intro and start ──────────────────────────────────────────────────────
function openIntro() {
  const s = STAGES[settings.stage], tx = stageText(s.id);
  const blood = settings.blood && progress.cleared[s.index];
  bind("introEyebrow", `${stageLabel(s)} · ${tx.place}`);
  bind("introTitle", tx.name);
  bind("introText", tx.intro);
  bind("introBoss", s.rush ? t("vigilFact", { n: s.rush.length }) : t("bossAt", { t: fmtSec(s.bossAt) }));
  bind("introBlood", blood ? t("bloodMoon") : "");
  const boostN = (s.boost ?? s.index * 2) + 2 * (progress.hearth.headstart || 0);
  bind("introBoost", boostN > 0 ? t("boostIntro", { n: boostN }) : "");
  G.phase = "intro";
  showScreen("intro");
}

function startRun() {
  const s = STAGES[settings.stage];
  const blood = !!(settings.blood && progress.cleared[s.index]);
  const seed = (Date.now() & 0x7fffffff) ^ (Math.random() * 1e9);
  const R = createRun({ stageIndex: s.index, heroId: settings.hero, hearth: progress.hearth, blood, seed, unlocked: unlockedWeapons(progress), items: progress.items });
  G.run = R;
  G.phase = "play";
  G.shown = "";
  G.resultAt = 0;
  G.startedAt = performance.now();
  hideScreens();
  audio.setSong(s.look);
  audio.setIntensity(0);
  const a = $(".active-btn img");
  a.src = iconURL(R.heroDef.active, 64);
  buildSatchel();
  // Enough to see who plays what, how far they get, and whether other heroes
  // and the Blood Moon get picked by those who could.
  track("run_start", {
    stage: s.index + 1, stage_id: s.id, hero: R.heroDef.id, blood, runs: progress.runs,
    beacons: progress.cleared.filter(Boolean).length,
    heroes_unlocked: HEROES.filter((h) => heroUnlocked(progress, h)).length,
    blood_available: !!progress.cleared[s.index],
  });
}

// ── Level-up cards ───────────────────────────────────────────────────────
function cardHTML(c, i) {
  let name, desc, icon = c.id, tag;
  if (c.kind === "weapon") {
    ({ name, desc } = weaponText(c.id));
    tag = c.isNew ? `<div class="tag new">${esc(t("newTag"))}</div>` : `<div class="tag">${esc(t("lvTag", { n: c.level }))}${c.level >= 7 ? " · " + esc(t("maxTag")) : ""}</div>`;
  } else if (c.kind === "passive") {
    ({ name, desc } = passiveText(c.id));
    tag = c.isNew ? `<div class="tag new">${esc(t("newTag"))}</div>` : `<div class="tag">${esc(t("lvTag", { n: c.level }))}${c.level >= c.max ? " · " + esc(t("maxTag")) : ""}</div>`;
  } else {
    name = t(c.kind === "gold" ? "card_gold" : "card_heal"); desc = t(c.kind === "gold" ? "card_goldDesc" : "card_healDesc"); tag = "";
  }
  let extra = "";
  if (c.kind === "weapon" && c.diff?.length) {
    extra = `<div class="diff">${c.diff.map(([k, a, b]) => `<span>${esc(t("st_" + k))}</span><span>${fmtStat(k, a)} → <b>${fmtStat(k, b)}</b></span>`).join("")}</div>`;
  }
  if (c.kind === "weapon") {
    const m = WEAPON_META[c.id];
    if (m.evo) extra += `<div class="evo"><img src="${iconURL(m.evo, 32)}" alt="">${esc(t("evoHint", { p: passiveText(m.evo).name }))}</div>`;
  }
  return `<button class="lcard" data-card="${i}" style="--c:${c.color}">
    <kbd class="key">${i + 1}</kbd>
    <div class="ic"><img src="${iconURL(icon, 96)}" alt=""></div><div class="txt"><div class="nm">${esc(name)}</div>${tag}
    <div class="ds">${esc(desc)}</div></div>${extra}</button>`;
}
function fmtStat(k, v) {
  if (k === "cd") return `${(v / FPS).toFixed(2)}s`;
  if (k === "dur") return `${(v / FPS).toFixed(1)}s`;
  if (k === "width") return `${Math.round(v * 115)}°`;
  if (k === "speed") return v.toFixed(1);
  if (k === "reach") return `${(v / FPS).toFixed(2)}s`;
  if (k === "pierce" && v >= 99) return "∞";
  return String(Math.round(v * 10) / 10);
}
function showLevelUp() {
  const R = G.run;
  const root = $("#cards");
  root.style.setProperty("--n", R.cards.length);
  root.innerHTML = R.cards.map(cardHTML).join("");
  bind("rerollLabel", t("reroll", { n: R.rerolls }));
  bind("banishLabel", t("banish", { n: R.banishes }));
  $("[data-action=reroll]").disabled = R.rerolls <= 0;
  $("[data-action=banish]").disabled = R.banishes <= 0;
  G.banishMode = false;
  $("#levelup").classList.remove("banish-mode");
  const boost = R.startBoost && R.clock < 90 ? `${t("boostLine", { n: R.startBoost })} · ` : "";
  bind("lvSub", boost + (R.levelUpQueue > 1 ? `${t("chooseOne")} · ×${R.levelUpQueue}` : t("chooseOne")));
  showScreen("levelup");
}
function pickCard(i) {
  const R = G.run;
  if (R.phase !== "levelup" || !R.cards[i]) return;
  if (G.banishMode) {
    R.banish(i);
    audio.play("banish");
    showLevelUp();
    return;
  }
  R.pickCard(i);
  audio.play("pick");
  G.shown = "";
  if (R.phase === "play") hideScreens(); else showLevelUp();
}

// ── Chest ────────────────────────────────────────────────────────────────
function showChest() {
  const R = G.run, ch = R.chest;
  const nm = (id) => (WEAPON_META[id] ? weaponText(id).name : passiveText(id).name);
  const items = ch.items.map((it, k) => {
    if (it.kind === "relic") {
      track("relic", { relic: it.id, stage: R.stage.index + 1 });
      const rt = relicText(it.id);
      return `<div class="chest-item evo relic" style="animation-delay:${0.2 + k * 0.2}s"><img src="${iconURL(it.id, 64)}" alt=""><div><b>${esc(t("relicTag"))} · ${esc(rt.name)}</b><small>${esc(rt.desc)}</small></div></div>`;
    }
    if (it.kind === "evolve") {
      track("evolve", { weapon: it.id, from: it.from, stage: R.stage.index + 1 });
      return `<div class="chest-item evo" style="animation-delay:${0.2 + k * 0.2}s"><img src="${iconURL(it.id, 64)}" alt=""><div><b>${esc(t("chestEvolve", { a: nm(it.from), b: nm(it.id) }))}</b><small>${esc(weaponText(it.id).desc)}</small></div></div>`;
    }
    const lv = it.kind === "weapon" || it.kind === "passive" ? ` · ${t("lvTag", { n: it.level })}` : "";
    const name = it.kind === "weapon" || it.kind === "passive" ? nm(it.id) : t(it.kind === "gold" ? "card_gold" : "card_heal");
    return `<div class="chest-item" style="animation-delay:${0.2 + k * 0.2}s"><img src="${iconURL(it.id, 64)}" alt=""><div><b>${esc(name)}</b><small>${esc(lv.slice(3))}</small></div></div>`;
  }).join("");
  $("#chest .chest-items").innerHTML = items;
  bind("chestTitle", t("chestTitle"));
  bind("chestGold", t("chestGold", { n: ch.gold }));
  showScreen("chest");
}
function closeChest() {
  G.run.closeChest();
  G.shown = "";
  audio.play("click");
  if (G.run.phase === "play") hideScreens();
}

// ── Pause ────────────────────────────────────────────────────────────────
function renderPause() {
  const R = G.run;
  const belt = [...R.hero.weapons.map((w) => [w.id, w.evolved ? "★" : w.level, weaponText(w.id).name]), ...Object.entries(R.hero.passives).map(([id, lv]) => [id, lv, passiveText(id).name]), ...R.relics.map((id) => [id, "◆", `${relicText(id).name} — ${relicText(id).desc}`])];
  $("#pause .pause-belt").innerHTML = belt.map(([id, lv, name]) => `<span title="${esc(name)}"><img src="${iconURL(id, 40)}" alt="">${lv}</span>`).join("");
}
function pause() {
  if (G.phase !== "play" || G.run.phase !== "play") return;
  G.phase = "paused";
  joy = null;
  audio.play("click");
  renderPause();
  showScreen("pause");
}
function resume() {
  if (G.phase !== "paused") return;
  G.phase = "play";
  hideScreens();
}

// ── Result ───────────────────────────────────────────────────────────────
function finishRun() {
  const R = G.run;
  const s = runSummary(R);
  s.monstersSeen = [...new Set(R.seenIds)];
  s.weaponsSeen = [...R.weaponsSeen];
  s.relicsSeen = [...(R.relicsSeen || [])];
  const firstClear = s.won && !progress.cleared[s.stage];
  const unlocked = recordRun(progress, s);
  const deeds = checkAchievements(progress, s);
  saveProgress(progress);
  track("run_end", { stage: s.stage + 1, stage_id: s.stageId, hero: s.hero, blood: s.blood, won: s.won, first_clear: firstClear, time_s: Math.round(s.time), kills: s.kills, level: s.level, embers: s.embers, beacons: progress.cleared.filter(Boolean).length, runs: progress.runs, weapons: s.weapons.map((w) => w.id).join(",") });
  for (const u of unlocked) track("unlock", { kind: u.kind, id: u.id });
  for (const a of deeds) track("achievement", { id: a.id, runs: progress.runs });
  if (deeds.length) setTimeout(() => audio.play("achieve"), 900);
  const root = $("#result");
  const h2 = $("h2", root);
  h2.className = s.won ? "won" : "lost";
  h2.textContent = s.won ? t("wonTitle") : t("lostTitle");
  let outro = s.won ? stageText(R.stage.id).outro : "";
  if (s.won && R.stage.index === BEACONS - 1) outro += " " + storyText().ending;
  bind("resultOutro", outro, root);
  $(".outro", root).classList.toggle("hidden", !outro);
  $(".stat-row", root).innerHTML = [
    [fmtSec(s.time), t("r_time")], [s.kills, t("r_kills")], [s.level, t("r_level")], [`+${s.embers}`, s.tithe ? `${t("r_embers")} (${t("r_tithe", { n: s.tithe })})` : t("r_embers"), "emb"],
  ].map(([v, l, c]) => `<div class="${c || ""}"><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join("");
  $(".weapons-table tbody", root).innerHTML = s.weapons.sort((a, b) => b.dmg - a.dmg).map((w) => `<tr><td><img src="${iconURL(w.id, 40)}" alt="">${esc(weaponText(w.id).name)}</td><td>${w.dmg.toLocaleString()} ${esc(t("r_dmg"))}</td><td>${w.kills} ${esc(t("r_kills2"))}</td></tr>`).join("");
  const uname = (u) => (u.kind === "hero" ? heroText(u.id).name : u.kind === "weapon" ? weaponText(u.id).name : stageText(u.id).name);
  $(".unlocks", root).innerHTML = unlocked.map((u, i) => `<div style="animation-delay:${0.4 + i * 0.25}s">${esc(t("r_newUnlock", { x: uname(u) }))}</div>`).join("") +
    deeds.map((a, i) => `<div class="deed" style="animation-delay:${0.6 + (unlocked.length + i) * 0.25}s"><img src="${iconURL(a.icon, 32)}" alt="">${esc(t("r_deed", { x: achText(a.id).name }))} <span>+${a.reward}</span></div>`).join("");
  if (R.stage.rush) $(".stat-row", root).children[1].innerHTML = `<b>${s.keepers} / ${R.stage.rush.length}</b><small>${esc(t("r_keepers"))}</small>`;
  G.phase = "result";
  audio.setSong(s.won ? "win" : "menu");
  showScreen("result");
  // After the last beacon, the dawn.
  if (s.won && R.stage.index < STAGES.length - 1 && !progress.cleared[R.stage.index + 1]) settings.stage = R.stage.index + 1;
  saveSettings(settings);
}

// ── Hearth ───────────────────────────────────────────────────────────────
function renderHearth() {
  bind("embers", progress.embers);
  const card = (u) => {
    const lv = progress.hearth[u.id] || 0, max = lv >= u.max, cost = hearthCost(u, lv);
    const hero = u.hero && HEROES.find((h) => h.id === u.hero);
    const locked = hero && !heroUnlocked(progress, hero);
    const btn = locked
      ? `<button class="btn ghost" disabled><img class="ico" src="${iconURL("lock", 32)}" alt=""> ${esc(t("unlockStage", { n: hero.unlock.stage + 1 }))}</button>`
      : `<button class="btn ${max ? "ghost" : progress.embers >= cost ? "primary" : ""}" data-buy="${u.id}" ${max ? "disabled" : ""}>${max ? esc(t("maxed")) : `<img class="ico" src="${iconURL("ember", 32)}" alt=""> ${esc(t("buy", { n: cost }))}`}</button>`;
    if (hero) {
      const tx = heroText(hero.id);
      const steps = [1, 2, 3].map((k) => `<li class="${k <= lv ? "on" : ""}">${esc(t(k === 1 ? "mastery1" : `m_${hero.id}_${k}`, { a: tx.active }))}</li>`).join("");
      return `<div class="hup mastery ${locked ? "locked" : ""}"><div class="top"><img src="${iconURL(hero.active, 64)}" alt=""><div><div class="nm">${esc(tx.name)} · ${esc(tx.active)}</div><div class="ds">${esc(t("masteryOf"))}</div></div></div>
        <ol class="steps">${steps}</ol>${btn}</div>`;
    }
    return `<div class="hup"><div class="top"><img src="${iconURL(u.id, 64)}" alt=""><div><div class="nm">${esc(t("h_" + u.id))}</div><div class="ds">${esc(t("hd_" + u.id))}</div></div></div>
      <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div>${btn}</div>`;
  };
  $("#hearth").innerHTML = HEARTH.filter((u) => !u.hero).map(card).join("") +
    `<h3 class="hearth-h">${esc(t("masteryTitle"))}</h3>` + HEARTH.filter((u) => u.hero).map(card).join("");
}
function buy(id) {
  const u = HEARTH.find((x) => x.id === id);
  const lv = progress.hearth[id] || 0;
  if (lv >= u.max) return;
  const cost = hearthCost(u, lv);
  if (progress.embers < cost) { audio.play("locked"); toast(t("notEnough")); return; }
  progress.embers -= cost;
  progress.hearth[id] = lv + 1;
  saveProgress(progress);
  audio.play("buy");
  toast(t("bought", { x: t("h_" + id) }));
  track("hearth_buy", { upgrade: id, level: lv + 1, cost });
  grantDeeds();
  renderHearth();
}

// ── Journal ──────────────────────────────────────────────────────────────
let journalTab = "story";
function renderJournal() {
  $$(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === journalTab));
  const root = $("#journal");
  if (journalTab === "story") {
    const pages = [`<div class="page"><h4>${esc(t("homeName"))}</h4>${storyText().prologue.map((l) => `<p>${esc(l)}</p>`).join("")}</div>`];
    STAGES.forEach((s, i) => {
      const tx = stageText(s.id);
      if (s.rush && !stageUnlocked(progress, i)) return;
      if (!stageUnlocked(progress, i)) { pages.push(`<div class="page locked"><h4>${esc(stageLabel(s))}</h4><p>${esc(t("jn_locked"))}</p></div>`); return; }
      if (i === BEACONS && progress.cleared[BEACONS - 1]) pages.push(`<div class="page"><h4>☀</h4><p>${esc(storyText().ending)}</p></div>`);
      pages.push(`<div class="page"><h4>${esc(stageLabel(s))} · ${esc(tx.name)}</h4><p>${esc(tx.intro)}</p>${progress.cleared[i] ? `<p>${esc(tx.outro)}</p>` : ""}</div>`);
    });
    if (progress.cleared[BEACONS - 1] && !stageUnlocked(progress, BEACONS)) pages.push(`<div class="page"><h4>☀</h4><p>${esc(storyText().ending)}</p></div>`);
    root.innerHTML = pages.join("");
  } else if (journalTab === "bestiary") {
    const groups = STAGES.filter((s) => !s.rush).map((s) => [s, [...new Set([...s.mix.map((m) => m[0]), ...s.events.map((e) => e[2]), s.boss])]]);
    const ports = monsterPortraits(groups.flatMap(([, ids]) => ids));
    root.innerHTML = groups.map(([s, ids]) => `<h3>${esc(stageText(s.id).name)}</h3><div class="beast-grid">${ids.map((id) => {
      const seen = progress.seenMonsters.includes(id), d = MON[id];
      const tier = d.boss ? t("tierBoss") : d.elite ? t("tierElite") : "";
      return `<div class="beast ${seen ? "" : "unseen"} ${d.boss ? "boss" : d.elite ? "elite" : ""}"><div class="bport">${ports[id] ? `<img src="${ports[id]}" alt="">` : ""}</div>
        <div class="bn">${esc(seen ? monsterName(id) : "???")}</div><small>${esc(seen ? `${tier ? tier + " · " : ""}${t("hpUnit", { n: Math.round(d.hp) })}` : t("notSeen"))}</small>${seen ? `<p class="lore">${esc(monsterLore(id))}</p>` : ""}</div>`;
    }).join("")}</div>`).join("");
  } else {
    const owned = unlockedWeapons(progress);
    const cells = WEAPON_IDS.flatMap((id) => [id, WEAPON_META[id].into]).map((id) => {
      const m = WEAPON_META[id];
      const seen = progress.seenWeapons.includes(id);
      const base = !m.evolved;
      const open = base ? owned.has(id) : seen;
      const from = base ? null : WEAPON_IDS.find((b) => WEAPON_META[b].into === id);
      let sub = open ? weaponText(id).desc : base ? unlockText(m.unlock) : t("evoFrom", { w: weaponText(from).name, p: passiveText(WEAPON_META[from].evo).name });
      if (base && open) sub += ` (${passiveText(m.evo).name})`;
      return `<div class="jcell ${open ? "" : "unseen"}"><img src="${iconURL(open ? id : "lock", 48)}" alt=""><div>${esc(open ? weaponText(id).name : "???")}<small>${esc(sub)}</small></div></div>`;
    });
    const pas = PASSIVE_IDS.map((id) => `<div class="jcell"><img src="${iconURL(id, 48)}" alt=""><div>${esc(passiveText(id).name)}<small>${esc(passiveText(id).desc)}</small></div></div>`);
    const rel = RELIC_IDS.map((id) => {
      const seen = (progress.seenRelics || []).includes(id), rt = relicText(id);
      return `<div class="jcell ${seen ? "" : "unseen"}"><img src="${iconURL(seen ? id : "lock", 48)}" alt=""><div>${esc(seen ? rt.name : "???")}<small>${esc(seen ? rt.desc : t("notSeen"))}</small></div></div>`;
    });
    root.innerHTML = `<h3>${esc(t("arsenal"))}</h3><div class="jgrid">${cells.join("")}</div><h3>${esc(t("passivesTab"))}</h3><div class="jgrid">${pas.join("")}</div><h3>${esc(t("relicsTab"))}</h3><div class="jgrid">${rel.join("")}</div>`;
  }
}
function unlockText(rule) {
  if (!rule) return "";
  if (rule.stage !== undefined) return t("unlockStage", { n: rule.stage + 1 });
  if (rule.level !== undefined) return t("unlockLevel", { n: rule.level });
  return t("unlockKills", { n: rule.kills, have: progress.totalKills });
}

// ── The Pedlar ───────────────────────────────────────────────────────────
function renderShop() {
  bind("embers", progress.embers);
  $("#shop").innerHTML = ITEMS.map((it) => {
    const have = progress.items[it.id] || 0, full = have >= ITEM_MAX, tx = itemText(it.id);
    const btn = `<button class="btn ${full ? "ghost" : progress.embers >= it.cost ? "primary" : ""}" data-shop="${it.id}" ${full ? "disabled" : ""}>${full ? esc(t("satchelFull")) : `<img class="ico" src="${iconURL("ember", 32)}" alt=""> ${esc(t("buyItem", { n: it.cost }))}`}</button>`;
    return `<div class="hup ware" style="--c:${it.color}"><div class="top"><img src="${iconURL(it.id, 64)}" alt=""><div><div class="nm">${esc(tx.name)}</div><div class="ds">${esc(tx.desc)}</div></div></div>
      <div class="have">${esc(t("inSatchel", { n: have, max: ITEM_MAX }))}</div>${btn}</div>`;
  }).join("");
}
function buyItem(id) {
  const it = ITEMS.find((x) => x.id === id);
  const have = progress.items[id] || 0;
  if (!it || have >= ITEM_MAX) return;
  if (progress.embers < it.cost) { audio.play("locked"); toast(t("notEnough")); return; }
  progress.embers -= it.cost;
  progress.items[id] = have + 1;
  saveProgress(progress);
  audio.play("buy");
  toast(t("boughtItem", { x: itemText(id).name }));
  track("item_buy", { item: id, have: have + 1, cost: it.cost });
  renderShop();
}

// ── Deeds (achievements) ─────────────────────────────────────────────────
function renderDeeds() {
  const got = progress.ach || {};
  const n = ACHIEVEMENTS.filter((a) => got[a.id]).length;
  bind("deedCount", t("deedCount", { n, of: ACHIEVEMENTS.length }));
  $("#deeds").innerHTML = ACHIEVEMENTS.map((a) => {
    const tx = achText(a.id), on = !!got[a.id];
    const pr = !on && a.prog ? a.prog(progress) : null;
    const bar = pr ? `<div class="prog"><i style="width:${Math.min(100, (pr[0] / pr[1]) * 100)}%"></i><span>${Math.min(pr[0], pr[1]).toLocaleString()} / ${pr[1].toLocaleString()}</span></div>` : "";
    return `<div class="deed-card ${on ? "on" : ""}"><img src="${iconURL(on ? a.icon : "lock", 64)}" alt=""><div class="tx"><div class="nm">${esc(tx.name)}</div><div class="ds">${esc(tx.desc)}</div>${bar}</div>
      <div class="rw"><img class="ico" src="${iconURL("ember", 32)}" alt="">${a.reward}</div></div>`;
  }).join("");
}
// Grants deeds earned outside a run (the Hearth, the first boot after an
// update) with a toast.
function grantDeeds() {
  const got = checkAchievements(progress);
  if (!got.length) return;
  saveProgress(progress);
  for (const a of got) track("achievement", { id: a.id, runs: progress.runs });
  audio.play("achieve");
  toast(got.length === 1 ? t("deedToast", { x: achText(got[0].id).name, n: got[0].reward }) : t("deedsToast", { n: got.length, e: got.reduce((k, a) => k + a.reward, 0) }));
  bind("embers", progress.embers);
}

// ── The satchel in a run ─────────────────────────────────────────────────
// One button per kind carried, over the health orb; keys 1–7 in that order,
// the pad's LB / RB pick one and X uses it.
let satchel = [];
function buildSatchel() {
  const R = G.run;
  satchel = ITEMS.filter((it) => (R.items[it.id] || 0) > 0).map((it) => it.id);
  G.itemSel = 0;
  $(".satchel").innerHTML = satchel.map((id, i) => `<button class="item-btn" data-item="${id}" aria-label="${esc(itemText(id).name)}" title="${esc(itemText(id).name)}"><img src="${iconURL(id, 48)}" alt=""><b></b><kbd>${i + 1}</kbd></button>`).join("");
  syncSatchel();
}
function syncSatchel() {
  const R = G.run;
  if (!R || R.title) return;
  const ready = R.itemCd <= 0;
  $$(".item-btn").forEach((b, i) => {
    const n = R.items[b.dataset.item] || 0;
    const num = b.querySelector("b");
    if (num.textContent !== String(n)) num.textContent = String(n);
    b.classList.toggle("empty", n <= 0);
    b.classList.toggle("cd", !ready);
    b.classList.toggle("sel", padActive && i === G.itemSel);
  });
  const p = hud.panelRect(), el = $(".satchel");
  const at = `${p.x}|${p.y}|${p.s}`;
  if (el.dataset.at !== at) {
    el.dataset.at = at;
    Object.assign(el.style, { left: `${p.x}px`, bottom: `${hud.H - p.y + 6}px` });
    el.style.setProperty("--sz", `${Math.round(Math.max(38, 54 * p.s))}px`);
  }
}
function useSlot(i) {
  const R = G.run, id = satchel[i];
  if (!id || G.phase !== "play" || R.phase !== "play") return;
  if (!(R.items[id] > 0)) { audio.play("locked"); return; }
  R.useItem(id);
}
// Items the sim used this frame come off the saved satchel at once, so
// closing the tab mid-run cannot give them back.
function drainItems(R) {
  if (!R.itemLog.length) return;
  for (const id of R.itemLog) {
    useItem(progress, id);
    track("item_use", { item: id, stage: R.stage.index + 1, hero: R.heroDef.id, time_s: Math.round(R.clock / FPS), hp: Math.round((R.hero.hp / R.hero.maxHp) * 100) });
  }
  R.itemLog.length = 0;
}

// ── Settings ─────────────────────────────────────────────────────────────
function renderSettings() {
  const sel = $("#lang-select");
  if (!sel.options.length) sel.innerHTML = LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
  sel.value = getLang();
  for (const el of $$("#menu-settings [data-setting]")) {
    const k = el.dataset.setting;
    if (k === "lang") continue;
    if (el.type === "range") el.value = settings[k];
    else if (el.type === "checkbox") el.checked = !!settings[k];
    else $$("button", el).forEach((b) => b.classList.toggle("on", String(settings[k]) === b.dataset.value));
  }
}
function applyAudio() { audio.setVolumes({ master: settings.master, sfx: settings.sfx, music: settings.music }); saveSettings(settings); }
$("#menu-settings").addEventListener("change", (e) => {
  if (e.target.id !== "lang-select") return;
  settings.lang = e.target.value;
  setLang(settings.lang);
  saveSettings(settings);
  track("language_change", { lang: settings.lang });
  renderMain();
});
$("#menu-settings").addEventListener("input", (e) => {
  const k = e.target.dataset.setting;
  if (!k || k === "lang") return;
  settings[k] = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
  applyAudio();
});
$("#menu-settings").addEventListener("click", (e) => {
  const b = e.target.closest(".seg button");
  if (!b) return;
  settings.quality = b.dataset.value;
  scene.setQuality(settings.quality);
  scene.R = null;
  saveSettings(settings);
  renderSettings();
});

// ── Input ────────────────────────────────────────────────────────────────
const keys = {};
let joy = null;
function readInput() {
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
    if (d > 8) { const k = Math.min(1, (d - 8) / 42); mx = dx / d * k; my = dy / d * k; }
  }
  if (padActive) {
    const p = pad.move();
    if (p.mx || p.my) { mx = p.mx; my = p.my; }
  }
  return { mx, my };
}

// Escape (and the pad's B): one step back from wherever we are.
function escapeAction() {
  const R = G.run;
  if (G.phase === "play" && R.phase === "play" && !$(".screen.active:not(#loading)")) pause();
  else if (G.phase === "paused" && onScreen("pause")) resume();
  else if (G.phase === "paused" && onScreen("menu-settings")) back();
  else if (G.phase === "intro") { G.phase = "menu"; openRunSetup(); }
  else if (G.phase === "result" && onScreen("result")) goMain();
  else if (stack.length || $(".screen.scroll.active")) back();
}

window.addEventListener("keydown", (e) => {
  audio.unlock();
  const code = e.code;
  if (/input|textarea|select/i.test(e.target?.tagName || "") && code !== "Escape") return;
  keys[code] = true;
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(code)) e.preventDefault();
  if (e.repeat) return;
  const R = G.run;
  document.body.classList.remove("pad-nav");
  if (code === "Escape" || code === "KeyP") {
    e.preventDefault();
    if (code === "KeyP" && !(G.phase === "play" && R.phase === "play") && !(G.phase === "paused" && onScreen("pause"))) return;
    escapeAction();
    return;
  }
  if (onScreen("story") && (code === "Enter" || code === "Space")) { storyNext(); return; }
  if (G.phase === "play") {
    if (onScreen("levelup")) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code];
      if (n !== undefined) pickCard(n);
      if (code === "KeyR") doReroll();
      if (code === "KeyB") toggleBanish();
      if (code === "KeyS") doSkip();
      return;
    }
    if (onScreen("chest")) { if (code === "Enter" || code === "Space") closeChest(); return; }
    if (code === "Space" || code === "ShiftLeft" || code === "KeyE") R.useActive();
    const slot = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad7: 6 }[code];
    if (slot !== undefined) useSlot(slot);
  } else if (G.phase === "intro" && onScreen("intro") && (code === "Enter" || code === "Space")) startRun();
  // Enter moves on; preventDefault keeps the browser from also pressing
  // whatever the new screen focused.
  else if (G.phase === "menu" && onScreen("menu-run") && code === "Enter") { e.preventDefault(); openIntro(); }
  else if (G.phase === "menu" && onScreen("menu-hero") && code === "Enter") { e.preventDefault(); openStageSetup(); }
  else if (G.phase === "result" && onScreen("result") && code === "Enter") again();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; joy = null; });

app.addEventListener("pointerdown", (e) => {
  audio.unlock();
  window.focus();
  if (G.phase !== "play" || G.run?.phase !== "play" || e.target.closest("button, .screen")) return;
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  app.setPointerCapture?.(e.pointerId);
});
app.addEventListener("pointermove", (e) => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
app.addEventListener("pointerup", endJoy);
app.addEventListener("pointercancel", endJoy);
app.addEventListener("wheel", (e) => { if (G.phase === "play") scene.zoom = clamp(scene.zoom * (e.deltaY > 0 ? 1.06 : 1 / 1.06), 0.7, 1.35); }, { passive: true });

function doReroll() { const R = G.run; if (R.rerolls > 0) { R.reroll(); audio.play("reroll"); showLevelUp(); } }
function toggleBanish() {
  if (G.run.banishes <= 0) return;
  G.banishMode = !G.banishMode;
  $("#levelup").classList.toggle("banish-mode", G.banishMode);
  bind("lvSub", G.banishMode ? t("banishMode") : t("chooseOne"));
}
function doSkip() { const R = G.run; R.skip(); G.shown = ""; if (R.phase === "play") hideScreens(); else showLevelUp(); }
function storyNext() {
  progress.storyRead = 1;
  saveProgress(progress);
  const then = G.storyThen;
  G.storyThen = null;
  audio.play("click");
  if (then) then();
}
function again() {
  if (G.phase !== "result") return;
  openIntro();
}

// ── Buttons ──────────────────────────────────────────────────────────────
app.addEventListener("click", (e) => {
  const card = e.target.closest(".lcard");
  if (card) { pickCard(Number(card.dataset.card)); return; }
  const hero = e.target.closest(".hero");
  if (hero) {
    const h = HEROES.find((x) => x.id === hero.dataset.hero);
    if (!heroUnlocked(progress, h)) { audio.play("locked"); toast(t("unlockStage", { n: h.unlock.stage + 1 })); return; }
    audio.play("click");
    settings.hero = h.id; saveSettings(settings); renderHeroSetup(); titleRun();
    return;
  }
  const st = e.target.closest(".stage");
  if (st) {
    const i = Number(st.dataset.stage);
    if (!stageUnlocked(progress, i)) { audio.play("locked"); toast(lockText(i)); return; }
    audio.play("click");
    settings.stage = i; saveSettings(settings); renderRunSetup(); titleRun();
    return;
  }
  const buyBtn = e.target.closest("[data-buy]");
  if (buyBtn) { buy(buyBtn.dataset.buy); return; }
  const shopBtn = e.target.closest("[data-shop]");
  if (shopBtn) { buyItem(shopBtn.dataset.shop); return; }
  const itemBtn = e.target.closest("[data-item]");
  if (itemBtn) { useSlot(satchel.indexOf(itemBtn.dataset.item)); return; }
  const tab = e.target.closest(".tab");
  if (tab) { journalTab = tab.dataset.tab; audio.play("click"); renderJournal(); return; }
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action;
  if (a !== "back" && a !== "active") audio.play("click");
  switch (a) {
    case "play": if (!progress.storyRead) openStory(storyText().prologue, openHeroSetup); else openHeroSetup(); break;
    case "toStages": openStageSetup(); break;
    case "toHeroes": back(); break;
    case "storyNext": storyNext(); break;
    case "safetyOk": case "safetyCalm":
      settings.safetySeen = true;
      if (a === "safetyCalm") settings.calm = true;
      saveSettings(settings);
      track("safety_choice", { calm: settings.calm });
      goMain();
      break;
    case "begin": openIntro(); break;
    case "go": startRun(); break;
    case "hearth": renderHearth(); showScreen("menu-hearth", { push: true }); break;
    case "shop": renderShop(); showScreen("menu-shop", { push: true }); break;
    case "deeds": renderDeeds(); showScreen("menu-deeds", { push: true }); break;
    case "journal": renderJournal(); showScreen("menu-journal", { push: true }); break;
    case "howto": showScreen("menu-howto", { push: true }); break;
    case "settings": renderSettings(); showScreen("menu-settings", { push: true }); break;
    case "back": back(); break;
    case "pause": pause(); break;
    case "resume": resume(); break;
    case "abandon":
      if (confirm(t("confirmAbandon"))) { track("run_abandon", { stage: G.run.stage.index + 1, hero: G.run.heroDef.id, time_s: Math.round(G.run.clock / FPS), level: G.run.hero.level }); G.phase = "play"; G.run.phase = "dead"; G.run.phaseT = 999; G.resultAt = G.time; hideScreens(); }
      break;
    case "active": G.run?.useActive(); break;
    case "reroll": doReroll(); break;
    case "banish": toggleBanish(); break;
    case "skip": doSkip(); break;
    case "chestOk": closeChest(); break;
    case "again": again(); break;
    case "toMain": goMain(); break;
    case "reset": if (confirm(t("confirmReset"))) { resetProgress(progress); toast(t("progressReset")); } break;
    default:
  }
});
$("#blood").addEventListener("change", (e) => { settings.blood = e.target.checked; saveSettings(settings); });
app.addEventListener("pointerover", (e) => {
  const b = e.target.closest(".btn, .lcard, .hero:not(.locked), .stage:not(.locked)");
  if (b && b !== app.lastHover && e.pointerType === "mouse") audio.play("hover");
  if (e.pointerType === "mouse") document.body.classList.remove("pad-nav");
  app.lastHover = b;
});

// ── Gamepad ──────────────────────────────────────────────────────────────
const pad = new Gamepad();
let padActive = false;          // a pad is connected and was read this frame
pad.onConnect = (on) => { toast(t(on ? "padOn" : "padOff")); if (on) track("gamepad_connect", {}); };
// Settings: what the controller reports, live, so a pad that misbehaves can
// be checked (name, mapping, pressed buttons, axes).
let padInfoAt = 0;
function renderPadInfo() {
  if (!onScreen("menu-settings") || G.time < padInfoAt) return;
  padInfoAt = G.time + 0.1;
  const info = pad.info;
  bind("padInfo", info ? info.map((p) => `${p.id}\n${t("pad_mapping")}: ${p.mapping} · ${t("pad_buttons")}: ${p.buttons.join(" ") || "–"}\n${t("pad_axes")}: ${p.axes.join("  ")}`).join("\n\n") : t("pad_none"));
}

const visible = (el) => el.offsetParent !== null && !el.disabled;
function focusables() {
  const scr = $(".screen.active:not(#loading)");
  if (!scr) return [];
  return $$("button, select, input, .tab", scr).filter(visible);
}
// Moves the focus to the nearest control in a direction: up / down picks
// the nearest row first, then the control in it closest across; left /
// right stays in the row. With nothing further, it scrolls.
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
function scrollScreen(dy, smooth = false) {
  const scr = $(".screen.active .scroll-body") || $(".screen.scroll-y.active");
  if (scr) scr.scrollBy({ top: dy, behavior: smooth ? "smooth" : "instant" });
}

function pollPad() {
  padActive = pad.poll();
  renderPadInfo();
  if (!padActive) return;
  if (pad.any()) audio.unlock();
  const P = (b) => pad.pressed(b);
  const R = G.run;
  const overlay = !!$(".screen.active:not(#loading)");
  if (G.phase === "play" && !overlay && R.phase === "play") {
    if (pad.axes[3]) scene.zoom = clamp(scene.zoom * (1 + pad.axes[3] * 0.02), 0.7, 1.35);
    if (P(BTN.START)) { pause(); return; }
    if (P(BTN.A)) R.useActive();
    if (satchel.length) {
      if (P(BTN.LB)) { G.itemSel = (G.itemSel + satchel.length - 1) % satchel.length; audio.play("hover"); }
      if (P(BTN.RB)) { G.itemSel = (G.itemSel + 1) % satchel.length; audio.play("hover"); }
      if (P(BTN.X)) useSlot(G.itemSel);
    }
    return;
  }
  if (G.phase === "play" && R.phase !== "play" && !overlay) return;
  // Menus and the pick overlays: the focus moves, A presses.
  if (pad.axes[3]) scrollScreen(pad.axes[3] * 16);
  const dir = pad.nav(G.time);
  if (dir) { document.body.classList.add("pad-nav"); moveFocus(dir); }
  if (onScreen("levelup")) {
    if (P(BTN.Y)) { doReroll(); return; }
    if (P(BTN.X)) { toggleBanish(); return; }
    if (P(BTN.BACK)) { doSkip(); return; }
  }
  if (P(BTN.B)) { if (!onScreen("levelup") && !onScreen("chest") && !onScreen("safety")) escapeAction(); return; }
  if (P(BTN.START)) {
    if (G.phase === "paused" && onScreen("pause")) { resume(); return; }
    if (onScreen("story")) { storyNext(); return; }
    if (G.phase === "intro" && onScreen("intro")) { startRun(); return; }
    if (G.phase === "menu" && onScreen("menu-run")) { openIntro(); return; }
    if (G.phase === "menu" && onScreen("menu-hero")) { openStageSetup(); return; }
    if (G.phase === "result" && onScreen("result")) { again(); return; }
    if (onScreen("chest")) { closeChest(); return; }
  }
  if (P(BTN.A)) {
    document.body.classList.add("pad-nav");
    const el = document.activeElement;
    const list = focusables();
    // Nothing picked yet: A takes the screen's main button.
    const target = list.includes(el) ? el : list.find((x) => x.classList.contains("primary"));
    if (target?.tagName === "SELECT") moveFocus("right");
    else if (target) target.click();
    else moveFocus("down");
  }
}

// ── Loop ─────────────────────────────────────────────────────────────────
let last = performance.now(), acc = 0;
const SFX_SKIP = new Set();
function drainSfx(R) {
  for (const [name, k] of R.sfx) if (!SFX_SKIP.has(name)) audio.play(name, k);
  R.sfx.length = 0;
  if (R.hitsThisFrame > 0) audio.play("hit");
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  G.time += dt;
  const R = G.run;
  if (!R) return;
  pollPad();
  const stepping = G.phase === "play" || G.phase === "menu" || G.phase === "intro" || G.phase === "result";
  if (stepping) {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 5) {
      acc -= DT; n++;
      const input = G.phase === "play" && R.phase === "play" ? readInput() : { mx: 0, my: 0 };
      if (G.phase === "result" && !R.title) break;
      R.step(input);
      R.seenIds = R.seenIds || [];
      if (R.frame % 30 === 0) for (const m of R.monsters) if (m.alive && !m.def.prop && !m.def.part && !R.seenSet?.has(m.id)) { (R.seenSet ||= new Set()).add(m.id); R.seenIds.push(m.id); }
      drainSfx(R);
      if (!R.title) drainItems(R);
    }
    if (acc > DT * 5) acc = 0;
  } else acc = 0;

  // Run state → overlays.
  if (G.phase === "play") {
    if (R.phase === "levelup" && G.shown !== "levelup" + R.rollId) { G.shown = "levelup" + R.rollId; joy = null; showLevelUp(); }
    if (R.phase === "chest" && G.shown !== "chest") { G.shown = "chest"; joy = null; showChest(); }
    if ((R.phase === "dead" || R.phase === "won") && !G.resultAt) G.resultAt = G.time + (R.phase === "won" ? 3.2 : 2.4);
    if (G.resultAt && G.time >= G.resultAt) { G.resultAt = 0; finishRun(); }
    if (R.bossSpawned && !R.bossTracked) { R.bossTracked = true; track("boss_reached", { stage: R.stage.index + 1, hero: R.heroDef.id, level: R.hero.level, blood: R.blood }); }
    // Music heats up as the keeper nears.
    audio.setIntensity(R.bossSpawned ? 1 : R.clock / (R.stage.bossAt * FPS) * 0.95);
    syncSatchel();
    // Ability button.
    const btn = $(".active-btn"), ar = hud.activeRect();
    if (btn.dataset.at !== `${ar.x}|${ar.y}|${ar.size}`) {
      btn.dataset.at = `${ar.x}|${ar.y}|${ar.size}`;
      Object.assign(btn.style, { left: `${ar.x}px`, top: `${ar.y}px`, width: `${ar.size}px`, height: `${ar.size}px` });
    }
  }

  const shakeK = settings.shake ? R.shakeAmp * (R.shakeT > 0 ? 1 : 0) : 0;
  const shake = shakeK > 0 ? [(Math.sin(G.time * 91) + Math.sin(G.time * 53)) * shakeK * 0.5, (Math.cos(G.time * 77) + Math.sin(G.time * 61)) * shakeK * 0.5] : [0, 0];
  scene.render(R, { time: G.time, dt, mode: R.title ? "title" : "play", shake, calm: settings.calm });
  hud.draw(R, {
    project: (x, y, z) => scene.project(x, y, z),
    joy: G.phase === "play" && R.phase === "play" ? joy : null,
    settings, time: G.time, mode: R.title ? "title" : "play",
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
  applyDom();
  fillIcons();
  applyAudio();
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(app);
  resize();
  goMain();
  if (!settings.safetySeen) showScreen("safety");
  // Deeds already earned before they existed are handed out on the first
  // boot that knows them.
  setTimeout(grantDeeds, 1200);
  track("game_open", { lang: getLang(), returning: progress.runs > 0, runs: progress.runs, beacons: progress.cleared.filter(Boolean).length, embedded: window.parent !== window });
  requestAnimationFrame((tm) => { last = tm; frame(tm); });
  setTimeout(() => $("#loading").classList.remove("active"), 300);
}

if (import.meta.env.DEV) window.__lastLantern = { G, progress, settings, startRun, openIntro, goMain, hideScreens, keys, get scene() { return scene; }, spawn: (id, x, y) => spawnMonster(G.run, id, x, y) };

// Dev cheats: a panel at the bottom of Settings, and __lastLantern.cheat in
// the console. Vite drops this block from production builds.
if (import.meta.env.DEV) {
  const CHEATS = {
    embers: ["+5000 embers", () => { progress.embers += 5000; }],
    beacons: ["Light all five beacons", () => { for (let i = 0; i < BEACONS; i++) progress.cleared[i] = true; }],
    blood: ["…under the Blood Moon too", () => { for (let i = 0; i < BEACONS; i++) { progress.cleared[i] = true; progress.clearedBlood[i] = true; } }],
    arsenal: ["Unlock every weapon", () => { progress.maxLevel = Math.max(progress.maxLevel, 25); progress.totalKills = Math.max(progress.totalKills, 2500); }],
    satchel: ["Fill the satchel", () => { for (const it of ITEMS) progress.items[it.id] = ITEM_MAX; }],
    deeds: ["Forget all deeds", () => { progress.ach = {}; }],
  };
  const cheat = (id) => {
    CHEATS[id][1]();
    saveProgress(progress);
    toast(`DEV: ${CHEATS[id][0]}`);
    if (id !== "deeds") grantDeeds();
    renderMain();
  };
  window.__lastLantern.cheat = Object.fromEntries(Object.keys(CHEATS).map((id) => [id, () => cheat(id)]));
  const box = document.createElement("div");
  box.className = "dev-cheats";
  box.innerHTML = `<h3>Dev cheats</h3>${Object.entries(CHEATS).map(([id, [label]]) => `<button class="btn small" data-cheat="${id}">${label}</button>`).join("")}`;
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-cheat]"); if (b) cheat(b.dataset.cheat); });
  $("#menu-settings .settings").append(box);
}

boot();
window.focus();
