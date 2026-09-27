// ============================================================================
//  ADVENTURE MODE: the side-scrolling boss-rush layer on top of the cozy otter game.
//  Loop: explore (auto-collect + auto-fight) -> BOSS INCOMING -> tap-to-attack boss fight
//        -> victory + reward -> explore again, with the next, sillier boss.
//  The family can never lose: at zero health they get dizzy, then bounce back stronger.
// ============================================================================
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  const DEFAULT_STATE = () => ({
    res: { shell: 0, kelp: 0, metal: 0, refined: 0, pearl: 0, treasure: 0, food: 0 },
    up: {},
    rewards: {},
    defeated: 0,
    bossIndex: 0,
    dist: 0,
    ult: 0,
    meter: 0,
    kills: 0,
    bestCombo: 0,
    autoUpgrade: true,
  });

  class Adventure {
    constructor(game) {
      this.game = game;
      this.audio = game.audio;
      const saved = game.progress.state.adv;
      this.st = Object.assign(DEFAULT_STATE(), saved || {});
      this.st.res = Object.assign(DEFAULT_STATE().res, this.st.res);
      game.progress.state.adv = this.st;
      this.time = 0;
      this.mode = 'explore';
      this.modeT = 0;
      this.fx = new OR.AdvFX();
      this.proj = new OR.Projectiles();
      this.scroller = new OR.Scroller(this);
      this.squad = new OR.Squad(this);
      this.pickups = [];
      this.enemies = [];
      this.hazards = [];
      this.fxList = [];
      this.tweens = [];
      this.timers = [];
      this.effects = {};
      this.cd = {};
      this.mem = {};
      this.boss = null;
      this.combo = 0;
      this.lastTap = -9;
      this.tapTimes = [];
      this.determination = 0;
      this.shakeAmt = 0;
      this.flashC = null;
      this.bannerQ = null;
      this.finale = 0;
      this.highlight = null;
      this.spawnT = { pickup: 0.5, enemy: 3 };
      this.lastInput = -99;
      this.autoT = 0;
      this.refineT = 0;
      this.saveT = 0;
      this.refreshStats();
      OR.Assets.load();
      this.ui = new OR.AdvUI(this);
    }

    // ------------------------------------------------------------ layout / stats
    resize(W, H) {
      const portrait = W < H;
      const S = U.clamp(Math.min(W * (portrait ? 0.12 : 0.1), H * 0.1), 30, 84);
      const surface = Math.round(H * (W < H ? 0.53 : 0.58));
      this.G = { W, H, S, surface, floor: H - Math.max(24, H * 0.05), BU: Math.max(S * 1.15, Math.min(W, H) * (portrait ? 0.15 : 0.12)), portrait };
      this.squad.layout();
      if (this.boss) {
        this.boss.homeX = W * (portrait ? 0.78 : 0.74);
        this.boss.homeY = this.boss.def.homeY ? this.boss.def.homeY(this.G) : this.G.surface;
      }
    }

    refreshStats() {
      const formMult = this.effectActive('fluffForm') ? OR.BAL.abilities.fluffForm.mult : 1;
      this.stats = OR.computeStats(this.st, { determination: this.determination, formMult });
      this.squad.applyGear(this.st);
      this.unlocked = OR.unlockedAbilities(this.st);
    }

    cycleMult() {
      return Math.pow(1.6, Math.floor(this.st.bossIndex / OR.BOSSES.length));
    }
    nextBossDef() {
      return OR.BOSSES[this.st.bossIndex % OR.BOSSES.length];
    }
    meterNeed() {
      return OR.BAL.bossProgressBase * Math.pow(OR.BAL.bossProgressGrowth, Math.min(this.st.bossIndex, 10));
    }
    effectActive(id) {
      return (this.effects[id] || 0) > 0;
    }

    // ------------------------------------------------------------ small engine helpers
    after(fn, ms) {
      this.timers.push({ t: (ms || 0) / 1000, fn });
    }
    tween(dur, fn, done) {
      this.tweens.push({ dur, t: 0, fn, done });
    }
    addEffect(e) {
      e.t = 0;
      this.fxList.push(e);
      return e;
    }
    shake(n) {
      this.shakeAmt = Math.max(this.shakeAmt, n);
    }
    flash(color, a) {
      this.flashC = { color, a };
    }
    banner(text, color, dur) {
      this.bannerQ = { text, color: color || '#fff', t: 0, dur: dur || 1.4 };
    }
    addHazard(h) {
      Object.assign(h, { t: 0, triggered: false, activeTime: h.activeTime || 0.4 });
      this.hazards.push(h);
      return h;
    }
    spawnEnemy(kind, x, y) {
      const e = new OR.Enemy(this, kind, x, y);
      this.enemies.push(e);
      return e;
    }
    // Where attacks should aim: the boss, the nearest enemy, or just ahead.
    target() {
      const G = this.G;
      if (this.boss && this.boss.alive) return { x: this.boss.cx, y: this.boss.cy };
      let best = null;
      for (const e of this.enemies) if (!e.dead && e.x > this.squad.front().x && (!best || e.x < best.x)) best = e;
      if (best) return { x: best.x, y: best.y, enemy: best };
      return { x: G.W * 0.7, y: G.surface - G.S * 0.3 };
    }

    // ------------------------------------------------------------ enter / exit
    enter() {
      this.active = true;
      this.refreshStats();
      this.ui.show(true);
      this.last = null;
      if (this.mode === 'boss' && this.boss) this.audio.startGroove && this.audio.startGroove(132);
    }
    exit() {
      this.active = false;
      this.ui.show(false);
      this.audio.stopGroove && this.audio.stopGroove();
      this.save();
    }
    save() {
      this.game.progress.dirty = true;
      this.game.progress.save();
    }

    // ------------------------------------------------------------ main update
    update(dt) {
      const B = OR.BAL, G = this.G;
      this.time += dt;
      this.modeT += dt;
      // timers & tweens
      for (const tm of this.timers) {
        tm.t -= dt;
        if (tm.t <= 0) {
          tm.done = true;
          tm.fn();
        }
      }
      this.timers = this.timers.filter((t) => !t.done);
      for (const tw of this.tweens) {
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.fn(k);
        if (k >= 1) {
          tw.finished = true;
          if (tw.done) tw.done();
        }
      }
      this.tweens = this.tweens.filter((t) => !t.finished);
      for (const k in this.effects) this.effects[k] = Math.max(0, this.effects[k] - dt);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      for (const ab of OR.ABILITIES) if (ab.tick && this.effectActive(ab.id)) ab.tick(this, dt);
      if (this.formWas !== this.effectActive('fluffForm')) {
        this.formWas = this.effectActive('fluffForm');
        this.refreshStats();
      }
      this.shakeAmt *= Math.exp(-8 * dt);
      if (this.flashC) {
        this.flashC.a -= dt * 2;
        if (this.flashC.a <= 0) this.flashC = null;
      }
      if (this.bannerQ) {
        this.bannerQ.t += dt;
        if (this.bannerQ.t > this.bannerQ.dur) this.bannerQ = null;
      }
      if (this.time - this.lastTap > B.comboWindow) this.combo = 0;
      this.finale = Math.max(0, this.finale - dt);

      // scrolling
      const exploring = this.mode === 'explore';
      const targetSpeed = exploring ? B.scrollSpeed : this.mode === 'victory' ? B.scrollSpeed * 0.5 : 0;
      this.speed = U.damp(this.speed || 0, targetSpeed, 1.5, dt);
      this.st.dist += this.speed * dt;
      const scrollPx = this.speed * G.S;

      // passive economy
      if (this.stats.refineEvery && this.st.res.metal > 0) {
        this.refineT += dt;
        if (this.refineT >= this.stats.refineEvery) {
          this.refineT = 0;
          this.st.res.metal--;
          this.st.res.refined++;
        }
      }
      if (!this.squad.ko && this.mode !== 'boss') this.squad.hp = Math.min(1, this.squad.hp + (B.squadRegen / this.stats.maxHp) * dt * 3);
      this.st.ult = Math.min(100, this.st.ult + (this.mode === 'boss' ? B.ultPerSecond * this.stats.ultRate * dt : 0));

      if (exploring) this.updateExplore(dt, scrollPx);
      else if (this.mode === 'bossIntro' && this.modeT > 2.3) this.spawnBoss();
      else if (this.mode === 'victory' && this.modeT > 4.2) this.setMode('explore');

      for (const p of this.pickups) p.update(dt, scrollPx);
      this.pickups = this.pickups.filter((p) => !p.dead);
      for (const e of this.enemies) e.update(dt, scrollPx);
      this.enemies = this.enemies.filter((e) => !e.dead);
      if (this.boss) {
        if (this.finale <= 0) this.boss.update(dt);
        if (this.boss.state === 'defeated' && this.boss.stT > 3) this.boss = null;
      }
      this.updateHazards(dt);
      this.autoAttack(dt);
      this.enemyContact();
      this.proj.update(dt, (p) => this.projHit(p));
      this.squad.update(dt, this.time);
      this.fx.update(dt);
      for (const e of this.fxList) {
        e.t += dt;
        if (e.fire && !e.fired && e.t >= (e.at || 0)) {
          e.fired = true;
          e.fire();
        }
      }
      this.fxList = this.fxList.filter((e) => e.t < e.dur);

      this.autoPilot(dt);
      this.saveT += dt;
      if (this.saveT > 5) {
        this.saveT = 0;
        this.game.progress.dirty = true;
      }
      this.ui.update(dt);
    }

    // Idle helpers: buy upgrades automatically (toggle in the upgrade sheet), and let the family
    // cast their own abilities during a boss fight once the player has been idle for a bit.
    autoPilot(dt) {
      this.autoT -= dt;
      if (this.autoT > 0) return;
      this.autoT = 1;
      if (this.st.autoUpgrade && this.ui.el.sheet.hidden) {
        for (let n = 0; n < 5; n++) {
          const options = OR.UPGRADES.filter((u) => this.canBuy(u));
          if (!options.length) break;
          const price = (u) => Object.values(OR.upgradeCost(u, this.st.up[u.id] || 0)).reduce((s, v) => s + v, 0);
          options.sort((x, y) => price(x) - price(y));
          this.buyUpgrade(options[0].id, true);
        }
      }
      const idle = this.time - this.lastInput > OR.BAL.idleAutoCast;
      if (this.mode === 'boss' && idle && !this.squad.ko) {
        for (const ab of OR.ABILITIES) {
          if (ab.id === 'sunscreen' && this.highlight !== 'sunscreen') continue;
          if (this.useAbility(ab.id, true)) break;
        }
        if (this.st.ult >= 100) this.useFinale(true);
      }
    }

    setMode(m) {
      this.mode = m;
      this.modeT = 0;
      this.ui.modeChanged();
    }

    updateExplore(dt, scrollPx) {
      const B = OR.BAL, G = this.G, s = this.spawnT;
      s.pickup -= dt;
      s.enemy -= dt;
      if (s.pickup <= 0) {
        s.pickup = B.pickupEvery * U.rand(0.6, 1.4);
        if (this.pickups.length < B.maxPickups) {
          const w = {};
          for (const k in B.pickups) w[k] = B.pickups[k].weight;
          const type = U.weighted(w);
          const zone = U.pick(['surface', 'surface', 'under', 'air']);
          const y = zone === 'surface' ? G.surface - G.S * 0.35 : zone === 'under' ? G.surface + G.S * U.rand(0.6, 1.5) : G.surface - G.S * U.rand(1.1, 1.6);
          this.pickups.push(new OR.Pickup(this, type, G.W + G.S, y));
        }
      }
      if (s.enemy <= 0) {
        s.enemy = B.enemyEvery * U.rand(0.6, 1.4);
        if (this.enemies.length < B.maxEnemies) {
          const w = {};
          for (const k in OR.ENEMY_TYPES) w[k] = OR.ENEMY_TYPES[k].weight;
          const kind = U.weighted(w);
          const z = OR.ENEMY_TYPES[kind].zone;
          const y = z === 'surface' ? G.surface - G.S * 0.25 : z === 'under' ? G.surface + G.S * U.rand(0.7, 1.4) : G.surface - G.S * U.rand(1.3, 2);
          this.spawnEnemy(kind, G.W + G.S * 1.5, y);
        }
      }
      // otters reach out and grab nearby pickups
      for (const p of this.pickups) {
        if (p.flying) continue;
        for (const o of this.squad.otters) {
          if (!o.reach && Math.abs(p.x - o.x) < G.S * this.stats.magnet * 0.6 && Math.abs(p.y - o.y) < G.S * this.stats.magnet * 1.3) {
            o.reach = { x: p.x, y: p.y + o.u * 0.3, t: 0.35 };
            this.collect(p, o);
            break;
          }
        }
      }
      // progress toward the next boss
      this.st.meter += B.progressPerSecond * dt;
      if (this.st.meter >= this.meterNeed()) this.bossIncoming();
    }

    // ------------------------------------------------------------ loot
    grant(type, amount) {
      if (type === 'fish') type = 'food';
      this.st.res[type] = (this.st.res[type] || 0) + amount;
    }
    collect(p, o) {
      const B = OR.BAL;
      const def = B.pickups[p.type];
      p.flying = {
        k: 0, x0: p.x, y0: p.y,
        tx: () => (o ? o.x : this.G.W * 0.3), ty: () => (o ? o.y - o.u * 0.4 : 30),
        done: () => {
          if (p.type === 'chest') {
            for (const k in B.chestLoot) this.grant(k, Math.ceil(B.chestLoot[k] * this.stats.loot));
            this.fx.word(p.x, p.y - this.G.S, 'TREASURE!', '#ffd23f', 26);
            this.fx.burst('spark', p.x, p.y, 10, this.G.S * 3, '#ffe680', 8, 0.8);
            this.audio.chime && this.audio.chime();
          } else {
            const n = Math.max(1, Math.round(U.randInt(def.amount[0], def.amount[1]) * this.stats.loot));
            this.grant(p.type, n);
            if (p.type === 'fish') {
              this.squad.hp = Math.min(1, this.squad.hp + 0.1);
              this.st.ult = Math.min(100, this.st.ult + 2);
            }
            this.fx.num(p.x, p.y - this.G.S * 0.4, n, false, '#fffbe0');
            this.audio.bubble && this.audio.bubble();
          }
          this.st.meter += B.progressPerPickup;
        },
      };
    }

    enemyKilled(e) {
      const B = OR.BAL;
      this.st.kills++;
      this.st.meter += B.progressPerKill;
      this.fx.burst('dot', e.x, e.y, 8, this.G.S * 3, '#ffffff', 4, 0.5);
      this.fx.add('smoke', e.x, e.y, { color: 'rgba(255,255,255,0.6)', size: this.G.S * 0.4, life: 0.5 });
      this.audio.pop && this.audio.pop();
      for (const k in B.enemyLoot) {
        const p = new OR.Pickup(this, k, e.x + U.rand(-10, 10), e.y);
        this.pickups.push(p);
        this.collect(p, this.squad.randomOtter());
      }
    }

    // ------------------------------------------------------------ combat
    autoAttack(dt) {
      if (this.squad.ko || this.finale > 0 || this.mode === 'bossIntro' || this.mode === 'victory') return;
      const B = OR.BAL, G = this.G;
      const boss = this.boss && this.boss.state === 'fight' ? this.boss : null;
      for (const o of this.squad.otters) {
        o.attackT -= dt * (this.effectActive('fluffForm') ? 1.6 : 1);
        if (o.attackT > 0) continue;
        let tgt = null;
        if (boss) tgt = { x: boss.cx + U.rand(-0.4, 0.4) * boss.unit, y: boss.cy + U.rand(-0.4, 0.4) * boss.unit, boss: true };
        else {
          let best = null;
          for (const e of this.enemies) if (!e.dead && e.x > o.x && e.x < G.W * 0.98 && (!best || e.x < best.x)) best = e;
          if (best) tgt = { x: best.x, y: best.y, enemy: best };
        }
        if (!tgt) {
          o.attackT = 0.3;
          continue;
        }
        o.attackT = B.autoAttackEvery * U.rand(0.85, 1.15);
        this.throwShell(o, tgt, this.stats.autoDmg, 'auto', false);
      }
    }

    // An otter throws a shell (energy shell once upgraded) at a target.
    throwShell(o, tgt, dmg, src, crit, onArrive) {
      const [hx, hy] = o.hand;
      const time = src === 'tap' ? 0.16 : 0.32;
      o.throwT = 0.25;
      return this.proj.fire({
        from: 'otter', kind: this.st.up.energyShells ? 'energy' : 'shell', noCollide: true,
        x: hx, y: hy, vx: (tgt.x - hx) / time, vy: (tgt.y - hy) / time, life: time,
        size: this.G.S * (src === 'tap' ? 0.2 : 0.15), color: this.effectActive('fluffForm') ? 'rgba(255,220,90,0.85)' : null,
        onHit: (p) => {
          if (onArrive) return onArrive(p);
          if (tgt.enemy) {
            if (!tgt.enemy.dead) {
              tgt.enemy.hit(dmg);
              this.fx.num(p.x, p.y - 10, dmg, crit);
            }
          } else if (tgt.boss || this.boss) this.hitBoss(dmg, p.x, p.y, src, crit);
        },
      });
    }

    // Apply damage wherever it lands: the boss, or enemies in the blast radius.
    dealDamage(dmg, x, y, src, radius) {
      if (this.boss && this.boss.alive) {
        if (U.dist(x, y, this.boss.cx, this.boss.cy) < (radius || 0) + this.boss.unit * 1.4) this.hitBoss(dmg, x, y, src, false);
        return;
      }
      for (const e of this.enemies) {
        if (!e.dead && U.dist(x, y, e.x, e.y) < (radius || this.G.S)) {
          e.hit(dmg);
          this.fx.num(e.x, e.y - 10, dmg, false);
        }
      }
    }

    explode(x, y, dmg, opts) {
      const G = this.G;
      this.fx.ring(x, y, G.S * 3, '#fff6c0', 0.45);
      this.fx.ring(x, y, G.S * 2, '#9ad65a', 0.6);
      this.fx.burst('kelp', x, y, 14, G.S * 7, '#6f9a35', G.S * 0.18, 1.1);
      this.fx.burst('smoke', x, y, 5, G.S * 1.5, 'rgba(220,240,200,0.6)', G.S * 0.5, 0.7);
      this.fx.word(x, y - G.S * 1.2, U.pick(['KELPLOSION!', 'KA-BLOOM!', 'SPLORCH!', 'KELP YEAH!', 'FWOOMP!']), '#c8ff9a', 34);
      this.shake(12);
      this.flash('#f4ffe0', 0.25);
      this.audio.boom && this.audio.boom(0.9);
      this.dealDamage(dmg, x, y, (opts && opts.src) || 'ability', (opts && opts.radius) || G.S * 2);
    }

    hitBoss(amount, x, y, src, crit) {
      const b = this.boss;
      if (!b) return 0;
      const dealt = b.damage(amount, src);
      if (dealt > 0) {
        this.fx.num(x == null ? b.cx : x, (y == null ? b.cy : y) - 10, dealt, crit);
        this.fx.burst('spark', x == null ? b.cx : x, y == null ? b.cy : y, crit ? 5 : 2, this.G.S * 3, crit ? '#ffe680' : '#ffffff', crit ? 10 : 6, 0.4);
        this.st.ult = Math.min(100, this.st.ult + (dealt / b.maxHp) * 100 * OR.BAL.ultPerBossPct * this.stats.ultRate);
        if (src === 'tap' || src === 'ability') this.audio.hit && this.audio.hit(crit ? 1.4 : 1);
      }
      return dealt;
    }

    projHit(p) {
      if (p.from === 'boss') {
        const o = p.target;
        if (o && U.dist(p.x, p.y, o.x, o.y - o.u * 0.45) < o.u * 0.6) {
          p.hit = true;
          this.hurtSquad(p.dmg, o);
          this.fx.burst('dot', p.x, p.y, 5, this.G.S * 2.5, '#ffffff', 3, 0.4);
          return true;
        }
        return false;
      }
      return false; // otter shots resolve when they arrive (onHit)
    }

    enemyContact() {
      const G = this.G;
      for (const e of this.enemies) {
        if (e.dead) continue;
        for (const o of this.squad.otters) {
          if (Math.abs(e.x - o.x) < o.u * 0.55 && Math.abs(e.y - (o.y - o.u * 0.3)) < o.u * 0.9) {
            e.dead = true;
            this.hurtSquad(OR.BAL.enemyTouchDamage * this.cycleMult() * Math.pow(1.3, this.st.defeated), o);
            this.fx.add('smoke', e.x, e.y, { color: 'rgba(255,255,255,0.6)', size: G.S * 0.4, life: 0.5 });
            break;
          }
        }
      }
    }

    hurtSquad(dmg, o, opts) {
      const sq = this.squad;
      if (sq.ko || this.finale > 0) return;
      if (Math.random() < this.stats.block) {
        this.fx.word(o.x, o.y - o.u * 1.2, 'BLOCK!', '#bff4ff', 20);
        this.audio.clang && this.audio.clang();
        return;
      }
      let d = dmg * this.stats.dmgTaken;
      if (sq.protectT > 0) d *= opts && opts.sun ? 0 : 0.5;
      if (d <= 0) return;
      sq.hp -= d / this.stats.maxHp;
      o.hurtT = 0.5;
      sq.hitFlash = 0.2;
      this.fx.num(o.x, o.y - o.u * 1.1, d, false, '#ff8a8a');
      this.shake(4);
      this.st.ult = Math.min(100, this.st.ult + OR.BAL.ultPerHit * this.stats.ultRate);
      this.audio.ouch && this.audio.ouch(o.baby ? 1.4 : 1);
      if (sq.hp <= 0) this.knockout();
    }

    knockout() {
      const sq = this.squad;
      sq.hp = 0;
      sq.ko = true;
      sq.koT = OR.BAL.koTime;
      this.proj.clear('boss');
      this.hazards = [];
      this.banner('KNOCKED SILLY!', '#ffb347', 1.6);
      this.audio.ko && this.audio.ko();
      if (this.boss && this.boss.def.lines && this.boss.def.lines.taunt) this.boss.say(U.pick(this.boss.def.lines.taunt), 2);
      for (const o of sq.otters) o.say(U.pick(['@_@', 'ow…', 'so dizzy…', '✨', 'five more minutes']), 2.2);
    }

    recover() {
      const sq = this.squad;
      sq.ko = false;
      sq.hp = 1;
      if (this.mode === 'boss') {
        this.determination += OR.BAL.determinationPerKo;
        this.refreshStats();
        this.banner(`WE'RE BACK!! +${Math.round(this.determination * 100)}% DETERMINATION`, '#6ee07a', 1.8);
      } else this.banner('WE\'RE BACK!!', '#6ee07a', 1.2);
      const [cx, cy] = sq.centre();
      this.fx.ring(cx, cy, this.G.S * 4, '#6ee07a', 0.6);
      this.fx.burst('spark', cx, cy, 12, this.G.S * 5, '#ffffff', 8, 0.8);
      this.audio.chime && this.audio.chime();
      for (const o of sq.otters) o.say(U.pick(['WE\'RE BACK!', 'Round two!', 'Not done yet!', 'hehe']), 1.6);
    }

    updateHazards(dt) {
      for (const h of this.hazards) {
        h.t += dt;
        if (!h.triggered && h.t >= h.warn) {
          h.triggered = true;
          for (const o of this.squad.otters) {
            let hit = false;
            if (h.kind === 'band') hit = true;
            else if (h.kind === 'rect') hit = Math.abs(o.x - h.x) < h.w / 2 + o.u * 0.3;
            else hit = U.dist(o.x, o.y - o.u * 0.3, h.x, h.y) < h.r + o.u * 0.3;
            if (hit) this.hurtSquad(h.dmg, o, h.opts);
          }
          if (h.onTrigger) h.onTrigger(this, h);
        }
      }
      this.hazards = this.hazards.filter((h) => h.t < h.warn + h.activeTime);
    }

    // ------------------------------------------------------------ bosses
    bossIncoming() {
      const def = this.nextBossDef();
      this.setMode('bossIntro');
      this.banner('⚠️ BOSS INCOMING! ⚠️', '#ff5d6c', 2.2);
      this.flash('#ff5d6c', 0.35);
      this.audio.alarm && this.audio.alarm();
      if (!OR.Assets.play('audio/boss-' + def.id)) this.after(() => this.audio.bossSting && this.audio.bossSting(def.id), 900);
      // small fry scatter
      for (const e of this.enemies) {
        e.dead = true;
        this.fx.add('smoke', e.x, e.y, { color: 'rgba(255,255,255,0.5)', size: this.G.S * 0.4, life: 0.5 });
      }
    }

    spawnBoss() {
      const def = this.nextBossDef();
      const cycle = Math.floor(this.st.bossIndex / OR.BOSSES.length);
      this.boss = new OR.Boss(this, def, this.st.bossIndex % OR.BOSSES.length, cycle, this.st.bossIndex);
      this.determination = 0;
      this.refreshStats();
      this.squad.hp = 1;
      this.combo = 0;
      // anything still floating around gets scooped up before the fight
      for (const p of this.pickups) if (!p.flying) this.collect(p, this.squad.randomOtter());
      this.setMode('boss');
      this.audio.startGroove && this.audio.startGroove(132);
    }

    bossDefeated(b) {
      const B = OR.BAL, st = this.st;
      const reward = OR.REWARDS[b.def.reward];
      st.rewards[b.def.reward] = (st.rewards[b.def.reward] || 0) + 1;
      const mult = this.stats.loot * b.lootMult * (1 + b.cycle);
      const got = {};
      for (const k in B.bossRewardLoot) {
        got[k] = Math.ceil(B.bossRewardLoot[k] * mult * Math.pow(1.2, b.index));
        this.grant(k, got[k]);
      }
      st.defeated++;
      st.bossIndex++;
      st.meter = 0;
      this.determination = 0;
      this.effects = {};
      this.proj.clear();
      this.hazards = [];
      this.setMode('victory');
      this.banner('VICTORY!', '#ffd23f', 2.4);
      this.flash('#ffffff', 0.6);
      this.shake(18);
      this.fx.burst('spark', b.cx, b.cy, 20, this.G.S * 7, '#ffe680', 12, 1.2);
      this.audio.stopGroove && this.audio.stopGroove();
      this.audio.fanfare && this.audio.fanfare();
      this.refreshStats();
      this.ui.showReward(b, reward, got);
      for (const o of this.squad.otters) o.say(U.pick(['WE DID IT!', 'hehe!', '💕', 'too easy!', 'family power!']), 2.4);
      this.save();
    }

    // ------------------------------------------------------------ player actions
    tapAttack(x, y) {
      const B = OR.BAL, b = this.boss, sq = this.squad;
      this.lastInput = this.time;
      this.game.audio.init();
      if (sq.ko) {
        sq.koT = Math.max(0.1, sq.koT - B.koCheerCut);
        const [cx, cy] = sq.centre();
        this.fx.add('heart', cx + U.rand(-1, 1) * this.G.S, cy - this.G.S * 0.8, { vy: -60, size: 16, color: '#ff8fb1', life: 0.9 });
        return;
      }
      if (!b || b.state !== 'fight' || this.finale > 0) return;
      // swat an incoming projectile under the finger
      if (x != null) {
        let popped = false;
        this.proj.pool.each((p) => {
          if (!popped && p.from === 'boss' && U.dist(x, y, p.x, p.y) < this.G.S * 0.7) {
            p.active = false;
            popped = true;
            this.fx.word(p.x, p.y - 16, 'SWAT!', '#bff4ff', 20);
            this.fx.burst('spark', p.x, p.y, 4, this.G.S * 2, '#ffffff', 6, 0.4);
          }
        });
        if (popped) return;
        for (const e of this.enemies) {
          if (!e.dead && U.dist(x, y, e.x, e.y) < this.G.S * 0.8) {
            e.hit(this.stats.tapDmg * 2);
            this.fx.num(e.x, e.y - 10, this.stats.tapDmg * 2, false);
            return;
          }
        }
      }
      // combo & gentle anti-mashing
      this.combo = this.time - this.lastTap < B.comboWindow ? this.combo + 1 : 1;
      this.lastTap = this.time;
      this.st.bestCombo = Math.max(this.st.bestCombo, this.combo);
      this.tapTimes.push(this.time);
      while (this.tapTimes.length && this.time - this.tapTimes[0] > 1) this.tapTimes.shift();
      const rate = this.tapTimes.length;
      let dmg = this.stats.tapDmg * (1 + Math.min(B.comboMax, this.combo * B.comboStep));
      if (rate > B.tapSoftCap) dmg *= B.tapSoftCap / rate;
      const crit = Math.random() < this.stats.critChance;
      if (crit) dmg *= this.stats.critMult;
      let tgt = { x: b.cx + U.rand(-0.3, 0.3) * b.unit, y: b.cy + U.rand(-0.3, 0.3) * b.unit, real: true };
      if (b.def.tapTarget) tgt = b.def.tapTarget(b, x, y, this);
      else if (x != null && b.hitTest(x, y)) {
        tgt = { x, y, real: true };
        dmg *= 1.25; // direct hit bonus
      }
      const o = sq.randomOtter();
      this.throwShell(o, tgt, dmg, 'tap', crit, (p) => {
        if (tgt.clone) {
          if (!tgt.clone.popped) {
            tgt.clone.popped = true;
            this.fx.word(p.x, p.y - 20, 'Just a reflection…', '#c79bff', 20);
            this.fx.burst('smoke', p.x, p.y, 5, this.G.S * 2, 'rgba(90,60,140,0.5)', this.G.S * 0.4, 0.6);
          }
          return;
        }
        this.hitBoss(dmg, p.x, p.y, 'tap', crit);
        this.shake(crit ? 5 : 2);
      });
      this.audio.tap && this.audio.tap();
    }

    useAbility(id, auto) {
      if (!auto) this.lastInput = this.time;
      const ab = OR.ABILITIES.find((a) => a.id === id);
      if (!ab || !this.unlocked[id] && id !== 'sunscreen') return false;
      if ((this.cd[id] || 0) > 0 || this.squad.ko || this.finale > 0) return false;
      if (this.mode !== 'boss' && !ab.explore) return false;
      if (this.mode === 'boss' && (!this.boss || this.boss.state !== 'fight')) return false;
      this.game.audio.init();
      if (ab.use(this)) {
        this.cd[id] = ab.cd(this);
        // abilities also count as big "taps" for interrupt mechanics
        return true;
      }
      return false;
    }

    useFinale(auto) {
      if (!auto) this.lastInput = this.time;
      if (this.st.ult < 100 || !this.boss || this.boss.state !== 'fight' || this.squad.ko || this.finale > 0) return;
      this.game.audio.init();
      OR.fireFinale(this);
    }

    buyUpgrade(id, auto) {
      if (!auto) this.lastInput = this.time;
      const up = OR.UPGRADES.find((u) => u.id === id);
      if (!up || !this.canBuy(up)) return false;
      const lvl = this.st.up[id] || 0;
      const cost = OR.upgradeCost(up, lvl);
      for (const k in cost) this.st.res[k] -= cost[k];
      const stageBefore = OR.visualStage(this.st);
      this.st.up[id] = lvl + 1;
      this.refreshStats();
      const stageAfter = OR.visualStage(this.st);
      this.audio.chime && this.audio.chime();
      const [cx, cy] = this.squad.centre();
      this.fx.burst('spark', cx, cy, 10, this.G.S * 4, '#fff6c0', 8, 0.8);
      if (auto) {
        this.fx.word(cx, cy - this.G.S * 1.3, `${up.icon} ${up.name} ${this.st.up[id]}`, '#fff6c0', 18);
      }
      if (stageAfter > stageBefore) {
        this.banner(['', '', 'FLUFF & SHELLS!', 'ARMORED OTTERS!', 'METAL OTTERS!', 'AURA AWAKENED!', 'THESE OTTERS ARE WAY TOO POWERFUL'][stageAfter] || 'POWER UP!', '#ffd23f', 2);
        this.flash('#fff3b0', 0.4);
      }
      if (auto) this.game.progress.dirty = true;
      else this.save();
      return true;
    }

    canBuy(up) {
      if (up.needs) for (const k in up.needs) if ((this.st.up[k] || 0) < up.needs[k]) return false;
      const cost = OR.upgradeCost(up, this.st.up[up.id] || 0);
      for (const k in cost) if ((this.st.res[k] || 0) < cost[k]) return false;
      return true;
    }

    pointerDown(x, y) {
      const G = this.G;
      this.lastInput = this.time;
      this.game.audio.init();
      if (this.mode === 'boss') return this.tapAttack(x, y);
      // explore: grab a pickup, bonk an enemy, or just splash
      for (const p of this.pickups) {
        if (!p.flying && U.dist(x, y, p.x, p.y) < G.S * 0.9) {
          this.collect(p, null);
          this.fx.burst('spark', p.x, p.y, 4, G.S * 2, '#ffffff', 6, 0.4);
          return;
        }
      }
      for (const e of this.enemies) {
        if (!e.dead && U.dist(x, y, e.x, e.y) < G.S * 0.9) {
          const o = this.squad.randomOtter();
          this.throwShell(o, { x: e.x, y: e.y, enemy: e }, this.stats.tapDmg, 'tap', false);
          return;
        }
      }
      if (this.squad.ko) return this.tapAttack();
      this.fx.ring(x, y, G.S, 'rgba(255,255,255,0.7)', 0.5);
      // tapping an otter makes them chirp, like in the raft
      for (const o of this.squad.otters) {
        if (U.dist(x, y, o.x, o.y - o.u * 0.4) < o.u * 0.7) {
          o.say(U.pick(o.def.lines), 1.6);
          this.audio.squeak && this.audio.squeak(o.baby ? 1.35 : 1);
          this.fx.add('heart', o.x, o.y - o.u * 1.1, { vy: -50, size: 14, color: '#ff8fb1', life: 1 });
          return;
        }
      }
    }

    // ------------------------------------------------------------ drawing
    draw(ctx) {
      const G = this.G, t = this.time;
      ctx.save();
      if (this.shakeAmt > 0.3) ctx.translate(U.rand(-1, 1) * this.shakeAmt, U.rand(-1, 1) * this.shakeAmt);
      this.scroller.draw(ctx, t);
      // things under the surface
      for (const e of this.enemies) if (e.y > G.surface) e.draw(ctx, t);
      for (const p of this.pickups) if (p.y > G.surface && !p.flying) p.draw(ctx, t);
      if (this.boss) this.boss.draw(ctx, t);
      this.squad.draw(ctx, t);
      this.scroller.drawFront(ctx, t);
      // things above the water
      for (const e of this.enemies) if (e.y <= G.surface) e.draw(ctx, t);
      for (const p of this.pickups) if (p.y <= G.surface || p.flying) p.draw(ctx, t);
      if (this.boss && this.boss.def.drawOverlay) this.boss.def.drawOverlay(ctx, this.boss, t, this);
      this.drawHazards(ctx, t);
      this.proj.draw(ctx, t);
      for (const e of this.fxList) e.draw && e.draw(ctx, Math.min(1, e.t / e.dur), t);
      this.fx.draw(ctx);
      this.squad.drawOverlay(ctx, t);
      if (this.boss && this.boss.speech) this.drawBubble(ctx, this.boss.cx, this.boss.y - this.boss.unit * 2.4, this.boss.speech, true);
      ctx.restore();
      if (this.flashC) {
        ctx.globalAlpha = Math.max(0, this.flashC.a);
        ctx.fillStyle = this.flashC.color;
        ctx.fillRect(0, 0, G.W, G.H);
        ctx.globalAlpha = 1;
      }
      this.drawCombo(ctx);
      this.drawBanner(ctx);
      if (this.boss && this.boss.state === 'intro') this.drawNameCard(ctx, this.boss);
    }

    drawHazards(ctx, t) {
      const G = this.G;
      for (const h of this.hazards) {
        if (!h.triggered) {
          const k = h.t / h.warn, pulse = 0.35 + 0.25 * Math.sin(h.t * 18);
          if (h.drawWarn) h.drawWarn(ctx, h, k);
          else if (h.kind === 'rect') {
            ctx.fillStyle = `rgba(255,60,60,${pulse * 0.5})`;
            ctx.fillRect(h.x - h.w / 2, 0, h.w, G.surface + G.S * 0.4);
          } else if (h.kind === 'circle') {
            ctx.strokeStyle = `rgba(255,60,60,${0.5 + pulse})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            A.ellipse(ctx, h.x, h.y, h.r, h.r * 0.55);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = `rgba(255,60,60,${pulse * 0.35})`;
            A.ellipse(ctx, h.x, h.y, h.r * k, h.r * 0.55 * k);
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(255,60,60,${pulse * 0.3})`;
            ctx.fillRect(0, G.surface - G.S * 1.4, G.W, G.S * 2);
          }
          if (h.label) {
            ctx.font = `900 ${Math.round(U.clamp(G.S * 0.35, 14, 24))}px "Baloo 2", Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(60,0,0,0.7)';
            ctx.fillStyle = '#fff';
            const lx = h.kind === 'band' ? G.W * 0.35 : h.x, ly = h.kind === 'band' ? G.surface - G.S * 1.6 : (h.y || G.surface) - G.S * 1.4;
            ctx.strokeText(h.label, lx, ly);
            ctx.fillText(h.label, lx, ly);
          }
        } else {
          const k = (h.t - h.warn) / h.activeTime;
          if (h.drawActive) h.drawActive(ctx, h, Math.min(1, k));
          else {
            ctx.fillStyle = `rgba(255,240,200,${0.6 * (1 - k)})`;
            if (h.kind === 'rect') ctx.fillRect(h.x - h.w / 2, 0, h.w, G.surface + G.S * 0.4);
            else if (h.kind === 'circle') {
              A.ellipse(ctx, h.x, h.y, h.r, h.r * 0.55);
              ctx.fill();
            } else ctx.fillRect(0, G.surface - G.S * 1.4, G.W, G.S * 2);
          }
        }
      }
    }

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    drawBubble(ctx, x, y, sp, boss) {
      const G = this.G;
      const fs = Math.round(U.clamp(G.S * 0.28, 13, boss ? 20 : 17));
      ctx.font = `800 ${fs}px "Baloo 2", Nunito, sans-serif`;
      const w = Math.min(G.W * 0.6, ctx.measureText(sp.text).width + fs * 1.2), h = fs * 1.7;
      const bx = U.clamp(x, w / 2 + 6, G.W - w / 2 - 6);
      const pop = U.easeOutBack(Math.min(1, sp.t / 0.25));
      const fade = sp.t > sp.dur - 0.3 ? Math.max(0, (sp.dur - sp.t) / 0.3) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.translate(-x, -y);
      ctx.fillStyle = boss ? '#2a1d3a' : '#fffdf8';
      this.roundRect(ctx, bx - w / 2, y - h, w, h, h / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 1);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x + 6, y - 1);
      ctx.fill();
      ctx.fillStyle = boss ? '#fff' : '#4a3040';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.text, bx, y - h / 2 + 1, w - fs * 0.6);
      ctx.restore();
    }

    drawCombo(ctx) {
      if (this.mode !== 'boss' || this.combo < 3) return;
      const G = this.G;
      const k = 1 - Math.min(1, (this.time - this.lastTap) / OR.BAL.comboWindow);
      const size = Math.round(U.clamp(G.S * 0.45, 18, 34) * (1 + Math.min(0.5, this.combo / 60)));
      ctx.save();
      ctx.globalAlpha = 0.4 + k * 0.6;
      ctx.font = `900 ${size}px "Baloo 2", Nunito, sans-serif`;
      ctx.textAlign = 'left';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30,20,50,0.8)';
      const bonus = Math.round(Math.min(OR.BAL.comboMax, this.combo * OR.BAL.comboStep) * 100);
      const txt = `${this.combo} COMBO  +${bonus}%`;
      const x = G.S * 0.4, y = G.surface - G.S * 2.2;
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = this.combo >= 25 ? '#ff7ac8' : this.combo >= 10 ? '#ffd23f' : '#ffffff';
      ctx.fillText(txt, x, y);
      ctx.restore();
    }

    drawBanner(ctx) {
      const b = this.bannerQ;
      if (!b) return;
      const G = this.G;
      const k = b.t / b.dur;
      const pop = U.easeOutBack(Math.min(1, b.t / 0.3));
      const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
      const size = Math.round(U.clamp(Math.min(G.W / (b.text.length * 0.62), G.S * 0.8), 18, 56));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(G.W / 2, G.surface * 0.62);
      ctx.scale(pop, pop);
      ctx.font = `900 ${size}px "Baloo 2", Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(5, size * 0.2);
      ctx.strokeStyle = 'rgba(30,15,45,0.9)';
      ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }

    drawNameCard(ctx, b) {
      const G = this.G;
      const k = U.clamp(b.stT / 0.4, 0, 1) * U.clamp((2.4 - b.stT) / 0.4, 0, 1);
      if (k <= 0) return;
      const h = Math.max(92, G.S * 1.7);
      const y = G.H * 0.3;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(20,10,35,0.82)';
      ctx.fillRect(0, y - h / 2, G.W, h);
      ctx.fillStyle = b.def.color;
      ctx.fillRect(0, y - h / 2, G.W, 5);
      ctx.fillRect(0, y + h / 2 - 5, G.W, 5);
      const slide = (1 - U.easeOutBack(Math.min(1, b.stT / 0.5))) * G.W * 0.3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd23f';
      ctx.font = `800 ${Math.round(U.clamp(G.S * 0.25, 12, 18))}px "Baloo 2", Nunito, sans-serif`;
      const loop = b.cycle > 0 ? `  ·  LOOP ${b.cycle + 1}` : '';
      ctx.fillText(`BOSS ${b.index + 1} of ${OR.BOSSES.length}${loop}`, G.W / 2 - slide, y - h * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(U.clamp(G.S * 0.75, 28, 60))}px "Baloo 2", Nunito, sans-serif`;
      ctx.fillText(b.name.toUpperCase(), G.W / 2 + slide, y + h * 0.02);
      ctx.fillStyle = '#d9c9ff';
      ctx.font = `700 ${Math.round(U.clamp(G.S * 0.26, 12, 19))}px "Baloo 2", Nunito, sans-serif`;
      const mods = b.mods.length ? '  ·  ' + b.mods.map((m) => m.icon + ' ' + m.name).join('  ') : '';
      ctx.fillText(b.def.title + mods, G.W / 2 - slide, y + h * 0.32);
      ctx.restore();
    }
  }

  OR.Adventure = Adventure;
})(window.OR);
