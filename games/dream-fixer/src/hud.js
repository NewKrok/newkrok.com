import { t } from "./i18n/index.js";

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
      <div class="hot" data-i18n="overheated"></div>`;
    root.appendChild(el);
    this.heat = el.querySelector(".heat");
    this.charge = el.querySelector(".charge");
    this.hot = el.querySelector(".hot");
    this.xhair = el.querySelector(".xhair");
    this.hot.textContent = t("overheated");
    this.last = { heat: -1, charge: -1, over: null };
  }

  show(on) { this.el.classList.toggle("hidden", !on); }

  update(run) {
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
