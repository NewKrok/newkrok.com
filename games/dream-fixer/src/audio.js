// ── Sound ────────────────────────────────────────────────────────────────
// Everything is synthesised with WebAudio, no sample files. One-shots are
// rate-limited per name and placed in the stereo field (with a soft
// distance fall-off) when they come from somewhere in the dream. A few
// sounds are held loops (the charge hum, the vacuum, the boss's suction,
// an anchor being tuned). Voices are little "beep-talk" syllables, a
// different pitch per character, so every language sounds the same.
// The music is a generative loop per place: a music-box dream, a busier
// fight groove, and the nightmare's own theme.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

const GAP = { yoyoThrow: 0.05, yoyoCatch: 0.05, yoyoHit: 0.05, yoyoClack: 0.06, yoyoHook: 0.1, yoyoLetGo: 0.1, foeTied: 0.06, foeFree: 0.08, foeYank: 0.06, foeDizzy: 0.1, gnomeStone: 0.1, gnomeGo: 0.12, rainPat: 0.08, soaked: 0.3, canSquirt: 0.08, sunSeed: 0.06, mowerRev: 0.2, tileWarn: 0.2, tileDrop: 0.15, tileBack: 0.15, bigclockClink: 0.1, gust: 0.08, umbrellaBlock: 0.05, umbrellaOpen: 0.12, umbrellaShut: 0.12, pinwheel: 0.3, sneeze: 0.3, meatRoll: 0.15, pepperShake: 0.3, pepperBurst: 0.1, pinRoll: 0.2, steamBurn: 0.3, cookerRattle: 0.08, bellRing: 0.08, bellBat: 0.05, boing: 0.12, foeSleep: 0.08, foeWake: 0.1, foeDrowsy: 0.1, clockWind: 0.2, clockRing: 0.3, dizzy: 0.3, inkBurn: 0.2, foamSpray: 0.06, foamSplat: 0.05, zap: 0.04, hit: 0.04, pop: 0.05, dust: 0.025, bonk: 0.1, windup: 0.12, spit: 0.1, orbPop: 0.06, hurt: 0.12, step: 0.2, land: 0.15, jump: 0.1, blast: 0.2, beep: 0.05, bossHit: 0.07, wade: 0.12, nut: 0.08, nutHit: 0.05, chitter: 0.15, notice: 0.12 };

const SONGS = {
  menu: { root: 60, bpm: 76, scale: [0, 2, 4, 7, 9], prog: [0, -3, 5, -5], lead: "box", drums: 0 },
  factory: { root: 58, bpm: 84, scale: [0, 2, 4, 5, 7, 9], prog: [0, 5, -3, -5], lead: "box", drums: 0.3 },
  park: { root: 62, bpm: 100, scale: [0, 2, 4, 7, 9], prog: [0, 5, -3, -5], lead: "box", drums: 0.5 },
  school: { root: 65, bpm: 112, scale: [0, 2, 4, 5, 7, 9], prog: [0, 4, 5, 3], lead: "box", drums: 0.6 },
  kitchen: { root: 60, bpm: 118, scale: [0, 2, 4, 5, 7, 9, 10], prog: [0, 5, 3, 4], lead: "box", drums: 0.65 },
  garden: { root: 62, bpm: 96, scale: [0, 2, 4, 7, 9, 11], prog: [0, 5, -3, 4], lead: "box", drums: 0.45 },
  boss: { root: 57, bpm: 122, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, -4, -2, -5], lead: "square", drums: 1 },
  win: { root: 64, bpm: 90, scale: [0, 2, 4, 7, 9], prog: [0, 5, 7, 0], lead: "box", drums: 0 },
};

