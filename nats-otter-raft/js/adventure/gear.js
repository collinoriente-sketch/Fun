// Visible upgrades drawn on top of the existing otter art (unit space: 1 = otter size, head up).
// drawOtter() calls these hooks only when an otter has `o.gear` (Adventure mode), so the cozy raft is untouched.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  function plate(ctx, cx, cy, w, h, fill, line) {
    ctx.beginPath();
    ctx.moveTo(cx - w, cy - h * 0.6);
    ctx.quadraticCurveTo(cx, cy - h * 0.9, cx + w, cy - h * 0.6);
    ctx.lineTo(cx + w * 0.8, cy + h * 0.3);
    ctx.quadraticCurveTo(cx, cy + h * 1.05, cx - w * 0.8, cy + h * 0.3);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = line;
    ctx.stroke();
  }

  // Behind the body: aura, energy tails, the big back shell.
  A.gearBack = function (ctx, o, t) {
    const g = o.gear, S = o.shape;
    const form = o.formFluff || 0;
    if (g.tails || o.formTails) {
      const n = o.formTails ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.45;
        const sw = Math.sin(t * 3 + i) * 0.25;
        ctx.beginPath();
        ctx.moveTo(0, S.bodyY + 0.2);
        ctx.quadraticCurveTo(Math.cos(a + sw) * 0.9, S.bodyY + 0.2 + Math.sin(a) * 0.6, Math.cos(a + sw * 2) * 1.3, S.bodyY + Math.sin(a + sw) * 1.1);
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.22;
        ctx.strokeStyle = o.formTails ? 'rgba(140,255,170,0.45)' : 'rgba(120,230,255,0.35)';
        ctx.stroke();
        ctx.lineWidth = 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.stroke();
      }
    }
    if (g.aura || form > 0) {
      const gold = form > 0 || g.halo;
      const flick = 1 + Math.sin(t * 9 + o.seed) * 0.04;
      const r = (0.95 + form * 0.35) * flick;
      const gr = ctx.createRadialGradient(0, -0.15, 0.2, 0, -0.15, r * 1.4);
      gr.addColorStop(0, gold ? 'rgba(255,230,120,0.55)' : 'rgba(140,235,255,0.5)');
      gr.addColorStop(1, gold ? 'rgba(255,200,60,0)' : 'rgba(80,200,255,0)');
      ctx.fillStyle = gr;
      A.ellipse(ctx, 0, -0.15, r, r * 1.4);
      ctx.fill();
      // flame tongues licking upward (skipped on slow devices)
      ctx.fillStyle = gold ? 'rgba(255,220,90,0.45)' : 'rgba(150,240,255,0.4)';
      for (let i = 0; i < (OR.lowFx ? 0 : 7); i++) {
        const x = (i - 3) * 0.24;
        const h = 0.5 + 0.35 * Math.abs(Math.sin(t * 7 + i * 1.9 + o.seed)) + form * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - 0.12, -0.3);
        ctx.quadraticCurveTo(x, S.headY - S.headR - h, x + 0.12, -0.3);
        ctx.fill();
      }
    }
    if (g.tankShell) {
      A.ellipse(ctx, 0, S.bodyY - 0.05, S.bodyRx * 1.35, S.bodyRy * 1.15);
      ctx.fillStyle = '#6f8f4a';
      ctx.fill();
      ctx.lineWidth = 0.04;
      ctx.strokeStyle = '#3f5a25';
      ctx.stroke();
    }
  };

  // On the body: chest armor, kelp bandolier, pearls.
  A.gearBody = function (ctx, o, t) {
    const g = o.gear, S = o.shape;
    const cy = S.bodyY - S.bodyRy * 0.1;
    if (g.metal) {
      const shine = ctx.createLinearGradient(-0.3, cy - 0.3, 0.3, cy + 0.3);
      shine.addColorStop(0, '#f4f7fb');
      shine.addColorStop(0.5, '#aab4c2');
      shine.addColorStop(1, '#7c8797');
      plate(ctx, 0, cy, 0.34, 0.4, shine, '#4d5663');
      if (g.rivets) {
        ctx.fillStyle = '#ff9d2e';
        ctx.fillRect(-0.3, cy - 0.04, 0.6, 0.07);
      }
      ctx.fillStyle = '#5c6572';
      for (const [x, y] of [[-0.22, cy - 0.2], [0.22, cy - 0.2], [-0.18, cy + 0.18], [0.18, cy + 0.18]]) {
        A.ellipse(ctx, x, y, 0.025, 0.025);
        ctx.fill();
      }
    } else if (g.shellArmor) {
      const k = Math.min(1, 0.7 + g.shellArmor * 0.06);
      A.drawShell(ctx, 0, cy + 0.02, 0.3 * k);
    }
    if (g.kelpBelt) {
      ctx.beginPath();
      ctx.moveTo(-S.bodyRx * 0.8, cy - 0.3);
      ctx.lineTo(S.bodyRx * 0.8, cy + 0.32);
      ctx.lineWidth = 0.07;
      ctx.strokeStyle = '#4f7a2a';
      ctx.stroke();
      ctx.fillStyle = '#6f9a35';
      for (let i = 0; i < 3; i++) {
        const k = 0.25 + i * 0.25;
        A.ellipse(ctx, U.lerp(-S.bodyRx * 0.8, S.bodyRx * 0.8, k), U.lerp(cy - 0.3, cy + 0.32, k), 0.06, 0.06);
        ctx.fill();
      }
    }
    if (g.pearls) {
      const y0 = S.headY + S.headR * 0.78;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.2 + (i / 6) * 0.6);
        A.ellipse(ctx, Math.cos(a) * S.headR * 0.62, y0 + Math.sin(a) * 0.08, 0.035, 0.035);
        ctx.fillStyle = '#fbf3ff';
        ctx.fill();
        ctx.lineWidth = 0.01;
        ctx.strokeStyle = '#b9a6d6';
        ctx.stroke();
      }
    }
  };

  // On the head: clip, bandana, helmet, glowing eyes, halo, super-form hair.
  A.gearHead = function (ctx, o, t) {
    const g = o.gear, S = o.shape, hr = S.headR, hy = S.headY;
    const form = o.formFluff || 0;
    if (form > 0.05) {
      ctx.fillStyle = 'rgba(255,214,70,0.95)';
      ctx.strokeStyle = '#c98a10';
      ctx.lineWidth = 0.025;
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * hr * 0.32;
        const h = hr * (0.55 + (i % 2) * 0.25) * form;
        ctx.beginPath();
        ctx.moveTo(x - hr * 0.2, hy - hr * 0.6);
        ctx.lineTo(x + (i - 2) * 0.03, hy - hr * 0.7 - h);
        ctx.lineTo(x + hr * 0.2, hy - hr * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    if (g.bandana) {
      ctx.fillStyle = '#d93a4a';
      ctx.fillRect(-hr * 0.98, hy - hr * 0.5, hr * 1.96, hr * 0.2);
      const flap = Math.sin(t * 8 + o.seed) * 0.05;
      ctx.beginPath();
      ctx.moveTo(hr * 0.95, hy - hr * 0.45);
      ctx.lineTo(hr * 1.4, hy - hr * 0.3 + flap);
      ctx.lineTo(hr * 1.3, hy - hr * 0.15 + flap);
      ctx.closePath();
      ctx.fill();
    }
    if (g.metal) {
      ctx.beginPath();
      ctx.ellipse(0, hy - hr * 0.35, hr * 1.02, hr * 0.62, 0, Math.PI, 0);
      ctx.closePath();
      const sh = ctx.createLinearGradient(-hr, hy - hr, hr, hy);
      sh.addColorStop(0, '#f4f7fb');
      sh.addColorStop(1, '#8a95a5');
      ctx.fillStyle = sh;
      ctx.fill();
      ctx.lineWidth = 0.025;
      ctx.strokeStyle = '#4d5663';
      ctx.stroke();
      ctx.fillStyle = g.halo ? '#ffd23f' : '#d93a4a';
      ctx.beginPath();
      ctx.moveTo(-0.04, hy - hr * 0.95);
      ctx.quadraticCurveTo(0, hy - hr * 1.35, 0.1, hy - hr * 1.2);
      ctx.lineTo(0.05, hy - hr * 0.95);
      ctx.fill();
    } else if (g.shellClip) {
      A.drawShell(ctx, hr * 0.62, hy - hr * 0.62, hr * 0.2);
    }
    if (g.mutant) {
      for (const s of [-1, 1]) {
        const gr = ctx.createRadialGradient(s * S.eyeX, hy + S.eyeY, 0, s * S.eyeX, hy + S.eyeY, S.eyeR * 2.4);
        gr.addColorStop(0, 'rgba(120,255,120,0.55)');
        gr.addColorStop(1, 'rgba(120,255,120,0)');
        ctx.fillStyle = gr;
        A.ellipse(ctx, s * S.eyeX, hy + S.eyeY, S.eyeR * 2.4, S.eyeR * 2.4);
        ctx.fill();
      }
    }
    if (g.halo) {
      A.ellipse(ctx, 0, hy - hr * 1.3, hr * 0.6, hr * 0.16);
      ctx.lineWidth = 0.06;
      ctx.strokeStyle = 'rgba(255,215,80,0.95)';
      ctx.stroke();
    }
    if (g.stage >= 6 && Math.sin(t * 13 + o.seed * 5) > 0.93) {
      // little crackles of power
      ctx.strokeStyle = 'rgba(200,245,255,0.9)';
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      const x0 = U.rand(-0.6, 0.6), y0 = hy - hr * U.rand(0.5, 1.1);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 0.08, y0 + 0.1);
      ctx.lineTo(x0 - 0.02, y0 + 0.16);
      ctx.lineTo(x0 + 0.1, y0 + 0.28);
      ctx.stroke();
    }
  };

  // In front: giant shell shield, shoulder pads, glowing paws.
  A.gearFront = function (ctx, o, t) {
    const g = o.gear, S = o.shape;
    if (g.metal) {
      ctx.fillStyle = '#b8c1cd';
      ctx.strokeStyle = '#4d5663';
      ctx.lineWidth = 0.02;
      for (const s of [-1, 1]) {
        const [x, y] = A.shoulder(o, s);
        A.ellipse(ctx, x, y, 0.13, 0.1);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (g.shield) {
      ctx.save();
      ctx.translate(-0.55, S.bodyY + 0.05);
      ctx.rotate(-0.2);
      A.drawShell(ctx, 0, 0, 0.36);
      ctx.restore();
    }
    if (g.energy && !OR.lowFx) {
      const k = 0.6 + 0.4 * Math.sin(t * 6 + o.seed);
      for (const [x, y] of [[o.q.alx, o.q.aly], [o.q.arx, o.q.ary]]) {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 0.2);
        gr.addColorStop(0, `rgba(170,245,255,${0.7 * k})`);
        gr.addColorStop(1, 'rgba(170,245,255,0)');
        ctx.fillStyle = gr;
        A.ellipse(ctx, x, y, 0.2, 0.2);
        ctx.fill();
      }
    }
  };
})(window.OR);
