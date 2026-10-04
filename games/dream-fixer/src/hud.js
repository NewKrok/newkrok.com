import { t } from "./i18n/index.js";
import { ITEMS, ITEM } from "./data/upgrades.js";
import { ITEM_ICONS } from "./ui/icons.js";

// ── HUD ──────────────────────────────────────────────────────────────────
// Kept small: a crosshair whose ring shows the tool's heat (and fills
// pink while a charged bolt builds), and a word when it overheats.

const R = 15, CIRC = 2 * Math.PI * R;

export class Hud {
  constructor(root) {
    const el = this.el = document.createElement("div");
    el.className = "hud hidden";
    el.innerHTML = `
      <svg class="xhair" viewBox="-24 -24 48 48" aria-hidden="true">
        <circle class="heat-bg" r="${R}" />
        <circle class="heat" r="${R}" stroke-dasharray="0 ${CIRC}" transform="rotate(-90)" />
        <circle class="charge" r="${R + 5}" stroke-dasharray="0 ${CIRC * 1.4}" transform="rotate(-90)" />
        <circle class="dot" r="2" />
        <path class="ticks" d="M-9 0h-5M9 0h5M0 -9v-5M0 9v5" />
      </svg>
      <div class="hot" data-i18n="overheated"></div>
      <div class="vignette"></div>
      <div class="slowed"><span></span></div>
      <div class="wake"><span class="lbl" data-i18n="wakefulness"></span><div class="bar"><i class="lag"></i><i class="fill"></i></div><div class="stamina"><i></i></div></div>
      <div class="tasks"><div class="ttl"></div><ul></ul></div>
      <div class="prompt"></div>
      <div class="tune"><div class="lbl"></div><div class="bar"><i></i></div><div class="warn"></div></div>
      <div class="banner"></div>
      <div class="clickhint"></div>
      <div class="tankdots"></div>
      <div class="bossbar"><div class="lbl"></div><div class="bar"><i class="lag"></i><i class="fill"></i></div></div>
      <div class="kit"></div>
      <div class="dust"><svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg><b>0</b><span class="plus"></span></div>`;
    root.appendChild(el);
    this.heat = el.querySelector(".heat");
    this.charge = el.querySelector(".charge");
    this.hot = el.querySelector(".hot");
    this.xhair = el.querySelector(".xhair");
    this.hot.textContent = t("overheated");
    this.fill = el.querySelector(".wake .fill");
    this.lag = el.querySelector(".wake .lag");
    this.wake = el.querySelector(".wake");
    this.stam = el.querySelector(".stamina");
    this.stamFill = el.querySelector(".stamina i");
    this.vig = el.querySelector(".vignette");
    this.dustEl = el.querySelector(".dust b");
    this.dustBox = el.querySelector(".dust");
    el.querySelector(".wake .lbl").textContent = t("wakefulness");
    this.last = { heat: -1, charge: -1, over: null, hp: -1, dust: -1 };
    this.lagHp = 1; this.hurt = 0;
    this.tasksEl = el.querySelector(".tasks ul");
    el.querySelector(".tasks .ttl").textContent = t("tasks");
    this.plusEl = el.querySelector(".dust .plus");
    this.plusN = 0; this.plusT = 0;
    this.prompt = el.querySelector(".prompt");
    this.tune = el.querySelector(".tune");
    this.tuneFill = el.querySelector(".tune .bar i");
    el.querySelector(".tune .lbl").textContent = t("tuning");
    this.warn = el.querySelector(".tune .warn");
    this.warn.textContent = t("stayInRing");
    this.bannerEl = el.querySelector(".banner");
    this.bannerT = 0;
    this.touch = false;
    this.bossEl = el.querySelector(".bossbar");
    this.bossFill = el.querySelector(".bossbar .fill");
    this.bossLag = el.querySelector(".bossbar .lag");
    this.bossLbl = el.querySelector(".bossbar .lbl");
    this.bossLagHp = 1;
    this.hint = el.querySelector(".clickhint");
    this.tankEl = el.querySelector(".tankdots");
    this.hint.textContent = t("clickToAim");
    this.kitEl = el.querySelector(".kit");
    this.slowEl = el.querySelector(".slowed");
    this.slowEl.querySelector("span").textContent = t("slowed");
  }

  show(on) { this.el.classList.toggle("hidden", !on); }
  // In the Factory: no tools, no wakefulness, just the prompt and the dust.
  hub(on) { this.el.classList.toggle("in-hub", on); }
  // Desktop play without the mouse grabbed (a lock the browser refused):
  // say how to get it back.
  unlocked(on) { if (on !== this.hintOn) { this.hint.classList.toggle("on", on); this.hintOn = on; } }
  destroy() { this.el.remove(); }
  clear() { clearTimeout(this.bannerTimer); this.bannerEl.classList.remove("on"); this.hurt = 0; this.lagHp = 1; }

