// The five family members: looks, personality weights and things they say.
// To add an otter, copy an entry, give it a new id and add it to RAFT_ORDER.
(function (OR) {
  'use strict';

  const ADULT = { headR: 0.52, headY: -0.56, bodyRx: 0.48, bodyRy: 0.52, bodyY: 0.14, pear: 0.14, eyeR: 0.092, eyeX: 0.2, eyeY: -0.02, fluff: 0.16 };
  const BABY = { headR: 0.58, headY: -0.46, bodyRx: 0.47, bodyRy: 0.45, bodyY: 0.14, pear: 0.12, eyeR: 0.118, eyeX: 0.22, eyeY: 0.0, fluff: 0.22 };

  OR.FAMILY = [
    {
      id: 'natalie',
      name: 'Natalie',
      role: 'mom',
      size: 1.0,
      speed: 1.5,
      flower: true,
      shape: ADULT,
      pal: {
        fur: '#8f5c3a', furLight: '#b47e55', line: '#4e2e1b', belly: '#c19068', face: '#f1dcc0', muzzle: '#fff4e6',
        nose: '#3b2420', paw: '#6e4228', earIn: '#d69a86', bean: '#f2a3ad', eye: '#1d1520', whisker: 'rgba(255,255,255,0.85)', lash: true,
      },
      weights: { float: 3, visit: 3.2, cuddle: 1.4, groom: 2, nap: 1, dive: 1, shake: 0.5, yawn: 0.5, scratch: 0.4, wander: 0.6, fetch: 0.5 },
      likes: { collin: 2, winston: 1.3, gussy: 1.6, finny: 1.3 },
      lines: ['💕', 'Hi!', 'Where are the babies?', 'Hi sweetie!', 'Everyone hold paws!', 'Such a nice day~', '💕💕'],
    },
    {
      id: 'collin',
      name: 'Collin',
      role: 'dad',
      size: 1.08,
      speed: 1.6,
      tuft: true,
      shape: ADULT,
      pal: {
        fur: '#5b3b27', furLight: '#7d5439', line: '#2f1c11', belly: '#7a5237', face: '#d9c2a3', muzzle: '#f2e6d4',
        nose: '#241410', paw: '#46291a', earIn: '#b27c69', bean: '#e29aa3', eye: '#1d1520', whisker: 'rgba(255,255,255,0.85)',
      },
      weights: { float: 2, rockplay: 0, fetch: 2.2, wander: 1.4, visit: 1.6, cuddle: 1, groom: 0.8, dive: 1.5, shake: 0.7, nap: 0.8, scratch: 0.6 },
      likes: { natalie: 2.5, winston: 1, gussy: 0.8, finny: 1.2 },
      lines: ['🪨', 'Hey!', 'Found a good rock!', 'This one is smooth.', 'Rock time!', 'Hey buddy!'],
      loves: 'rock',
    },
    {
      id: 'winston',
      name: 'Winston',
      role: 'baby',
      size: 0.58,
      speed: 2.6,
      tuft: true,
      shape: BABY,
      pal: {
        fur: '#8b929c', furLight: '#b3b9c1', line: '#474c55', belly: '#aeb4bc', face: '#e6e9ed', muzzle: '#ffffff',
        nose: '#34343c', paw: '#6a707a', earIn: '#d7a3ad', bean: '#f5a8b4', eye: '#1d1520', whisker: 'rgba(255,255,255,0.9)',
      },
      weights: { wander: 3.4, zoomies: 2.4, chase: 2.2, play: 1.4, dive: 1.5, float: 1, shake: 1, visit: 1, nap: 0.4, scratch: 0.5, fetch: 0.4 },
      likes: { natalie: 1.5, collin: 1.2, gussy: 1, finny: 1.4 },
      lines: ['ZOOM!', '🐟', 'hehe', 'catch me!', 'wheee!', 'hehehe'],
    },
    {
      id: 'gussy',
      name: 'Gussy',
      role: 'baby',
      size: 0.63,
      speed: 1.7,
      shape: Object.assign({}, BABY, { fluff: 0.34, bodyRx: 0.45 }),
      pal: {
        fur: '#f4efe6', furLight: '#ffffff', line: '#b3a99c', belly: '#ffffff', face: '#fffcf6', muzzle: '#ffffff',
        nose: '#c47f8c', paw: '#ded5c8', earIn: '#f5b8c4', bean: '#f7a6b6', eye: '#1d1520', whisker: 'rgba(150,135,125,0.75)', slowBlink: true,
      },
      weights: { nap: 4, float: 3, follow: 3, yawn: 1.5, groom: 1, visit: 1.2, chase: 0.3, shake: 0.3 },
      likes: { natalie: 3, collin: 1, winston: 0.8, finny: 0.8 },
      follows: 'natalie',
      lines: ['...zzz', 'so sleepy...', 'mmm... cozy', '*yawn*', 'five more minutes...', '💤'],
    },
    {
      id: 'finny',
      name: 'Finny',
      role: 'baby',
      size: 0.61,
      speed: 2.2,
      shape: BABY,
      pal: {
        fur: '#29282f', furLight: '#45434d', line: '#0c0b10', belly: '#3a3842', face: '#5b5866', muzzle: '#8a8795',
        nose: '#0f0e12', paw: '#1b1a20', earIn: '#8c5f6b', bean: '#cf8d98', eye: '#0c0b10', whisker: 'rgba(255,255,255,0.9)',
        eyeRing: 'rgba(255,255,255,0.18)',
      },
      weights: { follow: 3, chase: 3, dive: 1.5, fetch: 1.6, float: 1, zoomies: 1, scratch: 1, nap: 0.7, play: 1, wander: 0.8 },
      likes: { natalie: 1.2, collin: 2.5, winston: 1.3, gussy: 1 },
      follows: 'collin',
      loves: 'pearl',
      lines: ['👀', 'ooh!', '🐟', 'what\'s that?', 'shiny!', 'ooooh', '?!'],
    },
  ];

  OR.RAFT_ORDER = ['natalie', 'collin', 'winston', 'gussy', 'finny'];
})(window.OR);
