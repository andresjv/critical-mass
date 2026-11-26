// gameUi — shared mutable state for the React overlay.
// Phaser scenes write here; React reads via useHudState (rAF polling).
// Plain TypeScript: NO Phaser imports, NO React imports.

import type { ChallengerData } from './challengeLink';
import type { HowToPlayStage } from './howToPlay';

export type DeviceHint = 'keyboard' | 'touch' | 'gamepad';
export type ProgressStep = 'map' | 'hangar' | 'attack_run' | 'silos';
export type { ChallengerData, HowToPlayStage };

export interface StageIntroData {
  stageName: string;
  goal: string;
  keyboard: string[];
  touch: string[];
}

export interface StageResultData {
  headline: string;
  details: string[];
  next: string;
}

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

  // ── Player guidance ───────────────────────────────────────────────────

  /** Layer 1: Mission briefing card shown at game start. */
  showBriefing: false,

  /** Layer 2: Progress breadcrumb — current stage step. */
  progressStep: null as ProgressStep | null,
  /** Launch number (1-based) for the breadcrumb sub-line. */
  launchNumber: 1,

  /** Layer 3: Stage intro card — shown first visit per session. */
  stageIntro: null as StageIntroData | null,

  /** Layer 4: Short objective line shown below the progress bar. */
  objective: '',

  /** Layer 6: Contextual hint shown after 5s of inactivity. */
  contextualHint: null as string | null,

  /** Layer 7: Event callout banner text. */
  callout: null as string | null,
  /** Timestamp (ms) when the callout should disappear. */
  calloutExpiry: 0,

  /** Layer 8: Stage result card shown at scene transitions. */
  stageResult: null as StageResultData | null,

  /** Layer 9: "Coming soon" card for placeholder stages. */
  showComingSoon: false,
};
