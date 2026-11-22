// Moonlit Museum: Sapphire Heist — field, tuning and level data.
// One museum floor per level, drawn on a single 960x600 field so the thief,
// a guard's flashlight cone, a sweeping camera, a loot target and the alarm
// meter can all share one frame.

export const FIELD = { width: 960, height: 600 };

export const PLAYER = {
  radius: 11,
  speed: 158,
  sneakSpeed: 82,
};

export const GUARD = {
  radius: 12,
  visionRange: 148,
  visionHalfAngle: 0.58, // radians, about 33 degrees each side
};

export const CAMERA = {
  visionRange: 126,
  visionHalfAngle: 0.46,
};

export const ALARM = {
  max: 100,
  guardRate: 34, // per second at point blank, scaled by distance
  cameraRate: 22,
  laserHit: 26,
  decay: 5.5, // per second while unseen
};

// Score values for the kinds of loot on the pedestals.
export const LOOT_VALUES = {
  coins: 150,
  vase: 250,
  statue: 300,
  painting: 350,
  crown: 500,
  gem: 1000,
};

const BORDER = 16;

// The central vault: four wall runs with a gap in the middle of the top and
// bottom runs, so the gem room can be entered from the north or south hall.
function vaultWalls() {
  return [
    [368, 196, 96, 14], [496, 196, 96, 14], // top run, gap 464..496
    [368, 390, 96, 14], [496, 390, 96, 14], // bottom run, gap 464..496
    [368, 196, 14, 208], // left run
    [578, 196, 14, 208], // right run
  ];
}

function borderWalls() {
  return [
    [0, 0, FIELD.width, BORDER],
    [0, FIELD.height - BORDER, FIELD.width, BORDER],
    [0, 0, BORDER, FIELD.height],
    [FIELD.width - BORDER, 0, BORDER, FIELD.height],
  ];
}

// Side gallery dividers with a doorway gap, reused with variations.
function galleryWalls(leftGapY, rightGapY) {
  const walls = [];
  walls.push([236, BORDER, 14, leftGapY - BORDER]);
  walls.push([236, leftGapY + 56, 14, FIELD.height - BORDER - (leftGapY + 56)]);
  walls.push([710, BORDER, 14, rightGapY - BORDER]);
  walls.push([710, rightGapY + 56, 14, FIELD.height - BORDER - (rightGapY + 56)]);
  return walls;
}

export const LEVELS = [
  {
    name: 'Gallery One — First Night',
    objective: 'Steal the Starlight Sapphire from the central vault, then slip out the south door.',
    playerStart: { x: 480, y: 528 },
    walls: [...borderWalls(), ...vaultWalls(), ...galleryWalls(268, 268)],
    carpets: [
      [382, 210, 196, 180],
      [250, 286, 132, 28],
      [578, 286, 132, 28],
      [466, 404, 28, 150],
      [466, 46, 28, 150],
    ],
    loots: [
      { x: 118, y: 118, kind: 'coins' },
      { x: 842, y: 118, kind: 'vase' },
      { x: 118, y: 482, kind: 'statue' },
      { x: 842, y: 482, kind: 'painting' },
    ],
    guards: [
      { path: [[300, 84], [660, 84]], speed: 62, pause: 0.8 },
      { path: [[876, 180], [876, 430]], speed: 54, pause: 0.6 },
    ],
    cameras: [
      { x: 30, y: 30, base: 0.75, sweep: 0.55, speed: 0.55 },
    ],
    lasers: [],
  },
  {
    name: 'Gallery Two — Laser Hall',
    objective: 'The vault is wired with laser tripwires. Time your crossing, take the sapphire, escape south.',
    playerStart: { x: 480, y: 528 },
    walls: [...borderWalls(), ...vaultWalls(), ...galleryWalls(150, 380)],
    carpets: [
      [382, 210, 196, 180],
      [250, 286, 132, 28],
      [578, 286, 132, 28],
      [466, 404, 28, 150],
      [466, 46, 28, 150],
    ],
    loots: [
      { x: 118, y: 118, kind: 'coins' },
      { x: 842, y: 118, kind: 'vase' },
      { x: 118, y: 482, kind: 'statue' },
      { x: 842, y: 482, kind: 'painting' },
      { x: 480, y: 84, kind: 'crown' },
      { x: 118, y: 300, kind: 'coins' },
    ],
    guards: [
      { path: [[300, 84], [660, 84]], speed: 70, pause: 0.6 },
      { path: [[84, 180], [84, 430]], speed: 60, pause: 0.6 },
      { path: [[300, 520], [660, 520]], speed: 66, pause: 0.5 },
    ],
    cameras: [
      { x: 30, y: 30, base: 0.75, sweep: 0.55, speed: 0.7 },
      { x: 930, y: 570, base: -2.35, sweep: 0.5, speed: 0.6 },
    ],
    lasers: [
      { x1: 464, y1: 210, x2: 496, y2: 210, period: 2.6, offset: 0 },
      { x1: 464, y1: 390, x2: 496, y2: 390, period: 2.6, offset: 1.3 },
    ],
  },
  {
    name: 'Gallery Three — The Long Watch',
    objective: 'Every guard is awake tonight. Clear the vault, grab any treasure you dare, and get out.',
    playerStart: { x: 480, y: 528 },
    walls: [...borderWalls(), ...vaultWalls(), ...galleryWalls(268, 150)],
    carpets: [
      [382, 210, 196, 180],
      [250, 286, 132, 28],
      [578, 286, 132, 28],
      [466, 404, 28, 150],
      [466, 46, 28, 150],
    ],
    loots: [
      { x: 118, y: 118, kind: 'coins' },
      { x: 842, y: 118, kind: 'vase' },
      { x: 118, y: 482, kind: 'statue' },
      { x: 842, y: 482, kind: 'painting' },
      { x: 480, y: 84, kind: 'crown' },
      { x: 118, y: 300, kind: 'coins' },
      { x: 842, y: 300, kind: 'vase' },
      { x: 480, y: 516, kind: 'statue' },
    ],
    guards: [
      { path: [[300, 84], [660, 84]], speed: 78, pause: 0.5 },
      { path: [[84, 180], [84, 430]], speed: 68, pause: 0.5 },
      { path: [[876, 430], [876, 180]], speed: 68, pause: 0.5 },
      { path: [[660, 520], [300, 520]], speed: 74, pause: 0.4 },
    ],
    cameras: [
      { x: 30, y: 30, base: 0.75, sweep: 0.55, speed: 0.8 },
      { x: 930, y: 30, base: 2.35, sweep: 0.5, speed: 0.7 },
      { x: 930, y: 570, base: -2.35, sweep: 0.5, speed: 0.75 },
    ],
    lasers: [
      { x1: 464, y1: 210, x2: 496, y2: 210, period: 2.2, offset: 0 },
      { x1: 464, y1: 390, x2: 496, y2: 390, period: 2.2, offset: 1.1 },
      { x1: 382, y1: 286, x2: 382, y2: 314, period: 3.1, offset: 0.7 },
      { x1: 578, y1: 286, x2: 578, y2: 314, period: 3.1, offset: 2.2 },
    ],
  },
];

// The vault gem, present in every level at the same proud spot.
export const GEM = { x: 480, y: 300, kind: 'gem' };

// The south exit door zone (drawn on the bottom wall).
export const EXIT = { x: 448, y: 568, width: 64, height: 32 };
