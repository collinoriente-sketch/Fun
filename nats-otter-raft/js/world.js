// The ocean world: sky & water rendering, particles, fish, bubbles, dive spots and decorations.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  // ---------------------------------------------------------------- areas
  OR.AREAS = {
    cove: {
      name: 'Kelp Cove', skyTop: '#8fd3f4', skyBot: '#e4f6ff', sun: '#fff6cf', sunX: 0.78, sunY: 0.38,
      waterTop: '#9ad7ea', waterMid: '#5db5d8', waterBot: '#3a90c2', island: '#6fa893', islandFar: '#a6cdc6', tree: '#4d876c',
      wave: '255,255,255', waveDark: '18,74,125', cloud: 'rgba(255,255,255,0.92)', glitter: '#fffbe6', tint: null,
    },
    sunset: {
      name: 'Sunset Bay', skyTop: '#7482d6', skyMid: '#f5a3b9', skyBot: '#ffd99e', sun: '#ffe3a6', sunX: 0.3, sunY: 0.86,
      waterTop: '#f4b7a8', waterMid: '#c08fbd', waterBot: '#6b74b4', island: '#7b6396', islandFar: '#b98fb1', tree: '#5e4d7e',
      wave: '255,238,222', waveDark: '80,50,110', cloud: 'rgba(255,214,214,0.85)', glitter: '#fff0c8', tint: 'rgba(255,150,120,0.08)',
    },
    lagoon: {
      name: 'Moonlit Lagoon', skyTop: '#0b1537', skyBot: '#2a3e7c', sun: '#f4f1ff', sunX: 0.72, sunY: 0.3, moon: true, stars: true,
      waterTop: '#2c5089', waterMid: '#1d3a6c', waterBot: '#112752', island: '#1b2b52', islandFar: '#2b3e6d', tree: '#16244a',
      wave: '170,200,255', waveDark: '5,12,35', cloud: 'rgba(170,185,230,0.25)', glitter: '#dfe8ff', tint: 'rgba(16,26,80,0.3)', glow: true,
    },
  };

  // ---------------------------------------------------------------- scene
  class Scene {
    constructor(game) {
      this.game = game;
      this.bg = document.createElement('canvas');
      this.clouds = [];
      this.birds = [];
      this.birdT = U.rand(4, 10);
      this.stars = [];
    }

    get area() { return OR.AREAS[this.game.progress.state.area] || OR.AREAS.cove; }

    rebuild() {
      const g = this.game, G = g.G, dpr = g.dpr, a = this.area;
      const c = this.bg;
      c.width = Math.round(G.W * dpr);
      c.height = Math.round(G.H * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hz = G.horizon;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, a.skyTop);
      if (a.skyMid) sky.addColorStop(0.55, a.skyMid);
      sky.addColorStop(1, a.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, G.W, hz + 2);

      if (a.stars) {
        for (let i = 0; i < 90; i++) {
          const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * G.W, y = (Math.sin(i * 37.1) * 0.5 + 0.5) * hz * 0.9;
          ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
          ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1.2, i % 7 === 0 ? 2 : 1.2);
        }
      }

      // sun / moon
      const sx = G.W * a.sunX, sy = hz * a.sunY, sr = Math.min(G.W, G.H) * 0.05 + 14;
      const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
      glow.addColorStop(0, U.rgba(a.sun, 0.55));
      glow.addColorStop(1, U.rgba(a.sun, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      A.ellipse(ctx, sx, sy, sr, sr);
      ctx.fillStyle = a.sun;
      ctx.fill();
      if (a.moon) {
        ctx.fillStyle = 'rgba(180,185,220,0.35)';
        A.ellipse(ctx, sx - sr * 0.3, sy - sr * 0.2, sr * 0.22, sr * 0.2);
        ctx.fill();
        A.ellipse(ctx, sx + sr * 0.35, sy + sr * 0.3, sr * 0.15, sr * 0.13);
        ctx.fill();
      }

      // distant islands
      const isl = (x, w, h, col, trees) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, hz + 1);
        ctx.bezierCurveTo(x - w * 0.35, hz - h, x + w * 0.25, hz - h * 1.1, x + w / 2, hz + 1);
        ctx.fill();
        if (trees) {
          ctx.fillStyle = a.tree;
          for (let i = 0; i < trees; i++) {
            const tx = x - w * 0.25 + (i / Math.max(1, trees - 1)) * w * 0.45, th = h * (0.55 + (i % 2) * 0.25);
            const base = hz - h * 0.75 + Math.abs(i - trees / 2) * h * 0.08;
            ctx.beginPath();
            ctx.moveTo(tx - th * 0.28, base + 2);
            ctx.lineTo(tx, base - th);
            ctx.lineTo(tx + th * 0.28, base + 2);
            ctx.fill();
          }
        }
      };
      const ih = Math.max(14, hz * 0.14);
      isl(G.W * 0.12, G.W * 0.3, ih * 0.6, a.islandFar, 0);
      isl(G.W * 0.9, G.W * 0.22, ih * 0.5, a.islandFar, 0);
      isl(G.W * 0.22, G.W * 0.2, ih, a.island, 4);
      isl(G.W * 0.62, G.W * 0.1, ih * 0.55, a.island, 0);
      if (g.progress.has('lighthouse')) this.drawLighthouse(ctx, G.W * 0.62, hz - ih * 0.5, ih * 1.6);

      // haze on the horizon
      const haze = ctx.createLinearGradient(0, hz - 20, 0, hz + 10);
      haze.addColorStop(0, U.rgba(a.skyBot, 0));
      haze.addColorStop(1, U.rgba(a.skyBot, 0.6));
      ctx.fillStyle = haze;
      ctx.fillRect(0, hz - 20, G.W, 30);

      // water
      const wg = ctx.createLinearGradient(0, hz, 0, G.H);
      wg.addColorStop(0, a.waterTop);
      wg.addColorStop(0.35, a.waterMid);
      wg.addColorStop(1, a.waterBot);
      ctx.fillStyle = wg;
      ctx.fillRect(0, hz, G.W, G.H - hz);
      // soft light patches under the surface
      for (let i = 0; i < 7; i++) {
        const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * G.W, y = hz + (0.25 + (i / 7) * 0.7) * (G.H - hz);
        const r = G.S * (2 + (i % 3));
        const lg = ctx.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, `rgba(${a.wave},0.07)`);
        lg.addColorStop(1, `rgba(${a.wave},0)`);
        ctx.fillStyle = lg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      this.sunPos = [sx, sy, sr];

      if (!this.clouds.length || this.cloudW !== G.W) {
        this.cloudW = G.W;
        this.clouds = [];
        for (let i = 0; i < 4; i++) this.clouds.push({ x: U.rand(G.W), y: U.rand(0.15, 0.6) * hz, s: U.rand(0.7, 1.3) * (G.S * 0.9), v: U.rand(4, 10) });
      }
    }

    drawLighthouse(ctx, x, base, h) {
      const w = h * 0.22;
      ctx.fillStyle = '#fbf6ee';
      ctx.beginPath();
      ctx.moveTo(x - w / 2, base);
      ctx.lineTo(x - w * 0.35, base - h);
      ctx.lineTo(x + w * 0.35, base - h);
      ctx.lineTo(x + w / 2, base);
      ctx.fill();
      ctx.fillStyle = '#e46a6a';
      for (let i = 0; i < 3; i++) {
        const y0 = base - h * (0.15 + i * 0.3), y1 = y0 - h * 0.12;
        const k0 = 0.5 - 0.15 * ((base - y0) / h), k1 = 0.5 - 0.15 * ((base - y1) / h);
        ctx.beginPath();
        ctx.moveTo(x - w * k0, y0);
        ctx.lineTo(x - w * k1, y1);
        ctx.lineTo(x + w * k1, y1);
        ctx.lineTo(x + w * k0, y0);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe68a';
      ctx.fillRect(x - w * 0.3, base - h - w * 0.5, w * 0.6, w * 0.5);
      ctx.fillStyle = '#e46a6a';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.42, base - h - w * 0.5);
      ctx.lineTo(x, base - h - w * 1.1);
      ctx.lineTo(x + w * 0.42, base - h - w * 0.5);
      ctx.fill();
      this.lighthouse = [x, base - h - w * 0.25];
    }

    update(dt) {
      const G = this.game.G;
      for (const c of this.clouds) {
        c.x += c.v * dt;
        if (c.x - c.s * 3 > G.W) c.x = -c.s * 3;
      }
      this.birdT -= dt;
      if (this.birdT <= 0) {
        this.birdT = U.rand(12, 28);
        const dir = U.chance(0.5) ? 1 : -1;
        const n = U.chance(0.4) ? U.randInt(2, 3) : 1;
        for (let i = 0; i < n; i++) {
          this.birds.push({ x: dir > 0 ? -30 - i * 40 : G.W + 30 + i * 40, y: G.horizon * U.rand(0.2, 0.7) + i * 12, v: dir * U.rand(35, 55), ph: U.rand(TAU), s: U.rand(0.8, 1.2) });
        }
      }
      for (const b of this.birds) {
        b.x += b.v * dt;
        b.y += Math.sin(b.ph + b.x * 0.01) * dt * 6;
      }
      this.birds = this.birds.filter((b) => b.x > -120 && b.x < G.W + 120);
    }

    drawBack(ctx, t) {
      const g = this.game, G = g.G, a = this.area;
      ctx.drawImage(this.bg, 0, 0, G.W, G.H);

      // clouds
      ctx.fillStyle = a.cloud;
      for (const c of this.clouds) {
        ctx.beginPath();
        const puffs = [[0, 0, 1], [-1.1, 0.25, 0.7], [1.1, 0.2, 0.75], [-0.4, -0.45, 0.7], [0.5, -0.35, 0.65]];
        for (const [px, py, pr] of puffs) {
          ctx.moveTo(c.x + px * c.s + pr * c.s * 0.8, c.y + py * c.s * 0.8);
          ctx.arc(c.x + px * c.s, c.y + py * c.s * 0.8, pr * c.s * 0.8, 0, TAU);
        }
        ctx.fill();
      }

      // seabirds
      ctx.strokeStyle = a.moon ? 'rgba(210,220,255,0.6)' : 'rgba(60,70,90,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const b of this.birds) {
        const f = Math.sin(t * 7 + b.ph) * 5 * b.s, w = 9 * b.s;
        ctx.beginPath();
        ctx.moveTo(b.x - w, b.y - f);
        ctx.quadraticCurveTo(b.x - w * 0.45, b.y - 4 * b.s, b.x, b.y);
        ctx.quadraticCurveTo(b.x + w * 0.45, b.y - 4 * b.s, b.x + w, b.y - f);
        ctx.stroke();
      }

      // glitter path under the sun / moon
      if (this.sunPos) {
        const [sx] = this.sunPos;
        ctx.fillStyle = a.glitter;
        for (let i = 0; i < 26; i++) {
          const k = i / 26;
          const y = G.horizon + 4 + k * k * (G.H - G.horizon) * 0.55;
          const spread = 10 + k * G.W * 0.12;
          const phase = Math.floor(t * 3 + i * 1.7);
          const x = sx + Math.sin(phase * 12.9898 + i) * spread;
          const tw = Math.sin(t * 4 + i * 2.3) * 0.5 + 0.5;
          ctx.globalAlpha = tw * (1 - k) * 0.9;
          ctx.fillRect(x - (3 + k * 10) / 2, y, 3 + k * 10, 1.5 + k * 1.5);
        }
        ctx.globalAlpha = 1;
      }

      // wave highlights (perspective rows)
      const rows = 16;
      for (let r = 0; r < rows; r++) {
        const k = r / rows;
        const y0 = G.horizon + 6 + Math.pow(k, 1.5) * (G.H - G.horizon);
        const sc = 0.3 + k * 1.2;
        const step = 70 * sc;
        const drift = (t * (8 + r * 1.5)) % step;
        ctx.lineWidth = 1 + sc * 1.4;
        ctx.strokeStyle = `rgba(${a.wave},${0.16 + k * 0.18})`;
        ctx.beginPath();
        for (let x = -step + drift + (r % 2) * step * 0.5; x < G.W + step; x += step) {
          const yy = y0 + Math.sin(t * 1.2 + x * 0.02 + r) * 3 * sc;
          const w = 16 * sc * (0.7 + 0.3 * Math.sin(x * 0.13 + r));
          ctx.moveTo(x - w, yy);
          ctx.quadraticCurveTo(x, yy - 4 * sc, x + w, yy);
        }
        ctx.stroke();
        ctx.strokeStyle = `rgba(${a.waveDark},${0.06 + k * 0.06})`;
        ctx.beginPath();
        for (let x = -step + drift * 0.8 + step * 0.3; x < G.W + step; x += step * 1.3) {
          const yy = y0 + 6 * sc + Math.sin(t + x * 0.03) * 2 * sc;
          ctx.moveTo(x - 12 * sc, yy);
          ctx.quadraticCurveTo(x, yy + 3 * sc, x + 12 * sc, yy);
        }
        ctx.stroke();
      }
    }

    drawOverlay(ctx, t) {
      const g = this.game, G = g.G, a = this.area;
      if (a.tint) {
        ctx.fillStyle = a.tint;
        ctx.fillRect(0, 0, G.W, G.H);
      }
      if (g.mode && g.mode.type === 'nap') {
        ctx.fillStyle = 'rgba(40,40,90,0.08)';
        ctx.fillRect(0, 0, G.W, G.H);
      }
      if (a.glow) {
        // glowing plankton twinkling on the water
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          const x = ((Math.sin(i * 45.1) * 0.5 + 0.5) * G.W + t * (3 + (i % 4))) % G.W;
          const y = G.horizon + 20 + (Math.sin(i * 17.3) * 0.5 + 0.5) * (G.H - G.horizon - 20);
          const tw = Math.max(0, Math.sin(t * (0.6 + (i % 5) * 0.2) + i));
          const r = 2 + (i % 3);
          const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
          gg.addColorStop(0, `rgba(120,255,230,${0.5 * tw})`);
          gg.addColorStop(1, 'rgba(120,255,230,0)');
          ctx.fillStyle = gg;
          ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
        }
        ctx.restore();
      }
      if (this.lighthouse && (a.glow || a.name === 'Sunset Bay')) {
        const [lx, ly] = this.lighthouse;
        const ang = t * 0.8;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const len = G.W * 0.35;
        ctx.fillStyle = 'rgba(255,240,170,0.12)';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(ang) * len, ly + Math.sin(ang) * len * 0.15 - 4);
        ctx.lineTo(lx + Math.cos(ang) * len, ly + Math.sin(ang) * len * 0.15 + 8);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------- particles
  class FX {
    constructor(game) {
      this.game = game;
      this.low = []; // flat on the water: ripples & wakes
      this.high = []; // floating above: hearts, zzz, sparkles
    }
    ripple(x, y, r, strong) {
      this.low.push({ k: 'ring', x, y, r0: r * 0.2, r1: r * (strong ? 2.2 : 1.4), t: 0, life: strong ? 1.6 : 1.1, a: strong ? 0.7 : 0.45 });
    }
    wake(x, y, u) {
      if (this.low.length > 90) return;
      this.low.push({ k: 'ring', x, y, r0: u * 0.2, r1: u * 0.7, t: 0, life: 0.9, a: 0.3 });
    }
    splash(x, y, size) {
      this.ripple(x, y, size, true);
      for (let i = 0; i < 9; i++) this.droplet(x, y, size);
    }
    droplet(x, y, size) {
      if (this.high.length > 220) return;
      const a = U.rand(-Math.PI * 0.9, -Math.PI * 0.1);
      const v = size * U.rand(1.6, 3);
      this.high.push({ k: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, y0: y, t: 0, life: 2, r: Math.max(1.5, size * U.rand(0.04, 0.07)) });
    }
    heart(x, y, s) {
      this.high.push({ k: 'heart', x, y, s: Math.max(9, s), t: 0, life: 1.8, ph: U.rand(TAU), c: U.pick(['#ff6f9c', '#ff8fb1', '#ff5d8f', '#ffa3c2']) });
    }
    zzz(x, y, u) {
      this.high.push({ k: 'z', x, y, s: U.clamp(u * 0.28, 11, 22), t: 0, life: 2.6, ph: U.rand(TAU) });
    }
    sparkle(x, y, n, s) {
      for (let i = 0; i < n; i++) {
        this.high.push({ k: 'spark', x: x + U.rand(-1, 1) * s * 2, y: y + U.rand(-1, 1) * s * 2, s: Math.max(4, s * U.rand(0.6, 1.2)), t: 0, life: U.rand(0.6, 1.1), rot: U.rand(TAU) });
      }
    }
    fluff(x, y, color) {
      this.high.push({ k: 'fluff', x, y, vx: U.rand(-12, 12), vy: U.rand(-25, -12), t: 0, life: 1.3, c: color, r: U.rand(2, 4) });
    }
    text(x, y, str) {
      this.high.push({ k: 'text', x, y, str, t: 0, life: 1.6 });
    }
    // a collected item bobs up out of the water and fades
    pickup(type, x, y, r) {
      this.high.push({ k: 'item', type, x, y, r, t: 0, life: 1.1 });
    }
    bubble(x, y, r) {
      this.high.push({ k: 'bub', x, y, r: Math.max(2, r), t: 0, life: 0.9, vx: U.rand(-6, 6) });
    }

    update(dt) {
      for (const p of this.low) p.t += dt;
      for (const p of this.high) {
        p.t += dt;
        if (p.k === 'drop') {
          p.vy += this.game.G.S * 6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.vy > 0 && p.y > p.y0) {
            p.t = p.life;
            if (this.low.length < 90 && U.chance(0.4)) this.low.push({ k: 'ring', x: p.x, y: p.y, r0: 1, r1: p.r * 5, t: 0, life: 0.6, a: 0.35 });
          }
        } else if (p.k === 'heart') {
          p.y -= dt * 34;
          p.x += Math.sin(p.t * 4 + p.ph) * dt * 18;
        } else if (p.k === 'z') {
          p.y -= dt * 18;
          p.x += dt * 10 + Math.sin(p.t * 2 + p.ph) * dt * 8;
        } else if (p.k === 'fluff') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else if (p.k === 'text') {
          p.y -= dt * 26;
        } else if (p.k === 'item') {
          p.y -= dt * 60 * (1 - p.t / p.life);
        } else if (p.k === 'bub') {
          p.y -= dt * 10;
          p.x += p.vx * dt;
        }
      }
      this.low = this.low.filter((p) => p.t < p.life);
      this.high = this.high.filter((p) => p.t < p.life);
    }

    drawLow(ctx) {
      const wave = this.game.scene.area.wave;
      for (const p of this.low) {
        const k = p.t / p.life;
        const r = U.lerp(p.r0, p.r1, 1 - Math.pow(1 - k, 2));
        A.ellipse(ctx, p.x, p.y, r, r * 0.42);
        ctx.lineWidth = Math.max(1, r * 0.06) * (1 - k * 0.5);
        ctx.strokeStyle = `rgba(${wave},${p.a * (1 - k)})`;
        ctx.stroke();
      }
    }

    drawHigh(ctx) {
      for (const p of this.high) {
        const k = p.t / p.life;
        const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        if (p.k === 'drop') {
          ctx.fillStyle = 'rgba(235,250,255,0.9)';
          A.ellipse(ctx, p.x, p.y, p.r, p.r * 1.3);
          ctx.fill();
        } else if (p.k === 'heart') {
          const pop = U.easeOutBack(Math.min(1, p.t / 0.3));
          A.drawHeart(ctx, p.x, p.y, p.s * pop, p.c, fade);
        } else if (p.k === 'z') {
          ctx.save();
          ctx.globalAlpha = fade * Math.min(1, p.t * 3);
          ctx.font = `800 ${Math.round(p.s * (0.7 + k * 0.6))}px "Baloo 2", Nunito, system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = 'rgba(60,70,140,0.55)';
          ctx.lineWidth = 3;
          ctx.strokeText('z', p.x, p.y);
          ctx.fillText('z', p.x, p.y);
          ctx.restore();
        } else if (p.k === 'spark') {
          ctx.save();
          ctx.globalAlpha = Math.sin(k * Math.PI);
          A.drawSparkle(ctx, p.x, p.y, p.s, '#fff8d6', p.rot + p.t * 2);
          ctx.restore();
        } else if (p.k === 'fluff') {
          ctx.save();
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = p.c;
          A.ellipse(ctx, p.x, p.y, p.r, p.r);
          ctx.fill();
          ctx.restore();
        } else if (p.k === 'text') {
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.font = '800 15px "Baloo 2", Nunito, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(30,60,100,0.5)';
          ctx.strokeText(p.str, p.x, p.y);
          ctx.fillStyle = '#fff';
          ctx.fillText(p.str, p.x, p.y);
          ctx.restore();
        } else if (p.k === 'item') {
          ctx.save();
          ctx.globalAlpha = fade;
          const s = U.easeOutBack(Math.min(1, p.t / 0.35));
          A.drawItem(ctx, p.type, p.x, p.y, p.r * s, p.t, 3);
          ctx.restore();
        } else if (p.k === 'bub') {
          ctx.save();
          ctx.globalAlpha = fade * 0.8;
          A.ellipse(ctx, p.x, p.y, p.r, p.r);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // ---------------------------------------------------------------- creatures & items
  class Fish {
    constructor(game) {
      const G = game.G;
      this.game = game;
      this.isFish = true;
      this.dir = U.chance(0.5) ? 1 : -1;
      this.x = this.dir > 0 ? -40 : G.W + 40;
      this.y = U.rand(G.top + G.S * 0.5, G.bottom);
      this.len = G.S * U.rand(0.45, 0.65);
      this.speed = G.S * U.rand(0.5, 0.9);
      this.color = U.pick(['#ffa25c', '#ffc15c', '#9fd0ff', '#ff8f8f', '#c7b8ff']);
      this.ph = U.rand(TAU);
      this.jump = null;
      this.fast = 0;
    }
    scare(fx, fy) {
      if (this.jump) return;
      this.dir = this.x > fx ? 1 : -1;
      this.fast = 1.5;
      if (U.chance(0.35)) this.leap();
    }
    leap(dist) {
      const g = this.game;
      this.jump = { t: 0, dur: 0.9, x0: this.x, y0: this.y, dx: this.dir * (dist || g.G.S * 2.2), h: g.G.S * 1.4 };
      g.fx.splash(this.x, this.y, this.len * 0.8);
      g.audio.splash(0.3);
    }
    update(dt, t) {
      const G = this.game.G;
      if (this.jump) {
        const j = this.jump;
        j.t += dt;
        const k = j.t / j.dur;
        this.x = j.x0 + j.dx * k;
        this.y = j.y0;
        this.alt = Math.sin(Math.PI * U.clamp(k, 0, 1)) * j.h;
        if (k >= 1) {
          this.jump = null;
          this.alt = 0;
          this.game.fx.splash(this.x, this.y, this.len * 0.8);
          this.game.audio.splash(0.25);
        }
        return;
      }
      this.fast = Math.max(0, this.fast - dt);
      this.x += this.dir * this.speed * (1 + this.fast * 1.5) * dt;
      this.y += Math.sin(t * 0.8 + this.ph) * G.S * 0.2 * dt;
      if (this.x < -80 || this.x > G.W + 80) this.dead = true;
    }
    draw(ctx, t) {
      if (this.jump) return;
      A.drawFish(ctx, this.x, this.y + this.len * 0.3, this.len, this.dir > 0 ? 0 : Math.PI, t + this.ph, this.color, 0.42);
    }
    drawAir(ctx, t) {
      if (!this.jump) return;
      const j = this.jump;
      const k = j.t / j.dur;
      const ang = Math.atan2(-Math.cos(Math.PI * k) * j.h * Math.PI, j.dx) * (this.dir > 0 ? 1 : 1);
      A.drawFish(ctx, this.x, this.y - this.alt, this.len, ang, t * 2, this.color, 1);
    }
  }

  class Bubble {
    constructor(game, x, y) {
      const G = game.G;
      this.game = game;
      this.x = x != null ? x : U.rand(G.left, G.right);
      this.y = y != null ? y : U.rand(G.top, G.bottom);
      this.r = G.S * U.rand(0.1, 0.17);
      this.t = 0;
      this.life = U.rand(6, 11);
      this.ph = U.rand(TAU);
      this.kids = [[U.rand(-1.4, 1.4), U.rand(-1.2, 0.5), U.rand(0.35, 0.6)], [U.rand(-1.4, 1.4), U.rand(-1.2, 0.5), U.rand(0.3, 0.5)]];
    }
    update(dt) {
      this.t += dt;
      this.x += Math.sin(this.t * 0.7 + this.ph) * dt * 6 + this.game.current[0] * dt;
      if (this.t > this.life) this.game.popBubble(this, true);
    }
    draw(ctx) {
      const grow = U.easeOutBack(Math.min(1, this.t / 0.4));
      const fade = this.t > this.life - 0.6 ? (this.life - this.t) / 0.6 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      const draw1 = (x, y, r) => {
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.15)');
        g.addColorStop(0.8, 'rgba(210,245,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0.75)');
        A.ellipse(ctx, x, y, r, r);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
        A.ellipse(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.14, -0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
      };
      const bob = Math.sin(this.t * 2 + this.ph) * 2;
      draw1(this.x, this.y + bob, this.r * grow);
      for (const [kx, ky, kr] of this.kids) draw1(this.x + kx * this.r, this.y + bob + ky * this.r, this.r * kr * grow);
      ctx.restore();
    }
  }

  // Something sitting on the sea floor, glinting through the water; otters dive for these.
  class DiveSpot {
    constructor(game, type, x, y) {
      const G = game.G;
      this.game = game;
      this.type = type;
      this.x = x != null ? x : U.rand(G.left + G.S, G.right - G.S);
      this.y = y != null ? y : U.rand(G.top + G.S * 0.5, G.bottom - G.S * 0.3);
      this.seed = U.rand(10);
      this.t = 0;
      this.life = U.rand(90, 140);
    }
    update(dt) {
      this.t += dt;
      if (this.t > this.life) this.dead = true;
    }
    draw(ctx, t) {
      const G = this.game.G;
      const r = G.S * 0.2 * G.depth(this.y);
      const fade = Math.min(1, this.t / 1.5) * (this.t > this.life - 2 ? (this.life - this.t) / 2 : 1);
      ctx.save();
      ctx.globalAlpha = 0.5 * fade;
      const wob = Math.sin(t * 1.5 + this.seed) * r * 0.08;
      A.drawItem(ctx, this.type, this.x + wob, this.y + r * 0.8, r, t, this.seed);
      ctx.restore();
      // a glint and a soft pulsing ring on the surface so it's easy to spot and tap
      const tw = Math.max(0, Math.sin(t * 2.2 + this.seed * 3));
      const pk = (t * 0.6 + this.seed) % 1;
      ctx.save();
      ctx.globalAlpha = fade * (1 - pk) * 0.55;
      A.ellipse(ctx, this.x, this.y + r * 0.4, r * (1.2 + pk * 1.6), r * (0.5 + pk * 0.7));
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.type === 'pearl' ? '#fff3b0' : '#ffffff';
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = fade * (0.35 + tw * 0.65);
      A.drawSparkle(ctx, this.x + r * 0.6, this.y - r * 0.3, r * (0.45 + tw * 0.35), this.type === 'pearl' ? '#fff3b0' : '#ffffff', t);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- decorations
  class KelpPatch {
    constructor(game, fx, fy, size) {
      this.game = game;
      this.fx = fx;
      this.fy = fy;
      this.size = size;
      this.leaves = [];
      const n = Math.round(9 + size * 6);
      for (let i = 0; i < n; i++) {
        this.leaves.push({ a: U.rand(TAU), d: U.rand(0.1, 1), len: U.rand(0.5, 1), w: U.rand(0.18, 0.3), ph: U.rand(TAU), c: U.pick(['#7c8f35', '#8f9a3a', '#6e8a36', '#a0a04a']) });
      }
    }
    get pos() {
      const G = this.game.G;
      return [G.left + this.fx * (G.right - G.left), G.top + this.fy * (G.bottom - G.top)];
    }
    get radius() { return this.game.G.S * 1.4 * this.size; }
    draw(ctx, t) {
      const [x, y] = this.pos, R = this.radius;
      ctx.save();
      // stipes under the water
      ctx.strokeStyle = 'rgba(70,90,40,0.25)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (i - 2) * R * 0.25, y + R * 0.3);
        ctx.quadraticCurveTo(x + (i - 2) * R * 0.35 + Math.sin(t + i) * 8, y + R * 0.7, x + (i - 2) * R * 0.3, y + R * 1.1);
        ctx.stroke();
      }
      for (const l of this.leaves) {
        const sway = Math.sin(t * 0.9 + l.ph) * 0.15;
        const cx = x + Math.cos(l.a) * l.d * R * 0.8, cy = y + Math.sin(l.a) * l.d * R * 0.4;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(l.a + sway);
        const L = R * 0.55 * l.len, W = R * l.w * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(L * 0.5, -W, L, 0);
        ctx.quadraticCurveTo(L * 0.5, W, 0, 0);
        ctx.fillStyle = l.c;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,70,20,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        A.ellipse(ctx, 0, 0, W * 0.4, W * 0.4);
        ctx.fillStyle = '#b5a64a';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  class Log {
    constructor(game, fx, fy) {
      this.game = game;
      this.fx = fx;
      this.fy = fy;
      this.spots = [null, null, null];
    }
    get pos() {
      const G = this.game.G;
      return [G.left + this.fx * (G.right - G.left), G.top + this.fy * (G.bottom - G.top)];
    }
    get len() { return this.game.G.S * 3.3; }
    freeSpot(o) {
      const i = this.spots.findIndex((s) => !s);
      if (i < 0) return null;
      this.spots[i] = o;
      return i + 1;
    }
    release(o) {
      this.spots = this.spots.map((s) => (s === o ? null : s));
    }
    spotPos(spot) {
      const [x, y] = this.pos;
      return [x + (spot - 2) * this.len * 0.3, y - this.game.G.S * 0.15];
    }
    draw(ctx, t) {
      const [x, y0] = this.pos, L = this.len, r = this.game.G.S * 0.32;
      const y = y0 + Math.sin(t * 1.1) * 2;
      ctx.save();
      A.ellipse(ctx, x, y + r * 0.7, L * 0.58, r * 0.8);
      ctx.fillStyle = 'rgba(12,50,90,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - L / 2, y - r);
      ctx.lineTo(x + L / 2, y - r);
      ctx.arc(x + L / 2, y, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x - L / 2, y + r);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y - r, 0, y + r);
      g.addColorStop(0, '#c49a6c');
      g.addColorStop(1, '#8a6441');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#5f4128';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(95,65,40,0.45)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const bx = x - L * 0.4 + i * L * 0.2;
        ctx.moveTo(bx, y - r * 0.5);
        ctx.lineTo(bx + L * 0.12, y - r * 0.45);
        ctx.stroke();
      }
      A.ellipse(ctx, x - L / 2, y, r * 0.55, r);
      ctx.fillStyle = '#e2c49a';
      ctx.fill();
      ctx.stroke();
      A.ellipse(ctx, x - L / 2, y, r * 0.3, r * 0.55);
      ctx.stroke();
      // a little mushroom friend
      ctx.fillStyle = '#ff8f8f';
      A.ellipse(ctx, x + L * 0.35, y - r * 1.05, r * 0.28, r * 0.18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + L * 0.35 - r * 0.05, y - r * 1.02, r * 0.1, r * 0.2);
      ctx.restore();
      A.ellipse(ctx, x, y + r * 0.9, L * 0.62, r * 0.5);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${this.game.scene.area.wave},0.35)`;
      ctx.stroke();
    }
  }

  class Buoy {
    constructor(game, fx, fy) {
      this.game = game;
      this.fx = fx;
      this.fy = fy;
      this.ring = 0;
      this.t = U.rand(20, 40);
    }
    get pos() {
      const G = this.game.G;
      return [G.left + this.fx * (G.right - G.left), G.top + this.fy * (G.bottom - G.top)];
    }
    update(dt) {
      this.t -= dt;
      this.ring = Math.max(0, this.ring - dt);
      if (this.t <= 0) {
        this.t = U.rand(35, 70);
        this.ring = 1.5;
        this.game.audio.bell();
      }
    }
    draw(ctx, t) {
      const [x, y0] = this.pos, S = this.game.G.S;
      const y = y0 + Math.sin(t * 1.4) * 3;
      const tilt = Math.sin(t * 1.1) * 0.08 + Math.sin(this.ring * 20) * this.ring * 0.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      A.ellipse(ctx, 0, 0, S * 0.45, S * 0.18);
      ctx.fillStyle = '#e25b5b';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-S * 0.26, 0);
      ctx.lineTo(-S * 0.14, -S * 0.9);
      ctx.lineTo(S * 0.14, -S * 0.9);
      ctx.lineTo(S * 0.26, 0);
      ctx.fill();
      ctx.fillStyle = '#e25b5b';
      ctx.fillRect(-S * 0.21, -S * 0.5, S * 0.42, S * 0.18);
      ctx.fillStyle = '#f2c14e';
      A.ellipse(ctx, 0, -S * 0.98, S * 0.12, S * 0.12);
      ctx.fill();
      ctx.strokeStyle = '#8a4b4b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  class Lantern {
    constructor(game) {
      const G = game.G;
      this.game = game;
      this.dir = U.chance(0.5) ? 1 : -1;
      this.x = this.dir > 0 ? -30 : G.W + 30;
      this.y = U.rand(G.top, G.bottom);
      this.v = U.rand(6, 12) * this.dir;
      this.ph = U.rand(TAU);
      this.c = U.pick(['#ffb36b', '#ff8fa8', '#ffd66b']);
    }
    update(dt) {
      this.x += this.v * dt;
      if (this.x < -60 || this.x > this.game.G.W + 60) this.dead = true;
    }
    draw(ctx, t) {
      const S = this.game.G.S * 0.45, y = this.y + Math.sin(t + this.ph) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(this.x, y - S * 0.4, 0, this.x, y - S * 0.4, S * 2.4);
      gl.addColorStop(0, U.rgba(this.c, 0.35));
      gl.addColorStop(1, U.rgba(this.c, 0));
      ctx.fillStyle = gl;
      ctx.fillRect(this.x - S * 2.4, y - S * 2.8, S * 4.8, S * 4.8);
      ctx.restore();
      A.ellipse(ctx, this.x, y - S * 0.4, S * 0.42, S * 0.5);
      ctx.fillStyle = this.c;
      ctx.fill();
      ctx.strokeStyle = U.darken(this.c, 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,230,0.7)';
      A.ellipse(ctx, this.x, y - S * 0.4, S * 0.18, S * 0.3);
      ctx.fill();
      ctx.fillStyle = '#6b4a3a';
      ctx.fillRect(this.x - S * 0.3, y + S * 0.05, S * 0.6, S * 0.1);
    }
  }

  Object.assign(OR, { Scene, FX, Fish, Bubble, DiveSpot, KelpPatch, Log, Buoy, Lantern });
})(window.OR);
