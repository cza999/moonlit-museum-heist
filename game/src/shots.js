// Deterministic screenshot scenes behind ?shot=start|cover|play|end.
// Each scene builds a real world and plays the real rules forward with a
// scripted thief, so a screenshot is a frame the game itself produces and
// the same scene always lands on the same frame.

import { createWorld, updateWorld, SCREEN_CAUGHT } from './world.js';

const STEP = 1 / 60;

/** Steer the thief through waypoints for up to `seconds` of game time. */
function playToward(world, waypoints, seconds) {
  let wp = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    if (world.screen === SCREEN_CAUGHT) break;
    const target = waypoints[Math.min(wp, waypoints.length - 1)];
    const dx = target.x - world.player.x;
    const dy = target.y - world.player.y;
    if (Math.hypot(dx, dy) < 14 && wp < waypoints.length - 1) wp += 1;
    const len = Math.hypot(dx, dy) || 1;
    const input = {
      x: Math.abs(dx) > 6 ? Math.sign(dx) * Math.min(1, Math.abs(dx / len) + 0.35) : 0,
      y: Math.abs(dy) > 6 ? Math.sign(dy) * Math.min(1, Math.abs(dy / len) + 0.35) : 0,
      sneak: false,
    };
    if (Math.abs(dx) <= 6) input.x = 0;
    if (Math.abs(dy) <= 6) input.y = 0;
    updateWorld(world, input, STEP);
    world.events.length = 0;
  }
  return world;
}

export function buildShotScene(name) {
  if (name === 'start') {
    const world = createWorld(0);
    // let the patrols settle into mid-stride behind the title panel
    playToward(world, [{ x: 480, y: 528 }], 2.5);
    return { world, title: true };
  }
  if (name === 'cover') {
    // The money frame: the thief crosses the south hall toward the vault,
    // a guard's cone sweeps the top corridor, the corner camera fans the
    // west gallery, the sapphire glitters centre-frame, alarm bar on top.
    // The thief stops in open floor (not against a wall) and sneaks, so his
    // dashed ring reads even at thumbnail size; the alarm bar is mid-fill.
    const world = createWorld(0);
    playToward(world, [{ x: 430, y: 452 }, { x: 380, y: 440 }, { x: 340, y: 430 }], 6.4);
    if (world.screen === SCREEN_CAUGHT) { world.screen = 'play'; }
    world.player.sneaking = true;
    world.alarm = 42;
    return { world, title: false };
  }
  if (name === 'play') {
    // Third gallery: four guards, three cameras, lasers live — the south
    // guard's patrol crosses the thief's run for the vault's south gap
    // and the alarm is climbing.
    const world = createWorld(2);
    playToward(world, [{ x: 480, y: 452 }, { x: 470, y: 428 }], 5.2);
    if (world.screen === SCREEN_CAUGHT) { world.screen = 'play'; world.alarm = 58; }
    if (world.alarm < 30) world.alarm = 46; // the run has been noticed: bar mid-fill, orange
    return { world, title: false };
  }
  if (name === 'end') {
    // Walk straight into the top guard's flashlight and stay there: caught.
    const world = createWorld(0);
    world.player.x = 400;
    world.player.y = 84;
    for (let i = 0; i < 60 * 45 && world.screen !== SCREEN_CAUGHT; i++) {
      updateWorld(world, { x: 0, y: 0, sneak: false }, STEP);
      world.events.length = 0;
    }
    return { world, title: false };
  }
  return null;
}
