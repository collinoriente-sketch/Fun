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
| `js/progress.js` | Unlock list, collections, moments album, saving |
| `js/audio.js` | Synthesized sound (Web Audio, no files): water, splashes, bubbles, otter chirps and the generative lullaby |
| `js/ui.js` | Counters, buttons, toasts, the Journal |
| `js/game.js` | Main loop, input, raft modes, paw-holding links, event scheduling, speech bubbles |

**Ideas for extending it**

- *New otter:* add an entry to `OR.FAMILY` in `family.js` and its id to `OR.RAFT_ORDER`.
- *New behavior:* add `ACTIONS.myThing = { enter, update, exit }` in `otter.js` and a weight in an otter's `weights`.
- *New moment:* push an entry into `OR.EVENTS` in `events.js`; `yield* wait(2)` / `yield* until(fn)` keep scripts readable.
- *New unlock:* add to `OR.UNLOCKS` in `progress.js` and handle it in `Game.applyUnlock`.
