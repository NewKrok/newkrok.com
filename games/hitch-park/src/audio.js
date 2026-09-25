// ── Sound ────────────────────────────────────────────────────────────────
// Everything is synthesised with WebAudio — no sample files. The engine and
// the tyre squeal are continuous voices driven every frame; the rest are
// one-shots. The context starts on the first user gesture (browsers keep
// audio locked until then).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, sfx: 0.9, music: 0.5 };
    this.engine = null;
    this.squeal = null;
    this.beepT = 0;
    this.hazardT = 0;
    this.music = null;
    this.musicWanted = false;
  }

  // Call from a user gesture.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.connect(this.master);
      this.musicBus = c.createGain();
      this.musicBus.connect(this.master);
      this.noiseBuf = this.#makeNoise(2);
      this.setVolumes(this.vol);
      if (this.musicWanted) this.#startMusic();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setVolumes(v) {
    this.vol = { ...this.vol, ...v };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.03);
    this.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.5, t, 0.05);
  }

  // Pause everything when the tab is hidden.
  suspend(yes) {
    if (!this.ctx) return;
    if (yes) this.ctx.suspend(); else this.ctx.resume();
  }

  #makeNoise(seconds) {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  #noise(dest, t0, dur, { type = "bandpass", freq = 1000, q = 1, gain = 0.5, attack = 0.002, freqEnd = null } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  #tone(dest, t0, dur, { type = "sine", freq = 440, freqEnd = null, gain = 0.3, attack = 0.005 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // ── One-shots ──────────────────────────────────────────────────────────
  play(name, k = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005, d = this.sfx;
    switch (name) {
      case "hover":
        this.#tone(d, t, 0.05, { type: "triangle", freq: 1400, gain: 0.04 });
        break;
      case "click":
        this.#tone(d, t, 0.08, { type: "triangle", freq: 880, freqEnd: 1320, gain: 0.12 });
        break;
      case "back":
        this.#tone(d, t, 0.09, { type: "triangle", freq: 990, freqEnd: 620, gain: 0.1 });
        break;
      case "locked":
        this.#tone(d, t, 0.12, { type: "square", freq: 180, gain: 0.06 });
        break;
      case "bump": {
        // Rubber-on-metal knock: a low thud plus a short plastic click.
        const g = clamp(0.35 * k, 0.12, 0.5);
        this.#tone(d, t, 0.22, { freq: 120, freqEnd: 50, gain: g });
        this.#noise(d, t, 0.12, { freq: 900, q: 1.2, gain: g * 0.7 });
        break;
      }
      case "crash": {
        this.#tone(d, t, 0.45, { freq: 90, freqEnd: 35, gain: 0.6 });
        this.#noise(d, t, 0.55, { type: "lowpass", freq: 3500, freqEnd: 400, gain: 0.55 });
        for (const f of [420, 610, 890]) this.#tone(d, t + 0.01, 0.35, { type: "square", freq: f, freqEnd: f * 0.8, gain: 0.03 });
        break;
      }
      case "cone":
        this.#noise(d, t, 0.08, { freq: 1600, q: 3, gain: 0.3 });
        this.#tone(d, t, 0.1, { type: "triangle", freq: 520, freqEnd: 300, gain: 0.12 });
        break;
      case "go":
        this.#tone(d, t, 0.12, { type: "square", freq: 660, gain: 0.07 });
        this.#tone(d, t + 0.14, 0.28, { type: "square", freq: 990, gain: 0.08 });
        break;
      case "gear":
        this.#noise(d, t, 0.05, { freq: 2400, q: 4, gain: 0.08 });
        this.#tone(d, t, 0.04, { type: "square", freq: 300, gain: 0.03 });
        break;
      case "parked": {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          this.#tone(d, t + i * 0.09, 0.5, { type: "triangle", freq: f, gain: 0.14 });
          this.#tone(d, t + i * 0.09, 0.4, { type: "sine", freq: f * 2, gain: 0.04 });
        });
        break;
      }
      case "star":
        this.#tone(d, t, 0.35, { type: "triangle", freq: 880 * (1 + k * 0.25), gain: 0.12 });
        this.#tone(d, t + 0.03, 0.3, { type: "sine", freq: 1760 * (1 + k * 0.25), gain: 0.05 });
        break;
      case "nostar":
        this.#tone(d, t, 0.18, { type: "triangle", freq: 330, freqEnd: 260, gain: 0.07 });
        break;
      case "best":
        [784, 988, 1175, 1568].forEach((f, i) => this.#tone(d, t + i * 0.07, 0.3, { type: "square", freq: f, gain: 0.04 }));
        break;
      case "hazard":
        this.#noise(d, t, 0.02, { type: "highpass", freq: 3000, gain: 0.07 });
        break;
      case "sensor":
        this.#tone(d, t, 0.07, { type: "sine", freq: 2000, gain: 0.07 * k });
        break;
      default:
    }
  }

  // ── Continuous voices, driven every frame ──────────────────────────────
  #ensureEngine() {
    if (this.engine) return;
    const c = this.ctx;
    // A soft, low engine: a sine at the firing rate, a sub an octave down
    // and a little filtered noise for rumble — no buzzy saw or square.
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    lp.Q.value = 0.5;
    const gain = c.createGain();
    gain.gain.value = 0;
    lp.connect(gain).connect(this.sfx);
    const o1 = c.createOscillator(); o1.type = "sine";
    const o2 = c.createOscillator(); o2.type = "sine";
    const o3 = c.createOscillator(); o3.type = "triangle";
    const g1 = c.createGain(); g1.gain.value = 0.7;
    const g2 = c.createGain(); g2.gain.value = 0.55;
    const g3 = c.createGain(); g3.gain.value = 0.16;
    o1.connect(g1).connect(lp); o2.connect(g2).connect(lp); o3.connect(g3).connect(lp);
    const rum = c.createBufferSource();
    rum.buffer = this.noiseBuf; rum.loop = true;
    const rbp = c.createBiquadFilter(); rbp.type = "bandpass"; rbp.frequency.value = 90; rbp.Q.value = 0.9;
    const rg = c.createGain(); rg.gain.value = 0.35;
    rum.connect(rbp).connect(rg).connect(lp);
    // A slow, shallow wobble so the idle breathes a little.
    const lfo = c.createOscillator(); lfo.frequency.value = 3.2;
    const lfoG = c.createGain(); lfoG.gain.value = 0.6;
    lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency);
    o1.start(); o2.start(); o3.start(); rum.start(); lfo.start();
    // Tyre squeal on hard ground: noise rung through two narrow resonances
    // (the rubber "singing"), their pitch drifting unevenly, with a flutter.
    const sq = c.createBufferSource(); sq.buffer = this.noiseBuf; sq.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1750; bp.Q.value = 16;
    const bp2 = c.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 2600; bp2.Q.value = 20;
    const bp2g = c.createGain(); bp2g.gain.value = 0.45;
    for (const [f, depth, filt] of [[5.3, 70, bp], [7.7, 50, bp], [4.1, 90, bp2], [11.3, 40, bp2]]) {
      const o = c.createOscillator(); o.frequency.value = f;
      const g = c.createGain(); g.gain.value = depth;
      o.connect(g).connect(filt.frequency); o.start();
    }
    const flutter = c.createGain(); flutter.gain.value = 1;
    const flO = c.createOscillator(); flO.frequency.value = 13;
    const flG = c.createGain(); flG.gain.value = 0.25;
    flO.connect(flG).connect(flutter.gain); flO.start();
    const sg = c.createGain(); sg.gain.value = 0;
    sq.connect(bp).connect(flutter); sq.connect(bp2).connect(bp2g).connect(flutter);
    flutter.connect(sg).connect(this.sfx);
    sq.start();
    // On loose ground a slide is a crunch of gravel / dirt.
    const cr = c.createBufferSource();
    cr.buffer = this.noiseBuf; cr.loop = true;
    const cbp = c.createBiquadFilter(); cbp.type = "bandpass"; cbp.frequency.value = 520; cbp.Q.value = 0.7;
    const cg = c.createGain(); cg.gain.value = 0;
    cr.connect(cbp).connect(cg).connect(this.sfx);
    cr.start();
    this.engine = { o1, o2, o3, lp, gain, sg, bp, bp2, cg };
  }

  // state: { active, speed (px/s), throttle (−1…1), skid (0…1), reverse,
  //          clearance (px or Infinity), hazard (bool), dt }
  drive(s) {
    if (!this.ctx) return;
    this.#ensureEngine();
    const e = this.engine, t = this.ctx.currentTime;
    const sp = Math.abs(s.speed) / 12;                 // m/s
    const load = Math.abs(s.throttle);
    const rpm = s.truck ? 38 + sp * 6 + load * 10 : 55 + sp * 9 + load * 16;
    e.o1.frequency.setTargetAtTime(rpm, t, 0.12);
    e.o2.frequency.setTargetAtTime(rpm * 0.5, t, 0.12);
    e.o3.frequency.setTargetAtTime(rpm * 2, t, 0.12);
    e.lp.frequency.setTargetAtTime(220 + load * 260 + sp * 18, t, 0.15);
    e.gain.gain.setTargetAtTime(s.active ? (0.07 + load * 0.06 + sp * 0.003) * 1.15 : 0, t, 0.15);
    const sk = s.active ? clamp(s.skid, 0, 1) : 0;
    // Soft onset: a light scrub barely sings, a real slide does.
    e.sg.gain.setTargetAtTime(s.loose ? 0 : Math.pow(sk, 1.5) * 0.075, t, 0.06);
    e.bp.frequency.setTargetAtTime(1600 + sk * 380 + sp * 6, t, 0.1);
    e.bp2.frequency.setTargetAtTime(2450 + sk * 420 + sp * 8, t, 0.1);
    e.cg.gain.setTargetAtTime(s.loose ? sk * 0.041 : 0, t, 0.05);

    // Reversing / parking sensor: the closer the tail is to something, the
    // faster it beeps; very close is a steady tone.
    if (s.active && s.reverse) {
      const d = s.clearance;
      const period = d < 8 ? 0.09 : d < 60 ? 0.12 + (d - 8) / 52 * 0.5 : 0.9;
      this.beepT -= s.dt;
      if (this.beepT <= 0) {
        this.play("sensor", d < 60 ? 1 : 0.55);
        this.beepT = period;
      }
    } else this.beepT = 0;

    if (s.active && s.hazard) {
      this.hazardT -= s.dt;
      if (this.hazardT <= 0) { this.play("hazard"); this.hazardT = 1 / 3; }
    }
  }

  // ── Music: a soft generative loop for the menus ────────────────────────
  setMusic(on) {
    this.musicWanted = on;
    if (!this.ctx) return;
    if (on) this.#startMusic(); else this.#stopMusic();
  }

  #startMusic() {
    if (this.music) return;
    const c = this.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, c.currentTime, 1.2);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    // Simple feedback delay for space.
    const delay = c.createDelay(1); delay.delayTime.value = 0.375;
    const fb = c.createGain(); fb.gain.value = 0.32;
    delay.connect(fb).connect(delay);
    out.connect(lp).connect(this.musicBus);
    lp.connect(delay); delay.connect(this.musicBus);
    const m = { out, next: c.currentTime + 0.1, step: 0, timer: 0 };
    this.music = m;
    // I – vi – IV – V in C, one chord per bar, 8th-note arpeggios.
    const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
    const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const beat = 0.375;
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    const schedule = () => {
      if (this.music !== m) return;
      while (m.next < c.currentTime + 0.4) {
        const bar = Math.floor(m.step / 8) % 4, i = m.step % 8;
        const ch = chords[bar];
        const t = m.next;
        if (i === 0) {
          // Pad + bass at the start of each bar.
          for (const n of ch.slice(0, 3)) this.#tone(out, t, beat * 8, { type: "sine", freq: hz(n), gain: 0.035, attack: 0.4 });
          this.#tone(out, t, beat * 3, { type: "triangle", freq: hz(ch[0] - 24), gain: 0.09, attack: 0.02 });
        }
        if (i === 4) this.#tone(out, t, beat * 3, { type: "triangle", freq: hz(ch[0] - 12), gain: 0.05, attack: 0.02 });
        const n = ch[pattern[i]] + 12;
        this.#tone(out, t, beat * 1.6, { type: "triangle", freq: hz(n), gain: i % 2 ? 0.025 : 0.04, attack: 0.008 });
        if (i === 2 || i === 6) this.#noise(out, t, 0.05, { type: "highpass", freq: 7000, gain: 0.02 });
        m.next += beat / 2;
        m.step++;
      }
      m.timer = setTimeout(schedule, 120);
    };
    schedule();
  }

  #stopMusic() {
    const m = this.music;
    if (!m) return;
    this.music = null;
    clearTimeout(m.timer);
    m.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    setTimeout(() => m.out.disconnect(), 2500);
  }
}
