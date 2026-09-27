# 🦦 Nat's Otter Raft

A cozy little sea otter family you can leave floating in a browser tab. They swim, nap, groom, dive for rocks,
chase fish and hold paws. Now and then they drift together into a raft.

**The family**

| | | |
|---|---|---|
| **Natalie** | Mom | Caramel fur, a pink flower, checks on the babies, cuddles with Collin |
| **Collin** | Dad | Dark chocolate fur with a tuft, loves rocks (tosses them, taps them, gifts them) |
| **Winston** | Baby | Grey, the smallest and zoomiest. Wanders off and always comes back |
| **Gussy** | Baby | White and extra fluffy, sleepy, likes floating close to Mom |
| **Finny** | Baby | Black, curious and a bit chaotic, follows Dad, chases anything shiny |

## ⚔️ Adventure mode (side-scrolling boss rush)

Tap **⚔️ Adventure** in the raft (or **🏝️ Raft** to go back). The game remembers which mode you were in.

- **Explore:** the family swims through Open Ocean, Sunny Beach, Kelp Forest, Coral Reef, Sea Cave and a Shipwreck.
  They grab 🐚 shells, 🌿 kelp, ⚙️ metal scraps, 💎 pearls, 🐟 fish and 💰 treasure chests on their own and bonk
  crabs, jellyfish, pufferfish and gulls with thrown shells. Tap pickups to grab them, tap enemies to throw at them.
- **Upgrades (⬆️):** spend resources on 12 upgrades. They visibly change the otters, from cute to shell clips,
  armor, metal helmets, giant shell shields, auras, energy tails and halos. The **Scrap Refinery** turns metal scraps
  into 🔩 refined metal over time. **Auto-buy** (on by default) spends for you while you're away.
- **Bosses:** the boss meter fills as you travel, then **BOSS INCOMING!** Only one boss at a time, in order:
  **Dawson** (tactical snake: burrows, tap when he pops up), **Billy** (emo dolphin: clones, find the sparkly tear),
  **Matt** (ranked turtle: hides in his shell, hit him when it opens), **Mike** (construction dwarf: smash his
  barricades), **Tommy** (mad-scientist dragonfly: mutates into giant/tiny/glowing forms), **Collin T** (gym giraffe:
  tap fast to interrupt his flex) and **Tsimberg** (sunscreen wizard: hit 🧴 Sunscreen before his giant sun lands).
  Then the rotation loops forever, harder each time, with random modifiers (Armored, Swift, Giant, Regenerating…).
- **Boss fights:** hit **TAP ATTACK** (or tap the boss or Space). Taps build a combo up to +100%, and you don't need to mash.
  Tap incoming projectiles to swat them. Abilities: 💣 Kelp Bomb, 🌀 Shell Slash, 👥 Shadow Otters,
  🟢 Kelp Cyclone Sphere, ☁️ Spirit Fluff, 🧴 Sunscreen, ✨ Ultimate Fluff Form and 🌪️ Kelp-Tail Spirit.
  The 🌟 meter fires the **Grand Raft Supernova**, where the whole family combines into one giant beam.
- **You can't lose.** If the family runs out of health they get dizzy for a few seconds (tap to cheer them up),
  then bounce back with bonus Determination. Bosses also tire out in long fights, so leaving it running always progresses,
  and after 15 idle seconds the family casts abilities on their own.
- Keys: Space = tap, 1–8 = abilities, F = Supernova, U = upgrades.

## Run it

No build step and no dependencies. Just open the page:

- **Easiest:** double-click `index.html` (it works straight from `file://`).
- **Or serve the folder** (nicer on phones on the same Wi-Fi):
  ```sh
  cd nats-otter-raft
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```
- **Single file to share:** `python3 tools/bundle.py` writes `dist/nats-otter-raft.html` with everything inlined.

## How to play

