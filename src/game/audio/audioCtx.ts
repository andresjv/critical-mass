// Shared AudioContext singleton plus a small mixer:
//   music ┐
//   sfx   ├─► limiter ─► master ─► speakers
//   radio ┘
// getAudioCtx()/getBus() return null until resumeCtx() runs inside a real
// user-gesture handler (browser autoplay policy).

import { AUDIO_MIX } from '../../state/tuning';
import { settings, onSettingsChange } from '../../state/settings';

export type Bus = 'music' | 'sfx' | 'radio';

let _ctx: AudioContext | null = null;
let _paused = false;
/** Current music bus target: mix level × player volume × pause dip. */
let _musicLevel: number = musicLevel();

function musicLevel(): number {
  return AUDIO_MIX.music * settings.musicVolume * (_paused ? AUDIO_MIX.musicWhenPaused : 1);
}
function sfxLevel(): number   { return AUDIO_MIX.sfx * settings.sfxVolume; }
function radioLevel(): number { return AUDIO_MIX.radio * settings.sfxVolume; }

function rampBus(name: Bus, level: number): void {
  if (!_ctx || !_buses) return;
  const g = _buses[name].gain;
  const t = _ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(level, t + 0.25);
}

onSettingsChange(() => {
  _musicLevel = musicLevel();
  rampBus('music', _musicLevel);
  rampBus('sfx', sfxLevel());
  rampBus('radio', radioLevel());
});
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
  return { music: bus(_musicLevel), sfx: bus(sfxLevel()), radio: bus(radioLevel()) };
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
  _paused = paused;
  _musicLevel = musicLevel();
  rampBus('music', _musicLevel);
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
