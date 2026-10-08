// ── Margo's voice ────────────────────────────────────────────────────────
// Spoken lines from public/voice (made by scripts/voice.mjs): English in
// every language, the text on screen follows the chosen language. She is
// on the radio, so it sounds like one: a narrow, slightly overdriven band,
// hiss and crackle under her, a squelch when she keys the mic and a little
// roger beep when she lets go. The music ducks under it. A line without a file (or with voices turned off) just
// types out with beep-talk as before.

// A soft clip: a little grit on the loud parts, like a small speaker.
const SHAPE = (() => {
  const n = 1024, a = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; a[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  return a;
})();

export class Voice {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.lines = {};
    this.el = null;
    // Lines wait for the list of voiced ones (the first would start silent);
    // a list that never comes stops holding them up after a few seconds.
    this.ready = false;
    const done = () => { this.ready = true; };
    fetch("./voice/manifest.json").then((r) => (r.ok ? r.json() : {})).then((m) => { this.lines = m; }).catch(() => {}).finally(done);
    setTimeout(done, 4000);
  }

  has(id) { return this.settings.voice !== false && !!this.lines[id]; }

  // Starts the line; returns the <audio> element (its duration arrives with
  // loadedmetadata), or null.
  play(id) {
    this.stop();
    if (!this.has(id)) return null;
    const el = new Audio(`./voice/${id}.mp3`);
    const A = this.audio;
    if (A.ctx) {
      try { el._nodes = this.radio(el); } catch { this.gain = null; }
    }
    this.el = el;
    this.setVolume();
    A.duck?.(true);
    el.addEventListener("ended", () => { if (this.el === el) this.stop(); });
    // (A pause right as it starts interrupts play(): that is not a failure.)
    el.play().catch((e) => { if (e?.name === "AbortError") return; if (this.el === el) this.stop(); el.failed = true; });
    el.addEventListener("error", () => { if (this.el === el) this.stop(); el.failed = true; });
    return el;
  }

  // The radio chain for one line: voice → band → drive → out, plus the
  // static bed and the squelch at the start.
  radio(el) {
    const A = this.audio, c = A.ctx, t = c.currentTime;
    const src = c.createMediaElementSource(el);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 380; hp.Q.value = 0.8;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3300; lp.Q.value = 0.9;
    const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1700; mid.gain.value = 6; mid.Q.value = 1;
    const drive = c.createWaveShaper(); drive.curve = SHAPE; drive.oversample = "2x";
    const pre = c.createGain(); pre.gain.value = 1.8;
    this.gain = c.createGain();
    src.connect(hp).connect(mid).connect(pre).connect(drive).connect(lp).connect(this.gain).connect(A.master);
    // Static: steady hiss, and sparse crackle on top.
    const bed = c.createGain(); bed.gain.value = 0.55;
    bed.connect(this.gain);
    const hiss = c.createBufferSource(); hiss.buffer = A.noiseBuf; hiss.loop = true;
    const hf = c.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 2400; hf.Q.value = 0.6;
    const hg = c.createGain(); hg.gain.value = 0.035;
    hiss.connect(hf).connect(hg).connect(bed);
    const crk = c.createBufferSource(); crk.buffer = this.crackle(); crk.loop = true;
    const cf = c.createBiquadFilter(); cf.type = "highpass"; cf.frequency.value = 900;
    const cg = c.createGain(); cg.gain.value = 0.22;
    crk.connect(cf).connect(cg).connect(bed);
    hiss.start(t); crk.start(t, Math.random() * 2);
    this.squelch(t, false);
    return [src, hp, mid, pre, drive, lp, this.gain, bed, hiss, hf, hg, crk, cf, cg];
  }

  // Crackle: a couple of seconds of near silence with random pops and
  // short sputters, made once.
  crackle() {
    if (this._crk) return this._crk;
    const c = this.audio.ctx, n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < 60; i++) {
      const at = Math.floor(Math.random() * n), len = Math.floor(c.sampleRate * (Math.random() < 0.8 ? 0.002 : 0.02)), amp = 0.3 + Math.random() * 0.7;
      for (let k = 0; k < len && at + k < n; k++) d[at + k] += (Math.random() * 2 - 1) * amp * (1 - k / len);
    }
    return (this._crk = buf);
  }

  // Keying the mic: a burst of noise (and on release a two-tone beep).
  squelch(t, end) {
    const A = this.audio, c = A.ctx;
    const g = c.createGain(), f = c.createBiquadFilter(), s = c.createBufferSource();
    f.type = "bandpass"; f.frequency.value = end ? 1600 : 2200; f.Q.value = 0.7;
    s.buffer = A.noiseBuf;
    const v = (this.settings.voiceVol ?? 0.9) * 0.18, d = end ? 0.16 : 0.11;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(A.master);
    s.start(t, Math.random()); s.stop(t + d + 0.02);
    if (!end) return;
    for (const [dt, hz] of [[0.05, 1400], [0.13, 1050]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = "square"; o.frequency.value = hz;
      og.gain.setValueAtTime(0, t + dt); og.gain.linearRampToValueAtTime(v * 0.12, t + dt + 0.005); og.gain.setValueAtTime(v * 0.12, t + dt + 0.06); og.gain.linearRampToValueAtTime(0, t + dt + 0.07);
      o.connect(og).connect(A.master);
      o.start(t + dt); o.stop(t + dt + 0.08);
    }
  }

  setVolume() {
    const v = this.settings.voiceVol ?? 0.9;
    if (!this.el) return;
    if (this.gain) { this.gain.gain.value = v * 1.4; this.el.volume = 1; } else this.el.volume = Math.min(1, v * (this.settings.master ?? 1));
  }

  pause(on) {
    if (!this.el) return;
    // (The static is muted too while a menu is open.)
    if (on && !this.el.paused) { this.el.pause(); if (this.gain) this.gain.gain.value = 0; }
    else if (!on && this.el.paused && !this.el.ended) { this.el.play().catch(() => {}); this.setVolume(); }
  }

  stop() {
    const el = this.el;
    this.el = null;
    this.audio.duck?.(false);
    if (!el) return;
    el.pause();
    if (el._nodes && this.audio.ctx) this.squelch(this.audio.ctx.currentTime, true);
    for (const n of el._nodes ?? []) {
      try { n.stop?.(); } catch { /* not started */ }
      try { n.disconnect(); } catch { /* gone */ }
    }
  }
}
