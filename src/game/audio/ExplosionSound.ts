// ExplosionSound — low pitch-dropping thump + filtered noise roar.
// Size (px radius) scales loudness and length; ducks the music so it cuts through.

import { getAudioCtx, getBus, duckMusic } from './audioCtx';

let noiseBuf: AudioBuffer | null = null;

function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

export function playExplosion(size: number): void {
  const ctx = getAudioCtx();
  const out = getBus('sfx');
  if (!ctx || !out) return;
  const k   = Math.min(1, size / 80);       // 0..1, biggest blast = 80
  const dur = 0.45 + 0.55 * k;
  const t0  = ctx.currentTime;

  // Thump: sine 140→38 Hz.
  const osc = ctx.createOscillator();
  const og  = ctx.createGain();
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.25);
  og.gain.setValueAtTime(0.5 + 0.4 * k, t0);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
  osc.connect(og); og.connect(out);
  osc.start(t0); osc.stop(t0 + 0.4);

  // Roar: noise through a closing lowpass.
  const src  = ctx.createBufferSource();
  const filt = ctx.createBiquadFilter();
  const ng   = ctx.createGain();
  src.buffer = getNoise(ctx);
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(3500, t0);
  filt.frequency.exponentialRampToValueAtTime(180, t0 + dur);
  ng.gain.setValueAtTime(0.35 + 0.35 * k, t0);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(ng); ng.connect(out);
  src.start(t0); src.stop(t0 + dur + 0.05);

  if (k > 0.6) duckMusic();
}
