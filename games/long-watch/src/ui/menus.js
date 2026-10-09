import { t, LANGS, getLang } from "../i18n/index.js";

// ── Menus ────────────────────────────────────────────────────────────────
// Title, pause, settings, the end screens and the data pad reader. Each is
// a ".screen" in ".menus"; buttons carry data-a (the action) so PadNav can
// press the right ones (back / resume) from the pad.

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export class Menus {
  constructor(root, settings, actions) {
    this.el = document.createElement("div");
    this.el.className = "menus";
    root.appendChild(this.el);
    this.settings = settings;
    this.A = actions;           // { start, cont, resume, restartCp, restart, quit, settingsChanged, click }
    this.stack = [];
    this.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      this.A.click?.();
      this.#act(b.dataset.a, b);
    });
    this.el.addEventListener("input", (e) => this.#setting(e.target));
    this.el.addEventListener("change", (e) => this.#setting(e.target));
  }

  get open() { return this.stack.length > 0; }
  get top() { return this.stack[this.stack.length - 1]; }

  show(name, data) { this.stack = [{ name, data }]; this.render(); }
  push(name, data) { this.stack.push({ name, data }); this.render(); }
  pop() { this.stack.pop(); this.render(); }
  close() { this.stack = []; this.render(); }

  render() {
    const s = this.top;
    this.el.classList.toggle("on", !!s);
    if (!s) { this.el.innerHTML = ""; return; }
    this.el.innerHTML = `<div class="screen ${s.name}">${this.#html(s.name, s.data)}</div>`;
  }

  #html(name, d) {
    switch (name) {
      case "title": return `
        <div class="titleart"><h1>${t("title")}</h1><h2>${t("subtitle")}</h2></div>
        <div class="col">
          ${d?.canContinue ? `<button class="btn big" data-a="cont">${t("continue")}</button>` : ""}
          <button class="btn ${d?.canContinue ? "" : "big"}" data-a="start">${t("newGame")}</button>
          <div class="seg">${["easy", "normal", "hard"].map((k) => `<button class="${this.settings.difficulty === k ? "on" : ""}" data-a="diff" data-v="${k}">${t(`diff_${k}`)}</button>`).join("")}</div>
          <button class="btn ghost" data-a="settings">${t("settings")}</button>
          <button class="btn ghost" data-a="credits">${t("credits")}</button>
        </div>
        <div class="controls"><b>${t("controlsTitle")}</b><p>${t("controlsKb")}</p><p>${t("controlsPad")}</p></div>`;
      case "pause": return `
        <h2>${t("paused")}</h2>
        <div class="col">
          <button class="btn big" data-a="resume">${t("resume")}</button>
          <button class="btn" data-a="restartCp">${t("restartCp")}</button>
          <button class="btn" data-a="settings">${t("settings")}</button>
          <button class="btn ghost" data-a="quit">${t("quit")}</button>
        </div>
        <div class="controls"><p>${t("controlsKb")}</p><p>${t("controlsPad")}</p></div>`;
      case "settings": {
        const S = this.settings;
        const range = (k, min, max, step) => `<label><span>${t(k)}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${S[k]}"></label>`;
        const tog = (k) => `<label><span>${t(k)}</span><select data-k="${k}"><option value="1" ${S[k] ? "selected" : ""}>${t("on")}</option><option value="0" ${!S[k] ? "selected" : ""}>${t("off")}</option></select></label>`;
        return `
        <h2>${t("settings")}</h2>
        <div class="setlist scroll">
          <label><span>${t("language")}</span><select data-k="lang">${LANGS.map(([k, n]) => `<option value="${k}" ${getLang() === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          ${range("master", 0, 1, 0.05)}${range("sfx", 0, 1, 0.05)}${range("music", 0, 1, 0.05)}${tog("voice")}${tog("subtitles")}
          ${range("sensitivity", 0.3, 2.5, 0.05)}${range("padSensitivity", 0.3, 2.5, 0.05)}${tog("invertY")}${tog("aimAssist")}${tog("shake")}
          <label><span>${t("quality")}</span><select data-k="quality"><option value="high" ${S.quality === "high" ? "selected" : ""}>${t("q_high")}</option><option value="low" ${S.quality === "low" ? "selected" : ""}>${t("q_low")}</option></select></label>
          <div class="padinfo">${t("padReadout")}: <span class="padread">${this.A.padInfo?.() ?? t("noPad")}</span></div>
        </div>
        <div class="row"><button class="btn big" data-a="back">${t("back")}</button></div>`;
      }
      case "credits": return `
        <h2>${t("credits")}</h2>
        <div class="panel"><p>${t("credit")}</p><p>${t("creditVoices")}</p><p><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a></p></div>
        <div class="row"><button class="btn big" data-a="back">${t("back")}</button></div>`;
      case "end": {
        const won = d.won, s = d.stats;
        return `
        <h2>${won ? t("won") : t("failed")}</h2>
        <p class="sub">${won ? t("wonSub") : t("failedSub")}</p>
        ${won ? `<div class="stats">
          <div><span>${t("stats_time")}</span><b>${fmtTime(s.time)}</b></div>
          <div><span>${t("stats_kills")}</span><b>${s.kills}</b></div>
          <div><span>${t("stats_spotted")}</span><b>${s.spotted}</b></div>
          <div><span>${t("stats_logs")}</span><b>${s.logs} / 5</b></div>
          <div><span>${t("stats_downs")}</span><b>${s.downs}</b></div>
        </div>` : ""}
        <div class="col">
          ${won ? `<button class="btn big" data-a="quit">${t("quit")}</button><button class="btn" data-a="restart">${t("restartMission")}</button>`
            : `<button class="btn big" data-a="restartCp">${t("retry")}</button><button class="btn ghost" data-a="quit">${t("quit")}</button>`}
        </div>`;
      }
      case "log": return `
        <div class="logpanel"><h3>${t("log_title")} ${d.n}/5</h3><p>${t(d.id)}</p></div>
        <div class="row"><button class="btn big" data-a="resume">${t("close")}</button></div>`;
    }
    return "";
  }

  #act(a, b) {
    switch (a) {
      case "start": this.A.start(); break;
      case "cont": this.A.cont(); break;
      case "resume": this.A.resume(); break;
      case "restartCp": this.A.restartCp(); break;
      case "restart": this.A.restart(); break;
      case "quit": this.A.quit(); break;
      case "settings": this.push("settings"); break;
      case "credits": this.push("credits"); break;
      case "back": this.pop(); break;
      case "diff": this.settings.difficulty = b.dataset.v; this.A.settingsChanged(); this.render(); break;
    }
  }

  #setting(e) {
    const k = e.dataset?.k;
    if (!k) return;
    let v = e.value;
    if (e.type === "range") v = Number(v);
    else if (e.tagName === "SELECT" && (v === "1" || v === "0")) v = v === "1";
    this.settings[k] = v;
    this.A.settingsChanged(k);
    if (k === "lang") this.render();
  }

  // The pad readout in settings, live.
  tick() {
    const r = this.el.querySelector(".padread");
    if (r) { const s = this.A.padInfo?.() ?? t("noPad"); if (r.textContent !== s) r.textContent = s; }
  }
}
