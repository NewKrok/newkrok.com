// ── Sound ────────────────────────────────────────────────────────────────
// Everything is synthesised with WebAudio, no sample files. One-shots are
// rate-limited per name (a horde of hits must not become white noise), and
// the music is a generative loop per stage whose drums get busier as the
// keeper approaches.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Minimum gap between two plays of the same sound (s).
const GAP = { hit: 0.05, kill: 0.06, gem: 0.03, whip: 0.08, bow: 0.07, knives: 0.09, bell: 0.2, spade: 0.08, thunder: 0.08, thud: 0.06, spit: 0.12, ember: 0.05, hurt: 0.1, splash: 0.08, lunge: 0.15, dive: 0.2, boom: 0.08, summon: 0.3, hover: 0.04 };

// Stage music: a minor key root, tempo and a lead colour.
const SONGS = {
  menu: { root: 50, bpm: 64, scale: [0, 3, 5, 7, 10], lead: "triangle", prog: [0, -4, -2, -5] },
  churchyard: { root: 45, bpm: 92, scale: [0, 2, 3, 7, 8], lead: "triangle", prog: [0, -4, -2, -5] },
  mill: { root: 43, bpm: 84, scale: [0, 3, 5, 7, 10], lead: "sine", prog: [0, 3, -2, -4] },
  ashwood: { root: 47, bpm: 104, scale: [0, 1, 4, 5, 7, 8], lead: "sawtooth", prog: [0, 1, -4, 1] },
  pass: { root: 48, bpm: 88, scale: [0, 2, 3, 7, 10], lead: "sine", prog: [0, -3, -5, -2] },
  cathedral: { root: 41, bpm: 96, scale: [0, 2, 3, 5, 7, 8, 11], lead: "square", prog: [0, -4, -7, -5] },
  win: { root: 48, bpm: 80, scale: [0, 2, 4, 7, 9], lead: "triangle", prog: [0, 5, -3, 7] },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, sfx: 0.85, music: 0.55 };
    this.last = {};
    this.song = null;
    this.songWanted = "menu";
    this.intensity = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5;
      this.master.connect(comp).connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      // A shared room reverb for the music and the big hits.
      this.verb = c.createConvolver();
      this.verb.buffer = this.#impulse(2.4);
      const vg = c.createGain(); vg.gain.value = 0.35;
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
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.42, t, 0.05);
  }
  suspend(yes) { if (this.ctx) { if (yes) this.ctx.suspend(); else this.ctx.resume(); } }

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

  play(name, k = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gap = GAP[name] ?? 0.02;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const t = now + 0.005, d = this.sfx, N = (...a) => this.#noise(d, t, ...a), S = (...a) => this.#tone(d, t, ...a);
    const at = (dt, fn) => fn(t + dt);
    switch (name) {
      // UI.
      case "hover": S(0.05, { type: "triangle", freq: 1300, gain: 0.03 }); break;
      case "click": S(0.08, { type: "triangle", freq: 700, freqEnd: 1100, gain: 0.1 }); break;
      case "back": S(0.09, { type: "triangle", freq: 900, freqEnd: 560, gain: 0.09 }); break;
      case "locked": S(0.14, { type: "square", freq: 150, gain: 0.05 }); break;
      case "buy": [523, 784, 1046].forEach((f, i) => at(i * 0.06, (tt) => this.#tone(d, tt, 0.3, { type: "triangle", freq: f, gain: 0.1, verb: 0.3 }))); N(0.3, { type: "highpass", freq: 5000, gain: 0.05 }); break;
      // Weapons.
      case "whip": N(0.13, { type: "bandpass", freq: 2600, freqEnd: 700, q: 1.4, gain: 0.16 }); if (k) S(0.2, { type: "sawtooth", freq: 180, freqEnd: 90, gain: 0.03 }); break;
      case "bow": N(0.06, { freq: 3000, q: 3, gain: 0.1 }); S(0.08, { type: "triangle", freq: k ? 500 : 900, freqEnd: k ? 250 : 500, gain: 0.07 }); break;
      case "knives": N(0.07, { type: "highpass", freq: 4500, gain: 0.08 }); break;
      case "bell": S(0.9, { freq: 523, gain: 0.05, verb: 0.4 }); S(0.7, { freq: 1318, gain: 0.02, verb: 0.3 }); break;
      case "bigtoll": S(2.2, { freq: 196, gain: 0.16, verb: 0.8 }); S(1.8, { freq: 392 * 1.01, gain: 0.06, verb: 0.6 }); S(1.4, { freq: 932, gain: 0.03 }); break;
      case "spade": N(0.05, { freq: 1800, q: 6, gain: 0.08 }); S(0.06, { type: "square", freq: 1200, gain: 0.015 }); break;
      case "thunder": N(k ? 0.8 : 0.5, { type: "lowpass", freq: 3000, freqEnd: 200, gain: k ? 0.3 : 0.2, attack: 0.001, verb: 0.4 }); S(0.1, { type: "square", freq: 1600, freqEnd: 400, gain: 0.03 }); break;
      case "throw": N(0.12, { freq: 1200, freqEnd: 600, q: 2, gain: 0.05 }); break;
      case "splash": N(0.25, { type: "lowpass", freq: 1800, freqEnd: 400, gain: 0.12 }); S(0.15, { freq: 900, freqEnd: 1500, gain: 0.03 }); break;
      case "splat": N(0.3, { type: "lowpass", freq: 700, freqEnd: 150, gain: 0.25 }); break;
      case "hook": S(0.15, { type: "sawtooth", freq: 300, freqEnd: 900, gain: 0.04 }); N(0.12, { freq: 3500, q: 5, gain: 0.05 }); break;
      case "thud": S(0.14, { freq: 140, freqEnd: 60, gain: 0.18 }); N(0.08, { freq: 500, gain: 0.1 }); break;
      case "hit": N(0.05, { freq: 1400 + Math.random() * 600, q: 2, gain: 0.06 }); break;
      case "kill": S(0.1, { type: "triangle", freq: k ? 220 : 380 + Math.random() * 80, freqEnd: k ? 80 : 160, gain: k ? 0.12 : 0.05 }); N(0.08, { type: "lowpass", freq: 1200, gain: 0.05 }); break;
      case "boom": S(0.5, { freq: k ? 70 : 100, freqEnd: 30, gain: 0.35, verb: 0.3 }); N(0.45, { type: "lowpass", freq: 2400, freqEnd: 200, gain: 0.3, verb: 0.3 }); break;
      // Pickups.
      case "gem": S(0.09, { type: "sine", freq: hz(76 + Math.min(k, 24) * 0.5), gain: 0.05 }); break;
      case "ember": S(0.12, { type: "triangle", freq: 1560, gain: 0.05 }); S(0.12, { freq: 2340, gain: 0.02 }); break;
      case "heal": [0, 4, 7, 12].forEach((n, i) => at(i * 0.05, (tt) => this.#tone(d, tt, 0.3, { type: "sine", freq: hz(72 + n), gain: 0.07 }))); break;
      case "magnet": S(0.6, { type: "sine", freq: 300, freqEnd: 1200, gain: 0.08, verb: 0.3 }); break;
      case "ward": [76, 83, 88].forEach((n, i) => at(i * 0.05, (tt) => this.#tone(d, tt, 0.9, { type: "sine", freq: hz(n), gain: 0.05, verb: 0.7 }))); N(0.6, { type: "highpass", freq: 5000, gain: 0.04, verb: 0.5 }); break;
      case "draught": N(0.35, { freq: 500, freqEnd: 2600, q: 1.5, gain: 0.1 }); S(0.3, { type: "triangle", freq: 440, freqEnd: 1100, gain: 0.06 }); break;
      case "achieve": [67, 72, 76, 79, 84].forEach((n, i) => at(i * 0.09, (tt) => this.#tone(d, tt, 1.2, { type: "triangle", freq: hz(n), gain: 0.08, verb: 0.7 }))); break;
      case "freeze": N(1.2, { type: "highpass", freq: 6000, gain: 0.08, verb: 0.5 }); S(1.2, { freq: 1760, freqEnd: 880, gain: 0.05, verb: 0.5 }); break;
      case "chestGet": S(0.2, { type: "triangle", freq: 660, freqEnd: 990, gain: 0.1 }); break;
      case "chest": [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => at(i * 0.07, (tt) => this.#tone(d, tt, 0.5, { type: "triangle", freq: hz(n + (k ? 2 : 0)), gain: 0.08, verb: 0.5 }))); break;
      case "levelup": [67, 71, 74, 79].forEach((n, i) => at(i * 0.06, (tt) => this.#tone(d, tt, 0.4, { type: "triangle", freq: hz(n), gain: 0.09, verb: 0.4 }))); break;
      case "pick": S(0.2, { type: "triangle", freq: 880, freqEnd: 1320, gain: 0.09 }); break;
      case "reroll": N(0.2, { freq: 2000, freqEnd: 800, q: 3, gain: 0.06 }); break;
      case "banish": S(0.4, { type: "sawtooth", freq: 300, freqEnd: 60, gain: 0.05 }); break;
      case "candle": N(0.15, { freq: 3000, q: 3, gain: 0.06 }); S(0.1, { type: "triangle", freq: 1200, freqEnd: 600, gain: 0.05 }); break;
      // Hero.
      case "hurt": S(0.16, { type: "square", freq: 220, freqEnd: 110, gain: 0.06 }); N(0.1, { type: "lowpass", freq: 900, gain: 0.14 }); break;
      case "death": S(2, { type: "sawtooth", freq: 220, freqEnd: 40, gain: 0.12, verb: 0.6 }); N(1.5, { type: "lowpass", freq: 800, freqEnd: 100, gain: 0.2, verb: 0.6 }); break;
      case "revive": [60, 67, 72, 79, 84].forEach((n, i) => at(i * 0.08, (tt) => this.#tone(d, tt, 0.8, { type: "triangle", freq: hz(n), gain: 0.1, verb: 0.6 }))); break;
      case "active_flare": N(0.8, { type: "lowpass", freq: 5000, freqEnd: 300, gain: 0.25, verb: 0.5 }); S(0.9, { freq: 880, freqEnd: 220, gain: 0.1, verb: 0.5 }); break;
      case "active_tumble": N(0.2, { freq: 900, freqEnd: 300, q: 1, gain: 0.12 }); break;
      case "active_sanctuary": [60, 64, 67, 72].forEach((n) => S(1.8, { freq: hz(n), gain: 0.06, verb: 0.8, attack: 0.05 })); break;
      case "active_dig": N(0.5, { type: "lowpass", freq: 600, freqEnd: 120, gain: 0.3 }); break;
      // Monsters.
      case "spit": N(0.1, { freq: 800, freqEnd: 300, q: 3, gain: 0.05 }); break;
      case "lunge": N(0.15, { freq: 600, q: 1, gain: 0.07 }); S(0.12, { type: "sawtooth", freq: 160, freqEnd: 260, gain: 0.03 }); break;
      case "dive": N(0.4, { freq: 1600, freqEnd: 400, q: 2, gain: 0.06 }); break;
      case "charge": S(0.5, { type: "sawtooth", freq: 90, freqEnd: 60, gain: 0.1 }); N(0.5, { type: "lowpass", freq: 400, gain: 0.12 }); break;
      case "slam": S(0.7, { freq: 60, freqEnd: 28, gain: 0.45, verb: 0.4 }); N(0.5, { type: "lowpass", freq: 900, freqEnd: 100, gain: 0.3, verb: 0.3 }); break;
      case "submerge": N(0.9, { type: "lowpass", freq: 500, freqEnd: 90, gain: 0.25 }); S(0.9, { freq: 200, freqEnd: 50, gain: 0.08 }); break;
      case "lob": N(0.2, { freq: 400, q: 2, gain: 0.1 }); break;
      case "howl": S(1.4, { type: "sawtooth", freq: 300, freqEnd: 520, gain: 0.05, verb: 0.7, attack: 0.3 }); break;
      case "roar": S(1.2, { type: "sawtooth", freq: 110, freqEnd: 55, gain: 0.14, verb: 0.6, attack: 0.1 }); N(1, { type: "lowpass", freq: 700, gain: 0.2, verb: 0.5, attack: 0.1 }); break;
      case "shards": N(0.4, { type: "highpass", freq: 4000, gain: 0.1 }); break;
      case "blink": S(0.4, { freq: 1200, freqEnd: 200, gain: 0.07, verb: 0.5 }); break;
      case "orbs": S(0.5, { type: "triangle", freq: 440, freqEnd: 880, gain: 0.06, verb: 0.5 }); break;
      case "mend": [72, 76, 79].forEach((n, i) => at(i * 0.07, (tt) => this.#tone(d, tt, 0.5, { type: "sine", freq: hz(n), gain: 0.05, verb: 0.6 }))); break;
      case "summon": S(0.8, { type: "sawtooth", freq: 80, freqEnd: 160, gain: 0.07, verb: 0.5 }); break;
      case "elite": case "horde": S(1.4, { type: "sawtooth", freq: name === "elite" ? 98 : 73, gain: 0.08, verb: 0.7, attack: 0.2 }); S(1.4, { type: "sawtooth", freq: name === "elite" ? 147 : 110, gain: 0.05, verb: 0.7, attack: 0.2, detune: 10 }); break;
      case "bossArrive": [0, 0.5, 1].forEach((dt) => at(dt, (tt) => { this.#tone(d, tt, 0.9, { freq: 55, freqEnd: 40, gain: 0.35, verb: 0.6 }); this.#noise(d, tt, 0.6, { type: "lowpass", freq: 300, gain: 0.25 }); })); S(3, { type: "sawtooth", freq: 110, freqEnd: 104, gain: 0.07, verb: 0.8, attack: 0.5 }); break;
      case "eliteDie": case "bossDie": S(name === "bossDie" ? 2 : 0.8, { type: "sawtooth", freq: 150, freqEnd: 30, gain: 0.15, verb: 0.7 }); N(1, { type: "lowpass", freq: 2000, freqEnd: 100, gain: 0.3, verb: 0.5 }); break;
      case "beacon": [48, 55, 60, 64, 67, 72, 76, 79].forEach((n, i) => at(i * 0.11, (tt) => this.#tone(d, tt, 2.5, { type: "triangle", freq: hz(n), gain: 0.08, verb: 0.9, attack: 0.03 }))); N(2.5, { type: "bandpass", freq: 800, q: 0.5, gain: 0.08, attack: 0.5, verb: 0.5 }); break;
      default:
    }
  }

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
    out.gain.setTargetAtTime(1, c.currentTime, 1.5);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    out.connect(lp).connect(this.musicBus);
    const rv = c.createGain(); rv.gain.value = 0.5; lp.connect(rv).connect(this.verb);
    const m = { name, out, next: c.currentTime + 0.15, step: 0, timer: 0 };
    this.song = m;
    const beat = 60 / S.bpm / 2;          // eighth notes
    let lead = 0;
    const schedule = () => {
      if (this.song !== m) return;
      while (m.next < c.currentTime + 0.4) {
        const i = m.step % 16, bar = Math.floor(m.step / 16) % 4;
        const root = S.root + S.prog[bar];
        const t = m.next, I = name === "menu" || name === "win" ? 0.25 : this.intensity;
        if (i === 0) {
          // Pad: root, third-ish and fifth, long and soft.
          for (const n of [0, S.scale[2] ?? 3, 7]) this.#tone(out, t, beat * 16, { type: "sine", freq: hz(root + 12 + n), gain: 0.028, attack: 0.8 });
          this.#tone(out, t, beat * 16, { type: "triangle", freq: hz(root - 12), gain: 0.05, attack: 0.3 });
        }
        // Bass pulse.
        if (i % 4 === 0) this.#tone(out, t, beat * 3, { type: "triangle", freq: hz(root), gain: 0.07 + I * 0.03, attack: 0.01 });
        // Drums: kick on the beat once things heat up, a tom roll near the boss.
        if (name !== "menu" && name !== "win") {
          if (i % 4 === 0 && (I > 0.15 || i === 0)) { this.#tone(out, t, 0.25, { freq: 90, freqEnd: 40, gain: 0.18 + I * 0.1 }); }
          if (i % 8 === 4 && I > 0.35) this.#noise(out, t, 0.12, { type: "bandpass", freq: 1800, q: 0.8, gain: 0.05 + I * 0.04 });
          if (i % 2 === 1 && I > 0.6) this.#noise(out, t, 0.03, { type: "highpass", freq: 7000, gain: 0.02 });
          if (I > 0.85 && i >= 12) this.#tone(out, t, 0.18, { freq: 140 - (i - 12) * 15, freqEnd: 70, gain: 0.12 });
        }
        // Lead: a wandering line on the scale.
        const density = name === "menu" ? 0.25 : 0.3 + I * 0.4;
        if (Math.random() < density && i % 2 === 0) {
          lead = clamp(lead + Math.floor(Math.random() * 5) - 2, 0, S.scale.length * 2 - 1);
          const oct = Math.floor(lead / S.scale.length), deg = S.scale[lead % S.scale.length];
          this.#tone(out, t, beat * (1.5 + Math.random() * 2), { type: S.lead, freq: hz(root + 24 + deg + oct * 12), gain: S.lead === "sawtooth" || S.lead === "square" ? 0.012 : 0.03, attack: 0.02 });
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
