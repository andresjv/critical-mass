// Settings — player preferences (PRD F-23), saved to localStorage.
// Plain TypeScript: NO Phaser or React imports. Every storage access is guarded:
// private windows and blocked storage just fall back to defaults.

import type { LevelId } from './levels';
import type { Difficulty } from './tuning';

export interface Settings {
  /** 0–1 multiplier on the music bus. */
  musicVolume: number;
  /** 0–1 multiplier on sound effects (and radio blips). */
  sfxVolume: number;
  /** Short vibrations on crashes and big blasts (phones that support it). */
  haptics: boolean;
  /** Turns off white flashes and screen shake. */
  reducedFlashing: boolean;
  /** Last level and difficulty picked in the menu (PRD T-05). */
  lastLevel: LevelId;
  lastDifficulty: Difficulty;
}

const KEY = 'cm_settings_v1';

const DEFAULTS: Settings = { musicVolume: 0.8, sfxVolume: 0.9, haptics: true, reducedFlashing: false,
  lastLevel: 'coldfront', lastDifficulty: 'pilot' };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

type Listener = (s: Settings) => void;
const listeners: Listener[] = [];

/** Subscribe to changes (the audio mixer uses this to apply volumes). */
export function onSettingsChange(fn: Listener): void {
  listeners.push(fn);
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  for (const fn of listeners) fn(settings);
}

/** Vibrate for `ms` if the player allows it and the device supports it. */
export function haptic(ms: number): void {
  if (!settings.haptics) return;
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}
