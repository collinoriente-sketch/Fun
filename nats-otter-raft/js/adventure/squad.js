// The otter family in Adventure mode. Reuses the cozy otter artwork (OR.art.drawOtter) with a
// side-on "bobbing at the surface" pose, plus gear, attacks, knockback and the dizzy knocked-out state.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;
  // left -> right; Collin swims at the front
  const ORDER = ['gussy', 'finny', 'winston', 'natalie', 'collin'];
  // Story: the storm scattered the family. Collin rescues them in this order, one per boss.
  OR.RESCUE_ORDER = ['natalie', 'winston', 'gussy', 'finny'];

  function pose() {
    return { bob: 0, lift: 0, rot: 0, sx: 1, sy: 1, eo: 1, happy: 0, yawn: 0, oh: 0, kick: 0, lean: 0, sub: 0, blush: 0.3, alx: -0.13, aly: 0.02, arx: 0.13, ary: 0.02, lookX: 0.6, lookY: 0, tilt: 0, kelp: 0, itemY: 0, wiggle: 0, costume: 0, step: 0 };
  }

  class AdvOtter {
    constructor(adv, def, i) {
      this.adv = adv;
      this.game = adv; // drawOtter reads o.game.time for glove sparkles
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.pal = def.pal;
      this.baseShape = def.shape;
      this.shape = Object.assign({}, def.shape);
      this.size = def.size;
      this.baby = def.role === 'baby';
      this.i = i;
      this.seed = Math.random() * 100;
      this.q = pose();
      this.x = 0;
      this.y = 0;
      this.dx = 0; // offsets from the formation slot (reaching, knockback)
      this.dy = 0;
      this.u = 40;
      this.blink = 0;
      this.blinkT = U.rand(1, 4);
      this.throwT = 0;
      this.attackT = U.rand(0, OR.BAL.autoAttackEvery);
      this.hurtT = 0;
      this.reach = null;
      this.speech = null;
    }
    say(text, dur) {
      this.speech = { text, t: 0, dur: dur || 1.8 };
    }
    // Where a thrown shell leaves the paw.
    get hand() {
      return [this.x + this.u * 0.35, this.y - this.u * 0.55];
    }
  }

  class Squad {
    constructor(adv) {
      this.adv = adv;
      // Only otters that have been rescued exist at all (nobody waits invisibly in the background).
      this.otters = [];
      this.byId = {};
      for (const id of adv.st.family) this.addMember(id);
      this.hp = 1;
      this.ko = false;
      this.koT = 0;
      this.protectT = 0; // sunscreen
      this.hitFlash = 0;
    }

    // A rescued otter joins the party for good. Returns the new otter.
    addMember(id, at) {
      if (this.byId[id]) return this.byId[id];
      const o = new AdvOtter(this.adv, OR.FAMILY.find((d) => d.id === id), 0);
      this.byId[id] = o;
      this.otters.push(o);
      this.otters.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
      this.otters.forEach((m, i) => (m.i = i));
      if (this.adv.st.up) o.gear = OR.gearFor(this.adv.st);
      if (this.adv.G) this.layout();
      if (at) {
        o.x = at.x;
        o.y = o.by = at.y;
        o.placed = true;
      }
      if (this.adv.st.up) this.applyGear(this.adv.st);
      return o;
    }

    front() {
      return this.otters[this.otters.length - 1];
    }
    centre() {
      const a = this.otters[0], b = this.front();
      return [(a.x + b.x) / 2, (a.y + b.y) / 2 - a.u * 0.4];
    }
    randomOtter() {
      return U.pick(this.otters);
    }

    layout() {
      const G = this.adv.G;
      let x = G.W * (G.portrait ? 0.02 : 0.05) + G.S * 0.5;
      const tight = this.tight ? 0.78 : 1; // the ending huddles everyone close to hold paws
      for (const o of this.otters) {
        o.u = G.S * o.size;
        o.homeX = x + o.u * 0.4;
        o.homeY = G.surface - o.u * 0.3;
        x += (o.u * (G.portrait ? 0.9 : 1.12) + G.S * (G.portrait ? 0.02 : 0.14)) * tight;
      }
    }

    applyGear(st) {
      const gear = OR.gearFor(st);
      for (const o of this.otters) {
        o.gear = gear;
        o.shape = Object.assign({}, o.baseShape, { fluff: o.baseShape.fluff * (1 + gear.fluff * 3) });
      }
    }

    update(dt, t) {
      const adv = this.adv, G = adv.G;
      this.protectT = Math.max(0, this.protectT - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      if (this.ko) {
        this.koT -= dt;
        if (this.koT <= 0) adv.recover();
      }
      const formFluff = adv.effectActive('fluffForm') ? 1 : 0;
      const formTails = adv.effectActive('kelpTails');
      for (const o of this.otters) {
        const q = o.q, p = pose();
        o.formFluff = U.damp(o.formFluff || 0, formFluff, 4, dt);
        o.formTails = formTails;
        // swimming along
        const moving = adv.mode === 'explore';
        p.kick = moving ? 0.6 : 0.3;
        p.lean = moving ? 0.18 : 0.06;
        p.alx = -0.28 + Math.sin(t * 6 + o.i) * 0.08;
        p.aly = -0.05 + Math.cos(t * 6 + o.i) * 0.06;
        p.arx = 0.3 + Math.sin(t * 6 + o.i + 1) * 0.08;
        p.ary = -0.05;
        p.lookX = 0.7;
        p.lookY = moving ? 0 : -0.2;
        if (adv.mode === 'boss' || adv.mode === 'bossIntro') p.eo = 1;
        // tossing a shell
        if (o.throwT > 0) {
          o.throwT -= dt;
          const k = 1 - o.throwT / 0.25;
          p.arx = 0.2 + k * 0.35;
          p.ary = -0.7 + k * 0.6;
          p.oh = 0.5;
        }
        // reaching for a pickup (dip under or hop up)
        let tx = 0, ty = 0;
        if (o.reach) {
          o.reach.t -= dt;
          tx = U.clamp(o.reach.x - o.homeX, -G.S, G.S * 1.5);
          ty = U.clamp(o.reach.y - o.homeY, -G.S * 1.3, G.S * 1.2);
          p.happy = 1;
          p.eo = 0;
          if (o.reach.t <= 0) o.reach = null;
        }
        // ouch
        if (o.hurtT > 0) {
          o.hurtT -= dt;
          p.oh = 1;
          p.lean = -0.5;
          tx -= G.S * 0.5 * (o.hurtT / 0.5);
        }
        // knocked out: tipped over, eyes closed, stars circling
        if (this.ko) {
          p.eo = 0;
          p.happy = 0;
          p.lean = -1.35;
          p.alx = -0.45; p.aly = 0.1; p.arx = 0.45; p.ary = 0.1;
          p.kick = 0;
          tx = -G.S * 0.3;
          ty = G.S * 0.25;
        }
        if (this.protectT > 0) p.blush = 1;
        if (formFluff) {
          p.happy = 1;
          p.eo = 1;
          p.blush = 1;
        }
        // story scenes can take over an otter's position and expression
        const cine = o.cine;
        if (cine && cine.pose) Object.assign(p, cine.pose);
        o.dx = U.damp(o.dx, tx, 8, dt);
        o.dy = U.damp(o.dy, ty, 8, dt);
        const wave = Math.sin(t * 2 + o.i * 0.9) * G.S * 0.04 * (1 + (adv.rough || 0) * 4);
        if (!o.placed) {
          o.placed = true;
          o.x = o.homeX + o.dx;
          o.by = o.homeY + o.dy;
        }
        if (cine) {
          o.x = U.damp(o.x, cine.x, cine.speed || 3, dt);
          o.by = U.damp(o.by, cine.y, cine.speed || 3, dt);
        } else {
          o.x = U.damp(o.x, o.homeX + o.dx, 7, dt);
          o.by = U.damp(o.by, o.homeY + o.dy, 12, dt);
        }
        o.y = o.by + wave;
        for (const k in p) if (k !== 'bob' && k !== 'rot') q[k] = U.damp(q[k], p[k], 10, dt);
        q.bob = Math.sin(t * 1.8 + o.seed) * 0.04;
        q.rot = U.damp(q.rot, q.lean, 8, dt);
        // blink
        o.blinkT -= dt;
        if (o.blinkT <= 0) {
          const k = -o.blinkT / 0.15;
          o.blink = k < 0.5 ? k * 2 : Math.max(0, 2 - k * 2);
          if (k >= 1) {
            o.blink = 0;
            o.blinkT = U.rand(2, 5);
          }
        }
        if (o.speech) {
          o.speech.t += dt;
          if (o.speech.t > o.speech.dur) o.speech = null;
        }
      }
    }

    draw(ctx, t) {
      const adv = this.adv, G = adv.G;
      // spirit of the Kelp-Tail form looming behind the family
      if (adv.effectActive('kelpTails')) this.drawSpirit(ctx, t);
      for (const o of this.otters) {
        // Shadow Fin reward: moody afterimages trailing behind
        if (o.gear && o.gear.shadow && adv.mode === 'explore' && !OR.lowFx) {
          o.alphaMul = 0.12;
          const x0 = o.x;
          o.x -= o.u * 0.5;
          A.drawOtter(ctx, o, t - 0.1);
          o.x = x0;
          o.alphaMul = 1;
        }
        if (OR.Assets.draw(ctx, 'otters/' + o.id, o.x, o.y - o.u * 0.4, o.u * 1.6, o.u * 2)) continue;
        A.drawOtter(ctx, o, t);
      }
      if (this.protectT > 0) {
        // sunscreen shine
        const [cx, cy] = this.centre();
        const w = Math.max(G.S * 0.8, (this.front().x - this.otters[0].x) / 2 + G.S);
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 6);
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 1.1);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.8, 'rgba(255,250,210,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.fillStyle = gr;
        A.ellipse(ctx, cx, cy, w * 1.1, G.S * 1.3);
        ctx.fill();
        ctx.restore();
      }
    }

    // Drawn after the water so they read clearly: dizzy stars, speech, health bar.
    drawOverlay(ctx, t) {
      const adv = this.adv, G = adv.G;
      for (const o of this.otters) {
        if (this.ko) {
          for (let i = 0; i < 3; i++) {
            const a = t * 4 + (i * TAU) / 3;
            const hx = o.x - o.u * 0.3 + Math.cos(a) * o.u * 0.35;
            const hy = o.y - o.u * 0.4 + Math.sin(a) * o.u * 0.1;
            A.drawSparkle(ctx, hx, hy, o.u * 0.12, '#ffe066', a);
          }
        }
        if (o.speech) adv.drawBubble(ctx, o.x, o.y - o.u * 1.25, o.speech);
      }
      if (adv.mode === 'boss' || this.hp < 0.999) {
        const a = this.otters[0], b = this.front();
        const x = a.x - a.u * 0.4, w = b.x - a.x + b.u * 0.8, y = G.surface + G.S * 0.6;
        ctx.fillStyle = 'rgba(20,20,40,0.45)';
        adv.roundRect(ctx, x, y, w, 6, 3);
        ctx.fill();
        ctx.fillStyle = this.ko ? '#ffb347' : this.hp > 0.5 ? '#6ee07a' : this.hp > 0.25 ? '#ffd23f' : '#ff5d6c';
        adv.roundRect(ctx, x, y, Math.max(3, w * U.clamp(this.ko ? 1 - this.koT / OR.BAL.koTime : this.hp, 0, 1)), 6, 3);
        ctx.fill();
        if (this.ko) {
          ctx.font = `800 ${Math.round(U.clamp(G.S * 0.28, 12, 18))}px "Baloo 2", Nunito, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = 'rgba(30,20,50,0.8)';
          ctx.lineWidth = 4;
          const txt = 'Dizzy! Tap to cheer them up!';
          ctx.strokeText(txt, x + w / 2, y + 28);
          ctx.fillText(txt, x + w / 2, y + 28);
        }
      }
    }

    drawSpirit(ctx, t) {
      const G = this.adv.G;
      const [cx] = this.centre();
      const ghost = {
        game: this.adv, def: this.front().def, pal: this.front().pal, shape: this.front().baseShape, seed: 3, blink: 0,
        x: cx, y: G.surface - G.S * 0.1, u: G.S * 2.3, q: pose(), gear: { stage: 6, tails: false }, formTails: true, formFluff: 0, alphaMul: 0.13,
      };
      ghost.q.happy = 1;
      ghost.q.eo = 0;
      ghost.q.bob = Math.sin(t) * 0.02;
      ghost.q.alx = -0.5; ghost.q.aly = -0.6; ghost.q.arx = 0.5; ghost.q.ary = -0.6;
      A.drawOtter(ctx, ghost, t);
    }
  }

  OR.Squad = Squad;
})(window.OR);
