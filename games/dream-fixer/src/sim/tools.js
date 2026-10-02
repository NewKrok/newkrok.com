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
    damage: 0.5,
    range: 90,
    spread: 0.02,         // radians; grows as the tool runs hot (upgrades may tighten it)
    // Held second action: charge a bigger bolt, released to fire.
    charge: { time: 0.75, heat: 0.32, damage: 2.5, min: 0.3 },
  },
  // Held: suck in dust, orbs and small glitches (a caught one sits in the
  // tank). Second action: shoot what is in the tank, or, when it is
  // empty, a puff of air that shoves glitches back.
  vacuum: {
    suckHeat: 0.45,       // per second while sucking
    cool: 0.55, coolDelay: 0.3, unlock: 0.35,
    range: 8, cone: 0.42, // radians, half angle
    pull: 14,             // m/s² towards the nozzle
    catchAt: 1.6,
    stream: 1.2,          // damage per second to everything in the stream
    worn: 0.5,            // a glitch is caught only once worn down to this share of its hp
    tankSize: 3,          // small glitches it can hold
    launch: { speed: 24, damage: 5.5, splash: 2.6, heat: 0.12 },
    blast: { range: 5.5, cone: 0.7, push: 9, damage: 1, heat: 0.28, interval: 0.5 },
  },
};

export class ToolState {
  constructor(id, def = TOOLS[id]) {
    this.id = id;
    this.def = def;
    this.heat = 0;
    this.cd = 0;
    this.sinceShot = 9;
    this.overheated = false;
    this.charge = 0;          // 0…1 while the second action is held
    this.charging = false;
    this.tank = [];           // vacuum: what it has caught (kinds)
    this.sucking = false;
    this.altHeld = false;
  }

  // Returns the shots this step wants: [{ damage, big }] (usually 0 or 1).
  // The vacuum reports { suck } / { launch } / { blast } actions instead.
  step(intent, dt, out) {
    if (this.id === "vacuum") return this.stepVacuum(intent, dt, out);
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

  stepVacuum(intent, dt, out) {
    const d = this.def;
    this.cd -= dt;
    this.sinceShot += dt;
    this.sucking = false;
    if (this.sinceShot > d.coolDelay) this.heat = Math.max(0, this.heat - d.cool * dt);
    if (this.overheated && this.heat <= d.unlock) this.overheated = false;
    if (this.overheated) return out;
    if (intent.alt && !this.altHeld && this.cd <= 0) {
      const has = this.tank.length > 0;
      out.push(has ? { launch: this.tank.shift() } : { blast: true });
      this.addHeat(has ? d.launch.heat : d.blast.heat);
      this.cd = has ? 0.3 : d.blast.interval;
    } else if (intent.fire) {
      this.sucking = true;
      this.addHeat(d.suckHeat * dt);
      out.push({ suck: true });
    }
    this.altHeld = !!intent.alt;
    return out;
  }

  addHeat(h) {
    this.heat += h;
    this.sinceShot = 0;
    if (this.heat >= 1) { this.heat = 1; this.overheated = true; }
  }
}
