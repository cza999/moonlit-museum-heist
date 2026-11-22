// Canvas rendering for Moonlit Museum: Sapphire Heist.
// v4 visual pass: a polished night museum — veined marble slabs under a
// cinematic deep-blue-and-gold grade, brass-trimmed walls with skirting,
// glass cases with real reflections, soft flashlight beams, glowing laser
// tripwires, rim-lit figures, and glass-and-gold interface panels.
// Rendering only: no rule, number or layout in here changes the game.

import { ALARM, CAMERA, EXIT, FIELD, GUARD, LOOT_LABELS } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const W = FIELD.width;
const H = FIELD.height;

const GOLD = '#c9a44e';
const GOLD_PALE = '#ffe9a8';
const INK = '#0a0e1a';

// Deterministic hash noise (stable per coordinate, no Math.random, so the
// screenshot scenes render the identical frame every time).
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function shadowEllipse(ctx, x, y, rx, ry, alpha) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------- floor ---
// The whole static layer (marble, carpets, moonlight, furniture, the soft
// shadows the walls throw on the floor) is painted once per gallery into
// an offscreen canvas and blitted each frame.

const staticCache = new Map();

function paintMarble(ctx) {
  ctx.fillStyle = '#131a2e';
  ctx.fillRect(0, 0, W, H);
  // large polished slabs, each a touch lighter or darker than its neighbour
  const SW = 192, SH = 150;
  for (let gy = 0; gy * SH < H; gy++) {
    for (let gx = 0; gx * SW < W; gx++) {
      const x = gx * SW, y = gy * SH;
      const v = hash(gx, gy) * 16 - 8;
      ctx.fillStyle = `rgb(${26 + v},${34 + v},${56 + v})`;
      ctx.fillRect(x, y, SW, SH);
      // marble veins: short broken seams that start and end inside the
      // slab, the way real stone veining does — never edge to edge
      for (let k = 0; k < 2; k++) {
        const seed = hash(gx * 7 + k * 13, gy * 7 + k * 29);
        ctx.strokeStyle = k === 1 && seed > 0.5
          ? 'rgba(201,164,78,0.045)' : 'rgba(190,208,245,0.05)';
        ctx.lineWidth = 0.9;
        const x0 = x + 14 + seed * 50;
        const x1 = x0 + 60 + hash(gy + k, gx) * 70;
        const y0 = y + 16 + seed * (SH - 32);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let s = 1; s <= 4; s++) {
          ctx.lineTo(x0 + ((x1 - x0) / 4) * s,
            y0 + Math.sin(seed * 20 + s * 1.7 + k) * 7 + (hash(gx + s, gy + k) - 0.5) * 9);
        }
        ctx.stroke();
      }
      // grout: a dark seam with a one-pixel polish line under it
      ctx.strokeStyle = 'rgba(5,7,14,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, SW - 2, SH - 2);
      ctx.strokeStyle = 'rgba(165,185,235,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + SH - 2); ctx.lineTo(x + SW - 2, y + SH - 2);
      ctx.moveTo(x + SW - 2, y + 2); ctx.lineTo(x + SW - 2, y + SH - 2);
      ctx.stroke();
    }
  }
  // the fine 48px setting-out grid the restorers chalked on the stone
  ctx.strokeStyle = 'rgba(120,140,190,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 16; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 16; y < H; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // a broad sheen, as if the polish caught the moon
  const sheen = ctx.createLinearGradient(0, 0, W * 0.7, H);
  sheen.addColorStop(0, 'rgba(190,210,255,0.05)');
  sheen.addColorStop(0.45, 'rgba(190,210,255,0)');
  sheen.addColorStop(1, 'rgba(60,80,150,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
}

