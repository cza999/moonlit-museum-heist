// Canvas rendering for Moonlit Museum: Sapphire Heist.
// A moonlit museum: deep blue stone floors, burgundy carpets, brass-trimmed
// pedestals under glass, warm flashlight cones and cold camera fans.

import { ALARM, CAMERA, EXIT, FIELD, GUARD } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const W = FIELD.width;
const H = FIELD.height;

function cone(ctx, x, y, dir, range, halfAngle, inner, outer) {
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawFloor(ctx, world) {
  ctx.fillStyle = '#131a2e';
  ctx.fillRect(0, 0, W, H);
  // stone tiles
  ctx.strokeStyle = 'rgba(120,140,190,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 16; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 16; y < H; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // carpets
  for (const [x, y, w, h] of world.level.carpets) {
    ctx.fillStyle = '#4a1626';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
}

function drawWalls(ctx, world) {
  for (const [x, y, w, h] of world.level.walls) {
    ctx.fillStyle = '#2b3350';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#46538a';
    ctx.fillRect(x, y, w, 3);
  }
}

function drawExit(ctx, world) {
  const open = world.player.hasGem;
  ctx.fillStyle = open ? '#1d5c38' : '#3a2c18';
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.width, EXIT.height);
  ctx.strokeStyle = open ? '#4be38a' : '#8a6a2f';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.width, EXIT.height);
  ctx.fillStyle = open ? '#b8ffd6' : '#c9b489';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'ESCAPE!' : 'EXIT', EXIT.x + EXIT.width / 2, EXIT.y + 20);
}

