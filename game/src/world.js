// World state and simulation for Moonlit Museum: Sapphire Heist.
// Pure logic with a fixed-step update: guards patrol waypoints, cameras
// sweep, lasers blink, and any pair of eyes on the thief feeds the alarm.

import { ALARM, CAMERA, EXIT, FIELD, GEM, GUARD, LEVELS, LOOT_VALUES, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped'; // level cleared, more remain or final win
export const SCREEN_WIN = 'win';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function circleHitsWalls(x, y, r, walls) {
  for (const [wx, wy, ww, wh] of walls) {
    const nx = clamp(x, wx, wx + ww);
    const ny = clamp(y, wy, wy + wh);
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function moveCircle(pos, dx, dy, r, walls) {
  // Axis-separated movement so the thief slides along walls instead of sticking.
  if (!circleHitsWalls(pos.x + dx, pos.y, r, walls)) pos.x += dx;
  if (!circleHitsWalls(pos.x, pos.y + dy, r, walls)) pos.y += dy;
  pos.x = clamp(pos.x, r, FIELD.width - r);
  pos.y = clamp(pos.y, r, FIELD.height - r);
}

/** Is the straight line from (x1,y1) to (x2,y2) clear of every wall? */
export function lineOfSight(x1, y1, x2, y2, walls) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 10));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const [wx, wy, ww, wh] of walls) {
      if (x >= wx && x <= wx + ww && y >= wy && y <= wy + wh) return false;
    }
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Can an eye at (ex,ey) facing `dir` see the player right now? */
function canSee(ex, ey, dir, range, halfAngle, player, walls) {
  const dx = player.x - ex;
  const dy = player.y - ey;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, dir)) > halfAngle) return 0;
  if (!lineOfSight(ex, ey, player.x, player.y, walls)) return 0;
  // Closer means seen faster: 1 at point blank, 0.35 at the cone's edge.
  return 1 - 0.65 * (dist / range);
}

export function createWorld(levelIndex) {
  const level = LEVELS[levelIndex];
  return {
    screen: SCREEN_PLAY,
    levelIndex,
    level,
    time: 0,
    score: 0,
    alarm: 0,
    alarmPeak: 0, // highest the alarm climbed this gallery (for the grade)
    grade: null, // S/A/B/C letter grade, set the moment the thief escapes
    spottedBy: 0, // how many eyes are on the thief this frame (for rendering)
    alarmFlash: 0,
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      dir: -Math.PI / 2,
      moving: false,
      sneaking: false,
      stepTimer: 0,
      hasGem: false,
    },
    guards: level.guards.map((g) => ({
      x: g.path[0][0],
      y: g.path[0][1],
      path: g.path,
      speed: g.speed,
      pauseTime: g.pause,
      target: 1 % g.path.length,
      wait: 0,
      dir: Math.atan2(g.path[1 % g.path.length][1] - g.path[0][1], g.path[1 % g.path.length][0] - g.path[0][0]),
      scanDir: Math.atan2(g.path[1 % g.path.length][1] - g.path[0][1], g.path[1 % g.path.length][0] - g.path[0][0]),
    })),
    cameras: level.cameras.map((c) => ({ ...c, dir: c.base })),
    lasers: level.lasers.map((l) => ({ ...l, wasTouching: false })),
    loots: level.loots.map((l) => ({ ...l, taken: false, value: LOOT_VALUES[l.kind] })),
    gem: { ...GEM, taken: false, value: LOOT_VALUES.gem },
    lootTaken: 0,
    events: [], // strings the main loop turns into sounds: pickup, gem, spotted, laser, caught, escape
  };
}

function updateGuard(world, guard, dt) {
  if (guard.wait > 0) {
    guard.wait -= dt;
    // A paused guard is not asleep: he looks left and right down the hall,
    // so his cone sweeps while he stands at the end of his patrol.
    guard.dir = guard.scanDir + Math.sin(world.time * 1.7 + guard.x * 0.05) * 0.55;
    return;
  }
  const [tx, ty] = guard.path[guard.target];
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    guard.target = (guard.target + 1) % guard.path.length;
    guard.wait = guard.pauseTime;
    guard.scanDir = guard.dir;
    return;
  }
  const vx = (dx / dist) * guard.speed;
  const vy = (dy / dist) * guard.speed;
  const before = { x: guard.x, y: guard.y };
  moveCircle(guard, vx * dt, vy * dt, GUARD.radius, world.level.walls);
  if (guard.x !== before.x || guard.y !== before.y) guard.dir = Math.atan2(vy, vx);
}

