// ── Sound ────────────────────────────────────────────────────────────────
// Everything synthesised with WebAudio, as in the other games: guns are
// filtered noise bursts over a low thump, bugs are chitters and squelches,
// the music is a slow dark drone with a pulse and drums that come in with
// the fight (intensity 0…1) and a heavier set for the boss.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

const GAP = { rifle: 0.04, pistol: 0.05, step: 0.12, chitter: 0.12, bugHit: 0.04, armor: 0.05, splat: 0.05, spark: 0.04, bite: 0.08, hurt: 0.15, spit: 0.08, acid: 0.06, die: 0.05, emerge: 0.1, allyRifle: 0.06, shield: 0.1 };

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, sfx: 0.85, music: 0.5 };
    this.last = {};
    this.lx = 0; this.lz = 0; this.lyaw = 0;
    this.intensity = 0; this.boss = false;
    this.loops = {};
    this.musicOn = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 4;
      this.master.connect(comp).connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.verb = c.createConvolver(); this.verb.buffer = this.#impulse(2.6);
      const vg = c.createGain(); vg.gain.value = 0.35; this.verb.connect(vg).connect(this.master);
      this.noiseBuf = this.#makeNoise(2);
      this.setVolumes(this.vol);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  setVolumes(v) {
    this.vol = { ...this.vol, ...v };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.03);
    this.sfx.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.5 * (this.ducked ? 0.45 : 1), t, 0.05);
  }
  duck(on) { this.ducked = on; this.setVolumes({}); }
  suspend(yes) { if (this.ctx) { if (yes) this.ctx.suspend(); else this.ctx.resume(); } }
  listener(x, z, yaw) { this.lx = x; this.lz = z; this.lyaw = yaw; }

  #makeNoise(sec) {
    const c = this.ctx, buf = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  #impulse(sec) {
    const c = this.ctx, n = c.sampleRate * sec, buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
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
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
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

  // A one-shot. x, z: where (panned and softened with distance).
  play(name, k = 0, x, z) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < (GAP[name] ?? 0.02)) return;
    this.last[name] = now;
    let d = this.sfx;
    if (x !== undefined) {
      const dx = x - this.lx, dz = z - this.lz, dist = Math.hypot(dx, dz);
      if (dist > 120) return;
      const sn = Math.sin(this.lyaw), cs = Math.cos(this.lyaw);
      const side = (dx * cs - dz * sn) / Math.max(dist, 0.01);
      const g = this.ctx.createGain(); g.gain.value = 1 / (1 + dist / 12);
      const p = this.ctx.createStereoPanner(); p.pan.value = clamp(side, -1, 1) * Math.min(1, dist / 4) * 0.85;
      g.connect(p).connect(this.sfx);
      d = g;
      setTimeout(() => { try { g.disconnect(); p.disconnect(); } catch { /* gone */ } }, 4000);
    }
    const t = now + 0.005, N = (...a) => this.#noise(d, t, ...a), S = (...a) => this.#tone(d, t, ...a);
    const at = (dt, fn) => fn(t + dt);
    switch (name) {
      case "click": S(0.06, { type: "triangle", freq: 900, freqEnd: 1300, gain: 0.08 }); break;
      case "back": S(0.08, { type: "triangle", freq: 900, freqEnd: 500, gain: 0.08 }); break;
      // Guns.
      case "rifle": N(0.09, { type: "lowpass", freq: 5000, freqEnd: 900, gain: 0.32 }); S(0.08, { freq: 160, freqEnd: 55, gain: 0.3 }); N(0.25, { type: "bandpass", freq: 900, freqEnd: 300, q: 0.8, gain: 0.06, verb: 0.25 }); break;
      case "allyRifle": N(0.08, { type: "lowpass", freq: 4200, freqEnd: 800, gain: 0.22 }); S(0.07, { freq: 150, freqEnd: 60, gain: 0.18 }); break;
      case "pistol": N(0.11, { type: "lowpass", freq: 6000, freqEnd: 1200, gain: 0.3 }); S(0.1, { freq: 220, freqEnd: 70, gain: 0.25 }); N(0.3, { type: "bandpass", freq: 1200, freqEnd: 400, q: 0.8, gain: 0.05, verb: 0.3 }); break;
      case "launcher": S(0.2, { freq: 120, freqEnd: 45, gain: 0.4 }); N(0.18, { type: "bandpass", freq: 600, freqEnd: 200, q: 0.8, gain: 0.25 }); break;
      case "blast": N(1.4, { type: "lowpass", freq: 3200, freqEnd: 120, gain: 0.6, verb: 0.5 }); S(0.8, { freq: 90, freqEnd: 28, gain: 0.55 }); at(0.05, (tt) => this.#noise(d, tt, 0.6, { type: "highpass", freq: 3000, freqEnd: 800, gain: 0.08 })); break;
      case "overheat": N(0.8, { type: "highpass", freq: 3000, freqEnd: 7000, gain: 0.1, attack: 0.02 }); S(0.3, { type: "square", freq: 300, freqEnd: 150, gain: 0.04 }); break;
      case "cooled": S(0.12, { type: "triangle", freq: 1320, gain: 0.05 }); break;
      case "dry": S(0.05, { type: "square", freq: 1800, gain: 0.03 }); N(0.03, { freq: 4000, q: 4, gain: 0.05 }); break;
      case "reload": N(0.05, { freq: 2200, q: 4, gain: 0.08 }); at(0.25, (tt) => this.#noise(d, tt, 0.06, { freq: 1500, q: 3, gain: 0.08 })); break;
      case "reloaded": N(0.05, { freq: 3000, q: 5, gain: 0.08 }); at(0.06, (tt) => this.#noise(d, tt, 0.04, { freq: 1800, q: 5, gain: 0.07 })); break;
      case "swap": N(0.06, { freq: 1600, q: 3, gain: 0.07 }); at(0.12, (tt) => this.#noise(d, tt, 0.05, { freq: 2600, q: 4, gain: 0.06 })); break;
      case "pickup": [76, 83].forEach((n, i) => at(i * 0.06, (tt) => this.#tone(d, tt, 0.12, { type: "triangle", freq: hz(n), gain: 0.06 }))); N(0.08, { freq: 2000, q: 3, gain: 0.06 }); break;
      case "ammo": N(0.12, { freq: 1800, q: 2, gain: 0.07 }); at(0.08, (tt) => this.#noise(d, tt, 0.1, { freq: 1300, q: 2, gain: 0.06 })); break;
      // Hits.
      case "spark": S(0.05, { type: "triangle", freq: 2400 + Math.random() * 800, freqEnd: 1500, gain: 0.02 }); break;
      case "armor": S(0.12, { type: "triangle", freq: 1900 + Math.random() * 300, freqEnd: 1700, gain: 0.05 }); N(0.04, { type: "highpass", freq: 5000, gain: 0.04 }); break;
      case "splat": N(0.1, { type: "lowpass", freq: 1400, freqEnd: 300, gain: 0.12 }); break;
      case "hitmark": S(0.04, { type: "square", freq: 2600, gain: 0.02 }); break;
      // You.
      case "step": N(0.06, { type: "lowpass", freq: 700 + Math.random() * 300, gain: 0.025 * (k || 1) }); break;
      case "jump": N(0.08, { freq: 700, freqEnd: 1200, q: 1, gain: 0.03 }); break;
      case "land": N(0.14, { type: "lowpass", freq: 500, freqEnd: 120, gain: 0.1 + Math.min(0.1, k * 0.01) }); break;
      case "dash": N(0.22, { type: "bandpass", freq: 500, freqEnd: 2000, q: 0.7, gain: 0.1 }); S(0.12, { type: "sine", freq: 180, freqEnd: 80, gain: 0.08 }); break;
      case "cover": N(0.1, { type: "lowpass", freq: 600, freqEnd: 150, gain: 0.12 }); S(0.06, { freq: 140, freqEnd: 70, gain: 0.08 }); break;
      case "hurt": S(0.16, { type: "sawtooth", freq: 180, freqEnd: 90, gain: 0.05 }); N(0.14, { type: "lowpass", freq: 900, gain: 0.1 }); break;
      case "shield": S(0.18, { type: "sine", freq: 900, freqEnd: 500, gain: 0.06 }); N(0.12, { type: "bandpass", freq: 3000, q: 3, gain: 0.04 }); break;
      case "downed": S(1.2, { type: "sine", freq: 300, freqEnd: 80, gain: 0.12, verb: 0.5 }); N(1.0, { type: "lowpass", freq: 1200, freqEnd: 100, gain: 0.08 }); break;
      case "revived": [64, 71, 76].forEach((n, i) => at(i * 0.08, (tt) => this.#tone(d, tt, 0.3, { type: "triangle", freq: hz(n), gain: 0.06 }))); break;
      case "use": S(0.07, { type: "square", freq: 1200, gain: 0.03 }); at(0.08, (tt) => this.#tone(d, tt, 0.08, { type: "square", freq: 1600, gain: 0.03 })); break;
      case "checkpoint": [72, 76, 79].forEach((n, i) => at(i * 0.09, (tt) => this.#tone(d, tt, 0.4, { type: "triangle", freq: hz(n), gain: 0.05, verb: 0.3 }))); break;
      case "objective": [67, 74].forEach((n, i) => at(i * 0.12, (tt) => this.#tone(d, tt, 0.5, { type: "sine", freq: hz(n), gain: 0.07, verb: 0.4 }))); break;
      case "objDone": [74, 79, 86].forEach((n, i) => at(i * 0.1, (tt) => this.#tone(d, tt, 0.6, { type: "triangle", freq: hz(n), gain: 0.06, verb: 0.4 }))); break;
      case "log": [88, 84].forEach((n, i) => at(i * 0.07, (tt) => this.#tone(d, tt, 0.1, { type: "square", freq: hz(n), gain: 0.025 }))); break;
      case "hint": S(0.15, { type: "sine", freq: 1100, gain: 0.04 }); break;
      // Bugs.
      case "chitter": [0, 0.05, 0.1, 0.16].forEach((dt) => at(dt, (tt) => this.#noise(d, tt, 0.04, { freq: 2600 + Math.random() * 1500, q: 6, gain: 0.08 }))); break;
      case "bite": N(0.1, { freq: 2200, q: 2, gain: 0.12 }); S(0.06, { type: "square", freq: 300, freqEnd: 150, gain: 0.05 }); break;
      case "leap": N(0.25, { freq: 1600, freqEnd: 3200, q: 2, gain: 0.08 }); break;
      case "spit": N(0.25, { type: "bandpass", freq: 700, freqEnd: 1600, q: 1.5, gain: 0.12 }); S(0.2, { type: "sine", freq: 400, freqEnd: 900, gain: 0.05 }); break;
      case "acid": N(0.35, { type: "highpass", freq: 2500, freqEnd: 5000, gain: 0.08, attack: 0.02 }); N(0.15, { type: "lowpass", freq: 800, gain: 0.08 }); break;
      case "windup": N(0.8, { type: "bandpass", freq: 300, freqEnd: 900, q: 2, gain: 0.12, attack: 0.3 }); S(0.8, { type: "sawtooth", freq: 60, freqEnd: 90, gain: 0.06, attack: 0.3 }); break;
      case "charge": N(0.5, { type: "lowpass", freq: 900, gain: 0.18 }); S(0.4, { type: "sawtooth", freq: 90, freqEnd: 55, gain: 0.1 }); break;
      case "stun": S(0.3, { freq: 120, freqEnd: 50, gain: 0.3 }); N(0.3, { type: "lowpass", freq: 1200, freqEnd: 200, gain: 0.25 }); break;
      case "shriek": S(1.0, { type: "sawtooth", freq: 1300, freqEnd: 2600, gain: 0.07, attack: 0.08, verb: 0.6 }); S(1.0, { type: "square", freq: 1950, freqEnd: 3100, gain: 0.03, attack: 0.1, verb: 0.6 }); N(0.9, { freq: 3500, q: 3, gain: 0.08, attack: 0.1, verb: 0.5 }); break;
      case "die": N(0.25, { type: "lowpass", freq: 1500, freqEnd: 200, gain: 0.15 }); S(0.2, { type: "triangle", freq: 500, freqEnd: 120, gain: 0.05 }); break;
      case "emerge": N(0.6, { type: "lowpass", freq: 700, freqEnd: 150, gain: 0.2, attack: 0.1 }); break;
      // The Warden.
      case "roar": S(1.6, { type: "sawtooth", freq: 70, freqEnd: 45, gain: 0.18, attack: 0.2, verb: 0.6 }); N(1.6, { type: "bandpass", freq: 400, freqEnd: 200, q: 1, gain: 0.3, attack: 0.2, verb: 0.6 }); S(1.4, { type: "sawtooth", freq: 140, freqEnd: 95, gain: 0.06, attack: 0.3 }); break;
      case "slam": S(0.9, { freq: 60, freqEnd: 25, gain: 0.6 }); N(1.2, { type: "lowpass", freq: 1500, freqEnd: 100, gain: 0.5, verb: 0.5 }); break;
      case "swipe": N(0.3, { type: "bandpass", freq: 400, freqEnd: 1600, q: 0.8, gain: 0.2 }); break;
      case "sacPop": N(0.6, { type: "lowpass", freq: 2000, freqEnd: 200, gain: 0.4 }); S(0.4, { freq: 300, freqEnd: 60, gain: 0.25 }); break;
      case "quake": N(2.4, { type: "lowpass", freq: 300, freqEnd: 60, gain: 0.5, attack: 0.3, verb: 0.4 }); S(2.2, { freq: 40, freqEnd: 28, gain: 0.4, attack: 0.3 }); break;
      // Things.
      case "powerOn": S(2.0, { type: "sawtooth", freq: 50, freqEnd: 110, gain: 0.08, attack: 0.5 }); [60, 67, 72].forEach((n, i) => at(1.2 + i * 0.12, (tt) => this.#tone(d, tt, 0.6, { type: "triangle", freq: hz(n), gain: 0.05, verb: 0.4 }))); break;
      case "genSpin": S(4, { type: "sawtooth", freq: 40, freqEnd: 140, gain: 0.08, attack: 0.5 }); N(4, { type: "bandpass", freq: 300, freqEnd: 2600, q: 2, gain: 0.1, attack: 1 }); break;
      case "door": N(1.6, { type: "lowpass", freq: 400, gain: 0.15, attack: 0.1 }); S(1.6, { type: "sawtooth", freq: 55, gain: 0.05, attack: 0.1 }); at(1.6, (tt) => this.#noise(d, tt, 0.2, { type: "lowpass", freq: 800, gain: 0.2 })); break;
      case "beep": S(0.08, { type: "square", freq: 1800, gain: 0.03 }); break;
      case "relay": [79, 86, 91].forEach((n, i) => at(i * 0.12, (tt) => this.#tone(d, tt, 0.15, { type: "square", freq: hz(n), gain: 0.03 }))); break;
    }
  }

  // ── Held loops (the laser, the dropship, the generator's hum) ──
  loop(name, on, k = 1, x, z) {
    if (!this.ctx) return;
    let L = this.loops[name];
    if (on && !L) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0;
      const p = c.createStereoPanner();
      g.connect(p).connect(this.sfx);
      const nodes = [];
      if (name === "laser") {
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = 220;
        const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = 880;
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 3;
        o.connect(f).connect(g); o2.connect(g); o.start(); o2.start(); nodes.push(o, o2);
        L = { g, p, nodes, base: 0.05, set: (kk) => { o.frequency.value = 200 + kk * 120; } };
      } else {
        const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = name === "dropship" ? 500 : 300;
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = name === "dropship" ? 70 : 55;
        const og = c.createGain(); og.gain.value = 0.2;
        src.connect(f).connect(g); o.connect(og).connect(g); src.start(); o.start(); nodes.push(src, o);
        L = { g, p, nodes, base: name === "dropship" ? 0.35 : 0.12, set: (kk) => { f.frequency.value = 200 + kk * 600; } };
      }
      this.loops[name] = L;
    }
    if (!L) return;
    const t = this.ctx.currentTime;
    let vol = on ? L.base * k : 0;
    if (on && x !== undefined) {
      const dx = x - this.lx, dz = z - this.lz, dist = Math.hypot(dx, dz);
      vol /= 1 + dist / 15;
      const sn = Math.sin(this.lyaw), cs = Math.cos(this.lyaw);
      L.p.pan.setTargetAtTime(clamp((dx * cs - dz * sn) / Math.max(dist, 0.01), -1, 1) * 0.7, t, 0.05);
    }
    L.set?.(k);
    L.g.gain.setTargetAtTime(vol, t, 0.06);
    if (!on) {
      clearTimeout(L.kill);
      L.kill = setTimeout(() => { if (this.loops[name] === L && L.g.gain.value < 0.001) { for (const n of L.nodes) try { n.stop(); } catch { /* */ } L.g.disconnect(); delete this.loops[name]; } }, 800);
    } else clearTimeout(L.kill);
  }

  // ── Music: a drone, a pulse and drums by intensity ──
  music(on) {
    this.musicOn = on;
    if (!this.ctx || !on || this.musicTimer) return;
    this.nextBar = this.ctx.currentTime + 0.1;
    this.bar = 0;
    this.musicTimer = setInterval(() => this.#schedule(), 120);
  }
  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; this.musicOn = false; }
  #schedule() {
    if (!this.ctx || !this.musicOn) return;
    const c = this.ctx, d = this.musicBus;
    const bpm = this.boss ? 104 : 84, beat = 60 / bpm, barLen = beat * 4;
    while (this.nextBar < c.currentTime + 0.4) {
      const t0 = this.nextBar, I = this.intensity, i = this.bar++;
      const prog = this.boss ? [0, -2, -4, -5] : [0, 3, -2, -4];
      const root = 38 + prog[i % 4];
      // Drone: two detuned saws through a slow low-pass.
      for (const det of [-6, 6]) {
        const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(root); o.detune.value = det;
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(220 + I * 500, t0); f.Q.value = 2;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t0 + barLen * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + barLen * 1.05);
        o.connect(f).connect(g).connect(d); o.start(t0); o.stop(t0 + barLen * 1.1);
      }
      // A high, lonely pad note now and then.
      if (i % 2 === 0) this.#tone(d, t0 + beat, barLen * 1.6, { type: "triangle", freq: hz(root + 31 + [0, 3, 7, 10][(i >> 1) % 4]), gain: 0.018 * (1 - I * 0.5), attack: barLen * 0.5, verb: 0.8 });
      // Pulse and drums with the fight.
      if (I > 0.15) for (let s = 0; s < 8; s++) {
        const ts = t0 + s * beat / 2;
        this.#tone(d, ts, beat * 0.4, { type: "square", freq: hz(root + 12), gain: 0.025 * I, attack: 0.005 });
        if (s % 4 === 0) { this.#tone(d, ts, 0.25, { freq: 110, freqEnd: 40, gain: 0.35 * I }); }
        if (s % 4 === 2 && I > 0.4) this.#noise(d, ts, 0.18, { type: "bandpass", freq: 1800, q: 0.8, gain: 0.12 * I });
        if (I > 0.6) this.#noise(d, ts + beat / 4, 0.04, { type: "highpass", freq: 7000, gain: 0.05 * I });
      }
      this.nextBar += barLen;
    }
  }
}
