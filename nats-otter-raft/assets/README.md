# Custom art & sound (optional)

Everything in the game is drawn in code, so this folder can stay empty. To swap in your own
images or sounds:

1. Put the file in the matching folder, e.g. `assets/bosses/dawson.png`.
2. List it in `OR.ASSET_MANIFEST` at the top of `js/adventure/assets.js`:
   ```js
   OR.ASSET_MANIFEST = {
     'bosses/dawson': 'assets/bosses/dawson.png',
   };
   ```
3. Reload. If the file is missing or fails to load, the game quietly keeps the built-in drawing.

| Key | Replaces |
|---|---|
| `otters/natalie`, `otters/collin`, `otters/winston`, `otters/gussy`, `otters/finny` | an otter in Adventure mode |
| `bosses/dawson`, `bosses/billy`, `bosses/matt`, `bosses/mike`, `bosses/tommy`, `bosses/collint`, `bosses/tsimberg` | a boss |
| `backgrounds/ocean`, `beach`, `kelp`, `reef`, `cave`, `wreck` | the sky/scenery for that biome (stretched to the screen) |
| `items/shell`, `kelp`, `metal`, `pearl`, `fish`, `chest` | a pickup |
| `audio/boss-<id>` (e.g. `audio/boss-dawson`) | that boss's intro sting (mp3/ogg/wav) |

Tips: transparent PNGs work best. Images are centred and scaled to fit the thing they
replace (bosses face **left**, towards the otters). Keep files small so phones load them quickly.