  onEvent(e) {
    if (e.type === "hurt") this.hurt = Math.min(1, this.hurt + 0.6);
    if (e.type === "heal") { this.wake.classList.remove("heal"); void this.wake.offsetWidth; this.wake.classList.add("heal"); }
    if (e.type === "dust") this.plusN++;
    if (e.type === "memory") this.plusN += 5;
    if (e.type === "faint") { this.hurt = 1; this.banner(t("fainted")); }
    if (e.type === "anchorFixed") this.banner(e.left ? t("anchorFixed") : t("allFixed"), true);
    if (e.type === "coreOpen") this.bannerTimer = setTimeout(() => this.banner(t("coreOpen")), 2600);
    if (e.type === "coreWake") this.banner(t("coreWake"));
    if (e.type === "bossReset") { clearTimeout(this.bannerTimer); this.bannerTimer = setTimeout(() => this.banner(t("bossReset")), 1200); }
    if (e.type === "bossPhase") this.banner(t(`bossPhase_${e.kind ?? "vacuum"}`));
    if (e.type === "penBlot") this.banner(t("bossBlot"), true);
    if (e.type === "cookerLid" && e.off) this.banner(t("bossLid"), true);
    if (e.type === "bossClog") this.banner(t("bossClog"), true);
    if (e.type === "itemUse") this.kitFlash = e.id;
    if (e.type === "itemNo") this.banner(t("kit_awake"));
    if (e.type === "toolUnlocked") this.bannerTimer = setTimeout(() => this.banner(t(`toolGot_${e.tool}`), true), 2600);
  }

