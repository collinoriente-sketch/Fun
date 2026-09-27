// DOM heads-up display for Adventure mode: resources, boss meter, boss health, ability buttons,
// the big TAP ATTACK button, the ultimate meter, the upgrade sheet and the victory card.
(function (OR) {
  'use strict';
  const U = OR.util;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n)));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  class AdvUI {
    constructor(adv) {
      this.adv = adv;
      this.root = $('adv');
      this.el = {
        res: $('advRes'), biome: $('advBiome'), meterLbl: $('advMeterLbl'), meterFill: $('advMeterFill'),
        bossBar: $('advBossBar'), bbName: $('bbName'), bbTitle: $('bbTitle'), bbMods: $('bbMods'), bbFill: $('bbFill'), bbGhost: $('bbGhost'), bbText: $('bbText'),
        abil: $('advAbilities'), upBtn: $('advUpgrade'), upDot: $('advUpDot'), tap: $('advTap'), ult: $('advUlt'), ultFill: $('advUltFill'), ultLbl: $('advUltLbl'),
        sheet: $('advSheet'), sheetBody: $('advSheetBody'), sheetClose: $('advSheetClose'), card: $('advCard'),
        home: $('advHome'), music: $('advMusic'), mute: $('advMute'),
      };
      const e = this.el;
      // resource chips
      e.res.innerHTML = OR.RESOURCES.map((r) => `<div class="chip" title="${r.name}"><span>${r.icon}</span><b data-res="${r.id}">0</b></div>`).join('') +
        '<div class="chip power" title="Otter power"><span>⚡</span><b id="advPower">0</b></div>';
      this.resEls = {};
      e.res.querySelectorAll('[data-res]').forEach((b) => (this.resEls[b.dataset.res] = b));
      this.powerEl = $('advPower');
      // ability buttons
      e.abil.innerHTML = OR.ABILITIES.map(
        (a, i) => `<button type="button" class="abil" data-ab="${a.id}" title="${a.name} (${i + 1})" hidden><span class="ai">${a.icon}</span><span class="an">${a.name}</span><i class="cdv"></i></button>`
      ).join('');
      this.abBtns = {};
      e.abil.querySelectorAll('[data-ab]').forEach((b) => {
        this.abBtns[b.dataset.ab] = b;
        b.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          adv.useAbility(b.dataset.ab);
        });
      });
      // the big tap button: pointerdown so fast taps all register
      e.tap.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        adv.tapAttack();
        e.tap.classList.remove('pressed');
        void e.tap.offsetWidth;
        e.tap.classList.add('pressed');
      });
      e.ult.addEventListener('click', () => adv.useFinale());
      e.upBtn.addEventListener('click', () => this.openSheet());
      e.sheetClose.addEventListener('click', () => this.closeSheet());
      e.sheet.addEventListener('click', (ev) => {
        if (ev.target === e.sheet) this.closeSheet();
        const buy = ev.target.closest('[data-buy]');
        if (buy && !buy.disabled) {
          if (adv.buyUpgrade(buy.dataset.buy)) this.renderSheet();
        }
      });
      e.card.addEventListener('click', () => (e.card.hidden = true));
      e.sheet.addEventListener('change', (ev) => {
        if (ev.target.id === 'advAuto') {
          adv.st.autoUpgrade = ev.target.checked;
          adv.save();
        }
      });
      e.home.addEventListener('click', () => adv.game.setView('raft'));
      e.music.addEventListener('click', () => {
        adv.game.toggleMusic();
        this.refreshSound();
      });
      e.mute.addEventListener('click', () => {
        adv.game.toggleMute();
        this.refreshSound();
      });
      // keyboard: space = tap, 1-8 = abilities, U = upgrades, F = ultimate
      document.addEventListener('keydown', (ev) => {
        if (!adv.active || ev.target.closest('input,textarea')) return;
        if (ev.code === 'Space') {
          ev.preventDefault();
          adv.tapAttack();
        } else if (/^Digit[1-8]$/.test(ev.code)) {
          const ab = OR.ABILITIES[+ev.code.slice(5) - 1];
          if (ab) adv.useAbility(ab.id);
        } else if (ev.key === 'u' || ev.key === 'U') this.el.sheet.hidden ? this.openSheet() : this.closeSheet();
        else if (ev.key === 'f' || ev.key === 'F') adv.useFinale();
        else if (ev.key === 'Escape') this.closeSheet();
      });
      this.t = 0;
      this.shown = {};
    }

    show(on) {
      this.root.hidden = !on;
      this.modeChanged();
      this.refreshSound();
    }

    refreshSound() {
      const a = this.adv.audio;
      this.el.mute.textContent = a.muted ? '🔇' : '🔈';
      this.el.music.classList.toggle('off', !a.musicOn || a.muted);
    }

    modeChanged() {
      const m = this.adv.mode, boss = m === 'boss';
      this.root.classList.toggle('bossmode', boss || m === 'bossIntro');
      this.el.tap.hidden = !boss;
      this.el.ult.hidden = !boss;
      this.el.bossBar.hidden = !(boss || m === 'victory');
      if (boss && this.adv.boss) {
        const b = this.adv.boss;
        this.el.bbName.textContent = b.name;
        this.el.bbTitle.textContent = b.def.title + (b.cycle ? ` · Loop ${b.cycle + 1}` : '');
        this.el.bbMods.textContent = b.mods.map((x) => x.icon).join(' ');
        this.el.bbMods.title = b.mods.map((x) => x.name).join(', ');
        this.el.bossBar.style.setProperty('--boss', b.def.color);
      }
    }

    update(dt) {
      this.t -= dt;
      if (this.t > 0) return;
      this.t = 0.1;
      const adv = this.adv, st = adv.st, e = this.el;
      for (const k in this.resEls) {
        const v = fmt(st.res[k] || 0);
        if (this.shown[k] !== v) {
          this.shown[k] = v;
          this.resEls[k].textContent = v;
        }
      }
      const pw = fmt(adv.stats.power);
      if (this.shown.power !== pw) {
        this.shown.power = pw;
        this.powerEl.textContent = pw;
      }
      const biome = adv.scroller.biomeAt(st.dist + adv.G.W / adv.G.S / 2).name;
      if (this.shown.biome !== biome) {
        this.shown.biome = biome;
        e.biome.textContent = '🧭 ' + biome;
      }
      // boss meter
      const next = adv.nextBossDef();
      const k = U.clamp(st.meter / adv.meterNeed(), 0, 1);
      e.meterFill.style.width = (adv.mode === 'explore' ? k * 100 : 100) + '%';
      const lbl = adv.mode === 'explore' ? `Next boss: ${next.name}` : adv.mode === 'victory' ? 'Victory!' : `Boss: ${adv.boss ? adv.boss.name : next.name}`;
      if (this.shown.lbl !== lbl) {
        this.shown.lbl = lbl;
        e.meterLbl.textContent = lbl;
      }
      // boss health
      const b = adv.boss;
      if (b && !e.bossBar.hidden) {
        const hk = b.hp / b.maxHp;
        e.bbFill.style.width = hk * 100 + '%';
        this.ghost = this.ghost == null ? hk : Math.max(hk, this.ghost - 0.02);
        e.bbGhost.style.width = this.ghost * 100 + '%';
        e.bbText.textContent = `${fmt(Math.ceil(b.hp))} / ${fmt(b.maxHp)}`;
      } else this.ghost = null;
      // abilities
      for (const ab of OR.ABILITIES) {
        const btn = this.abBtns[ab.id];
        const unlocked = ab.id === 'sunscreen' ? adv.mode === 'boss' : adv.unlocked[ab.id];
        const visible = unlocked && (adv.mode === 'boss' || ab.explore);
        if (btn.hidden === visible) btn.hidden = !visible;
        if (!visible) continue;
        const cd = adv.cd[ab.id] || 0, total = ab.cd(adv);
        btn.style.setProperty('--cd', cd > 0 ? (cd / total) * 360 + 'deg' : '0deg');
        btn.classList.toggle('ready', cd <= 0);
        btn.classList.toggle('active', adv.effectActive(ab.id));
        btn.classList.toggle('urgent', adv.highlight === ab.id);
      }
      // ultimate
      const u = st.ult;
      e.ultFill.style.height = u + '%';
      e.ult.classList.toggle('ready', u >= 100);
      e.ultLbl.textContent = u >= 100 ? 'SUPERNOVA!' : Math.floor(u) + '%';
      // upgrade dot when something is affordable
      const any = OR.UPGRADES.some((up) => adv.canBuy(up));
      e.upDot.hidden = !any;
    }

    openSheet() {
      this.renderSheet();
      this.el.sheet.hidden = false;
    }
    closeSheet() {
      this.el.sheet.hidden = true;
    }

    renderSheet() {
      const adv = this.adv, st = adv.st, s = adv.stats;
      const stage = OR.visualStage(st);
      const stageNames = ['', 'Cute & Normal', 'Fluffy & Shelled', 'Armored', 'Metal-Armored', 'Aura Awakened', 'Way Too Powerful'];
      const cards = OR.UPGRADES.map((up) => {
        const lvl = st.up[up.id] || 0;
        const cost = OR.upgradeCost(up, lvl);
        const locked = up.needs && Object.keys(up.needs).some((k) => (st.up[k] || 0) < up.needs[k]);
        const can = adv.canBuy(up);
        const costTxt = Object.keys(cost).map((k) => `<span class="${(st.res[k] || 0) >= cost[k] ? '' : 'short'}">${OR.RES_ICON[k]} ${fmt(cost[k])}</span>`).join(' ');
        const needTxt = locked ? 'Needs ' + Object.keys(up.needs).map((k) => OR.UPGRADES.find((u) => u.id === k).name).join(', ') : costTxt;
        return `<div class="upcard${can ? ' can' : ''}${locked ? ' locked' : ''}">
          <div class="uc-top"><span class="uc-ic">${up.icon}</span><div><b>${esc(up.name)}</b><small>Level ${lvl}</small></div></div>
          <p>${esc(up.desc)}</p>
          <div class="uc-bot"><span class="cost">${needTxt}</span><button type="button" data-buy="${up.id}" ${can ? '' : 'disabled'}>Buy</button></div>
        </div>`;
      }).join('');
      const rewards = Object.keys(OR.REWARDS).map((k) => {
        const r = OR.REWARDS[k], n = st.rewards[k] || 0;
        return `<li class="${n ? 'got' : ''}"><span>${n ? r.icon : '🔒'}</span><div><b>${esc(r.name)}${n > 1 ? ' ×' + n : ''}</b><small>${esc(n ? r.desc : 'Defeat ' + OR.BOSSES.find((b) => b.reward === k).name)}</small></div></li>`;
      }).join('');
      const bosses = OR.BOSSES.map((b, i) => {
        const beaten = st.bossIndex > i || Math.floor(st.bossIndex / OR.BOSSES.length) > 0;
        const isNext = st.bossIndex % OR.BOSSES.length === i;
        return `<li class="${beaten ? 'got' : ''}${isNext ? ' next' : ''}"><span>${beaten ? '✅' : isNext ? '👉' : '❔'}</span><div><b>${esc(beaten || isNext ? b.name : '???')}</b><small>${esc(beaten || isNext ? b.title : 'Keep exploring')}</small></div></li>`;
      }).join('');
      this.el.sheetBody.innerHTML = `
        <div class="powerbox">
          <div><small>Otter Power</small><b>⚡ ${fmt(s.power)}</b></div>
          <div><small>Look</small><b>Stage ${stage}: ${stageNames[stage]}</b></div>
        </div>
        <ul class="statline">
          <li>Tap <b>${fmt(s.tapDmg)}</b></li><li>Auto <b>${fmt(s.autoDmg)}</b></li><li>Crit <b>${Math.round(s.critChance * 100)}%</b></li>
          <li>Health <b>${fmt(s.maxHp)}</b></li><li>Damage taken <b>${Math.round(s.dmgTaken * 100)}%</b></li><li>Loot <b>×${s.loot.toFixed(1)}</b></li>
        </ul>
        <h3>Upgrades <label class="auto"><input type="checkbox" id="advAuto" ${st.autoUpgrade ? 'checked' : ''}> 🤖 Auto-buy while I'm away</label></h3><div class="upgrid">${cards}</div>
        <h3>Boss rewards</h3><ul class="list">${rewards}</ul>
        <h3>Boss rotation <small>(loops forever, harder each time)</small></h3><ul class="list">${bosses}</ul>
        <p class="foot">Tip: Space taps, 1–8 use abilities, F fires the Supernova, U opens this.</p>`;
    }

    showReward(b, reward, got) {
      const e = this.el.card;
      const loot = Object.keys(got).map((k) => `<span>${OR.RES_ICON[k]} +${fmt(got[k])}</span>`).join('');
      e.innerHTML = `<div class="rc-inner">
        <small>${esc(b.name)} defeated!</small>
        <div class="rc-icon">${reward.icon}</div>
        <b>${esc(reward.name)}</b>
        <p>${esc(reward.desc)}</p>
        <div class="rc-loot">${loot}</div>
        <em>Tap to continue</em></div>`;
      e.hidden = false;
      clearTimeout(this.cardT);
      this.cardT = setTimeout(() => (e.hidden = true), 6000);
    }
  }

  OR.AdvUI = AdvUI;
})(window.OR);
