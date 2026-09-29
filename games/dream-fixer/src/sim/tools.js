// ── Tools ────────────────────────────────────────────────────────────────
// No ammunition anywhere: every tool heats up as it works and cools down
// by itself. Run it hot and it stops for a moment (overheated) until it
// has cooled to `unlock`.

export const TOOLS = {
  stabilizer: {
    interval: 0.14,       // seconds between shots while held
    heat: 0.075,          // per shot
    cool: 0.6,            // per second, after coolDelay without shooting
    coolDelay: 0.28,
    unlock: 0.35,
    damage: 1,
    range: 90,
    spread: 0.004,        // radians, a hint so it doesn't feel robotic
    // Held second action: charge a bigger bolt, released to fire.
    charge: { time: 0.75, heat: 0.32, damage: 5, min: 0.3 },
  },
};

export class ToolState {
  constructor(id) {
    this.id = id;
    this.def = TOOLS[id];
    this.heat = 0;
    this.cd = 0;
    this.sinceShot = 9;
    this.overheated = false;
    this.charge = 0;          // 0…1 while the second action is held
    this.charging = false;
  }

  // Returns the shots this step wants: [{ damage, big }] (usually 0 or 1).
  step(intent, dt, out) {
    const d = this.def;
    this.cd -= dt;
    this.sinceShot += dt;
    if (this.sinceShot > d.coolDelay) this.heat = Math.max(0, this.heat - d.cool * dt);
    if (this.overheated && this.heat <= d.unlock) this.overheated = false;

    if (this.overheated) { this.charge = 0; this.charging = false; return out; }

    // Charged bolt: builds while held, goes on release.
    if (intent.alt) {
      this.charging = true;
      this.charge = Math.min(1, this.charge + dt / d.charge.time);
      this.sinceShot = 0;            // no cooling while charging
    } else if (this.charging) {
      this.charging = false;
      if (this.charge >= d.charge.min) {
        const k = this.charge;
        out.push({ damage: d.damage + (d.charge.damage - d.damage) * k, big: k });
        this.addHeat(d.charge.heat * k);
      }
      this.charge = 0;
    }
    if (intent.fire && !this.charging && this.cd <= 0) {
      out.push({ damage: d.damage, big: 0 });
      this.cd = d.interval;
      this.addHeat(d.heat);
    }
    return out;
  }

  addHeat(h) {
    this.heat += h;
    this.sinceShot = 0;
    if (this.heat >= 1) { this.heat = 1; this.overheated = true; }
  }
}
