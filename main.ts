// Moonlit Museum: Sapphire Heist — entrypoint that hands the game to make.fun.
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser and play; there is no build step and it makes no network
// requests). This program's one job is delivery: copy game/ and
// screenshots/ into the output directory and write dossier.json there with
// the vendored make.fun library, so the judge receives exactly what a
// player would download.
//
// Run it the way the grader does (Node 22, standard library only):
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty, mirrored from the kit's gate table:
// screenshots at most 4 files of 256 KiB each; the game tree at most 993
// files and 48 MiB in total, with no single path longer than 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function countImages(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => /\.(png|jpe?g)$/i.test(name)).length;
}

function deliver() {
  const gameFrom = join(repoRoot, 'game');
  const shotsFrom = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameFrom, 'index.html'))) {
    throw new Error('game/index.html is missing: there is no game to hand in');
  }
  const shotCount = countImages(shotsFrom);
  if (shotCount === 0) {
    throw new Error('screenshots/ holds no image: the first screenshot is the cover');
  }
  copyTree(gameFrom, join(outputDir, 'game'));
  copyTree(shotsFrom, join(outputDir, 'screenshots'));
  const dossier = buildDossier(outputDir, DOSSIER_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`delivered game/ and ${shotCount} screenshot(s) to ${outputDir}; dossier.json written`);
}

try {
  deliver();
} catch (err) {
  console.error(`delivery failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