- **Tap an otter** and it bounces, waves, squeaks and says something in character.
- **Drag an otter** to scoop it up and plop it somewhere else.
- **Press and hold on an otter** for a tummy rub (happy wiggly feet, lots of hearts).
- **Tap the water** to make a ripple. The curious ones (Finny, Winston) swim over to look.
- **Tap a sparkle** (the glinting rings in the water) to collect that rock, shell or pearl right away. The otters dive for them on their own too.
- **Tap floating bubbles** to pop them.
- **Call the Family** 🤝: everyone lines up and holds paws, Natalie, Collin, Winston, Gussy, Finny.
- **Nap Time** 🌙: they gather (by the kelp if there's some), hold paws and snooze.
- **Family Cheer** 🙌 (unlockable): joined paws go up in a wave along the raft.
- **Free Roam** 🌊 appears while the family is in a raft, nap or cheer. Tap it to let everyone swim off and do their own thing again (a nap wakes up). Modes also end on their own after a while.
- **🧤 Moonwalk power-up:** every so often a sparkly sequined glove floats across the water. Tap it and the family
  puts on fedoras, one rhinestone glove and white socks, and dances a routine under spotlights and a disco ball:
  moonwalk, spins, a toe stand ("ow!"), a groove and a finale. The water lights up in tiles under their feet, and an
  original funk groove plays (made in the browser, not a real song). It lasts about 22 seconds, and Free Roam ends it early.
- **🎵 / 🔈** (top left) toggle the background music and all sound. The music is a slow, generative lullaby made in the browser, and it is softer and slower in the Moonlit Lagoon.
- **📔 Journal**: meet the family, switch places, see unlocks and the family moments you've seen.

Nothing can be lost and nothing goes down if you walk away. Happiness settles gently, and hearts only go up.

### Unlocks

Hearts come from interacting, from otters holding paws and from family moments. The family also earns a few on its own over time.
Unlocks happen automatically: Kelp Patch, Shell Shallows, Happy Twirls, Driftwood Lounge, Sunset Bay, Bell Buoy,
Family Cheer, Kelp Forest, Moonlit Lagoon, Floating Lanterns and a Tiny Lighthouse.

### Family moments (rare surprises)

Natalie & Collin cuddle · the babies pile onto Natalie · Winston steals Collin's rock · Gussy falls asleep holding a paw ·
Finny finds a shiny pearl · all five form a perfect raft · everyone dives at once · a fish leaps through the raft ·
the babies race · Collin brings Natalie a rock · Natalie grooms a baby.

Progress (hearts, collections, unlocks, moments, current place, sound setting) is saved in `localStorage`.

## Code tour

Plain JavaScript files that share one global namespace (`OR`), loaded in order by `index.html`:

| File | What's in it |
|---|---|
| `js/util.js` | Math, randomness, color helpers, safe `localStorage` |
| `js/art.js` | All procedural drawing: the otters (fluffy scalloped fur, eyes, whiskers, toe beans, paws), rocks, shells, pearls, fish |
| `js/family.js` | The five otters: colors, proportions, personality weights, favorite things, speech lines |
| `js/otter.js` | The `Otter` class: movement, gaze, blinking, pose easing, paw-holding arms, and the library of actions (float, nap, groom, dive, zoomies, rockplay…) |
| `js/world.js` | Sky & water rendering, the three places, particles, fish, bubbles, dive spots, kelp, log, buoy, lanterns |
| `js/events.js` | The rare family moments, each a small generator "script" |
| `js/dance.js` | The moonwalk power-up: choreography timeline, stage lights, dance-floor tiles |
| `js/adventure/config.js` | **All Adventure balance numbers in one place** (damage, costs, boss scaling, spawn rates, cooldowns) |
| `js/adventure/bosses.js` | The seven bosses: looks, attacks, gimmicks, lines. Copy one to add a new boss |
| `js/adventure/boss.js` | Reusable boss framework: scaling, loop modifiers, intro/defeat, attack helpers, hazards |
| `js/adventure/abilities.js` | Special abilities and the Grand Raft Supernova |
| `js/adventure/upgrades.js` | Resources, upgrades, boss rewards, stat formulas, visual stages |
| `js/adventure/gear.js` | Drawing of visible upgrades (armor, helmets, shields, auras, tails, halos) |
| `js/adventure/scroller.js` | Side-scrolling biomes and scenery |
| `js/adventure/entities.js` | Pickups and small enemies |
| `js/adventure/squad.js` | The otter family in Adventure mode (pose, attacks, knockback, dizzy) |
| `js/adventure/pool.js` | Pooled particles and projectiles |
| `js/adventure/advui.js`, `adventure.js` | HUD, and the explore/boss/victory loop |
| `js/adventure/assets.js` + `assets/` | Optional custom images/sounds with automatic fallback (see `assets/README.md`) |
| `js/progress.js` | Unlock list, collections, moments album, saving |
| `js/audio.js` | Synthesized sound (Web Audio, no files): water, splashes, bubbles, otter chirps and the generative lullaby |
| `js/ui.js` | Counters, buttons, toasts, the Journal |
| `js/game.js` | Main loop, input, raft modes, paw-holding links, event scheduling, speech bubbles |

**Ideas for extending it**

- *New otter:* add an entry to `OR.FAMILY` in `family.js` and its id to `OR.RAFT_ORDER`.
- *New behavior:* add `ACTIONS.myThing = { enter, update, exit }` in `otter.js` and a weight in an otter's `weights`.
- *New moment:* push an entry into `OR.EVENTS` in `events.js`; `yield* wait(2)` / `yield* until(fn)` keep scripts readable.
- *New unlock:* add to `OR.UNLOCKS` in `progress.js` and handle it in `Game.applyUnlock`.
- *New boss:* copy an entry in `OR.BOSSES` (`js/adventure/bosses.js`), give it a reward in `OR.REWARDS`.
- *New upgrade:* add to `OR.UPGRADES`, use its level in `OR.computeStats()` / `OR.gearFor()`.
- *New enemy:* add to `OR.ENEMY_TYPES` in `entities.js` with a `draw()` and a spawn `weight`.
- *New ability:* add to `OR.ABILITIES`, a cooldown in `BAL.abilities`, and an unlock rule in `OR.unlockedAbilities()`.