function paintCarpets(ctx, world) {
  for (const [x, y, w, h] of world.level.carpets) {
    const g = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, '#5f1c30');
    g.addColorStop(1, '#3a0f1f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // damask motif: a faint diamond lattice woven into the pile
    ctx.fillStyle = 'rgba(230,190,110,0.07)';
    for (let dy = 12; dy < h - 6; dy += 18) {
      for (let dx = 12 + ((dy / 18) % 2) * 9; dx < w - 6; dx += 18) {
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
        ctx.restore();
      }
    }
    ctx.strokeStyle = '#a37f36';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.strokeStyle = 'rgba(230,190,110,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
}

function paintMoonlight(ctx) {
  // three cold shafts lean in from the high windows and pool on the stone;
  // each is painted twice — a wide faint pass under a narrower brighter
  // one — so the edges feather instead of cutting the floor
  for (const [x, lean, w] of [[120, 90, 110], [430, 110, 130], [730, 80, 100]]) {
    for (const [inset, aTop, aBot] of [[-16, 0.05, 0.012], [10, 0.11, 0.028]]) {
      const g = ctx.createLinearGradient(x, 16, x + lean, 300);
      g.addColorStop(0, `rgba(150,185,255,${aTop})`);
      g.addColorStop(1, `rgba(150,185,255,${aBot})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + inset, 16);
      ctx.lineTo(x + w - inset, 16);
      ctx.lineTo(x + w - inset + lean, 300);
      ctx.lineTo(x + inset + lean, 300);
      ctx.closePath();
      ctx.fill();
    }
    const pool = ctx.createRadialGradient(
      x + lean + w / 2, 306, 4, x + lean + w / 2, 306, w * 0.66);
    pool.addColorStop(0, 'rgba(150,185,255,0.10)');
    pool.addColorStop(1, 'rgba(150,185,255,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(x + lean + w / 2, 306, w * 0.66, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintDecor(ctx, world) {
  const decor = world.level.decor;
  if (!decor) return;
  for (const [x, y, w, h] of decor.benches) {
    shadowEllipse(ctx, x + w / 2, y + h + 4, w / 2, 4, 0.3);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#6b4c2c');
    g.addColorStop(0.35, '#4a331d');
    g.addColorStop(1, '#2e2013');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(232,200,119,0.5)';
    ctx.fillRect(x, y, w, 1.4);
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(x + 4, y + h - 3, w - 8, 2);
  }
  for (const plant of decor.plants) {
    shadowEllipse(ctx, plant.x, plant.y + 12, 12, 4, 0.3);
    const pot = ctx.createLinearGradient(plant.x - 8, 0, plant.x + 8, 0);
    pot.addColorStop(0, '#59391c');
    pot.addColorStop(0.5, '#8a5a28');
    pot.addColorStop(1, '#4a2d14');
    ctx.fillStyle = pot;
    ctx.beginPath(); ctx.arc(plant.x, plant.y + 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e5d3a';
    for (const [ox, oy, r] of [[0, -6, 9], [-8, 0, 7], [8, 0, 7], [0, 3, 8]]) {
      ctx.beginPath(); ctx.arc(plant.x + ox, plant.y + oy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#4c915f';
    ctx.beginPath(); ctx.arc(plant.x - 3, plant.y - 9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(plant.x + 4, plant.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function paintWallShadows(ctx, world) {
  for (const [x, y, w, h] of world.level.walls) {
    if (w >= W - 4 || h >= H - 4) continue; // the room shell casts none
    ctx.fillStyle = 'rgba(2,4,10,0.20)';
    ctx.fillRect(x - 2, y + h, w + 4, 4);
    ctx.fillStyle = 'rgba(2,4,10,0.13)';
    ctx.fillRect(x - 1, y + h + 4, w + 2, 4);
    ctx.fillStyle = 'rgba(2,4,10,0.07)';
    ctx.fillRect(x, y + h + 8, w, 4);
  }
}

function staticLayer(world) {
  let layer = staticCache.get(world.levelIndex);
  if (layer) return layer;
  layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const ctx = layer.getContext('2d');
  paintMarble(ctx);
  paintCarpets(ctx, world);
  paintMoonlight(ctx);
  // ambient bounce: the middle of the room holds a breath more light
  const amb = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 430);
  amb.addColorStop(0, 'rgba(140,165,230,0.055)');
  amb.addColorStop(1, 'rgba(140,165,230,0)');
  ctx.fillStyle = amb;
  ctx.fillRect(0, 0, W, H);
  paintDecor(ctx, world);
  paintWallShadows(ctx, world);
  staticCache.set(world.levelIndex, layer);
  return layer;
}

// ------------------------------------------------------- vision beams ---
// A beam is pre-rendered once: a conic gradient gives it soft angular
// edges, a destination-out radial gives it a natural distance falloff.
// Drawn rotated, it reads as a real flashlight fan instead of a wedge.

const coneSprites = new Map();

function coneSprite(range, halfAngle, rgb, peak) {
  const key = `${range}|${rgb}`;
  if (coneSprites.has(key)) return coneSprites.get(key);
  const size = Math.ceil(range * 2);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const mid = size / 2;
  ctx.beginPath();
  ctx.moveTo(mid, mid);
  ctx.arc(mid, mid, range, -halfAngle, halfAngle);
  ctx.closePath();
  if (typeof ctx.createConicGradient === 'function') {
    const g = ctx.createConicGradient(0, mid, mid);
    const edge = halfAngle / (Math.PI * 2);
    const col = (a) => `rgba(${rgb},${a})`;
    g.addColorStop(0, col(peak));
    g.addColorStop(edge * 0.55, col(peak * 0.55));
    g.addColorStop(edge, col(0));
    g.addColorStop(1 - edge, col(0));
    g.addColorStop(1 - edge * 0.55, col(peak * 0.55));
    g.addColorStop(1, col(peak));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = `rgba(${rgb},${peak * 0.8})`;
  }
  ctx.fill();
  const fade = ctx.createRadialGradient(mid, mid, range * 0.08, mid, mid, range);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.7, 'rgba(0,0,0,0.35)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  coneSprites.set(key, c);
  return c;
}

function drawCone(ctx, x, y, dir, range, halfAngle, rgb, peak) {
  const sprite = coneSprite(range, halfAngle, rgb, peak);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir);
  ctx.drawImage(sprite, -range, -range);
  ctx.restore();
  // the hot heart of the beam, close to the lamp
  const core = ctx.createRadialGradient(x, y, 1, x, y, range * 0.3);
  core.addColorStop(0, `rgba(${rgb},${peak * 0.5})`);
  core.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, range * 0.3, 0, Math.PI * 2); ctx.fill();
}

// ------------------------------------------------------------ exhibits ---

function star4(ctx, x, y, r, alpha, color = '255,240,190') {
  ctx.fillStyle = `rgba(${color},${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function namePlate(ctx, text, x, y) {
  ctx.font = 'bold 8px system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const g = ctx.createLinearGradient(0, y, 0, y + 11);
  g.addColorStop(0, '#8a6d33');
  g.addColorStop(0.5, '#6d5626');
  g.addColorStop(1, '#54401d');
  ctx.fillStyle = g;
  rrect(ctx, x - tw / 2 - 6, y, tw + 12, 11, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,233,168,0.5)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = GOLD_PALE;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 8.5);
}

function drawPatrolRoutes(ctx, world) {
  ctx.strokeStyle = 'rgba(160,180,230,0.15)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  for (const guard of world.guards) {
    ctx.beginPath();
    guard.path.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(160,180,230,0.35)';
  for (const guard of world.guards) {
    for (const [px, py] of guard.path) {
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawWalls(ctx, world) {
  for (const [x, y, w, h] of world.level.walls) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#4d5e99');
    g.addColorStop(0.45, '#333f68');
    g.addColorStop(1, '#232c4c');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // brass picture-rail along the top edge, dark skirting at the foot
    const trim = ctx.createLinearGradient(x, 0, x + w, 0);
    trim.addColorStop(0, 'rgba(160,124,54,0.85)');
    trim.addColorStop(0.5, 'rgba(240,205,120,0.95)');
    trim.addColorStop(1, 'rgba(160,124,54,0.85)');
    ctx.fillStyle = trim;
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = 'rgba(8,10,20,0.55)';
    ctx.fillRect(x, y + h - 3, w, 3);
  }
}

function drawExit(ctx, world) {
  const open = world.player.hasGem;
  if (open) {
    const pool = ctx.createRadialGradient(
      EXIT.x + EXIT.width / 2, EXIT.y + EXIT.height, 4,
      EXIT.x + EXIT.width / 2, EXIT.y + EXIT.height, 54);
    pool.addColorStop(0, 'rgba(75,227,138,0.28)');
    pool.addColorStop(1, 'rgba(75,227,138,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(EXIT.x - 30, EXIT.y - 6, EXIT.width + 60, EXIT.height + 40);
  }
  const g = ctx.createLinearGradient(0, EXIT.y, 0, EXIT.y + EXIT.height);
  if (open) { g.addColorStop(0, '#1e7a44'); g.addColorStop(1, '#0d3a20'); }
  else { g.addColorStop(0, '#4a3a1e'); g.addColorStop(1, '#241a0c'); }
  ctx.fillStyle = g;
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.width, EXIT.height);
  ctx.strokeStyle = open ? '#4be38a' : GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.width, EXIT.height);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(EXIT.x + 4, EXIT.y + 4, EXIT.width - 8, EXIT.height - 8);
  ctx.fillStyle = open ? '#c9ffe0' : GOLD_PALE;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'ESCAPE!' : 'EXIT', EXIT.x + EXIT.width / 2, EXIT.y + 20);
}

function drawLootItem(ctx, loot, time) {
  if (loot.taken) return;
  const { x, y, kind } = loot;
  shadowEllipse(ctx, x, y + 17, 19, 5, 0.35);
  // pedestal: stone body, brass cap
  const g = ctx.createLinearGradient(0, y - 6, 0, y + 16);
  g.addColorStop(0, '#2e3a5f');
  g.addColorStop(1, '#1a2240');
  ctx.fillStyle = g;
  ctx.fillRect(x - 15, y - 6, 30, 22);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - 15, y - 6, 30, 2);
  ctx.strokeStyle = 'rgba(160,124,54,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 15, y - 6, 30, 22);
  ctx.save();
  ctx.translate(x, y - 12);
  if (kind === 'coins') {
    ctx.fillStyle = '#f2c14e';
    for (const [cx, cy] of [[-7, 2], [0, -3], [7, 2], [-3, -6], [4, -7]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 4.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(0, -6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-6, 0, 1.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'vase') {
    const vg = ctx.createLinearGradient(-8, 0, 8, 0);
    vg.addColorStop(0, '#5da8ad');
    vg.addColorStop(0.45, '#a8dee2');
    vg.addColorStop(1, '#5da8ad');
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.moveTo(-5, 4); ctx.quadraticCurveTo(-9, -4, -3, -7);
    ctx.lineTo(3, -7); ctx.quadraticCurveTo(9, -4, 5, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eafbfd';
    ctx.fillRect(-3, -9, 6, 3);
  } else if (kind === 'statue') {
    const sg = ctx.createLinearGradient(-6, 0, 6, 0);
    sg.addColorStop(0, '#aeb9d4');
    sg.addColorStop(0.5, '#eef2fc');
    sg.addColorStop(1, '#98a5c4');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-4, -4, 8, 9);
    ctx.fillStyle = '#8b98b8';
    ctx.fillRect(-6, 5, 12, 2);
  } else if (kind === 'painting') {
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(-11, -12, 22, 17);
    ctx.fillStyle = '#e8c877';
    ctx.fillRect(-10, -11, 20, 1.6);
    const pg = ctx.createLinearGradient(0, -9, 0, 2);
    pg.addColorStop(0, '#315d8c');
    pg.addColorStop(1, '#1d3a5c');
    ctx.fillStyle = pg;
    ctx.fillRect(-8, -9, 16, 11);
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.arc(3, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f7d4e';
    ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-1, -3); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
  } else if (kind === 'crown') {
    const cg = ctx.createLinearGradient(0, -8, 0, 4);
    cg.addColorStop(0, '#ffe9a8');
    cg.addColorStop(0.55, '#f2c14e');
    cg.addColorStop(1, '#c1912f');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-9, 3); ctx.lineTo(-9, -5); ctx.lineTo(-4, 0); ctx.lineTo(0, -8);
    ctx.lineTo(4, 0); ctx.lineTo(9, -5); ctx.lineTo(9, 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e34d6b';
    ctx.beginPath(); ctx.arc(0, -1, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd0ff';
    ctx.beginPath(); ctx.arc(-6, 0, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 0, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // glass dome over the piece: a rim arc and one diagonal breath of light
  ctx.strokeStyle = 'rgba(190,220,255,0.30)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y - 4, 17, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,245,255,0.20)';
  ctx.beginPath(); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x - 3, y - 24); ctx.stroke();
  // treasure glints: two four-point stars breathing out of phase
  const tw1 = 0.5 + 0.5 * Math.sin(time * 2.4 + x * 1.7);
  const tw2 = 0.5 + 0.5 * Math.sin(time * 2.4 + x * 1.7 + 2.1);
  star4(ctx, x + 10, y - 23, 2 + 2.4 * tw1, 0.25 + 0.55 * tw1);
  star4(ctx, x - 11, y - 16, 1.4 + 1.6 * tw2, 0.15 + 0.4 * tw2);
  namePlate(ctx, LOOT_LABELS[kind], x, y + 20);
}

function drawGem(ctx, world) {
  const gem = world.gem;
  if (gem.taken) return;
  const { x, y } = gem;
  shadowEllipse(ctx, x, y + 26, 30, 6, 0.4);
  // case base
  const base = ctx.createLinearGradient(0, y + 20, 0, y + 30);
  base.addColorStop(0, '#2e3a5f');
  base.addColorStop(1, '#161e38');
  ctx.fillStyle = base;
  ctx.fillRect(x - 20, y + 22, 40, 8);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - 20, y + 22, 40, 1.6);
  // the Starlight Sapphire, slowly turning, with a halo
  const pulse = 1 + 0.07 * Math.sin(world.time * 2.2);
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 34 * pulse);
  halo.addColorStop(0, 'rgba(110,180,255,0.55)');
  halo.addColorStop(0.6, 'rgba(110,180,255,0.16)');
  halo.addColorStop(1, 'rgba(110,180,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.scale(pulse, pulse);
  const fg = ctx.createLinearGradient(-10, 0, 10, 0);
  fg.addColorStop(0, '#2f6fd6');
  fg.addColorStop(0.5, '#5ea9ff');
  fg.addColorStop(1, '#2f6fd6');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(10, -4); ctx.lineTo(0, 14); ctx.lineTo(-10, -4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bfe0ff';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(10, -4); ctx.lineTo(-10, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,255,0.65)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-3, -6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // glints orbiting the stone
  for (let k = 0; k < 2; k++) {
    const a = world.time * 0.9 + k * Math.PI;
    star4(ctx, x + Math.cos(a) * 19, y - 2 + Math.sin(a) * 13,
      2.6, 0.35 + 0.3 * Math.sin(world.time * 2.2 + k * 2), '190,225,255');
  }
  // glass case: gradient pane, brass corner brackets, one long reflection
  const glass = ctx.createLinearGradient(x - 26, y - 30, x + 26, y + 22);
  glass.addColorStop(0, 'rgba(200,230,255,0.17)');
  glass.addColorStop(0.4, 'rgba(200,230,255,0.04)');
  glass.addColorStop(1, 'rgba(200,230,255,0.10)');
  ctx.fillStyle = glass;
  ctx.fillRect(x - 26, y - 30, 52, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 20); ctx.lineTo(x - 6, y - 28); ctx.lineTo(x + 2, y - 28);
  ctx.lineTo(x - 12, y + 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(190,220,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 26, y - 30, 52, 52);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.4;
  for (const [cx, cy, dx, dy] of [[-26, -30, 1, 1], [26, -30, -1, 1], [-26, 22, 1, -1], [26, 22, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 9, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 9);
    ctx.stroke();
  }
  // the velvet rope on brass posts that keeps honest visitors back
  ctx.strokeStyle = '#8c2434';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 32, y + 36);
  ctx.quadraticCurveTo(x, y + 47, x + 32, y + 36);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,150,160,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 32, y + 35);
  ctx.quadraticCurveTo(x, y + 45, x + 32, y + 35);
  ctx.stroke();
  ctx.fillStyle = '#c9a44e';
  for (const px of [x - 32, x + 32]) {
    ctx.fillRect(px - 1.5, y + 28, 3, 12);
    ctx.beginPath(); ctx.arc(px, y + 27, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(px - 1, y + 26, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a44e';
  }
  namePlate(ctx, 'STARLIGHT SAPPHIRE', x, y + 50);
}

function drawLasers(ctx, world) {
  for (const laser of world.lasers) {
    if (laser.activeNow) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,60,80,0.9)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(255,60,80,0.28)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.strokeStyle = '#ff5f73';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,225,230,0.9)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
    }
    // emitter housings with a live (or sleeping) ruby eye
    for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
      const g = ctx.createLinearGradient(ex - 4, ey - 4, ex + 4, ey + 4);
      g.addColorStop(0, '#7d86a3');
      g.addColorStop(1, '#3d445e');
      ctx.fillStyle = g;
      rrect(ctx, ex - 4, ey - 4, 8, 8, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,214,245,0.4)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      if (laser.activeNow) {
        ctx.save();
        ctx.shadowColor = '#ff4655';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#ff8b98';
        ctx.beginPath(); ctx.arc(ex, ey, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#571f28';
        ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

// -------------------------------------------------------------- figures ---

function drawGuard(ctx, guard, time) {
  const { x, y } = guard;
  shadowEllipse(ctx, x, y + 11, 14, 5, 0.38);
  // moonlight rim on the shoulder line, before the body turns
  ctx.strokeStyle = 'rgba(170,205,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 11.4, Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  const bg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  bg.addColorStop(0, '#2c4a85');
  bg.addColorStop(1, '#16294f');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0a1428';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.rotate(guard.dir);
  // gold shoulder boards
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(6, -8, 3, 4);
  ctx.fillRect(6, 4, 3, 4);
  // the flashlight in his forward hand, lens lit
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(8, -2.6, 6, 5.2);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(14.2, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-guard.dir);
  // cap with a brass badge, drawn unrotated so it sits on the head
  const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
  cg.addColorStop(0, '#22386a');
  cg.addColorStop(1, '#101f3e');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  void time;
}

function drawCamera(ctx, cam) {
  shadowEllipse(ctx, cam.x, cam.y + 9, 10, 3.6, 0.3);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.dir);
  const g = ctx.createLinearGradient(0, -6, 0, 6);
  g.addColorStop(0, '#59638a');
  g.addColorStop(0.5, '#39415f');
  g.addColorStop(1, '#232a45');
  ctx.fillStyle = g;
  rrect(ctx, -5, -6, 15, 12, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,205,240,0.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // lens barrel and glass
  ctx.fillStyle = '#10152a';
  ctx.fillRect(8, -3.4, 6, 6.8);
  const lens = ctx.createRadialGradient(14.6, -1, 0.4, 13.6, 0, 3);
  lens.addColorStop(0, '#cfe8ff');
  lens.addColorStop(0.5, '#3f7fc9');
  lens.addColorStop(1, '#0d1c38');
  ctx.fillStyle = lens;
  ctx.beginPath(); ctx.arc(13.6, 0, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = (Math.floor(performance.now() / 500) % 2 === 0) ? '#ff4655' : '#7a1620';
  ctx.beginPath(); ctx.arc(cam.x - 3, cam.y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  shadowEllipse(ctx, p.x, p.y + 11, 13, 4.6, 0.4);
  // cold rim light from the high windows, fixed to the room, not the man
  ctx.strokeStyle = 'rgba(175,210,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 10.6, Math.PI * 0.92, Math.PI * 1.62); ctx.stroke();
  ctx.save();
  ctx.translate(p.x, p.y);
  // loot sack on the back, fuller once the gem is in it
  const sack = ctx.createRadialGradient(-8, 3, 1, -6, 5, 8);
  sack.addColorStop(0, p.hasGem ? '#a87f33' : '#6b5626');
  sack.addColorStop(1, p.hasGem ? '#5f451a' : '#3a2d12');
  ctx.fillStyle = sack;
  ctx.beginPath(); ctx.arc(-6, 5, p.hasGem ? 7 : 5.5, 0, Math.PI * 2); ctx.fill();
  // body: black thief outfit with a soft sheen
  const bg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 12);
  bg.addColorStop(0, '#232b3f');
  bg.addColorStop(1, '#0b0e16');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#39445f';
  ctx.lineWidth = 1.6; ctx.stroke();
  ctx.rotate(p.dir);
  // face and mask stripe, pointing the way he moves
  ctx.fillStyle = '#eec9a0';
  ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101319';
  ctx.fillRect(2, -6, 6, 3.4);
  ctx.fillRect(2, 2.6, 6, 3.4);
  ctx.fillStyle = '#dfe9ff';
  ctx.beginPath(); ctx.arc(5.4, -3.4, 1.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5.4, 3.4, 1.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(160,190,255,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ------------------------------------------------------- light and air ---

let vignetteCache = null;
function drawVignette(ctx) {
  if (!vignetteCache) {
    vignetteCache = document.createElement('canvas');
    vignetteCache.width = W;
    vignetteCache.height = H;
    const vc = vignetteCache.getContext('2d');
    const g = vc.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.86);
    g.addColorStop(0, 'rgba(2,3,9,0)');
    g.addColorStop(0.75, 'rgba(2,3,9,0.18)');
    g.addColorStop(1, 'rgba(2,3,9,0.52)');
    vc.fillStyle = g;
    vc.fillRect(0, 0, W, H);
    const top = vc.createLinearGradient(0, 0, 0, 90);
    top.addColorStop(0, 'rgba(2,3,9,0.25)');
    top.addColorStop(1, 'rgba(2,3,9,0)');
    vc.fillStyle = top;
    vc.fillRect(0, 0, W, 90);
  }
  ctx.drawImage(vignetteCache, 0, 0);
}

function drawDust(ctx, world) {
  // dust motes drifting in the three moonlight shafts
  ctx.fillStyle = '#cfe0ff';
  for (let i = 0; i < 42; i++) {
    const shaft = [[120, 90, 110], [430, 110, 130], [730, 80, 100]][i % 3];
    const fx = hash(i, 7);
    const fy = hash(i, 13);
    const x = shaft[0] + fx * shaft[2] + shaft[1] * fy + Math.sin(world.time * 0.4 + i * 1.7) * 3;
    const y = 24 + ((fy * 260 + world.time * (4 + (i % 5))) % 268);
    const tw = 0.5 + 0.5 * Math.sin(world.time * 1.3 + i * 2.3);
    ctx.globalAlpha = 0.05 + 0.1 * tw;
    ctx.beginPath(); ctx.arc(x, y, i % 4 === 0 ? 1.5 : 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpotPools(ctx, world) {
  // each exhibit sits in its own warm pool of picture light
  const pool = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, `rgba(255,214,140,${a})`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  for (const loot of world.loots) if (!loot.taken) pool(loot.x, loot.y - 6, 40, 0.10);
  if (!world.gem.taken) pool(world.gem.x, world.gem.y, 58, 0.13);
}

// ------------------------------------------------------------------ HUD ---

function glassPanel(ctx, x, y, w, h, r = 8) {
  ctx.fillStyle = 'rgba(6,10,22,0.80)';
  rrect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,164,78,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,240,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(x + r, y + 1.5);
  ctx.lineTo(x + w - r, y + 1.5);
  ctx.stroke();
}

function drawAlarmBar(ctx, world) {
  const x = 16, y = 12, w = 330, h = 16;
  glassPanel(ctx, x - 8, y - 8, w + 16, h + 42, 9);
  ctx.fillStyle = 'rgba(16,20,36,0.9)';
  rrect(ctx, x, y, w, h, 7);
  ctx.fill();
  const frac = world.alarm / ALARM.max;
  const hot = world.spottedBy > 0;
  if (frac > 0.01) {
    ctx.save();
    rrect(ctx, x, y, w, h, 7);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (frac > 0.7) { g.addColorStop(0, '#c22e3e'); g.addColorStop(1, '#ff7a5c'); }
    else if (frac > 0.35) { g.addColorStop(0, '#e07f2e'); g.addColorStop(1, '#ffc46b'); }
    else { g.addColorStop(0, '#2fbf71'); g.addColorStop(1, '#5eeaa0'); }
    if (hot && Math.floor(world.time * 6) % 2 === 0) { g.addColorStop(0, '#ffd166'); g.addColorStop(1, '#ffd166'); }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * frac, h);
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(x, y, w * frac, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let sx = x + 33; sx < x + w * frac; sx += 33) ctx.fillRect(sx, y, 1.4, h);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(160,175,215,0.6)';
  ctx.lineWidth = 1;
  rrect(ctx, x, y, w, h, 7);
  ctx.stroke();
  ctx.fillStyle = hot ? '#ffd166' : '#e8ecf8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(hot ? 'ALARM — SPOTTED!' : 'ALARM', x + 2, y + h + 14);
}

function drawHud(ctx, world) {
  drawAlarmBar(ctx, world);
  glassPanel(ctx, W - 324, 6, 308, 50, 9);
  ctx.fillStyle = '#f0e7cd';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  const mins = Math.floor(world.time / 60);
  const secs = String(Math.floor(world.time % 60)).padStart(2, '0');
  ctx.fillText(`SCORE ${world.score}`, W - 24, 28);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#aeb9d9';
  ctx.fillText(`${world.level.name}   •   ${mins}:${secs}   •   Loot ${world.lootTaken}/${world.loots.length}${world.player.hasGem ? '   •   SAPPHIRE ✓' : ''}`, W - 24, 46);
  // objective strip along the bottom, above the exit wall
  glassPanel(ctx, 14, H - 46, 564, 24, 7);
  ctx.fillStyle = '#d5defa';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.player.hasGem ? 'The sapphire is yours — reach the south EXIT!' : world.level.objective, 22, H - 29, 548);
}

function drawPlay(ctx, world) {
  ctx.drawImage(staticLayer(world), 0, 0);
  drawSpotPools(ctx, world);
  drawPatrolRoutes(ctx, world);
  drawExit(ctx, world);
  // vision beams under the actors but over the floor
  for (const guard of world.guards) {
    drawCone(ctx, guard.x, guard.y, guard.dir, GUARD.visionRange, GUARD.visionHalfAngle,
      '255,214,120', 0.52);
  }
  for (const cam of world.cameras) {
    drawCone(ctx, cam.x, cam.y, cam.dir, CAMERA.visionRange, CAMERA.visionHalfAngle,
      '255,90,110', 0.42);
  }
  drawWalls(ctx, world);
  for (const loot of world.loots) drawLootItem(ctx, loot, world.time);
  drawGem(ctx, world);
  drawLasers(ctx, world);
  for (const cam of world.cameras) drawCamera(ctx, cam);
  for (const guard of world.guards) drawGuard(ctx, guard, world.time);
  drawPlayer(ctx, world);
  drawDust(ctx, world);
  if (world.alarmFlash > 0) {
    ctx.fillStyle = `rgba(255,60,80,${world.alarmFlash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawVignette(ctx);
  drawHud(ctx, world);
}

// --------------------------------------------------------------- panels ---

function drawSpaced(ctx, text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

function panel(ctx, title, lines, accent) {
  // a dimmed museum behind, and the words set on a brass-framed plaque,
  // the way a gallery prints its room card
  const dim = ctx.createLinearGradient(0, 0, 0, H);
  dim.addColorStop(0, 'rgba(3,5,12,0.80)');
  dim.addColorStop(1, 'rgba(3,5,12,0.90)');
  ctx.fillStyle = dim;
  ctx.fillRect(0, 0, W, H);

  const pw = 780;
  const ph = 158 + lines.length * 28;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  ctx.fillStyle = 'rgba(4,6,14,0.93)';
  rrect(ctx, px, py, pw, ph, 10);
  ctx.fill();
  // double brass frame with diamond corners
  ctx.strokeStyle = 'rgba(201,164,78,0.85)';
  ctx.lineWidth = 2;
  rrect(ctx, px, py, pw, ph, 10);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(201,164,78,0.4)';
  ctx.lineWidth = 1;
  rrect(ctx, px + 7, py + 7, pw - 14, ph - 14, 6);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  const cx = W / 2;
  let ty = py + 66;
  // a small sapphire over the title
  ctx.save();
  ctx.translate(cx, py + 30);
  ctx.fillStyle = '#3f8cff';
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(6.5, -2.5); ctx.lineTo(0, 9); ctx.lineTo(-6.5, -2.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bfe0ff';
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(6.5, -2.5); ctx.lineTo(-6.5, -2.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  if (title === 'MOONLIT MUSEUM') {
    const tg = ctx.createLinearGradient(0, ty - 34, 0, ty + 6);
    tg.addColorStop(0, '#f7e7ba');
    tg.addColorStop(0.55, '#e3c877');
    tg.addColorStop(1, '#b28c3a');
    ctx.fillStyle = tg;
    ctx.font = '600 40px Georgia, "Times New Roman", serif';
    drawSpaced(ctx, title, cx, ty, 7);
  } else {
    ctx.fillStyle = accent;
    ctx.font = '600 40px Georgia, "Times New Roman", serif';
    drawSpaced(ctx, title, cx, ty, 5);
  }
  // hairline rules under the title
  ctx.strokeStyle = 'rgba(201,164,78,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 210, ty + 20); ctx.lineTo(cx - 14, ty + 20);
  ctx.moveTo(cx + 14, ty + 20); ctx.lineTo(cx + 210, ty + 20);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.save();
  ctx.translate(cx, ty + 20);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-3.4, -3.4, 6.8, 6.8);
  ctx.restore();

  ctx.font = '16.5px system-ui, sans-serif';
  lines.forEach((line, i) => {
    if (i === 0 && title === 'MOONLIT MUSEUM') {
      ctx.fillStyle = '#cfe0ff';
      ctx.font = '15px system-ui, sans-serif';
      drawSpaced(ctx, line, cx, ty + 52 + i * 28, 4);
      ctx.font = '16.5px system-ui, sans-serif';
    } else if (line.includes('galleries •')) {
      ctx.fillStyle = GOLD_PALE;
      ctx.fillText(line, cx, ty + 52 + i * 28);
    } else {
      ctx.fillStyle = '#dfe6fa';
      ctx.fillText(line, cx, ty + 52 + i * 28);
    }
  });
}

export function render(ctx, world, ui) {
  if (world.screen === SCREEN_TITLE || ui.screen === SCREEN_TITLE) {
    // title over a live, dimmed museum floor
    drawPlay(ctx, world);
    panel(ctx, 'MOONLIT MUSEUM', [
      'S A P P H I R E   H E I S T',
      '',
      'Sneak past the guards and cameras. Steal the Starlight Sapphire.',
      '5 galleries • 20 guards • 14 cameras • 37 treasures • 17 laser tripwires',
      'Read the dotted patrol routes — a paused guard still looks around.',
      'WASD / Arrow keys to move • Hold SHIFT to sneak • M to mute',
      '',
      'Press ENTER or click to begin the heist',
    ], '#9fd0ff');
    return;
  }
  drawPlay(ctx, world);
  if (world.screen === SCREEN_CAUGHT) {
    panel(ctx, 'CAUGHT!', [
      `The alarm hit full on ${world.level.name}.`,
      `Score banked before the cuffs: ${world.score}`,
      '',
      'Press ENTER or click to try the night again',
    ], '#ff6b7a');
  } else if (world.screen === SCREEN_WIN) {
    panel(ctx, 'CLEAN GETAWAY!', [
      'All five galleries robbed blind. The museum will notice at dawn.',
      `Final gallery grade: ${world.grade ?? '—'}   •   Final score: ${world.score}`,
      '',
      'Press ENTER or click to run the whole heist again',
    ], '#4be38a');
  } else if (ui.transition > 0) {
    panel(ctx, 'ESCAPED!', [
      `${world.level.name} cleared — getaway grade ${world.grade ?? '—'}`,
      `Loot ${world.lootTaken}/${world.loots.length}   •   Peak alarm ${Math.round(world.alarmPeak)}%   •   Score so far: ${world.score}`,
      '',
      'Press ENTER or click for the next gallery',
    ], '#4be38a');
  }
  void SCREEN_PLAY;
}
