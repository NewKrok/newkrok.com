import { t } from "./i18n/index.js";
import { WEAPONS } from "./data/weapons.js";
import { padLabel } from "./input/gamepad.js";
import { PLAYER } from "./config.js";

// ── The HUD ──────────────────────────────────────────────────────────────
// Plain DOM over the canvas: crosshair and hit marker, shield and health,
// the defenders, the two weapons, the siege panel (wave clock, reactor,
// crystals), markers on screen, subtitles, the use prompt, a "?" over a
// bug that heard something, hints, the boss bar, the downed overlay.

const KEYS = {
  move: ["WASD", "LS"], look: ["Mouse", "RS"], jump: ["Space", "A"], sprint: ["Shift", "L3"], crouch: ["C", "LB"], cover: ["Q", "RB"],
  aim: ["RMB", "LT"], fire: ["LMB", "RT"], reload: ["R", "X"], swap: ["1/2", "Y"], dash: ["V", "B"], use: ["E", "X"], shoulder: ["X", "R3"], skip: ["Enter", "Back"],
};

const el = (cls, parent, tag = "div") => { const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e; };

export class Hud {
  constructor(root) {
    this.root = el("hud", root);
    const R = this.root;
    this.cross = el("cross", R);
    for (const s of ["t", "b", "l", "r"]) el(`ch ch-${s}`, this.cross);
    el("dot", this.cross);
    this.hitmark = el("hitmark", R);
    this.vignette = el("vignette", R);
    this.dmg = el("dmgdirs", R);
    this.objs = el("objs", R);
    this.markers = el("markers", R);
    this.tags = el("tags", R);
    this.vitals = el("vitals", R);
    this.vitals.innerHTML = `<div class="bar shield"><i></i></div><div class="bar hp"><i></i></div><div class="allies"></div>`;
    this.weapons = el("weapons", R);
    this.sub = el("subtitle", R);
    this.prompt = el("prompt", R);
    this.hint = el("hint", R);
    this.toast = el("toast", R);
    this.boss = el("bossbar", R);
    this.boss.innerHTML = `<span></span><div class="bar"><i></i></div>`;
    this.downed = el("downed", R);
    this.letter = el("letterbox", R);
    this.letter.innerHTML = `<div class="lb top"></div><div class="lb bot"></div><div class="skip"></div>`;
    this.alert = el("alert", R);
    this.hintT = 0; this.toastT = 0; this.hitT = 0; this.alertT = 0;
    this.dirs = [];
    this.pad = false;
  }

  key(name) { const k = KEYS[name]; if (!k) return name; return `<kbd>${this.pad ? padLabel(k[1]) : k[0]}</kbd>`; }
  keyText(s) { return s.replace(/\{(\w+)\}/g, (_, n) => this.key(n)); }

  showHint(key) {
    const raw = t(key);
    this.hint.innerHTML = this.keyText(raw);
    this.hint.classList.add("on");
    this.hintT = 7;
  }
  showToast(text) { this.toast.textContent = text; this.toast.classList.add("on"); this.toastT = 2.6; }
  hitMarker(kill) { this.hitmark.classList.toggle("kill", !!kill); this.hitmark.classList.add("on"); this.hitT = 0.15; }
  spotted() { this.alert.textContent = t("spotted"); this.alert.classList.add("on"); this.alertT = 2.2; }
  hurtFrom(angle) { this.dirs.push({ a: angle, t: 1 }); }

