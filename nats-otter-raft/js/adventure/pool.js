// Object pools for Adventure mode: particles and projectiles are reused, never re-allocated,
// so a busy boss fight can't pile up thousands of objects.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  class Pool {
    constructor(size, make) {
      this.items = [];
      for (let i = 0; i < size; i++) this.items.push(Object.assign(make(), { active: false }));
      this.cursor = 0;
    }
    // Grab a free object (or recycle the oldest one when full).
    get() {
      const n = this.items.length;
      for (let k = 0; k < n; k++) {
        const i = (this.cursor + k) % n;
        if (!this.items[i].active) {
          this.cursor = (i + 1) % n;
          this.items[i].active = true;
          return this.items[i];
        }
      }
      const it = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % n;
      return it;
    }
    each(fn) {
      for (const it of this.items) if (it.active) fn(it);
    }
    clear() {
      for (const it of this.items) it.active = false;
    }
    count() {
      let c = 0;
      for (const it of this.items) if (it.active) c++;
      return c;
    }
  }

  // ---------------------------------------------------------------- particles
  const blank = () => ({ kind: '', x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, life: 1, size: 4, color: '#fff', text: '', rot: 0, spin: 0 });

  class AdvFX {
    constructor() {
      this.pool = new Pool(200, blank);
    }
    add(kind, x, y, o) {
      const p = this.pool.get();
      Object.assign(p, blank(), { kind, x, y }, o || {});
      p.active = true;
      return p;
    }
    burst(kind, x, y, n, speed, color, size, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = speed * U.rand(0.35, 1);
        this.add(kind, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: kind === 'dot' || kind === 'kelp' ? speed * 1.2 : 0, color, size: size * U.rand(0.6, 1.2), life: (life || 0.8) * U.rand(0.7, 1.2), rot: Math.random() * TAU, spin: U.rand(-8, 8) });
      }
    }
    num(x, y, value, crit, color) {
      const txt = value >= 1e6 ? (value / 1e6).toFixed(1) + 'M' : value >= 1e4 ? Math.round(value / 1e3) + 'K' : String(Math.round(value));
      this.add('num', x + U.rand(-10, 10), y, { vy: -70, text: crit ? txt + '!' : txt, size: crit ? 26 : 18, color: color || (crit ? '#ffd23f' : '#ffffff'), life: 0.9 });
    }
    word(x, y, text, color, size) {
      this.add('word', x, y, { vy: -25, text, color: color || '#fff', size: size || 34, life: 1.2 });
    }
    ring(x, y, r, color, life) {
      this.add('ring', x, y, { size: r, color: color || '#fff', life: life || 0.5 });
    }
    update(dt) {
      this.pool.each((p) => {
        p.t += dt;
        if (p.t >= p.life) {
          p.active = false;
          return;
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.kind === 'num' || p.kind === 'word') p.vy *= 0.94;
      });
    }
    draw(ctx) {
      this.pool.each((p) => {
        const k = p.t / p.life, fade = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
        ctx.globalAlpha = Math.max(0, fade);
        switch (p.kind) {
          case 'dot':
            ctx.fillStyle = p.color;
            A.ellipse(ctx, p.x, p.y, p.size, p.size);
            ctx.fill();
            break;
          case 'spark':
            A.drawSparkle(ctx, p.x, p.y, p.size * (1 - k * 0.5), p.color, p.rot);
            break;
          case 'kelp':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.quadraticCurveTo(0, -p.size * 0.6, p.size, 0);
            ctx.quadraticCurveTo(0, p.size * 0.6, -p.size, 0);
            ctx.fill();
            ctx.restore();
            break;
          case 'smoke':
            ctx.fillStyle = p.color;
            A.ellipse(ctx, p.x, p.y, p.size * (0.6 + k), p.size * (0.6 + k));
            ctx.fill();
            break;
          case 'ring':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, p.size * 0.12 * (1 - k));
            A.ellipse(ctx, p.x, p.y, p.size * (0.2 + k), p.size * (0.2 + k));
            ctx.stroke();
            break;
          case 'heart':
            A.drawHeart(ctx, p.x, p.y, p.size, p.color);
            break;
          case 'num':
          case 'word': {
            const pop = p.kind === 'word' ? U.easeOutBack(Math.min(1, p.t / 0.25)) : 1 + Math.max(0, 0.3 - p.t) * 2;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(pop, pop);
            ctx.font = `900 ${p.size}px "Baloo 2", Nunito, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(3, p.size * 0.18);
            ctx.strokeStyle = 'rgba(30,20,50,0.85)';
            ctx.strokeText(p.text, 0, 0);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, 0, 0);
            ctx.restore();
            break;
          }
        }
      });
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- projectiles
  // Drawing for each projectile kind. Add a kind here to give a new attack its look.
  OR.PROJ_DRAW = {
    shell(ctx, p, t) {
      A.drawShell(ctx, p.x, p.y, p.size);
    },
    energy(ctx, p, t) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.4, p.color || 'rgba(120,230,255,0.8)');
      g.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = g;
      A.ellipse(ctx, p.x, p.y, p.size * 2.2, p.size * 2.2);
      ctx.fill();
      A.drawShell(ctx, p.x, p.y, p.size * 0.8);
    },
    kelpBomb(ctx, p, t) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(t * 8);
      ctx.fillStyle = '#5f8a2c';
      A.ellipse(ctx, 0, 0, p.size, p.size * 0.8);
      ctx.fill();
      ctx.strokeStyle = '#3d5c1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#a4c448';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.4 + i * 0.2), i, i + 2.2);
        ctx.stroke();
      }
      ctx.restore();
      // fizzing fuse
      A.drawSparkle(ctx, p.x + p.size * 0.6, p.y - p.size * 0.9, p.size * 0.5 * (0.6 + 0.4 * Math.sin(t * 30)), '#ffd23f', t * 10);
    },
    orb(ctx, p, t) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, p.color || '#6a2bd6');
      g.addColorStop(1, 'rgba(40,0,80,0)');
      ctx.fillStyle = g;
      A.ellipse(ctx, p.x, p.y, p.size, p.size);
      ctx.fill();
    },
    pebble(ctx, p) {
      A.drawRock(ctx, p.x, p.y, p.size, 3);
    },
    wave(ctx, p, t) {
      ctx.strokeStyle = p.color || 'rgba(160,120,255,0.9)';
      ctx.lineWidth = p.size * 0.25;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(p.x + i * p.size * 0.4, p.y, p.size * (0.6 + i * 0.25), Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();
      }
    },
  };

  const blankProj = () => ({ kind: 'shell', from: 'otter', x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, life: 3, size: 8, dmg: 0, color: null, target: null, tx: 0, ty: 0, homing: 0, onHit: null, draw: null, crit: false, spin: 0 });

  class Projectiles {
    constructor() {
      this.pool = new Pool(90, blankProj);
    }
    fire(o) {
      const p = this.pool.get();
      Object.assign(p, blankProj(), o);
      p.active = true;
      return p;
    }
    // Lob something along an arc so it lands on (tx, ty) after `time` seconds.
    lob(o, time) {
      const g = o.g || 900;
      o.vx = (o.tx - o.x) / time;
      o.vy = (o.ty - o.y - 0.5 * g * time * time) / time;
      o.g = g;
      o.life = time;
      return this.fire(o);
    }
    update(dt, hitTest) {
      this.pool.each((p) => {
        p.t += dt;
        if (p.homing && p.target) {
          const tx = p.target.x, ty = p.target.y;
          const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(p.vx, p.vy) || 1;
          p.vx = U.lerp(p.vx, (dx / d) * sp, Math.min(1, p.homing * dt));
          p.vy = U.lerp(p.vy, (dy / d) * sp, Math.min(1, p.homing * dt));
        }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (hitTest(p) || p.t >= p.life) {
          if (p.t >= p.life && p.onHit && !p.hit) p.onHit(p);
          p.active = false;
        }
      });
    }
    draw(ctx, t) {
      this.pool.each((p) => {
        const d = p.draw || OR.PROJ_DRAW[p.kind];
        if (d) d(ctx, p, t);
      });
    }
    clear(from) {
      this.pool.each((p) => {
        if (!from || p.from === from) p.active = false;
      });
    }
  }

  OR.Pool = Pool;
  OR.AdvFX = AdvFX;
  OR.Projectiles = Projectiles;
})(window.OR);
