// Side-scrolling world for Adventure mode: sky, parallax scenery, water surface and sea floor.
// Scenery is generated from a seed per "tile", so nothing is stored and only visible tiles are drawn.
// Add a biome by pushing to OR.BIOMES and (optionally) teaching drawProp() a new prop.
(function (OR) {
  'use strict';
  const U = OR.util, A = OR.art, TAU = U.TAU;

  OR.BIOMES = [
    { id: 'ocean', name: 'Open Ocean', sky: ['#8fd3f4', '#e4f6ff'], water: ['#5db5d8', '#1f5f94'], floor: '#c9b58a', far: 'islands', mid: ['boat', 'rock'], deep: ['rock', 'shellpile', 'fishschool'] },
    { id: 'beach', name: 'Sunny Beach', sky: ['#7fd0f7', '#fff3d6'], water: ['#58d0d4', '#2b8fb0'], floor: '#f0dca4', far: 'islands', mid: ['palmisle', 'palmisle', 'umbrella'], deep: ['starfish', 'shellpile', 'rock'] },
    { id: 'kelp', name: 'Kelp Forest', sky: ['#9fd8e6', '#e8f7ef'], water: ['#4fb3a4', '#1d5a55'], floor: '#8f8a5a', far: 'islands', mid: ['kelpcanopy', 'rock'], deep: ['kelpstalk', 'kelpstalk', 'rock', 'shellpile'] },
    { id: 'reef', name: 'Coral Reef', sky: ['#9bd6ff', '#f4f0ff'], water: ['#49b8e8', '#274f9c'], floor: '#e8c9a0', far: 'islands', mid: ['rock', 'boat'], deep: ['coral', 'coral', 'fan', 'starfish'] },
    { id: 'cave', name: 'Sea Cave', sky: ['#2b2540', '#4a3f63'], water: ['#2d5e7a', '#0f2238'], floor: '#4c4458', far: 'none', mid: ['pillar'], deep: ['crystal', 'crystal', 'rock'], ceiling: true, dark: 0.18 },
    { id: 'wreck', name: 'Shipwreck', sky: ['#9fb4cf', '#e6e3dc'], water: ['#4f8fa8', '#18384f'], floor: '#9b8c73', far: 'islands', mid: ['mast', 'debris'], deep: ['hull', 'barrel', 'chest', 'rock'] },
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Scroller {
    constructor(adv) {
      this.adv = adv;
    }

    get G() { return this.adv.G; }

    // Which biome sits at a given travel distance (in S units).
    biomeAt(dist) {
      const len = OR.BAL.biomeLength * OR.BAL.scrollSpeed;
      const i = Math.floor(Math.max(0, dist) / len);
      return OR.BIOMES[((i % OR.BIOMES.length) + OR.BIOMES.length) % OR.BIOMES.length];
    }
    // Current biome and a 0..1 blend toward the next one near the boundary.
    palette() {
      const d = this.adv.st.dist + this.G.W / this.G.S / 2;
      const len = OR.BAL.biomeLength * OR.BAL.scrollSpeed;
      const a = this.biomeAt(d), b = this.biomeAt(d + len);
      const into = (d % len) / len;
      const blend = U.clamp((into - 0.85) / 0.15, 0, 1);
      return { a, b, blend };
    }

    mixed(pal, key, i) {
      return pal.blend > 0 ? U.mix(pal.a[key][i], pal.b[key][i], pal.blend) : pal.a[key][i];
    }

    draw(ctx, t) {
      const G = this.G, adv = this.adv, pal = this.palette();
      const px = adv.st.dist * G.S; // scroll in pixels

      // background image override for the current biome, if the player added one
      const bgImg = OR.Assets.img('backgrounds/' + pal.a.id);
      if (bgImg) ctx.drawImage(bgImg, 0, 0, G.W, G.H);
      else {
        const sky = ctx.createLinearGradient(0, 0, 0, G.surface);
        sky.addColorStop(0, this.mixed(pal, 'sky', 0));
        sky.addColorStop(1, this.mixed(pal, 'sky', 1));
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, G.W, G.surface + 2);
      }

      // sun (or glowing crystals in the cave)
      const cave = pal.a.ceiling && pal.blend < 0.5;
      if (!bgImg && !cave) {
        const sx = G.W * 0.82, sy = G.surface * 0.3, r = G.S * 0.55;
        const glow = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 3);
        glow.addColorStop(0, 'rgba(255,246,200,0.7)');
        glow.addColorStop(1, 'rgba(255,246,200,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
        ctx.fillStyle = '#fff6cf';
        A.ellipse(ctx, sx, sy, r, r);
        ctx.fill();
      }

      // parallax layers: [speed factor, layer name]
      if (!bgImg) {
        this.layer(ctx, px * 0.06, 'far', 360, t);
        this.layer(ctx, px * 0.3, 'mid', 300, t);
      }

      // water body
      const wg = ctx.createLinearGradient(0, G.surface, 0, G.H);
      wg.addColorStop(0, this.mixed(pal, 'water', 0));
      wg.addColorStop(1, this.mixed(pal, 'water', 1));
      ctx.fillStyle = wg;
      ctx.fillRect(0, G.surface, G.W, G.H - G.surface);

      // light shafts under the surface
      if (!cave) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const x = ((i * 0.31 + 0.1) * G.W - (px * 0.5) % (G.W * 1.24) + G.W * 1.24) % (G.W * 1.24) - G.W * 0.12;
          const lg = ctx.createLinearGradient(0, G.surface, 0, G.H * 0.95);
          lg.addColorStop(0, 'rgba(255,255,255,0.1)');
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(x, G.surface);
          ctx.lineTo(x + G.S * 0.8, G.surface);
          ctx.lineTo(x + G.S * 2.2, G.H);
          ctx.lineTo(x + G.S * 1.0, G.H);
          ctx.fill();
        }
        ctx.restore();
      }

      this.layer(ctx, px * 0.55, 'deepFar', 260, t);
      // sea floor
      ctx.fillStyle = pal.blend > 0 ? U.mix(pal.a.floor, pal.b.floor, pal.blend) : pal.a.floor;
      ctx.beginPath();
      ctx.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 20; x += 20) ctx.lineTo(x, G.floor + Math.sin((x + px) * 0.012) * G.S * 0.12 + Math.sin((x + px) * 0.031) * G.S * 0.05);
      ctx.lineTo(G.W, G.H);
      ctx.fill();
      this.layer(ctx, px, 'deep', 220, t);

      if (cave) this.drawCeiling(ctx, px, t);
    }

    // Draws props for one parallax layer; each tile gets its props from a seeded random generator.
    layer(ctx, offset, name, tileW, t) {
      const G = this.G;
      const k = { far: 0.06, mid: 0.3, deepFar: 0.55, deep: 1 }[name];
      const i0 = Math.floor(offset / tileW) - 1, i1 = Math.floor((offset + G.W) / tileW) + 1;
      for (let i = i0; i <= i1; i++) {
        const r = rng(i * 7919 + name.length * 104729);
        const biome = this.biomeAt((i * tileW) / k / G.S);
        const x = i * tileW - offset + r() * tileW * 0.6;
        if (name === 'far') {
          if (biome.far === 'islands' && r() < 0.7) this.island(ctx, x, G.surface, tileW * (0.4 + r() * 0.5), G.S * (0.4 + r() * 0.5), '#9cc7c0', r() < 0.4);
        } else if (name === 'mid') {
          if (r() < 0.6) this.drawProp(ctx, biome.mid[Math.floor(r() * biome.mid.length)], x, G.surface, G.S * (0.8 + r() * 0.5), t, r, 'mid');
        } else if (name === 'deepFar') {
          ctx.globalAlpha = 0.35;
          if (r() < 0.8) this.drawProp(ctx, biome.deep[Math.floor(r() * biome.deep.length)], x, G.floor + G.S * 0.1, G.S * (0.9 + r() * 0.6), t, r, 'deepFar');
          ctx.globalAlpha = 1;
        } else {
          if (r() < 0.75) this.drawProp(ctx, biome.deep[Math.floor(r() * biome.deep.length)], x, G.floor + G.S * 0.15, G.S * (0.6 + r() * 0.5), t, r, 'deep');
        }
      }
    }

    island(ctx, x, base, w, h, col, trees) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, base + 1);
      ctx.bezierCurveTo(x - w * 0.3, base - h, x + w * 0.25, base - h * 1.1, x + w / 2, base + 1);
      ctx.fill();
      if (trees) {
        ctx.fillStyle = '#6f9f8c';
        for (let i = 0; i < 3; i++) {
          const tx = x - w * 0.15 + i * w * 0.12;
          ctx.beginPath();
          ctx.moveTo(tx - h * 0.2, base - h * 0.7);
          ctx.lineTo(tx, base - h * 1.35);
          ctx.lineTo(tx + h * 0.2, base - h * 0.7);
          ctx.fill();
        }
      }
    }

    drawProp(ctx, kind, x, y, s, t, r, layer) {
      switch (kind) {
        case 'boat': {
          ctx.fillStyle = '#b8744b';
          ctx.beginPath();
          ctx.moveTo(x - s * 0.9, y - s * 0.15);
          ctx.lineTo(x + s * 0.9, y - s * 0.15);
          ctx.lineTo(x + s * 0.6, y + s * 0.15);
          ctx.lineTo(x - s * 0.6, y + s * 0.15);
          ctx.fill();
          ctx.fillStyle = '#fbf6ee';
          ctx.beginPath();
          ctx.moveTo(x, y - s * 0.2);
          ctx.lineTo(x, y - s * 1.4);
          ctx.lineTo(x + s * 0.7, y - s * 0.25);
          ctx.fill();
          break;
        }
        case 'rock':
          if (layer === 'mid') {
            ctx.fillStyle = '#7d8d95';
            ctx.beginPath();
            ctx.moveTo(x - s * 0.7, y + 2);
            ctx.lineTo(x - s * 0.4, y - s * 0.8);
            ctx.lineTo(x + s * 0.1, y - s * 1.1);
            ctx.lineTo(x + s * 0.6, y + 2);
            ctx.fill();
          } else A.drawRock(ctx, x, y - s * 0.2, s * 0.45, r ? r() * 10 : 2);
          break;
        case 'palmisle': {
          ctx.fillStyle = '#f2dca0';
          A.ellipse(ctx, x, y + 2, s * 1.2, s * 0.35);
          ctx.fill();
          ctx.strokeStyle = '#8b6a45';
          ctx.lineWidth = s * 0.12;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 0.1);
          ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.8, x + s * 0.05, y - s * 1.4);
          ctx.stroke();
          ctx.fillStyle = '#4f9a54';
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.6 + Math.sin(t + i) * 0.05;
            ctx.save();
            ctx.translate(x + s * 0.05, y - s * 1.4);
            ctx.rotate(a + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(s * 0.35, -s * 0.2, s * 0.8, s * 0.15);
            ctx.quadraticCurveTo(s * 0.35, s * 0.05, 0, 0);
            ctx.fill();
            ctx.restore();
          }
          break;
        }
        case 'umbrella': {
          ctx.fillStyle = '#f2dca0';
          A.ellipse(ctx, x, y + 2, s * 0.9, s * 0.25);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = s * 0.06;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - s * 0.9);
          ctx.stroke();
          ctx.fillStyle = '#ff7a93';
          ctx.beginPath();
          ctx.arc(x, y - s * 0.9, s * 0.55, Math.PI, 0);
          ctx.fill();
          break;
        }
        case 'kelpcanopy': {
          ctx.fillStyle = '#7f9a3a';
          for (let i = 0; i < 4; i++) {
            A.ellipse(ctx, x + (i - 1.5) * s * 0.35, y + s * 0.02, s * 0.35, s * 0.1, (i - 1.5) * 0.3);
            ctx.fill();
          }
          break;
        }
        case 'pillar': {
          ctx.fillStyle = '#3c3450';
          ctx.fillRect(x - s * 0.3, 0, s * 0.6, y);
          break;
        }
        case 'mast': {
          ctx.strokeStyle = '#6b4a33';
          ctx.lineWidth = s * 0.12;
          ctx.beginPath();
          ctx.moveTo(x, y + 4);
          ctx.lineTo(x + s * 0.3, y - s * 1.6);
          ctx.moveTo(x - s * 0.3, y - s * 1.0);
          ctx.lineTo(x + s * 0.6, y - s * 1.1);
          ctx.stroke();
          ctx.fillStyle = 'rgba(240,235,220,0.8)';
          ctx.beginPath();
          ctx.moveTo(x + s * 0.28, y - s * 1.5);
          ctx.lineTo(x + s * 0.9, y - s * 1.2);
          ctx.lineTo(x + s * 0.2, y - s * 1.05);
          ctx.fill();
          break;
        }
        case 'debris':
          ctx.fillStyle = '#9a7552';
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(t + x) * 0.1);
          ctx.fillRect(-s * 0.6, -s * 0.06, s * 1.2, s * 0.14);
          ctx.restore();
          break;
        case 'shellpile':
          for (let i = 0; i < 4; i++) A.drawShell(ctx, x + (i - 1.5) * s * 0.22, y - s * 0.1 - (i % 2) * s * 0.12, s * 0.18);
          break;
        case 'starfish': {
          ctx.fillStyle = '#ff8a5c';
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? s * 0.12 : s * 0.3;
            ctx.lineTo(x + Math.cos(a) * rr, y - s * 0.2 + Math.sin(a) * rr);
          }
          ctx.fill();
          break;
        }
        case 'kelpstalk': {
          ctx.strokeStyle = '#4f7a2a';
          ctx.lineWidth = s * 0.1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          const top = this.G.surface + s * 0.3;
          for (let yy = y; yy > top; yy -= s * 0.4) ctx.lineTo(x + Math.sin(yy * 0.03 + t * 0.8) * s * 0.2, yy);
          ctx.stroke();
          ctx.fillStyle = '#7da73b';
          for (let yy = y - s * 0.4; yy > top; yy -= s * 0.8) {
            const xx = x + Math.sin(yy * 0.03 + t * 0.8) * s * 0.2;
            A.ellipse(ctx, xx + s * 0.18, yy, s * 0.22, s * 0.08, 0.4);
            ctx.fill();
          }
          break;
        }
        case 'coral': {
          const col = ['#ff7a93', '#ffb45e', '#c79bff', '#6fe0c8'][Math.floor((r ? r() : 0.3) * 4)];
          ctx.strokeStyle = col;
          ctx.lineCap = 'round';
          ctx.lineWidth = s * 0.12;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - s * 0.6);
          ctx.moveTo(x, y - s * 0.3);
          ctx.lineTo(x - s * 0.3, y - s * 0.7);
          ctx.moveTo(x, y - s * 0.4);
          ctx.lineTo(x + s * 0.3, y - s * 0.8);
          ctx.stroke();
          break;
        }
        case 'fan':
          ctx.fillStyle = '#c75b8f';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.arc(x, y, s * 0.6, Math.PI * 1.15, Math.PI * 1.85);
          ctx.fill();
          break;
        case 'crystal': {
          const glow = 0.6 + 0.4 * Math.sin(t * 2 + x);
          ctx.fillStyle = `rgba(140,230,255,${0.6 * glow})`;
          ctx.beginPath();
          ctx.moveTo(x - s * 0.15, y);
          ctx.lineTo(x, y - s * 0.7);
          ctx.lineTo(x + s * 0.15, y);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + s * 0.1, y);
          ctx.lineTo(x + s * 0.3, y - s * 0.45);
          ctx.lineTo(x + s * 0.4, y);
          ctx.fill();
          break;
        }
        case 'hull': {
          ctx.fillStyle = '#5e4632';
          ctx.beginPath();
          ctx.moveTo(x - s * 1.4, y);
          ctx.quadraticCurveTo(x - s * 1.2, y - s * 1.1, x - s * 0.2, y - s * 1.2);
          ctx.lineTo(x + s * 1.1, y - s * 0.9);
          ctx.lineTo(x + s * 1.3, y);
          ctx.fill();
          ctx.strokeStyle = '#3e2d20';
          ctx.lineWidth = 2;
          for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x - s * 1.3, y - i * s * 0.25);
            ctx.lineTo(x + s * 1.2, y - i * s * 0.22);
            ctx.stroke();
          }
          ctx.fillStyle = '#1d3a4f';
          A.ellipse(ctx, x + s * 0.3, y - s * 0.55, s * 0.12, s * 0.12);
          ctx.fill();
          break;
        }
        case 'barrel':
          ctx.fillStyle = '#8a5d3b';
          A.ellipse(ctx, x, y - s * 0.3, s * 0.25, s * 0.32);
          ctx.fill();
          ctx.strokeStyle = '#4b4b4b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - s * 0.25, y - s * 0.45);
          ctx.lineTo(x + s * 0.25, y - s * 0.45);
          ctx.moveTo(x - s * 0.25, y - s * 0.15);
          ctx.lineTo(x + s * 0.25, y - s * 0.15);
          ctx.stroke();
          break;
        case 'chest':
          OR.drawChest(ctx, x, y - s * 0.25, s * 0.35, false);
          break;
        case 'fishschool':
          for (let i = 0; i < 4; i++) A.drawFish(ctx, x + i * s * 0.3, y - s * (1 + (i % 2) * 0.3) + Math.sin(t * 2 + i) * 4, s * 0.3, Math.PI, t, '#9fd0ff', 0.5);
          break;
      }
    }

    drawCeiling(ctx, px, t) {
      const G = this.G;
      ctx.fillStyle = '#231d33';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= G.W + 30; x += 30) {
        const wx = x + px * 0.6;
        const drop = G.surface * (0.25 + 0.12 * Math.sin(wx * 0.01) + (Math.sin(wx * 0.07) > 0.85 ? 0.25 : 0));
        ctx.lineTo(x, drop);
      }
      ctx.lineTo(G.W, 0);
      ctx.fill();
    }

    // Water surface drawn IN FRONT of the otters so their lower halves look submerged.
    drawFront(ctx, t) {
      const G = this.G, px = this.adv.st.dist * G.S, pal = this.palette();
      const col = this.mixed(pal, 'water', 0);
      ctx.fillStyle = U.rgba(col, 0.5);
      ctx.beginPath();
      ctx.moveTo(0, G.H);
      for (let x = 0; x <= G.W + 16; x += 16) ctx.lineTo(x, G.surface + Math.sin((x + px) * 0.03 + t * 2) * G.S * 0.05 + G.S * 0.05);
      ctx.lineTo(G.W, G.H);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= G.W + 16; x += 16) {
        const y = G.surface + Math.sin((x + px) * 0.03 + t * 2) * G.S * 0.05 + G.S * 0.05;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (pal.a.dark) {
        ctx.fillStyle = `rgba(10,5,30,${pal.a.dark * (1 - pal.blend)})`;
        ctx.fillRect(0, 0, G.W, G.H);
      }
    }
  }

  // Treasure chest, shared by scenery and pickups.
  OR.drawChest = function (ctx, x, y, s, open) {
    ctx.fillStyle = '#9a5d2e';
    ctx.fillRect(x - s, y - s * 0.5, s * 2, s * 1.1);
    ctx.fillStyle = '#b8743f';
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.5);
    ctx.quadraticCurveTo(x, y - s * (open ? 1.6 : 1.2), x + s, y - s * 0.5);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x - s * 0.15, y - s * 0.55, s * 0.3, s * 0.4);
    ctx.fillRect(x - s, y - s * 0.1, s * 2, s * 0.12);
  };

  OR.Scroller = Scroller;
})(window.OR);
