// Tiny WebAudio synth: every sound is generated, no audio files are loaded.

let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 1, slideTo = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.9, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  pickup() {
    tone(880, 0, 0.09, 'triangle', 0.7);
    tone(1318, 0.07, 0.12, 'triangle', 0.7);
  },
  gem() {
    tone(1046, 0, 0.1, 'triangle', 0.8);
    tone(1318, 0.08, 0.1, 'triangle', 0.8);
    tone(1760, 0.16, 0.2, 'triangle', 0.9);
  },
  spotted() {
    tone(196, 0, 0.16, 'sawtooth', 0.5, 147);
  },
  laser() {
    tone(1560, 0, 0.08, 'square', 0.4, 780);
  },
  caught() {
    tone(392, 0, 0.18, 'sawtooth', 0.7);
    tone(311, 0.16, 0.18, 'sawtooth', 0.7);
    tone(233, 0.32, 0.42, 'sawtooth', 0.8);
  },
  escape() {
    tone(523, 0, 0.11, 'triangle', 0.8);
    tone(659, 0.1, 0.11, 'triangle', 0.8);
    tone(784, 0.2, 0.11, 'triangle', 0.8);
    tone(1046, 0.3, 0.26, 'triangle', 0.9);
  },
  step(sneak) {
    tone(sneak ? 90 : 120, 0, 0.05, 'sine', 0.18);
  },
};
