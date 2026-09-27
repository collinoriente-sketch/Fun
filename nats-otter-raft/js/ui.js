// DOM overlay: counters, buttons, toasts and the Raft Journal.
(function (OR) {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const BIOS = {
    natalie: 'Mom. Affectionate, keeps an eye on everyone, loves a cuddle with Collin.',
    collin: 'Dad. Playful rock enthusiast. Always has a good one tucked away.',
    winston: 'Smallest and zoomiest. Wanders off, always comes back.',
    gussy: 'The fluffiest. Would like a nap, thank you.',
    finny: 'Curious and a little chaotic. Follows Dad, chases anything shiny.',
  };

  class UI {
    constructor(game) {
      this.g = game;
      this.el = {
        hearts: $('nHearts'), rocks: $('nRocks'), shells: $('nShells'), pearls: $('nPearls'),
        happy: $('happyFill'), next: $('nextUnlock'), toasts: $('toasts'), hint: $('hint'),
        journal: $('journal'), jBody: $('journalBody'), dot: $('journalDot'),
        call: $('btnCall'), nap: $('btnNap'), cheer: $('btnCheer'), jBtn: $('btnJournal'), mute: $('btnMute'), music: $('btnMusic'), free: $('btnFree'), close: $('btnClose'),
      };
      this.shown = {};
      const e = this.el;
      e.call.addEventListener('click', () => game.callFamily());
      e.nap.addEventListener('click', () => game.napTime());
      e.cheer.addEventListener('click', () => game.familyCheer());
      e.jBtn.addEventListener('click', () => this.openJournal());
      document.getElementById('btnAdventure').addEventListener('click', () => game.setView('adventure'));
      e.close.addEventListener('click', () => this.closeJournal());
      e.journal.addEventListener('click', (ev) => {
        if (ev.target === e.journal) this.closeJournal();
        const area = ev.target.closest('[data-area]');
        if (area && !area.disabled) {
          game.setArea(area.dataset.area);
          this.renderJournal();
        }
      });
      e.free.addEventListener('click', () => game.freeRoam());
      e.music.addEventListener('click', () => {
        game.toggleMusic();
        this.refresh();
      });
      e.mute.addEventListener('click', () => {
        game.toggleMute();
        this.refresh();
      });
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') this.closeJournal();
      });
      this.refresh();
    }

    refresh() {
      const g = this.g, e = this.el;
      e.cheer.hidden = !g.progress.has('cheer');
      e.mute.textContent = g.audio.muted ? '🔇' : '🔈';
      e.mute.setAttribute('aria-label', g.audio.muted ? 'Turn sound on' : 'Turn sound off');
      e.mute.title = e.mute.getAttribute('aria-label');
      const musicOn = g.audio.musicOn && !g.audio.muted;
      e.music.classList.toggle('off', !musicOn);
      e.music.setAttribute('aria-label', musicOn ? 'Turn music off' : 'Turn music on');
      e.music.title = e.music.getAttribute('aria-label');
      // show which mode is running, and how to leave it
      const mode = g.mode && g.mode.type;
      e.free.hidden = !mode;
      e.call.classList.toggle('active', mode === 'raft');
      e.nap.classList.toggle('active', mode === 'nap');
      e.cheer.classList.toggle('active', mode === 'cheer');
    }

    update() {
      const s = this.g.progress.state, e = this.el;
      for (const k of ['hearts', 'rocks', 'shells', 'pearls']) {
        if (this.shown[k] !== s[k]) {
          if (this.shown[k] != null) {
            e[k].parentElement.classList.remove('bump');
            void e[k].parentElement.offsetWidth;
            e[k].parentElement.classList.add('bump');
          }
          this.shown[k] = s[k];
          e[k].textContent = s[k];
        }
      }
      const h = Math.round(this.g.happiness);
      if (this.shown.h !== h) {
        this.shown.h = h;
        e.happy.style.width = h + '%';
        e.happy.parentElement.parentElement.title = `Family happiness: ${h}%`;
      }
      const nx = this.g.progress.nextUnlock();
      const txt = nx ? `Next: ${nx.icon} ${nx.name}  ·  ${this.g.progress.needText(nx)}` : 'Everything unlocked! 💕';
      if (this.shown.next !== txt) {
        this.shown.next = txt;
        e.next.textContent = txt;
      }
    }

    toast(text, icon) {
      for (const t of this.el.toasts.children) if (!t.classList.contains('out') && t.dataset.text === text) return;
      const d = document.createElement('div');
      d.dataset.text = text;
      d.className = 'toast';
      d.innerHTML = `<span class="ti"></span><span class="tt"></span>`;
      d.querySelector('.ti').textContent = icon || '💕';
      d.querySelector('.tt').textContent = text;
      this.el.toasts.appendChild(d);
      while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
      setTimeout(() => d.classList.add('out'), 3800);
      setTimeout(() => d.remove(), 4400);
    }

    hideHint() {
      this.el.hint.classList.add('gone');
    }

    markNew() {
      this.el.dot.hidden = false;
    }

    openJournal() {
      this.el.dot.hidden = true;
      this.renderJournal();
      this.el.journal.hidden = false;
      this.el.close.focus();
    }
    closeJournal() {
      this.el.journal.hidden = true;
    }

    renderJournal() {
      const g = this.g, P = g.progress, s = P.state;
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      const areas = [
        ['cove', '🌊', 'Kelp Cove', true],
        ['sunset', '🌅', 'Sunset Bay', P.has('sunset')],
        ['lagoon', '🌙', 'Moonlit Lagoon', P.has('lagoon')],
      ];
      const fam = OR.FAMILY.map(
        (d) => `<li><span class="swatch" style="background:${d.pal.fur};border-color:${d.pal.line}"></span><b>${esc(d.name)}</b><span>${esc(BIOS[d.id] || '')}</span></li>`
      ).join('');
      const places = areas
        .map(
          ([id, ic, name, open]) =>
            `<button class="place${s.area === id ? ' on' : ''}" data-area="${id}" ${open ? '' : 'disabled'}><span>${ic}</span>${esc(open ? name : 'Locked')}</button>`
        )
        .join('');
      const unlocks = OR.UNLOCKS.map((u) => {
        const got = P.has(u.id);
        return `<li class="${got ? 'got' : ''}"><span class="ui">${got ? u.icon : '🔒'}</span><div><b>${esc(u.name)}</b><small>${esc(got ? u.desc : P.needText(u))}</small></div></li>`;
      }).join('');
      const seen = OR.EVENTS.filter((e) => s.moments[e.id]).length;
      const moments = OR.EVENTS.map((e) => {
        const n = s.moments[e.id];
        return `<li class="${n ? 'got' : ''}"><span class="ui">${n ? e.icon : '❔'}</span><div><b>${esc(n ? e.title : 'Not seen yet')}</b>${n ? `<small>Seen ${n}×</small>` : ''}</div></li>`;
      }).join('');
      this.el.jBody.innerHTML = `
        <section><h3>The family</h3><ul class="family">${fam}</ul></section>
        <section><h3>Places to float</h3><div class="places">${places}</div></section>
        <section><h3>Raft treasures</h3><ul class="list">${unlocks}</ul></section>
        <section><h3>Family moments <span class="count">${seen}/${OR.EVENTS.length}</span></h3><ul class="list">${moments}</ul></section>
        <p class="foot">Nothing here can be lost. Leave the family floating and they'll keep living their little lives.</p>`;
    }
  }

  OR.UI = UI;
})(window.OR);
