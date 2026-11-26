// challengeLink.ts — URL-based async challenge between two players.
// No server needed: seed encodes the entire mission.
// Plain TypeScript: NO Phaser or React imports.

import type { ThemeId } from './MissionState';
import type { Difficulty } from './tuning';

export interface ChallengerData {
  seed: number;
  theme: ThemeId;
  difficulty: Difficulty;
  name: string;
  score: number;
}

const VALID_THEMES: ThemeId[]     = ['coldfront', 'xenoworld'];
const VALID_DIFFS: Difficulty[]   = ['cadet', 'pilot', 'suicidal'];
const PARAM_VERSION = '1';

/** Parse a challenge URL. Returns null if the URL contains no valid challenge params. */
export function parseChallengeFromURL(): ChallengerData | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  if (p.get('v') !== PARAM_VERSION) return null;

  const seed       = parseInt(p.get('s') ?? '', 36);
  const theme      = p.get('t') as ThemeId;
  const difficulty = p.get('d') as Difficulty;
  const name       = decodeURIComponent(p.get('n') ?? 'Player');
  const score      = parseInt(p.get('p') ?? '', 10);

  if (
    !isFinite(seed) ||
    !VALID_THEMES.includes(theme) ||
    !VALID_DIFFS.includes(difficulty) ||
    !isFinite(score)
  ) return null;

  return { seed, theme, difficulty, name, score };
}

/** Build a challenge URL the player can share. */
export function buildChallengeURL(data: ChallengerData): string {
  const p = new URLSearchParams();
  p.set('s', data.seed.toString(36));
  p.set('t', data.theme);
  p.set('d', data.difficulty);
  p.set('n', encodeURIComponent(data.name));
  p.set('p', data.score.toString());
  p.set('v', PARAM_VERSION);

  const base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  return `${base}?${p.toString()}`;
}

/** Load the player's saved display name from localStorage. */
export function getPlayerName(): string {
  if (typeof window === 'undefined') return 'Player';
  return localStorage.getItem('cm_player_name') ?? 'Player';
}

/** Persist the player's display name. */
export function setPlayerName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cm_player_name', name.trim() || 'Player');
  }
}
