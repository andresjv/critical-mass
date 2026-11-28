// GunSound — short synthesised gunshots for the ground assault: a noise crack through a
// bandpass whose pitch and length depend on the gun, plus a low body thump for heavy guns.
// Laser is a zappy falling tone. (Math.random here only shapes sound texture.)
import { getAudioCtx, getBus } from './audioCtx';
import type { GunId } from '../../state/armory';

let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Crack frequency (Hz), length (s), loudness, low thump (0..1). */
const VOICE: Record<GunId | 'enemy' | 'nest', [number, number, number, number]> = {
  pistol: [2200, 0.09, 0.35, 0.2], smg: [2800, 0.06, 0.22, 0.05], shotgun: [1200, 0.22, 0.45, 0.7],
  rifle: [2000, 0.08, 0.3, 0.25], burst: [1800, 0.08, 0.32, 0.3], sniper: [1400, 0.28, 0.5, 0.8],
  lmg: [1700, 0.07, 0.28, 0.3], rocket: [600, 0.35, 0.4, 0.9], laser: [0, 0.12, 0.2, 0],
  enemy: [1900, 0.07, 0.14, 0.1], nest: [1600, 0.06, 0.16, 0.15],
};

export function playShot(kind: GunId | 'enemy' | 'nest'): void {
  const ctx = getAudioCtx(), out = getBus('sfx');
  if (!ctx || !out) return;
  const [f, len, vol, thump] = VOICE[kind];
  const t0 = ctx.currentTime;
  if (kind === 'laser') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1800, t0); o.frequency.exponentialRampToValueAtTime(260, t0 + len);
    g.gain.setValueAtTime(vol * 0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + len + 0.02);
    return;
  }
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise(ctx);
  bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(f * (0.9 + Math.random() * 0.2), t0);
  bp.frequency.exponentialRampToValueAtTime(f * 0.35, t0 + len);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  src.connect(bp); bp.connect(g); g.connect(out);
  src.start(t0, Math.random() * 0.2); src.stop(t0 + len + 0.02);
  if (thump > 0.1) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(50, t0 + 0.12);
    og.gain.setValueAtTime(thump * 0.45, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 0.17);
  }
}

/** Empty-mag reload clack. */
export function playReload(): void {
  const ctx = getAudioCtx(), out = getBus('sfx');
  if (!ctx || !out) return;
  const t0 = ctx.currentTime;
  for (const [dt, f] of [[0, 3200], [0.12, 2400]] as const) {
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise(ctx); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
    g.gain.setValueAtTime(0.18, t0 + dt); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.04);
    src.connect(bp); bp.connect(g); g.connect(out); src.start(t0 + dt); src.stop(t0 + dt + 0.06);
  }
}