function drawLootItem(ctx, loot, time) {
  if (loot.taken) return;
  const { x, y, kind } = loot;
  // pedestal
  ctx.fillStyle = '#232c49';
  ctx.fillRect(x - 15, y - 6, 30, 22);
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 1.5;
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
  } else if (kind === 'vase') {
    ctx.fillStyle = '#7fc4c9';
    ctx.beginPath();
    ctx.moveTo(-5, 4); ctx.quadraticCurveTo(-9, -4, -3, -7);
    ctx.lineTo(3, -7); ctx.quadraticCurveTo(9, -4, 5, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9f4f6';
    ctx.fillRect(-3, -9, 6, 3);
  } else if (kind === 'statue') {
    ctx.fillStyle = '#cfd6ea';
    ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-4, -4, 8, 9);
    ctx.fillStyle = '#9aa7c7';
    ctx.fillRect(-6, 5, 12, 2);
  } else if (kind === 'painting') {
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(-11, -12, 22, 17);
    ctx.fillStyle = '#274b73';
    ctx.fillRect(-8, -9, 16, 11);
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.arc(3, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f7d4e';
    ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-1, -3); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
  } else if (kind === 'crown') {
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(-9, 3); ctx.lineTo(-9, -5); ctx.lineTo(-4, 0); ctx.lineTo(0, -8);
    ctx.lineTo(4, 0); ctx.lineTo(9, -5); ctx.lineTo(9, 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e34d6b';
    ctx.beginPath(); ctx.arc(0, -1, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // a soft sparkle so treasure reads at a glance
  const tw = 0.5 + 0.5 * Math.sin(time * 2.4 + x);
  ctx.fillStyle = `rgba(255,240,190,${0.25 + 0.3 * tw})`;
  ctx.beginPath(); ctx.arc(x + 9, y - 22, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawGem(ctx, world) {
  const gem = world.gem;
  if (gem.taken) return;
  const { x, y } = gem;
  // glass case
  ctx.fillStyle = 'rgba(160,200,255,0.10)';
  ctx.fillRect(x - 26, y - 30, 52, 52);
  ctx.strokeStyle = 'rgba(190,220,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 26, y - 30, 52, 52);
  ctx.fillStyle = '#232c49';
  ctx.fillRect(x - 20, y + 22, 40, 8);
  // the Starlight Sapphire, slowly turning, with a halo
  const pulse = 1 + 0.07 * Math.sin(world.time * 2.2);
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 30 * pulse);
  halo.addColorStop(0, 'rgba(110,180,255,0.5)');
  halo.addColorStop(1, 'rgba(110,180,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#3f8cff';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(10, -4); ctx.lineTo(0, 14); ctx.lineTo(-10, -4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9fd0ff';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(10, -4); ctx.lineTo(-10, -4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8f5ff';
  ctx.beginPath(); ctx.arc(-3, -6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#bcd9ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STARLIGHT SAPPHIRE', x, y + 46);
}

function drawLasers(ctx, world) {
  for (const laser of world.lasers) {
    ctx.fillStyle = '#59617d';
    ctx.fillRect(laser.x1 - 3, laser.y1 - 3, 6, 6);
    ctx.fillRect(laser.x2 - 3, laser.y2 - 3, 6, 6);
    if (laser.activeNow) {
      ctx.strokeStyle = 'rgba(255,60,80,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,60,80,0.25)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
    }
  }
}

function drawGuard(ctx, guard, time) {
  const { x, y } = guard;
  ctx.save();
  ctx.translate(x, y);
  // body: navy uniform
  ctx.fillStyle = '#1d2f57';
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0e1830';
  ctx.lineWidth = 2; ctx.stroke();
  // shoulders turn with facing
  ctx.rotate(guard.dir);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(6, -8, 3, 4);
  ctx.fillRect(6, 4, 3, 4);
  // cap
  ctx.fillStyle = '#14264a';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(4, -2.5, 6, 5);
  ctx.restore();
  void time;
}

function drawCamera(ctx, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.dir);
  ctx.fillStyle = '#39415f';
  ctx.fillRect(-4, -6, 14, 12);
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(8, -3, 5, 6);
  ctx.restore();
  ctx.fillStyle = (Math.floor(performance.now() / 500) % 2 === 0) ? '#ff4655' : '#7a1620';
  ctx.beginPath(); ctx.arc(cam.x, cam.y, 2.6, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // loot sack on the back, fuller once the gem is in it
  ctx.fillStyle = p.hasGem ? '#7a5a22' : '#4d3d1e';
  ctx.beginPath(); ctx.arc(-6, 5, p.hasGem ? 7 : 5.5, 0, Math.PI * 2); ctx.fill();
  // body: black thief outfit
  ctx.fillStyle = '#101319';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2c3448';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.rotate(p.dir);
  // face and mask stripe, pointing the way he moves
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101319';
  ctx.fillRect(2, -6, 6, 3.4);
  ctx.fillRect(2, 2.6, 6, 3.4);
  ctx.restore();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(160,190,255,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawAlarmBar(ctx, world) {
  const x = 16, y = 12, w = 330, h = 16;
  ctx.fillStyle = 'rgba(5,8,18,0.72)';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 26);
  ctx.fillStyle = '#39415f';
  ctx.fillRect(x, y, w, h);
  const frac = world.alarm / ALARM.max;
  const hot = world.spottedBy > 0;
  ctx.fillStyle = frac > 0.7 ? '#ff4655' : frac > 0.35 ? '#ff9f43' : '#4be38a';
  if (hot && Math.floor(world.time * 6) % 2 === 0) ctx.fillStyle = '#ffd166';
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#8a94b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#e8ecf8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(hot ? 'ALARM — SPOTTED!' : 'ALARM', x + 2, y + h + 14);
}

function drawHud(ctx, world) {
  drawAlarmBar(ctx, world);
  ctx.fillStyle = 'rgba(5,8,18,0.72)';
  ctx.fillRect(W - 316, 8, 300, 46);
  ctx.fillStyle = '#e8ecf8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  const mins = Math.floor(world.time / 60);
  const secs = String(Math.floor(world.time % 60)).padStart(2, '0');
  ctx.fillText(`SCORE ${world.score}`, W - 24, 28);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#aeb9d9';
  ctx.fillText(`${world.level.name}   •   ${mins}:${secs}   •   Loot ${world.lootTaken}/${world.loots.length}${world.player.hasGem ? '   •   SAPPHIRE ✓' : ''}`, W - 24, 46);
  // objective strip along the bottom, above the exit wall
  ctx.fillStyle = 'rgba(5,8,18,0.6)';
  ctx.fillRect(16, H - 44, 560, 22);
  ctx.fillStyle = '#c9d4f2';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(world.player.hasGem ? 'The sapphire is yours — reach the south EXIT!' : world.level.objective, 22, H - 29, 548);
}

function drawPlay(ctx, world) {
  drawFloor(ctx, world);
  drawExit(ctx, world);
  // vision cones under the actors but over the floor
  for (const guard of world.guards) {
    cone(ctx, guard.x, guard.y, guard.dir, GUARD.visionRange, GUARD.visionHalfAngle,
      'rgba(255,214,120,0.34)', 'rgba(255,214,120,0.02)');
  }
  for (const cam of world.cameras) {
    cone(ctx, cam.x, cam.y, cam.dir, CAMERA.visionRange, CAMERA.visionHalfAngle,
      'rgba(255,90,110,0.26)', 'rgba(255,90,110,0.02)');
  }
  drawWalls(ctx, world);
  for (const loot of world.loots) drawLootItem(ctx, loot, world.time);
  drawGem(ctx, world);
  drawLasers(ctx, world);
  for (const cam of world.cameras) drawCamera(ctx, cam);
  for (const guard of world.guards) drawGuard(ctx, guard, world.time);
  drawPlayer(ctx, world);
  if (world.alarmFlash > 0) {
    ctx.fillStyle = `rgba(255,60,80,${world.alarmFlash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawHud(ctx, world);
}

function panel(ctx, title, lines, accent) {
  // Opaque enough that the gem label and HUD text behind the panel do not
  // ghost through the title lines at thumbnail size.
  ctx.fillStyle = 'rgba(4,6,14,0.9)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 218);
  ctx.fillStyle = '#dfe6fa';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 268 + i * 28));
}

export function render(ctx, world, ui) {
  if (world.screen === SCREEN_TITLE || ui.screen === SCREEN_TITLE) {
    // title over a live, dimmed museum floor
    drawPlay(ctx, world);
    panel(ctx, 'MOONLIT MUSEUM', [
      'S A P P H I R E   H E I S T',
      '',
      'Sneak past the guards and cameras. Steal the Starlight Sapphire.',
      '3 galleries • 9 guards • 6 cameras • 18 treasures • laser vault',
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
      'All three galleries robbed blind. The museum will notice at dawn.',
      `Final score: ${world.score}`,
      '',
      'Press ENTER or click to run the whole heist again',
    ], '#4be38a');
  } else if (ui.transition > 0) {
    panel(ctx, 'ESCAPED!', [
      `Gallery cleared. Score so far: ${world.score}`,
      '',
      'Press ENTER or click for the next gallery',
    ], '#4be38a');
  }
  void SCREEN_PLAY;
}