function laserActive(laser, time) {
  const phase = ((time + laser.offset) % laser.period) / laser.period;
  return phase < 0.62; // on for most of the cycle, off for a breath
}

function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/**
 * Advance the world by dt seconds. `input` is {x, y, sneak} with x/y in -1..1.
 * Returns nothing; read world.events afterwards and clear it.
 */
export function updateWorld(world, input, dt) {
  if (world.screen !== SCREEN_PLAY) return;
  world.time += dt;
  const player = world.player;
  const walls = world.level.walls;

  // --- the thief ---
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
  player.sneaking = !!input.sneak;
  player.moving = input.x !== 0 || input.y !== 0;
  if (player.moving) {
    const len = Math.hypot(input.x, input.y) || 1;
    const dx = (input.x / len) * speed * dt;
    const dy = (input.y / len) * speed * dt;
    moveCircle(player, dx, dy, PLAYER.radius, walls);
    player.dir = Math.atan2(input.y, input.x);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = input.sneak ? 0.42 : 0.27;
      world.events.push('step');
    }
  }

  // --- guards and cameras ---
  for (const guard of world.guards) updateGuard(world, guard, dt);
  for (const cam of world.cameras) {
    cam.dir = cam.base + Math.sin(world.time * cam.speed) * cam.sweep;
  }

  // --- being seen feeds the alarm ---
  let seen = 0;
  let gain = 0;
  for (const guard of world.guards) {
    const s = canSee(guard.x, guard.y, guard.dir, GUARD.visionRange, GUARD.visionHalfAngle, player, walls);
    if (s > 0) {
      seen += 1;
      gain += ALARM.guardRate * s;
    }
  }
  for (const cam of world.cameras) {
    const s = canSee(cam.x, cam.y, cam.dir, CAMERA.visionRange, CAMERA.visionHalfAngle, player, walls);
    if (s > 0) {
      seen += 1;
      gain += ALARM.cameraRate * s;
    }
  }
  if (player.sneaking) gain *= 0.45; // low profile: slower to be sure it's you
  const wasSpotted = world.spottedBy > 0;
  world.spottedBy = seen;
  if (seen > 0) {
    world.alarm += gain * dt;
    if (!wasSpotted) world.events.push('spotted');
  } else {
    world.alarm -= ALARM.decay * dt;
  }

  // --- laser tripwires ---
  for (const laser of world.lasers) {
    const touching = laserActive(laser, world.time)
      && segmentDistance(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2) < PLAYER.radius + 2;
    if (touching && !laser.wasTouching) {
      world.alarm += ALARM.laserHit;
      world.alarmFlash = 0.35;
      world.events.push('laser');
    }
    laser.wasTouching = touching;
    laser.activeNow = laserActive(laser, world.time);
  }
  if (world.alarmFlash > 0) world.alarmFlash -= dt;
  world.alarm = clamp(world.alarm, 0, ALARM.max);
  if (world.alarm > world.alarmPeak) world.alarmPeak = world.alarm;

  if (world.alarm >= ALARM.max) {
    world.screen = SCREEN_CAUGHT;
    world.events.push('caught');
    return;
  }

  // --- loot ---
  for (const loot of world.loots) {
    if (!loot.taken && Math.hypot(player.x - loot.x, player.y - loot.y) < PLAYER.radius + 15) {
      loot.taken = true;
      world.lootTaken += 1;
      world.score += loot.value;
      world.events.push('pickup');
    }
  }
  if (!world.gem.taken && Math.hypot(player.x - world.gem.x, player.y - world.gem.y) < PLAYER.radius + 17) {
    world.gem.taken = true;
    player.hasGem = true;
    world.score += world.gem.value;
    world.events.push('gem');
  }

  // --- the exit only helps once the sapphire is in the bag ---
  if (player.hasGem
    && player.x > EXIT.x && player.x < EXIT.x + EXIT.width
    && player.y > EXIT.y - 6 && player.y < EXIT.y + EXIT.height) {
    const timeBonus = Math.max(0, 600 - Math.floor(world.time) * 2);
    world.score += timeBonus;
    // Grade the getaway: a full sweep of the gallery, quietly done, is an S.
    const lootFrac = world.loots.length ? world.lootTaken / world.loots.length : 1;
    world.grade = lootFrac >= 1 && world.alarmPeak < 50 ? 'S'
      : lootFrac >= 0.75 && world.alarmPeak < 80 ? 'A'
        : lootFrac >= 0.5 ? 'B' : 'C';
    world.screen = world.levelIndex + 1 >= LEVELS.length ? SCREEN_WIN : SCREEN_ESCAPED;
    world.events.push('escape');
  }
}
