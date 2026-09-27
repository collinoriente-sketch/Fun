// Small math, randomness and color helpers shared by every other file.
// Everything hangs off the global `OR` namespace so the game runs from file:// without a build step.
(function (OR) {
  'use strict';
  const U = (OR.util = {});

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => U.clamp((v - a) / (b - a), 0, 1);
  U.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  // Frame-rate independent smoothing toward a target.
  U.damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  U.easeOutBack = (t) => {
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  };
  U.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Pick a key from { key: weight } (weights <= 0 are skipped).
  U.weighted = (weights) => {
    let total = 0;
    for (const k in weights) if (weights[k] > 0) total += weights[k];
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const k in weights) {
      if (weights[k] <= 0) continue;
      r -= weights[k];
      if (r <= 0) return k;
    }
    return null;
  };

  const cache = {};
  U.hexToRgb = (hex) => {
    if (cache[hex]) return cache[hex];
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return (cache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  };
  U.rgba = (hex, a) => {
    const [r, g, b] = U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  // Mix a color with another color (t = 0..1).
  U.mix = (hexA, hexB, t) => {
    const a = U.hexToRgb(hexA), b = U.hexToRgb(hexB);
    const c = a.map((v, i) => Math.round(U.lerp(v, b[i], t)));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  U.lighten = (hex, t) => U.mix(hex, '#ffffff', t);
  U.darken = (hex, t) => U.mix(hex, '#000000', t);

  U.storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* storage unavailable: the game still works, it just won't remember */
      }
    },
  };
})((window.OR = window.OR || {}));
