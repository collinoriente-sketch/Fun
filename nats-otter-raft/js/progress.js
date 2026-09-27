// Gentle progression: hearts, collections, unlocks and the family moments album. Saved to localStorage.
(function (OR) {
  'use strict';
  const U = OR.util;
  const KEY = 'natsOtterRaft.v1';

  // Unlocks happen automatically once the family has earned enough; nothing is ever spent or lost.
  OR.UNLOCKS = [
    { id: 'kelp', icon: '🌿', name: 'Kelp Patch', desc: 'A cozy kelp bed. Nappers near it wrap up so they don\'t drift.', need: { hearts: 8 } },
    { id: 'shells', icon: '🐚', name: 'Shell Shallows', desc: 'Pretty shells start turning up on the sea floor.', need: { hearts: 16 } },
    { id: 'twirl', icon: '🌀', name: 'Happy Twirls', desc: 'Otters sometimes spin with joy.', need: { hearts: 26 } },
    { id: 'log', icon: '🪵', name: 'Driftwood Lounge', desc: 'A floating log for sunbathing.', need: { hearts: 38, rocks: 3 } },
    { id: 'sunset', icon: '🌅', name: 'Sunset Bay', desc: 'A new place to float, in warm evening light.', need: { hearts: 52 } },
    { id: 'buoy', icon: '🔔', name: 'Bell Buoy', desc: 'A little buoy that rings softly now and then.', need: { hearts: 66, shells: 4 } },
    { id: 'cheer', icon: '🙌', name: 'Family Cheer', desc: 'Everyone holds paws and does the wave together.', need: { hearts: 85 } },
    { id: 'forest', icon: '🌱', name: 'Kelp Forest', desc: 'More kelp patches, more cozy naps.', need: { hearts: 105, rocks: 8 } },
    { id: 'lagoon', icon: '🌙', name: 'Moonlit Lagoon', desc: 'A starry night with glowing plankton.', need: { hearts: 135, shells: 8 } },
    { id: 'lanterns', icon: '🏮', name: 'Floating Lanterns', desc: 'Soft paper lanterns drift past.', need: { hearts: 170 } },
    { id: 'lighthouse', icon: '🗼', name: 'Tiny Lighthouse', desc: 'A lighthouse on the far island.', need: { hearts: 220, rocks: 15, shells: 12 } },
  ];

  const NEED_ICON = { hearts: '💗', rocks: '🪨', shells: '🐚', pearls: '✨' };

  class Progress {
    constructor() {
      const saved = U.storage.get(KEY, null) || {};
      this.state = Object.assign(
        { hearts: 0, rocks: 0, shells: 0, pearls: 0, happiness: 70, unlocked: [], moments: {}, area: 'cove', muted: false, visits: 0 },
        saved
      );
      this.state.visits++;
      this.dirty = true;
      this.saveT = 0;
    }
    has(id) { return this.state.unlocked.includes(id); }
    add(key, n) {
      this.state[key] = (this.state[key] || 0) + n;
      this.dirty = true;
    }
    met(u) {
      return Object.keys(u.need).every((k) => (this.state[k] || 0) >= u.need[k]);
    }
    // Returns newly unlocked entries.
    check() {
      const fresh = [];
      for (const u of OR.UNLOCKS) {
        if (!this.has(u.id) && this.met(u)) {
          this.state.unlocked.push(u.id);
          fresh.push(u);
          this.dirty = true;
        }
      }
      return fresh;
    }
    nextUnlock() {
      return OR.UNLOCKS.find((u) => !this.has(u.id)) || null;
    }
    needText(u) {
      return Object.keys(u.need)
        .map((k) => `${NEED_ICON[k]} ${Math.min(this.state[k] || 0, u.need[k])}/${u.need[k]}`)
        .join('  ');
    }
    recordMoment(id) {
      const first = !this.state.moments[id];
      this.state.moments[id] = (this.state.moments[id] || 0) + 1;
      this.dirty = true;
      return first;
    }
    tick(dt) {
      this.saveT += dt;
      if (this.dirty && this.saveT > 4) this.save();
    }
    save() {
      this.saveT = 0;
      this.dirty = false;
      U.storage.set(KEY, this.state);
    }
  }

  OR.Progress = Progress;
})(window.OR);
