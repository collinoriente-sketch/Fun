// Special abilities. Each entry: id, icon, name, when it can be used and what it does.
// Cooldowns/damage live in OR.BAL.abilities; unlock rules live in OR.unlockedAbilities().
// To add one: push an entry here, give it a BAL.abilities entry and an unlock rule.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;
  const BA = () => OR.BAL.abilities;

  OR.ABILITIES = [
    {
      id: 'kelpBomb', icon: '💣', name: 'Kelp Bomb', explore: true,
      use(adv) {
        const o = adv.squad.randomOtter();
        const [hx, hy] = o.hand;
        const tgt = adv.target();
        o.throwT = 0.25;
        o.say(U.pick(['Kelp bomb!', 'Fire in the hole!', 'Catch!', 'hehe']), 1);
        adv.audio.whoosh && adv.audio.whoosh();
        adv.proj.lob({ from: 'otter', kind: 'kelpBomb', noCollide: true, x: hx, y: hy, tx: tgt.x, ty: tgt.y, size: adv.G.S * 0.3, g: adv.G.S * 16,
          onHit: (p) => adv.explode(p.x, p.y, adv.stats.tapDmg * BA().kelpBomb.dmg * adv.stats.bombMult, { radius: adv.G.S * 1.9, src: 'ability' }),
        }, 0.7);
        return true;
      },
      cd: (adv) => BA().kelpBomb.cd * adv.stats.bombCd,
    },
    {
      id: 'shellSlash', icon: '🌀', name: 'Shell Slash',
      use(adv) {
        const o = adv.squad.front();
        const [hx, hy] = o.hand;
        const tgt = adv.target();
        o.throwT = 0.25;
        o.say('SHELL SLASH!', 1.2);
        adv.audio.whoosh && adv.audio.whoosh();
        adv.proj.fire({
          from: 'otter', kind: 'slash', noCollide: true, x: hx, y: hy, vx: (tgt.x - hx) / 0.3, vy: (tgt.y - hy) / 0.3, life: 0.3, size: adv.G.S * 0.5,
          draw(ctx, p, t) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(t * 25);
            ctx.strokeStyle = 'rgba(200,245,255,0.8)';
            ctx.lineWidth = p.size * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 1.1, 0, Math.PI * 1.3);
            ctx.stroke();
            A.drawShell(ctx, 0, 0, p.size * 0.6);
            ctx.restore();
          },
          onHit: (p) => {
            const dmg = adv.stats.tapDmg * BA().shellSlash.dmg / 3;
            for (let i = 0; i < 3; i++) {
              adv.after(() => {
                adv.addEffect({ dur: 0.35, draw: (ctx, k) => {
                  ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
                  ctx.lineWidth = adv.G.S * 0.18 * (1 - k);
                  ctx.beginPath();
                  const a = -0.8 + i * 0.8;
                  ctx.arc(p.x, p.y, adv.G.S * (1.2 + k * 0.4), a, a + 1.6);
                  ctx.stroke();
                } });
                adv.dealDamage(dmg, p.x, p.y, 'ability', adv.G.S * 1.3);
                adv.shake(5);
                adv.audio.hit && adv.audio.hit(1.2);
              }, i * 110);
            }
            adv.fx.word(p.x, p.y - adv.G.S * 1.4, 'SHELL SLASH!', '#bff4ff', 30);
          },
        });
        return true;
      },
      cd: () => BA().shellSlash.cd,
    },
    {
      id: 'shadowOtters', icon: '👥', name: 'Shadow Otters',
      use(adv) {
        adv.effects.shadowOtters = BA().shadowOtters.dur;
        adv.banner('SHADOW OTTER TECHNIQUE!', '#c79bff', 1.2);
        adv.audio.whoosh && adv.audio.whoosh();
        return true;
      },
      tick(adv, dt) {
        adv.mem.shadowTick = (adv.mem.shadowTick || 0) - dt;
        if (adv.mem.shadowTick > 0) return;
        adv.mem.shadowTick = 0.32;
        const src = adv.squad.randomOtter(), tgt = adv.target();
        const ghost = { src, x0: src.x, y0: src.y, x1: tgt.x + U.rand(-1, 1) * adv.G.S * 0.6, y1: tgt.y + U.rand(-0.5, 0.8) * adv.G.S };
        adv.addEffect({
          dur: 0.45,
          draw: (ctx, k, t) => {
            const o = ghost.src;
            const save = { x: o.x, y: o.y, alphaMul: o.alphaMul };
            o.x = U.lerp(ghost.x0, ghost.x1, U.easeInOut(Math.min(1, k * 1.5)));
            o.y = U.lerp(ghost.y0, ghost.y1, U.easeInOut(Math.min(1, k * 1.5)));
            o.alphaMul = 0.45 * (1 - Math.max(0, k - 0.65) / 0.35);
            A.drawOtter(ctx, o, t);
            Object.assign(o, save);
          },
          at: 0.3,
          fire: () => adv.dealDamage(adv.stats.tapDmg * BA().shadowOtters.dmg, ghost.x1, ghost.y1, 'ability', adv.G.S),
        });
      },
      cd: () => BA().shadowOtters.cd,
    },
    {
      id: 'kelpCyclone', icon: '🟢', name: 'Kelp Cyclone',
      use(adv) {
        const o = adv.squad.otters[3];
        o.say('KELP… CYCLONE… SPHERE!!', 1.6);
        adv.audio.charge && adv.audio.charge(1);
        const tgt = adv.target();
        const sphere = { x: o.x, y: o.y - o.u * 1.6 };
        adv.addEffect({
          dur: 1.5,
          draw: (ctx, k, t) => {
            const charge = Math.min(1, k / 0.65), fly = Math.max(0, (k - 0.65) / 0.35);
            const x = U.lerp(sphere.x, tgt.x, U.easeInOut(fly)), y = U.lerp(sphere.y, tgt.y, U.easeInOut(fly));
            const r = adv.G.S * (0.25 + charge * 0.55);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
            g.addColorStop(0, 'rgba(240,255,220,0.95)');
            g.addColorStop(0.4, 'rgba(130,220,90,0.8)');
            g.addColorStop(1, 'rgba(80,180,60,0)');
            ctx.fillStyle = g;
            A.ellipse(ctx, x, y, r * 1.8, r * 1.8);
            ctx.fill();
            // orbiting kelp blades
            ctx.strokeStyle = 'rgba(70,140,40,0.9)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
              const a = t * 14 + (i * TAU) / 5;
              ctx.beginPath();
              ctx.arc(x, y, r * (0.7 + (i % 2) * 0.3), a, a + 1.4);
              ctx.stroke();
            }
          },
          at: 1.5,
          fire: () => {
            adv.dealDamage(adv.stats.tapDmg * BA().kelpCyclone.dmg, tgt.x, tgt.y, 'ability', adv.G.S * 2);
            adv.fx.burst('kelp', tgt.x, tgt.y, 16, adv.G.S * 6, '#6f9a35', adv.G.S * 0.2, 1);
            adv.fx.ring(tgt.x, tgt.y, adv.G.S * 4, '#c8ff9a', 0.6);
            adv.fx.word(tgt.x, tgt.y - adv.G.S * 1.5, 'KELP CYCLONE SPHERE!!', '#c8ff9a', 30);
            adv.shake(14);
            adv.flash('#eaffd0', 0.35);
            adv.audio.boom && adv.audio.boom(1);
          },
        });
        return true;
      },
      cd: () => BA().kelpCyclone.cd,
    },
    {
      id: 'spiritFluff', icon: '☁️', name: 'Spirit Fluff',
      use(adv) {
        const G = adv.G, [cx] = adv.squad.centre();
        adv.banner('SPIRITUAL FLUFF!', '#fff6c0', 1.2);
        adv.proj.clear('boss');
        adv.squad.hp = Math.min(1, adv.squad.hp + BA().spiritFluff.heal);
        adv.audio.charge && adv.audio.charge(0.6);
        let hitDone = false;
        adv.addEffect({
          dur: 1.1,
          draw: (ctx, k, t) => {
            const x = U.lerp(cx, G.W + G.S * 2, k);
            ctx.save();
            ctx.globalAlpha = 0.85 * (1 - Math.max(0, k - 0.7) / 0.3);
            for (let i = 0; i < 9; i++) {
              const y = G.surface - G.S * 2.4 + i * G.S * 0.55;
              const g = ctx.createRadialGradient(x, y, 0, x, y, G.S * 0.9);
              g.addColorStop(0, 'rgba(255,255,255,0.95)');
              g.addColorStop(1, 'rgba(255,240,200,0)');
              ctx.fillStyle = g;
              A.ellipse(ctx, x + Math.sin(i + t * 4) * G.S * 0.2, y, G.S * 0.9, G.S * 0.7);
              ctx.fill();
            }
            ctx.restore();
            const tgt = adv.target();
            if (!hitDone && x >= tgt.x) {
              hitDone = true;
              adv.dealDamage(adv.stats.tapDmg * BA().spiritFluff.dmg, tgt.x, tgt.y, 'ability', G.S * 2);
            }
          },
        });
        for (const o of adv.squad.otters) adv.fx.add('heart', o.x, o.y - o.u, { vy: -40, size: 14, color: '#ff8fb1', life: 1 });
        return true;
      },
      cd: () => BA().spiritFluff.cd,
    },
    {
      id: 'sunscreen', icon: '🧴', name: 'Sunscreen', bossOnly: true,
      use(adv) {
        adv.squad.protectT = BA().sunscreen.dur;
        const [cx, cy] = adv.squad.centre();
        adv.fx.word(cx, cy - adv.G.S * 1.4, 'SUNSCREEN ON!', '#fffbe0', 28);
        adv.fx.burst('spark', cx, cy, 10, adv.G.S * 4, '#ffffff', 8, 0.7);
        adv.audio.collect && adv.audio.collect();
        if (adv.highlight === 'sunscreen') adv.highlight = null;
        return true;
      },
      cd: () => BA().sunscreen.cd,
    },
    {
      id: 'fluffForm', icon: '✨', name: 'Fluff Form',
      use(adv) {
        adv.effects.fluffForm = BA().fluffForm.dur;
        adv.banner('ULTIMATE FLUFF FORM!!', '#ffd23f', 1.6);
        adv.flash('#fff3b0', 0.6);
        adv.shake(10);
        const [cx, cy] = adv.squad.centre();
        adv.fx.ring(cx, cy, adv.G.S * 5, '#ffd23f', 0.7);
        adv.fx.burst('spark', cx, cy, 16, adv.G.S * 6, '#ffe680', 10, 0.9);
        adv.audio.charge && adv.audio.charge(1.2);
        return true;
      },
      cd: () => BA().fluffForm.cd,
    },
    {
      id: 'kelpTails', icon: '🌪️', name: 'Kelp-Tail Spirit',
      use(adv) {
        adv.effects.kelpTails = BA().kelpTails.dur;
        adv.banner('KELP-TAIL SPIRIT, AWAKEN!', '#8cffaa', 1.6);
        adv.flash('#c8ffd8', 0.5);
        adv.shake(8);
        adv.audio.charge && adv.audio.charge(0.9);
        return true;
      },
      tick(adv, dt) {
        adv.mem.tailTick = (adv.mem.tailTick || 0) - dt;
        if (adv.mem.tailTick > 0) return;
        adv.mem.tailTick = 0.6;
        const [cx] = adv.squad.centre(), G = adv.G, tgt = adv.target();
        const x0 = cx, y0 = G.surface - G.S * 1.6;
        adv.addEffect({
          dur: 0.4,
          draw: (ctx, k) => {
            ctx.strokeStyle = `rgba(140,255,170,${0.9 * (1 - k)})`;
            ctx.lineWidth = G.S * 0.3 * (1 - k * 0.5);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo((x0 + tgt.x) / 2, y0 - G.S * 2.5, U.lerp(x0, tgt.x, Math.min(1, k * 2)), U.lerp(y0, tgt.y, Math.min(1, k * 2)));
            ctx.stroke();
          },
          at: 0.2,
          fire: () => adv.dealDamage(adv.stats.tapDmg * BA().kelpTails.dmg, tgt.x, tgt.y, 'ability', G.S),
        });
      },
      cd: () => BA().kelpTails.cd,
    },
  ];

  // The big one: the whole family joins paws and fires the Grand Raft Supernova.
  OR.fireFinale = function (adv) {
    const G = adv.G, b = adv.boss;
    if (!b) return;
    adv.st.ult = 0;
    adv.finale = 3.4;
    adv.proj.clear('boss');
    adv.banner('GRAND RAFT SUPERNOVA!!!', '#ffffff', 2);
    adv.audio.charge && adv.audio.charge(2);
    for (const o of adv.squad.otters) o.say(U.pick(['TOGETHER!', 'FAMILY POWER!', 'Hold paws!!', 'NOW!!']), 1.6);
    const [cx] = adv.squad.centre();
    const ox = cx, oy = G.surface - G.S * 2.4;
    adv.addEffect({
      dur: 3.4,
      draw: (ctx, k, t) => {
        const gather = Math.min(1, k / 0.5);
        // energy streaming from every otter into the orb
        if (k < 0.55) {
          for (const o of adv.squad.otters) {
            ctx.strokeStyle = 'rgba(255,240,180,0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(o.x, o.y - o.u * 0.5);
            ctx.lineTo(U.lerp(o.x, ox, gather), U.lerp(o.y - o.u * 0.5, oy, gather));
            ctx.stroke();
          }
        }
        const r = G.S * (0.3 + gather * 1.1) * (1 + Math.sin(t * 20) * 0.05);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,230,140,0.9)');
        g.addColorStop(0.7, 'rgba(120,220,255,0.6)');
        g.addColorStop(1, 'rgba(120,220,255,0)');
        ctx.fillStyle = g;
        A.ellipse(ctx, ox, oy, r * 2, r * 2);
        ctx.fill();
        if (k > 0.5 && k < 0.85) {
          const bk = (k - 0.5) / 0.35;
          const w = G.S * (1.2 + Math.sin(t * 40) * 0.1) * Math.sin(bk * Math.PI);
          const ang = Math.atan2(b.cy - oy, b.cx - ox), len = Math.hypot(b.cx - ox, b.cy - oy) + G.W;
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(ang);
          const bg = ctx.createLinearGradient(0, -w, 0, w);
          bg.addColorStop(0, 'rgba(120,220,255,0)');
          bg.addColorStop(0.3, 'rgba(255,230,140,0.9)');
          bg.addColorStop(0.5, 'rgba(255,255,255,1)');
          bg.addColorStop(0.7, 'rgba(255,230,140,0.9)');
          bg.addColorStop(1, 'rgba(120,220,255,0)');
          ctx.fillStyle = bg;
          ctx.fillRect(0, -w, len, w * 2);
          ctx.restore();
        }
      },
      at: 2.0,
      fire: () => {
        const dmg = adv.stats.tapDmg * OR.BAL.abilities.finale.dmg * adv.stats.finaleMult + b.maxHp * OR.BAL.abilities.finale.bossPct;
        adv.hitBoss(dmg, b.cx, b.cy, 'finale', true);
        adv.fx.burst('spark', b.cx, b.cy, 24, G.S * 8, '#fff6c0', 12, 1.1);
        adv.fx.ring(b.cx, b.cy, G.S * 6, '#ffffff', 0.8);
        adv.shake(24);
        adv.flash('#ffffff', 0.9);
        adv.audio.boom && adv.audio.boom(1.6);
      },
    });
  };
})(window.OR);
