// Tiny synthesized sound kit (Web Audio, no files). Everything is quiet and rate-limited.
(function (OR) {
  'use strict';
  const U = OR.util;

  class Audio {
    constructor(muted) {
      this.muted = !!muted;
      this.ctx = null;
      this.last = {};
    }

    // Must be called from a user gesture (browsers block audio before that).
    init() {
      if (this.ctx || this.muted) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(c.destination);
      // shared noise buffer
      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); // soft brown-ish noise
        d[i] = b * 6;
      }
      this.startAmbience();
    }

    setMuted(m) {
      this.muted = m;
      if (!m) this.init();
      if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1);
    }

    ok(kind, gap) {
      if (!this.ctx || this.muted) return false;
      const now = this.ctx.currentTime;
      if (this.last[kind] && now - this.last[kind] < gap) return false;
      this.last[kind] = now;
      return true;
    }

    startAmbience() {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = c.createGain();
      g.gain.value = 0.05;
      // slow swell like waves lapping
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain).connect(g.gain);
      src.connect(lp).connect(g).connect(this.master);
      src.start();
      lfo.start();
    }

    noiseBurst(dur, f0, f1, vol, q) {
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q || 0.8;
      bp.frequency.setValueAtTime(f0, t);
      bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(this.master);
      src.start(t, Math.random());
      src.stop(t + dur + 0.05);
    }

    tone(type, f0, f1, dur, vol, delay) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.05);
      return o;
    }

    splash(size) {
      if (!this.ok('splash', 0.12)) return;
      this.noiseBurst(0.25 + size * 0.2, 1400, 350, 0.12 * size + 0.03, 0.7);
    }

    bubble() {
      if (!this.ok('bubble', 0.08)) return;
      const f = U.rand(380, 520);
      this.tone('sine', f, f * 2.2, 0.09, 0.05);
    }

    pop() {
      if (!this.ok('pop', 0.05)) return;
      this.tone('sine', 900, 1600, 0.06, 0.06);
      this.tone('triangle', 500, 180, 0.08, 0.03);
    }

    // A little otter chirp. pitch ~1 for adults, higher for babies.
    squeak(pitch, style) {
      if (!this.ok('squeak', 0.15)) return;
      const c = this.ctx, t = c.currentTime;
      const base = 1150 * (pitch || 1) * U.rand(0.94, 1.06);
      const o = c.createOscillator();
      o.type = 'sine';
      const g = c.createGain();
      const vib = c.createOscillator();
      const vg = c.createGain();
      vib.frequency.value = 28;
      vg.gain.value = base * 0.04;
      vib.connect(vg).connect(o.frequency);
      const dur = style === 'yawn' ? 0.5 : style === 'soft' ? 0.12 : 0.2;
      o.frequency.setValueAtTime(base, t);
      if (style === 'yawn') o.frequency.exponentialRampToValueAtTime(base * 0.55, t + dur);
      else {
        o.frequency.exponentialRampToValueAtTime(base * 1.45, t + dur * 0.4);
        o.frequency.exponentialRampToValueAtTime(base * 1.15, t + dur);
      }
      const vol = style === 'soft' ? 0.025 : 0.045;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 0.05);
      vib.stop(t + dur + 0.05);
    }

    tok() {
      if (!this.ok('tok', 0.1)) return;
      this.noiseBurst(0.05, 2600, 1800, 0.08, 3);
      this.tone('sine', 420, 260, 0.07, 0.05);
    }

    chime() {
      if (!this.ok('chime', 0.4)) return;
      [659, 784, 988, 1319].forEach((f, i) => this.tone('sine', f, f, 0.7, 0.04, i * 0.11));
    }

    bell() {
      if (!this.ok('bell', 2)) return;
      this.tone('sine', 880, 878, 1.8, 0.03);
      this.tone('sine', 1320, 1318, 1.2, 0.015);
    }
  }

  OR.Audio = Audio;
})(window.OR);
