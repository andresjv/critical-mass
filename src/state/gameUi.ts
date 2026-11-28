// gameUi — shared mutable state for the React overlay.
// Phaser scenes write here; React reads via useHudState (rAF polling).
// Plain TypeScript: NO Phaser imports, NO React imports.

import type { ChallengerData } from './challengeLink';
import type { HowToPlayStage } from './howToPlay';
import type { LevelId } from './levels';
import type { Difficulty } from './tuning';

export type DeviceHint = 'keyboard' | 'touch' | 'gamepad';
export type ProgressStep = 'map' | 'hangar' | 'attack_run' | 'ground';
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

export interface TouchLabels {
  move: string;
  fire: string;
  action: string; // '' hides the label
  /** Weapon-wheel button label; absent = no such button in this scene. */
  inventory?: string;
  /** Side-item button label; absent = no such button in this scene. */
  item?: string;
}

export type UiScreen = 'menu' | 'game' | 'gameover';

export interface MenuRequest { level: LevelId; difficulty: Difficulty; endless?: boolean }

export const gameUi = {
  /** Which top-level screen React shows: the title menu, or the in-game HUD. */
  screen: 'menu' as UiScreen,
  /** Set by the React menu when the player presses Play; MenuScene consumes it. */
  menuRequest: null as MenuRequest | null,
  /** Level whose scenery scrolls behind the menu (follows the highlighted card). */
  menuPreview: 'coldfront' as LevelId,

  /** Attack run hull / ground-assault health: hits left and the maximum (0 hides the gauge). */
  hull: 3,
  hullMax: 0,
  hullLabel: 'Hull' as 'Hull' | 'Health',

  /** Ground assault: the gun in hand (null outside the mode). reload = 0..1 while reloading, else -1. */
  weapon: null as { name: string; rarity: string; ammo: number; mag: number; reload: number; slot: number } | null,
  /** Ground assault weapon wheel while H is held: carried guns, highlighted and equipped slot. */
  wheel: null as { slots: { name: string; rarity: string; ammo: number; mag: number }[]; highlight: number; equipped: number } | null,
  /** Credits earned in the current ground assault (shown in the HUD). */
  creditsEarned: 0,
  /** Endless mode: current stage number (1-based); 0 = not an endless run. */
  endlessStage: 0,
  /** On-screen interact prompt ("Press T to …"), null = hidden. Tapping it on touch interacts. */
  interactPrompt: null as string | null,
  /** Ground assault side item (J): the selected one and how many of each are left. */
  item: null as { kind: string; name: string; count: number; all: { kind: string; count: number }[] } | null,
  /** Ground assault: the player is crouched behind cover. */
  inCover: false,

  /** Last active input device — drives key-hint labels in the HUD. */
  device: 'keyboard' as DeviceHint,

  /** True while the current stage is paused (drives the React pause overlay). */
  paused: false,

  /** What each on-screen touch control does in the current scene; null = no touch controls. */
  touchLabels: null as TouchLabels | null,

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
  /** Challenger data loaded from URL at startup. */
  challengerData: null as ChallengerData | null,
  /** Current player's display name (editable on results screen). */
  playerName: 'Player',

  // ── Attack Run HUD ────────────────────────────────────────────────────
  attackRunSecsLeft: 0,


  // ── Player guidance ───────────────────────────────────────────────────


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
};
