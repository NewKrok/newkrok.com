// ── Tools ────────────────────────────────────────────────────────────────
// No ammunition anywhere: every tool heats up as it works and cools down
// by itself. Run it hot and it stops for a moment (overheated) until it
// has cooled to `unlock`.

// The order tools sit in your hands (and on the number keys).
export const TOOL_ORDER = ["stabilizer", "vacuum", "foam", "bell", "umbrella"];

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
  // Held: sprays globs of foam in an arc. A glitch soaks it up and slows
  // down, and one full of foam is stuck fast for a moment. Second action:
  // a big blob that sets where it lands: a step on the ground (or on
  // another step), a ledge on a wall.
  foam: {
    interval: 0.075, heat: 0.04, cool: 0.6, coolDelay: 0.3, unlock: 0.35,
    speed: 17, up: 2.2, gravity: 13, life: 1.4, r: 0.2, spread: 0.05,
    soak: 0.2,            // foam one glob leaves on a glitch (1 = stuck)
    hold: 2.6,            // seconds a glitch full of foam stays stuck (a blob: half as long again)
    blob: { speed: 15, up: 2.5, gravity: 16, heat: 0.36, interval: 0.55, r: 0.45 },
    // What a blob sets into: radius, height of a step, depth of a ledge,
    // how long it lasts (and blinks before it goes), how many at once.
    step: { r: 1.1, h: 1.0, ledge: 0.5, life: 15, warn: 3, max: 3 },
  },
  // Pressed: a ring, a wave of sound running out in a cone that shoves
  // glitches back and bats orbs back at whoever threw them. Held second
  // action: hum a lullaby (the longer, the wider), released to send it
  // out all round you: small glitches fall asleep, big ones get drowsy.
  bell: {
    interval: 0.42, heat: 0.2, cool: 0.6, coolDelay: 0.3, unlock: 0.35,
    range: 9, cone: 0.5, speed: 32, damage: 1, push: 8,
    // r0…r1: the lullaby's reach, short hum to full; sleep / drowsy: seconds.
    lull: { time: 0.9, min: 0.3, heat: 0.55, r0: 4, r1: 7.5, speed: 11, sleep: 6, drowsy: 4 },
  },
  // Pressed: snapped open and shut, a short gust in a cone ahead that
  // stings everything in it, hard up close and fading out by `range`
  // (no shove: it only hurts), and pops orbs. Aimed at your feet in
  // mid-air it lifts you a little, once per jump. Held second action: open over you, a shield in front and
  // above (it stops orbs, takes the edge off bonks), and in the air you
  // glide; an updraft carries an open umbrella up.
  umbrella: {
    interval: 0.45, heat: 0.22, cool: 0.6, coolDelay: 0.3, unlock: 0.35,
    range: 4.5, cone: 0.5,
    damage: 2.4, far: 0.45, // at point blank; share of it left at the edge of the range
    hop: 8,               // the gust at your feet in mid-air: take-off speed
    shield: { cone: 1.15, guard: 0.3, heat: 0.12 },   // half angle; share of a bonk you still feel
    glide: { fall: 2.4, air: 1.8 },                   // fastest fall; air control ×
    walk: 0.72,           // walking speed under an open umbrella
    lift: 46, rise: 7,    // an updraft: push up (m/s²), fastest climb
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
    this.open = false;        // umbrella: held open
  }

  // Returns the shots this step wants: [{ damage, big }] (usually 0 or 1).
  // The vacuum reports { suck } / { launch } / { blast } actions instead.
  step(intent, dt, out) {
    if (this.id === "vacuum") return this.stepVacuum(intent, dt, out);
    if (this.id === "foam") return this.stepFoam(intent, dt, out);
    if (this.id === "bell") return this.stepBell(intent, dt, out);
    if (this.id === "umbrella") return this.stepUmbrella(intent, dt, out);
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

  // The Foam Cannon reports { spray } while held and { blob } on a press.
  stepFoam(intent, dt, out) {
    const d = this.def;
    this.cd -= dt;
    this.sinceShot += dt;
    if (this.sinceShot > d.coolDelay) this.heat = Math.max(0, this.heat - d.cool * dt);
    if (this.overheated && this.heat <= d.unlock) this.overheated = false;
    if (!this.overheated) {
      if (intent.alt && !this.altHeld && this.cd <= 0) {
        out.push({ blob: true });
        this.addHeat(d.blob.heat);
        this.cd = d.blob.interval;
      } else if (intent.fire && this.cd <= 0) {
        out.push({ spray: true });
        this.addHeat(d.heat);
        this.cd = d.interval;
      }
    }
    this.altHeld = !!intent.alt;
    return out;
  }

  // The Lullaby Bell reports { ring } on a press and { lull: k } when a
  // hummed lullaby is let go.
  stepBell(intent, dt, out) {
    const d = this.def, L = d.lull;
    this.cd -= dt;
    this.sinceShot += dt;
    if (this.sinceShot > d.coolDelay) this.heat = Math.max(0, this.heat - d.cool * dt);
    if (this.overheated && this.heat <= d.unlock) this.overheated = false;
    if (this.overheated) { this.charge = 0; this.charging = false; return out; }
    if (intent.alt) {
      this.charging = true;
      this.charge = Math.min(1, this.charge + dt / L.time);
      this.sinceShot = 0;
    } else if (this.charging) {
      this.charging = false;
      if (this.charge >= L.min) {
        out.push({ lull: this.charge });
        this.addHeat(L.heat * (0.5 + 0.5 * this.charge));
        this.cd = d.interval;
      }
      this.charge = 0;
    }
    if (intent.fire && !this.charging && this.cd <= 0) {
      out.push({ ring: true });
      this.cd = d.interval;
      this.addHeat(d.heat);
    }
    return out;
  }

  // The umbrella reports { gust } while the button is held (one every
  // `interval`); held open (`open`) it costs nothing by itself. Run hot,
  // it still opens (a glide must not fail you), it only stops gusting and
  // blocking until it has cooled.
  stepUmbrella(intent, dt, out) {
    const d = this.def;
    this.cd -= dt;
    this.sinceShot += dt;
    if (this.sinceShot > d.coolDelay) this.heat = Math.max(0, this.heat - d.cool * dt);
    if (this.overheated && this.heat <= d.unlock) this.overheated = false;
    this.open = !!intent.alt;
    if (!this.overheated && intent.fire && this.cd <= 0) {
      out.push({ gust: true });
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
