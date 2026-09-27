// The game: owns the world, runs the loop, handles input, paw-holding links, raft modes and events.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;
  const FONT = '"Baloo 2", Nunito, "Trebuchet MS", system-ui, sans-serif';
  const ITEM_ICON = { rock: '🪨', shell: '🐚', pearl: '✨' };
  const ITEM_KEY = { rock: 'rocks', shell: 'shells', pearl: 'pearls' };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.progress = new OR.Progress();
      this.audio = new OR.Audio(this.progress.state.muted);
      this.happiness = U.clamp(this.progress.state.happiness || 70, 40, 100);
      this.time = 0;
      this.pointer = { x: -999, y: -999, inside: false, moved: -99, down: null };
      this.attention = null;
      this.current = [0, 0];
      this.fx = new OR.FX(this);
      this.scene = new OR.Scene(this);
      this.fish = [];
      this.bubbles = [];
      this.items = [];
      this.lanterns = [];
      this.decor = { kelp: [], log: null, buoy: null };
      this.mode = null;
      this.event = null;
      this.eventT = U.rand(18, 30);
      this.lastEvent = null;
      this.linkCd = {};
      this.momentCd = {};
      this.raftCd = 0;
      this.passiveT = U.rand(15, 25);
      this.spawnT = { fish: 1, bubble: 2, item: 3, lantern: 4, leap: 15 };
      this.otters = [];
      this.byId = {};

      this.resize();
      const G = this.G;
      OR.FAMILY.forEach((def, i) => {
        const a = (i / OR.FAMILY.length) * TAU + U.rand(-0.3, 0.3);
        const o = new OR.Otter(def, this, G.W / 2 + Math.cos(a) * G.S * 2.2, (G.top + G.bottom) / 2 + Math.sin(a) * G.S * 1.2);
        this.otters.push(o);
        this.byId[def.id] = o;
      });
      for (const id of this.progress.state.unlocked) this.applyUnlock(id, true);
      for (let i = 0; i < 2; i++) this.spawnItem();
      this.fish.push(new OR.Fish(this));

      this.ui = new OR.UI(this);
      this.bindInput();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('pagehide', () => this.save());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.save();
      });

      const first = this.progress.state.visits <= 1;
      setTimeout(() => this.ui.toast(first ? 'Meet the family! Tap an otter to say hi.' : 'Welcome back! The family missed you.', '🦦'), 900);
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
    }

    // ------------------------------------------------------------ layout
    resize() {
      const c = this.canvas;
      const W = c.clientWidth || window.innerWidth, H = c.clientHeight || window.innerHeight;
      this.dpr = Math.min(this.maxDpr || 2, window.devicePixelRatio || 1);
      c.width = Math.round(W * this.dpr);
      c.height = Math.round(H * this.dpr);
      const S = U.clamp(Math.min(W * (W < 520 ? 0.135 : 0.125), H * 0.12), 38, 100);
      const horizon = Math.round(H * (W < H ? 0.2 : 0.23));
      const bottomUI = W < 640 ? 112 : 92;
      const top = horizon + S * 1.15;
      let bottom = H - bottomUI - S * 0.55;
      if (bottom - top < S * 3) bottom = top + S * 3;
      const old = this.G;
      this.G = {
        W, H, S, horizon, top, bottom, left: S * 0.75, right: W - S * 0.75,
        depth: (y) => U.lerp(0.84, 1.06, U.invLerp(top, bottom, y)),
      };
      if (old && this.otters && (old.W !== W || old.H !== H)) {
        for (const o of this.otters) {
          o.x = U.lerp(this.G.left, this.G.right, U.invLerp(old.left, old.right, o.x));
          o.y = U.lerp(this.G.top, this.G.bottom, U.invLerp(old.top, old.bottom, o.y));
        }
        this.items = [];
        this.bubbles = [];
        this.fish = [];
        if (this.mode) this.computeSlots();
      }
      this.scene.rebuild();
    }

    // ------------------------------------------------------------ loop
    frame(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
      this.last = now;
      this.time += dt;
      const t0 = performance.now();
      try {
        this.update(dt);
        this.draw();
      } catch (e) {
        console.error(e);
      }
      this.adaptQuality(performance.now() - t0);
      requestAnimationFrame((t) => this.frame(t));
    }

    // Slow device? Render at a lower pixel density rather than burn CPU.
    adaptQuality(ms) {
      this.cost = this.cost == null ? ms : this.cost * 0.97 + ms * 0.03;
      if (this.cost > 14 && this.dpr > 1 && this.time - (this.adaptedAt || 0) > 3) {
        this.maxDpr = Math.max(1, this.dpr - 0.5);
        this.adaptedAt = this.time;
        this.cost = 8;
        this.resize();
      }
    }

    update(dt) {
      const t = this.time, G = this.G;
      const ca = t * 0.025;
      this.current = [Math.cos(ca) * G.S * 0.07, Math.sin(ca * 1.3) * G.S * 0.03];

      this.scene.update(dt);
      this.spawn(dt);
      for (const f of this.fish) f.update(dt, t);
      for (const b of this.bubbles) b.update(dt);
      for (const it of this.items) it.update(dt);
      for (const l of this.lanterns) l.update(dt);
      if (this.decor.buoy) this.decor.buoy.update(dt);
      this.fish = this.fish.filter((f) => !f.dead);
      this.items = this.items.filter((i) => !i.dead);
      this.lanterns = this.lanterns.filter((l) => !l.dead);

      this.updateMode(dt);
      this.updateEvent(dt);
      this.updatePointerHold();
      for (const o of this.otters) o.update(dt, t);
      this.updateLinks(dt);
      this.separate(dt);
      this.fx.update(dt);

      // mood settles gently; there is no way to make the family sad
      this.happiness = U.clamp(this.happiness + (74 - this.happiness) * 0.012 * dt, 0, 100);
      this.passiveT -= dt;
      if (this.passiveT <= 0) {
        this.passiveT = U.rand(22, 38) * (this.happiness > 85 ? 0.7 : 1);
        const o = U.pick(this.otters.filter((o) => o.q.sub < 0.3));
        if (o) this.addHearts(1, o.x, o.y - o.u * 1.1);
      }
      this.raftCd = Math.max(0, this.raftCd - dt);
      this.progress.state.happiness = Math.round(this.happiness);
      this.progress.tick(dt);
      this.uiT = (this.uiT || 0) - dt;
      if (this.uiT <= 0) {
        this.uiT = 0.2;
        this.ui.update();
      }
    }

    spawn(dt) {
      const s = this.spawnT, G = this.G, P = this.progress;
      for (const k in s) s[k] -= dt;
      const fishMax = 2 + (P.has('forest') ? 1 : 0);
      if (s.fish <= 0) {
        s.fish = U.rand(4, 9);
        if (this.fish.length < fishMax) this.fish.push(new OR.Fish(this));
      }
      if (s.bubble <= 0) {
        s.bubble = U.rand(4, 9);
        if (this.bubbles.length < 4) {
          this.bubbles.push(new OR.Bubble(this));
          this.audio.bubble();
        }
      }
      if (s.item <= 0) {
        s.item = U.rand(9, 16);
        if (this.items.length < 3) this.spawnItem();
      }
      if (s.lantern <= 0) {
        s.lantern = U.rand(12, 26);
        if (P.has('lanterns') && this.lanterns.length < 3) this.lanterns.push(new OR.Lantern(this));
      }
      if (s.leap <= 0) {
        s.leap = U.rand(18, 35);
        const f = this.fish.find((f) => !f.jump && f.x > G.S && f.x < G.W - G.S);
        if (f) f.leap();
      }
    }

    // ------------------------------------------------------------ world helpers
    spawnItem(type, x, y) {
      const it = new OR.DiveSpot(this, type || this.randomFindType(), x, y);
      this.items.push(it);
      return it;
    }
    spawnFish() {
      const f = new OR.Fish(this);
      this.fish.push(f);
      return f;
    }
    randomFindType(o) {
      const r = Math.random();
      if (r > 0.94) return 'pearl';
      if (this.progress.has('shells') && r < (o && o.id === 'collin' ? 0.15 : 0.4)) return 'shell';
      return 'rock';
    }
    bestItemFor(o) {
      let best = null, bs = Infinity;
      for (const it of this.items) {
        const s = U.dist(o.x, o.y, it.x, it.y) / (o.def.loves === it.type ? 2 : 1);
        if (s < bs) { bs = s; best = it; }
      }
      return best;
    }
    kelpNear(x, y) {
      return this.decor.kelp.some((k) => {
        const [kx, ky] = k.pos, R = k.radius;
        return Math.pow((x - kx) / (R * 1.2), 2) + Math.pow((y - ky) / (R * 0.8), 2) < 1;
      });
    }
    popBubble(b, quiet) {
      if (b.dead) return;
      b.dead = true;
      this.bubbles = this.bubbles.filter((x) => x !== b);
      if (!quiet) {
        this.audio.pop();
        this.fx.sparkle(b.x, b.y, 3, b.r * 0.6);
      }
      this.fx.ripple(b.x, b.y, b.r * 2);
    }

    collect(o, item) {
      if (!item.free) {
        item.dead = true;
        this.items = this.items.filter((i) => i !== item);
      }
      const type = item.type;
      o.give(type, type === 'rock' && o.id === 'collin' ? U.rand(30, 60) : U.rand(8, 16));
      this.progress.add(ITEM_KEY[type], 1);
      this.fx.text(o.x, o.y - o.u * 1.35, `+1 ${ITEM_ICON[type]}`);
      this.happiness = Math.min(100, this.happiness + 1);
      if (o.id === 'collin' && type === 'rock' && U.chance(0.6)) o.say(U.pick(['Found a good rock!', 'Ooh, smooth one!', '🪨']), 2);
      else if (type === 'pearl') o.say(U.pick(['shiny!', 'ooooh ✨', '✨']), 2);
      else if (U.chance(0.3)) o.say(ITEM_ICON[type], 1.6);
      if (o.id === 'collin' && type === 'rock' && !o.scripted && U.chance(0.7)) o.next = ['rockplay'];
      this.checkUnlocks();
    }

    dispatchFetch(item) {
      let best = null, bs = Infinity;
      for (const o of this.otters) {
        if (!this.isFree(o) || o.actionName === 'dive' || o.actionName === 'fetch' || o.sleeping) continue;
        const s = U.dist(o.x, o.y, item.x, item.y) / (o.def.loves === item.type ? 1.8 : 1);
        if (s < bs) { bs = s; best = o; }
      }
      if (best) {
        best.do('fetch', { item });
        best.say(U.pick(['👀', 'on it!', 'ooh!']), 1.4);
      }
    }

    addHearts(n, x, y) {
      this.progress.add('hearts', n);
      this.happiness = Math.min(100, this.happiness + n * 0.8);
      if (x != null) for (let i = 0; i < Math.min(n, 5); i++) this.fx.heart(x + U.rand(-1, 1) * this.G.S * 0.3 * (n > 1 ? 1 : 0), y - i * 8, this.G.S * 0.28);
      this.checkUnlocks();
    }

    checkUnlocks() {
      for (const u of this.progress.check()) {
        this.applyUnlock(u.id, false);
        this.ui.toast(`Unlocked: ${u.name}!`, u.icon);
        this.ui.markNew();
        this.audio.chime();
        this.fx.sparkle(this.G.W / 2, this.G.top, 10, this.G.S * 0.3);
        this.progress.save();
      }
    }

    applyUnlock(id, quiet) {
      if (id === 'kelp') this.decor.kelp.push(new OR.KelpPatch(this, 0.12, 0.78, 1));
      if (id === 'forest') {
        this.decor.kelp.push(new OR.KelpPatch(this, 0.9, 0.25, 0.9));
        this.decor.kelp.push(new OR.KelpPatch(this, 0.5, 0.97, 0.8));
      }
      if (id === 'log') this.decor.log = new OR.Log(this, 0.8, 0.82);
      if (id === 'buoy') this.decor.buoy = new OR.Buoy(this, 0.05, 0.12);
      if (id === 'lighthouse') this.scene.rebuild();
      if (!quiet && (id === 'sunset' || id === 'lagoon')) {
        clearTimeout(this.areaTimer);
        this.areaTimer = setTimeout(() => {
          this.setArea(id);
          this.ui.toast('You can switch places in the Journal 📔', '🧭');
        }, 1200);
      }
      if (this.ui) this.ui.refresh();
    }

    setArea(id) {
      this.progress.state.area = id;
      this.progress.dirty = true;
      this.scene.rebuild();
      this.ui.toast(`Welcome to ${OR.AREAS[id].name}`, id === 'lagoon' ? '🌙' : id === 'sunset' ? '🌅' : '🌊');
    }

    toggleMute() {
      const m = !this.audio.muted;
      this.audio.setMuted(m);
      this.progress.state.muted = m;
      this.progress.save();
    }

    save() {
      this.progress.state.happiness = Math.round(this.happiness);
      this.progress.save();
    }

    // ------------------------------------------------------------ raft modes
    callFamily() {
      this.audio.init();
      this.setMode('raft', 40);
      this.byId.natalie.say('Everyone hold paws!', 2.4);
      this.ui.toast('Family, come hold paws!', '🤝');
      this.happiness = Math.min(100, this.happiness + 2);
    }
    napTime() {
      this.audio.init();
      this.setMode('nap', 60);
      this.byId.gussy.say('finally... 💤', 2.4);
      this.ui.toast('Nap time. Everyone snuggle up.', '🌙');
    }
    familyCheer() {
      this.audio.init();
      this.setMode('cheer', 16);
      this.byId.collin.say('Paws up, everybody!', 2.2);
      this.ui.toast('Family cheer!', '🙌');
    }

    setMode(type, dur, fromEvent) {
      if (!fromEvent) this.endEvent();
      const G = this.G;
      const xs = this.otters.map((o) => o.x), ys = this.otters.map((o) => o.y);
      let cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      let cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      if (type === 'nap' && this.decor.kelp.length) {
        const k = this.decor.kelp.reduce((best, p) => (U.dist(cx, cy, ...p.pos) < U.dist(cx, cy, ...best.pos) ? p : best));
        [cx, cy] = k.pos;
      }
      this.mode = { type, until: this.time + dur, slots: {}, cx, cy };
      this.computeSlots();
      for (const o of this.otters) o.links = [];
      for (const o of this.otters) {
        if (o.scripted) continue;
        if (o.actionName === 'held' || o.actionName === 'rub') continue;
        o.do('slot');
      }
    }

    computeSlots() {
      const m = this.mode, G = this.G;
      const order = OR.RAFT_ORDER.map((id) => this.byId[id]);
      const us = order.map((o) => G.S * o.size * G.depth(m.cy));
      const gaps = [];
      for (let i = 0; i < order.length - 1; i++) gaps.push(0.72 * (us[i] + us[i + 1]));
      const total = gaps.reduce((a, b) => a + b, 0);
      const half = total / 2 + G.S * 0.6;
      const cx = G.right - G.left > half * 2 ? U.clamp(m.cx, G.left + half, G.right - half) : G.W / 2;
      const cy = U.clamp(m.cy, G.top + G.S * 0.8, G.bottom - G.S * 0.3);
      let x = cx - total / 2;
      order.forEach((o, i) => {
        const k = (x - cx) / (total / 2 || 1);
        m.slots[o.id] = { x, y: cy + k * k * G.S * 0.25 };
        x += gaps[i] || 0;
      });
    }

    // 0..1 height of the cheering wave at screen x
    cheerWave(x) {
      return Math.max(0, Math.sin(this.time * 3.2 - x / (this.G.S * 1.1)));
    }

    updateMode(dt) {
      const m = this.mode;
      if (!m) return;
      if (this.time > m.until) {
        this.mode = null;
        for (const o of this.otters) {
          if (o.actionName !== 'slot') continue;
          o.next = m.type === 'nap' ? ['nap', { dur: U.rand(2, 12) }] : ['float', { dur: U.rand(2, 9) }];
        }
      }
    }

    // ------------------------------------------------------------ paw holding
    forceLink(a, b) {
      if (a.links.includes(b)) return;
      a.links.push(b);
      b.links.push(a);
    }
    linkCount() {
      return this.otters.reduce((s, o) => s + o.links.length, 0) / 2;
    }

    updateLinks(dt) {
      const os = this.otters, m = this.mode;
      // let go when someone swims off
      for (const a of os) {
        a.links = a.links.filter((b) => b.links.includes(a) && a.linkable && b.linkable && U.dist(a.x, a.y, b.x, b.y) < a.restDist(b) * 1.8);
      }
      for (const a of os) for (const b of a.links) if (!b.links.includes(a)) b.links.push(a);

      if (m) {
        // in a called raft, paws are held with the intended neighbours only
        const order = OR.RAFT_ORDER.map((id) => this.byId[id]);
        order.slice(0, -1).forEach((a, i) => {
          const b = order[i + 1];
          const near = (o) => m.slots[o.id] && U.dist(o.x, o.y, m.slots[o.id].x, m.slots[o.id].y) < o.u * 0.6;
          if (a.linkable && b.linkable && near(a) && near(b) && !a.links.includes(b)) this.addLink(a, b);
        });
      } else {
        for (let i = 0; i < os.length; i++) {
          for (let j = i + 1; j < os.length; j++) {
            let a = os[i], b = os[j];
            if (!a.linkable || !b.linkable || a.links.includes(b)) continue;
            if (a.links.length >= 2 || b.links.length >= 2) continue;
            if (a.x > b.x) [a, b] = [b, a];
            const R = a.restDist(b), dx = b.x - a.x, dy = Math.abs(b.y - a.y);
            if (dx < R * 0.55 || dx > R * 1.35 || dy > R * 0.45) continue;
            // a's right hand and b's left hand must be free
            if (a.links.some((l) => l.x > a.x) || b.links.some((l) => l.x < b.x)) continue;
            this.addLink(a, b);
          }
        }
        // linked otters drift gently into a tidy row
        const seen = new Set();
        for (const a of os) {
          for (const b of a.links) {
            const key = a.id < b.id ? a.id + b.id : b.id + a.id;
            if (seen.has(key)) continue;
            seen.add(key);
            const [l, r] = a.x < b.x ? [a, b] : [b, a];
            const R = l.restDist(r);
            const ex = r.x - l.x - R, ey = r.y - l.y;
            const k = Math.min(1, dt * 2.5);
            l.x += ex * 0.5 * k;
            r.x -= ex * 0.5 * k;
            l.y += ey * 0.25 * k;
            r.y -= ey * 0.25 * k;
          }
        }
      }

      // the whole family in one chain?
      if (this.raftCd <= 0 && this.linkCount() >= os.length - 1) {
        const seen = new Set([os[0]]), stack = [os[0]];
        while (stack.length) for (const b of stack.pop().links) if (!seen.has(b)) { seen.add(b); stack.push(b); }
        if (seen.size === os.length) this.celebrateRaft();
      }

      // Gussy dozing off mid paw-hold counts as a moment too
      const gu = this.byId.gussy;
      if (gu && gu.links.length && gu.sleeping && !this.momentCd.sleepyPaw) {
        this.momentCd.sleepyPaw = true;
        this.moment('sleepyPaw', true);
        setTimeout(() => (this.momentCd.sleepyPaw = false), 90000);
      }
    }

    addLink(a, b) {
      this.forceLink(a, b);
      const key = a.id < b.id ? a.id + b.id : b.id + a.id;
      const [hx, hy] = [(a.x + b.x) / 2, Math.min(a.y, b.y) - (a.u + b.u) * 0.2];
      if (!this.linkCd[key] || this.time - this.linkCd[key] > 25) {
        this.linkCd[key] = this.time;
        this.fx.heart(hx, hy, this.G.S * 0.22);
        this.audio.squeak(1.25, 'soft');
        this.addHearts(1);
      }
    }

    celebrateRaft() {
      this.raftCd = 90;
      const os = this.otters;
      this.moment('perfectRaft');
      this.addHearts(5);
      this.audio.chime();
      os.forEach((o, i) => {
        setTimeout(() => {
          this.fx.heart(o.x, o.y - o.u * 1.2, o.u * 0.4);
          this.fx.sparkle(o.x, o.y - o.u * 0.6, 2, o.u * 0.2);
        }, i * 180);
      });
      const lines = { natalie: '💕', collin: 'Family raft!', winston: 'hehe!', gussy: 'cozy...', finny: '👀💕' };
      os.forEach((o) => o.say(lines[o.id] || '💕', 2.2));
    }

    // keep otters from floating inside each other
    separate(dt) {
      const os = this.otters;
      for (let i = 0; i < os.length; i++) {
        for (let j = i + 1; j < os.length; j++) {
          const a = os[i], b = os[j];
          if (a.riding || b.riding || a.links.includes(b) || a.q.sub > 0.5 || b.q.sub > 0.5 || a.onLog || b.onLog) continue;
          if (a.actionName === 'held' || b.actionName === 'held') continue;
          const min = a.restDist(b) * 0.78;
          const dx = b.x - a.x, dy = (b.y - a.y) * 1.4, d = Math.hypot(dx, dy) || 0.01;
          if (d < min) {
            const push = (min - d) * Math.min(1, dt * 4);
            a.x -= (dx / d) * push * 0.5;
            a.y -= (dy / d) * push * 0.35;
            b.x += (dx / d) * push * 0.5;
            b.y += (dy / d) * push * 0.35;
          }
        }
      }
    }

    // ------------------------------------------------------------ family moments
    isFree(o) {
      return !o.scripted && !o.riding && o.actionName !== 'held' && o.actionName !== 'rub' && !this.mode;
    }
    claim(id) {
      const o = this.byId[id];
      o.scripted = true;
      o.next = null;
      if (this.event && !this.event.claimed.includes(o)) this.event.claimed.push(o);
      o.do('float', { dur: 999 });
      return o;
    }
    moment(id, announce) {
      const ev = OR.EVENTS.find((e) => e.id === id);
      const first = this.progress.recordMoment(id);
      if (first) {
        this.ui.markNew();
        if (ev) this.ui.toast(`New family moment: ${ev.title}`, '📔');
      } else if (announce && ev) this.ui.toast(ev.title, ev.icon);
    }
    startEvent(def) {
      this.event = { def, claimed: [] };
      if (def.id !== 'perfectRaft') {
        const first = !this.progress.state.moments[def.id];
        this.ui.toast(def.title, def.icon);
        this.moment(def.id);
        if (first) this.audio.chime();
      }
      this.event.gen = def.run(this);
      this.stepEvent(0);
    }
    stepEvent(dt) {
      try {
        if (this.event.gen.next(dt).done) this.endEvent();
      } catch (e) {
        console.warn('event failed', e);
        this.endEvent();
      }
    }
    updateEvent(dt) {
      if (this.event) return this.stepEvent(dt);
      if (this.mode || this.pointer.down) return;
      this.eventT -= dt;
      if (this.eventT > 0) return;
      const opts = OR.EVENTS.filter((e) => e.id !== this.lastEvent && e.can(this));
      if (!opts.length) {
        this.eventT = 5;
        return;
      }
      const w = {};
      for (const e of opts) w[e.id] = this.progress.state.moments[e.id] ? 1 : 3;
      const pickId = U.weighted(w);
      const def = OR.EVENTS.find((e) => e.id === pickId);
      this.lastEvent = def.id;
      this.startEvent(def);
    }
    endEvent() {
      if (!this.event) return;
      for (const o of this.event.claimed) {
        o.scripted = false;
        o.done = true;
      }
      this.event = null;
      this.eventT = U.rand(35, 70);
    }

    // ------------------------------------------------------------ input
    hitOtter(x, y) {
      const sorted = this.otters.slice().sort((a, b) => this.drawKey(b) - this.drawKey(a));
      for (const o of sorted) {
        if (o.q.sub > 0.6) continue;
        const [hx, hy] = o.toWorld(0, -0.2);
        if (U.dist(x, y, hx, hy) < o.u * 0.8) return o;
      }
      return null;
    }

    bindInput() {
      const c = this.canvas;
      const pos = (e) => {
        const r = c.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      c.addEventListener('pointerdown', (e) => {
        const [x, y] = pos(e);
        this.audio.init();
        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.inside = true;
        this.pointer.moved = this.time;
        this.pointer.down = { x, y, t: this.time, o: this.hitOtter(x, y), mode: null };
        try {
          c.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
        this.taps = (this.taps || 0) + 1;
        if (this.taps > 2) this.ui.hideHint();
      });
      c.addEventListener('pointermove', (e) => {
        const [x, y] = pos(e);
        const p = this.pointer;
        p.x = x;
        p.y = y;
        p.inside = true;
        p.moved = this.time;
        const d = p.down;
        if (d && d.o && !d.mode && U.dist(x, y, d.x, d.y) > 10) {
          if (d.o.scripted) this.endEvent();
          if (d.o.riding) d.o.riding = null;
          d.o.do('held');
          d.mode = 'drag';
        }
        if (!d) {
          const o = this.hitOtter(x, y);
          if (o) o.nameT = Math.max(o.nameT, 0.5);
          c.style.cursor = o ? 'grab' : 'pointer';
        } else if (d.mode === 'drag') c.style.cursor = 'grabbing';
      });
      const up = () => {
        const d = this.pointer.down;
        this.pointer.down = null;
        if (!d) return;
        if (d.mode === 'drag') d.o.do('float', { dur: 1.2 });
        else if (d.mode === 'rub') d.o.do('float', { dur: 3, happy: true });
        else if (d.o) this.tapOtter(d.o);
        else this.tapWater(d.x, d.y);
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('pointerleave', () => {
        this.pointer.inside = false;
      });
    }

    updatePointerHold() {
      const d = this.pointer.down;
      if (!d || !d.o || d.mode) return;
      if (this.time - d.t > 0.45 && U.dist(this.pointer.x, this.pointer.y, d.x, d.y) < 10) {
        if (d.o.scripted) this.endEvent();
        d.o.riding = null;
        d.o.do('rub');
        d.mode = 'rub';
      }
    }

    tapOtter(o) {
      o.nameT = 3;
      if (o.heartCd <= 0) {
        o.heartCd = 1.2;
        this.addHearts(1);
      }
      this.happiness = Math.min(100, this.happiness + 3);
      if (o.scripted || o.riding) {
        o.say(U.pick(o.def.lines), 2);
        this.fx.heart(o.x, o.y - o.u * 1.1, o.u * 0.35);
        this.audio.squeak(o.baby ? 1.35 : 1);
        return;
      }
      o.do('react');
    }

    tapWater(x, y) {
      const G = this.G;
      for (const b of this.bubbles) {
        if (U.dist(x, y, b.x, b.y) < b.r * 2 + 14) {
          this.popBubble(b);
          if (U.chance(0.35)) this.addHearts(1, x, y);
          return;
        }
      }
      for (const it of this.items) {
        if (U.dist(x, y, it.x, it.y) < G.S * 0.7) {
          this.fx.ripple(it.x, it.y, G.S * 0.8, true);
          this.dispatchFetch(it);
          return;
        }
      }
      this.fx.ripple(x, y, G.S * 0.9, true);
      this.fx.ripple(x, y, G.S * 0.5);
      this.audio.bubble();
      this.attention = { x, y, t: this.time };
      for (const f of this.fish) if (U.dist(x, y, f.x, f.y) < G.S * 2) f.scare(x, y);
      if (U.chance(0.6)) {
        const w = {};
        for (const o of this.otters) {
          if (!this.isFree(o) || o.sleeping || o.q.sub > 0.3 || U.dist(o.x, o.y, x, y) > G.S * 7) continue;
          w[o.id] = { finny: 3, winston: 2.5 }[o.id] || 0.6;
        }
        const id = U.weighted(w);
        if (id) {
          const o = this.byId[id];
          o.do('swimTo', { x, y: y + o.u * 0.3, speed: 1.1, within: o.u * 0.6 });
          o.next = ['float', { dur: U.rand(2, 4) }];
          o.say(U.pick(['?', '👀', 'ooh!', 'what\'s that?']), 1.6);
        }
      }
    }

    // ------------------------------------------------------------ drawing
    drawKey(o) {
      if (o.riding) return o.riding.y + 0.5 + (o.st && o.st.slot ? o.st.slot * 0.01 : 0);
      return o.y + (o.onLog ? 1000 : 0);
    }

    draw() {
      const ctx = this.ctx, t = this.time, G = this.G;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.scene.drawBack(ctx, t);
      for (const k of this.decor.kelp) k.draw(ctx, t);
      for (const it of this.items) it.draw(ctx, t);
      for (const f of this.fish) f.draw(ctx, t);
      for (const o of this.otters) A.drawUnderwater(ctx, o, t);
      this.fx.drawLow(ctx);
      if (this.decor.buoy) this.decor.buoy.draw(ctx, t);
      if (this.decor.log) this.decor.log.draw(ctx, t);
      for (const o of this.otters) if (!o.riding) A.drawWaterRing(ctx, o, t);
      for (const b of this.bubbles) b.draw(ctx);
      const sorted = this.otters.slice().sort((a, b) => this.drawKey(a) - this.drawKey(b));
      for (const o of sorted) A.drawOtter(ctx, o, t);
      for (const f of this.fish) f.drawAir(ctx, t);
      for (const l of this.lanterns) l.draw(ctx, t);
      this.fx.drawHigh(ctx);
      this.scene.drawOverlay(ctx, t);
      for (const o of sorted) this.drawName(ctx, o);
      for (const o of sorted) this.drawSpeech(ctx, o);
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

    drawSpeech(ctx, o) {
      const s = o.speech;
      if (!s || o.q.sub > 0.6) return;
      const [hx, hy] = o.headWorld;
      const fs = Math.round(U.clamp(o.u * 0.3, 14, 19));
      ctx.font = `700 ${fs}px ${FONT}`;
      const w = ctx.measureText(s.text).width + fs * 1.1, h = fs * 1.75;
      const pop = U.easeOutBack(Math.min(1, s.t / 0.25));
      const fade = s.t > s.dur - 0.3 ? Math.max(0, (s.dur - s.t) / 0.3) : 1;
      const x = U.clamp(hx, w / 2 + 6, this.G.W - w / 2 - 6);
      const y = hy - o.u * 0.62 - h;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(hx, y + h);
      ctx.scale(pop, pop);
      ctx.translate(-hx, -(y + h));
      ctx.shadowColor = 'rgba(20,50,90,0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#fffdf8';
      this.roundRect(ctx, x - w / 2, y, w, h, h / 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.moveTo(hx - 6, y + h - 1);
      ctx.lineTo(hx, y + h + 8);
      ctx.lineTo(hx + 6, y + h - 1);
      ctx.fill();
      ctx.fillStyle = '#4a3040';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, x, y + h / 2 + 1);
      ctx.restore();
    }

    drawName(ctx, o) {
      if (o.nameT <= 0 || o.q.sub > 0.6) return;
      const a = Math.min(1, o.nameT / 0.3);
      const fs = Math.round(U.clamp(o.u * 0.24, 12, 16));
      ctx.font = `800 ${fs}px ${FONT}`;
      const w = ctx.measureText(o.name).width + fs * 1.9, h = fs * 1.6;
      const x = o.x, y = o.y + o.u * (o.shape.bodyY + o.shape.bodyRy + 0.62);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,253,248,0.94)';
      this.roundRect(ctx, x - w / 2, y, w, h, h / 2);
      ctx.fill();
      A.ellipse(ctx, x - w / 2 + fs * 0.75, y + h / 2, fs * 0.32, fs * 0.32);
      ctx.fillStyle = o.pal.fur;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = o.pal.line;
      ctx.stroke();
      ctx.fillStyle = '#4a3040';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.name, x + fs * 0.35, y + h / 2 + 1);
      ctx.restore();
    }
  }

  OR.Game = Game;
})(window.OR);
