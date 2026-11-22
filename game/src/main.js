// Moonlit Museum: Sapphire Heist — entry point.
// Keyboard (WASD/arrows, SHIFT to sneak) and mouse (click to start or
// advance, hold to steer) play; ?shot= scenes render one deterministic
// frame for screenshots and then hold still.

import { FIELD } from './config.js';
import { ensureAudio, sfx } from './audio.js';
import { render } from './render.js';
import { buildShotScene } from './shots.js';
import {
  createWorld, updateWorld,
  SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const VIEW_W = FIELD.width;
const VIEW_H = FIELD.height;

function resize() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.width = Math.round(VIEW_W * scale * (window.devicePixelRatio > 1 ? 1.5 : 1));
  canvas.height = Math.round(VIEW_H * scale * (window.devicePixelRatio > 1 ? 1.5 : 1));
  canvas.style.width = `${Math.round(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.round(VIEW_H * scale)}px`;
  canvas.style.left = `${Math.round((window.innerWidth - VIEW_W * scale) / 2)}px`;
  canvas.style.top = `${Math.round((window.innerHeight - VIEW_H * scale) / 2)}px`;
  canvas.style.position = 'fixed';
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
}
window.addEventListener('resize', resize);

// ---------- input ----------
const keys = new Set();
let pointer = null; // {x, y} in field coordinates while the mouse is held

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  ensureAudio();
  keys.add(e.key.toLowerCase());
  if (e.key === 'Enter' || e.key === ' ') advance();
  if (e.key.toLowerCase() === 'm') muted = !muted;
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  advance();
  pointer = toField(e);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => { if (pointer) pointer = toField(e); });
canvas.addEventListener('pointerup', () => { pointer = null; });
canvas.addEventListener('pointercancel', () => { pointer = null; });

function toField(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function readInput(world) {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (x === 0 && y === 0 && pointer) {
    const dx = pointer.x - world.player.x;
    const dy = pointer.y - world.player.y;
    if (Math.hypot(dx, dy) > 14) { x = Math.sign(dx); y = Math.sign(dy); }
  }
  return { x, y, sneak: keys.has('shift') };
}

// ---------- game flow ----------
let muted = false;
const ui = { screen: SCREEN_TITLE, transition: 0 };
let levelIndex = 0;
let levelStartScore = 0;
let world = createWorld(0);

function startLevel(index, score) {
  levelIndex = index;
  levelStartScore = score;
  world = createWorld(index);
  world.score = score;
  ui.screen = SCREEN_PLAY;
  ui.transition = 0;
}

function advance() {
  if (ui.screen === SCREEN_TITLE) {
    startLevel(0, 0);
  } else if (world.screen === SCREEN_CAUGHT) {
    startLevel(levelIndex, levelStartScore);
  } else if (world.screen === SCREEN_WIN) {
    startLevel(0, 0);
  } else if (ui.transition > 0) {
    startLevel(levelIndex + 1, world.score);
  }
}

function playEvents() {
  for (const ev of world.events) {
    if (muted) continue;
    if (ev === 'pickup') sfx.pickup();
    else if (ev === 'gem') sfx.gem();
    else if (ev === 'spotted') sfx.spotted();
    else if (ev === 'laser') sfx.laser();
    else if (ev === 'caught') sfx.caught();
    else if (ev === 'escape') sfx.escape();
    else if (ev === 'step') sfx.step(world.player.sneaking);
  }
  world.events.length = 0;
}

// ---------- screenshot scenes ----------
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const scene = buildShotScene(shot);
  if (scene) {
    world = scene.world;
    ui.screen = scene.title ? SCREEN_TITLE : SCREEN_PLAY;
    resize();
    render(ctx, world, ui);
    status.textContent = `Screenshot scene: ${shot}`;
    // hold the frame; a screenshot tool reads the canvas as it stands
  } else {
    status.textContent = `Unknown shot: ${shot}`;
  }
} else {
  resize();
  let last = performance.now();
  let statusTimer = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (ui.screen === SCREEN_TITLE) {
      // the museum idles behind the title: patrols walk, cameras sweep
      updateWorld(world, { x: 0, y: 0, sneak: false }, dt);
      world.events.length = 0;
      if (world.screen === SCREEN_CAUGHT) world = createWorld(0); // never "caught" on the title
    } else {
      const sub = Math.max(1, Math.ceil(dt / (1 / 60)));
      const step = dt / sub;
      for (let i = 0; i < sub; i++) updateWorld(world, readInput(world), step);
      playEvents();
      if (world.screen === SCREEN_ESCAPED) ui.transition = 1;
    }
    render(ctx, world, ui);
    statusTimer -= dt;
    if (statusTimer <= 0) {
      statusTimer = 1;
      status.textContent = ui.screen === SCREEN_TITLE
        ? 'Moonlit Museum: Sapphire Heist. Press Enter to begin.'
        : `Score ${world.score}. Alarm ${Math.round(world.alarm)} percent. ${world.player.hasGem ? 'Sapphire stolen, reach the exit.' : 'Steal the sapphire.'}`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