  // Every frame.
  update(run, view, dt, speech, settings) {
    const p = run.player, R = this.root;
    const cut = !!run.cut;
    R.classList.toggle("cut", cut);
    this.letter.classList.toggle("on", cut);
    this.letter.querySelector(".skip").innerHTML = cut ? this.keyText(t("skip", { key: "{skip}" })) : "";

    // Subtitles.
    if (speech && settings.subtitles !== false) {
      this.sub.innerHTML = `<b class="sp-${speech.speaker}">${speech.name}</b> ${speech.text}`;
      this.sub.classList.add("on");
    } else this.sub.classList.remove("on");
    if (cut) { this.prompt.classList.remove("on"); return; }

    // Crosshair: opens with spread, red over a bug.
    const w = p.def, g = p.weapon;
    const spread = w ? (w.spread + (w.aimSpread - w.spread) * p.aimK) : 0.02;
    const gap = 6 + spread * 420 + p.recoil * 300;
    this.cross.style.setProperty("--gap", `${gap}px`);
    this.cross.classList.toggle("aim", p.aimK > 0.5);
    this.cross.classList.toggle("hide", p.downed || p.sprinting);
    this.cross.classList.toggle("over", !!this.overBug);
    this.hitT -= dt; if (this.hitT <= 0) this.hitmark.classList.remove("on");

    // Vitals.
    this.vitals.querySelector(".shield i").style.width = `${(p.shield / p.maxShield) * 100}%`;
    this.vitals.querySelector(".hp i").style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.vitals.querySelector(".hp").classList.toggle("low", p.hp < 35);
    const ah = run.allies.map((A) => `<div class="ally${A.downed ? " down" : ""}"><span>${t(`speaker_${A.name}`)}${A.downed ? " ✕" : ""}</span><div class="bar mini"><i style="width:${((A.hp / A.maxHp) * 100).toFixed(0)}%"></i></div></div>`).join("");
    if (ah !== this.aHtml) { this.vitals.querySelector(".allies").innerHTML = ah; this.aHtml = ah; }

    // Weapons.
    const slots = p.slots.map((s, i) => {
      const W = WEAPONS[s.id], cur = i === p.cur;
      let ammo;
      if (W.kind === "beam") ammo = `<div class="heat${s.hot ? " hot" : ""}"><i style="width:${s.heat * 100}%"></i></div>${s.hot ? `<em>${t("overheated")}</em>` : ""}`;
      else ammo = `<span class="mag${s.mag === 0 ? " empty" : ""}">${s.mag}</span><span class="res">/ ${s.reserve === Infinity ? "∞" : s.reserve}</span>`;
      return `<div class="slot${cur ? " cur" : ""}"><div class="wname">${t(`w_${s.id}`)}</div>${cur ? `<div class="ammo">${ammo}</div>` : ""}</div>`;
    }).join("");
    const reload = p.reloadT ? `<div class="reloading">${t("reloading")}</div>` : "";
    const html = slots + reload + `<div class="swaphint">${this.key("swap")}</div>`;
    if (html !== this.wHtml) { this.weapons.innerHTML = html; this.wHtml = html; }

    // The siege panel: the wave clock, the reactor, the crystals.
    const S = run.siege, C = run.core;
    if (S && C) {
      const sec = Math.max(0, Math.ceil(S.next)), warn = S.next <= 45;
      const boss = run.boss?.alive;
      const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      const title = warn ? t("siege_incoming", { n: S.wave + 1 }) : `${t("siege_next")} · ${t("siege_wave", { n: S.wave + 1 })}${S.endless ? ` · ${t("siege_endless")}` : ""}`;
      const sh = `<div class="clock${warn ? " warn" : ""}"><span>${title}</span><b>${clock}</b></div>` +
        `<div class="react${C.hitT > 0 ? " hit" : ""}${C.hp < C.maxHp * 0.3 ? " low" : ""}"><span>${t("reactor")}</span><div class="bar"><i style="width:${((C.hp / C.maxHp) * 100).toFixed(0)}%"></i></div></div>` +
        `<div class="cry"><span>${t("crystals")}</span><b>${run.crystals}</b> <em>${t("carried")}</em> · <b>${run.bank}</b> <em>${t("banked")}</em></div>` +
        (boss ? `<div class="bossnote">${t("siege_boss")}</div>` : "");
      if (sh !== this.oHtml) { this.objs.innerHTML = sh; this.oHtml = sh; }
    }

    // Markers on screen (or pinned to the edge, with the distance).
    let mh = "";
    const W = view.W, H = view.H;
    for (const o of run.objectives) {
      if (o.done) continue;
      const ms = o.markers ?? (o.marker ? [o.marker] : []);
      for (const m of ms) {
        const d = Math.hypot(m.x - p.body.x, m.z - p.body.z);
        if (o.minDist && d < o.minDist) continue;
        let s = view.project(m.x, (m.y ?? 0) + 2.2, m.z);
        let edge = false;
        if (!s || s.x < 30 || s.x > W - 30 || s.y < 30 || s.y > H - 30) {
          // Behind or off screen: along the edge in its direction.
          const cam = view.camera, dx = m.x - cam.position.x, dz = m.z - cam.position.z;
          const yaw = cam.rotation.y, rx = Math.cos(yaw) * dx - Math.sin(yaw) * dz, fz = -Math.sin(yaw) * dx - Math.cos(yaw) * dz;
          const a = Math.atan2(rx, fz);
          s = { x: W / 2 + Math.sin(a) * (W / 2 - 40), y: H / 2 - Math.cos(a) * (H / 2 - 40) };
          s.x = Math.max(30, Math.min(W - 30, s.x)); s.y = Math.max(40, Math.min(H - 40, s.y));
          edge = true;
        }
        mh += `<div class="marker${edge ? " edge" : ""}${o.boss ? " boss" : ""}" style="transform:translate(${s.x.toFixed(0)}px,${s.y.toFixed(0)}px)"><i></i><span>${Math.round(d)} m</span></div>`;
      }
    }
    if (mh !== this.mHtml) { this.markers.innerHTML = mh; this.mHtml = mh; }

    // "?" over a bug that heard something, "!" over one that just found you; crystal markers near you.
    let th = "";
    for (const b of run.bugs) {
      if (!b.alive || b.hidden) continue;
      const d = Math.hypot(b.x - p.body.x, b.z - p.body.z);
      if (d > 45) continue;
      let icon = null;
      if (b.state === "search") icon = `<div class="q">?</div>`;
      else if (b.state === "hunt" && b.actT < 1.2 && b.act === "alert") icon = `<div class="q hunt">!</div>`;
      if (!icon) continue;
      const s = view.project(b.x, b.y + b.def.height + 0.7, b.z);
      if (!s) continue;
      th += `<div class="tag" style="transform:translate(${s.x.toFixed(0)}px,${s.y.toFixed(0)}px)">${icon}</div>`;
    }
    if (th !== this.tHtml) { this.tags.innerHTML = th; this.tHtml = th; }

    // Use prompt.
    const u = p.interact;
    if (u && !p.downed) {
      const [key, vars] = u.label(run);
      const v = vars ? Object.fromEntries(Object.entries(vars).map(([k2, x]) => [k2, t(x)])) : undefined;
      const txt = t(key, v);
      const k = u.hold ? this.keyText(t("hold", { key: "{use}" })) : this.key("use");
      const ph = `${k} ${txt}${u.hold ? `<div class="hold"><i style="width:${(p.useK * 100).toFixed(0)}%"></i></div>` : ""}`;
      if (ph !== this.pHtml) { this.prompt.innerHTML = ph; this.pHtml = ph; }
      this.prompt.classList.add("on");
    } else this.prompt.classList.remove("on");

    // Hints, toasts, alerts.
    this.hintT -= dt; if (this.hintT <= 0) this.hint.classList.remove("on");
    this.toastT -= dt; if (this.toastT <= 0) this.toast.classList.remove("on");
    this.alertT -= dt; if (this.alertT <= 0) this.alert.classList.remove("on");

    // Hurt: a red edge, and arcs toward where it came from.
    const hurtK = Math.max(0, 1 - p.hp / PLAYER.hp) * (p.shield <= 0 ? 1 : 0.3);
    this.vignette.style.opacity = (Math.min(0.8, hurtK * 0.9 + (p.calmT < 0.3 ? 0.35 : 0))).toFixed(2);
    this.dirs = this.dirs.filter((d) => (d.t -= dt * 1.2) > 0);
    const yaw = view.camera.rotation.y;
    const dh = this.dirs.map((d) => `<i style="transform:rotate(${(-(d.a - yaw) + Math.PI) * 57.3}deg);opacity:${d.t.toFixed(2)}"></i>`).join("");
    this.dmg.innerHTML = dh;

    // The boss.
    const B = run.boss;
    const bossOn = B && B.alive && !B.hidden;
    this.boss.classList.toggle("on", !!bossOn);
    if (bossOn) { this.boss.querySelector("span").textContent = t("boss_warden"); this.boss.querySelector("i").style.width = `${(B.hp / B.maxHp) * 100}%`; }

    // Down.
    this.downed.classList.toggle("on", p.downed);
    if (p.downed) {
      const coming = run.allies.some((a) => a.mode === "revive");
      this.downed.innerHTML = `<div>${coming ? t("downed") : t("downedAlone", { s: Math.max(0, Math.ceil(p.downT)) })}</div><div class="bleed"><i style="width:${(p.downT / PLAYER.bleedOut) * 100}%"></i></div>${p.reviveK > 0 ? `<div class="revive"><i style="width:${p.reviveK * 100}%"></i></div>` : ""}`;
    }
  }
}
