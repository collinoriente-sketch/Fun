// ============================================================================
//  STORY: the storm opening, the rescue reunions after each boss, and the ending.
//  Collin starts alone; each of the first four bosses guards one missing family member
//  (OR.RESCUE_ORDER in squad.js). After the first Tsimboig, the whole family is home.
// ============================================================================
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  class Story {
    constructor(adv) {
      this.adv = adv;
      this.scene = null; // 'intro' | 'rescue' | 'ending'
      this.t = 0;
      this.caption = null;
      this.storm = 0;
      this.beats = {};
    }

    get G() { return this.adv.G; }

    // Run each timeline step once, when its time comes.
    beat(key, at, fn) {
      if (this.t >= at && !this.beats[key]) {
        this.beats[key] = true;
        fn();
      }
    }
    captionOn(text, dur) {
      this.caption = { text, t: 0, dur };
    }

    // ------------------------------------------------------------ opening
    startIntro() {
      const adv = this.adv, G = this.G;
      this.scene = 'intro';
      this.t = 0;
      this.beats = {};
      this.storm = 1;
      adv.rough = 1;
      adv.pickups = [];
      adv.enemies = [];
      adv.setMode('intro');
      const c = adv.squad.byId.collin;
      c.placed = true;
      c.x = G.W * (G.portrait ? 0.4 : 0.36);
      c.by = c.homeY;
      // asleep on his back, tossed by the leftover waves
      c.cine = { x: c.x, y: c.homeY + G.S * 0.1, speed: 2, pose: { lean: -1.35, eo: 0, kick: 0, alx: -0.14, aly: 0.05, arx: 0.14, ary: 0.05, blush: 0.2 } };
    }

    endIntro() {
      const adv = this.adv, c = adv.squad.byId.collin;
      if (c) c.cine = null;
      this.scene = null;
      this.caption = null;
      this.storm = 0;
      adv.rough = 0;
      adv.st.introSeen = true;
      adv.save();
      adv.setMode('explore');
      adv.banner('Find the family!', '#ffd23f', 2);
    }

    updateIntro(dt) {
      const adv = this.adv, G = this.G, c = adv.squad.byId.collin;
      if (!c) return this.endIntro();
      const cp = c.cine.pose;
      this.storm = Math.max(0, 1 - this.t / 3.2);
      adv.rough = Math.max(0, 1 - this.t / 7);
      this.beat('thunder', 0.6, () => {
        adv.flash('#ffffff', 0.45);
        adv.audio.boom && adv.audio.boom(0.4);
      });
      this.beat('wake', 2.6, () => {
        Object.assign(cp, { eo: 1, lean: -0.6, oh: 0.4 });
        c.say('…?', 1.3);
      });
      this.beat('sit', 3.2, () => Object.assign(cp, { lean: 0, oh: 0, kick: 0.3 }));
      this.beat('lookL', 3.8, () => {
        Object.assign(cp, { lookX: -1, tilt: -0.22 });
        c.say('Natalie?', 1.3);
        adv.audio.squeak && adv.audio.squeak(0.95);
      });
      this.beat('lookR', 5.2, () => {
        Object.assign(cp, { lookX: 1, tilt: 0.22 });
        c.say('Kids…?', 1.3);
        adv.audio.squeak && adv.audio.squeak(0.9, 'soft');
      });
      this.beat('alone', 6.6, () => {
        Object.assign(cp, { lookX: 0, lookY: 0.3, tilt: 0, oh: 1, blush: 0 });
        c.say('…', 1.4);
      });
      this.beat('cap1', 7.6, () => this.captionOn('The storm scattered his family across the ocean.', 3.2));
      this.beat('cap2', 11, () => {
        this.captionOn('Collin has to find them.', 3);
        Object.assign(cp, { oh: 0, lookX: 0.8, lookY: 0, lean: 0.2, kick: 1 });
      });
      this.beat('resolve', 11.8, () => c.say('I\'m coming, everyone!', 2));
      if (this.t > 14.2) this.endIntro();
    }

    // ------------------------------------------------------------ rescue after a boss
    startRescue(id) {
      this.scene = 'rescue';
      this.rescueId = id;
      this.t = 0;
      this.beats = {};
      this.newbie = null;
    }

    updateRescue(dt) {
      const adv = this.adv, G = this.G, S = G.S, c = adv.squad.byId.collin;
      const def = OR.FAMILY.find((d) => d.id === this.rescueId);
      const x0 = G.W * (G.portrait ? 0.72 : 0.66);
      this.beat('notice', 1.6, () => {
        c.cine = { x: c.homeX + S * 0.3, y: c.homeY, speed: 3, pose: { lookX: 1, oh: 0.6, eo: 1 } };
        c.say('!', 1.2);
        adv.audio.squeak && adv.audio.squeak(1.1);
      });
      if (this.t > 1.6 && this.t < 2.4 && U.chance(dt * 12)) adv.fx.add('ring', x0 + U.rand(-0.3, 0.3) * S, G.surface, { size: S * 0.4, color: 'rgba(255,255,255,0.8)', life: 0.5 });
      this.beat('emerge', 2.4, () => {
        const n = adv.squad.addMember(this.rescueId, { x: x0, y: G.surface + S * 1.2 });
        this.newbie = n;
        n.cine = { x: x0, y: n.homeY, speed: 4, pose: { eo: 0, lean: -0.2, lookX: -0.5, kick: 0.2 } };
        adv.fx.ring(x0, G.surface, S * 1.6, '#ffffff', 0.6);
        adv.fx.burst('dot', x0, G.surface, 10, S * 3, '#e8f8ff', 3, 0.7);
        adv.audio.splash && adv.audio.splash(0.6);
        n.say('…?', 1.2);
      });
      const n = this.newbie;
      this.beat('recognise', 3.4, () => {
        Object.assign(n.cine.pose, { eo: 1, oh: 1, lookX: -1, lean: 0 });
        n.say('COLLIN?!', 1.4);
        c.say(def.name.toUpperCase() + '!!', 1.4);
        adv.audio.squeak && adv.audio.squeak(n.baby ? 1.4 : 1.1);
      });
      this.beat('swim', 4.2, () => {
        const mid = (c.x + x0) / 2;
        c.cine = { x: mid - S * 0.42, y: c.homeY, speed: 2.6, pose: { lookX: 1, happy: 1, eo: 0, kick: 1, blush: 1 } };
        n.cine = { x: mid + S * 0.42, y: n.homeY, speed: 2.6, pose: { lookX: -1, happy: 1, eo: 0, kick: 1, blush: 1 } };
      });
      this.beat('hug', 5.3, () => {
        Object.assign(c.cine.pose, { arx: 0.6, ary: -0.3, alx: 0.1, aly: -0.1, lean: 0.25, kick: 0.5 });
        Object.assign(n.cine.pose, { alx: -0.6, aly: -0.3, arx: -0.1, ary: -0.1, lean: -0.25, kick: 0.5 });
        const hx = (c.x + n.x) / 2, hy = c.y - c.u * 1.1;
        for (let i = 0; i < 6; i++) adv.fx.add('heart', hx + U.rand(-1, 1) * S * 0.5, hy, { vy: -U.rand(40, 80), vx: U.rand(-20, 20), size: U.rand(12, 20), color: U.pick(['#ff6f9c', '#ff8fb1', '#ffa3c2']), life: 1.6 });
        adv.banner(def.name.toUpperCase() + ' JOINED THE FAMILY!', '#ff8fb1', 2.6);
        adv.audio.chime && adv.audio.chime();
        n.say('💕', 1.8);
      });
      this.beat('settle', 7.4, () => {
        c.cine = null;
        n.cine = null;
        adv.st.family = adv.squad.otters.map((o) => o.id);
        adv.save();
        adv.ui.showReward(adv.lastBoss.b, adv.lastBoss.reward, adv.lastBoss.got, def.name);
      });
      if (this.t > 8) this.scene = null;
    }

    // ------------------------------------------------------------ ending
    startEnding() {
      const adv = this.adv;
      this.scene = 'ending';
      this.t = 0;
      this.beats = {};
      adv.pickups = [];
      adv.enemies = [];
      adv.scroller.forceBiome = 'kelp';
      adv.setMode('ending');
    }

    updateEnding(dt) {
      const adv = this.adv, sq = adv.squad, G = this.G;
      this.beat('gather', 0.3, () => {
        sq.tight = true;
        sq.layout();
      });
      // everyone holds paws with the otter beside them
      if (this.t > 1.2) {
        // gather in the middle of the screen
        const shift = G.W / 2 - (sq.otters[0].homeX + sq.front().homeX) / 2;
        sq.otters.forEach((o, i) => {
          const pose = { happy: 1, eo: 0, blush: 1, kick: 0.2, lookX: 0 };
          if (i > 0) Object.assign(pose, { alx: -0.58, aly: -0.02 });
          if (i < sq.otters.length - 1) Object.assign(pose, { arx: 0.58, ary: -0.02 });
          o.cine = { x: o.homeX + shift, y: o.homeY, speed: 1.5, pose };
        });
        if (U.chance(dt * 2.5)) {
          const [cx, cy] = sq.centre();
          adv.fx.add('heart', cx + U.rand(-1, 1) * G.S * 1.5, cy - G.S * 0.6, { vy: -50, size: U.rand(12, 18), color: '#ff8fb1', life: 1.8 });
        }
      }
      this.beat('cap1', 1.2, () => this.captionOn('After a long journey…', 3.2));
      this.beat('cap2', 4.6, () => this.captionOn('…the whole family is together again.', 3.6));
      this.beat('cap3', 8.4, () => {
        this.captionOn('Home, in the kelp. 💕', 3.6);
        adv.audio.fanfare && adv.audio.fanfare();
        for (const o of sq.otters) o.say(U.pick(['💕', 'home!', 'together!', 'hehe', '🥰']), 2.4);
      });
      this.beat('choice', 12.2, () => adv.ui.showEndingChoice());
    }

    finishEnding(choice) {
      const adv = this.adv, sq = adv.squad, game = adv.game;
      adv.st.endingSeen = true;
      this.scene = null;
      this.caption = null;
      adv.scroller.forceBiome = null;
      sq.tight = false;
      for (const o of sq.otters) o.cine = null;
      sq.layout();
      adv.setMode('explore');
      adv.save();
      if (choice === 'raft') {
        game.setView('raft');
        // make sure there's kelp at home to snuggle into
        if (!game.progress.has('kelp')) {
          game.progress.state.unlocked.push('kelp');
          game.applyUnlock('kelp', true);
        }
        game.setMode('nap', 60);
        game.ui.toast('Home at last. The whole family, together. 💕', '🏝️');
      } else adv.banner('The adventure continues… bosses return stronger!', '#ffd23f', 2.4);
    }

    // ------------------------------------------------------------ per frame
    update(dt) {
      if (this.caption) {
        this.caption.t += dt;
        if (this.caption.t > this.caption.dur) this.caption = null;
      }
      if (!this.scene) return;
      this.t += dt;
      if (this.scene === 'intro') this.updateIntro(dt);
      else if (this.scene === 'rescue') this.updateRescue(dt);
      else if (this.scene === 'ending') this.updateEnding(dt);
    }

    // storm clouds and rain, drawn over the scenery but under the otters
    drawWeather(ctx, t) {
      const G = this.G, k = this.storm;
      if (k <= 0.01) return;
      ctx.fillStyle = `rgba(35,40,70,${0.55 * k})`;
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.fillStyle = `rgba(70,75,105,${0.9 * k})`;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 0.23 + t * 0.02 + (1 - k) * 0.6) % 1.3) * G.W - G.W * 0.15, y = G.surface * (0.12 + (i % 3) * 0.12);
        const r = G.S * (1.4 + (i % 2) * 0.6);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.arc(x + r * 0.9, y + r * 0.2, r * 0.8, 0, TAU);
        ctx.arc(x - r * 0.9, y + r * 0.25, r * 0.7, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(210,225,255,${0.45 * k})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        const x = (i * 97 + t * 700) % G.W, y = (i * 53 + t * 1300) % G.H;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 16);
      }
      ctx.stroke();
    }

    drawCaption(ctx) {
      const c = this.caption;
      if (!c) return;
      const G = this.G;
      const fade = Math.min(1, c.t / 0.6) * Math.min(1, (c.dur - c.t) / 0.6);
      const size = Math.round(U.clamp(Math.min(G.W / (c.text.length * 0.55), G.S * 0.5), 16, 34));
      const y = G.surface * 0.42;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      const g = ctx.createLinearGradient(0, y - size * 1.6, 0, y + size * 1.6);
      g.addColorStop(0, 'rgba(20,15,40,0)');
      g.addColorStop(0.5, 'rgba(20,15,40,0.55)');
      g.addColorStop(1, 'rgba(20,15,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - size * 1.6, G.W, size * 3.2);
      ctx.font = `800 ${size}px "Baloo 2", Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fffaf0';
      ctx.fillText(c.text, G.W / 2, y, G.W - 32);
      ctx.restore();
    }
  }

  OR.Story = Story;
})(window.OR);
