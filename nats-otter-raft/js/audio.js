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

    // ------------------------------------------------------------ dance groove (moonwalk power-up)
    // An original funky loop: kick, snare, hats, a plucky bass line and chord stabs at 112 bpm.

    startGroove(bpm) {
      this.gBpm = bpm || 112;
      if (!this.ctx || this.muted || !this.musicOn || this.grooveTimer) return;
      const c = this.ctx;
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
        if (this.musicBus) this.musicBus.gain.setTargetAtTime(0, c.currentTime, 0.3);
      }
      if (!this.grooveBus) {
        this.grooveBus = c.createGain();
        this.grooveBus.connect(this.master);
      }
      this.grooveBus.gain.cancelScheduledValues(c.currentTime);
      this.grooveBus.gain.setValueAtTime(0.8, c.currentTime);
      this.gStep = 0;
      this.gNext = c.currentTime + 0.05;
      this.grooveTimer = setInterval(() => this.scheduleGroove(), 100);
      this.scheduleGroove();
    }

    stopGroove() {
      if (!this.grooveTimer) return;
      clearInterval(this.grooveTimer);
      this.grooveTimer = null;
      this.grooveBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      if (this.musicOn && !this.muted) setTimeout(() => this.startMusic(), 900);
    }

    scheduleGroove() {
      const c = this.ctx, six = 60 / (this.gBpm || 112) / 4;
      while (this.gNext < c.currentTime + (document.hidden ? 2 : 0.4)) {
        this.grooveStep(this.gStep % 32, this.gNext);
        this.gNext += six;
        this.gStep++;
      }
    }

    grooveStep(s, t) {
      const KICK = [0, 6, 8, 16, 22, 24, 27];
      const SNARE = [4, 12, 20, 28];
      const BASS = { 0: 33, 3: 33, 6: 36, 8: 38, 10: 40, 14: 38, 16: 33, 19: 33, 22: 43, 24: 41, 26: 40, 28: 36, 30: 38 };
      if (KICK.includes(s)) this.kick(t);
      if (SNARE.includes(s)) this.snare(t);
      if (s % 2 === 0) this.hat(t, s === 14 || s === 30);
      if (BASS[s] != null) this.bassPluck(BASS[s], t);
      if (s === 2 || s === 10 || s === 18 || s === 26) this.stab(s < 16 ? [57, 60, 64, 67] : [55, 60, 62, 65], t);
    }

    noiseAt(t, type, f, dur, vol, q) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const fl = c.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      fl.Q.value = q || 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(fl).connect(g).connect(this.grooveBus);
      src.start(t, Math.random());
      src.stop(t + dur + 0.02);
    }

    kick(t) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(this.grooveBus);
      o.start(t);
      o.stop(t + 0.3);
    }

    snare(t) {
      this.noiseAt(t, 'bandpass', 1900, 0.16, 0.5, 0.6);
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(this.grooveBus);
      o.start(t);
      o.stop(t + 0.12);
    }

    hat(t, open) {
      this.noiseAt(t, 'highpass', 7500, open ? 0.18 : 0.035, 0.22, 0.5);
    }

    bassPluck(m, t) {
      const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.value = this.freq(m);
      f.type = 'lowpass';
      f.Q.value = 5;
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(220, t + 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(f).connect(g).connect(this.grooveBus);
      o.start(t);
      o.stop(t + 0.26);
    }

    stab(chord, t) {
      const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      f.connect(g).connect(this.grooveBus);
      for (const m of chord) {
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = this.freq(m);
        o.connect(f);
        o.start(t);
        o.stop(t + 0.22);
      }
    }

    // ------------------------------------------------------------ adventure sound effects
    tap() {
      if (!this.ok('tap', 0.04)) return;
      this.tone('triangle', U.rand(700, 820), 420, 0.05, 0.035);
    }
    hit(k) {
      if (!this.ok('hit', 0.05)) return;
      this.noiseBurst(0.08, 1800, 600, 0.09 * (k || 1), 1);
      this.tone('sine', 220 * (k || 1), 90, 0.1, 0.07);
    }
    boom(k) {
      if (!this.ok('boom', 0.08)) return;
      k = k || 1;
      this.noiseBurst(0.5 * k, 900, 120, 0.22 * Math.min(1.4, k), 0.5);
      this.tone('sine', 120, 38, 0.45 * k, 0.18);
    }
    whoosh() {
      if (!this.ok('whoosh', 0.1)) return;
      this.noiseBurst(0.25, 400, 2400, 0.08, 1.2);
    }
    charge(k) {
      if (!this.ok('charge', 0.3)) return;
      const d = 0.6 * (k || 1);
      this.tone('sawtooth', 110, 880, d, 0.03);
      this.tone('sine', 220, 1320, d, 0.04);
    }
    zap() {
      if (!this.ok('zap', 0.08)) return;
      this.tone('sawtooth', 1800, 120, 0.18, 0.05);
      this.noiseBurst(0.12, 5000, 2000, 0.06, 2);
    }
    clang() {
      if (!this.ok('clang', 0.1)) return;
      this.tone('square', 620, 600, 0.18, 0.03);
      this.tone('square', 931, 900, 0.14, 0.02);
      this.noiseBurst(0.06, 4000, 3000, 0.06, 3);
    }
    sneak() {
      if (!this.ok('sneak', 0.3)) return;
      [659, 587, 523, 494].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.12, 0.04, i * 0.12));
    }
    ouch(p) {
      if (!this.ok('ouch', 0.12)) return;
      const f = 900 * (p || 1);
      this.tone('sine', f, f * 0.6, 0.15, 0.04);
    }
    ko() {
      if (!this.ok('ko', 0.5)) return;
      [784, 659, 523, 392].forEach((f, i) => this.tone('triangle', f, f * 0.9, 0.25, 0.05, i * 0.14));
    }
    alarm() {
      if (!this.ok('alarm', 1)) return;
      for (let i = 0; i < 3; i++) {
        this.tone('square', 880, 660, 0.28, 0.035, i * 0.34);
      }
    }
    fanfare() {
      if (!this.ok('fanfare', 1)) return;
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(i < 4 ? 'triangle' : 'sine', f, f, i === 5 ? 0.8 : 0.18, 0.05, [0, 0.12, 0.24, 0.36, 0.56, 0.68][i]));
    }
    // A short, recognisable cue for each boss.
    bossSting(id) {
      if (!this.ok('sting', 0.6)) return;
      const T = (type, notes, step, dur, vol) => notes.forEach((f, i) => f && this.tone(type, f, f * 0.995, dur, vol, i * step));
      switch (id) {
        case 'dawson': // sneaky pizzicato creeping down
          T('triangle', [392, 0, 370, 0, 349, 330, 0, 262], 0.11, 0.09, 0.05);
          break;
        case 'billy': // brooding minor chord, drawn out
          [220, 262, 330, 415].forEach((f) => this.tone('sine', f, f * 0.98, 1.6, 0.025));
          this.tone('triangle', 110, 104, 1.6, 0.04);
          break;
        case 'matt': // 8-bit rage blips
          T('square', [523, 659, 523, 392, 330, 262], 0.08, 0.07, 0.03);
          this.tone('sawtooth', 90, 60, 0.5, 0.04, 0.5);
          break;
        case 'mike': // construction clanks
          [0, 0.22, 0.44].forEach((d) => {
            this.tone('square', 180, 150, 0.1, 0.05, d);
            this.tone('square', 1200, 1150, 0.06, 0.02, d);
          });
          break;
        case 'tommy': // bubbling science + zap
          for (let i = 0; i < 6; i++) this.tone('sine', U.rand(300, 900), U.rand(900, 1500), 0.07, 0.035, i * 0.07);
          this.tone('sawtooth', 2000, 200, 0.3, 0.035, 0.45);
          break;
        case 'collint': // gym thuds
          [0, 0.3, 0.6].forEach((d) => this.tone('sine', 140, 45, 0.25, 0.12, d));
          this.tone('square', 90, 80, 0.2, 0.03, 0.9);
          break;
        case 'tsimberg': // magical steel-drum arpeggio
          T('sine', [523, 659, 784, 988, 1175, 1568], 0.08, 0.5, 0.04);
          T('triangle', [1047, 0, 1319, 0, 1568], 0.08, 0.3, 0.02);
          break;
        default:
          this.chime();
      }
    }

    bell() {
      if (!this.ok('bell', 2)) return;
      this.tone('sine', 880, 878, 1.8, 0.03);
      this.tone('sine', 1320, 1318, 1.2, 0.015);
    }
  }

  OR.Audio = Audio;
})(window.OR);
