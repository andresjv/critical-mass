// Shared AudioContext singleton plus a small mixer:
//   music ┐
//   sfx   ├─► limiter ─► master ─► speakers
//   radio ┘
// getAudioCtx()/getBus() return null until resumeCtx() runs inside a real
// user-gesture handler (browser autoplay policy).

import { AUDIO_MIX } from '../../state/tuning';

export type Bus = 'music' | 'sfx' | 'radio';

let _ctx: AudioContext | null = null;
let _buses: Record<Bus, GainNode> | null = null;

function buildMixer(ctx: AudioContext): Record<Bus, GainNode> {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value      = 6;
  limiter.ratio.value     = 12;
  limiter.attack.value    = 0.003;
  limiter.release.value   = 0.25;
  const master = ctx.createGain();
  master.gain.value = AUDIO_MIX.master;
  limiter.connect(master);
  master.connect(ctx.destination);

  const bus = (level: number): GainNode => {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(limiter);
    return g;
  };
  return { music: bus(AUDIO_MIX.music), sfx: bus(AUDIO_MIX.sfx), radio: bus(AUDIO_MIX.radio) };
}

/** Returns the running context, or null if not yet unlocked / still suspended. */
export function getAudioCtx(): AudioContext | null {
  if (!_ctx) return null;
  if (_ctx.state !== 'running') {
    if (!document.hidden) _ctx.resume().catch(() => {}); // stay silent while backgrounded
    return null;
  }
  return _ctx;
}

export function getBus(name: Bus): GainNode | null {
  return getAudioCtx() && _buses ? _buses[name] : null;
}

let _musicLevel: number = AUDIO_MIX.music;

/** Briefly lowers the music channel so a big effect cuts through. */
export function duckMusic(): void {
  const ctx = getAudioCtx();
  if (!ctx || !_buses) return;
  const g = _buses.music.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(_musicLevel * AUDIO_MIX.musicDuckOnExplosion, t);
  g.linearRampToValueAtTime(_musicLevel, t + AUDIO_MIX.duckRecoverSecs);
}

/** Music keeps playing while paused, just quieter. */
export function setMusicPaused(paused: boolean): void {
  _musicLevel = AUDIO_MIX.music * (paused ? AUDIO_MIX.musicWhenPaused : 1);
  if (!_ctx || !_buses) return;
  const g = _buses.music.gain;
  const t = _ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(_musicLevel, t + 0.25);
}

/** Silence everything while the tab/app is in the background. */
export function setPageHidden(hidden: boolean): void {
  if (!_ctx) return;
  if (hidden) _ctx.suspend().catch(() => {});
  else _ctx.resume().catch(() => {});
}

/** Creates (if needed) and resumes the context. Call directly in a gesture handler. */
export function resumeCtx(): void {
  if (!_ctx) {
    try { _ctx = new AudioContext(); } catch { return; }
    _buses = buildMixer(_ctx);
  }
  if (_ctx.state !== 'running') _ctx.resume().catch(() => {});
}

export function closeCtx(): void {
  if (_ctx) { _ctx.close().catch(() => {}); _ctx = null; _buses = null; }
}
