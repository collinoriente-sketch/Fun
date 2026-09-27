// ============================================================================
//  ADVENTURE BALANCE: every tunable number for Adventure mode lives here.
//  Tweak freely; nothing else needs to change. Units: S = otter size in px,
//  times are in seconds, damage/health are plain numbers.
// ============================================================================
(function (OR) {
  'use strict';

  OR.BAL = {
    // ---------------------------------------------------------------- travel
    scrollSpeed: 1.1, // world scroll in S per second while exploring
    biomeLength: 45, // seconds of travel per biome before the scenery changes

    // ---------------------------------------------------------------- pickups
    pickupEvery: 1.1, // seconds between pickup spawns
    maxPickups: 3, // on screen at once
    magnetRange: 1.4, // S; otters grab pickups this close (grows with Swift Paws)
    // weight = how often it spawns; amount = [min, max] granted
    pickups: {
      shell: { weight: 10, amount: [7, 13] },
      kelp: { weight: 7, amount: [5, 8] },
      metal: { weight: 4, amount: [4, 8] },
      pearl: { weight: 1.3, amount: [3, 5] },
      fish: { weight: 2.5, amount: [3, 5] }, // food: heals and charges the ultimate
      chest: { weight: 0.35, amount: [1, 1] }, // treasure chest: a bit of everything
    },
    chestLoot: { shell: 50, kelp: 32, metal: 20, pearl: 8, treasure: 9 },
    lootGrowthPerBoss: 1.12, // every boss defeated multiplies pickup amounts

    // ---------------------------------------------------------------- small enemies
    enemyEvery: 3.2,
    maxEnemies: 5,
    enemyHp: 14,
    enemyHpGrowthPerBoss: 1.7,
    enemyTouchDamage: 4,
    enemyLoot: { shell: 2, metal: 1 },

    // ---------------------------------------------------------------- otters
    squadHp: 100, // shared health of the whole family
    squadRegen: 3, // hp per second while exploring
    autoAttackEvery: 1.25, // seconds between each otter's automatic shell toss
    autoDamage: 3,
    soloBonus: 0.35, // while the family is still scattered, each missing otter adds +35% to the others' auto damage
    tapDamage: 6,
    critChance: 0.05,
    critMult: 2.2,
    koTime: 4.5, // seconds knocked out (dizzy) before bouncing back
    koCheerCut: 0.35, // each tap while knocked out shortens recovery by this much
    determinationPerKo: 0.15, // +15% damage each time the family gets back up in a fight
    idleAutoCast: 15, // seconds without input before the family casts abilities by themselves

    // ---------------------------------------------------------------- tapping & combo
    comboWindow: 0.8, // seconds between taps to keep a combo alive
    comboStep: 0.04, // +4% damage per combo hit…
    comboMax: 1.0, // …up to +100%
    tapSoftCap: 7, // taps per second beyond this deal less (no need to mash)

    // ---------------------------------------------------------------- ultimate meter
    ultPerBossPct: 1.6, // meter gained per 1% of the boss's health you knock off
    ultPerHit: 4, // meter gained when the family gets hit
    ultPerSecond: 0.6,

    // ---------------------------------------------------------------- bosses
    bossProgressBase: 100, // "boss meter" points needed for the first boss
    bossProgressGrowth: 1.25,
    progressPerSecond: 1.1, // earned just by travelling
    progressPerPickup: 2,
    progressPerKill: 3,
    bossHpBase: 3000,
    bossHpGrowth: 2.55, // per boss fought (keeps growing across loops)
    bossDamageBase: 9.5,
    bossDamageGrowth: 1.42,
    cycleHpMult: 1.25, // extra toughness per full loop through all bosses
    cycleDamageMult: 1.15,
    bossRewardLoot: { shell: 40, kelp: 25, metal: 15, pearl: 5, treasure: 6 },
    fatigueAfter: 75, // seconds into a fight before the boss starts tiring out…
    fatigueRamp: 60, // …taking +100% damage per this many seconds after that (no fight lasts forever)

    // ---------------------------------------------------------------- abilities
    // cd = cooldown seconds, dmg = multiple of the family's tap damage
    abilities: {
      kelpBomb: { cd: 6, dmg: 9 },
      shellSlash: { cd: 11, dmg: 14 },
      shadowOtters: { cd: 22, dmg: 1.2, dur: 6 }, // dmg per clone hit
      kelpCyclone: { cd: 18, dmg: 30 },
      spiritFluff: { cd: 25, dmg: 12, heal: 0.4 },
      sunscreen: { cd: 9, dur: 6 },
      fluffForm: { cd: 45, dur: 14, mult: 2 },
      kelpTails: { cd: 50, dur: 12, dmg: 2.5 },
      finale: { dmg: 90, bossPct: 0.08 }, // Grand Raft Supernova: big hit + % of boss max hp
    },

    // ---------------------------------------------------------------- visual stages
    // Otter looks change as total upgrade levels pass these thresholds (stage 1..6)
    stageLevels: [0, 4, 10, 18, 28, 42],
  };
})(window.OR);
