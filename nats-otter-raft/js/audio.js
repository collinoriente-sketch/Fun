// Tiny synthesized sound kit (Web Audio, no files). Everything is quiet and rate-limited.
(function (OR) {
  'use strict';
  const U = OR.util;

  class Audio {
    constructor(muted, music) {
      this.muted = !!muted;
      this.musicOn = music !== false;
      this.mood = 'cove';
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
      if (this.musicOn) this.startMusic();
    }

    setMuted(m) {
      this.muted = m;
      if (m) this.stopMusic();
      else {
        this.init();
        if (this.musicOn) this.startMusic();
      }
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

    collect() {
      if (!this.ok('collect', 0.15)) return;
      this.tone('sine', 1047, 1047, 0.35, 0.035);
      this.tone('sine', 1568, 1568, 0.5, 0.03, 0.08);
    }

    // ------------------------------------------------------------ background music
    // A slow generative lullaby: soft pad chords, a low bass and sparse music-box notes,
    // all in F major pentatonic so nothing ever clashes. Never loops exactly the same way.

    setMusic(on) {
      this.musicOn = on;
      if (on) {
        this.init();
        this.startMusic();
      } else this.stopMusic();
    }

    setMood(area) {
      this.mood = area;
    }

    startMusic() {
      if (!this.ctx || this.musicTimer) return;
      const c = this.ctx;
      if (!this.musicBus) {
        this.musicBus = c.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(this.master);
        // simple reverb from a decaying noise impulse
        const len = Math.floor(c.sampleRate * 2.8);
        const ir = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = ir.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
        const verb = c.createConvolver();
        verb.buffer = ir;
        const wet = c.createGain();
        wet.gain.value = 0.55;
        this.musicBus.connect(verb).connect(wet).connect(this.master);
      }
      this.musicBus.gain.cancelScheduledValues(c.currentTime);
      this.musicBus.gain.setTargetAtTime(0.75, c.currentTime, 1.5);
      this.step = 0;
      this.melodyIdx = 4;
      this.nextTime = c.currentTime + 0.3;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 250);
      this.scheduleMusic();
    }

    stopMusic() {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
      if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    }

    scheduleMusic() {
      const c = this.ctx;
      // background tabs throttle timers to ~1s, so look further ahead there
      const ahead = document.hidden ? 3 : 0.8;
      while (this.nextTime < c.currentTime + ahead) {
        const night = this.mood === 'lagoon';
        const stepDur = night ? 0.56 : 0.46; // eighth notes, ~65 / ~54 bpm
        this.musicStep(this.step, this.nextTime, stepDur, night);
        this.nextTime += stepDur;
        this.step++;
      }
    }

    musicStep(i, t, stepDur, night) {
      const PROG = [
        [53, 57, 60, 64], // Fmaj7
        [50, 53, 57, 60], // Dm7
        [46, 50, 53, 57], // Bbmaj7
        [48, 52, 55, 57], // C6
      ];
      const SCALE = [65, 67, 69, 72, 74, 77, 79, 81, 84]; // F major pentatonic, F4..C6
      const bar = Math.floor(i / 8), s = i % 8;
      const chord = PROG[bar % PROG.length];
      if (s === 0) {
        this.pad(chord, t, stepDur * 8, night);
        this.bass(chord[0] - 12, t, stepDur * 8);
      }
      // sparse melody, a bit busier on the strong beats
      const p = (s % 2 === 0 ? 0.5 : 0.22) * (night ? 0.6 : 1) * (bar % 8 === 7 ? 0.3 : 1);
      if (Math.random() < p) {
        this.melodyIdx = U.clamp(this.melodyIdx + U.pick([-2, -1, -1, 0, 1, 1, 2]), 0, SCALE.length - 1);
        this.pluck(SCALE[this.melodyIdx] - (night ? 12 : 0), t, night);
        if (Math.random() < 0.12) this.pluck(SCALE[Math.max(0, this.melodyIdx - 2)] - (night ? 12 : 0), t + stepDur * 0.5, night);
      }
    }

    freq(m) {
      return 440 * Math.pow(2, (m - 69) / 12);
    }

    pad(chord, t, dur, night) {
      const c = this.ctx;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = night ? 650 : 950;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.028, t + dur * 0.35);
      g.gain.setValueAtTime(0.028, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
      lp.connect(g).connect(this.musicBus);
      for (const m of chord) {
        for (const det of [-5, 5]) {
          const o = c.createOscillator();
          o.type = det < 0 ? 'sine' : 'triangle';
          o.frequency.value = this.freq(m);
          o.detune.value = det;
          o.connect(lp);
          o.start(t);
          o.stop(t + dur + 1.3);
        }
      }
    }

    bass(m, t, dur) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = this.freq(m);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + dur + 0.1);
    }

    // music-box / soft marimba note
    pluck(m, t, night) {
      const c = this.ctx;
      const f = this.freq(m);
      const g = c.createGain();
      const vol = night ? 0.035 : 0.045;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      g.connect(this.musicBus);
      const o1 = c.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = f;
      const o2 = c.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 3;
      const g2 = c.createGain();
      g2.gain.value = 0.12;
      o1.connect(g);
      o2.connect(g2).connect(g);
      o1.start(t);
      o2.start(t);
      o1.stop(t + 2);
      o2.stop(t + 2);
    }

    bell() {
      if (!this.ok('bell', 2)) return;
      this.tone('sine', 880, 878, 1.8, 0.03);
      this.tone('sine', 1320, 1318, 1.2, 0.015);
    }
  }

  OR.Audio = Audio;
})(window.OR);
