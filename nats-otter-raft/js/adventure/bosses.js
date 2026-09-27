// ============================================================================
//  THE BOSSES, in order. Each one is a definition read by the Boss class (boss.js).
//  Drawing happens in "boss units" (1 = b.unit px), facing LEFT, origin at the waterline.
//  To add a boss: copy one entry, change the id/name/draw/attacks, add it to the list below
//  (and a reward to OR.REWARDS in upgrades.js). The rotation loops forever, harder each time.
// ============================================================================
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;
  const E = (ctx, x, y, rx, ry, fill, rot) => {
    A.ellipse(ctx, x, y, rx, ry, rot);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const outline = (ctx, w, col) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.stroke();
  };
  // cartoon eye: white, pupil, highlight. `lid` 0..1 covers the top (sneaky/grumpy)
  function eye(ctx, x, y, r, lookX, lid, lidColor) {
    E(ctx, x, y, r, r * 1.05, '#ffffff');
    outline(ctx, 0.03, '#1d1520');
    E(ctx, x + lookX * r * 0.35, y + r * 0.1, r * 0.5, r * 0.55, '#1d1520');
    E(ctx, x + lookX * r * 0.35 - r * 0.18, y - r * 0.12, r * 0.16, r * 0.16, '#ffffff');
    if (lid > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4 * lid * 0.5 + r * 0.1);
      ctx.clip();
      E(ctx, x, y, r * 1.08, r * 1.12, lidColor);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 1.05 + r * 2.1 * lid * 0.5);
      ctx.lineTo(x + r, y - r * 1.05 + r * 2.1 * lid * 0.5);
      outline(ctx, 0.035, '#1d1520');
    }
  }
  function brow(ctx, x0, y0, x1, y1, w) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineCap = 'round';
    outline(ctx, w || 0.07, '#2a1d14');
  }
  // generic hazard shortcuts
  const band = (b, opts) => b.hazard(Object.assign({ kind: 'band', warn: 1.2 }, opts));
  const onOtter = (b, o, opts) => b.hazard(Object.assign({ kind: 'circle', x: o.x, y: o.y - o.u * 0.3, r: o.u * 0.8, warn: 1.1 }, opts));

  OR.BOSSES = [
    // ======================================================================= 1. DAWSON
    {
      id: 'dawson', name: 'Dawson', title: 'The Tactical Snake', reward: 'sneakyShell', color: '#6aa84f',
      hpMult: 1, atkMult: 1, scale: 1.05, attackEvery: 2.6, radius: 1.0, hitY: 0.9, mouth: [-0.55, -1.15],
      lines: {
        intro: 'Operation Slither is a go.',
        enrage: 'Negative! NEGATIVE!',
        defeat: 'Mission… failed… hisss.',
        taunt: ['You didn\'t see me.', 'Tactical repositioning.', 'Stay frosty, otters.', 'Hiss. Tactically.'],
      },
      init(b) {
        b.mem.phase = 'up';
        b.mem.rise = 1;
        b.mem.burrowT = 6;
        b.mem.spotted = 0;
      },
      update(b, dt, adv) {
        const m = b.mem, G = adv.G;
        m.spotted = Math.max(0, m.spotted - dt);
        if (m.phase === 'up') {
          m.rise = Math.min(1, m.rise + dt * 4);
          m.burrowT -= dt * b.speed;
          if (m.burrowT <= 0 && b.busy <= 0) {
            m.phase = 'down';
            adv.audio.sneak && adv.audio.sneak();
          }
        } else if (m.phase === 'down') {
          m.rise -= dt * 3;
          if (m.rise <= 0) {
            m.rise = 0;
            m.phase = 'hidden';
            m.hideT = U.rand(1.4, 2.4) / b.speed;
            m.tx = U.rand(G.W * 0.52, G.W * 0.86);
          }
        } else if (m.phase === 'hidden') {
          b.x = U.damp(b.x, m.tx, 3, dt);
          m.hideT -= dt;
          if (m.hideT <= 0) {
            m.phase = 'up';
            m.spotted = 2.2;
            m.burrowT = U.rand(4.5, 6.5);
            adv.fx.burst('dot', b.x, b.y, 10, G.S * 4, '#b08a5a', 4, 0.7);
            adv.fx.word(b.x, b.y - b.unit * 2.2, '!', '#ffd23f', 44);
            adv.banner('TAP NOW! He\'s exposed!', '#ffd23f', 1.1);
          }
        }
      },
      onDamage(b, a, src, adv) {
        const m = b.mem;
        if (m.phase !== 'up' || m.rise < 0.6) {
          if (!m.hidMsg || b.t - m.hidMsg > 1) {
            m.hidMsg = b.t;
            adv.fx.word(b.x, b.y - b.unit * 0.6, 'He\'s hiding!', '#d8c7a0', 22);
          }
          return 0;
        }
        if (m.spotted > 0) {
          if (!m.spotMsg || b.t - m.spotMsg > 0.8) {
            m.spotMsg = b.t;
            adv.fx.word(b.cx, b.cy - b.unit, 'SPOTTED! x2', '#ffd23f', 26);
          }
          return a * 2;
        }
        return a;
      },
      attacks: {
        pebbles: {
          weight: 3,
          run(b) {
            if (b.mem.phase !== 'up') return;
            for (let i = 0; i < 3; i++) b.adv.after(() => b.alive && b.lob('pebble', 0.9, { dmg: b.atk * 0.6 }), i * 180);
          },
        },
        chanclaStrike: {
          weight: 2,
          run(b, adv) {
            if (b.mem.phase !== 'up') return;
            b.say('Calling in the CHANCLA STRIKE.', 1.8);
            b.busy = 1.4;
            const targets = adv.squad.otters.slice().sort(() => Math.random() - 0.5).slice(0, 3);
            for (const o of targets) {
              onOtter(b, o, {
                warn: 1.4, dmg: b.atk * 0.9, label: '🩴',
                onTrigger(adv2, h) {
                  adv2.fx.word(h.x, h.y - adv2.G.S, 'THWAP!', '#ffffff', 24);
                  adv2.fx.burst('dot', h.x, h.y, 6, adv2.G.S * 3, '#ff7a93', 3, 0.5);
                },
                drawActive(ctx, h, k) {
                  // a flip-flop slapping down
                  const y = h.y - (1 - k) * adv.G.S * 2;
                  ctx.fillStyle = '#ff7a93';
                  A.ellipse(ctx, h.x, y, adv.G.S * 0.25, adv.G.S * 0.5, 0.3);
                  ctx.fill();
                  ctx.strokeStyle = '#1d1520';
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.moveTo(h.x - adv.G.S * 0.12, y - adv.G.S * 0.2);
                  ctx.lineTo(h.x, y - adv.G.S * 0.05);
                  ctx.lineTo(h.x + adv.G.S * 0.12, y - adv.G.S * 0.2);
                  ctx.stroke();
                },
              });
            }
          },
        },
        slither: {
          weight: 1.5,
          run(b, adv) {
            if (b.mem.phase !== 'up') return;
            b.busy = 2.2;
            const home = b.x, front = adv.squad.front();
            b.say('Flanking maneuver!', 1.2);
            adv.tween(0.7, (k) => (b.x = U.lerp(home, front.x + adv.G.S * 1.2, U.easeInOut(k))), () => {
              adv.hurtSquad(b.atk * 1.1, front);
              adv.shake(8);
              adv.tween(0.8, (k) => (b.x = U.lerp(front.x + adv.G.S * 1.2, home, U.easeInOut(k))));
            });
          },
        },
      },
      draw(ctx, b, t) {
        const m = b.mem;
        if (m.phase === 'hidden' || m.rise <= 0.02) {
          // dirt mound with a tiny camo periscope
          E(ctx, 0, 0.02, 0.75, 0.22, '#a8865a');
          E(ctx, -0.3, -0.05, 0.25, 0.12, '#bf9d6c');
          E(ctx, 0.25, -0.02, 0.2, 0.1, '#8f6f45');
          ctx.fillStyle = '#556b2f';
          ctx.fillRect(-0.04, -0.55 + Math.sin(t * 6) * 0.03, 0.08, 0.5);
          ctx.fillRect(-0.18, -0.6 + Math.sin(t * 6) * 0.03, 0.2, 0.09);
          return;
        }
        ctx.translate(0, (1 - m.rise) * 1.6);
        const tail = Math.sin(t * 3) * 0.08;
        // body: an S-curve coil
        const body = () => {
          ctx.beginPath();
          ctx.moveTo(1.15, 0.2);
          ctx.bezierCurveTo(0.55, 0.35 + tail, 0.85, -0.55, 0.25, -0.6);
          ctx.bezierCurveTo(-0.25, -0.65, 0.05, -1.05, -0.1, -1.05);
        };
        body();
        ctx.lineCap = 'round';
        outline(ctx, 0.5, '#2f5a2a');
        body();
        outline(ctx, 0.42, '#6aa84f');
        body();
        ctx.setLineDash([0.12, 0.2]);
        outline(ctx, 0.2, '#4c8a3c');
        ctx.setLineDash([]);
        // serape sash across the coil
        ctx.save();
        ctx.translate(0.45, -0.45);
        ctx.rotate(-0.6);
        const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#d62598', '#264653'];
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.fillRect(-0.28, -0.2 + i * 0.07, 0.56, 0.07);
        });
        ctx.restore();
        // camo vest collar with pocket and dog tag
        ctx.save();
        ctx.translate(-0.05, -0.92);
        E(ctx, 0, 0, 0.34, 0.2, '#6b7a3a');
        E(ctx, -0.12, -0.02, 0.09, 0.06, '#4a5626');
        E(ctx, 0.14, 0.05, 0.1, 0.05, '#86934f');
        ctx.fillStyle = '#4a5626';
        ctx.fillRect(0.02, -0.05, 0.14, 0.12);
        ctx.fillStyle = '#c9ced6';
        ctx.fillRect(-0.2, 0.08, 0.08, 0.11);
        ctx.restore();
        // head
        const hx = -0.3, hy = -1.25;
        E(ctx, hx, hy, 0.46, 0.34, '#6aa84f');
        outline(ctx, 0.04, '#2f5a2a');
        E(ctx, hx - 0.28, hy + 0.08, 0.22, 0.14, '#7fbe62');
        // crew cut (flat top)
        ctx.fillStyle = '#3b2a1a';
        ctx.beginPath();
        ctx.moveTo(hx - 0.36, hy - 0.2);
        ctx.lineTo(hx - 0.34, hy - 0.36);
        ctx.lineTo(hx + 0.34, hy - 0.36);
        ctx.lineTo(hx + 0.4, hy - 0.18);
        ctx.quadraticCurveTo(hx, hy - 0.26, hx - 0.36, hy - 0.2);
        ctx.fill();
        ctx.strokeStyle = '#5a4230';
        ctx.lineWidth = 0.015;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(hx - 0.3 + i * 0.085, hy - 0.36);
          ctx.lineTo(hx - 0.3 + i * 0.085, hy - 0.3);
          ctx.stroke();
        }
        // sneaky half-lidded eyes, one brow raised
        eye(ctx, hx - 0.2, hy - 0.04, 0.1, -0.8, 0.8, '#6aa84f');
        eye(ctx, hx + 0.08, hy - 0.06, 0.1, -0.8, 0.8, '#6aa84f');
        brow(ctx, hx - 0.3, hy - 0.2, hx - 0.1, hy - 0.16, 0.05);
        brow(ctx, hx - 0.02, hy - 0.26, hx + 0.2, hy - 0.2, 0.05);
        // smirk
        ctx.beginPath();
        ctx.moveTo(hx - 0.42, hy + 0.14);
        ctx.quadraticCurveTo(hx - 0.25, hy + 0.2, hx - 0.12, hy + 0.1);
        outline(ctx, 0.03, '#1d1520');
        // tongue flick
        if (Math.sin(t * 5) > 0.6) {
          ctx.beginPath();
          ctx.moveTo(hx - 0.44, hy + 0.12);
          ctx.lineTo(hx - 0.7, hy + 0.14);
          ctx.lineTo(hx - 0.78, hy + 0.08);
          ctx.moveTo(hx - 0.7, hy + 0.14);
          ctx.lineTo(hx - 0.78, hy + 0.2);
          outline(ctx, 0.025, '#e0314b');
        }
        if (m.spotted > 0) A.drawSparkle(ctx, hx + 0.4, hy - 0.45, 0.14, '#ffd23f', t * 3);
      },
    },

    // ======================================================================= 2. BILLY
    {
      id: 'billy', name: 'Billy', title: 'The Brooding Dolphin', reward: 'shadowFin', color: '#5b6f93',
      hpMult: 1, atkMult: 1, scale: 1.05, attackEvery: 2.4, radius: 1.05, hitY: 0.35, mouth: [-1.1, -0.25],
      homeY: (G) => G.surface + G.S * 0.15,
      lines: {
        intro: 'Nobody understands the ocean like I do…',
        enrage: 'You think THIS is dark? You have no idea.',
        defeat: 'This is… so… dramatic…',
        taunt: ['*sigh*', 'It\'s not a phase. It\'s a porpoise.', 'My fins are as black as my soul.', 'Whatever.'],
      },
      init(b) {
        b.mem.clones = [];
        b.mem.cloneT = 7;
        b.mem.dashT = 3;
      },
      update(b, dt, adv) {
        const m = b.mem, G = adv.G;
        m.cloneT -= dt * b.speed;
        if (m.cloneT <= 0 && !m.clones.length) {
          m.cloneT = U.rand(9, 12);
          const n = b.enraged ? 3 : 2;
          for (let i = 0; i < n; i++) m.clones.push({ x: b.x, y: b.y, tx: U.rand(G.W * 0.5, G.W * 0.9), ty: b.homeY + U.rand(-1, 1) * G.S * 0.8, life: 8 });
          b.say('Which one is the real me? …Me neither.', 2);
          adv.banner('CLONES! Tap the one with the sparkly tear', '#c79bff', 1.6);
          adv.audio.bossSting && adv.audio.bossSting('billy');
        }
        for (const c of m.clones) {
          c.life -= dt;
          c.x = U.damp(c.x, c.tx, 3, dt);
          c.y = U.damp(c.y, c.ty + Math.sin(b.t * 2 + c.tx) * G.S * 0.1, 3, dt);
          if (U.chance(dt * 0.4 * b.speed)) b.shoot('orb', { from: [c.x - b.unit, c.y - b.unit * 0.3], dmg: b.atk * 0.35, color: '#6a2bd6', speed: 4 });
        }
        m.clones = m.clones.filter((c) => c.life > 0 && !c.popped);
        // dramatic dashes back and forth
        m.dashT -= dt * b.speed;
        if (m.dashT <= 0 && b.busy <= 0) {
          m.dashT = U.rand(3, 5);
          const tx = U.rand(G.W * 0.5, G.W * 0.85);
          const x0 = b.x;
          adv.tween(0.35, (k) => {
            b.x = U.lerp(x0, tx, k);
            if (U.chance(0.5)) adv.fx.add('smoke', b.x + b.unit * 0.8, b.y - b.unit * 0.3, { color: 'rgba(40,20,70,0.35)', size: b.unit * 0.3, life: 0.6 });
          });
        }
      },
      tapTarget(b, x, y, adv) {
        const m = b.mem;
        const direct = m.clones.find((c) => U.dist(x, y, c.x, c.y - b.unit * 0.35) < b.unit * 0.9);
        if (direct) return { clone: direct, x: direct.x, y: direct.y - b.unit * 0.35 };
        if (x != null && b.hitTest(x, y)) return { real: true, x: b.cx, y: b.cy };
        // the big TAP button: with clones around, it's a guess
        if (m.clones.length && Math.random() < m.clones.length / (m.clones.length + 1)) {
          const c = U.pick(m.clones);
          return { clone: c, x: c.x, y: c.y - b.unit * 0.35 };
        }
        return { real: true, x: b.cx, y: b.cy };
      },
      attacks: {
        sonic: { weight: 3, run: (b) => b.shoot('wave', { speed: 5, dmg: b.atk * 0.8, color: 'rgba(170,140,255,0.9)', size: b.adv.G.S * 0.4 }) },
        darkOrbs: {
          weight: 2,
          run(b) {
            for (let i = 0; i < 3; i++) b.adv.after(() => b.alive && b.shoot('orb', { dmg: b.atk * 0.5, color: '#3a1466', speed: 3.5, homing: 1.5, size: b.adv.G.S * 0.25 }), i * 220);
          },
        },
        waveOfSorrow: {
          weight: 1.2,
          run(b, adv) {
            b.say('Feel… my… PAIN.', 1.6);
            b.busy = 2;
            band(b, {
              warn: 1.5, dmg: b.atk * 1.8, label: 'WAVE OF SORROW',
              drawWarn(ctx, h, k) {
                const G = adv.G;
                const gr = ctx.createLinearGradient(G.W * (1 - k * 0.3), 0, G.W, 0);
                gr.addColorStop(0, 'rgba(60,20,110,0)');
                gr.addColorStop(1, `rgba(60,20,110,${0.6 * k})`);
                ctx.fillStyle = gr;
                ctx.fillRect(0, G.surface - G.S * 2, G.W, G.S * 3);
              },
              drawActive(ctx, h, k) {
                const G = adv.G, x = G.W * (1 - k * 1.3);
                ctx.fillStyle = 'rgba(50,15,90,0.7)';
                ctx.beginPath();
                ctx.moveTo(x, G.H);
                ctx.lineTo(x, G.surface - G.S * 1.8);
                ctx.quadraticCurveTo(x + G.S * 1.5, G.surface - G.S * 2.6, x + G.S * 3, G.surface - G.S * 1.2);
                ctx.lineTo(x + G.S * 3, G.H);
                ctx.fill();
              },
              activeTime: 0.9,
            });
          },
        },
      },
      draw(ctx, b, t) {
        const drawBilly = (clone) => {
          // tail flukes
          ctx.fillStyle = '#4a5c7e';
          ctx.beginPath();
          ctx.moveTo(0.9, -0.35);
          ctx.lineTo(1.35, -0.7 + Math.sin(t * 5) * 0.08);
          ctx.lineTo(1.2, -0.35);
          ctx.lineTo(1.35, 0.0 + Math.sin(t * 5) * 0.08);
          ctx.closePath();
          ctx.fill();
          // body
          E(ctx, 0, -0.35, 1.0, 0.42, '#5b6f93');
          outline(ctx, 0.04, '#2e3a52');
          E(ctx, -0.1, -0.2, 0.75, 0.22, '#c9d3e6');
          // dorsal fin
          ctx.fillStyle = '#4a5c7e';
          ctx.beginPath();
          ctx.moveTo(0.0, -0.72);
          ctx.quadraticCurveTo(0.2, -1.15, 0.45, -0.7);
          ctx.fill();
          // snout
          E(ctx, -1.0, -0.22, 0.3, 0.13, '#5b6f93');
          // sad mouth
          ctx.beginPath();
          ctx.moveTo(-1.25, -0.16);
          ctx.quadraticCurveTo(-1.0, -0.22, -0.78, -0.12);
          outline(ctx, 0.03, '#1d1520');
          // eye with eyeliner and a tear
          E(ctx, -0.62, -0.42, 0.1, 0.09, '#ffffff');
          E(ctx, -0.65, -0.41, 0.05, 0.06, '#1d1520');
          ctx.beginPath();
          ctx.moveTo(-0.75, -0.46);
          ctx.lineTo(-0.5, -0.47);
          ctx.lineTo(-0.44, -0.52);
          outline(ctx, 0.035, '#111');
          if (!clone) {
            E(ctx, -0.66, -0.28 + ((t * 0.4) % 0.2), 0.035, 0.05, '#9fd8ff');
            A.drawSparkle(ctx, -0.6, -0.25, 0.08 * (0.6 + 0.4 * Math.sin(t * 8)), '#ffffff', t);
          }
          // emo fringe sweeping over the face
          ctx.fillStyle = '#111016';
          ctx.beginPath();
          ctx.moveTo(-0.1, -0.8);
          ctx.quadraticCurveTo(-0.5, -1.0, -0.95, -0.55);
          ctx.lineTo(-0.72, -0.52);
          ctx.lineTo(-0.82, -0.4);
          ctx.lineTo(-0.58, -0.48);
          ctx.quadraticCurveTo(-0.35, -0.6, -0.05, -0.62);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,140,255,0.5)';
          ctx.lineWidth = 0.03;
          ctx.beginPath();
          ctx.moveTo(-0.2, -0.82);
          ctx.quadraticCurveTo(-0.5, -0.9, -0.75, -0.62);
          ctx.stroke();
          // spiked choker
          ctx.fillStyle = '#111016';
          ctx.fillRect(-0.45, -0.72, 0.1, 0.72);
          ctx.fillStyle = '#c9ced6';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-0.45, -0.62 + i * 0.17);
            ctx.lineTo(-0.53, -0.58 + i * 0.17);
            ctx.lineTo(-0.45, -0.54 + i * 0.17);
            ctx.fill();
          }
          // striped arm warmer on the flipper
          ctx.save();
          ctx.translate(-0.2, -0.05);
          ctx.rotate(0.5);
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? '#6a2bd6' : '#111016';
            ctx.fillRect(-0.1, i * 0.08, 0.2, 0.08);
          }
          ctx.restore();
        };
        drawBilly(false);
        // clones are drawn in screen space by drawOverlay
      },
      drawOverlay(ctx, b, t) {
        for (const c of b.mem.clones) {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.scale(b.unit, b.unit);
          ctx.globalAlpha = 0.72;
          const saved = b.mem.clones;
          b.mem.clones = [];
          this.draw(ctx, b, t);
          b.mem.clones = saved;
          ctx.restore();
          // clones have no sparkly tear: cover it with a dull dot
          ctx.fillStyle = 'rgba(91,111,147,0.9)';
          A.ellipse(ctx, c.x - b.unit * 0.62, c.y - b.unit * 0.26, b.unit * 0.1, b.unit * 0.1);
          ctx.fill();
        }
      },
    },

    // ======================================================================= 3. MATT
    {
      id: 'matt', name: 'Matt', title: 'The Ranked Turtle', reward: 'tankShell', color: '#4f8a3f',
      hpMult: 1.1, atkMult: 1, scale: 1.3, attackEvery: 2.8, radius: 1.1, hitY: 0.6, mouth: [-1.1, -0.6],
      lines: {
        intro: 'Bro. I\'m in a RANKED MATCH.',
        enrage: 'THAT WAS LAG! UNINSTALL!',
        defeat: '…rage quit.',
        taunt: ['Can you NOT?', 'Mute. Muted. Blocked.', 'gg ez… wait no.', 'I\'m literally carrying.'],
      },
      init(b) {
        b.mem.shellT = 0;
        b.mem.openT = 0;
        b.mem.nextShell = 7;
        b.mem.jump = 0;
      },
      update(b, dt, adv) {
        const m = b.mem;
        if (m.shellT > 0) {
          m.shellT -= dt;
          if (m.shellT <= 0) {
            m.openT = 2.6;
            adv.banner('SHELL OPEN! Hit him now!', '#6ee07a', 1.1);
            b.say('Wait wait wait—', 1.4);
          }
        } else if (m.openT > 0) {
          m.openT -= dt;
        } else {
          m.nextShell -= dt * b.speed;
          if (m.nextShell <= 0 && b.busy <= 0) {
            m.nextShell = U.rand(8, 10);
            m.shellT = 3.8;
            b.busy = 3.8;
            b.say('BRB. Hiding.', 1.2);
            adv.audio.clang && adv.audio.clang();
          }
        }
        if (b.enraged && U.chance(dt * 4)) adv.fx.add('smoke', b.x - b.unit * 1.0, b.y - b.unit * 1.1, { vy: -40, color: 'rgba(255,255,255,0.5)', size: b.unit * 0.15, life: 0.8 });
      },
      onDamage(b, a, src, adv) {
        if (b.mem.shellT > 0) {
          if (!b.mem.clangT || b.t - b.mem.clangT > 0.4) {
            b.mem.clangT = b.t;
            adv.fx.word(b.cx, b.cy - b.unit * 0.8, 'BLOCKED!', '#c9ced6', 24);
            adv.audio.clang && adv.audio.clang();
          }
          return 0;
        }
        return b.mem.openT > 0 ? a * 1.6 : a;
      },
      attacks: {
        controller: {
          weight: 3,
          run(b) {
            if (b.mem.shellT > 0) return;
            b.lob('controller', 1.0, {
              dmg: b.atk * 0.9, size: b.adv.G.S * 0.3,
              draw(ctx, p, t) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(t * 12);
                ctx.fillStyle = '#3d4450';
                A.ellipse(ctx, -p.size * 0.5, 0, p.size * 0.5, p.size * 0.4);
                ctx.fill();
                A.ellipse(ctx, p.size * 0.5, 0, p.size * 0.5, p.size * 0.4);
                ctx.fill();
                ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.5);
                ctx.fillStyle = '#ff5d6c';
                A.ellipse(ctx, p.size * 0.5, -p.size * 0.1, p.size * 0.1, p.size * 0.1);
                ctx.fill();
                ctx.restore();
              },
            });
          },
        },
        shellSlam: {
          weight: 2,
          run(b, adv) {
            if (b.mem.shellT > 0) return;
            b.busy = 1.6;
            const y0 = b.y;
            adv.tween(0.45, (k) => (b.y = y0 - Math.sin(k * Math.PI) * b.unit * 1.2), () => {
              adv.shake(12);
              adv.audio.boom && adv.audio.boom(0.6);
              band(b, {
                warn: 0.35, dmg: b.atk * 1.3, label: 'SHOCKWAVE',
                drawActive(ctx, h, k) {
                  const G = adv.G, x = U.lerp(b.x, -G.S, k);
                  ctx.fillStyle = 'rgba(255,255,255,0.75)';
                  ctx.beginPath();
                  ctx.moveTo(x - G.S * 0.6, G.surface + 4);
                  ctx.quadraticCurveTo(x, G.surface - G.S * 0.9, x + G.S * 0.6, G.surface + 4);
                  ctx.fill();
                },
                activeTime: 0.7,
              });
            });
          },
        },
        rageBlips: {
          weight: 1.5,
          run(b) {
            if (b.mem.shellT > 0) return;
            b.say(b.enraged ? 'AAAAAAA' : 'ugh.', 1);
            const n = b.enraged ? 7 : 4;
            for (let i = 0; i < n; i++)
              b.adv.after(() => b.alive && b.shoot('blip', {
                dmg: b.atk * 0.35, speed: 5.5, size: b.adv.G.S * 0.14,
                draw(ctx, p) {
                  ctx.fillStyle = ['#ff5d6c', '#6ee07a', '#5da9ff', '#ffd23f'][i % 4];
                  ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
                },
              }), i * 120);
          },
        },
      },
      draw(ctx, b, t) {
        const m = b.mem, inShell = m.shellT > 0;
        const rage = b.enraged;
        const wob = inShell ? Math.sin(t * 20) * 0.03 : 0;
        ctx.rotate(wob);
        if (!inShell) {
          // back flipper and front flipper holding the controller
          E(ctx, 0.95, -0.15, 0.25, 0.14, '#8bbf6a');
        }
        // shell
        ctx.beginPath();
        ctx.moveTo(-0.95, -0.2);
        ctx.bezierCurveTo(-0.9, -1.45, 1.1, -1.45, 1.15, -0.2);
        ctx.closePath();
        ctx.fillStyle = '#4f8a3f';
        ctx.fill();
        outline(ctx, 0.05, '#2d5424');
        ctx.strokeStyle = '#6fae5a';
        ctx.lineWidth = 0.04;
        for (const [x, y] of [[-0.35, -0.75], [0.1, -0.95], [0.55, -0.75], [0.15, -0.5], [-0.5, -0.4], [0.75, -0.4]]) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            ctx.lineTo(x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.16);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.fillStyle = '#d8c28a';
        ctx.fillRect(-1.0, -0.26, 2.2, 0.12);
        if (inShell) {
          ctx.font = '800 0.28px "Baloo 2", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.fillText('AFK', 0.1, -0.55);
          return;
        }
        // chubby plastron belly
        E(ctx, -0.55, -0.15, 0.5, 0.3, '#e7d48f');
        // head
        const hx = -1.1, hy = -0.62;
        E(ctx, hx, hy, 0.44, 0.4, rage ? '#d9695a' : '#8bbf6a');
        outline(ctx, 0.04, '#2d5424');
        // grumpy eyes with bags
        const dizzy = m.openT > 0;
        if (dizzy) {
          for (const ex of [hx - 0.18, hx + 0.1]) {
            ctx.beginPath();
            for (let i = 0; i < 12; i++) ctx.lineTo(ex + Math.cos(i + t * 8) * 0.01 * i, hy - 0.08 + Math.sin(i + t * 8) * 0.01 * i);
            outline(ctx, 0.025, '#1d1520');
          }
        } else {
          eye(ctx, hx - 0.18, hy - 0.08, 0.09, -0.6, 0.55, rage ? '#d9695a' : '#8bbf6a');
          eye(ctx, hx + 0.1, hy - 0.08, 0.09, -0.6, 0.55, rage ? '#d9695a' : '#8bbf6a');
        }
        brow(ctx, hx - 0.3, hy - 0.28, hx - 0.08, hy - 0.18);
        brow(ctx, hx + 0.22, hy - 0.28, hx + 0.0, hy - 0.18);
        ctx.beginPath();
        ctx.moveTo(hx - 0.25, hy + 0.2);
        ctx.quadraticCurveTo(hx - 0.1, hy + 0.1, hx + 0.05, hy + 0.2);
        outline(ctx, 0.035, '#1d1520');
        // gaming headset with RGB
        ctx.beginPath();
        ctx.arc(hx, hy - 0.05, 0.46, Math.PI * 1.05, Math.PI * 1.95);
        outline(ctx, 0.08, '#222');
        const hue = (t * 120) % 360;
        E(ctx, hx + 0.36, hy - 0.05, 0.13, 0.17, '#222');
        ctx.strokeStyle = `hsl(${hue},90%,60%)`;
        ctx.lineWidth = 0.04;
        A.ellipse(ctx, hx + 0.36, hy - 0.05, 0.1, 0.14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx + 0.3, hy + 0.05);
        ctx.quadraticCurveTo(hx, hy + 0.35, hx - 0.18, hy + 0.25);
        outline(ctx, 0.03, '#222');
        E(ctx, hx - 0.2, hy + 0.25, 0.04, 0.04, '#444');
        // flipper + controller
        E(ctx, -0.9, -0.05, 0.25, 0.12, '#8bbf6a', 0.4);
        ctx.fillStyle = '#3d4450';
        ctx.fillRect(-1.25, -0.2, 0.42, 0.18);
        E(ctx, -1.25, -0.11, 0.1, 0.1, '#3d4450');
        E(ctx, -0.83, -0.11, 0.1, 0.1, '#3d4450');
        E(ctx, -0.9, -0.15, 0.03, 0.03, '#ff5d6c');
        E(ctx, -0.95, -0.09, 0.03, 0.03, '#6ee07a');
      },
    },

    // ======================================================================= 4. MIKE
    {
      id: 'mike', name: 'Mike', title: 'The Construction Colossus', reward: 'reinforcedShell', color: '#ff8c1a',
      hpMult: 1.1, atkMult: 1.05, scale: 1.1, attackEvery: 2.3, radius: 1.0, hitY: 1.0, mouth: [-0.6, -1.2],
      lines: {
        intro: 'ON THE JOB! Nobody passes this site!',
        enrage: 'OVERTIME! DOUBLE SHIFT!',
        defeat: 'Clocking… out…',
        taunt: ['Measure twice, SMASH once!', 'Safety first! Your safety: last!', 'Who ordered a demolition?', 'Hard hat? ON. Work ethic? ON.'],
      },
      init(b) {
        b.mem.wall = null;
        b.mem.buildT = 3;
      },
      update(b, dt, adv) {
        const m = b.mem, G = adv.G;
        if (!m.wall) {
          m.buildT -= dt * b.speed;
          if (m.buildT <= 0 && b.busy <= 0) {
            b.busy = 1.2;
            b.say('Building a wall! Safety first!', 1.6);
            let taps = 0;
            adv.tween(1.2, () => {
              if (U.chance(0.15) && taps++ < 5) adv.audio.clang && adv.audio.clang();
            }, () => {
              const hp = b.maxHp * 0.06 * (b.enraged ? 1.3 : 1);
              m.wall = { x: G.W * 0.57, hp, maxHp: hp, t: 0 };
              adv.banner('BARRICADE! Smash through it!', '#ff8c1a', 1.2);
              adv.shake(6);
            });
            m.buildT = U.rand(15, 18);
          }
        } else m.wall.t += dt;
      },
      onDamage(b, a, src, adv) {
        const w = b.mem.wall;
        if (w) {
          w.hp -= a;
          w.hit = 0.1;
          adv.fx.burst('dot', w.x, adv.G.surface - adv.G.S, 3, adv.G.S * 3, '#c1440e', 3, 0.5);
          if (w.hp <= 0) {
            b.mem.wall = null;
            b.stun = 2.4;
            adv.fx.word(w.x, adv.G.surface - adv.G.S * 1.8, 'DEMOLISHED!', '#ffd23f', 32);
            adv.fx.burst('dot', w.x, adv.G.surface - adv.G.S, 14, adv.G.S * 6, '#c1440e', 5, 0.9);
            adv.shake(12);
            adv.audio.boom && adv.audio.boom(0.8);
            b.say('My beautiful wall!', 1.6);
          }
          return a * 0.3; // some of it gets over the wall
        }
        return a;
      },
      attacks: {
        wrench: {
          weight: 3,
          run(b) {
            b.shoot('wrench', {
              speed: 5, dmg: b.atk * 0.8, size: b.adv.G.S * 0.28,
              draw(ctx, p, t) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(t * 14);
                ctx.fillStyle = '#9aa3ad';
                ctx.fillRect(-p.size, -p.size * 0.15, p.size * 2, p.size * 0.3);
                A.ellipse(ctx, p.size, 0, p.size * 0.35, p.size * 0.35);
                ctx.fill();
                ctx.restore();
              },
            });
          },
        },
        jackhammer: {
          weight: 2,
          run(b, adv) {
            b.say('JACKHAMMER TIME!', 1.2);
            b.busy = 1.4;
            adv.shake(5);
            for (let i = 0; i < 6; i++) b.adv.after(() => b.alive && b.shoot('pebble', { dmg: b.atk * 0.28, speed: 6, size: adv.G.S * 0.13 }), i * 110);
          },
        },
        hammerDash: {
          weight: 1.5,
          run(b, adv) {
            if (b.mem.wall) return;
            b.busy = 2;
            const home = b.x, front = adv.squad.front();
            adv.tween(0.35, (k) => (b.x = U.lerp(home, front.x + adv.G.S * 1.4, k)), () => {
              onOtter(b, front, { warn: 0.3, dmg: b.atk * 1.4, label: '🔨' });
              adv.shake(10);
              adv.audio.boom && adv.audio.boom(0.5);
              b.adv.after(() => adv.tween(0.6, (k) => (b.x = U.lerp(front.x + adv.G.S * 1.4, home, k))), 400);
            });
          },
        },
        bricks: {
          weight: 1.5,
          run(b) {
            for (let i = 0; i < 3; i++)
              b.adv.after(() => b.alive && b.lob('brick', 1.0, {
                dmg: b.atk * 0.6, size: b.adv.G.S * 0.22,
                draw(ctx, p, t) {
                  ctx.save();
                  ctx.translate(p.x, p.y);
                  ctx.rotate(t * 6);
                  ctx.fillStyle = '#c1440e';
                  ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
                  ctx.restore();
                },
              }), i * 200);
          },
        },
      },
      draw(ctx, b, t) {
        // barge
        ctx.fillStyle = '#9a7552';
        ctx.fillRect(-0.9, -0.05, 1.8, 0.18);
        ctx.fillStyle = '#ffd23f';
        for (let i = 0; i < 5; i++) ctx.fillRect(-0.85 + i * 0.36, -0.05, 0.18, 0.05);
        // stubby legs
        ctx.fillStyle = '#3d5a8a';
        ctx.fillRect(-0.3, -0.45, 0.22, 0.42);
        ctx.fillRect(0.08, -0.45, 0.22, 0.42);
        E(ctx, -0.22, -0.04, 0.16, 0.07, '#5a3d24');
        E(ctx, 0.2, -0.04, 0.16, 0.07, '#5a3d24');
        // wide muscular torso with hi-vis vest
        ctx.fillStyle = '#7c8797';
        ctx.beginPath();
        ctx.moveTo(-0.7, -1.3);
        ctx.lineTo(0.7, -1.3);
        ctx.lineTo(0.42, -0.42);
        ctx.lineTo(-0.42, -0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff8c1a';
        ctx.beginPath();
        ctx.moveTo(-0.7, -1.3);
        ctx.lineTo(-0.25, -1.3);
        ctx.lineTo(-0.15, -0.42);
        ctx.lineTo(-0.42, -0.42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.7, -1.3);
        ctx.lineTo(0.25, -1.3);
        ctx.lineTo(0.15, -0.42);
        ctx.lineTo(0.42, -0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff36b';
        ctx.fillRect(-0.62, -0.9, 0.45, 0.06);
        ctx.fillRect(0.17, -0.9, 0.45, 0.06);
        // tool belt
        ctx.fillStyle = '#6b4a33';
        ctx.fillRect(-0.45, -0.55, 0.9, 0.1);
        ctx.fillStyle = '#9aa3ad';
        ctx.fillRect(0.2, -0.5, 0.05, 0.18);
        // huge arms: the right one swings the hammer
        const swing = b.busy > 0 ? Math.sin(t * 18) * 0.6 : Math.sin(t * 2) * 0.1;
        E(ctx, 0.78, -1.05, 0.26, 0.22, '#f1c7a0');
        E(ctx, 0.85, -0.72, 0.18, 0.2, '#f1c7a0');
        ctx.save();
        ctx.translate(-0.78, -1.05);
        ctx.rotate(-0.4 + swing);
        E(ctx, 0, 0, 0.27, 0.23, '#f1c7a0');
        E(ctx, -0.1, 0.32, 0.19, 0.2, '#f1c7a0');
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(-0.16, 0.3, 0.07, 0.75);
        ctx.fillStyle = '#6c7480';
        ctx.fillRect(-0.36, 0.95, 0.46, 0.24);
        ctx.restore();
        // head: blonde hair, bushy brows, big grin, hard hat
        const hy = -1.58;
        E(ctx, 0, hy, 0.33, 0.32, '#f1c7a0');
        outline(ctx, 0.03, '#b88a66');
        ctx.fillStyle = '#f5d06a';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 0.33, hy - 0.05);
          ctx.lineTo(s * 0.42, hy + 0.1);
          ctx.lineTo(s * 0.28, hy + 0.05);
          ctx.fill();
        }
        eye(ctx, -0.13, hy - 0.02, 0.07, -0.5, 0.15, '#f1c7a0');
        eye(ctx, 0.1, hy - 0.02, 0.07, -0.5, 0.15, '#f1c7a0');
        ctx.strokeStyle = '#e0b030';
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.moveTo(-0.25, hy - 0.14);
        ctx.lineTo(-0.02, hy - 0.1);
        ctx.moveTo(0.22, hy - 0.14);
        ctx.lineTo(0.0, hy - 0.1);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-0.16, hy + 0.12);
        ctx.quadraticCurveTo(-0.02, hy + 0.3, 0.14, hy + 0.12);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 0.02, '#8a4b3a');
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(0, hy - 0.18, 0.38, 0.28, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-0.46, hy - 0.2, 0.92, 0.07);
        outline(ctx, 0.02, '#b38f00');
      },
      drawOverlay(ctx, b, t, adv) {
        const w = b.mem.wall;
        if (!w) return;
        const G = adv.G, S = G.S;
        const h = S * 2.2, x = w.x, rise = Math.min(1, w.t * 3);
        ctx.save();
        ctx.translate(x, G.surface + 4);
        ctx.scale(1, rise);
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 2; c++) {
            ctx.fillStyle = (r + c) % 2 ? '#c1440e' : '#a8390b';
            ctx.fillRect(-S * 0.5 + c * S * 0.5 + (r % 2) * S * 0.12 - S * 0.06, -h + r * (h / 5), S * 0.48, h / 5 - 3);
          }
        }
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(-S * 0.6, -h - S * 0.18, S * 1.2, S * 0.16);
        ctx.fillStyle = '#1d1520';
        for (let i = 0; i < 4; i++) ctx.fillRect(-S * 0.55 + i * S * 0.3, -h - S * 0.18, S * 0.12, S * 0.16);
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x - S * 0.6, G.surface - h - S * 0.45, S * 1.2, 6);
        ctx.fillStyle = '#ff8c1a';
        ctx.fillRect(x - S * 0.6, G.surface - h - S * 0.45, S * 1.2 * Math.max(0, w.hp / w.maxHp), 6);
      },
    },

    // ======================================================================= 5. TOMMY
    {
      id: 'tommy', name: 'Tommy', title: 'The Mad Dragonfly', reward: 'mutationCore', color: '#3fc1b0',
      hpMult: 1.15, atkMult: 1.1, scale: 1.1, attackEvery: 2.3, radius: 1.0, hitY: 0.1, mouth: [-0.7, -0.4],
      homeY: (G) => G.surface - G.S * 1.9,
      lines: {
        intro: 'FOR SCIENCE! You will make excellent test subjects.',
        enrage: 'Increase the voltage! INCREASE IT!',
        defeat: 'Inconclusive… results…',
        taunt: ['Hypothesis: you lose.', 'Oops. Wrong beaker.', 'Mwahaha—*cough*', 'Peer review THIS!'],
      },
      init(b) {
        b.mem.form = 'normal';
        b.mem.formT = 0;
        b.mem.expT = 6;
        b.mem.teleT = 5;
      },
      update(b, dt, adv) {
        const m = b.mem, G = adv.G;
        b.y = b.homeY + Math.sin(b.t * 2.4) * G.S * 0.25;
        if (m.formT > 0) {
          m.formT -= dt;
          if (m.formT <= 0) {
            m.form = 'normal';
            b.scale = b.def.scale * (b.mods.some((x) => x.id === 'giant') ? 1.2 : 1);
          }
        } else {
          m.expT -= dt * b.speed;
          if (m.expT <= 0 && b.busy <= 0) {
            m.expT = U.rand(10, 13);
            m.form = U.pick(['giant', 'tiny', 'glow']);
            m.formT = 8;
            const base = b.def.scale * (b.mods.some((x) => x.id === 'giant') ? 1.2 : 1);
            b.scale = base * (m.form === 'giant' ? 1.45 : m.form === 'tiny' ? 0.65 : 1);
            const msg = { giant: 'GIANT FORM! (takes less damage)', tiny: 'TINY FORM! (hard to hit)', glow: 'GLOWING FORM! Weak spot exposed!' }[m.form];
            adv.banner(msg, '#7bd14a', 1.4);
            b.say(U.pick(['Let\'s try… THIS one!', 'Bottoms up!', 'For science!']), 1.4);
            adv.fx.burst('dot', b.cx, b.cy, 12, G.S * 4, '#7bd14a', 5, 0.8);
            adv.audio.bossSting && adv.audio.bossSting('tommy');
          }
        }
        m.teleT -= dt * b.speed;
        if (m.teleT <= 0 && b.busy <= 0) {
          m.teleT = U.rand(5, 8);
          adv.fx.burst('spark', b.cx, b.cy, 8, G.S * 3, '#bff', 8, 0.5);
          b.x = U.rand(G.W * 0.55, G.W * 0.85);
          adv.fx.burst('spark', b.cx, b.cy, 8, G.S * 3, '#bff', 8, 0.5);
          adv.audio.zap && adv.audio.zap();
        }
      },
      onDamage(b, a, src, adv) {
        const f = b.mem.form;
        if (f === 'giant') return a * 0.6;
        if (f === 'glow') return a * 1.7;
        if (f === 'tiny' && src === 'tap' && Math.random() < 0.35) {
          adv.fx.word(b.cx, b.cy - b.unit, 'miss!', '#bff', 20);
          return 0;
        }
        return a;
      },
      attacks: {
        flasks: {
          weight: 3,
          run(b, adv) {
            const o = adv.squad.randomOtter();
            b.lob('flask', 1.0, {
              target: o, dmg: b.atk * 0.8, size: adv.G.S * 0.22,
              draw(ctx, p, t) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(t * 7);
                ctx.fillStyle = 'rgba(123,209,74,0.9)';
                A.ellipse(ctx, 0, p.size * 0.3, p.size * 0.7, p.size * 0.6);
                ctx.fill();
                ctx.fillStyle = 'rgba(220,240,255,0.8)';
                ctx.fillRect(-p.size * 0.18, -p.size * 0.7, p.size * 0.36, p.size * 0.7);
                ctx.restore();
              },
              onHit(p) {
                adv.fx.burst('dot', p.x, p.y, 10, adv.G.S * 3, '#7bd14a', 5, 0.7);
              },
            });
          },
        },
        beam: {
          weight: 2,
          run(b, adv) {
            b.busy = 1.6;
            b.say('ZAP ZAP ZAP!', 1);
            band(b, {
              warn: 1.1, dmg: b.atk * 1.3, label: 'ELECTRIC BEAM',
              drawWarn(ctx, h, k) {
                const G = adv.G;
                ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.4 * Math.sin(k * 30)})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 8]);
                ctx.beginPath();
                ctx.moveTo(b.cx, b.cy);
                ctx.lineTo(0, G.surface - G.S * 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
              },
              drawActive(ctx, h, k) {
                const G = adv.G;
                ctx.strokeStyle = 'rgba(190,250,255,0.95)';
                ctx.lineWidth = G.S * 0.35 * (1 - k);
                ctx.beginPath();
                ctx.moveTo(b.cx, b.cy);
                for (let i = 1; i <= 8; i++) ctx.lineTo(U.lerp(b.cx, 0, i / 8), U.lerp(b.cy, G.surface - G.S * 0.5, i / 8) + U.rand(-1, 1) * G.S * 0.2);
                ctx.stroke();
              },
              activeTime: 0.5,
              onTrigger: () => adv.audio.zap && adv.audio.zap(),
            });
          },
        },
        bugs: {
          weight: 1.5,
          run(b) {
            b.say('Go, my beautiful mutants!', 1.4);
            b.summon('bug', b.enraged ? 4 : 3);
          },
        },
        explosion: {
          weight: 1,
          run(b, adv) {
            const o = adv.squad.randomOtter();
            b.say('Oops.', 1);
            onOtter(b, o, { warn: 1.3, r: adv.G.S * 1.6, dmg: b.atk * 1.4, label: '⚗️', onTrigger: (a2, h) => { a2.shake(10); a2.fx.burst('dot', h.x, h.y, 14, a2.G.S * 5, '#c6ff5a', 6, 0.8); a2.audio.boom && a2.audio.boom(0.7); } });
          },
        },
      },
      draw(ctx, b, t) {
        const form = b.mem.form;
        if (form === 'glow') {
          const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1.6);
          g.addColorStop(0, 'rgba(255,250,150,0.6)');
          g.addColorStop(1, 'rgba(255,250,150,0)');
          ctx.fillStyle = g;
          A.ellipse(ctx, 0, 0, 1.6, 1.6);
          ctx.fill();
        }
        const body = form === 'giant' ? '#7a3fc1' : '#3fc1b0';
        // wings (buzzing)
        const flap = 0.6 + 0.4 * Math.abs(Math.sin(t * 45));
        ctx.fillStyle = 'rgba(210,245,255,0.45)';
        ctx.strokeStyle = 'rgba(120,200,220,0.8)';
        ctx.lineWidth = 0.02;
        for (const [x, a] of [[-0.05, -0.5], [0.25, -0.3]]) {
          for (const s of [1, -0.6]) {
            ctx.save();
            ctx.translate(x, -0.25);
            ctx.rotate(a * s);
            ctx.scale(1, flap);
            A.ellipse(ctx, 0.45, -0.3, 0.55, 0.16);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
        // abdomen segments
        for (let i = 0; i < 6; i++) E(ctx, 0.45 + i * 0.22, 0.05 + i * 0.03 + Math.sin(t * 3 + i) * 0.02, 0.13, 0.1, i % 2 ? '#7a3fc1' : body);
        // backpack gadget with sparking coil
        ctx.fillStyle = '#6c7480';
        ctx.fillRect(0.05, -0.35, 0.3, 0.3);
        ctx.strokeStyle = '#ffb02e';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) ctx.lineTo(0.2 + (i % 2 ? 0.06 : -0.06), -0.4 - i * 0.05);
        ctx.stroke();
        if (Math.sin(t * 17) > 0.6) A.drawSparkle(ctx, 0.2, -0.7, 0.1, '#bff', t * 9);
        // lab coat thorax
        ctx.fillStyle = '#f6f7fb';
        ctx.beginPath();
        ctx.moveTo(-0.4, -0.3);
        ctx.lineTo(0.12, -0.3);
        ctx.lineTo(0.2, 0.3);
        ctx.lineTo(-0.5, 0.3);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 0.025, '#9aa3ad');
        ctx.beginPath();
        ctx.moveTo(-0.2, -0.3);
        ctx.lineTo(-0.12, -0.05);
        ctx.lineTo(-0.02, -0.3);
        outline(ctx, 0.02, '#9aa3ad');
        ctx.fillStyle = '#5da9ff';
        ctx.fillRect(-0.36, -0.02, 0.03, 0.12);
        ctx.fillStyle = '#ff5d6c';
        ctx.fillRect(-0.31, -0.02, 0.03, 0.12);
        // head, huge eyes, goggles, wild white hair, antennae
        const hx = -0.6, hy = -0.4;
        ctx.strokeStyle = '#2a1d14';
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(hx, hy - 0.25);
        ctx.quadraticCurveTo(hx - 0.1, hy - 0.6, hx - 0.3, hy - 0.62);
        ctx.moveTo(hx + 0.08, hy - 0.25);
        ctx.quadraticCurveTo(hx + 0.1, hy - 0.62, hx + 0.25, hy - 0.66);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(hx - 0.15 + i * 0.08, hy - 0.26, 0.09, 0, TAU);
          ctx.fill();
        }
        E(ctx, hx, hy, 0.3, 0.27, body);
        for (const ex of [hx - 0.13, hx + 0.12]) {
          E(ctx, ex, hy - 0.03, 0.13, 0.14, '#b8860b');
          const g = ctx.createRadialGradient(ex - 0.03, hy - 0.06, 0.01, ex, hy - 0.03, 0.11);
          g.addColorStop(0, '#eaffc7');
          g.addColorStop(1, form === 'glow' ? '#ffd23f' : '#3bbf5b');
          ctx.fillStyle = g;
          A.ellipse(ctx, ex, hy - 0.03, 0.1, 0.11);
          ctx.fill();
          E(ctx, ex - 0.03, hy - 0.07, 0.03, 0.03, '#ffffff');
        }
        ctx.beginPath();
        ctx.moveTo(hx - 0.14, hy + 0.14);
        ctx.quadraticCurveTo(hx, hy + 0.24, hx + 0.12, hy + 0.12);
        outline(ctx, 0.025, '#1d1520');
        ctx.fillStyle = '#fff';
        ctx.fillRect(hx - 0.02, hy + 0.15, 0.05, 0.05);
        // arm holding a glowing flask
        ctx.fillStyle = 'rgba(123,209,74,0.9)';
        A.ellipse(ctx, -0.62, 0.22, 0.1, 0.09);
        ctx.fill();
        ctx.fillStyle = 'rgba(220,240,255,0.8)';
        ctx.fillRect(-0.65, 0.05, 0.06, 0.12);
        A.drawSparkle(ctx, -0.55, 0.12, 0.05 + 0.03 * Math.sin(t * 6), '#eaffc7', t);
      },
    },

    // ======================================================================= 6. COLLIN T
    {
      id: 'collint', name: 'Collin T', title: 'The Gains Giraffe', reward: 'muscleFluff', color: '#f2c14e',
      hpMult: 1.2, atkMult: 1.15, scale: 0.9, attackEvery: 2.3, radius: 1.1, hitY: 0.9, mouth: [-1.0, -2.6],
      lines: {
        intro: 'Do you even LIFT, little otters?',
        enrage: 'MAXIMUM. GAINS.',
        defeat: 'I… need… a rest day…',
        taunt: ['PROTEIN TIME!', 'Never skip neck day.', 'Gains don\'t sleep!', 'Check out these guns!'],
      },
      init(b) {
        b.mem.flexT = 0;
        b.mem.nextFlex = 6;
        b.mem.interrupt = 0;
        b.mem.gains = 0;
        b.mem.neck = 0; // 0 upright, 1 slammed down
      },
      update(b, dt, adv) {
        const m = b.mem;
        if (m.flexT > 0) {
          m.flexT -= dt;
          m.need = 10 + b.cycle * 2;
          if (m.interrupt >= m.need) {
            m.flexT = 0;
            b.stun = 3;
            m.interrupt = 0;
            adv.fx.word(b.cx, b.cy - b.unit * 1.5, 'SKIPPED LEG DAY?!', '#ffd23f', 28);
            b.say('My… my calves!', 1.6);
            adv.shake(8);
          } else if (m.flexT <= 0) {
            m.gains++;
            b.atk *= 1.2;
            b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.04);
            m.interrupt = 0;
            adv.fx.word(b.cx, b.cy - b.unit * 1.5, '+GAINS', '#ff5d6c', 32);
            adv.audio.bossSting && adv.audio.bossSting('collint');
          }
        } else {
          m.nextFlex -= dt * b.speed;
          if (m.nextFlex <= 0 && b.busy <= 0 && b.stun <= 0) {
            m.nextFlex = U.rand(9, 11);
            m.flexT = 3.2;
            m.interrupt = 0;
            b.busy = 3.2;
            b.say('Hold on… FLEXING.', 1.6);
            adv.banner('HE\'S FLEXING! Tap fast to interrupt!', '#ffd23f', 1.4);
          }
        }
        if (m.flexT > 0 && U.chance(dt * 6)) adv.fx.add('spark', b.cx + U.rand(-1, 1) * b.unit, b.cy - U.rand(0, 1.5) * b.unit, { size: b.unit * 0.12, color: '#fff6c0', life: 0.5 });
      },
      onDamage(b, a, src, adv) {
        if (b.mem.flexT > 0) b.mem.interrupt += src === 'tap' ? 1 : src === 'auto' ? 0.25 : 4;
        return a;
      },
      attacks: {
        neckSlam: {
          weight: 2.5,
          run(b, adv) {
            b.busy = 1.8;
            const front = adv.squad.otters[3];
            onOtter(b, front, {
              warn: 1.0, r: adv.G.S * 1.5, dmg: b.atk * 1.5, label: 'NECK SLAM',
              onTrigger: (a2) => { a2.shake(12); a2.audio.boom && a2.audio.boom(0.7); },
            });
            adv.tween(1.0, (k) => (b.mem.neck = U.easeInOut(k) * 0.3), () => adv.tween(0.2, (k) => (b.mem.neck = 0.3 + k * 0.7), () => adv.tween(0.7, (k) => (b.mem.neck = 1 - k))));
          },
        },
        flexWave: {
          weight: 1.5,
          run(b, adv) {
            b.say('FLEX WAVE!', 1);
            band(b, {
              warn: 0.8, dmg: b.atk, label: 'FLEX SHOCKWAVE',
              drawActive(ctx, h, k) {
                ctx.strokeStyle = `rgba(255,120,120,${1 - k})`;
                ctx.lineWidth = 6;
                A.ellipse(ctx, b.cx, b.cy, adv.G.W * k, adv.G.W * k * 0.5);
                ctx.stroke();
              },
              activeTime: 0.7,
            });
          },
        },
        protein: {
          weight: 2.5,
          run(b) {
            b.lob('shaker', 1.1, {
              dmg: b.atk * 0.9, size: b.adv.G.S * 0.25,
              draw(ctx, p, t) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(t * 8);
                ctx.fillStyle = '#5da9ff';
                ctx.fillRect(-p.size * 0.4, -p.size, p.size * 0.8, p.size * 2);
                ctx.fillStyle = '#fff';
                ctx.fillRect(-p.size * 0.45, -p.size * 1.15, p.size * 0.9, p.size * 0.3);
                ctx.restore();
              },
            });
          },
        },
        sprint: {
          weight: 1,
          run(b, adv) {
            b.busy = 2;
            b.say('CARDIO!', 1);
            const home = b.x;
            adv.tween(0.5, (k) => (b.x = U.lerp(home, adv.squad.front().x + adv.G.S, k)), () => {
              for (const o of adv.squad.otters.slice(2)) adv.hurtSquad(b.atk * 0.5, o);
              adv.shake(9);
              adv.tween(0.8, (k) => (b.x = U.lerp(adv.squad.front().x + adv.G.S, home, k)));
            });
          },
        },
      },
      draw(ctx, b, t) {
        const m = b.mem, flex = m.flexT > 0, rage = b.enraged;
        if (rage) {
          const g = ctx.createRadialGradient(0, -1.2, 0.3, 0, -1.2, 2);
          g.addColorStop(0, 'rgba(255,80,80,0.35)');
          g.addColorStop(1, 'rgba(255,80,80,0)');
          ctx.fillStyle = g;
          A.ellipse(ctx, 0, -1.2, 2, 2);
          ctx.fill();
        }
        const spots = (x, y, rx, ry) => {
          ctx.save();
          A.ellipse(ctx, x, y, rx, ry);
          ctx.clip();
          ctx.fillStyle = '#b8742a';
          for (let i = 0; i < 9; i++) {
            const px = x + Math.sin(i * 12.9) * rx, py = y + Math.sin(i * 7.3) * ry;
            A.ellipse(ctx, px, py, rx * 0.16, ry * 0.2, i);
            ctx.fill();
          }
          ctx.restore();
        };
        // body with tank top and abs
        E(ctx, 0.15, -0.55, 0.8, 0.5, '#f2c14e');
        spots(0.15, -0.55, 0.8, 0.5);
        ctx.fillStyle = '#6c7a89';
        ctx.fillRect(-0.45, -0.95, 1.1, 0.4);
        ctx.font = '900 0.16px "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23f';
        ctx.fillText('GAINS', 0.1, -0.7);
        ctx.strokeStyle = '#c99a30';
        ctx.lineWidth = 0.025;
        for (let r = 0; r < 3; r++) for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(0.1 + s * 0.09 - 0.07, -0.5 + r * 0.13, 0.14, 0.11, 0.03) : ctx.rect(0.1 + s * 0.09 - 0.07, -0.5 + r * 0.13, 0.14, 0.11);
          ctx.stroke();
        }
        // neck and head (the neck swings down for the slam)
        const base = [-0.4, -0.85];
        const ang = U.lerp(-1.95, -0.35, m.neck);
        const len = 1.9;
        const hx = base[0] + Math.cos(ang) * len, hy = base[1] + Math.sin(ang) * len;
        ctx.beginPath();
        ctx.moveTo(base[0], base[1]);
        ctx.quadraticCurveTo(base[0] + Math.cos(ang - 0.2) * len * 0.5, base[1] + Math.sin(ang - 0.2) * len * 0.5, hx, hy);
        ctx.lineCap = 'round';
        outline(ctx, 0.34, '#f2c14e');
        ctx.fillStyle = '#b8742a';
        for (let i = 1; i < 5; i++) {
          const k = i / 5;
          A.ellipse(ctx, U.lerp(base[0], hx, k) + 0.04, U.lerp(base[1], hy, k), 0.06, 0.05);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(ang + Math.PI / 2 + 0.2);
        E(ctx, 0, 0, 0.3, 0.38, '#f2c14e');
        E(ctx, 0, 0.26, 0.2, 0.16, '#e8b04a');
        E(ctx, -0.06, 0.32, 0.03, 0.03, '#5a3d24');
        E(ctx, 0.06, 0.32, 0.03, 0.03, '#5a3d24');
        ctx.fillStyle = '#b8742a';
        for (const s of [-1, 1]) {
          ctx.fillRect(s * 0.12 - 0.03, -0.55, 0.06, 0.2);
          E(ctx, s * 0.12, -0.56, 0.05, 0.05, '#8a5520');
        }
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-0.3, -0.22, 0.6, 0.1);
        eye(ctx, -0.12, -0.05, 0.07, 0, 0.35, '#f2c14e');
        eye(ctx, 0.12, -0.05, 0.07, 0, 0.35, '#f2c14e');
        ctx.beginPath();
        ctx.moveTo(-0.1, 0.38);
        ctx.quadraticCurveTo(0, 0.44, 0.12, 0.36);
        outline(ctx, 0.02, '#5a3d24');
        ctx.restore();
        // huge arms (double-bicep pose while flexing)
        const armUp = flex ? 1 : 0.2 + Math.sin(t * 2) * 0.05;
        for (const s of [-1, 1]) {
          ctx.save();
          ctx.translate(0.15 + s * 0.6, -0.85);
          ctx.rotate(s * (0.4 + armUp * 0.9));
          E(ctx, s * 0.12, -0.18, 0.28 + (flex ? 0.06 : 0), 0.22, '#f2c14e');
          outline(ctx, 0.025, '#c99a30');
          E(ctx, s * 0.25, -0.5, 0.14, 0.2, '#f2c14e');
          ctx.restore();
        }
        if (!flex) {
          // protein shaker
          ctx.fillStyle = '#5da9ff';
          ctx.fillRect(0.95, -1.25, 0.14, 0.3);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0.94, -1.3, 0.16, 0.07);
        }
      },
      drawOverlay(ctx, b, t, adv) {
        const m = b.mem;
        if (m.flexT <= 0) return;
        const G = adv.G, w = G.S * 3, x = b.cx - w / 2, y = b.y - b.unit * 3.1;
        ctx.fillStyle = 'rgba(20,20,40,0.6)';
        adv.roundRect(ctx, x, y, w, 14, 7);
        ctx.fill();
        ctx.fillStyle = '#ffd23f';
        adv.roundRect(ctx, x, y, Math.max(7, w * Math.min(1, m.interrupt / (m.need || 10))), 14, 7);
        ctx.fill();
        ctx.font = '800 13px "Baloo 2", Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('INTERRUPT THE FLEX!', b.cx, y - 5);
      },
    },

    // ======================================================================= 7. TSIMBERG
    {
      id: 'tsimberg', name: 'Tsimberg', title: 'Archmage of SPF', reward: 'sunCore', color: '#6c3fb5',
      hpMult: 1.35, atkMult: 1.25, scale: 1.0, attackEvery: 2.0, radius: 1.0, hitY: 1.2, mouth: [-0.7, -1.7],
      lines: {
        intro: 'Behold! SPF ONE MILLION!',
        enrage: 'The sun obeys ME, little furballs!',
        defeat: 'I… forgot… to reapply…',
        taunt: ['Reapply every two hours, mortals.', 'Without sunscreen you are NOTHING.', 'Feel the UV!', 'Broad spectrum. Broad POWER.'],
      },
      init(b) {
        b.mem.sunT = 0;
        b.mem.nextSun = 7;
        b.mem.stormT = 0;
      },
      update(b, dt, adv) {
        const m = b.mem, G = adv.G;
        b.y = b.homeY + Math.sin(b.t * 1.3) * G.S * 0.08;
        m.stormT = Math.max(0, m.stormT - dt);
        if (m.sunT > 0) {
          m.sunT -= dt;
          adv.highlight = 'sunscreen';
          if (m.sunT <= 0) {
            adv.highlight = null;
            if (adv.squad.protectT > 0) {
              adv.fx.word(G.W / 2, G.surface - G.S * 2.5, 'SPF ∞! BLOCKED!', '#fff6c0', 34);
              const refl = b.maxHp * 0.06;
              adv.hitBoss(refl, b.cx, b.cy, 'reflect');
              b.say('My own sun?! Betrayal!', 1.6);
            } else {
              adv.flash('#fff3b0', 0.8);
              for (const o of adv.squad.otters) adv.hurtSquad(b.atk * 1.4, o, { sun: true });
              adv.fx.word(G.W / 2, G.surface - G.S * 2.5, 'SUNBURN!', '#ff7a4a', 38);
            }
            adv.shake(10);
          }
        } else {
          m.nextSun -= dt * b.speed;
          if (m.nextSun <= 0 && b.busy <= 0) {
            m.nextSun = U.rand(11, 14);
            m.sunT = 4.2;
            b.busy = 2;
            b.say('RISE, GIANT SUN!', 1.8);
            adv.banner('☀️ GIANT SUN! Tap SUNSCREEN!', '#ffd23f', 2);
            adv.audio.bossSting && adv.audio.bossSting('tsimberg');
          }
        }
      },
      attacks: {
        sunBeams: {
          weight: 2.5,
          run(b, adv) {
            const n = b.enraged ? 3 : 2;
            const picks = adv.squad.otters.slice().sort(() => Math.random() - 0.5).slice(0, n);
            for (const o of picks)
              b.hazard({
                kind: 'rect', x: o.x, w: o.u * 1.2, warn: 1.1, dmg: b.atk, label: '☀️',
                drawActive(ctx, h, k) {
                  const g = ctx.createLinearGradient(h.x - h.w / 2, 0, h.x + h.w / 2, 0);
                  g.addColorStop(0, 'rgba(255,230,120,0)');
                  g.addColorStop(0.5, `rgba(255,250,200,${1 - k})`);
                  g.addColorStop(1, 'rgba(255,230,120,0)');
                  ctx.fillStyle = g;
                  ctx.fillRect(h.x - h.w / 2, 0, h.w, adv.G.surface + adv.G.S * 0.5);
                },
              });
          },
        },
        magicWave: { weight: 2, run: (b) => b.shoot('wave', { speed: 4.5, dmg: b.atk * 0.8, color: 'rgba(90,220,255,0.95)', size: b.adv.G.S * 0.45 }) },
        storm: {
          weight: 1.2,
          run(b, adv) {
            b.say('ISLAND STORM!', 1.2);
            b.mem.stormT = 3;
            for (let i = 0; i < 3; i++) {
              const o = adv.squad.randomOtter();
              b.adv.after(() => b.alive && onOtter(b, o, {
                warn: 0.9, dmg: b.atk * 0.8, label: '⚡',
                drawActive(ctx, h, k) {
                  ctx.strokeStyle = `rgba(230,250,255,${1 - k})`;
                  ctx.lineWidth = 5;
                  ctx.beginPath();
                  let y = 0, x = h.x + U.rand(-20, 20);
                  ctx.moveTo(x, y);
                  while (y < h.y) {
                    y += 30;
                    x += U.rand(-18, 18);
                    ctx.lineTo(x, y);
                  }
                  ctx.stroke();
                },
                onTrigger: () => adv.audio.zap && adv.audio.zap(),
              }), i * 450);
            }
          },
        },
        sunscreenBlast: {
          weight: 2,
          run(b) {
            for (let i = 0; i < 3; i++)
              b.adv.after(() => b.alive && b.lob('glob', 0.9, {
                dmg: b.atk * 0.5, size: b.adv.G.S * 0.2,
                draw(ctx, p) {
                  ctx.fillStyle = '#fffdf5';
                  A.ellipse(ctx, p.x, p.y, p.size, p.size * 0.85);
                  ctx.fill();
                  ctx.strokeStyle = '#e0d8c0';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                },
              }), i * 160);
          },
        },
        summon: {
          weight: 1,
          run(b) {
            b.say('Come forth, tropical friends!', 1.4);
            b.summon(U.chance(0.5) ? 'coconutCrab' : 'gull', 2 + (b.enraged ? 1 : 0));
          },
        },
      },
      draw(ctx, b, t) {
        // tiny island
        E(ctx, 0, 0.05, 1.1, 0.25, '#f2dca0');
        ctx.strokeStyle = '#8b6a45';
        ctx.lineWidth = 0.07;
        ctx.beginPath();
        ctx.moveTo(0.75, 0);
        ctx.quadraticCurveTo(0.85, -0.5, 0.7, -0.9);
        ctx.stroke();
        ctx.fillStyle = '#4f9a54';
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.translate(0.7, -0.9);
          ctx.rotate(i * 1.3 + Math.sin(t) * 0.1);
          A.ellipse(ctx, 0.25, 0, 0.28, 0.07);
          ctx.fill();
          ctx.restore();
        }
        // grass skirt
        ctx.strokeStyle = '#7da73b';
        ctx.lineWidth = 0.05;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.moveTo(-0.35 + i * 0.09, -0.45);
          ctx.lineTo(-0.38 + i * 0.09 + Math.sin(t * 3 + i) * 0.03, -0.02);
          ctx.stroke();
        }
        // Hawaiian robe
        ctx.fillStyle = '#22a6b3';
        ctx.beginPath();
        ctx.moveTo(-0.3, -1.35);
        ctx.lineTo(0.3, -1.35);
        ctx.lineTo(0.45, -0.42);
        ctx.lineTo(-0.45, -0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff7ab6';
        for (const [x, y] of [[-0.2, -1.1], [0.15, -0.9], [-0.1, -0.65], [0.28, -0.55], [-0.3, -0.5]]) {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TAU;
            A.ellipse(ctx, x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05, 0.04, 0.04);
            ctx.fill();
          }
        }
        // lei
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.1 + (i / 8) * 0.8);
          E(ctx, Math.cos(a) * 0.28, -1.35 + Math.sin(a) * 0.14, 0.05, 0.05, ['#ff7ab6', '#ffd23f', '#ff9d2e'][i % 3]);
        }
        // staff topped with a glowing sunscreen bottle
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(-0.72, -2.1, 0.07, 2.1);
        const glow = ctx.createRadialGradient(-0.68, -2.35, 0.02, -0.68, -2.35, 0.45);
        glow.addColorStop(0, 'rgba(255,240,150,0.9)');
        glow.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = glow;
        A.ellipse(ctx, -0.68, -2.35, 0.45, 0.45);
        ctx.fill();
        ctx.fillStyle = '#ff9d2e';
        ctx.fillRect(-0.8, -2.5, 0.24, 0.36);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.78, -2.4, 0.2, 0.12);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-0.73, -2.6, 0.1, 0.1);
        ctx.font = '900 0.07px sans-serif';
        ctx.fillStyle = '#ff9d2e';
        ctx.textAlign = 'center';
        ctx.fillText('SPF', -0.68, -2.31);
        // arm holding the staff
        E(ctx, -0.55, -1.15, 0.14, 0.1, '#c98f5e', -0.5);
        // head, beard, sunglasses, zinc nose
        const hy = -1.62;
        E(ctx, 0, hy, 0.28, 0.28, '#c98f5e');
        ctx.fillStyle = '#f4f4f4';
        ctx.beginPath();
        ctx.moveTo(-0.26, hy + 0.05);
        ctx.quadraticCurveTo(0, hy + 0.9, 0.26, hy + 0.05);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(-0.26, hy - 0.08, 0.22, 0.12);
        ctx.fillRect(0.02, hy - 0.08, 0.22, 0.12);
        ctx.fillRect(-0.04, hy - 0.05, 0.08, 0.03);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(-0.22, hy - 0.06, 0.06, 0.03);
        E(ctx, -0.02, hy + 0.08, 0.07, 0.05, '#ffffff');
        // wizard hat with stars and a hibiscus
        ctx.save();
        ctx.translate(0, hy - 0.15);
        ctx.rotate(-0.15 + Math.sin(t * 1.5) * 0.04);
        ctx.fillStyle = '#6c3fb5';
        ctx.beginPath();
        ctx.moveTo(-0.45, 0);
        ctx.quadraticCurveTo(-0.1, -0.5, 0.15, -1.05);
        ctx.quadraticCurveTo(0.12, -0.5, 0.45, 0);
        ctx.closePath();
        ctx.fill();
        E(ctx, 0, 0, 0.5, 0.09, '#5a2f9a');
        for (const [x, y] of [[-0.12, -0.25], [0.12, -0.45], [0.02, -0.7]]) A.drawSparkle(ctx, x, y, 0.07, '#ffd23f', t);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          E(ctx, 0.3 + Math.cos(a) * 0.06, -0.08 + Math.sin(a) * 0.06, 0.05, 0.05, '#ff5d8f');
        }
        E(ctx, 0.3, -0.08, 0.03, 0.03, '#ffd23f');
        ctx.restore();
      },
      drawOverlay(ctx, b, t, adv) {
        const m = b.mem, G = adv.G;
        if (m.stormT > 0) {
          ctx.strokeStyle = 'rgba(200,220,255,0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 40; i++) {
            const x = (i * 97 + t * 900) % G.W, y = (i * 53 + t * 1400) % G.H;
            ctx.moveTo(x, y);
            ctx.lineTo(x - 6, y + 18);
          }
          ctx.stroke();
        }
        if (m.sunT > 0) {
          const k = 1 - m.sunT / 4.2;
          const r = G.S * (1 + k * 1.8), x = G.W * 0.45, y = G.surface * 0.3;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
          g.addColorStop(0, `rgba(255,220,100,${0.5 + k * 0.4})`);
          g.addColorStop(1, 'rgba(255,200,80,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
          ctx.restore();
          ctx.fillStyle = '#ffdd55';
          A.ellipse(ctx, x, y, r, r);
          ctx.fill();
          ctx.strokeStyle = '#ffb02e';
          ctx.lineWidth = 4;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU + t;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1);
            ctx.lineTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
            ctx.stroke();
          }
          // an angry little sun face
          ctx.fillStyle = '#1d1520';
          A.ellipse(ctx, x - r * 0.3, y - r * 0.1, r * 0.08, r * 0.1);
          ctx.fill();
          A.ellipse(ctx, x + r * 0.3, y - r * 0.1, r * 0.08, r * 0.1);
          ctx.fill();
          ctx.strokeStyle = '#1d1520';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y + r * 0.35, r * 0.25, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
          ctx.font = `900 ${Math.round(G.S * 0.5)}px "Baloo 2", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'rgba(120,60,0,0.8)';
          ctx.lineWidth = 5;
          const s = Math.ceil(m.sunT);
          ctx.strokeText(String(s), x, y + r * 1.9);
          ctx.fillText(String(s), x, y + r * 1.9);
        }
      },
    },
  ];
})(window.OR);
