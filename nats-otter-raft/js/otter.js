// One otter: movement, a small library of actions, and a personality-weighted chooser.
// Each frame an action writes a *target* pose (o.p); the drawn pose (o.q) eases toward it,
// so every change of expression or paw position animates smoothly on its own.
(function (OR) {
  'use strict';
  const U = OR.util;

  const CHEST = { alx: -0.13, aly: 0.02, arx: 0.13, ary: 0.02 };
  const POSE_KEYS = ['eo', 'happy', 'yawn', 'oh', 'kick', 'lean', 'sub', 'blush', 'lift', 'sx', 'sy', 'alx', 'aly', 'arx', 'ary', 'lookX', 'lookY', 'tilt', 'kelp', 'itemY', 'wiggle', 'costume', 'step'];
  const FAST_KEYS = { step: 18, costume: 6, alx: 12, aly: 12, arx: 12, ary: 12, lift: 14, sx: 14, sy: 14, itemY: 16, lookX: 7, lookY: 7 };

  function basePose() {
    return Object.assign({ eo: 1, happy: 0, yawn: 0, oh: 0, kick: 0, lean: 0, sub: 0, blush: 0.25, lift: 0, sx: 1, sy: 1, lookX: 0, lookY: 0, tilt: 0, kelp: 0, itemY: 0, wiggle: 0, costume: 0, step: 0, rot: 0, bob: 0 }, CHEST);
  }

  // States in which an otter is relaxed enough to hold a paw.
  const LINKABLE = { float: 1, nap: 1, slot: 1, cuddle: 1, rub: 1, react: 1, sunbathe: 0 };

  class Otter {
    constructor(def, game, x, y) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.pal = def.pal;
      this.shape = def.shape;
      this.size = def.size;
      this.baby = def.role === 'baby';
      this.game = game;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.u = 40;
      this.seed = Math.random() * 100;
      this.p = basePose();
      this.q = basePose();
      this.action = null;
      this.actionName = '';
      this.links = [];
      this.holding = null;
      this.holdTime = 0;
      this.blink = 0;
      this.blinkT = U.rand(1, 4);
      this.speech = null;
      this.nameT = 0;
      this.scripted = false;
      this.riding = null;
      this.sleeping = false;
      this.onLog = false;
      this.extraRot = 0;
      this.idleLook = { x: 0, y: 0, t: 0 };
      this.heartCd = 0;
      this.next = null;
    }

    // ---------------------------------------------------------- helpers
    get G() { return this.game.G; }
    get linkable() { return !!LINKABLE[this.actionName] && this.q.sub < 0.3 && !this.riding; }
    get headWorld() {
      return [this.x + Math.sin(this.q.rot) * -this.shape.headY * this.u, this.y + this.shape.headY * this.u + (this.q.bob - this.q.lift) * this.u];
    }
    toLocal(wx, wy) {
      const dx = wx - this.x, dy = wy - (this.y + (this.q.bob - this.q.lift) * this.u);
      const c = Math.cos(-this.q.rot), s = Math.sin(-this.q.rot);
      return [(dx * c - dy * s) / (this.u * this.q.sx), (dx * s + dy * c) / (this.u * this.q.sy)];
    }
    toWorld(lx, ly) {
      const c = Math.cos(this.q.rot), s = Math.sin(this.q.rot);
      const x = lx * this.u, y = ly * this.u;
      return [this.x + x * c - y * s, this.y + (this.q.bob - this.q.lift) * this.u + x * s + y * c];
    }
    // Comfortable centre-to-centre distance when holding paws with `b`.
    restDist(b) { return 0.72 * (this.u + b.u); }

    say(text, dur) {
      this.speech = { text, t: 0, dur: dur || 2.4 };
      this.nameT = Math.max(this.nameT, dur || 2.4);
    }

    do(name, params) {
      const act = ACTIONS[name];
      if (!act) return;
      if (this.action && this.action.exit) this.action.exit(this);
      this.action = act;
      this.actionName = name;
      this.t = 0;
      this.st = {};
      this.params = params || {};
      this.done = false;
      if (act.enter) act.enter(this, this.params, this.st);
    }

    // Steer toward a point; returns remaining distance.
    steer(tx, ty, mul, dt) {
      const G = this.G;
      tx = U.clamp(tx, G.left, G.right);
      ty = U.clamp(ty, G.top, G.bottom);
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 0.0001;
      const maxV = G.S * this.def.speed * (mul || 1);
      const want = Math.min(maxV, d * 2.4);
      const k = Math.min(1, dt * 3.2);
      this.vx += ((dx / d) * want - this.vx) * k;
      this.vy += ((dy / d) * want - this.vy) * k;
      this.steering = true;
      return d;
    }

    lookAt(wx, wy) {
      this.lookTarget = [wx, wy];
    }

    randomSpot(nearX, nearY, radius) {
      const G = this.G;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * U.TAU, r = radius * U.rand(0.4, 1);
        const x = nearX + Math.cos(a) * r, y = nearY + Math.sin(a) * r * 0.7;
        if (x > G.left && x < G.right && y > G.top && y < G.bottom) return [x, y];
      }
      return [U.rand(G.left, G.right), U.rand(G.top, G.bottom)];
    }

    // Where to stand to hold paws with `b` (the side with a free hand, nearest to us).
    sideSpot(b, close) {
      const R = this.restDist(b) * (close || 1);
      const leftFree = !b.links.some((l) => l.x < b.x), rightFree = !b.links.some((l) => l.x > b.x);
      let side = this.x < b.x ? -1 : 1;
      if (side === -1 && !leftFree && rightFree) side = 1;
      if (side === 1 && !rightFree && leftFree) side = -1;
      return [b.x + side * R, b.y + U.rand(-0.05, 0.05) * R];
    }

    // ---------------------------------------------------------- think
    think() {
      const g = this.game;
      if (g.mode) return this.do('slot');
      if (this.next) {
        const n = this.next;
        this.next = null;
        return this.do(n[0], n[1]);
      }
      const d = this.def;
      const w = Object.assign({}, d.weights);
      const mom = g.byId.natalie;
      if (this.links.length) {
        w.float = (w.float || 1) * 3 + 2;
        w.nap = (w.nap || 0) * 2.5 + 0.5;
        if (this.id === 'winston') w.wander *= 0.6;
      }
      if (this.holding === 'rock') w.rockplay = this.id === 'collin' ? 6 : 1.5;
      if (!g.items.length) w.fetch = 0;
      if (!g.fish.length && !g.bubbles.length) w.chase = 0;
      if (this.baby && mom && U.dist(this.x, this.y, mom.x, mom.y) > this.G.S * 4) w.visit = (w.visit || 0) + 5;
      if (g.progress.has('twirl')) w.twirl = 0.35;
      if (g.decor.log && g.progress.has('log')) w.sunbathe = this.id === 'gussy' ? 0.8 : 0.4;
      if (g.happiness > 80) w.play = (w.play || 0) + 0.5;
      if (g.time < (g.awakeUntil || 0)) w.nap = 0; // just woken up by Free Roam
      if (this.baby && g.otters.filter((o) => o.baby && o !== this && !o.scripted).length === 0) w.play = 0;
      const pick = U.weighted(w) || 'float';
      this.do(pick);
    }

    // ---------------------------------------------------------- update
    update(dt, t) {
      const g = this.game, G = this.G, p = this.p;
      this.u = G.S * this.size * G.depth(this.y) * (this.riding ? 0.82 : 1);
      this.steering = false;
      this.lookTarget = null;

      // reset target pose, then let the action shape it
      Object.assign(p, basePose());
      // Scripted otters (in a family event) wait idly once their step is done.
      if (!this.action || (this.done && !this.scripted)) this.think();
      const act = this.action;
      if (act && act.update && !this.done) {
        if (act.update(this, dt, this.st, this.params)) this.done = true;
      }
      this.t += dt;

      // paws follow a partner's hand
      if (g.mode && g.mode.type === 'dance') p.costume = 1;
      if (this.links.length && this.linkable) this.poseHolding();
      if (this.holding && !this.links.length && this.actionName !== 'rockplay' && this.actionName !== 'groom' && this.actionName !== 'scratch') {
        p.alx = -0.1; p.aly = 0.0; p.arx = 0.1; p.ary = 0.0;
      }

      // movement integration
      if (!this.riding && this.actionName !== 'held') {
        if (!this.steering) {
          const damp = Math.exp(-1.6 * dt);
          this.vx *= damp;
          this.vy *= damp;
          // gentle ocean drift
          this.vx += g.current[0] * dt * 0.6;
          this.vy += g.current[1] * dt * 0.6;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // soft walls
        if (this.x < G.left) this.vx += (G.left - this.x) * dt * 4;
        if (this.x > G.right) this.vx -= (this.x - G.right) * dt * 4;
        if (this.y < G.top) this.vy += (G.top - this.y) * dt * 4;
        if (this.y > G.bottom) this.vy -= (this.y - G.bottom) * dt * 4;
      }

      // swimming look: kick and lean into the motion
      const sp = Math.hypot(this.vx, this.vy) / G.S;
      if (sp > 0.25 && p.sub < 0.5) {
        p.kick = Math.max(p.kick, U.clamp(sp / 1.4, 0, 1));
        p.lean += U.clamp(this.vx / (G.S * 2.2), -0.45, 0.45);
        if (sp > 0.8 && Math.random() < dt * 6) g.fx.wake(this.x, this.y + this.u * 0.55, this.u);
      }

      // gaze: pointer > action target > idle glances
      const ptr = g.pointer;
      let look = this.lookTarget;
      const att = g.attention;
      if (!look && att && t - att.t < 2 && !this.sleeping && U.dist(att.x, att.y, this.x, this.y) < G.S * 6) look = [att.x, att.y];
      if (!look && ptr.inside && t - ptr.moved < 2.5 && U.dist(ptr.x, ptr.y, this.x, this.y) < this.u * 5) look = [ptr.x, ptr.y];
      if (look) {
        const [hx, hy] = this.headWorld;
        const dx = look[0] - hx, dy = look[1] - hy, d = Math.hypot(dx, dy) || 1;
        const k = U.clamp(d / (this.u * 1.5), 0, 1);
        p.lookX = (dx / d) * k;
        p.lookY = (dy / d) * k;
        p.tilt += U.clamp(dx / (this.u * 12), -0.12, 0.12);
      } else {
        this.idleLook.t -= dt;
        if (this.idleLook.t <= 0) {
          this.idleLook = { x: U.chance(0.4) ? 0 : U.rand(-0.9, 0.9), y: U.rand(-0.6, 0.6), t: U.rand(1.2, 3.5) };
        }
        p.lookX = this.idleLook.x;
        p.lookY = this.idleLook.y;
      }

      // blinking (Gussy blinks slow and sleepy)
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        const len = this.pal.slowBlink ? 0.5 : 0.16;
        const k = -this.blinkT / len;
        this.blink = k < 0.5 ? k * 2 : Math.max(0, 2 - k * 2);
        if (k >= 1) {
          this.blink = 0;
          this.blinkT = U.rand(2, 5.5);
        }
      }

      // ease drawn pose toward target
      const q = this.q;
      for (const k of POSE_KEYS) q[k] = U.damp(q[k], p[k], FAST_KEYS[k] || 7, dt);
      const bobSpeed = this.sleeping ? 1.1 : 1.7;
      q.bob = Math.sin(t * bobSpeed + this.seed) * 0.035 + Math.sin(t * 0.7 + this.seed * 2) * 0.02;
      const sway = Math.sin(t * 0.8 + this.seed) * 0.06;
      // ease along the shortest way round, so a finished spin doesn't unwind backwards
      const rotTarget = (this.forcedRot != null ? this.forcedRot : sway + q.lean) + this.extraRot;
      let dr = (rotTarget - q.rot) % U.TAU;
      if (dr > Math.PI) dr -= U.TAU;
      if (dr < -Math.PI) dr += U.TAU;
      q.rot += dr * (1 - Math.exp(-8 * dt));
      if (this.extraRot === 0) q.rot = Math.atan2(Math.sin(q.rot), Math.cos(q.rot));
      this.extraRot = 0;
      this.forcedRot = null;

      // held items get tucked away eventually (sea otters keep a favourite rock in an armpit pouch)
      if (this.holding && !this.scripted) {
        this.holdTime -= dt;
        if (this.holdTime <= 0 && this.actionName !== 'rockplay') {
          g.fx.sparkle(this.x, this.y - this.u * 0.1, 4, this.u * 0.12);
          this.holding = null;
        }
      }

      if (this.speech) {
        this.speech.t += dt;
        if (this.speech.t > this.speech.dur) this.speech = null;
      }
      this.nameT = Math.max(0, this.nameT - dt);
      this.heartCd = Math.max(0, this.heartCd - dt);
    }

    poseHolding() {
      const p = this.p;
      for (const b of this.links) {
        // meet halfway between our shoulders
        const side = this.toLocal(b.x, b.y)[0] >= 0 ? 1 : -1;
        const bSide = b.toLocal(this.x, this.y)[0] >= 0 ? 1 : -1;
        const [sx, sy] = this.toWorld(...OR.art.shoulder(this, side));
        const [bx, by] = b.toWorld(...OR.art.shoulder(b, bSide));
        const mx = (sx + bx) / 2;
        let my = (sy + by) / 2 + this.u * 0.05;
        // Family Cheer: joined paws go up in a wave along the raft
        if (this.game.mode && this.game.mode.type === 'cheer') my -= this.G.S * 0.55 * this.game.cheerWave(mx);
        let [lx, ly] = this.toLocal(mx, my);
        const [ox, oy] = OR.art.shoulder(this, side);
        const dx = lx - ox, dy = ly - oy, d = Math.hypot(dx, dy);
        const reach = OR.art.ARM_REACH;
        if (d > reach) {
          lx = ox + (dx / d) * reach;
          ly = oy + (dy / d) * reach;
        }
        if (side === 1) {
          p.arx = lx;
          p.ary = ly;
        } else {
          p.alx = lx;
          p.aly = ly;
        }
      }
    }

    give(type, holdSeconds) {
      this.holding = type;
      this.holdTime = holdSeconds || U.rand(8, 16);
    }
  }

  // ---------------------------------------------------------------- actions
  // Each action: enter(o, params, st), update(o, dt, st, params) -> true when finished.
  const ACTIONS = (OR.ACTIONS = {});

  ACTIONS.float = {
    enter(o, pr, st) {
      st.dur = pr.dur || U.rand(3, 8) * (o.id === 'gussy' ? 1.4 : 1);
    },
    update(o, dt, st, pr) {
      if (pr.happy) {
        o.p.happy = 1;
        o.p.eo = 0;
        o.p.blush = 0.9;
      }
      if (o.links.length && U.chance(dt * 0.05)) o.p.happy = 1;
      return o.t > st.dur;
    },
  };

  ACTIONS.nap = {
    enter(o, pr, st) {
      st.dur = pr.dur || U.rand(9, 18) * (o.id === 'gussy' ? 1.8 : 1);
      st.z = 0.5;
      o.sleeping = true;
      st.kelp = o.game.kelpNear(o.x, o.y);
    },
    update(o, dt, st) {
      o.p.eo = 0;
      o.p.blush = 0.45;
      if (st.kelp) o.p.kelp = 1;
      st.z -= dt;
      if (st.z <= 0) {
        st.z = U.rand(1.3, 2.2);
        const [hx, hy] = o.headWorld;
        o.game.fx.zzz(hx + o.u * 0.3, hy - o.u * 0.3, o.u);
      }
      return o.t > st.dur;
    },
    exit(o) {
      o.sleeping = false;
      if (!o.scripted && U.chance(0.4)) o.next = ['yawn'];
    },
  };

  ACTIONS.groom = {
    enter(o, pr, st) {
      st.dur = pr.dur || U.rand(3, 5);
      st.face = U.chance(0.6);
      o.links.length = 0;
    },
    update(o, dt, st) {
      const p = o.p, S = o.shape, w = Math.sin(o.t * 10);
      p.eo = 0;
      p.happy = 1;
      p.blush = 0.6;
      if (st.face) {
        p.alx = -0.24 + w * 0.05; p.aly = S.headY + 0.12 + Math.cos(o.t * 10) * 0.07;
        p.arx = 0.24 - w * 0.05; p.ary = S.headY + 0.12 - Math.cos(o.t * 10) * 0.07;
      } else {
        p.alx = -0.14 + w * 0.08; p.aly = 0.1 + Math.cos(o.t * 9) * 0.06;
        p.arx = 0.14 + w * 0.08; p.ary = 0.1 - Math.cos(o.t * 9) * 0.06;
      }
      p.tilt = Math.sin(o.t * 5) * 0.08;
      if (U.chance(dt * 3)) o.game.fx.fluff(o.x + U.rand(-0.3, 0.3) * o.u, o.y - o.u * 0.3, o.pal.furLight);
      return o.t > st.dur;
    },
  };

  ACTIONS.scratch = {
    enter(o, pr, st) {
      st.dur = U.rand(1.4, 2.4);
      st.side = U.chance(0.5) ? 1 : -1;
      o.links.length = 0;
    },
    update(o, dt, st) {
      const p = o.p, S = o.shape;
      const x = st.side * 0.38, y = S.headY + 0.02 + Math.sin(o.t * 28) * 0.05;
      if (st.side > 0) { p.arx = x; p.ary = y; } else { p.alx = x; p.aly = y; }
      p.eo = 0;
      p.happy = 1;
      p.tilt = st.side * 0.18;
      p.kick = 0.4;
      return o.t > st.dur;
    },
  };

  ACTIONS.yawn = {
    enter(o, pr, st) {
      st.dur = 2.2;
      o.links.length = 0;
      o.game.audio.squeak(o.baby ? 1.1 : 0.8, 'yawn');
    },
    update(o, dt, st) {
      const k = Math.sin(Math.PI * U.clamp(o.t / st.dur, 0, 1));
      const p = o.p, S = o.shape;
      p.yawn = Math.pow(k, 0.7);
      p.eo = 1 - k;
      p.alx = U.lerp(CHEST.alx, -0.48, k); p.aly = U.lerp(CHEST.aly, S.headY - 0.35, k);
      p.arx = U.lerp(CHEST.arx, 0.48, k); p.ary = U.lerp(CHEST.ary, S.headY - 0.35, k);
      p.sy = 1 + k * 0.05;
      return o.t > st.dur;
    },
  };

  ACTIONS.shake = {
    enter(o) {
      o.links.length = 0;
      o.game.audio.splash(0.4);
    },
    update(o, dt) {
      const k = 1 - o.t / 1.0;
      o.extraRot = Math.sin(o.t * 34) * 0.28 * k;
      o.p.eo = 0;
      o.p.happy = 1;
      o.p.sx = 1 + Math.sin(o.t * 34) * 0.05 * k;
      if (U.chance(dt * 30 * k)) o.game.fx.droplet(o.x, o.y - o.u * 0.3, o.u);
      return o.t > 1.0;
    },
  };

  // Swim somewhere far-ish, look around, maybe come back.
  ACTIONS.wander = {
    enter(o, pr, st) {
      const G = o.G;
      const mom = o.game.byId.natalie;
      const cx = o.baby && mom ? mom.x : o.x, cy = o.baby && mom ? mom.y : o.y;
      [st.x, st.y] = o.randomSpot(cx, cy, G.S * (o.baby ? U.rand(3, 6) : U.rand(2, 4)));
      st.look = U.rand(1.5, 3.5);
      st.arrived = false;
      if (o.id === 'winston' && U.chance(0.4)) o.say(U.pick(['wheee!', 'ZOOM!', 'catch me!']));
    },
    update(o, dt, st) {
      if (!st.arrived) {
        if (o.steer(st.x, st.y, o.id === 'winston' ? 1.2 : 0.9, dt) < o.u * 0.4 || o.t > 12) {
          st.arrived = true;
          st.t0 = o.t;
        }
      } else if (o.t - st.t0 > st.look) {
        return true;
      }
      return false;
    },
    exit(o) {
      if (o.baby && !o.scripted && U.chance(0.55)) o.next = ['visit', { target: 'natalie' }];
    },
  };

  // Swim up beside another otter (so paws can be held).
  ACTIONS.visit = {
    enter(o, pr, st) {
      const g = o.game;
      let target = pr.target && g.byId[pr.target];
      if (!target) {
        const w = {};
        for (const k in o.def.likes) if (g.byId[k] && !g.byId[k].riding) w[k] = o.def.likes[k];
        target = g.byId[U.weighted(w)];
      }
      st.target = target;
      st.close = pr.close || 1;
    },
    update(o, dt, st, pr) {
      const b = st.target;
      if (!b || b.q.sub > 0.5) return o.t > 3;
      const [x, y] = o.sideSpot(b, st.close);
      o.lookAt(b.x, b.y - b.u * 0.5);
      const d = o.steer(x, y, pr.speed || 1, dt);
      if (d < o.u * 0.18 || o.t > 14) {
        if (!o.scripted) o.next = ['float', { dur: U.rand(5, 10) }];
        return true;
      }
      return false;
    },
  };

  ACTIONS.follow = {
    enter(o, pr, st) {
      st.leader = o.game.byId[pr.target || o.def.follows || 'natalie'];
      st.dur = U.rand(6, 12);
      st.off = [U.rand(-1, 1) * 0.9, U.rand(0.4, 0.9)];
    },
    update(o, dt, st) {
      const L = st.leader;
      if (!L || L === o) return true;
      const S = o.G.S;
      const tx = L.x + st.off[0] * S, ty = L.y + st.off[1] * S;
      if (U.dist(o.x, o.y, tx, ty) > S * 0.3) o.steer(tx, ty, 1.1, dt);
      o.lookAt(L.x, L.y - L.u * 0.5);
      return o.t > st.dur;
    },
  };

  ACTIONS.cuddle = {
    enter(o, pr, st) {
      st.partner = o.game.byId[pr.target || (o.id === 'natalie' ? 'collin' : 'natalie')];
      st.dur = pr.dur || U.rand(6, 9);
      st.heart = 0.4;
    },
    update(o, dt, st, pr) {
      const b = st.partner;
      if (!b) return true;
      const p = o.p;
      const near = U.dist(o.x, o.y, b.x, b.y) < o.restDist(b) * 1.15;
      if (!pr.stay && !near) {
        const [x, y] = o.sideSpot(b, 0.9);
        o.steer(x, y, 1, dt);
        o.lookAt(b.x, b.y - b.u * 0.5);
        return o.t > 14;
      }
      if (!st.t0) st.t0 = o.t;
      const side = b.x > o.x ? 1 : -1;
      if (near) {
        p.lean = side * 0.22;
        p.tilt = side * 0.2;
        p.eo = 0;
        p.happy = 1;
        p.blush = 1;
        st.heart -= dt;
        if (st.heart <= 0) {
          st.heart = U.rand(0.6, 1.1);
          o.game.fx.heart((o.x + b.x) / 2, o.y - o.u * 1.1, o.u * 0.35);
        }
      }
      return o.t - st.t0 > st.dur;
    },
  };

  ACTIONS.dive = {
    enter(o, pr, st) {
      st.phase = 'down';
      st.under = pr.under || U.rand(1.6, 3.2);
      o.links.length = 0;
      if (pr.item) {
        st.tx = pr.item.x;
        st.ty = pr.item.y;
      } else if (pr.x != null) {
        st.tx = pr.x;
        st.ty = pr.y;
      } else {
        [st.tx, st.ty] = o.randomSpot(o.x, o.y, o.G.S * 2);
      }
      o.p.lift = 0.25;
    },
    update(o, dt, st, pr) {
      const g = o.game, p = o.p;
      if (st.phase === 'down') {
        p.lift = o.t < 0.18 ? 0.3 : 0;
        p.sy = o.t < 0.18 ? 1.08 : 0.9;
        if (o.t > 0.18) {
          p.sub = 1;
          if (!st.splashed) {
            st.splashed = true;
            g.fx.splash(o.x, o.y, o.u * 0.9);
            g.audio.splash(0.6);
          }
        }
        if (o.q.sub > 0.9) {
          st.phase = 'under';
          st.t0 = o.t;
        }
      } else if (st.phase === 'under') {
        p.sub = 1;
        o.steer(st.tx, st.ty, 0.9, dt);
        if (U.chance(dt * 4)) g.fx.bubble(o.x + U.rand(-0.3, 0.3) * o.u, o.y, o.u * 0.12);
        if (o.t - st.t0 > st.under && U.dist(o.x, o.y, st.tx, st.ty) < o.u * 0.8) {
          st.phase = 'up';
          st.t0 = o.t;
          g.fx.splash(o.x, o.y, o.u * 0.7);
          g.audio.splash(0.45);
          g.audio.bubble();
          if (pr.item && g.items.includes(pr.item)) g.collect(o, pr.item);
          else if (!pr.item && U.chance(o.id === 'collin' ? 0.45 : 0.18)) g.collect(o, { type: g.randomFindType(o), x: o.x, y: o.y, free: true });
        }
        if (o.t - st.t0 > st.under + 6) st.phase = 'up';
      } else {
        p.sub = 0;
        p.lift = o.t - st.t0 < 0.15 ? 0.35 : 0;
        p.sx = 1.06;
        p.sy = 0.94;
        p.eo = 0;
        p.happy = 1;
        if (o.t - st.t0 > 0.35 && U.chance(0.5) && !st.shook) {
          st.shook = true;
          if (!o.scripted) o.next = ['shake'];
        }
        return o.t - st.t0 > 0.8;
      }
      return false;
    },
  };

  ACTIONS.fetch = {
    enter(o, pr, st) {
      const g = o.game;
      st.item = pr.item || g.bestItemFor(o);
    },
    update(o, dt, st) {
      const it = st.item, g = o.game;
      if (!it || !g.items.includes(it)) return true;
      o.lookAt(it.x, it.y);
      if (o.steer(it.x, it.y, 1.1, dt) < o.u * 0.5) {
        const scripted = o.scripted;
        o.do('dive', { item: it, under: U.rand(0.8, 1.5) });
        o.scripted = scripted;
        return false;
      }
      return o.t > 15;
    },
  };

  ACTIONS.chase = {
    enter(o, pr, st) {
      const g = o.game;
      const pool = [].concat(g.fish.filter((f) => !f.jump), g.bubbles);
      let best = null, bd = Infinity;
      for (const e of pool) {
        const d = U.dist(o.x, o.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      st.target = pr.target || best;
      st.dur = U.rand(3.5, 6);
      if (st.target && U.chance(0.5)) o.say(st.target.isFish ? '🐟' : U.pick(['ooh!', '🫧', 'hehe']), 1.6);
    },
    update(o, dt, st) {
      const e = st.target, g = o.game;
      if (!e || e.dead) return true;
      o.lookAt(e.x, e.y);
      o.p.oh = 0.6;
      o.p.alx = -0.3 + Math.sin(o.t * 12) * 0.05; o.p.aly = -0.25;
      o.p.arx = 0.3 - Math.sin(o.t * 12) * 0.05; o.p.ary = -0.25;
      const d = o.steer(e.x, e.y, 1.45, dt);
      if (d < o.u * 0.55) {
        if (e.isFish) e.scare(o.x, o.y);
        else {
          g.popBubble(e);
          o.p.happy = 1;
          return true;
        }
      }
      return o.t > st.dur;
    },
  };

  ACTIONS.zoomies = {
    enter(o, pr, st) {
      st.cx = U.clamp(o.x, o.G.left + o.G.S * 1.5, o.G.right - o.G.S * 1.5);
      st.cy = U.clamp(o.y, o.G.top + o.G.S, o.G.bottom - o.G.S);
      st.a = Math.atan2(o.y - st.cy, o.x - st.cx);
      st.dir = U.chance(0.5) ? 1 : -1;
      st.r = o.G.S * U.rand(0.9, 1.4);
      st.dur = U.rand(2.5, 4);
      o.links.length = 0;
      if (U.chance(0.6)) o.say(o.id === 'winston' ? 'ZOOM!' : 'wheee!', 1.5);
    },
    update(o, dt, st) {
      st.a += st.dir * dt * 3.2;
      o.steer(st.cx + Math.cos(st.a) * st.r, st.cy + Math.sin(st.a) * st.r * 0.6, 2.2, dt);
      o.p.happy = 1;
      o.p.eo = 0;
      if (U.chance(dt * 5)) o.game.fx.droplet(o.x, o.y, o.u * 0.7);
      return o.t > st.dur;
    },
  };

  // Babies play tag with each other.
  ACTIONS.play = {
    enter(o, pr, st) {
      const g = o.game;
      const friends = g.otters.filter((b) => b.baby && b !== o && !b.scripted && !b.riding && b.q.sub < 0.5);
      st.friend = pr.friend || U.pick(friends);
      st.dur = U.rand(4, 7);
      if (st.friend && !st.friend.scripted && st.friend.actionName !== 'play' && !pr.chased) {
        st.friend.do('flee', { from: o, dur: st.dur });
        o.say(U.pick(['tag!', 'hehe', 'gotcha!']), 1.6);
      }
    },
    update(o, dt, st) {
      const f = st.friend;
      if (!f) return true;
      o.lookAt(f.x, f.y);
      o.p.happy = 1;
      o.p.eo = U.chance(0.5) ? 1 : 0;
      if (o.steer(f.x, f.y, 1.5, dt) < o.u * 0.7 && U.chance(dt * 2)) {
        o.game.fx.splash((o.x + f.x) / 2, o.y, o.u * 0.5);
        o.game.audio.squeak(1.3);
      }
      return o.t > st.dur;
    },
  };

  ACTIONS.flee = {
    enter(o, pr, st) {
      st.from = pr.from;
      st.dur = pr.dur || 5;
    },
    update(o, dt, st) {
      const f = st.from;
      if (!f) return true;
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy) || 1;
      const G = o.G;
      let tx = o.x + (dx / d) * G.S * 2, ty = o.y + (dy / d) * G.S * 2;
      // circle round the walls instead of getting stuck
      if (tx < G.left || tx > G.right) ty += (ty > (G.top + G.bottom) / 2 ? -1 : 1) * G.S * 2;
      if (ty < G.top || ty > G.bottom) tx += (tx > G.W / 2 ? -1 : 1) * G.S * 2;
      o.steer(tx, ty, 1.3, dt);
      o.p.happy = 1;
      o.p.eo = 0;
      o.p.blush = 0.8;
      return o.t > st.dur;
    },
  };

  ACTIONS.rockplay = {
    enter(o, pr, st) {
      st.mode = pr.mode || (U.chance(0.5) ? 'toss' : 'tap');
      st.dur = U.rand(4, 7);
      st.beat = 0;
      o.links.length = 0;
      if (!o.holding) o.give('rock');
    },
    update(o, dt, st) {
      const p = o.p, g = o.game;
      if (!o.holding) return true;
      p.happy = 1;
      if (st.mode === 'tap') {
        const k = Math.abs(Math.sin(o.t * 6));
        p.itemY = k * 0.25;
        p.alx = -0.12; p.aly = 0.0 - k * 0.25;
        p.arx = 0.12; p.ary = 0.0 - k * 0.25;
        p.eo = 0.4;
        st.beat += dt * 6;
        if (st.beat > Math.PI) {
          st.beat -= Math.PI;
          g.audio.tok();
        }
      } else {
        const cyc = (o.t % 1.4) / 1.4;
        const up = cyc < 0.8 ? Math.sin((cyc / 0.8) * Math.PI) : 0;
        p.itemY = up * 1.3;
        p.alx = -0.2; p.aly = -0.25 - up * 0.3;
        p.arx = 0.2; p.ary = -0.25 - up * 0.3;
        p.lookX = 0;
        p.lookY = -0.8 * up;
        p.eo = 1;
        p.oh = up > 0.6 ? 0.8 : 0;
        if (cyc > 0.8 && !st.caught) {
          st.caught = true;
          g.audio.tok();
        }
        if (cyc < 0.8) st.caught = false;
      }
      return o.t > st.dur;
    },
    exit(o) {
      o.holdTime = Math.max(o.holdTime, o.id === 'collin' ? U.rand(20, 40) : 5);
    },
  };

  ACTIONS.twirl = {
    enter(o) {
      o.links.length = 0;
      o.game.audio.squeak(1.2);
    },
    update(o, dt) {
      const k = U.clamp(o.t / 1.1, 0, 1);
      o.extraRot = U.easeInOut(k) * U.TAU;
      o.p.happy = 1;
      o.p.eo = 0;
      o.p.kick = 1;
      o.p.lift = Math.sin(k * Math.PI) * 0.15;
      if (U.chance(dt * 10)) o.game.fx.sparkle(o.x, o.y - o.u * 0.5, 1, o.u * 0.15);
      return o.t > 1.2;
    },
  };

  // Clicked: bounce, wave, squeak.
  ACTIONS.react = {
    enter(o, pr, st) {
      const g = o.game;
      st.dur = 1.4;
      st.wave = U.chance(0.6) ? (U.chance(0.5) ? 1 : -1) : 0;
      o.say(pr.line || U.pick(o.def.lines), 2.4);
      g.audio.squeak(o.baby ? 1.35 : 1);
      g.fx.heart(o.x + U.rand(-0.3, 0.3) * o.u, o.y - o.u * 1.1, o.u * 0.35);
      o.game.fx.ripple(o.x, o.y + o.u * 0.3, o.u * 0.9);
    },
    update(o, dt, st) {
      const p = o.p, k = o.t / st.dur;
      const bounce = Math.max(0, Math.sin(k * Math.PI * 3)) * (1 - k);
      p.lift = bounce * 0.35;
      p.sy = 1 + bounce * 0.08;
      p.sx = 1 - bounce * 0.05;
      p.eo = k < 0.1 ? 1 : 0;
      p.happy = 1;
      p.blush = 1;
      p.kick = 0.8;
      if (st.wave) {
        const x = st.wave * 0.5, y = o.shape.headY - 0.1 + Math.sin(o.t * 16) * 0.06;
        if (st.wave > 0) { p.arx = x + Math.sin(o.t * 16) * 0.05; p.ary = y; } else { p.alx = x - Math.sin(o.t * 16) * 0.05; p.aly = y; }
      }
      return o.t > st.dur;
    },
  };

  // Scooped up by the player's finger.
  ACTIONS.held = {
    enter(o) {
      o.links.length = 0;
      o.say(U.pick(['!', 'wheee!', 'eep!', '🥺']), 1.4);
      o.game.audio.squeak(1.5);
    },
    update(o, dt) {
      const g = o.game, p = o.p;
      const tx = g.pointer.x, ty = g.pointer.y + o.u * 0.4;
      const px = o.x;
      o.x = U.damp(o.x, tx, 14, dt);
      o.y = U.damp(o.y, ty, 14, dt);
      o.vx = (o.x - px) / Math.max(dt, 0.001);
      o.vy = 0;
      p.lift = 0.35;
      p.oh = 1;
      p.kick = 1;
      p.wiggle = Math.sin(o.t * 20);
      p.alx = -0.42 + Math.sin(o.t * 14) * 0.08; p.aly = -0.45;
      p.arx = 0.42 - Math.sin(o.t * 14) * 0.08; p.ary = -0.45;
      o.forcedRot = U.clamp(o.vx / (o.G.S * 6), -0.5, 0.5) + Math.sin(o.t * 9) * 0.08;
      return false;
    },
    exit(o) {
      o.vx *= 0.3;
      o.game.fx.splash(o.x, o.y, o.u * 0.8);
      o.game.audio.splash(0.5);
      o.next = ['shake'];
    },
  };

  // Belly rub: happy wiggly feet.
  ACTIONS.rub = {
    enter(o, pr, st) {
      st.heart = 0;
      o.say(U.pick(['💕', 'hehe~', '*happy squeak*', 'mmm!', '🥰']), 2);
    },
    update(o, dt, st) {
      const p = o.p;
      p.eo = 0;
      p.happy = 1;
      p.blush = 1;
      p.kick = 1;
      p.wiggle = Math.sin(o.t * 12);
      p.alx = -0.36; p.aly = -0.2 + Math.sin(o.t * 8) * 0.04;
      p.arx = 0.36; p.ary = -0.2 - Math.sin(o.t * 8) * 0.04;
      p.tilt = Math.sin(o.t * 4) * 0.12;
      st.heart -= dt;
      if (st.heart <= 0) {
        st.heart = 0.45;
        o.game.addHearts(1, o.x, o.y - o.u, o);
        o.game.happiness = Math.min(100, o.game.happiness + 1.5);
        o.game.audio.squeak(o.baby ? 1.4 : 1.1, 'soft');
      }
      return false;
    },
  };

  // Go to an assigned place in the family raft (Call the Family / Nap Time / Family Cheer).
  ACTIONS.slot = {
    enter(o, pr, st) {
      st.arrived = false;
    },
    update(o, dt, st) {
      const g = o.game, m = g.mode;
      if (!m) return true;
      const s = m.slots[o.id];
      if (!s) return true;
      const d = U.dist(o.x, o.y, s.x, s.y);
      if (m.type === 'dance') return OR.Dance.pose(o, dt, st, s, d);
      if (!st.arrived) {
        o.steer(s.x, s.y, 1.25, dt);
        if (d < o.u * 0.25) st.arrived = true;
      } else {
        // stay neatly in place without looking rigid
        o.vx += (s.x - o.x) * dt * 3;
        o.vy += (s.y - o.y) * dt * 3;
        o.vx *= Math.exp(-3 * dt);
        o.vy *= Math.exp(-3 * dt);
        o.steering = true;
        if (m.type === 'nap') {
          o.p.eo = 0;
          o.sleeping = true;
          o.p.kelp = g.kelpNear(o.x, o.y) ? 1 : 0;
          if (U.chance(dt * 0.5)) {
            const [hx, hy] = o.headWorld;
            g.fx.zzz(hx + o.u * 0.3, hy - o.u * 0.3, o.u);
          }
        } else {
          o.p.happy = U.chance(0.5) ? 1 : 0;
          o.p.blush = 0.7;
        }
      }
      if (m.type === 'cheer' && st.arrived) {
        const w = g.cheerWave(o.x);
        o.p.lift = w * 0.18;
        o.p.happy = 1;
        o.p.eo = 0;
        o.p.blush = 1;
        o.p.kick = 0.4 + w * 0.6;
        if (w > 0.95 && U.chance(dt * 3)) g.fx.sparkle(o.x, o.y - o.u * 1.1, 1, o.u * 0.15);
      }
      return false;
    },
    exit(o) {
      o.sleeping = false;
    },
  };

  // Ride on Natalie's tummy like a real sea otter pup.
  ACTIONS.ride = {
    enter(o, pr, st) {
      st.mom = o.game.byId[pr.mom || 'natalie'];
      st.slot = pr.slot || 0;
      st.dur = pr.dur || 12;
      st.on = false;
      o.links.length = 0;
    },
    update(o, dt, st, pr) {
      const m = st.mom, p = o.p;
      if (!m) return true;
      const offs = [[0, 0.02], [-0.32, -0.05], [0.32, 0.08]][st.slot % 3];
      const [tx, ty] = m.toWorld(offs[0], offs[1] + m.shape.bodyY);
      if (!st.on) {
        o.riding = null;
        if (o.steer(tx, ty + m.u * 0.3, 1.3, dt) < m.u * 0.6) {
          st.on = true;
          st.t0 = o.t;
          o.game.fx.splash(o.x, o.y, o.u * 0.5);
          o.game.audio.squeak(1.5);
        }
        return o.t > 15;
      }
      o.riding = m;
      o.x = U.damp(o.x, tx, 10, dt);
      o.y = U.damp(o.y, ty + 0.5, 10, dt);
      o.vx = m.vx;
      o.vy = m.vy;
      o.forcedRot = m.q.rot + (st.slot === 1 ? -0.3 : st.slot === 2 ? 0.3 : 0);
      p.lift = 0.12;
      if (pr.sleep !== false && o.t - st.t0 > 1.5) {
        p.eo = 0;
        o.sleeping = true;
        if (U.chance(dt * 0.4)) {
          const [hx, hy] = o.headWorld;
          o.game.fx.zzz(hx + o.u * 0.3, hy - o.u * 0.3, o.u * 0.8);
        }
      } else {
        p.happy = 1;
        p.eo = 0;
      }
      return o.t - st.t0 > st.dur;
    },
    exit(o) {
      o.riding = null;
      o.sleeping = false;
      o.vy = o.G.S * 0.6;
    },
  };

  // Sunbathe on the driftwood log.
  ACTIONS.sunbathe = {
    enter(o, pr, st) {
      const log = o.game.decor.log;
      st.spot = log ? log.freeSpot(o) : null;
      st.dur = U.rand(8, 16);
    },
    update(o, dt, st) {
      const log = o.game.decor.log;
      if (!st.spot || !log) return true;
      const [x, y] = log.spotPos(st.spot);
      if (!o.onLog) {
        if (o.steer(x, y + o.u * 0.4, 1, dt) < o.u * 0.5) {
          o.onLog = true;
          o.game.fx.splash(o.x, o.y, o.u * 0.5);
          st.t0 = o.t;
        }
        return o.t > 14;
      }
      o.x = U.damp(o.x, x, 8, dt);
      o.y = U.damp(o.y, y, 8, dt);
      o.vx = o.vy = 0;
      o.steering = true;
      o.p.lift = 0.3;
      o.p.eo = 0;
      o.p.happy = U.chance(0.3) ? 1 : 0;
      o.p.alx = -0.35; o.p.aly = -0.5; o.p.arx = 0.35; o.p.ary = -0.5;
      return o.t - st.t0 > st.dur;
    },
    exit(o, st) {
      if (o.onLog) {
        o.onLog = false;
        o.vy = o.G.S * 1.2;
        o.game.fx.splash(o.x, o.y + o.u * 0.4, o.u * 0.8);
        o.game.audio.splash(0.5);
        if (o.game.decor.log) o.game.decor.log.release(o);
      }
    },
  };

  // Generic scripted swim.
  ACTIONS.swimTo = {
    enter() {},
    update(o, dt, st, pr) {
      let x = pr.x, y = pr.y;
      if (pr.target) {
        x = pr.target.x + (pr.dx || 0);
        y = pr.target.y + (pr.dy || 0);
      }
      o.lookAt(x, y);
      if (pr.happy) {
        o.p.happy = 1;
        o.p.eo = 0;
      }
      const d = o.steer(x, y, pr.speed || 1, dt);
      return d < (pr.within || o.u * 0.3) || o.t > (pr.timeout || 12);
    },
  };

  // Scripted pause with a mood.
  ACTIONS.pose = {
    update(o, dt, st, pr) {
      Object.assign(o.p, pr.pose || {});
      if (pr.look) o.lookAt(pr.look.x, pr.look.y);
      return o.t > (pr.dur || 2);
    },
  };

  // Natalie grooming a pup riding on her tummy.
  ACTIONS.groomPup = {
    enter(o, pr, st) {
      st.pup = pr.pup;
      st.dur = pr.dur || 7;
      o.links.length = 0;
    },
    update(o, dt, st) {
      const pup = st.pup, p = o.p;
      if (!pup || pup.riding !== o) return o.t > 10;
      const [lx, ly] = o.toLocal(pup.x, pup.y - pup.u * 0.45);
      const w = Math.sin(o.t * 9) * 0.07;
      p.alx = lx - 0.12 + w; p.aly = ly + Math.cos(o.t * 9) * 0.05;
      p.arx = lx + 0.12 + w; p.ary = ly - Math.cos(o.t * 9) * 0.05;
      p.eo = 0;
      p.happy = 1;
      p.blush = 0.9;
      p.tilt = Math.sin(o.t * 2) * 0.1;
      if (U.chance(dt * 4)) o.game.fx.fluff(pup.x + U.rand(-0.3, 0.3) * pup.u, pup.y - pup.u * 0.4, pup.pal.furLight);
      return o.t > st.dur;
    },
  };

  OR.Otter = Otter;
})(window.OR);
