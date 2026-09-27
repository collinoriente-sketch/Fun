// ============================================================================
//  OPTIONAL ART & AUDIO
//  Everything in the game is drawn in code, so no files are required.
//  To use your own image or sound, put the file in /assets/... and list it below.
//  Only listed files are requested, and anything that fails to load is ignored,
//  so a missing or misspelled file just falls back to the built-in artwork.
//
//  Keys the game looks for (any subset is fine):
//    otters/natalie  otters/collin  otters/winston  otters/gussy  otters/finny
//    bosses/dawson  bosses/billy  bosses/matt  bosses/mike  bosses/tommy  bosses/collint  bosses/tsimberg
//    backgrounds/ocean  backgrounds/beach  backgrounds/kelp  backgrounds/reef  backgrounds/cave  backgrounds/wreck
//    items/shell  items/kelp  items/metal  items/pearl  items/fish  items/chest
//    effects/kelpbomb
//    audio/boss-<id> (e.g. audio/boss-dawson) plays as that boss's intro sting
//
//  Images are drawn centred and scaled to the size of the thing they replace, so
//  square-ish transparent PNGs work best. Backgrounds are stretched across the screen.
// ============================================================================
(function (OR) {
  'use strict';

  OR.ASSET_MANIFEST = {
    // 'bosses/dawson': 'assets/bosses/dawson.png',
    // 'otters/natalie': 'assets/otters/natalie.png',
    // 'backgrounds/beach': 'assets/backgrounds/beach.png',
    // 'audio/boss-dawson': 'assets/audio/boss-dawson.mp3',
  };

  const images = {};
  const sounds = {};

  OR.Assets = {
    load() {
      for (const key in OR.ASSET_MANIFEST) {
        const src = OR.ASSET_MANIFEST[key];
        if (key.startsWith('audio/')) {
          try {
            const a = new Audio();
            a.preload = 'auto';
            a.addEventListener('canplaythrough', () => (sounds[key] = a), { once: true });
            a.addEventListener('error', () => delete sounds[key], { once: true });
            a.src = src;
          } catch (e) {
            /* no audio element support: keep the synth sounds */
          }
        } else {
          const img = new Image();
          img.onload = () => (images[key] = img);
          img.onerror = () => delete images[key];
          img.src = src;
        }
      }
    },
    // A loaded image, or null (then draw the procedural version).
    img(key) {
      return images[key] || null;
    },
    // Draw an image centred at (x, y) fitting a w x h box. Returns false if there is no image.
    draw(ctx, key, x, y, w, h, flip) {
      const img = images[key];
      if (!img) return false;
      const k = Math.min(w / img.width, h / img.height);
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k);
      ctx.restore();
      return true;
    },
    // Play a custom sound if one was provided. Returns false so the caller can use its synth sound.
    play(key, volume) {
      const a = sounds[key];
      if (!a) return false;
      try {
        const c = a.cloneNode();
        c.volume = volume == null ? 0.7 : volume;
        c.play().catch(() => {});
      } catch (e) {
        return false;
      }
      return true;
    },
  };
})(window.OR);
