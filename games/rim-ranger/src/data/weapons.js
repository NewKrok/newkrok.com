// ── Weapons ──────────────────────────────────────────────────────────────
// Ordinary ranger issue. You carry two at a time: walk up to a weapon
// rack or a dropped gun and swap one for it. Ammo is per weapon type and
// stays with the gun.
//
// dmg: per bullet (per second for the laser); rate: seconds between
// shots; mag / reserve: rounds; spread: radians at the hip (aiming
// shrinks it); noise: how far the shot carries (metres); kick: camera
// recoil; range: hitscan reach.

export const WEAPONS = {
  pistol: {
    kind: "hitscan", auto: false, dmg: 24, rate: 0.24, mag: 12, reserve: Infinity, reload: 1.1,
    spread: 0.022, aimSpread: 0.006, noise: 16, kick: 0.018, range: 90, pellets: 1, color: 0xffd27a,
  },
  rifle: {
    kind: "hitscan", auto: true, dmg: 12, rate: 0.085, mag: 36, reserve: 216, reload: 1.7,
    spread: 0.04, aimSpread: 0.012, noise: 30, kick: 0.012, range: 110, pellets: 1, color: 0xffe08a,
  },
  launcher: {
    kind: "grenade", auto: false, dmg: 120, rate: 0.75, mag: 4, reserve: 12, reload: 2.2,
    spread: 0.01, aimSpread: 0.004, noise: 26, blastNoise: 42, kick: 0.05, speed: 30, splash: 4.6, color: 0xff9a4a,
  },
  laser: {
    // A focused beam: barely a whisper, so it is the quiet option. No
    // magazine: it heats up and has to cool down.
    kind: "beam", auto: true, dmg: 70, rate: 0, mag: 0, reserve: 0, reload: 0,
    spread: 0, aimSpread: 0, noise: 4, kick: 0.002, range: 60, heatUp: 0.32, coolDown: 0.45, color: 0x7ef9ff,
  },
};

export const WEAPON_ORDER = ["pistol", "rifle", "launcher", "laser"];
