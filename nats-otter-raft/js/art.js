// All procedural drawing: the otters themselves plus the little things they play with.
// Otters are drawn in "unit" space: 1 unit = the otter's size in pixels (o.u), head pointing up.
(function (OR) {
  'use strict';
  const U = OR.util;
  const A = (OR.art = {});
  const TAU = U.TAU;

  // ---------------------------------------------------------------- shapes

  // A scalloped ellipse: little bumps all the way round read as soft fur.
  // `pear` > 0 makes the bottom half wider (chubby tummy).
  A.fluffPath = function (ctx, cx, cy, rx, ry, bumps, puff, phase, pear) {
    pear = pear || 0;
    const step = TAU / bumps;
    const pt = (a, k) => {
      const w = rx * (1 + pear * Math.sin(a)) * k;
      return [cx + Math.cos(a) * w, cy + Math.sin(a) * ry * k];
    };
    ctx.beginPath();
    for (let i = 0; i <= bumps; i++) {
      const a = i * step + phase;
      const [x, y] = pt(a, 1);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const [mx, my] = pt(a - step / 2, 1 + puff);
        ctx.quadraticCurveTo(mx, my, x, y);
      }
    }
    ctx.closePath();
  };

  A.ellipse = function (ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.0001, rx), Math.max(0.0001, ry), rot || 0, 0, TAU);
  };

  A.heartPath = function (ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.1, y + s * 0.25, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.22);
    ctx.bezierCurveTo(x - s * 0.45, y - s * 0.52, x - s * 0.08, y - s * 0.5, x, y - s * 0.22);
    ctx.bezierCurveTo(x + s * 0.08, y - s * 0.5, x + s * 0.45, y - s * 0.52, x + s * 0.5, y - s * 0.22);
    ctx.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.25, x, y + s * 0.35);
    ctx.closePath();
  };

  A.drawHeart = function (ctx, x, y, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    A.heartPath(ctx, x, y, s);
    ctx.fillStyle = color || '#ff6f9c';
    ctx.fill();
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = 'rgba(160,40,80,0.35)';
    ctx.stroke();
    A.ellipse(ctx, x - s * 0.24, y - s * 0.22, s * 0.1, s * 0.07, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  };

  A.drawSparkle = function (ctx, x, y, s, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a + TAU / 8) * s * 0.28, Math.sin(a + TAU / 8) * s * 0.28);
    }
    ctx.closePath();
    ctx.fillStyle = color || '#fffbe0';
    ctx.fill();
    ctx.restore();
  };

  // ---------------------------------------------------------------- items

  A.drawRock = function (ctx, x, y, r, seed) {
    seed = seed || 1;
    ctx.save();
    ctx.translate(x, y);
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 0.86 + 0.14 * Math.sin(seed * 7.3 + i * 2.1);
      pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k * 0.78]);
    }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], nx = pts[(i + 1) % n];
      const mx = (p[0] + nx[0]) / 2, my = (p[1] + nx[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(p[0], p[1], mx, my);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#c3c7cc');
    g.addColorStop(1, '#7c838b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.13;
    ctx.strokeStyle = '#555b63';
    ctx.stroke();
    A.ellipse(ctx, -r * 0.3, -r * 0.3, r * 0.28, r * 0.14, -0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
  };

  A.drawShell = function (ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    const base = [0, r * 0.62];
    const a0 = Math.PI * 1.12, a1 = Math.PI * 1.88, bumps = 6;
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    for (let i = 0; i <= bumps; i++) {
      const a = U.lerp(a0, a1, i / bumps);
      const px = Math.cos(a) * r, py = base[1] + Math.sin(a) * r * 1.35;
      if (i === 0) ctx.lineTo(px, py);
      else {
        const am = U.lerp(a0, a1, (i - 0.5) / bumps);
        ctx.quadraticCurveTo(Math.cos(am) * r * 1.14, base[1] + Math.sin(am) * r * 1.5, px, py);
      }
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#ffe2cc');
    g.addColorStop(1, '#ff9f8f');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.11;
    ctx.strokeStyle = '#c9695f';
    ctx.stroke();
    ctx.lineWidth = r * 0.07;
    ctx.strokeStyle = 'rgba(214,106,96,0.55)';
    for (let i = 1; i < bumps; i++) {
      const a = U.lerp(a0, a1, i / bumps);
      ctx.beginPath();
      ctx.moveTo(base[0], base[1]);
      ctx.lineTo(Math.cos(a) * r * 0.95, base[1] + Math.sin(a) * r * 1.28);
      ctx.stroke();
    }
    // little hinge "ears"
    ctx.fillStyle = '#ffb8a3';
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, base[1] - r * 0.05);
    ctx.lineTo(r * 0.32, base[1] - r * 0.05);
    ctx.lineTo(r * 0.18, base[1] + r * 0.22);
    ctx.lineTo(-r * 0.18, base[1] + r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  A.drawPearl = function (ctx, x, y, r, t) {
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
    glow.addColorStop(0, 'rgba(255,245,200,0.55)');
    glow.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#fbe8ff');
    g.addColorStop(1, '#c6b3ec');
    A.ellipse(ctx, x, y, r, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = '#9d86c9';
    ctx.stroke();
    const tw = 0.6 + 0.4 * Math.sin((t || 0) * 5);
    A.drawSparkle(ctx, x + r * 0.7, y - r * 0.75, r * 0.7 * tw, '#fffbe0', (t || 0) * 0.8);
    ctx.restore();
  };

  A.drawItem = function (ctx, type, x, y, r, t, seed) {
    if (type === 'rock') A.drawRock(ctx, x, y, r, seed);
    else if (type === 'shell') A.drawShell(ctx, x, y, r);
    else if (type === 'pearl') A.drawPearl(ctx, x, y, r * 0.8, t);
    else if (type === 'fish') A.drawFish(ctx, x, y, r * 2.2, 0, t, '#ffa25c', 1);
  };

  A.drawFish = function (ctx, x, y, len, angle, t, color, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    const w = Math.sin(t * 14) * 0.35;
    // tail
    ctx.beginPath();
    ctx.moveTo(-len * 0.35, 0);
    ctx.lineTo(-len * 0.62, -len * 0.2 + w * len * 0.1);
    ctx.lineTo(-len * 0.56, w * len * 0.08);
    ctx.lineTo(-len * 0.62, len * 0.2 + w * len * 0.1);
    ctx.closePath();
    ctx.fillStyle = U.darken(color, 0.12);
    ctx.fill();
    A.ellipse(ctx, 0, 0, len * 0.42, len * 0.22);
    const g = ctx.createLinearGradient(0, -len * 0.22, 0, len * 0.22);
    g.addColorStop(0, U.lighten(color, 0.25));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = len * 0.04;
    ctx.strokeStyle = U.darken(color, 0.35);
    ctx.stroke();
    A.ellipse(ctx, len * 0.2, -len * 0.04, len * 0.06, len * 0.06);
    ctx.fillStyle = '#1d1520';
    ctx.fill();
    A.ellipse(ctx, len * 0.215, -len * 0.06, len * 0.022, len * 0.022);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  };

  // ---------------------------------------------------------------- otter

  // Where the shoulders sit in unit space.
  A.shoulder = (o, side) => [side * o.shape.bodyRx * 0.62, o.shape.bodyY - o.shape.bodyRy * 0.62];
  A.ARM_REACH = 0.62;

  function limbPath(ctx, sx, sy, ex, ey, side) {
    // gentle elbow bend outward
    const mx = (sx + ex) / 2 + side * 0.07, my = (sy + ey) / 2 + 0.04;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
  }

  function drawLimb(ctx, o, side, ex, ey) {
    const P = o.pal;
    const [sx, sy] = A.shoulder(o, side);
    ctx.lineCap = 'round';
    limbPath(ctx, sx, sy, ex, ey, side);
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    limbPath(ctx, sx, sy, ex, ey, side);
    ctx.lineWidth = 0.145;
    ctx.strokeStyle = P.fur;
    ctx.stroke();
  }

  function drawPaw(ctx, o, ex, ey) {
    const P = o.pal;
    A.ellipse(ctx, ex, ey, 0.09, 0.082);
    ctx.fillStyle = P.paw;
    ctx.fill();
    ctx.lineWidth = 0.028;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    // tiny toes
    ctx.lineWidth = 0.014;
    ctx.strokeStyle = U.rgba('#ffffff', 0.35);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(ex + i * 0.03, ey - 0.075);
      ctx.lineTo(ex + i * 0.03, ey - 0.045);
      ctx.stroke();
    }
  }

  function drawFoot(ctx, o, side, t, q) {
    const P = o.pal, S = o.shape;
    ctx.save();
    ctx.translate(side * S.bodyRx * 0.42, S.bodyY + S.bodyRy * 0.8);
    ctx.rotate(side * 0.38 + Math.sin(t * 13 + side * 1.7) * 0.4 * q.kick + side * q.wiggle * 0.2);
    // webbed foot with the sole facing up at us
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.02);
    ctx.quadraticCurveTo(-0.15, 0.13, -0.1, 0.22);
    ctx.quadraticCurveTo(0, 0.27, 0.1, 0.22);
    ctx.quadraticCurveTo(0.15, 0.13, 0.08, -0.02);
    ctx.closePath();
    ctx.fillStyle = P.paw;
    ctx.fill();
    ctx.lineWidth = 0.028;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    // toe beans!
    ctx.fillStyle = P.bean;
    A.ellipse(ctx, 0, 0.08, 0.052, 0.042);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
      A.ellipse(ctx, i * 0.05, 0.175 - Math.abs(i) * 0.015, 0.024, 0.022);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEye(ctx, o, x, y, r, q) {
    const P = o.pal;
    const open = q.eo * (1 - o.blink);
    ctx.lineCap = 'round';
    if (open > 0.22) {
      ctx.save();
      ctx.translate(x + q.lookX * r * 0.28, y + q.lookY * r * 0.22);
      ctx.scale(1, Math.min(1, open) * (1 + q.oh * 0.15));
      if (P.eyeRing) {
        A.ellipse(ctx, 0, 0, r * 1.22, r * 1.3);
        ctx.fillStyle = P.eyeRing;
        ctx.fill();
      }
      A.ellipse(ctx, 0, 0, r, r * 1.1);
      const g = ctx.createRadialGradient(0, r * 0.3, r * 0.1, 0, 0, r * 1.1);
      g.addColorStop(0, '#3d2b3d');
      g.addColorStop(1, '#140c14');
      ctx.fillStyle = g;
      ctx.fill();
      A.ellipse(ctx, -r * 0.3, -r * 0.38, r * 0.38, r * 0.38);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      A.ellipse(ctx, r * 0.36, r * 0.34, r * 0.16, r * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.restore();
      if (P.lash) {
        const s = x < 0 ? -1 : 1;
        ctx.lineWidth = r * 0.2;
        ctx.strokeStyle = '#1d1520';
        for (let i = 0; i < 2; i++) {
          const a = -Math.PI / 2 + s * (0.75 + i * 0.4);
          const bx = x + Math.cos(a) * r * 0.95, bY = y + Math.sin(a) * r * 1.05 * open;
          ctx.beginPath();
          ctx.moveTo(bx, bY);
          ctx.lineTo(bx + Math.cos(a) * r * 0.45, bY + Math.sin(a) * r * 0.4);
          ctx.stroke();
        }
      }
    } else {
      ctx.beginPath();
      if (q.happy > 0.5) ctx.arc(x, y + r * 0.35, r * 0.72, Math.PI * 1.12, Math.PI * 1.88);
      else ctx.arc(x, y - r * 0.35, r * 0.72, Math.PI * 0.12, Math.PI * 0.88);
      ctx.lineWidth = r * 0.34;
      ctx.strokeStyle = P.eye;
      ctx.stroke();
    }
  }

  function drawHead(ctx, o, t, q) {
    const P = o.pal, S = o.shape;
    const hy = S.headY, hr = S.headR;
    // ears
    for (const s of [-1, 1]) {
      A.ellipse(ctx, s * hr * 0.74, hy - hr * 0.6, hr * 0.2, hr * 0.18);
      ctx.fillStyle = P.fur;
      ctx.fill();
      ctx.lineWidth = 0.028;
      ctx.strokeStyle = P.line;
      ctx.stroke();
      A.ellipse(ctx, s * hr * 0.74, hy - hr * 0.6, hr * 0.1, hr * 0.09);
      ctx.fillStyle = P.earIn;
      ctx.fill();
    }
    // head fluff
    const g = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.4, hr * 0.1, 0, hy, hr * 1.1);
    g.addColorStop(0, P.furLight);
    g.addColorStop(1, P.fur);
    A.fluffPath(ctx, 0, hy, hr * 1.06, hr * 0.9, 20, S.fluff * 0.8, o.seed, -0.06);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 0.032;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    // pale face mask
    A.fluffPath(ctx, 0, hy + hr * 0.16, hr * 0.84, hr * 0.64, 16, 0.09, o.seed + 1, -0.1);
    ctx.fillStyle = P.face;
    ctx.fill();

    // tuft on top of the head
    if (o.def.tuft) {
      ctx.fillStyle = P.fur;
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 0.025;
      for (let i = -1; i <= 1; i++) {
        const bx = i * hr * 0.14, byy = hy - hr * 0.86;
        const sw = Math.sin(t * 2 + i) * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - hr * 0.09, byy + hr * 0.08);
        ctx.quadraticCurveTo(bx + sw, byy - hr * (i === 0 ? 0.36 : 0.24), bx + hr * 0.09 + i * 0.03, byy + hr * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // blush
    ctx.fillStyle = U.rgba('#ff7a9a', 0.28 + q.blush * 0.32);
    for (const s of [-1, 1]) {
      A.ellipse(ctx, s * hr * 0.6, hy + hr * 0.28, hr * 0.16, hr * 0.1);
      ctx.fill();
    }

    // eyes
    for (const s of [-1, 1]) drawEye(ctx, o, s * S.eyeX, hy + S.eyeY, S.eyeR, q);

    // muzzle pads
    const pady = hy + hr * 0.36;
    ctx.fillStyle = P.muzzle;
    for (const s of [-1, 1]) {
      A.ellipse(ctx, s * hr * 0.14, pady, hr * 0.17, hr * 0.14);
      ctx.fill();
    }
    // whisker dots
    ctx.fillStyle = U.rgba(P.line, 0.45);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        A.ellipse(ctx, s * hr * (0.1 + i * 0.07), pady + (i === 1 ? -0.015 : 0.01), 0.01, 0.01);
        ctx.fill();
      }
    }

    // mouth
    const my = hy + hr * 0.45;
    if (q.yawn > 0.05) {
      A.ellipse(ctx, 0, my + hr * 0.08 * q.yawn, hr * 0.15 * q.yawn + 0.01, hr * 0.2 * q.yawn + 0.01);
      ctx.fillStyle = '#6b2438';
      ctx.fill();
      A.ellipse(ctx, 0, my + hr * 0.18 * q.yawn, hr * 0.09 * q.yawn, hr * 0.07 * q.yawn);
      ctx.fillStyle = '#ff8fa6';
      ctx.fill();
    } else if (q.oh > 0.3) {
      A.ellipse(ctx, 0, my + hr * 0.04, hr * 0.07 * q.oh, hr * 0.09 * q.oh);
      ctx.fillStyle = '#6b2438';
      ctx.fill();
    } else {
      const m = hr * 0.085;
      ctx.beginPath();
      ctx.moveTo(0, my - hr * 0.1);
      ctx.lineTo(0, my - hr * 0.02);
      ctx.moveTo(-m * 2, my - hr * 0.02);
      ctx.arc(-m, my - hr * 0.02, m, Math.PI, 0, true);
      ctx.arc(m, my - hr * 0.02, m, Math.PI, 0, true);
      ctx.lineWidth = 0.022;
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba(P.nose, 0.85);
      ctx.stroke();
    }

    // nose (drawn over the top of the mouth line)
    const ny = hy + hr * 0.2;
    ctx.beginPath();
    ctx.moveTo(-hr * 0.15, ny - hr * 0.05);
    ctx.quadraticCurveTo(0, ny - hr * 0.12, hr * 0.15, ny - hr * 0.05);
    ctx.quadraticCurveTo(hr * 0.12, ny + hr * 0.08, 0, ny + hr * 0.1);
    ctx.quadraticCurveTo(-hr * 0.12, ny + hr * 0.08, -hr * 0.15, ny - hr * 0.05);
    ctx.closePath();
    ctx.fillStyle = P.nose;
    ctx.fill();
    A.ellipse(ctx, -hr * 0.05, ny - hr * 0.05, hr * 0.045, hr * 0.025, -0.3);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    // whiskers
    ctx.strokeStyle = P.whisker;
    ctx.lineWidth = 0.013;
    const wig = Math.sin(t * 3 + o.seed) * 0.02;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const sx = s * hr * 0.24, sy = pady + (i - 1) * 0.03;
        const ex = s * hr * 0.9, ey = sy + (i - 1) * 0.07 + wig;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) / 2, sy - 0.03 + (i - 1) * 0.02, ex, ey);
        ctx.stroke();
      }
    }

    // accessories
    if (o.def.flower) drawFlower(ctx, -hr * 0.78, hy - hr * 0.62, hr * 0.26, t);
  }

  function drawFlower(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.3) * 0.08 - 0.3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      A.ellipse(ctx, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.46, r * 0.36, a);
      ctx.fillStyle = i % 2 ? '#ffb3cf' : '#ff9ec4';
      ctx.fill();
      ctx.lineWidth = r * 0.07;
      ctx.strokeStyle = '#e0709a';
      ctx.stroke();
    }
    A.ellipse(ctx, 0, 0, r * 0.3, r * 0.3);
    ctx.fillStyle = '#ffd66b';
    ctx.fill();
    ctx.restore();
  }

  function drawKelpWrap(ctx, o, t, k) {
    const S = o.shape;
    ctx.save();
    ctx.globalAlpha *= k;
    const y0 = S.bodyY + S.bodyRy * 0.15;
    ctx.beginPath();
    ctx.moveTo(-0.95, y0 - 0.05);
    ctx.bezierCurveTo(-0.3, y0 - 0.2 + Math.sin(t) * 0.03, 0.3, y0 + 0.28, 0.95, y0 + 0.08);
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = '#4f6b24';
    ctx.stroke();
    ctx.lineWidth = 0.14;
    ctx.strokeStyle = '#86a53c';
    ctx.stroke();
    ctx.fillStyle = '#a7b546';
    for (const bx of [-0.62, 0.66]) {
      A.ellipse(ctx, bx, y0 + (bx < 0 ? -0.08 : 0.12), 0.06, 0.05);
      ctx.fill();
    }
    ctx.restore();
  }

  // Foam ring + soft shadow where the otter meets the water.
  A.drawWaterRing = function (ctx, o, t) {
    const q = o.q, u = o.u;
    const vis = 1 - U.clamp(q.sub / 0.7, 0, 1);
    if (vis <= 0.02 || o.onLog) return;
    ctx.save();
    ctx.translate(o.x, o.y + 0.06 * u);
    ctx.rotate(q.rot);
    ctx.globalAlpha = vis;
    const S = o.shape;
    A.ellipse(ctx, 0.05 * u, -0.02 * u, u * 0.56, u * (S.bodyRy + 0.46));
    ctx.fillStyle = 'rgba(12,50,90,0.14)';
    ctx.fill();
    const w = 1 + Math.sin(t * 2.2 + o.seed) * 0.03;
    A.ellipse(ctx, 0, -0.06 * u, u * 0.55 * w, u * (S.bodyRy + 0.42) * w);
    ctx.lineWidth = u * 0.035;
    ctx.setLineDash([u * 0.16, u * 0.07]);
    ctx.lineDashOffset = -t * u * 0.08;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
    ctx.restore();
  };

  // A blurry shape under the surface while an otter is diving.
  A.drawUnderwater = function (ctx, o, t) {
    const q = o.q;
    const a = U.clamp((q.sub - 0.4) / 0.6, 0, 1);
    if (a <= 0.02) return;
    ctx.save();
    ctx.translate(o.x, o.y + o.u * 0.3);
    ctx.rotate(Math.atan2(o.vy, o.vx) || 0);
    ctx.globalAlpha = a * 0.35;
    A.ellipse(ctx, 0, 0, o.u * 0.75, o.u * 0.3);
    ctx.fillStyle = U.darken(o.pal.fur, 0.3);
    ctx.fill();
    A.ellipse(ctx, o.u * 0.62, 0, o.u * 0.28, o.u * 0.24);
    ctx.fill();
    ctx.restore();
  };

  A.drawOtter = function (ctx, o, t) {
    const q = o.q, P = o.pal, S = o.shape, u = o.u;
    const alpha = 1 - U.clamp((q.sub - 0.2) / 0.6, 0, 1);
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.translate(o.x, o.y + (q.bob - q.lift) * u);
    ctx.rotate(q.rot);
    ctx.scale(u * q.sx, u * q.sy);
    ctx.globalAlpha = alpha;
    const breathe = 1 + Math.sin(t * (o.sleeping ? 1.4 : 2.2) + o.seed) * 0.018;
    const by = S.bodyY;

    // tail
    ctx.save();
    ctx.translate(0, by + S.bodyRy * 0.82);
    ctx.rotate(Math.sin(t * 2.1 + o.seed) * 0.16 + q.kick * Math.sin(t * 11) * 0.3);
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.05);
    ctx.quadraticCurveTo(-0.16, 0.22, -0.05, 0.4);
    ctx.quadraticCurveTo(0, 0.46, 0.05, 0.4);
    ctx.quadraticCurveTo(0.16, 0.22, 0.12, -0.05);
    ctx.closePath();
    ctx.fillStyle = P.paw;
    ctx.fill();
    ctx.lineWidth = 0.03;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    ctx.restore();

    // body
    const bg = ctx.createRadialGradient(-S.bodyRx * 0.4, by - S.bodyRy * 0.5, 0.05, 0, by, S.bodyRy * 1.15);
    bg.addColorStop(0, P.furLight);
    bg.addColorStop(1, P.fur);
    A.fluffPath(ctx, 0, by, S.bodyRx * breathe, S.bodyRy, 22, S.fluff, o.seed * 3, S.pear);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 0.034;
    ctx.strokeStyle = P.line;
    ctx.stroke();
    // tummy
    A.fluffPath(ctx, 0, by + S.bodyRy * 0.12, S.bodyRx * 0.62 * breathe, S.bodyRy * 0.66, 14, S.fluff * 0.7, o.seed, S.pear * 0.6);
    ctx.fillStyle = P.belly;
    ctx.fill();

    if (q.kelp > 0.02) drawKelpWrap(ctx, o, t, q.kelp);

    // feet poke up at the bottom
    drawFoot(ctx, o, -1, t, q);
    drawFoot(ctx, o, 1, t, q);

    // arms: which ones go over the face?
    const faceLine = S.headY + S.headR * 0.55;
    const lowL = q.aly > faceLine, lowR = q.ary > faceLine;
    if (lowL) drawLimb(ctx, o, -1, q.alx, q.aly);
    if (lowR) drawLimb(ctx, o, 1, q.arx, q.ary);

    const itemHigh = q.itemY > 0.35;
    if (o.holding && !itemHigh) A.drawItem(ctx, o.holding, 0, 0.02 - q.itemY, 0.17, t, o.seed);
    if (lowL) drawPaw(ctx, o, q.alx, q.aly);
    if (lowR) drawPaw(ctx, o, q.arx, q.ary);

    ctx.save();
    ctx.translate(0, S.headY);
    ctx.rotate(q.tilt);
    ctx.translate(0, -S.headY);
    drawHead(ctx, o, t, q);
    ctx.restore();

    if (!lowL) {
      drawLimb(ctx, o, -1, q.alx, q.aly);
      drawPaw(ctx, o, q.alx, q.aly);
    }
    if (!lowR) {
      drawLimb(ctx, o, 1, q.arx, q.ary);
      drawPaw(ctx, o, q.arx, q.ary);
    }
    if (o.holding && itemHigh) A.drawItem(ctx, o.holding, 0, 0.02 - q.itemY, 0.17, t, o.seed);

    ctx.restore();
  };
})(window.OR);
