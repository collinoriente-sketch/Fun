// Rare family moments. Each is a generator "script": `yield` waits one frame and receives dt.
// To add a moment: push an entry with id, icon, title, `can(g)` and a `*run(g)` script.
(function (OR) {
  'use strict';
  const U = OR.util;

  function* wait(s) {
    let t = 0;
    while (t < s) t += yield;
  }
  function* until(fn, timeout) {
    let t = 0;
    while (!fn() && t < (timeout || 15)) t += yield;
  }
  // Run an action on an otter and wait for it to finish.
  function* act(o, name, params, timeout) {
    o.do(name, params);
    yield* until(() => o.done, timeout || 15);
  }
  const free = (g, ...ids) => ids.every((id) => g.byId[id] && g.isFree(g.byId[id]));

  OR.EVENTS = [
    {
      id: 'cuddle', icon: '💞', title: 'Natalie and Collin cuddle',
      can: (g) => free(g, 'natalie', 'collin'),
      *run(g) {
        const N = g.claim('natalie'), C = g.claim('collin');
        N.do('float', { dur: 20 });
        yield* act(C, 'visit', { target: 'natalie', close: 0.9 }, 14);
        C.say('💕', 2);
        N.do('cuddle', { target: 'collin', stay: true, dur: 7 });
        C.do('cuddle', { target: 'natalie', stay: true, dur: 7 });
        g.forceLink(N, C);
        yield* until(() => N.done && C.done, 10);
        g.addHearts(3, (N.x + C.x) / 2, N.y - N.u);
      },
    },
    {
      id: 'pile', icon: '🥰', title: 'All three babies pile onto Natalie',
      can: (g) => free(g, 'natalie', 'winston', 'gussy', 'finny'),
      *run(g) {
        const N = g.claim('natalie');
        const babies = ['gussy', 'winston', 'finny'].map((id) => g.claim(id));
        N.do('float', { dur: 30 });
        N.say('Come here, babies!', 2.5);
        babies.forEach((b, i) => b.do('ride', { mom: 'natalie', slot: i, dur: 11 + i }));
        yield* until(() => babies.every((b) => b.riding), 12);
        N.do('float', { dur: 14, happy: true });
        yield* wait(1.5);
        if (babies.some((b) => b.riding)) g.addHearts(4, N.x, N.y - N.u * 1.2);
        yield* until(() => babies.every((b) => b.done), 16);
      },
    },
    {
      id: 'steal', icon: '🪨', title: 'Winston steals Collin\'s rock',
      can: (g) => free(g, 'winston', 'collin'),
      *run(g) {
        const C = g.claim('collin'), W = g.claim('winston');
        if (C.holding !== 'rock') {
          yield* act(C, 'dive', { under: 1 }, 6);
          C.give('rock', 60);
          C.say('Found a good rock!', 2.2);
        }
        C.do('rockplay', { mode: 'tap' });
        yield* wait(1.5);
        W.say('hehe', 1.5);
        yield* act(W, 'swimTo', { target: C, dx: 0, dy: C.u * 0.3, speed: 1.4, within: C.u * 0.6 }, 10);
        C.holding = null;
        W.give('rock', 30);
        g.audio.tok();
        g.fx.splash(C.x, C.y, C.u * 0.6);
        C.do('pose', { dur: 1.2, pose: { oh: 1 } });
        C.say('Hey!', 1.8);
        const [ax, ay] = W.randomSpot(W.x, W.y, g.G.S * 4);
        W.do('swimTo', { x: ax, y: ay, speed: 1.6, happy: true });
        yield* wait(0.8);
        C.do('swimTo', { target: W, speed: 0.7, timeout: 5 });
        yield* until(() => W.done, 8);
        W.say('hehehe', 1.6);
        yield* until(() => C.done, 5);
        yield* act(W, 'swimTo', { target: C, dx: C.u * 0.9, speed: 1.1, within: C.u * 0.5 }, 10);
        W.holding = null;
        C.give('rock', 60);
        W.say('sorry dad 🥺', 2);
        C.say('hehe, ok 💕', 2);
        g.addHearts(3, C.x, C.y - C.u);
        C.do('float', { dur: 3, happy: true });
        yield* wait(2.5);
      },
    },
    {
      id: 'sleepyPaw', icon: '😴', title: 'Gussy falls asleep holding a paw',
      can: (g) => free(g, 'gussy', 'natalie'),
      *run(g) {
        const Gu = g.claim('gussy'), N = g.claim('natalie');
        N.do('float', { dur: 30 });
        yield* act(Gu, 'visit', { target: 'natalie' }, 12);
        g.forceLink(Gu, N);
        Gu.say('so sleepy...', 2.2);
        Gu.do('nap', { dur: 16 });
        N.do('float', { dur: 16 });
        yield* wait(2);
        N.say('💕', 1.8);
        g.addHearts(2, Gu.x, Gu.y - Gu.u);
        yield* until(() => Gu.done, 16);
      },
    },
    {
      id: 'shiny', icon: '✨', title: 'Finny discovers a shiny shell',
      can: (g) => free(g, 'finny'),
      *run(g) {
        const F = g.claim('finny');
        const [x, y] = F.randomSpot(F.x, F.y, g.G.S * 2);
        const item = g.spawnItem('pearl', x, y);
        F.say('👀', 1.5);
        F.lookAt(x, y);
        yield* wait(1);
        F.say('ooh!', 1.4);
        yield* act(F, 'fetch', { item }, 16);
        yield* until(() => F.q.sub < 0.2, 3);
        if (F.holding === 'pearl') {
          F.say('shiny!! ✨', 2.4);
          g.fx.sparkle(F.x, F.y - F.u * 0.4, 8, F.u * 0.25);
          F.holdTime = 25;
          F.do('pose', { dur: 2.5, pose: { happy: 1, eo: 0, blush: 1, kick: 1 } });
          yield* until(() => F.done, 3);
        }
      },
    },
    {
      id: 'perfectRaft', icon: '🤝', title: 'All five form a perfect raft',
      can: (g) => !g.mode,
      *run(g) {
        g.setMode('raft', 30, true);
        yield* wait(0.1);
      },
    },
    {
      id: 'bigDive', icon: '🌊', title: 'Everyone dives at once',
      can: (g) => g.otters.every((o) => g.isFree(o)),
      *run(g) {
        const all = OR.RAFT_ORDER.map((id) => g.claim(id));
        g.byId.collin.say('Everybody dive!', 1.6);
        yield* wait(0.8);
        all.forEach((o, i) => o.do('dive', { under: 2.2 + i * 0.45 }));
        yield* until(() => all.every((o) => o.done), 12);
        all.forEach((o) => o.say(U.pick(['pop!', 'hehe', '💦', 'ta-da!']), 1.4));
        g.addHearts(3, g.G.W / 2, g.G.top + g.G.S);
        yield* wait(1);
      },
    },
    {
      id: 'fishThrough', icon: '🐟', title: 'A fish leaps through the raft',
      can: (g) => g.otters.every((o) => g.isFree(o)) && !g.mode,
      *run(g) {
        g.setMode('raft', 22, true);
        yield* until(() => g.linkCount() >= 3, 14);
        yield* wait(1.5);
        const xs = g.otters.map((o) => o.x);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = g.otters.reduce((s, o) => s + o.y, 0) / g.otters.length;
        const fish = g.spawnFish();
        fish.dir = 1;
        fish.x = cx - g.G.S * 1.6;
        fish.y = cy + g.G.S * 0.2;
        fish.leap(g.G.S * 3.2);
        yield* wait(0.3);
        g.otters.forEach((o) => {
          o.lookAt(fish.x, fish.y - g.G.S);
          o.say(U.pick(['!', '🐟', 'whoa!', '!!']), 1.4);
        });
        yield* wait(1.2);
        g.byId.finny.say('I want one!', 1.8);
        g.addHearts(2, cx, cy - g.G.S);
      },
    },
    {
      id: 'race', icon: '🏁', title: 'The babies race each other',
      can: (g) => free(g, 'winston', 'gussy', 'finny') && !g.mode,
      *run(g) {
        const G = g.G;
        const babies = ['winston', 'gussy', 'finny'].map((id) => g.claim(id));
        const goRight = U.chance(0.5);
        const startX = goRight ? G.left + G.S * 0.5 : G.right - G.S * 0.5;
        const endX = goRight ? G.right - G.S * 0.5 : G.left + G.S * 0.5;
        const midY = (G.top + G.bottom) / 2;
        babies.forEach((b, i) => b.do('swimTo', { x: startX, y: midY + (i - 1) * G.S * 0.9, speed: 1.1 }));
        yield* until(() => babies.every((b) => b.done), 12);
        babies.forEach((b) => b.do('pose', { dur: 3, pose: { kick: 0.5 } }));
        const ref = g.isFree(g.byId.collin) ? g.claim('collin') : null;
        (ref || babies[0]).say('Ready...', 1);
        yield* wait(1.1);
        (ref || babies[0]).say('Go!', 1);
        const speeds = babies.map(() => U.rand(1.3, 1.9));
        babies.forEach((b, i) => b.do('swimTo', { x: endX, y: b.y, speed: speeds[i], within: G.S * 0.2, timeout: 20 }));
        let winner = null;
        yield* until(() => (winner = babies.find((b) => b.done)), 20);
        if (winner) {
          winner.say('I win! 🏆', 2.4);
          g.fx.sparkle(winner.x, winner.y - winner.u, 6, winner.u * 0.2);
          babies.filter((b) => b !== winner).forEach((b) => b.say(b.id === 'gussy' ? 'so fast...' : 'hehe', 1.8));
        }
        yield* until(() => babies.every((b) => b.done), 8);
        g.addHearts(3, G.W / 2, midY - G.S);
      },
    },
    {
      id: 'gift', icon: '🎁', title: 'Collin brings Natalie a rock',
      can: (g) => free(g, 'collin', 'natalie'),
      *run(g) {
        const C = g.claim('collin'), N = g.claim('natalie');
        N.do('float', { dur: 40 });
        if (C.holding !== 'rock') {
          yield* act(C, 'dive', { under: 1.5 }, 6);
          C.give('rock', 60);
          C.say('Ooh, a pretty one!', 2);
          yield* wait(1.2);
        }
        yield* act(C, 'visit', { target: 'natalie', close: 0.95 }, 14);
        C.say('For you! 🪨', 2);
        yield* wait(1.2);
        C.holding = null;
        N.give('rock', 20);
        g.audio.tok();
        N.say('💕💕', 2.4);
        N.do('cuddle', { target: 'collin', stay: true, dur: 4 });
        C.do('cuddle', { target: 'natalie', stay: true, dur: 4 });
        g.addHearts(3, N.x, N.y - N.u);
        yield* until(() => N.done && C.done, 6);
      },
    },
    {
      id: 'groomBaby', icon: '🧼', title: 'Natalie grooms one of the babies',
      can: (g) => free(g, 'natalie') && ['winston', 'gussy', 'finny'].some((id) => free(g, id)),
      *run(g) {
        const N = g.claim('natalie');
        const pup = g.claim(U.pick(['winston', 'gussy', 'finny'].filter((id) => free(g, id))));
        N.do('float', { dur: 30 });
        N.say(pup.id === 'winston' ? 'Bath time, Winston!' : `Come here, ${pup.name}!`, 2.2);
        pup.do('ride', { mom: 'natalie', slot: 0, dur: 9, sleep: false });
        yield* until(() => !!pup.riding, 12);
        N.do('groomPup', { pup, dur: 7 });
        if (pup.id === 'winston') pup.say('hehe that tickles', 2);
        else if (pup.id === 'gussy') pup.say('mmm...', 2);
        else pup.say('👀', 1.5);
        yield* until(() => N.done, 9);
        g.addHearts(2, N.x, N.y - N.u);
        yield* until(() => pup.done, 4);
      },
    },
  ];
})(window.OR);
