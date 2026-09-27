// Pickups and small enemies for Adventure mode. Both drift left with the world as it scrolls.
// Add an enemy: add an entry to OR.ENEMY_TYPES with hp/speed/zone and a draw() function.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  // ---------------------------------------------------------------- pickups
  OR.drawPickup = function (ctx, type, x, y, s, t) {
    if (OR.Assets.draw(ctx, 'items/' + type, x, y, s * 2.2, s * 2.2)) return;
    switch (type) {
      case 'shell':
        A.drawShell(ctx, x, y, s);
        break;
      case 'kelp':
        ctx.fillStyle = '#5f8a2c';
        for (let i = -1; i <= 1; i++) {
          ctx.save();
          ctx.translate(x + i * s * 0.35, y);
          ctx.rotate(i * 0.4);
          A.ellipse(ctx, 0, -s * 0.2, s * 0.28, s * 0.8);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#b5a64a';
        A.ellipse(ctx, x, y + s * 0.5, s * 0.25, s * 0.25);
        ctx.fill();
        break;
      case 'metal': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.4);
        ctx.fillStyle = '#9aa3ad';
        ctx.strokeStyle = '#5b636d';
        ctx.lineWidth = s * 0.1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          ctx.lineTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5b636d';
        A.ellipse(ctx, 0, 0, s * 0.28, s * 0.28);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'pearl':
        A.drawPearl(ctx, x, y, s * 0.7, t);
        break;
      case 'fish':
        A.drawFish(ctx, x, y, s * 2, Math.PI, t, '#ffa25c', 1);
        break;
      case 'chest':
        OR.drawChest(ctx, x, y, s * 1.1, false);
        A.drawSparkle(ctx, x + s, y - s, s * 0.5 * (0.6 + 0.4 * Math.sin(t * 5)), '#fff3b0', t);
        break;
    }
  };

  class Pickup {
    constructor(adv, type, x, y) {
      this.adv = adv;
      this.type = type;
      this.x = x;
      this.y = y;
      this.t = Math.random() * 10;
      this.flying = null; // set when collected: flies to its collector
    }
    update(dt, scrollPx) {
      this.t += dt;
      if (this.flying) {
        const f = this.flying;
        f.k += dt / 0.28;
        this.x = U.lerp(f.x0, f.tx(), U.easeInOut(Math.min(1, f.k)));
        this.y = U.lerp(f.y0, f.ty(), U.easeInOut(Math.min(1, f.k))) - Math.sin(Math.PI * Math.min(1, f.k)) * this.adv.G.S * 0.6;
        if (f.k >= 1) {
          this.dead = true;
          f.done();
        }
        return;
      }
      this.x -= scrollPx * dt;
      if (this.x < -60) this.dead = true;
    }
    draw(ctx, t) {
      const S = this.adv.G.S;
      const bob = this.flying ? 0 : Math.sin(this.t * 2.2) * S * 0.06;
      if (!this.flying) {
        const k = 0.5 + 0.5 * Math.sin(this.t * 3);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.15 * k})`;
        A.ellipse(ctx, this.x, this.y + bob, S * 0.42, S * 0.42);
        ctx.fill();
      }
      OR.drawPickup(ctx, this.type, this.x, this.y + bob, S * (this.type === 'chest' ? 0.34 : 0.26), t);
    }
  }

  // ---------------------------------------------------------------- enemies
  // zone: 'surface' | 'under' | 'air'. hp is a multiple of BAL.enemyHp.
  OR.ENEMY_TYPES = {
    crab: {
      hp: 1.2, speed: 0.35, zone: 'surface', weight: 3,
      draw(ctx, e, t, s) {
        // riding a bit of driftwood
        ctx.fillStyle = '#9a7552';
        ctx.fillRect(e.x - s * 0.8, e.y + s * 0.25, s * 1.6, s * 0.16);
        ctx.fillStyle = '#e8573f';
        A.ellipse(ctx, e.x, e.y, s * 0.55, s * 0.36);
        ctx.fill();
        const snap = Math.sin(t * 8 + e.seed) * 0.3;
        for (const d of [-1, 1]) {
          ctx.save();
          ctx.translate(e.x + d * s * 0.55, e.y - s * 0.15);
          ctx.rotate(d * (0.4 + snap));
          ctx.beginPath();
          ctx.arc(d * s * 0.2, -s * 0.2, s * 0.22, 0, TAU * 0.85);
          ctx.lineTo(d * s * 0.2, -s * 0.2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#fff';
        for (const d of [-1, 1]) {
          A.ellipse(ctx, e.x + d * s * 0.16, e.y - s * 0.42, s * 0.1, s * 0.1);
          ctx.fill();
        }
        ctx.fillStyle = '#1d1520';
        for (const d of [-1, 1]) {
          A.ellipse(ctx, e.x + d * s * 0.16 - s * 0.03, e.y - s * 0.42, s * 0.05, s * 0.05);
          ctx.fill();
        }
      },
    },
    jelly: {
      hp: 0.9, speed: 0.25, zone: 'under', weight: 3,
      draw(ctx, e, t, s) {
        const pulse = 1 + Math.sin(t * 4 + e.seed) * 0.08;
        ctx.strokeStyle = 'rgba(255,170,230,0.7)';
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(e.x + i * s * 0.14, e.y);
          ctx.quadraticCurveTo(e.x + i * s * 0.14 + Math.sin(t * 3 + i) * s * 0.15, e.y + s * 0.5, e.x + i * s * 0.12, e.y + s * 0.9);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,150,220,0.75)';
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, s * 0.5 * pulse, s * 0.45 / pulse, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#1d1520';
        A.ellipse(ctx, e.x - s * 0.15, e.y - s * 0.15, s * 0.05, s * 0.07);
        ctx.fill();
        A.ellipse(ctx, e.x + s * 0.15, e.y - s * 0.15, s * 0.05, s * 0.07);
        ctx.fill();
      },
    },
    puffer: {
      hp: 1.6, speed: 0.45, zone: 'under', weight: 2,
      draw(ctx, e, t, s) {
        const puff = e.hurtT > 0 ? 1.35 : 1;
        const r = s * 0.45 * puff;
        ctx.strokeStyle = '#b8902a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          ctx.moveTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
          ctx.lineTo(e.x + Math.cos(a) * r * 1.3, e.y + Math.sin(a) * r * 1.3);
        }
        ctx.stroke();
        ctx.fillStyle = '#ffd35c';
        A.ellipse(ctx, e.x, e.y, r, r);
        ctx.fill();
        ctx.fillStyle = '#1d1520';
        A.ellipse(ctx, e.x - r * 0.4, e.y - r * 0.2, r * 0.15, r * 0.15);
        ctx.fill();
      },
    },
    gull: {
      hp: 0.8, speed: 0.8, zone: 'air', weight: 2,
      draw(ctx, e, t, s) {
        const f = Math.sin(t * 10 + e.seed) * s * 0.35;
        ctx.fillStyle = '#ffffff';
        A.ellipse(ctx, e.x, e.y, s * 0.45, s * 0.22);
        ctx.fill();
        ctx.strokeStyle = '#8f98a8';
        ctx.lineWidth = s * 0.12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.x - s * 0.1, e.y);
        ctx.lineTo(e.x + s * 0.2, e.y - s * 0.4 - f);
        ctx.moveTo(e.x + s * 0.05, e.y);
        ctx.lineTo(e.x + s * 0.45, e.y - s * 0.3 - f);
        ctx.stroke();
        ctx.fillStyle = '#ffb02e';
        ctx.beginPath();
        ctx.moveTo(e.x - s * 0.45, e.y - s * 0.05);
        ctx.lineTo(e.x - s * 0.7, e.y);
        ctx.lineTo(e.x - s * 0.45, e.y + s * 0.05);
        ctx.fill();
      },
    },
    // boss minions (spawned by bosses, never randomly)
    bug: {
      hp: 0.5, speed: 1.2, zone: 'air', weight: 0, homing: true,
      draw(ctx, e, t, s) {
        ctx.fillStyle = '#7bd14a';
        A.ellipse(ctx, e.x, e.y, s * 0.3, s * 0.2);
        ctx.fill();
        ctx.fillStyle = 'rgba(220,255,255,0.6)';
        const f = Math.sin(t * 40) * s * 0.1;
        A.ellipse(ctx, e.x, e.y - s * 0.2 - f, s * 0.2, s * 0.1);
        ctx.fill();
        ctx.fillStyle = '#ff3b3b';
        A.ellipse(ctx, e.x - s * 0.18, e.y - s * 0.04, s * 0.06, s * 0.06);
        ctx.fill();
      },
    },
    coconutCrab: {
      hp: 1, speed: 0.9, zone: 'surface', weight: 0, homing: true,
      draw(ctx, e, t, s) {
        ctx.fillStyle = '#7a4a2a';
        A.ellipse(ctx, e.x, e.y, s * 0.4, s * 0.38);
        ctx.fill();
        ctx.fillStyle = '#4a2a14';
        for (const [dx, dy] of [[-0.12, -0.1], [0.1, -0.15], [0, 0.05]]) {
          A.ellipse(ctx, e.x + dx * s, e.y + dy * s, s * 0.05, s * 0.05);
          ctx.fill();
        }
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = s * 0.08;
        ctx.beginPath();
        ctx.moveTo(e.x - s * 0.35, e.y);
        ctx.lineTo(e.x - s * 0.6, e.y - s * 0.25 + Math.sin(t * 9) * s * 0.1);
        ctx.stroke();
      },
    },
  };

  class Enemy {
    constructor(adv, kind, x, y) {
      const def = OR.ENEMY_TYPES[kind];
      this.adv = adv;
      this.kind = kind;
      this.def = def;
      this.x = x;
      this.y = y;
      this.baseY = y;
      this.seed = Math.random() * 10;
      this.maxHp = OR.BAL.enemyHp * def.hp * Math.pow(OR.BAL.enemyHpGrowthPerBoss, adv.st.defeated || 0) * adv.cycleMult();
      this.hp = this.maxHp;
      this.hurtT = 0;
      this.t = 0;
    }
    update(dt, scrollPx) {
      const G = this.adv.G;
      this.t += dt;
      this.hurtT = Math.max(0, this.hurtT - dt);
      const sp = this.def.speed * G.S;
      if (this.def.homing) {
        const tgt = this.adv.squad.front();
        const dx = tgt.x - this.x, dy = tgt.y - G.S * 0.4 - this.y, d = Math.hypot(dx, dy) || 1;
        this.x += (dx / d) * sp * dt;
        this.y += (dy / d) * sp * dt;
      } else {
        this.x -= scrollPx * dt + sp * dt;
        if (this.def.zone === 'under') this.y = this.baseY + Math.sin(this.t * 1.5 + this.seed) * G.S * 0.3;
        if (this.def.zone === 'air') this.y = this.baseY + Math.sin(this.t * 2 + this.seed) * G.S * 0.25;
      }
      if (this.x < -80) this.dead = true;
    }
    hit(dmg) {
      this.hp -= dmg;
      this.hurtT = 0.25;
      if (this.hp <= 0 && !this.dead) {
        this.dead = true;
        this.adv.enemyKilled(this);
      }
    }
    draw(ctx, t) {
      const s = this.adv.G.S * 0.8;
      if (this.hurtT > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.hurtT * 60);
      this.def.draw(ctx, this, t, s);
      ctx.globalAlpha = 1;
      if (this.hp < this.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(this.x - s * 0.5, this.y - s * 0.85, s, 4);
        ctx.fillStyle = '#ff6f7d';
        ctx.fillRect(this.x - s * 0.5, this.y - s * 0.85, s * Math.max(0, this.hp / this.maxHp), 4);
      }
    }
  }

  OR.Pickup = Pickup;
  OR.Enemy = Enemy;
})(window.OR);
