// Moonwalk power-up: tap the sparkly glove and the family puts on fedoras, one glove and white socks,
// then dances a little routine on a lit-up stage. Timeline (seconds since the glove was tapped):
//   0-2.5 gather · 2.5-9 moonwalk · 9-12 spins · 12-15 toe stand · 15-19.5 groove · 19.5-22 finale
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  const BPM = 112;
  const BEAT = 60 / BPM;
  const LENGTH = 22;
  const TILE_COLORS = ['#ff7ac8', '#7ae0ff', '#ffe066', '#9dff8a', '#c79bff'];

  function phase(T) {
    if (T < 2.5) return 'gather';
    if (T < 9) return 'moonwalk';
    if (T < 12) return 'spin';
    if (T < 15) return 'toe';
    if (T < 19.5) return 'groove';
    return 'finale';
  }

  const LINES = {
    moonwalk: { collin: 'hee-hee!', winston: 'moonwalk!', natalie: '✨', finny: '👀🕺', gussy: 'so... smooth...' },
    spin: { winston: 'spin!', finny: 'wheee!', collin: 'hoo!' },
    toe: { natalie: 'ow!', collin: 'ow!', winston: 'ow!', finny: 'ow!', gussy: 'ow...' },
    groove: { natalie: '🕺💕', gussy: 'zzz... jk 🕺', finny: '🧤✨' },
    finale: { natalie: '💕', collin: 'hee-hee!', winston: 'again!!', gussy: 'nap now?', finny: '✨' },
  };

  OR.Dance = {
    BEAT,
    LENGTH,

    start(g) {
      g.setMode('dance', LENGTH);
      g.mode.start = g.time;
      g.mode.lastBeat = -1;
      g.mode.lastPhase = '';
      g.audio.startGroove();
    },

    // Row positions, sliding sideways during the moonwalk.
    slots(g, m) {
      const G = g.G;
      const order = OR.RAFT_ORDER.map((id) => g.byId[id]);
      const us = order.map((o) => G.S * o.size * G.depth((G.top + G.bottom) / 2));
      const gaps = [];
      for (let i = 0; i < order.length - 1; i++) gaps.push(0.95 * (us[i] + us[i + 1]));
      const total = gaps.reduce((a, b) => a + b, 0);
      const T = g.time - (m.start || g.time);
      const p = U.clamp((T - 2.5) / 6.5, 0, 1);
      const room = Math.max(0, (G.right - G.left - total) / 2 - G.S * 0.3);
      const glide = -Math.sin(p * Math.PI) * Math.min(G.S * 2.4, room);
      let x = G.W / 2 - total / 2 + glide;
      const cy = (G.top + G.bottom) / 2 + G.S * 0.2;
      order.forEach((o, i) => {
        m.slots[o.id] = { x, y: cy, i };
        x += gaps[i] || 0;
      });
    },

    update(g) {
      const m = g.mode;
      this.slots(g, m);
      const T = g.time - m.start;
      const ph = phase(T);
      if (ph !== m.lastPhase) {
        m.lastPhase = ph;
        const lines = LINES[ph];
        if (lines) {
          for (const id in lines) if (U.chance(ph === 'toe' ? 0.7 : 0.6)) g.byId[id].say(lines[id], 1.8);
        }
        if (ph === 'finale') {
          g.addHearts(8, g.G.W / 2, g.G.top + g.G.S);
          g.happiness = Math.min(100, g.happiness + 10);
          g.audio.chime();
          for (const o of g.otters) g.fx.sparkle(o.x, o.y - o.u, 4, o.u * 0.2);
        }
      }
      // light-up tiles under their feet on every beat
      const beat = Math.floor(T / BEAT);
      if (beat !== m.lastBeat && T > 2.5) {
        m.lastBeat = beat;
        for (const o of g.otters) {
          if (o.q.sub > 0.5 || o.riding) continue;
          g.fx.tile(o.x, o.y + o.u * 0.35, o.u * 1.05, TILE_COLORS[(beat + OR.RAFT_ORDER.indexOf(o.id)) % TILE_COLORS.length]);
        }
      }
    },

    // Called from the otter's slot action while dancing.
    pose(o, dt, st, s, d) {
      const g = o.game, p = o.p, S = o.shape;
      const T = g.time - g.mode.start;
      const b = T / BEAT;
      const ph = phase(T);
      if (!st.arrived) {
        o.steer(s.x, s.y, 2, dt);
        p.happy = 1;
        p.eo = 0;
        if (d < o.u * 0.35 || T > 3) st.arrived = true;
        return false;
      }
      // follow the choreography tightly
      o.x = U.damp(o.x, s.x, 9, dt);
      o.y = U.damp(o.y, s.y, 9, dt);
      o.vx = ph === 'moonwalk' ? (s.x - o.x) * 9 : 0;
      o.vy = 0;
      o.steering = true;
      const beatWave = Math.sin(b * Math.PI);

      if (ph === 'gather') {
        p.happy = 1;
        p.eo = 0;
        p.lift = Math.abs(beatWave) * 0.06;
      } else if (ph === 'moonwalk') {
        p.step = beatWave;
        p.lean = 0.22;
        p.eo = 0.55; // too cool
        p.blush = 0.6;
        p.arx = 0.46; p.ary = -0.22 - Math.abs(beatWave) * 0.18;
        p.alx = -0.14; p.aly = 0.0;
        p.lookX = -0.6;
      } else if (ph === 'spin') {
        const k = U.clamp((T - 9 - s.i * 0.35) / 0.9, 0, 1);
        o.extraRot = U.easeInOut(k) * TAU;
        if (k > 0.45 && k < 0.55 && U.chance(0.5)) g.fx.sparkle(o.x, o.y - o.u * 0.6, 1, o.u * 0.15);
        p.happy = 1;
        p.eo = 0;
        p.alx = -0.45; p.aly = -0.2;
        p.arx = 0.45; p.ary = -0.2;
        p.kick = 0.6;
      } else if (ph === 'toe') {
        p.lift = 0.26;
        p.sy = 1.12;
        p.sx = 0.9;
        p.arx = 0.34; p.ary = S.headY - 0.5;
        p.alx = -0.36; p.aly = S.headY - 0.12;
        p.oh = T < 13 ? 1 : 0;
        p.eo = T < 13 ? 1 : 0;
        p.happy = 1;
      } else if (ph === 'groove') {
        p.lift = Math.abs(beatWave) * 0.1;
        p.lean = Math.sin((b * Math.PI) / 2) * 0.22;
        p.step = beatWave;
        const up = Math.floor(b) % 2 === 0;
        p.arx = 0.4; p.ary = up ? S.headY - 0.3 : -0.1;
        p.alx = -0.4; p.aly = up ? -0.1 : S.headY - 0.3;
        p.happy = 1;
        p.eo = up ? 0 : 1;
        p.blush = 0.9;
      } else {
        p.happy = 1;
        p.eo = 0;
        p.blush = 1;
        p.lift = Math.abs(beatWave) * 0.08;
        p.alx = -0.5; p.aly = S.headY - 0.2;
        p.arx = 0.5; p.ary = S.headY - 0.2;
        p.kick = 1;
      }
      return false;
    },

    // Dim the stage (drawn under the otters so they stay bright).
    drawDim(ctx, g) {
      const m = g.mode;
      if (!m || m.type !== 'dance') return;
      const T = g.time - m.start, G = g.G;
      const k = Math.min(1, T / 1.2) * Math.min(1, (LENGTH - T) / 1.2);
      ctx.fillStyle = `rgba(28,14,60,${0.42 * Math.max(0, k)})`;
      ctx.fillRect(0, 0, G.W, G.H);
    },

    // Spotlights and a disco ball (drawn on top).
    drawLights(ctx, g) {
      const m = g.mode;
      if (!m || m.type !== 'dance') return;
      const T = g.time - m.start, G = g.G, t = g.time;
      const k = Math.max(0, Math.min(1, T / 1.2) * Math.min(1, (LENGTH - T) / 1.2));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beams = [
        [0.15, '255,120,200', 0.9],
        [0.5, '120,220,255', -1.1],
        [0.85, '255,225,110', 1.3],
      ];
      for (const [fx, col, sp] of beams) {
        const x0 = G.W * fx, y0 = -10;
        const ang = Math.PI / 2 + Math.sin(t * sp * 0.8 + fx * 5) * 0.45;
        const len = G.H * 1.1, w = 0.13;
        const gr = ctx.createLinearGradient(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
        gr.addColorStop(0, `rgba(${col},${0.3 * k})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(ang - w) * len, y0 + Math.sin(ang - w) * len);
        ctx.lineTo(x0 + Math.cos(ang + w) * len, y0 + Math.sin(ang + w) * len);
        ctx.closePath();
        ctx.fill();
      }
      // little light specks thrown by the disco ball
      for (let i = 0; i < 26; i++) {
        const a = i * 2.399 + t * 0.6;
        const r = (0.15 + ((i * 0.37) % 1) * 0.8) * G.W * 0.5;
        const x = G.W / 2 + Math.cos(a) * r, y = G.horizon + Math.abs(Math.sin(a * 1.3)) * (G.H - G.horizon) * 0.9;
        ctx.fillStyle = `rgba(255,255,255,${0.35 * k})`;
        A.ellipse(ctx, x, y, 3, 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = k;
      const drop = U.easeOutBack(Math.min(1, T / 1.2));
      A.drawDiscoBall(ctx, G.W / 2, G.horizon * (G.W < 640 ? 0.88 : 0.55) * drop, Math.max(16, G.S * 0.35), t);
      ctx.restore();
    },
  };
})(window.OR);
