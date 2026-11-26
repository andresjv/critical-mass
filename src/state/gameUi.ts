// gameUi — shared mutable state for the React overlay.
// Phaser scenes write here; React reads via useHudState (rAF polling).
// Plain TypeScript: NO Phaser imports, NO React imports.

import type { ChallengerData } from './challengeLink';
import type { HowToPlayStage } from './howToPlay';

export type DeviceHint = 'keyboard' | 'touch' | 'gamepad';
export type { ChallengerData, HowToPlayStage };

export const gameUi = {
  /** Last active input device — drives key-hint labels in the HUD. */
  device: 'keyboard' as DeviceHint,

  /** Whether the F1 debug overlay is visible. */
  debugVisible: false,

  // ── Map overlay data ───────────────────────────────────────────────────
  mapActive: false,
  launchIndex: 0,
  launchSite: '',
  targetCity: '',
  timeToImpactSecs: 0,
  autoScrambleRemaining: 0,

  // ── How-to-play card (set by scene, cleared after 5 s) ─────────────────
  howToPlayStage: null as HowToPlayStage | null,

  // ── Results screen (shown by PlaceholderAssaultScene at mission end) ────
  showResults: false,
  finalScore: 0,
  /** Challenger data loaded from URL at startup. */
  challengerData: null as ChallengerData | null,
  /** Current player's display name (editable on results screen). */
  playerName: 'Player',

  // ── Attack Run HUD ────────────────────────────────────────────────────
  attackRunSecsLeft: 0,

  // ── Silo HUD ─────────────────────────────────────────────────────────
  silosDestroyed: 0,   // 0–4 side silos hit this run
  centralSiloDown: false,
};