  banner(text, good = false) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.toggle("good", good);
    this.bannerEl.classList.remove("on"); void this.bannerEl.offsetWidth; this.bannerEl.classList.add("on");
  }

  update(run, dt = 1 / 60) {
    // Wakefulness bar with a trailing "lost" part.
    const hp = run.hp / run.maxHp;
    this.lagHp = hp > this.lagHp ? hp : Math.max(hp, this.lagHp - dt * 0.6);
    const hpr = Math.round(hp * 200) / 200, lag = Math.round(this.lagHp * 200) / 200;
    if (hpr !== this.last.hp || lag !== this.last.lag) {
      this.fill.style.transform = `scaleX(${hpr})`;
      this.lag.style.transform = `scaleX(${lag})`;
      this.wake.classList.toggle("low", hp < 0.35);
      this.last.hp = hpr; this.last.lag = lag;
    }
    // Breath for running: a thin bar under it, only while not full.
    const st = Math.round(run.stamina * 100) / 100;
    if (st !== this.last.stam || run.winded !== this.last.winded) {
      this.stamFill.style.transform = `scaleX(${st})`;
      this.stam.classList.toggle("on", st < 1);
      this.stam.classList.toggle("winded", run.winded);
      this.last.stam = st; this.last.winded = run.winded;
    }
    this.hurt = Math.max(0, this.hurt - dt * 1.8);
    // Slowed by an alarm clock: a violet haze and a word.
    const slow = run.slowT > 0;
    if (slow !== this.last.slow) { this.slowEl.classList.toggle("on", slow); this.last.slow = slow; }
    this.vig.style.opacity = (this.hurt * 0.9 + (hp < 0.35 ? 0.25 + Math.sin(performance.now() / 180) * 0.1 : 0)).toFixed(3);
    // "+N" by the purse while dust keeps coming in.
    if (this.plusN) {
      this.plusT = 1.2; this.plusSum = (this.plusSum || 0) + this.plusN; this.plusN = 0;
      this.plusEl.textContent = `+${this.plusSum}`;
      this.plusEl.classList.remove("pop"); void this.plusEl.offsetWidth; this.plusEl.classList.add("pop", "on");
    } else if (this.plusT > 0) {
      this.plusT -= dt;
      if (this.plusT <= 0) { this.plusEl.classList.remove("on"); this.plusSum = 0; }
    }
    if (run.dust !== this.last.dust) {
      this.dustEl.textContent = run.dust;
      if (this.last.dust >= 0) { this.dustBox.classList.remove("tick"); void this.dustBox.offsetWidth; this.dustBox.classList.add("tick"); }
      this.last.dust = run.dust;
    }
    // Objective, prompt and the tuning bar.
    // The task panel: one row per objective, ticked off when done; a row
    // flashes when it moves on.
    const objs = run.objectives;
    const key2 = objs.map((o) => `${o.id}:${o.n ?? ""}:${o.done}`).join("|");
    if (key2 !== this.last.obj) {
      const prev = this.last.objs ?? {};
      this.tasksEl.innerHTML = objs.map((o) => `<li class="${o.done ? "done" : ""} ${o.optional ? "opt" : ""} ${prev[o.id] !== undefined && prev[o.id] !== `${o.n}:${o.done}` ? "flash" : ""}"><i></i><span>${t(`obj_${o.id}`)}</span>${o.of ? `<b>${o.n}/${o.of}</b>` : ""}</li>`).join("");
      this.last.objs = Object.fromEntries(objs.map((o) => [o.id, `${o.n}:${o.done}`]));
      this.last.obj = key2;
    }
    // Kit you carry: one slot each, with the key that uses it (the touch
    // screen has its own buttons); the espresso's slot drains while it works.
    const boost = Math.ceil(run.boostT * 10) / 10 / ITEM.espresso.time;
    const kitKey = ITEMS.map((it) => run.items[it.id] || 0).join(",") + `|${boost}|${this.touch}|${this.pad}`;
    if (kitKey !== this.last.kit) {
      this.kitEl.innerHTML = this.touch ? "" : ITEMS.filter((it) => run.items[it.id] > 0 || (it.id === "espresso" && boost > 0)).map((it) =>
        `<div class="slot ${it.id} ${this.kitFlash === it.id ? "used" : ""}">${it.id === "espresso" && boost > 0 ? `<s style="transform:scaleY(${boost.toFixed(3)})"></s>` : ""}${ITEM_ICONS[it.id]}<b>${run.items[it.id] || 0}</b><kbd>${this.pad ? it.pad : it.key}</kbd></div>`).join("");
      this.kitFlash = null;
      this.last.kit = kitKey;
    }
    // Under the crosshair: what the vacuum's tank holds, or how many foam
    // steps the Foam Cannon can still set before the oldest melts.
    const tool0 = run.activeTool;
    const vac = tool0.id === "vacuum" ? tool0 : null;
    const tank = vac && vac.tank.length >= vac.def.tankSize;
    const dots = vac ? [vac.tank.length, vac.def.tankSize] : tool0.id === "foam" ? [run.foam.left(tool0), tool0.def.step.max] : null;
    const dk = dots ? `${tool0.id}:${dots}` : "";
    if (dk !== this.last.tank) {
      this.tankEl.classList.toggle("on", !!dots);
      this.tankEl.classList.toggle("foam", tool0.id === "foam");
      this.tankEl.innerHTML = dots ? Array.from({ length: dots[1] }, (_, i) => `<i class="${i < dots[0] ? "f" : ""}"></i>`).join("") : "";
      this.last.tank = dk;
    }
    const key = this.touch ? "🔧" : this.pad ? "(X)" : "[E]";
    const pr = run.nearAnchor ? t("tunePrompt", { key }) : run.nearUse ? t("usePrompt", { key, label: t(run.nearUse.label) }) : tank ? t("tankFull", { key: this.touch ? "⟲" : this.pad ? "[LT]" : "[RMB]" }) : "";
    if (pr !== this.last.prompt) { this.prompt.textContent = pr; this.prompt.classList.toggle("on", !!pr); this.last.prompt = pr; }
    const tu = run.tuning;
    this.tune.classList.toggle("on", !!tu);
    if (tu) {
      this.tuneFill.style.transform = `scaleX(${tu.progress.toFixed(3)})`;
      this.tune.classList.toggle("out", !tu.inside);
    }
    // Boss bar.
    const B = run.boss;
    this.bossEl.classList.toggle("on", !!B && B.alive && B.state !== "rise" || !!B && B.state === "rise" && B.t > 1);
    if (B) {
      if (B.kind !== this.bossKind) { this.bossKind = B.kind; this.bossLbl.textContent = t(`boss_${B.kind}`); }
      const f = B.hp / B.maxHp;
      this.bossLagHp = f > this.bossLagHp ? f : Math.max(f, this.bossLagHp - dt * 0.3);
      this.bossFill.style.transform = `scaleX(${f.toFixed(3)})`;
      this.bossLag.style.transform = `scaleX(${this.bossLagHp.toFixed(3)})`;
      this.bossEl.classList.toggle("clog", B.state === "clogged" || B.state === "blotted");
    }
    const tool = run.activeTool;
    const h = Math.round(tool.heat * 100) / 100, c = Math.round(tool.charge * 100) / 100;
    if (h !== this.last.heat) {
      this.heat.setAttribute("stroke-dasharray", `${h * CIRC} ${CIRC}`);
      this.heat.style.stroke = h < 0.6 ? "#7ff5e0" : h < 0.85 ? "#ffb04a" : "#ff5a45";
      this.heat.style.opacity = h > 0.02 ? 1 : 0;
      this.last.heat = h;
    }
    if (c !== this.last.charge) {
      const C2 = 2 * Math.PI * (R + 5);
      this.charge.setAttribute("stroke-dasharray", `${c * C2} ${C2}`);
      this.charge.style.opacity = c > 0.01 ? 1 : 0;
      this.last.charge = c;
    }
    if (tool.overheated !== this.last.over) {
      this.hot.classList.toggle("on", tool.overheated);
      this.xhair.classList.toggle("over", tool.overheated);
      this.last.over = tool.overheated;
    }
  }
}
