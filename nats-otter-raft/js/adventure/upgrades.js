// Upgrades, boss rewards and the stat formulas that turn them into power.
// Add an upgrade: push to OR.UPGRADES, then use its level in OR.computeStats() and/or OR.gearFor().
(function (OR) {
  'use strict';
  const BAL = () => OR.BAL;

  OR.RESOURCES = [
    { id: 'shell', icon: '🐚', name: 'Shells' },
    { id: 'kelp', icon: '🌿', name: 'Kelp' },
    { id: 'metal', icon: '⚙️', name: 'Metal scraps' },
    { id: 'refined', icon: '🔩', name: 'Refined metal' },
    { id: 'pearl', icon: '💎', name: 'Pearls' },
    { id: 'treasure', icon: '💰', name: 'Treasure' },
    { id: 'food', icon: '🐟', name: 'Fish' },
  ];
  OR.RES_ICON = Object.fromEntries(OR.RESOURCES.map((r) => [r.id, r.icon]));

  // cost: price of level 1; each level multiplies the price by `growth`.
  OR.UPGRADES = [
    { id: 'shellToss', icon: '🐚', name: 'Shell Toss', desc: '+15% attack damage. Tiny shell hair clips.', cost: { shell: 12 }, growth: 1.47 },
    { id: 'fluff', icon: '☁️', name: 'Fluff Training', desc: '+20% family health. Visibly fluffier.', cost: { kelp: 8, food: 2 }, growth: 1.53 },
    { id: 'kelpGear', icon: '🌿', name: 'Kelp Bombs+', desc: 'Kelp bombs hit 25% harder and recharge faster. Kelp bandolier.', cost: { kelp: 18 }, growth: 1.55 },
    { id: 'shellArmor', icon: '🛡️', name: 'Shell Armor', desc: '-8% damage taken. Unlocks Shell Slash.', cost: { shell: 35, pearl: 1 }, growth: 1.6 },
    { id: 'pearlCharms', icon: '💎', name: 'Pearl Charms', desc: '+3% crit chance, +10% crit damage. Pearl necklaces.', cost: { pearl: 3 }, growth: 1.65 },
    { id: 'swiftPaws', icon: '🐾', name: 'Swift Paws', desc: '+20% pickup reach, +10% loot.', cost: { food: 3, shell: 25 }, growth: 1.55 },
    { id: 'refinery', icon: '🏭', name: 'Scrap Refinery', desc: 'Turns metal scraps into refined metal over time.', cost: { metal: 12 }, growth: 1.65 },
    { id: 'metalArmor', icon: '⚙️', name: 'Metal Armor', desc: '-10% damage taken, +25% health. Shiny helmets.', cost: { refined: 6, shell: 50 }, growth: 1.65, needs: { refinery: 1 } },
    { id: 'shield', icon: '🔰', name: 'Giant Shell Shield', desc: '+12% chance to block a hit completely.', cost: { refined: 12, shell: 100 }, growth: 1.7, needs: { metalArmor: 1 } },
    { id: 'energyShells', icon: '⚡', name: 'Energy Shells', desc: '+30% tap damage, glowing shots. Unlocks Kelp Cyclone.', cost: { pearl: 5, treasure: 1 }, growth: 1.75 },
    { id: 'aura', icon: '🔥', name: 'Aura Awakening', desc: '+20% all damage and a glowing aura. Unlocks Spiritual Fluff.', cost: { treasure: 3, pearl: 8 }, growth: 1.85, needs: { energyShells: 1 } },
    { id: 'ultimate', icon: '🌟', name: 'Ultimate Mastery', desc: 'Ultimate charges 12% faster and the Supernova hits 30% harder.', cost: { treasure: 5, refined: 15 }, growth: 1.85, needs: { aura: 1 } },
  ];

  // Permanent rewards for beating bosses (beating one again on a later loop adds a level).
  OR.REWARDS = {
    sneakyShell: { icon: '🥷', name: 'Sneaky Shell', desc: '+10% crit chance. Tactical bandanas.' },
    shadowFin: { icon: '🖤', name: 'Shadow Fin', desc: 'Unlocks Shadow Otters. Moody afterimages.' },
    tankShell: { icon: '🐢', name: 'Tank Shell', desc: '-20% damage taken. A big shell on every back.' },
    reinforcedShell: { icon: '🦺', name: 'Reinforced Shell', desc: '+50% health. Unlocks Ultimate Fluff Form.' },
    mutationCore: { icon: '🧪', name: 'Mutation Core', desc: '+25% loot and glowing mutant eyes.' },
    muscleFluff: { icon: '💪', name: 'Muscle Fluff', desc: '+40% attack power. Unlocks Kelp-Tail Spirit.' },
    sunCore: { icon: '☀️', name: 'Island Sun Core', desc: 'x1.5 all damage and a golden halo.' },
  };

  OR.upgradeCost = function (up, level) {
    const out = {};
    for (const k in up.cost) out[k] = Math.ceil(up.cost[k] * Math.pow(up.growth, level));
    return out;
  };

  // Everything the fight and the HUD need, computed from saved state.
  OR.computeStats = function (st, extra) {
    const b = BAL(), L = st.up, R = st.rewards;
    const lv = (id) => L[id] || 0, rw = (id) => R[id] || 0;
    const e = extra || {};
    const atk =
      Math.pow(1.15, lv('shellToss')) * Math.pow(1.4, rw('muscleFluff')) * Math.pow(1.2, lv('aura')) * Math.pow(1.5, rw('sunCore')) *
      (1 + (e.determination || 0)) * (e.formMult || 1);
    const s = {
      atk,
      tapDmg: b.tapDamage * atk * Math.pow(1.3, lv('energyShells')),
      autoDmg: b.autoDamage * atk,
      bombMult: Math.pow(1.25, lv('kelpGear')),
      bombCd: Math.pow(0.95, lv('kelpGear')),
      critChance: Math.min(0.6, b.critChance + 0.03 * lv('pearlCharms') + 0.1 * rw('sneakyShell')),
      critMult: b.critMult + 0.1 * lv('pearlCharms'),
      maxHp: b.squadHp * Math.pow(1.2, lv('fluff')) * Math.pow(1.25, lv('metalArmor')) * Math.pow(1.5, rw('reinforcedShell')),
      dmgTaken: Math.pow(0.92, lv('shellArmor')) * Math.pow(0.9, lv('metalArmor')) * Math.pow(0.8, rw('tankShell')),
      block: Math.min(0.5, 0.12 * lv('shield')),
      loot: Math.pow(1.1, lv('swiftPaws')) * Math.pow(1.25, rw('mutationCore')) * Math.pow(b.lootGrowthPerBoss, st.defeated || 0),
      magnet: b.magnetRange * Math.pow(1.2, lv('swiftPaws')),
      refineEvery: lv('refinery') ? 4 / lv('refinery') : 0,
      ultRate: Math.pow(1.12, lv('ultimate')),
      finaleMult: Math.pow(1.3, lv('ultimate')),
    };
    s.power = Math.round(s.tapDmg * 8 + s.autoDmg * 12 + s.maxHp * 0.6 / s.dmgTaken);
    return s;
  };

  // Which abilities the family has unlocked so far.
  OR.unlockedAbilities = function (st) {
    const L = st.up, R = st.rewards;
    return {
      kelpBomb: true,
      shellSlash: (L.shellArmor || 0) >= 1,
      shadowOtters: (R.shadowFin || 0) >= 1,
      kelpCyclone: (L.energyShells || 0) >= 1,
      spiritFluff: (L.aura || 0) >= 1,
      fluffForm: (R.reinforcedShell || 0) >= 1 || (L.aura || 0) >= 2,
      kelpTails: (R.muscleFluff || 0) >= 1,
    };
  };

  // Visual stage 1..6 from total progress.
  OR.visualStage = function (st) {
    let total = 0;
    for (const k in st.up) total += st.up[k];
    for (const k in st.rewards) total += st.rewards[k] * 3;
    const lv = OR.BAL.stageLevels;
    let s = 1;
    for (let i = 0; i < lv.length; i++) if (total >= lv[i]) s = i + 1;
    return s;
  };

  // The gear an otter wears (read by the drawing hooks in gear.js).
  OR.gearFor = function (st) {
    const L = st.up, R = st.rewards;
    const stage = OR.visualStage(st);
    return {
      stage,
      shellClip: (L.shellToss || 0) >= 1,
      fluff: Math.min(0.35, 0.05 * (L.fluff || 0)),
      kelpBelt: (L.kelpGear || 0) >= 1,
      shellArmor: L.shellArmor || 0,
      pearls: (L.pearlCharms || 0) >= 1,
      metal: L.metalArmor || 0,
      shield: (L.shield || 0) >= 1,
      energy: (L.energyShells || 0) >= 1,
      aura: stage >= 5 || (L.aura || 0) >= 1,
      tails: stage >= 6,
      bandana: (R.sneakyShell || 0) >= 1,
      shadow: (R.shadowFin || 0) >= 1,
      tankShell: (R.tankShell || 0) >= 1,
      rivets: (R.reinforcedShell || 0) >= 1,
      mutant: (R.mutationCore || 0) >= 1,
      muscle: (R.muscleFluff || 0) >= 1,
      halo: (R.sunCore || 0) >= 1,
    };
  };
})(window.OR);
