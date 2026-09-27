// ============================================================================
//  BOSS FRAMEWORK
//  A boss is a plain definition object in OR.BOSSES (see bosses.js). The Boss class below
//  handles everything shared: scaling, modifiers, intro, attack scheduling, damage, defeat.
//
//  Definition fields (all optional except id/name/draw):
//    id, name, title, reward (key in OR.REWARDS), color, sound (key for audio.bossSting)
//    hpMult, atkMult, scale, attackEvery      tuning relative to the BAL curve
//    homeY(G)                                 where it hovers (default: at the surface)
//    radius, hitY                             hit circle in boss units
//    lines: { intro, enrage, defeat, taunt: [] }
//    init(b), update(b, dt, adv)              set up / run the boss's gimmick every frame
//    attacks: { name: { weight, run(b, adv) } }
//    onDamage(b, amount, src, adv) -> amount  change incoming damage (0 = blocked)
//    tapTarget(b, x, y, adv) -> {x, y, real}  where a tap attack lands (clones etc.)
//    draw(ctx, b, t)                          drawn in boss units, facing left, origin at the waterline
//    drawOverlay(ctx, b, t, adv)              optional extra drawing in screen space (suns, walls…)
// ============================================================================
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art;

  // Extra twists for later loops through the boss list.
  OR.BOSS_MODS = [
    { id: 'armored', icon: '🛡️', name: 'Armored', apply: (b) => (b.dmgTakenMult *= 0.7) },
    { id: 'swift', icon: '💨', name: 'Swift', apply: (b) => (b.speed *= 1.35) },
    { id: 'giant', icon: '🗿', name: 'Giant', apply: (b) => { b.scale *= 1.2; b.maxHp *= 1.35; b.hp = b.maxHp; } },
    { id: 'regen', icon: '💚', name: 'Regenerating', update: (b, dt) => (b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.003 * dt)) },
    { id: 'furious', icon: '😤', name: 'Furious', apply: (b) => (b.atk *= 1.4) },
    { id: 'shiny', icon: '✨', name: 'Shiny', apply: (b) => (b.lootMult *= 2.5) },
  ];

  class Boss {
    // index = position in the rotation (0..6); level = how many bosses came before (drives scaling)
    constructor(adv, def, index, cycle, level) {
      const B = OR.BAL;
      this.adv = adv;
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.index = index;
      this.cycle = cycle;
      const lv = level == null ? index : level;
      this.maxHp = Math.round(B.bossHpBase * Math.pow(B.bossHpGrowth, lv) * (def.hpMult || 1) * Math.pow(B.cycleHpMult, cycle));
      this.hp = this.maxHp;
      this.atk = B.bossDamageBase * Math.pow(B.bossDamageGrowth, lv) * (def.atkMult || 1) * Math.pow(B.cycleDamageMult, cycle);
      this.speed = 1 + cycle * 0.12;
      this.scale = def.scale || 1;
      this.dmgTakenMult = 1;
      this.lootMult = 1;
      this.mods = [];
      const pool = OR.BOSS_MODS.slice();
      for (let i = 0; i < Math.min(cycle, 3); i++) {
        const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        this.mods.push(m);
        if (m.apply) m.apply(this);
      }
      this.state = 'intro';
      this.t = 0;
      this.stT = 0;
      this.flash = 0;
      this.squash = 0;
      this.enraged = false;
      this.attackT = 2.2;
      this.busy = 0; // seconds during which no new attack starts
      this.stun = 0;
      this.speech = null;
      this.mem = {};
      const G = adv.G;
      this.homeX = G.W * (G.portrait ? 0.78 : 0.74);
      this.homeY = def.homeY ? def.homeY(G) : G.surface;
      this.x = G.W + G.BU * 3;
      this.y = this.homeY;
      this.lean = 0;
      if (def.init) def.init(this, adv);
    }

    get unit() {
      return this.adv.G.BU * this.scale;
    }
    get alive() {
      return this.state !== 'defeated';
    }

    say(text, dur) {
      this.speech = { text, t: 0, dur: dur || 2.2 };
    }

    // centre of the hit circle in screen space
    get cx() { return this.x; }
    get cy() { return this.y - this.unit * (this.def.hitY == null ? 0.8 : this.def.hitY); }

    hitTest(x, y) {
      return U.dist(x, y, this.cx, this.cy) < this.unit * (this.def.radius || 1.1);
    }

    update(dt) {
      const adv = this.adv, def = this.def;
      this.t += dt;
      this.stT += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.squash = Math.max(0, this.squash - dt * 5);
      this.busy = Math.max(0, this.busy - dt);
      this.stun = Math.max(0, this.stun - dt);
      if (this.speech) {
        this.speech.t += dt;
        if (this.speech.t > this.speech.dur) this.speech = null;
      }
      if (this.state === 'intro') {
        const k = U.clamp(this.stT / 1.6, 0, 1);
        this.x = U.lerp(adv.G.W + this.unit * 3, this.homeX, U.easeOutBack(k));
        if (this.stT > 0.5 && !this.mem.introSaid) {
          this.mem.introSaid = true;
          if (def.lines && def.lines.intro) this.say(def.lines.intro, 2.6);
        }
        if (this.stT > 2.4) {
          this.state = 'fight';
          this.stT = 0;
        }
        return;
      }
      if (this.state === 'defeated') {
        this.lean = Math.min(1.4, this.stT * 1.2);
        this.y += dt * this.unit * (this.stT > 1.2 ? 1.2 : -0.3);
        return;
      }
      // fight
      this.fightT = (this.fightT || 0) + dt;
      this.fatigue = Math.max(0, (this.fightT - OR.BAL.fatigueAfter) / OR.BAL.fatigueRamp);
      if (this.fatigue > 0 && !this.mem.tiredSaid) {
        this.mem.tiredSaid = true;
        adv.banner(`${this.name} is getting tired!`, '#9fd8ff', 1.6);
        this.say('*huff* *puff*', 1.6);
      }
      for (const m of this.mods) if (m.update) m.update(this, dt);
      if (!this.enraged && this.hp < this.maxHp * 0.5) {
        this.enraged = true;
        this.speed *= 1.25;
        if (def.lines && def.lines.enrage) this.say(def.lines.enrage, 2.4);
        adv.banner(this.name.toUpperCase() + ' IS FURIOUS!', '#ff5d6c', 1.4);
        adv.audio.bossSting && adv.audio.bossSting(def.sound || def.id);
      }
      if (def.update) def.update(this, dt, adv);
      if (!adv.squad.ko && this.stun <= 0 && this.busy <= 0) {
        this.attackT -= dt * this.speed;
        if (this.attackT <= 0) {
          this.attackT = (def.attackEvery || 2.6) * U.rand(0.8, 1.2);
          const w = {};
          for (const k in def.attacks) w[k] = def.attacks[k].weight || 1;
          const pick = U.weighted(w);
          if (pick) def.attacks[pick].run(this, adv);
          if (def.lines && def.lines.taunt && U.chance(0.25) && !this.speech) this.say(U.pick(def.lines.taunt));
        }
      }
    }

    // Returns the damage actually dealt.
    damage(amount, src) {
      if (this.state !== 'fight') return 0;
      let a = amount * this.dmgTakenMult * (this.stun > 0 ? 1.5 : 1) * (1 + (this.fatigue || 0));
      if (this.def.onDamage) a = this.def.onDamage(this, a, src, this.adv);
      if (!(a > 0)) return 0;
      this.hp -= a;
      this.flash = 0.1;
      this.squash = 1;
      if (this.hp <= 0) {
        this.hp = 0;
        this.state = 'defeated';
        this.stT = 0;
        if (this.def.lines && this.def.lines.defeat) this.say(this.def.lines.defeat, 3);
        this.adv.bossDefeated(this);
      }
      return a;
    }

    // ---------------------------------------------------------------- attack helpers
    mouth() {
      const m = this.def.mouth || [-0.8, -0.8];
      return [this.x + m[0] * this.unit, this.y + m[1] * this.unit];
    }
    // Straight shot at an otter.
    shoot(kind, opts) {
      const adv = this.adv, o = (opts && opts.target) || adv.squad.randomOtter();
      const [x, y] = (opts && opts.from) || this.mouth();
      const sp = adv.G.S * ((opts && opts.speed) || 5);
      const tx = o.x, ty = o.y - o.u * 0.45;
      const d = Math.hypot(tx - x, ty - y) || 1;
      return adv.proj.fire(Object.assign({ from: 'boss', kind, x, y, vx: ((tx - x) / d) * sp, vy: ((ty - y) / d) * sp, target: o, dmg: this.atk, size: adv.G.S * 0.2, life: 4 }, opts || {}));
    }
    // Lobbed at an otter, lands after `time` seconds.
    lob(kind, time, opts) {
      const adv = this.adv, o = (opts && opts.target) || adv.squad.randomOtter();
      const [x, y] = (opts && opts.from) || this.mouth();
      return adv.proj.lob(Object.assign({ from: 'boss', kind, x, y, tx: o.x, ty: o.y - o.u * 0.4, target: o, dmg: this.atk, size: adv.G.S * 0.22, g: adv.G.S * 14 }, opts || {}), time);
    }
    // A telegraphed attack over a region: shows a warning first, then hits.
    hazard(h) {
      return this.adv.addHazard(Object.assign({ dmg: this.atk * 1.5 }, h));
    }
    summon(kind, n) {
      const adv = this.adv;
      for (let i = 0; i < n; i++) adv.spawnEnemy(kind, this.x - this.unit * 0.5, this.y - this.unit * U.rand(0.2, 1.4));
    }

    draw(ctx, t) {
      const u = this.unit;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.lean * 0.5);
      const sq = Math.sin(this.squash * Math.PI) * 0.06;
      ctx.scale(u * (1 + sq), u * (1 - sq));
      if (this.state === 'defeated') ctx.globalAlpha = Math.max(0, 1 - this.stT / 2.6);
      if (!OR.Assets.draw(ctx, 'bosses/' + this.id, 0, -1, 2.6, 2.6)) this.def.draw(ctx, this, t);
      ctx.restore();
      if (this.flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.flash * 5;
        const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, u * 1.2);
        g.addColorStop(0, 'rgba(255,255,255,0.8)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        A.ellipse(ctx, this.cx, this.cy, u * 1.2, u * 1.2);
        ctx.fill();
        ctx.restore();
      }
      if (this.stun > 0 && this.state === 'fight') {
        for (let i = 0; i < 3; i++) {
          const a = t * 5 + (i * Math.PI * 2) / 3;
          A.drawSparkle(ctx, this.cx + Math.cos(a) * u * 0.6, this.cy - u * 0.9 + Math.sin(a) * u * 0.15, u * 0.12, '#ffe066', a);
        }
      }
    }
  }

  OR.Boss = Boss;
})(window.OR);