// Voices: base note and how chirpy.
const VOICES = { margo: { note: 64, wave: "triangle", spread: 5 }, csavar: { note: 84, wave: "square", spread: 7 }, dreamer: { note: 70, wave: "sine", spread: 4 } };

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, sfx: 0.85, music: 0.5 };
    this.last = {};
    this.song = null;
    this.songWanted = "menu";
    this.intensity = 0;
    this.loops = {};
    this.lx = 0; this.lz = 0; this.lyaw = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp).connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.verb = c.createConvolver();
      this.verb.buffer = this.#impulse(2.2);
      const vg = c.createGain(); vg.gain.value = 0.3;
      this.verb.connect(vg).connect(this.master);
      this.noiseBuf = this.#makeNoise(2);
      this.setVolumes(this.vol);
      if (this.songWanted) this.#startSong(this.songWanted);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setVolumes(v) {
    this.vol = { ...this.vol, ...v };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.03);
    this.sfx.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.45, t, 0.05);
  }
  // Music softer while someone speaks.
  duck(on) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.45 * (on ? 0.4 : 1), this.ctx.currentTime, on ? 0.08 : 0.4);
  }
  suspend(yes) { if (this.ctx) { if (yes) this.ctx.suspend(); else this.ctx.resume(); } }

  // Where you are and which way you face (for panning).
  listener(x, z, yaw) { this.lx = x; this.lz = z; this.lyaw = yaw; }

  #makeNoise(sec) {
    const c = this.ctx, buf = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  #impulse(sec) {
    const c = this.ctx, n = c.sampleRate * sec, buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    return buf;
  }
  #noise(dest, t0, dur, { type = "bandpass", freq = 1000, q = 1, gain = 0.5, attack = 0.002, freqEnd = null, verb = 0 } = {}) {
    const c = this.ctx, src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(dest);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v).connect(this.verb); }
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }
  #tone(dest, t0, dur, { type = "sine", freq = 440, freqEnd = null, gain = 0.3, attack = 0.005, verb = 0, detune = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v).connect(this.verb); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // A music-box note: a sine with a quiet octave partial and a fast decay.
  #bell(dest, t0, freq, gain = 0.06, dur = 0.9, verb = 0.4) {
    this.#tone(dest, t0, dur, { freq, gain, attack: 0.003, verb });
    this.#tone(dest, t0, dur * 0.5, { freq: freq * 2.01, gain: gain * 0.35, attack: 0.002, verb });
    this.#tone(dest, t0, dur * 0.25, { freq: freq * 3.98, gain: gain * 0.12, attack: 0.001 });
  }

  // A one-shot. k: variant / strength; x, z: where it happened (optional).
  play(name, k = 0, x, z) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gap = GAP[name] ?? 0.02;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    let d = this.sfx;
    if (x !== undefined) {
      // Pan by the angle to the source, soften with distance.
      const dx = x - this.lx, dz = z - this.lz, dist = Math.hypot(dx, dz);
      const sn = Math.sin(this.lyaw), cs = Math.cos(this.lyaw);
      const side = (dx * cs - dz * sn) / Math.max(dist, 0.01);
      const g = this.ctx.createGain(); g.gain.value = 1 / (1 + dist / 9);
      const p = this.ctx.createStereoPanner(); p.pan.value = clamp(side, -1, 1) * Math.min(1, dist / 3) * 0.8;
      g.connect(p).connect(this.sfx);
      d = g;
      setTimeout(() => { try { g.disconnect(); p.disconnect(); } catch { /* gone */ } }, 3000);
    }
    const t = now + 0.005, N = (...a) => this.#noise(d, t, ...a), S = (...a) => this.#tone(d, t, ...a);
    const at = (dt, fn) => fn(t + dt);
    switch (name) {
      // UI.
      case "click": S(0.08, { type: "triangle", freq: 700, freqEnd: 1100, gain: 0.1 }); break;
      case "back": S(0.09, { type: "triangle", freq: 900, freqEnd: 560, gain: 0.09 }); break;
      case "buy": [72, 76, 79, 84].forEach((n, i) => at(i * 0.06, (tt) => this.#bell(d, tt, hz(n), 0.08))); break;
      case "locked": S(0.14, { type: "square", freq: 160, gain: 0.05 }); break;
      // The Stabilizer.
      case "zap": S(0.09, { type: "square", freq: 1500 + Math.random() * 120, freqEnd: 520, gain: 0.035 }); S(0.07, { type: "sine", freq: 2400, freqEnd: 900, gain: 0.04 }); N(0.05, { type: "highpass", freq: 5000, gain: 0.03 }); break;
      case "bigZap": S(0.35, { type: "sawtooth", freq: 900, freqEnd: 180, gain: 0.07, verb: 0.3 }); S(0.4, { freq: 1800, freqEnd: 400, gain: 0.08, verb: 0.3 }); N(0.3, { type: "lowpass", freq: 4000, freqEnd: 500, gain: 0.12 }); break;
      case "overheat": N(0.9, { type: "highpass", freq: 3000, freqEnd: 7000, gain: 0.1, attack: 0.02 }); S(0.3, { type: "square", freq: 300, freqEnd: 180, gain: 0.03 }); break;
      case "cooled": S(0.12, { type: "triangle", freq: 1320, gain: 0.05 }); break;
      // Hits and pops.
      case "hit": S(0.06, { type: "triangle", freq: 700 + Math.random() * 200, freqEnd: 400, gain: 0.05 }); break;
      case "pop": S(0.12, { type: "sine", freq: 500 + Math.random() * 100, freqEnd: 1400, gain: 0.12 }); N(0.06, { freq: 3000, q: 2, gain: 0.05 }); at(0.05, (tt) => this.#bell(d, tt, hz(84 + Math.floor(Math.random() * 3) * 2), 0.05, 0.5, 0.2)); break;
      case "bigPop": S(0.3, { freq: 200, freqEnd: 900, gain: 0.16 }); N(0.3, { type: "lowpass", freq: 3000, freqEnd: 400, gain: 0.15 }); [79, 83, 86].forEach((n, i) => at(0.05 + i * 0.05, (tt) => this.#bell(d, tt, hz(n), 0.06))); break;
      case "dust": this.#bell(d, t, hz(88 + Math.min(k, 12)), 0.035, 0.35, 0.15); break;
      // Glitches.
      case "windup": S(0.4, { type: "triangle", freq: 300, freqEnd: 700, gain: 0.04 }); break;
      case "bonk": S(0.12, { freq: 220, freqEnd: 90, gain: 0.2 }); N(0.06, { type: "lowpass", freq: 1200, gain: 0.08 }); break;
      case "spit": S(0.18, { type: "sine", freq: 900, freqEnd: 300, gain: 0.07 }); N(0.08, { freq: 1500, q: 3, gain: 0.04 }); break;
      case "orbPop": S(0.1, { freq: 1100, freqEnd: 1800, gain: 0.05 }); break;
      case "squeak": S(0.12, { type: "triangle", freq: 1200, freqEnd: 1800, gain: 0.04 }); break;
      case "tubWindup": S(0.7, { type: "sine", freq: 180, freqEnd: 420, gain: 0.08 }); N(0.6, { freq: 900, freqEnd: 2000, q: 1, gain: 0.05, attack: 0.2 }); break;
      case "splash": N(0.4, { type: "lowpass", freq: 3000, freqEnd: 400, gain: 0.18 }); S(0.2, { freq: 700, freqEnd: 1600, gain: 0.05 }); [0.05, 0.12, 0.2].forEach((dt) => at(dt, (tt) => this.#tone(d, tt, 0.08, { freq: 1400 + Math.random() * 800, freqEnd: 2600, gain: 0.03 }))); break;
      case "wade": N(0.2, { type: "lowpass", freq: 2200, freqEnd: 500, gain: 0.08 }); at(0.04, (tt) => this.#tone(d, tt, 0.06, { freq: 900 + Math.random() * 500, freqEnd: 1700, gain: 0.025 })); break;
      case "heal": [76, 83, 88].forEach((n, i) => at(i * 0.05, (tt) => this.#bell(d, tt, hz(n), 0.06, 0.8, 0.3))); S(0.3, { type: "sine", freq: 500, freqEnd: 900, gain: 0.05 }); break;
      case "notice": S(0.09, { type: "square", freq: 880, gain: 0.03 }); at(0.08, (tt) => this.#tone(d, tt, 0.14, { type: "square", freq: 1320, gain: 0.035 })); break;
      case "winded": N(0.5, { type: "bandpass", freq: 900, freqEnd: 500, q: 1.2, gain: 0.06, attack: 0.05 }); at(0.55, (tt) => this.#noise(d, tt, 0.45, { type: "bandpass", freq: 800, freqEnd: 450, q: 1.2, gain: 0.05, attack: 0.05 })); break;
      case "leap": S(0.22, { type: "triangle", freq: 700, freqEnd: 2000, gain: 0.05 }); N(0.12, { freq: 1800, freqEnd: 3200, q: 2, gain: 0.03 }); break;
      case "chitter": [0, 0.06, 0.12].forEach((dt) => at(dt, (tt) => this.#tone(d, tt, 0.04, { type: "triangle", freq: 1900 + Math.random() * 400, freqEnd: 2500, gain: 0.035 }))); break;
      case "nut": N(0.16, { type: "bandpass", freq: 900, freqEnd: 2200, q: 2, gain: 0.06 }); break;
      case "nutHit": S(0.07, { type: "triangle", freq: 950, freqEnd: 520, gain: 0.09 }); N(0.04, { freq: 2500, q: 3, gain: 0.04 }); break;
      case "knotSpawn": N(0.3, { type: "lowpass", freq: 900, freqEnd: 300, gain: 0.08 }); S(0.2, { type: "triangle", freq: 200, freqEnd: 320, gain: 0.04 }); break;
      // You.
      case "hurt": S(0.2, { type: "triangle", freq: 330, freqEnd: 160, gain: 0.08 }); S(0.2, { type: "sine", freq: 340, freqEnd: 170, gain: 0.05, detune: 30 }); break;
      case "faint": S(1.4, { type: "sine", freq: 660, freqEnd: 110, gain: 0.12, verb: 0.6 }); N(1.2, { type: "lowpass", freq: 2000, freqEnd: 200, gain: 0.1, verb: 0.5 }); break;
      case "jump": N(0.08, { freq: 800, freqEnd: 1600, q: 1.2, gain: 0.03 }); break;
      case "land": N(0.12, { type: "lowpass", freq: 500, freqEnd: 120, gain: 0.08 + Math.min(0.1, k * 0.01) }); break;
      case "respawn": [72, 79, 84].forEach((n, i) => at(i * 0.07, (tt) => this.#bell(d, tt, hz(n), 0.05))); break;
      // Tools.
      case "switch": N(0.05, { freq: 2200, q: 4, gain: 0.06 }); at(0.08, (tt) => this.#noise(d, tt, 0.04, { freq: 3200, q: 5, gain: 0.05 })); break;
      case "catch": S(0.25, { type: "triangle", freq: 300, freqEnd: 900, gain: 0.08 }); N(0.2, { freq: 2000, freqEnd: 500, q: 2, gain: 0.08 }); at(0.2, (tt) => this.#tone(d, tt, 0.1, { freq: 180, freqEnd: 90, gain: 0.12 })); break;
      case "launch": S(0.18, { freq: 160, freqEnd: 60, gain: 0.2 }); N(0.2, { type: "lowpass", freq: 2000, freqEnd: 400, gain: 0.12 }); break;
      case "blast": N(0.35, { type: "bandpass", freq: 700, freqEnd: 2400, q: 0.7, gain: 0.14 }); break;
      case "throw": N(0.28, { type: "bandpass", freq: 500, freqEnd: 1700, q: 0.9, gain: 0.12 }); break;
      case "pillowPop": N(0.6, { type: "lowpass", freq: 1800, freqEnd: 250, gain: 0.22, verb: 0.3 }); S(0.3, { freq: 180, freqEnd: 70, gain: 0.18 }); [0.08, 0.16, 0.26].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.25, { type: "bandpass", freq: 2400 + Math.random() * 1200, q: 2, gain: 0.04 }))); break;
      case "sip": N(0.35, { type: "bandpass", freq: 450, freqEnd: 1300, q: 3, gain: 0.08, attack: 0.05 }); [79, 84].forEach((n, i) => at(0.32 + i * 0.07, (tt) => this.#bell(d, tt, hz(n), 0.05))); break;
      case "cogZap": S(0.07, { type: "square", freq: 2400, freqEnd: 900, gain: 0.022 }); N(0.05, { type: "highpass", freq: 6000, gain: 0.025 }); break;
      case "ping": [91, 96].forEach((n, i) => at(i * 0.09, (tt) => this.#bell(d, tt, hz(n), 0.045, 0.6, 0.4))); break;
      case "ballPop": S(0.25, { freq: 120, freqEnd: 50, gain: 0.25, verb: 0.2 }); N(0.3, { type: "lowpass", freq: 1500, freqEnd: 200, gain: 0.15 }); break;
      case "foamSpray": N(0.09, { type: "bandpass", freq: 1400 + Math.random() * 300, freqEnd: 700, q: 1.4, gain: 0.05 }); break;
      case "foamBlob": S(0.22, { freq: 320, freqEnd: 110, gain: 0.16 }); N(0.25, { type: "lowpass", freq: 1400, freqEnd: 300, gain: 0.12 }); break;
      case "foamSplat": N(0.07, { type: "bandpass", freq: 2200, q: 2, gain: 0.025 }); break;
      case "foamSet": S(0.3, { type: "triangle", freq: 170, freqEnd: 260, gain: 0.08 }); N(0.35, { type: "lowpass", freq: 900, freqEnd: 300, gain: 0.12 }); at(0.18, (tt) => this.#bell(d, tt, hz(79), 0.04, 0.6, 0.3)); break;
      case "foamGone": [0, 0.07, 0.15].forEach((dt) => at(dt, (tt) => this.#tone(d, tt, 0.08, { freq: 900 + Math.random() * 600, freqEnd: 1800, gain: 0.04 }))); break;
      case "foamStuck": N(0.3, { type: "bandpass", freq: 600, freqEnd: 1500, q: 2, gain: 0.08 }); S(0.2, { freq: 250, freqEnd: 400, gain: 0.05 }); break;
      case "foamFree": S(0.1, { freq: 700, freqEnd: 1400, gain: 0.05 }); break;
      // Grandpa Joe's garden: a gnome turns to stone with a gritty click and
      // scurries off with a squeak; a can gurgles and pours, rain pats on
      // the umbrella; the mower putters and roars; a sunflower pips seeds.
      case "gnomeStone": N(0.08, { type: "lowpass", freq: 900, gain: 0.08 }); S(0.06, { type: "square", freq: 180, freqEnd: 120, gain: 0.03 }); break;
      case "gnomeGo": S(0.1, { type: "triangle", freq: 700, freqEnd: 1300, gain: 0.04 }); break;
      case "gnomeWind": S(0.25, { type: "triangle", freq: 300, freqEnd: 600, gain: 0.05 }); break;
      case "canWind": [0, 0.06, 0.12].forEach((dt, i) => at(dt, (tt) => this.#tone(d, tt, 0.06, { type: "sine", freq: 300 + i * 80, gain: 0.05 }))); break;
      case "canPour": N(1.4, { type: "bandpass", freq: 2400, q: 0.6, gain: 0.1, attack: 0.15 }); break;
      case "canSquirt": N(0.1, { type: "bandpass", freq: 3000, freqEnd: 1500, q: 1.5, gain: 0.08 }); break;
      case "rainPat": for (let i = 0; i < 4; i++) at(Math.random() * 0.25, (tt) => this.#noise(d, tt, 0.03, { type: "bandpass", freq: 1800 + Math.random() * 1500, q: 3, gain: 0.05 })); break;
      case "soaked": N(0.3, { type: "bandpass", freq: 1500, q: 0.8, gain: 0.12 }); S(0.15, { type: "sine", freq: 400, freqEnd: 200, gain: 0.05 }); break;
      case "mowerRev": for (let i = 0; i < (k ? 4 : 9); i++) at(i * 0.07, (tt) => this.#tone(d, tt, 0.06, { type: "sawtooth", freq: 70 + i * 12, gain: 0.06 })); break;
      case "mowerCharge": S(1.2, { type: "sawtooth", freq: 110, freqEnd: 180, gain: 0.07 }); N(1, { type: "bandpass", freq: 600, q: 1, gain: 0.06 }); break;
      case "mowerClip": N(0.25, { type: "highpass", freq: 3000, gain: 0.08 }); break;
      case "sunWind": S(0.5, { type: "sine", freq: 400, freqEnd: 700, gain: 0.04 }); break;
      case "sunSeed": S(0.05, { type: "square", freq: 1300 + Math.random() * 200, freqEnd: 900, gain: 0.03 }); break;
      case "sunShake": N(0.6, { type: "bandpass", freq: 3000, q: 2, gain: 0.06, attack: 0.1 }); break;
      case "sunPetals": N(0.4, { type: "highpass", freq: 4000, gain: 0.06 }); break;
      case "sunSprout": S(0.12, { type: "sine", freq: 300, freqEnd: 900, gain: 0.06 }); break;
      // Slabs: a rumble while one trembles, a crack as it drops, a chime as it settles back.
      case "tileWarn": N(1.2, { type: "lowpass", freq: 300, gain: 0.12, attack: 0.2 }); break;
      case "tileDrop": N(0.6, { type: "lowpass", freq: 800, freqEnd: 150, gain: 0.18 }); S(0.4, { freq: 120, freqEnd: 50, gain: 0.12 }); break;
      case "tileBack": this.#bell(d, t, hz(79), 0.04, 0.6, 0.3); break;
      // The Big Alarm Clock.
      case "bigclockRing": for (let i = 0; i < 18; i++) at(i * 0.07, (tt) => this.#bell(d, tt, hz(i % 2 ? 76 : 74), 0.06, 0.4, 0.4)); break;
      case "bigclockSweep": N(0.9, { type: "bandpass", freq: 300, freqEnd: 900, q: 0.7, gain: 0.15, attack: 0.1 }); break;
      case "bigclockHit": S(0.15, { type: "square", freq: 200, freqEnd: 90, gain: 0.08 }); break;
      case "bigclockTimesup": for (let i = 0; i < 10; i++) at(i * 0.1, (tt) => this.#tone(d, tt, 0.03, { type: "square", freq: i % 2 ? 1500 : 1200, gain: 0.05 })); break;
      case "bigclockClink": this.#bell(d, t, hz(98), 0.05, 0.25, 0.1); S(0.04, { type: "square", freq: 2500, gain: 0.02 }); break;
      case "bigclockUnwound": S(1.4, { type: "sawtooth", freq: 900, freqEnd: 60, gain: 0.07 }); for (let i = 0; i < 14; i++) at(i * (0.04 + i * 0.008), (tt) => this.#tone(d, tt, 0.02, { type: "square", freq: 1800, gain: 0.03 })); break;
      case "bigclockWound": for (let i = 0; i < 8; i++) at(i * 0.06, (tt) => this.#tone(d, tt, 0.025, { type: "square", freq: 1400 + i * 50, gain: 0.03 })); break;
      // The Gust Umbrella: a cloth snap and a rush of air; opening a soft
      // fwump; an orb patting on the canopy; a pinwheel whirrs up.
      case "gust": S(0.06, { type: "triangle", freq: 220, freqEnd: 110, gain: 0.08 }); N(0.05, { type: "bandpass", freq: 1800, q: 1.5, gain: 0.08 }); N(0.4, { type: "bandpass", freq: 700, freqEnd: 2600, q: 0.8, gain: 0.12, attack: 0.02 }); break;
      case "gustHop": N(0.35, { type: "bandpass", freq: 400, freqEnd: 1600, q: 0.9, gain: 0.12, attack: 0.02 }); S(0.25, { type: "sine", freq: 180, freqEnd: 420, gain: 0.06 }); break;
      case "umbrellaOpen": N(0.18, { type: "lowpass", freq: 900, freqEnd: 300, gain: 0.12, attack: 0.01 }); S(0.12, { type: "triangle", freq: 140, freqEnd: 90, gain: 0.07 }); break;
      case "umbrellaShut": N(0.08, { type: "bandpass", freq: 1500, q: 1.2, gain: 0.06 }); S(0.06, { type: "triangle", freq: 260, freqEnd: 180, gain: 0.04 }); break;
      case "umbrellaBlock": N(0.07, { type: "bandpass", freq: 1100, q: 1.5, gain: 0.14 }); S(0.09, { type: "sine", freq: 300, freqEnd: 150, gain: 0.08 }); break;
      case "pinwheel": for (let i = 0; i < 10; i++) at(i * 0.05, (tt) => this.#tone(d, tt, 0.035, { type: "square", freq: 600 + i * 60, gain: 0.02 })); N(0.6, { type: "bandpass", freq: 800, freqEnd: 1600, q: 1, gain: 0.05, attack: 0.05 }); break;
      // The Star Yo-Yo: a whirr out, a plastic snap back in the hand, a
      // thwack on a glitch, a tock on a wall; a handle catches with a
      // bright clink; a yanked glitch whoops, and comes in seeing stars.
      case "yoyoThrow": S(0.22, { type: "triangle", freq: 500, freqEnd: 1300, gain: 0.05 }); N(0.2, { type: "bandpass", freq: 1200, freqEnd: 2600, q: 2, gain: 0.05 }); break;
      case "yoyoCatch": N(0.03, { type: "highpass", freq: 3000, gain: 0.06 }); S(0.05, { type: "square", freq: 900, freqEnd: 600, gain: 0.025 }); break;
      case "yoyoHit": S(0.09, { type: "triangle", freq: 420, freqEnd: 160, gain: 0.12 }); N(0.05, { type: "bandpass", freq: 1800, q: 2, gain: 0.08 }); break;
      case "yoyoClack": S(0.05, { type: "square", freq: 1300, freqEnd: 900, gain: 0.03 }); N(0.03, { type: "highpass", freq: 2500, gain: 0.05 }); break;
      case "yoyoHook": this.#bell(d, t, hz(88), 0.07, 0.8, 0.3); this.#bell(d, t + 0.05, hz(95), 0.05, 0.6, 0.3); N(0.08, { type: "highpass", freq: 4000, gain: 0.05 }); break;
      case "yoyoLetGo": S(0.15, { type: "sine", freq: 400, freqEnd: 900, gain: 0.05 }); break;
      case "foeTied": N(0.25, { type: "bandpass", freq: 1400, freqEnd: 600, q: 4, gain: 0.07 }); S(0.08, { type: "triangle", freq: 500, freqEnd: 350, gain: 0.05 }); break;
      case "foeFree": N(0.12, { type: "bandpass", freq: 700, freqEnd: 1800, q: 3, gain: 0.05 }); break;
      case "foeYank": S(0.3, { type: "sine", freq: 300, freqEnd: 1200, gain: 0.06 }); break;
      case "foeDizzy": [0, 0.08, 0.16].forEach((dt, i) => at(dt, (tt) => this.#bell(d, tt, hz(91 - i * 3), 0.03, 0.4, 0.2))); break;
      // The Lullaby Bell: a bright strike with a long ring; the lullaby a
      // falling music-box phrase; sleepers sigh, wakers squeak.
      case "bellRing": { const r = [0, 2, 4][Math.floor(Math.random() * 3)]; this.#bell(d, t, hz(81 + r), 0.11, 1.4, 0.5); this.#bell(d, t, hz(88 + r), 0.05, 0.9, 0.5); N(0.03, { type: "highpass", freq: 5000, gain: 0.05 }); S(0.12, { type: "triangle", freq: 330, freqEnd: 220, gain: 0.05 }); break; }
      case "bellLull": [84, 79, 76, 72, 67].forEach((n, i) => at(i * 0.09, (tt) => this.#bell(d, tt, hz(n), 0.07 * (0.6 + 0.4 * k), 1.3, 0.6))); break;
      case "bellBat": this.#bell(d, t, hz(96), 0.05, 0.4, 0.2); S(0.08, { type: "square", freq: 900, freqEnd: 1800, gain: 0.025 }); break;
      case "foeSleep": S(0.6, { type: "sine", freq: 520, freqEnd: 260, gain: 0.05, attack: 0.05 }); at(0.25, (tt) => this.#tone(d, tt, 0.5, { type: "sine", freq: 390, freqEnd: 200, gain: 0.03, attack: 0.08 })); break;
      case "foeDrowsy": S(0.5, { type: "triangle", freq: 220, freqEnd: 140, gain: 0.05, attack: 0.05 }); break;
      case "foeWake": S(0.12, { type: "triangle", freq: 500, freqEnd: 1300, gain: 0.06 }); break;
      case "jellyWobble": [0, 0.08, 0.16, 0.24].forEach((dt, i) => at(dt, (tt) => this.#tone(d, tt, 0.09, { type: "sine", freq: 180 - i * 15, freqEnd: 260 - i * 20, gain: 0.08 }))); break;
      case "jellySquish": S(0.18, { type: "sine", freq: 160, freqEnd: 110, gain: 0.08 }); break;
      case "boing": S(0.35, { type: "sine", freq: 140, freqEnd: 620, gain: 0.16 }); S(0.25, { type: "triangle", freq: 280, freqEnd: 1000, gain: 0.05 }); break;
      // Rosie's kitchen.
      case "meatWind": S(0.4, { type: "triangle", freq: 120, freqEnd: 80, gain: 0.1 }); break;
      case "meatRoll": N(0.6, { type: "lowpass", freq: 600, freqEnd: 300, gain: 0.12 }); S(0.5, { type: "triangle", freq: 90, freqEnd: 140, gain: 0.08 }); break;
      case "meatSplit": S(0.15, { freq: 300, freqEnd: 900, gain: 0.08 }); N(0.12, { type: "bandpass", freq: 900, q: 2, gain: 0.08 }); break;
      case "pepperShake": [0, 0.08, 0.16, 0.24, 0.32].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.06, { type: "highpass", freq: 4000, gain: 0.06 }))); break;
      case "pepperWind": S(0.4, { type: "square", freq: 500, freqEnd: 800, gain: 0.025 }); break;
      case "pepperBurst": N(0.12, { type: "highpass", freq: 3000, gain: 0.08 }); S(0.08, { type: "square", freq: 1200, freqEnd: 600, gain: 0.03 }); break;
      case "pepperDodge": S(0.12, { freq: 900, freqEnd: 1800, gain: 0.04 }); break;
      case "sneeze": N(0.18, { type: "bandpass", freq: 1500, q: 1, gain: 0.05, attack: 0.12 }); at(0.2, (tt) => { this.#noise(d, tt, 0.3, { type: "bandpass", freq: 2500, freqEnd: 900, q: 0.8, gain: 0.22 }); this.#tone(d, tt, 0.2, { type: "triangle", freq: 500, freqEnd: 250, gain: 0.08 }); }); break;
      case "cloudBlown": N(0.4, { type: "bandpass", freq: 800, freqEnd: 2500, q: 1, gain: 0.08 }); break;
      case "pinRock": [0, 0.15, 0.3, 0.45].forEach((dt) => at(dt, (tt) => this.#tone(d, tt, 0.08, { type: "triangle", freq: 160, gain: 0.08 }))); break;
      case "pinRoll": N(1.2, { type: "lowpass", freq: 400, gain: 0.15 }); S(1.2, { type: "triangle", freq: 70, freqEnd: 100, gain: 0.1 }); break;
      case "pinRise": S(0.5, { type: "triangle", freq: 120, freqEnd: 260, gain: 0.08 }); break;
      case "grindWind": [0, 0.12, 0.24, 0.36].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.08, { type: "bandpass", freq: 700, q: 3, gain: 0.1 }))); break;
      case "grindPop": S(0.2, { freq: 200, freqEnd: 500, gain: 0.12 }); N(0.15, { type: "lowpass", freq: 1200, gain: 0.08 }); break;
      case "cookerRattle": [0, 0.04, 0.09].forEach((dt) => at(dt, (tt) => this.#tone(d, tt, 0.05, { type: "square", freq: 700 + Math.random() * 300, gain: 0.04 }))); N(0.2, { type: "highpass", freq: 3000, gain: 0.05 }); break;
      case "cookerLid": S(0.5, { freq: k ? 300 : 500, freqEnd: k ? 900 : 150, gain: 0.15 }); N(0.8, { type: "highpass", freq: 1500, freqEnd: 600, gain: 0.2 }); if (k) [79, 84, 88].forEach((n, i) => at(0.1 + i * 0.06, (tt) => this.#bell(d, tt, hz(n), 0.06))); break;
      case "cookerSteam": N(1.5, { type: "highpass", freq: 2000, freqEnd: 1200, gain: 0.14, attack: 0.1 }); break;
      case "cookerHop": S(0.4, { type: "triangle", freq: 120, freqEnd: 300, gain: 0.12 }); break;
      case "cookerLand": S(0.4, { freq: 90, freqEnd: 40, gain: 0.3, verb: 0.2 }); N(0.4, { type: "lowpass", freq: 800, freqEnd: 150, gain: 0.25 }); at(0.02, (tt) => this.#tone(d, tt, 0.6, { type: "triangle", freq: 220, freqEnd: 200, gain: 0.05, verb: 0.4 })); break;
      case "cookerWhistle": S(2.1, { type: "sine", freq: 1800, freqEnd: 2600, gain: 0.07, attack: 0.3 }); S(2.1, { type: "sine", freq: 1830, freqEnd: 2650, gain: 0.05, attack: 0.3 }); break;
      case "cookerBlow": N(0.9, { type: "lowpass", freq: 3000, freqEnd: 300, gain: 0.3 }); S(0.5, { freq: 80, freqEnd: 40, gain: 0.25 }); break;
      case "steamBurn": N(0.2, { type: "highpass", freq: 2500, gain: 0.1 }); break;
      case "souffleFall": S(0.9, { type: "sawtooth", freq: 420, freqEnd: 70, gain: 0.05 }); N(0.9, { type: "lowpass", freq: 1600, freqEnd: 200, gain: 0.12, attack: 0.05 }); at(0.85, (tt) => this.#tone(d, tt, 0.12, { freq: 120, freqEnd: 60, gain: 0.12 })); break;
      case "clockWind": for (let i = 0; i < 8; i++) at(i * 0.07, (tt) => this.#tone(d, tt, 0.03, { type: "square", freq: i % 2 ? 2200 : 1700, gain: 0.025 })); break;
      case "clockRing": for (let i = 0; i < 12; i++) at(0.25 + i * 0.06, (tt) => this.#bell(d, tt, hz(i % 2 ? 93 : 91), 0.035, 0.3, 0.2)); break;
      case "clockSkip": S(0.3, { type: "sine", freq: k ? 300 : 1400, freqEnd: k ? 1400 : 300, gain: 0.06 }); break;
      case "slowed": S(0.9, { type: "triangle", freq: 700, freqEnd: 180, gain: 0.08, verb: 0.4 }); S(0.9, { type: "sine", freq: 705, freqEnd: 185, gain: 0.05, detune: 20 }); break;
      case "pencilCrouch": S(0.3, { type: "triangle", freq: 700, freqEnd: 1500, gain: 0.05 }); break;
      case "pencilSpin": S(0.55, { type: "sawtooth", freq: 260, freqEnd: 900, gain: 0.04 }); N(0.5, { type: "bandpass", freq: 900, freqEnd: 2600, q: 3, gain: 0.04, attack: 0.1 }); break;
      case "dizzy": [0, 0.1, 0.2, 0.3].forEach((dt, i) => at(dt, (tt) => this.#tone(d, tt, 0.12, { type: "sine", freq: 900 - i * 120, freqEnd: 1100 - i * 120, gain: 0.04 }))); break;
      case "packWindup": [0, 0.07, 0.14, 0.21, 0.28].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.05, { type: "highpass", freq: 3000, gain: 0.05 }))); break;
      case "packCharge": S(0.8, { type: "sawtooth", freq: 70, freqEnd: 110, gain: 0.1 }); N(0.8, { type: "lowpass", freq: 500, gain: 0.12, attack: 0.1 }); break;
      case "packChomp": N(0.08, { type: "highpass", freq: 2500, gain: 0.08 }); S(0.12, { type: "square", freq: 260, freqEnd: 120, gain: 0.07 }); break;
      case "sharpGrind": N(0.6, { type: "bandpass", freq: 400, freqEnd: 900, q: 4, gain: 0.08, attack: 0.05 }); S(0.6, { type: "sawtooth", freq: 90, freqEnd: 130, gain: 0.04 }); break;
      case "sharpPop": S(0.15, { type: "sine", freq: 300, freqEnd: 800, gain: 0.08 }); N(0.08, { freq: 1800, q: 2, gain: 0.05 }); break;
      case "penStrike": N(0.5, { type: "bandpass", freq: 900, freqEnd: 3000, q: 1, gain: 0.14 }); S(0.4, { type: "sawtooth", freq: 200, freqEnd: 90, gain: 0.06 }); break;
      case "penLine": N(0.3, { type: "highpass", freq: 3500, gain: 0.06 }); break;
      case "inkBurn": N(0.25, { type: "highpass", freq: 4500, gain: 0.06 }); S(0.15, { type: "triangle", freq: 500, freqEnd: 300, gain: 0.04 }); break;
      case "penCircle": S(0.2, { freq: 400, freqEnd: 1200, gain: 0.08 }); break;
      case "newTool": [67, 72, 76, 79, 84].forEach((n, i) => at(i * 0.07, (tt) => this.#bell(d, tt, hz(n), 0.07, 1.2, 0.5))); break;
      // Anchors.
      case "tuneStart": S(0.8, { type: "triangle", freq: 220, freqEnd: 440, gain: 0.08, verb: 0.4 }); break;
      case "wave": S(0.6, { type: "sawtooth", freq: 98, gain: 0.05, verb: 0.5, attack: 0.1 }); S(0.6, { type: "sawtooth", freq: 147, gain: 0.03, verb: 0.5, attack: 0.1, detune: 8 }); break;
      case "anchorFixed": [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => at(i * 0.08, (tt) => this.#bell(d, tt, hz(n), 0.08, 2, 0.8))); N(1.5, { type: "bandpass", freq: 1200, q: 0.5, gain: 0.05, attack: 0.3, verb: 0.6 }); break;
      case "coreOpen": S(3, { type: "sawtooth", freq: 55, freqEnd: 48, gain: 0.08, verb: 0.8, attack: 0.8 }); N(3, { type: "lowpass", freq: 300, gain: 0.15, attack: 1, verb: 0.5 }); break;
      // The Vacuum Cleaner.
      case "bossRise": [0, 0.6, 1.2].forEach((dt) => at(dt, (tt) => { this.#tone(d, tt, 0.9, { freq: 60, freqEnd: 40, gain: 0.3, verb: 0.6 }); this.#noise(d, tt, 0.7, { type: "lowpass", freq: 400, gain: 0.25 }); })); break;
      case "bossHit": N(0.06, { type: "bandpass", freq: k ? 2600 : 900, q: 3, gain: k ? 0.08 : 0.06 }); break;
      case "gulp": S(0.35, { freq: 300, freqEnd: 80, gain: 0.25 }); N(0.3, { type: "lowpass", freq: 900, freqEnd: 200, gain: 0.2 }); break;
      case "burp": S(0.5, { type: "sawtooth", freq: 110, freqEnd: 70, gain: 0.12 }); N(0.4, { type: "lowpass", freq: 600, gain: 0.15 }); break;
      case "clog": S(0.3, { type: "square", freq: 200, freqEnd: 90, gain: 0.08 }); [0.3, 0.6, 0.9].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.2, { type: "lowpass", freq: 700, gain: 0.2 }))); break;
      case "sweep": N(0.7, { type: "bandpass", freq: 400, freqEnd: 1600, q: 1, gain: 0.15 }); break;
      case "roar": S(1.3, { type: "sawtooth", freq: 120, freqEnd: 60, gain: 0.14, verb: 0.6, attack: 0.1 }); N(1.1, { type: "lowpass", freq: 900, gain: 0.2, verb: 0.5, attack: 0.1 }); break;
      case "bossDown": S(2.4, { type: "sawtooth", freq: 240, freqEnd: 40, gain: 0.14, verb: 0.7 }); N(2.2, { type: "lowpass", freq: 3000, freqEnd: 150, gain: 0.2, verb: 0.5 }); break;
      case "bossPop": [60, 64, 67, 72, 76, 79, 84, 88].forEach((n, i) => at(i * 0.07, (tt) => this.#bell(d, tt, hz(n), 0.09, 2, 0.8))); S(0.6, { freq: 150, freqEnd: 900, gain: 0.2 }); break;
      case "win": [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => at(i * 0.12, (tt) => this.#bell(d, tt, hz(n), 0.09, 1.6, 0.6))); break;
      default:
    }
  }

  // Beep-talk: `n` little syllables in a voice.
  talk(voice, n = 6) {
    if (!this.ctx) return;
    const V = VOICES[voice] ?? VOICES.margo, t0 = this.ctx.currentTime + 0.02;
    for (let i = 0; i < n; i++) {
      const tt = t0 + i * (0.075 + Math.random() * 0.03);
      const f = hz(V.note + Math.floor(Math.random() * V.spread) * 2 - V.spread);
      this.#tone(this.sfx, tt, 0.06, { type: V.wave, freq: f, freqEnd: f * (0.9 + Math.random() * 0.25), gain: V.wave === "square" ? 0.018 : 0.04, attack: 0.004 });
    }
  }

  // ── Held loops ──
  // loop(name, level): 0 stops it, 0…1 sets its strength (pitch / loudness).
  loop(name, level) {
    if (!this.ctx) return;
    let L = this.loops[name];
    if (level <= 0) { if (L) { L.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06); L.on = false; } return; }
    const c = this.ctx, t = c.currentTime;
    if (!L) {
      const g = c.createGain(); g.gain.value = 0; g.connect(this.sfx);
      L = this.loops[name] = { g, on: false, nodes: [] };
      const osc = (type, f) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.start(); L.nodes.push(o); return o; };
      const noise = (type, f, q) => {
        const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start();
        const flt = c.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
        s.connect(flt); L.nodes.push(s); return flt;
      };
      if (name === "charge") { L.o = osc("sawtooth", 200); const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200; L.o.connect(f).connect(g); L.o2 = osc("sine", 400); L.o2.connect(g); }
      else if (name === "suck") { L.f = noise("bandpass", 900, 0.8); L.f.connect(g); L.o = osc("triangle", 140); const og = c.createGain(); og.gain.value = 0.25; L.o.connect(og).connect(g); }
      else if (name === "bossSuck") { L.f = noise("lowpass", 500, 0.7); L.f.connect(g); L.o = osc("sawtooth", 60); const og = c.createGain(); og.gain.value = 0.2; L.o.connect(og).connect(g); }
      else if (name === "tune") { L.o = osc("sine", 220); L.o2 = osc("sine", 331); L.o.connect(g); L.o2.connect(g); }
      else if (name === "hum") { L.o = osc("sine", 523); L.o2 = osc("sine", 784); const tg = c.createGain(); tg.gain.value = 1; L.o.connect(tg); L.o2.connect(tg); tg.connect(g); L.trem = osc("sine", 6); const tq = c.createGain(); tq.gain.value = 0.35; L.trem.connect(tq).connect(tg.gain); }
      else if (name === "whirr") { L.f = noise("bandpass", 900, 2); L.f.connect(g); L.o = osc("triangle", 180); const og = c.createGain(); og.gain.value = 0.25; L.o.connect(og).connect(g); }
      else if (name === "wind") { L.f = noise("bandpass", 600, 0.7); L.f.connect(g); }
      else if (name === "buzz") { L.o = osc("sawtooth", 180); const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 2; L.o.connect(f).connect(g); }
    }
    L.on = true;
    const k = clamp(level, 0, 1);
    if (name === "charge") { L.o.frequency.setTargetAtTime(160 + k * 520, t, 0.04); L.o2.frequency.setTargetAtTime(320 + k * 1040, t, 0.04); L.g.gain.setTargetAtTime(0.02 + k * 0.04, t, 0.05); }
    else if (name === "suck") { L.f.frequency.setTargetAtTime(700 + k * 900, t, 0.1); L.o.frequency.setTargetAtTime(120 + k * 60, t, 0.1); L.g.gain.setTargetAtTime(0.1 * k, t, 0.08); }
    else if (name === "bossSuck") { L.f.frequency.setTargetAtTime(300 + k * 700, t, 0.2); L.g.gain.setTargetAtTime(0.25 * k, t, 0.1); }
    else if (name === "tune") { L.o.frequency.setTargetAtTime(220 + k * 220, t, 0.2); L.o2.frequency.setTargetAtTime(331 + k * 330, t, 0.2); L.g.gain.setTargetAtTime(0.03, t, 0.2); }
    else if (name === "hum") { L.o.frequency.setTargetAtTime(523 * (1 + k * 0.5), t, 0.08); L.o2.frequency.setTargetAtTime(784 * (1 + k * 0.5), t, 0.08); L.trem.frequency.setTargetAtTime(4 + k * 6, t, 0.1); L.g.gain.setTargetAtTime(0.015 + k * 0.03, t, 0.08); }
    else if (name === "whirr") { L.f.frequency.setTargetAtTime(700 + k * 900, t, 0.1); L.o.frequency.setTargetAtTime(140 + k * 160 + Math.sin(t * 11) * 25, t, 0.03); L.g.gain.setTargetAtTime(0.06 * Math.min(1, k + 0.3), t, 0.08); }
    else if (name === "wind") { L.f.frequency.setTargetAtTime(350 + k * 900 + Math.sin(t * 3) * 80, t, 0.15); L.g.gain.setTargetAtTime(0.09 * k, t, 0.15); }
    else if (name === "buzz") { L.o.frequency.setTargetAtTime(170 + Math.sin(t * 7) * 10, t, 0.05); L.g.gain.setTargetAtTime(0.03 * k, t, 0.1); }
  }
  stopLoops() { for (const n of Object.keys(this.loops)) this.loop(n, 0); }

  // ── Music ─────────────────────────────────────────────────────────────
  setSong(name) {
    this.songWanted = name;
    if (!this.ctx) return;
    if (this.song?.name === name) return;
    this.#stopSong();
    if (name) this.#startSong(name);
  }
  setIntensity(k) { this.intensity = clamp(k, 0, 1); }

  #startSong(name) {
    const S = SONGS[name];
    if (!S) return;
    const c = this.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, c.currentTime, 1.2);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    out.connect(lp).connect(this.musicBus);
    const rv = c.createGain(); rv.gain.value = 0.45; lp.connect(rv).connect(this.verb);
    const m = { name, out, next: c.currentTime + 0.15, step: 0, timer: 0 };
    this.song = m;
    const beat = 60 / S.bpm / 2;          // eighth notes
    let lead = 3;
    const schedule = () => {
      if (this.song !== m) return;
      while (m.next < c.currentTime + 0.4) {
        const i = m.step % 16, bar = Math.floor(m.step / 16) % 4;
        const root = S.root + S.prog[bar];
        const t = m.next, I = S.drums ? Math.max(this.intensity, name === "boss" ? 0.8 : 0) : 0;
        // Swing the off-beats a touch.
        const sw = i % 2 ? beat * 0.12 : 0;
        if (i === 0) {
          for (const n of [0, 4, 7]) this.#tone(out, t, beat * 16, { type: "sine", freq: hz(root + 12 + n - (name === "boss" && n === 4 ? 1 : 0)), gain: 0.022, attack: 0.9 });
          this.#tone(out, t, beat * 16, { type: "triangle", freq: hz(root - 12), gain: 0.045, attack: 0.3 });
        }
        // Plucky bass.
        if (i % 4 === 0 || (I > 0.4 && i % 4 === 3)) this.#tone(out, t + sw, beat * 1.6, { type: "triangle", freq: hz(root + (i % 8 === 4 ? 7 : 0)), gain: 0.07 + I * 0.03, attack: 0.005 });
        // Soft drums once things get going.
        if (S.drums) {
          if (i % 8 === 0 && I > 0.1) this.#tone(out, t, 0.2, { freq: 110, freqEnd: 45, gain: 0.14 + I * 0.08 });
          if (i % 8 === 4 && I > 0.3) this.#noise(out, t, 0.1, { type: "bandpass", freq: 2200, q: 0.8, gain: 0.04 + I * 0.03 });
          if (i % 2 === 1 && I > 0.55) this.#noise(out, t + sw, 0.025, { type: "highpass", freq: 8000, gain: 0.018 });
          if (I > 0.8 && i % 4 === 2) this.#tone(out, t, 0.15, { freq: 90, freqEnd: 45, gain: 0.08 });
        }
        // Lead: a wandering music-box line.
        const density = 0.35 + I * 0.25;
        if (Math.random() < density && (i % 2 === 0 || Math.random() < 0.3)) {
          lead = clamp(lead + Math.floor(Math.random() * 5) - 2, 0, S.scale.length * 2 - 1);
          const oct = Math.floor(lead / S.scale.length), deg = S.scale[lead % S.scale.length];
          const f = hz(root + 24 + deg + oct * 12);
          if (S.lead === "box") this.#bell(out, t + sw, f, 0.035, beat * 5, 0);
          else this.#tone(out, t + sw, beat * 1.4, { type: S.lead, freq: f / 2, gain: 0.012, attack: 0.01 });
        }
        m.next += beat;
        m.step++;
      }
      m.timer = setTimeout(schedule, 120);
    };
    schedule();
  }
  #stopSong() {
    const m = this.song;
    if (!m) return;
    this.song = null;
    clearTimeout(m.timer);
    m.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    setTimeout(() => m.out.disconnect(), 3000);
  }
}
