import { t, LANGS, getLang, memoryText, outroText, noteText, storyText } from "../i18n/index.js";
import { UPGRADES, ITEMS, TABS, level, maxLevel, nextCost, pocketFor, lockOf } from "../data/upgrades.js";
import { ACHIEVEMENTS, rankFor, rankProgress } from "../data/progression.js";
import { ITEM_ICONS } from "./icons.js";
import { padLabel } from "../input/gamepad.js";
import { CLIENTS, MEMORY_OWNER, isOpen, memoriesOf } from "../levels/index.js";

// ── Menus and panels ─────────────────────────────────────────────────────
// Plain DOM over the 3D view: the title screen, settings, how to play,
// pause, the job board and the workbench (opened from the Factory), the
// memory cards and the result of a dream. Each screen is built on demand;
// only one is open at a time.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export class Menus {
  constructor(root, audio) {
    this.root = root;
    this.audio = audio;
    this.el = document.createElement("div");
    this.el.className = "menus";
    root.appendChild(this.el);
    this.cards = document.createElement("div");
    this.cards.className = "memcards";
    root.appendChild(this.cards);
    this.fader = document.createElement("div");
    this.fader.className = "fader";
    root.appendChild(this.fader);
    this.open = null;
  }

  close() { this.el.innerHTML = ""; this.open = null; this.preview?.unmount(); }
  get isOpen() { return !!this.open; }

  // Build a screen: html with data-a="action" buttons; actions maps them.
  show(name, html, actions, cls = "") {
    if (name !== "bench") this.preview?.unmount();
    this.open = name;
    this.el.innerHTML = `<section class="screen ${cls}" data-screen="${name}">${html}</section>`;
    for (const b of this.el.querySelectorAll("[data-a]")) {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const a = b.dataset.a;
        if (b.classList.contains("disabled")) { this.audio.play("locked"); return; }
        this.audio.play(a === "back" || a === "close" ? "back" : "click");
        actions[a]?.(b);
      });
    }
    this.onShow?.(name);
    return this.el.firstElementChild;
  }

  title(progress, { onPlay, onSettings, onHowto }) {
    const started = progress.done.length || progress.dust || progress.introSeen;
    this.show("title", `
      <div class="title-card">
        <div class="logo">${esc(t("title"))}</div>
        <div class="tagline">${esc(t("tagline"))}</div>
        <div class="menu-buttons">
          <button class="btn big" data-a="play">${esc(t(started ? "continue" : "play"))}</button>
          <div class="row2"><button class="btn ghost" data-a="howto">${esc(t("howto"))}</button><button class="btn ghost" data-a="settings">${esc(t("settings"))}</button></div>
        </div>
      </div>
      <footer class="credit"><div>${esc(t("madeBy"))}</div><div class="tech">three.js</div></footer>`,
    { play: onPlay, settings: onSettings, howto: onHowto }, "title");
  }

  howto(onBack) {
    this.show("howto", `<div class="panel wide prose"><h2>${esc(t("howto"))}</h2>${t("howto_text")}<div class="actions"><button class="btn" data-a="back">${esc(t("back"))}</button></div></div>`, { back: onBack }, "dim");
  }

  pause({ inDream, onResume, onJournal, onAchievements, onSettings, onFactory, onMain }) {
    this.show("pause", `<div class="panel narrow"><h2>${esc(t("paused"))}</h2><div class="menu-buttons">
      <button class="btn big" data-a="resume">${esc(t("resume"))}</button>
      <button class="btn ghost" data-a="journal">${esc(t("journal"))}</button>
      <button class="btn ghost" data-a="achievements">${esc(t("achievements"))}</button>
      <button class="btn ghost" data-a="settings">${esc(t("settings"))}</button>
      ${inDream ? `<button class="btn ghost" data-a="factory">${esc(t("toFactory"))}</button>` : ""}
      <button class="btn ghost" data-a="main">${esc(t("mainMenu"))}</button></div></div>`,
    { resume: onResume, journal: onJournal, achievements: onAchievements, settings: onSettings, factory: onFactory, main: onMain }, "dim");
  }

  settings(S, { onChange, onBack, onReset }) {
    const seg = (key, opts) => `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button class="${S[key] === v ? "on" : ""}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
    const range = (key, min, max, step) => `<input type="range" min="${min}" max="${max}" step="${step}" value="${S[key]}" data-set="${key}">`;
    const pick = (key, opts) => `<select class="pick" data-set="${key}">${opts.map(([v, l]) => `<option value="${v}" ${S[key] === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const check = (key) => `<input type="checkbox" ${S[key] ? "checked" : ""} data-set="${key}">`;
    const el = this.show("settings", `<div class="panel wide"><h2>${esc(t("settings"))}</h2><div class="settings">
      <h3>${esc(t("set_lang"))}</h3>${pick("lang", LANGS)}
      <h3>${esc(t("set_sound"))}</h3>
      <label class="row"><span>${esc(t("set_master"))}</span>${range("master", 0, 1, 0.05)}</label>
      <label class="row"><span>${esc(t("set_sfx"))}</span>${range("sfx", 0, 1, 0.05)}</label>
      <label class="row"><span>${esc(t("set_music"))}</span>${range("music", 0, 1, 0.05)}</label>
      <label class="row"><span>${esc(t("set_voice"))}</span>${check("voice")}</label>
      <label class="row"><span>${esc(t("set_voiceVol"))}</span>${range("voiceVol", 0, 1, 0.05)}</label>
      <h3>${esc(t("set_controls"))}</h3>
      <label class="row"><span>${esc(t("set_sens"))}</span>${range("sensitivity", 0.3, 2.5, 0.05)}</label>
      <label class="row"><span>${esc(t("set_tsens"))}</span>${range("touchSensitivity", 0.3, 2.5, 0.05)}</label>
      <label class="row"><span>${esc(t("set_psens"))}</span>${range("padSensitivity", 0.3, 2.5, 0.05)}</label>
      <label class="row"><span>${esc(t("set_invert"))}</span>${check("invertY")}</label>
      <label class="row"><span>${esc(t("set_assist"))}</span>${check("aimAssist")}</label>
      <label class="row"><span>${esc(t("set_auto"))}</span>${check("autoFire")}</label>
      <h3>${esc(t("set_game"))}</h3>
      <div class="row"><span>${esc(t("set_quality"))}</span>${seg("quality", [["high", t("q_high")], ["low", t("q_low")]])}</div>
      <label class="row"><span>${esc(t("set_shake"))}</span>${check("shake")}</label>
      <h3>${esc(t("set_progress"))}</h3>
      <div class="row"><span></span><button class="btn small danger" data-a="reset">${esc(t("set_reset"))}</button></div>
      </div><div class="actions"><button class="btn" data-a="back">${esc(t("back"))}</button></div></div>`,
    { back: onBack, reset: () => { if (confirm(t("set_resetAsk"))) onReset(); } }, "dim");
    for (const s of el.querySelectorAll(".seg")) {
      for (const b of s.querySelectorAll("button")) b.addEventListener("click", (e) => {
        e.stopPropagation();
        for (const o of s.querySelectorAll("button")) o.classList.toggle("on", o === b);
        this.audio.play("click");
        onChange(s.dataset.set, b.dataset.v);
      });
    }
    for (const i of el.querySelectorAll("input[data-set]")) i.addEventListener("input", () => onChange(i.dataset.set, i.type === "checkbox" ? i.checked : Number(i.value)));
    for (const s of el.querySelectorAll("select[data-set]")) s.addEventListener("change", () => { this.audio.play("click"); onChange(s.dataset.set, s.value); });
  }

  // The journal: the story so far, chapter by chapter (the Factory, then
  // each dream), a paragraph for each step you have got to; under it the
  // memories found and the notes (the how-tos the radio leaves out).
  journal(progress, { onClose }) {
    const P = progress, heard = (id) => P.log.includes(id);
    const chapters = [["hub", t("j_factory")], ...CLIENTS.filter((c) => c.level).map((c) => [c.id, t(`c_${c.id}`)[0]])];
    const sections = chapters.map(([id, title]) => {
      const beats = id === "hub" ? [["first", heard("hub_intro1") || P.done.length > 0]]
        : [["arrive", heard(`${id}_in1`) || P.done.includes(id)], ["tool", heard(`${id}_fix1`) || P.done.includes(id)], ["boss", heard(`${id}_boss`) || P.done.includes(id)], ["fixed", P.done.includes(id)]];
      const story = beats.filter(([, on]) => on).map(([b]) => `<p class="js">${esc(storyText(`${id}_${b}`))}</p>`).join("");
      if (!story) return "";
      const mems = memoriesOf(id);
      const found = mems.map((m) => {
        if (!P.memories.includes(m)) return `<li class="missing"><b>???</b></li>`;
        const [ti, tx] = memoryText(m);
        return `<li><b>${esc(ti)}</b> ${esc(tx)}</li>`;
      }).join("");
      const notes = P.log.filter((l) => l.startsWith(id + "_")).map((l) => noteText(l)).filter(Boolean).map(([ti, tx]) => `<li><b>${esc(ti)}</b> ${esc(tx)}</li>`).join("");
      const more = id !== "hub" && !P.done.includes(id) ? `<p class="jmore">${esc(t("j_more"))}</p>` : "";
      return `<section class="jch"><h3>${esc(title)}</h3>${story}${more}${mems.length ? `<h4>${esc(t("memories"))} ${mems.filter((m) => P.memories.includes(m)).length}/${mems.length}</h4><ul class="jmem">${found}</ul>` : ""}${notes ? `<details class="jnotes"><summary>${esc(t("j_notes"))}</summary><ul>${notes}</ul></details>` : ""}</section>`;
    }).join("");
    const el = this.show("journal", `<div class="panel wide journal"><h2>${esc(t("journal"))}</h2><div class="jbody">${sections || `<p class="intro">${esc(t("j_empty"))}</p>`}</div>
      <div class="actions"><button class="btn" data-a="close">${esc(t("close"))}</button></div></div>`, { close: onClose }, "dim");
    // Open at the latest chapter.
    const body = el.querySelector(".jbody"), last = body?.querySelector(".jch:last-of-type");
    if (body && last) body.scrollTop = last.offsetTop - body.offsetTop;
  }

  // The achievements: earned ones lit, the rest greyed out with what they ask.
  achievements(progress, { onClose }) {
    const got = ACHIEVEMENTS.filter((a) => progress.ach[a.id]).length;
    const rows = ACHIEVEMENTS.map((a) => {
      const [name, desc] = t(`a_${a.id}`), on = !!progress.ach[a.id];
      // (Buttons that do nothing, so a pad can step through the list.)
      return `<li><button class="ach ${on ? "on" : ""}" tabindex="-1"><i>${on ? a.icon : "?"}</i><div><b>${esc(name)}</b><p>${esc(desc)}</p></div></button></li>`;
    }).join("");
    this.show("achievements", `<div class="panel wide achs"><div class="bhead"><h2>${esc(t("achievements"))}</h2><div class="purse">${esc(t("ach_count", { n: got, of: ACHIEVEMENTS.length }))}</div></div>
      <ul class="achlist">${rows}</ul><div class="actions"><button class="btn" data-a="close">${esc(t("close"))}</button></div></div>`, { close: onClose }, "dim");
  }

  // The job board. A dream fixed once can be taken again, as it was or in
  // deep sleep (hard).
  board(progress, { onTake, onClose }) {
    const cards = CLIENTS.filter((c) => !c.door || isOpen(c, progress)).map((c) => {
      const [name, desc] = t(`c_${c.id}`);
      if (!isOpen(c, progress)) return `<div class="client locked"><div class="photo q">?</div><div class="info"><b>${esc(name)}</b><p>${esc(desc)}</p><span class="tag">${esc(t("board_next"))}</span></div></div>`;
      const done = progress.done.includes(c.id), hard = progress.hard?.includes(c.id), found = progress.memories.filter((m) => MEMORY_OWNER[m] === c.id).length;
      const taken = progress.picked === c.level, takenHard = taken && progress.pickedHard;
      const btn = `<button class="btn ${taken && !takenHard ? "ghost" : ""}" data-a="take" data-level="${c.level}">${esc(taken && !takenHard ? t("board_taken") : done ? t("board_again") : t("board_take"))}</button>`;
      const hardBtn = done ? `<button class="btn hard ${takenHard ? "ghost" : ""}" data-a="hard" data-level="${c.level}" title="${esc(t("board_hardTip"))}">${esc(takenHard ? t("board_hardTaken") : t("board_hard"))}</button>` : "";
      return `<div class="client ${done ? "done" : "new"}"><div class="photo ${c.id === "park" ? "paw" : c.id}"></div><div class="info"><b>${esc(name)}</b><p>${esc(desc)}</p>
        <span class="tag">${esc(done ? t("board_fixed") : t("board_new"))}</span> ${hard ? `<span class="tag hard">${esc(t("board_hardDone"))}</span> ` : ""}<span class="tag soft">${esc(t("memories"))} ${found}/${memoriesOf(c.level).length}</span>${done ? `<p class="hardtip">${esc(t("board_hardTip"))}</p>` : ""}</div>
        <div class="takes">${btn}${hardBtn}</div></div>`;
    }).join("");
    this.show("board", `<div class="panel wide board"><h2>${esc(t("board_title"))}</h2><div class="clients">${cards}</div><div class="actions"><button class="btn ghost" data-a="close">${esc(t("close"))}</button></div></div>`,
      { take: (b) => onTake(b.dataset.level, false), hard: (b) => onTake(b.dataset.level, true), close: onClose }, "dim");
  }

  // The workbench: a page per tab, the goods on the left, the one picked
  // on the right with its preview turning, what the next level changes
  // and the buy button. Redrawn after every pick and purchase.
  bench(progress, { onBuy, onClose }) {
    const st = this.benchState ??= { tab: "tools", sel: null };
    // A redraw keeps the list (and the panel) scrolled where it was.
    const old = this.open === "bench" ? this.el.querySelector(".tiles") : null, keep = old ? [old.scrollTop, this.el.querySelector(".bench")?.scrollTop ?? 0, st.tab] : null;
    const rank = rankFor(progress.xp), [have, need] = rankProgress(progress.xp);
    const own = progress.upgrades, items = progress.items ?? {}, pocket = pocketFor(own);
    // A tool you don't have yet isn't on the bench at all (no spoilers).
    const entries = st.tab === "kit" ? ITEMS.map((it) => ({ ...it, item: true })) : UPGRADES.filter((u) => u.tab === st.tab && (!u.needs || progress.tools.includes(u.needs)));
    const cur = entries.find((e) => e.id === st.sel) ?? entries[0];
    st.sel = cur.id;
    // Keep the pad's focus where it was across the redraw.
    const f = document.activeElement?.dataset ?? {};
    const focusKey = f.a ? `${f.a}:${f.id ?? f.tab ?? ""}` : null;

    const tabs = TABS.map((id) => `<button class="${id === st.tab ? "on" : ""}" data-a="tab" data-tab="${id}">${esc(t(`tab_${id}`))}</button>`).join("");
    let group = null;
    const tiles = entries.map((e) => {
      const head = e.group && e.group !== group ? `<h4>${esc(t(`g_${e.group}`))}</h4>` : "";
      group = e.group;
      const [name] = t(e.item ? `i_${e.id}` : `u_${e.id}`);
      let right, cls = "";
      if (e.item) {
        const n = items[e.id] || 0;
        right = `<span class="cnt">${n}/${pocket}</span><span class="pr">${e.cost} ✦</span>`;
        if (n >= pocket) cls = "full";
        if (lockOf(e, progress)) { cls = "locked"; right = `<span class="pr rk">${esc(t("rank", { n: e.rank }))}</span>`; }
      } else {
        const l = level(own, e.id), max = maxLevel(e), cost = nextCost(e, own);
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < l ? "on" : ""}"></i>`).join("");
        right = `<span class="pips">${pips}</span><span class="pr">${cost === null ? esc(t("bench_max")) : `${cost} ✦`}</span>`;
        if (cost === null) cls = "maxed";
        const lock = cost === null ? null : lockOf(e, progress);
        if (lock) cls = "locked";
        if (lock?.rank) right = `<span class="pips">${pips}</span><span class="pr rk">${esc(t("rank", { n: lock.rank }))}</span>`;
      }
      const ico = e.item ? `<i class="ico kit">${ITEM_ICONS[e.id]}</i>` : `<i class="ico ${e.group ?? e.tab}"></i>`;
      return `${head}<button class="tile ${cls} ${e.id === cur.id ? "sel" : ""}" data-a="pick" data-id="${e.id}">${ico}<span class="nm">${esc(name)}</span>${right}</button>`;
    }).join("");

    const [name, desc] = t(cur.item ? `i_${cur.id}` : `u_${cur.id}`);
    let meta, stat, buy;
    if (cur.item) {
      const n = items[cur.id] || 0;
      meta = t("bench_have", { n, of: pocket });
      stat = `<div class="stat"><span>${esc(t("bench_use"))}</span><b><kbd>${cur.key}</kbd> · <kbd>${padLabel(cur.pad)}</kbd></b></div>`;
      buy = lockOf(cur, progress) ? `<span class="tag soft">${esc(t("bench_rank", { n: cur.rank }))}</span>`
        : n >= pocket ? `<span class="tag soft">${esc(t("bench_full"))}</span>`
        : `<button class="btn ${progress.dust >= cur.cost ? "" : "disabled"}" data-a="buy" data-id="${cur.id}">${esc(t("bench_buy"))} · ${cur.cost} ✦</button>`;
    } else {
      const l = level(own, cur.id), max = maxLevel(cur), cost = nextCost(cur, own), lock = cost === null ? null : lockOf(cur, progress);
      meta = t("bench_level", { n: l, of: max });
      const now = cur.stat(l), next = cost === null ? null : cur.stat(l + 1);
      stat = `<div class="stat"><span>${esc(t(`st_${cur.id}`))}</span><b>${esc(now)}${next === null ? "" : ` <em>→ ${esc(next)}</em>`}</b></div>`;
      buy = lock?.tool ? `<span class="tag soft">${esc(t(`bench_locked_${cur.needs}`))}</span>`
        : lock?.rank ? `<span class="tag soft">${esc(t("bench_rank", { n: lock.rank }))}</span>`
        : cost === null ? `<span class="tag">${esc(t("bench_max"))}</span>`
        : `<button class="btn ${progress.dust >= cost ? "" : "disabled"}" data-a="buy" data-id="${cur.id}">${esc(t(l ? "bench_upgrade" : "bench_buy"))} · ${cost} ✦</button>`;
    }
    const el = this.show("bench", `<div class="panel wide bench">
      <div class="bhead"><h2>${esc(t("bench_title"))}</h2><div class="rankbox"><b>${esc(t("rank", { n: rank }))}</b><div class="xpbar"><i style="transform:scaleX(${need ? (have / need).toFixed(3) : 1})"></i></div><small>${esc(need ? t("xpLine", { have, need }) : t("xpMax"))}</small></div><div class="purse">✦ <b>${progress.dust}</b></div></div>
      <p class="intro">${esc(t("bench_intro"))}</p>
      <div class="seg tabs">${tabs}</div>
      <div class="bgrid"><div class="tiles">${tiles}</div>
        <div class="detail"><div class="pv"></div><b class="dn">${esc(name)}</b><div class="dl">${esc(meta)}</div><p>${esc(desc)}</p>${stat}<div class="dbuy">${buy}</div></div></div>
      <div class="actions"><button class="btn ghost" data-a="close">${esc(t("close"))}</button></div></div>`,
    {
      pick: (b) => { st.sel = b.dataset.id; this.bench(progress, { onBuy, onClose }); },
      tab: (b) => { st.tab = b.dataset.tab; st.sel = null; this.bench(progress, { onBuy, onClose }); },
      buy: (b) => onBuy(b.dataset.id),
      close: onClose,
    }, "dim");
    if (keep && keep[2] === st.tab) { el.querySelector(".tiles").scrollTop = keep[0]; el.querySelector(".bench").scrollTop = keep[1]; }
    if (this.preview) {
      this.preview.mount(el.querySelector(".pv"));
      this.preview.show(cur.model, cur.glow);
    }
    if (focusKey) {
      const [a, id] = focusKey.split(":");
      (el.querySelector(`[data-a="${a}"][data-id="${id}"], [data-a="${a}"][data-tab="${id}"]`) ?? el.querySelector(`[data-a="pick"][data-id="${cur.id}"]`))?.focus({ preventScroll: true });
    }
  }

  result(run, { onFactory, onAgain, xp = 0 }) {
    const s = run.stats, m = Math.floor(run.time / 60), sec = String(Math.floor(run.time % 60)).padStart(2, "0");
    const mems = run.memories.filter((x) => x.got).length;
    this.show("result", `<div class="panel narrow result-card"><h2>${esc(t("dreamFixed"))}</h2>${run.opts.difficulty === "hard" ? `<span class="tag hard">${esc(t("hardTag"))}</span>` : ""}<p>${esc(t(`dreamFixedSub_${run.def.id}`) === `dreamFixedSub_${run.def.id}` ? t("dreamFixedSub") : t(`dreamFixedSub_${run.def.id}`))}</p><p class="outro">${esc(outroText(run.def.id))}</p><table>
      <tr><td>${esc(t("r_time"))}</td><td>${m}:${sec}</td></tr><tr><td>${esc(t("r_dust"))}</td><td>+${run.dust} ✦</td></tr>
      <tr><td>${esc(t("memories"))}</td><td>${mems}/${run.memories.length}</td></tr>
      <tr><td>${esc(t("r_popped"))}</td><td>${s.popped}</td></tr><tr><td>${esc(t("r_faints"))}</td><td>${run.faints}</td></tr>
      <tr><td>${esc(t("r_xp"))}</td><td>+${xp}</td></tr></table>
      <div class="menu-buttons"><button class="btn big" data-a="factory">${esc(t("toFactory"))}</button><button class="btn ghost" data-a="again">${esc(t("again"))}</button></div></div>`,
    { factory: onFactory, again: onAgain }, "dim");
  }

  // The epilogue, once the week is done: what became of everyone, your
  // week in numbers, and thanks.
  epilogue(progress, { onClose }) {
    const who = ["park", "school", "kitchen", "garden", "space", "oldhum", "margo"].map((id) => `<li>${esc(t(`epi_${id}`))}</li>`).join("");
    const mems = progress.memories.length, allMems = CLIENTS.reduce((n, c) => n + (c.level ? memoriesOf(c.level).length : 0), 0);
    const achs = ACHIEVEMENTS.filter((a) => progress.ach[a.id]).length;
    this.show("epilogue", `<div class="panel narrow result-card epilogue"><h2>${esc(t("epi_title"))}</h2><p class="outro">${esc(t("epi_lead"))}</p><ul class="epi">${who}</ul>
      <h4>${esc(t("epi_week"))}</h4><table>
      <tr><td>${esc(t("epi_nights"))}</td><td>${progress.night ?? 0}</td></tr><tr><td>${esc(t("epi_popped"))}</td><td>${progress.stats.popped}</td></tr>
      <tr><td>${esc(t("memories"))}</td><td>${mems}/${allMems}</td></tr><tr><td>${esc(t("achievements"))}</td><td>${achs}/${ACHIEVEMENTS.length}</td></tr>
      <tr><td>${esc(t("rank", { n: rankFor(progress.xp) }))}</td><td>${progress.xp} XP</td></tr></table>
      <p>${esc(t("epi_thanks"))}</p><p class="by">${esc(t("madeBy"))}</p>
      <div class="menu-buttons"><button class="btn big" data-a="close">${esc(t("toFactory"))}</button></div></div>`, { close: onClose }, "dim");
  }

  // A memory card slides in on the right for a few seconds.
  memory(id) {
    const [title, text] = memoryText(id);
    const c = document.createElement("div");
    c.className = "memcard";
    c.innerHTML = `<div class="k">${esc(t("memoryFound"))}</div><b>${esc(title)}</b><p>${esc(text)}</p>`;
    this.cards.appendChild(c);
    setTimeout(() => c.classList.add("out"), 7000);
    setTimeout(() => c.remove(), 7800);
  }

  // An achievement earned: a gold card slides in like a memory.
  achievement(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id), [name, desc] = t(`a_${id}`);
    const c = document.createElement("div");
    c.className = "memcard achcard";
    c.innerHTML = `<div class="k">${esc(t("achGot"))}</div><b><i>${a?.icon ?? "★"}</i> ${esc(name)}</b><p>${esc(desc)}</p>`;
    this.cards.appendChild(c);
    setTimeout(() => c.classList.add("out"), 5500);
    setTimeout(() => c.remove(), 6300);
  }

  // Fade to dark, run fn, fade back.
  fade(fn, hold = 250) {
    this.fader.classList.add("on");
    setTimeout(() => { fn(); setTimeout(() => this.fader.classList.remove("on"), hold); }, 450);
  }
}
export { getLang };
