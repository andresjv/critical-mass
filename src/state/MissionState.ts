// MissionState — single source of truth for a running mission.
// Pure TypeScript: NO Phaser imports. Unit-tested in tests/MissionState.test.ts.

import { Difficulty, LIMITS, TUNING } from './tuning';

export type ThemeId = 'coldfront' | 'xenoworld';

export interface MissionConfig {
  theme: ThemeId;
  difficulty: Difficulty;
  seed: number;
}

export class MissionState {
  // ── Config ──────────────────────────────────────────────────────────────
  theme: ThemeId = 'coldfront';
  difficulty: Difficulty = 'pilot';
  seed: number = 0;

  // ── Planes / men ─────────────────────────────────────────────────────────
  /** Planes currently available (also = men at Stage 5). */
  planes: number = 0;
  /** Discs available in Stage 6. */
  discs: number = LIMITS.startingDiscs;

  // ── Mission progress ──────────────────────────────────────────────────────
  /** Number of launch sites destroyed (0–4). */
  sitesDestroyed: number = 0;
  /** Number of cities lost (0–N). */
  citiesLost: number = 0;

  // ── Score ─────────────────────────────────────────────────────────────────
  score: number = 0;

  // ── Impact clock ─────────────────────────────────────────────────────────
  /** Seconds remaining before missile impact. 0 when not running. */
  impactClock: number = 0;

  // ── HUD ──────────────────────────────────────────────────────────────────
  /** Stage-specific cue string shown at the bottom of the HUD. */
  hudCue: string = '';

  // ── Computed ──────────────────────────────────────────────────────────────

  /** Stage 5 becomes available after all 4 launch sites are destroyed. */
  get stage5Unlocked(): boolean {
    return this.sitesDestroyed >= LIMITS.launchSiteCount;
  }

  /** The game is over when enough cities have been lost. */
  get isGameOver(): boolean {
    return this.citiesLost >= LIMITS.gameOverCitiesLost;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  startMission(config: MissionConfig): void {
    this.theme = config.theme;
    this.difficulty = config.difficulty;
    this.seed = config.seed;

    this.planes = TUNING[config.difficulty].startingPlanes;
    this.discs = LIMITS.startingDiscs;
    this.sitesDestroyed = 0;
    this.citiesLost = 0;
    this.score = 0;
    this.impactClock = 0;
    this.hudCue = '';
  }

  // ── Planes ───────────────────────────────────────────────────────────────

  addPlane(): void {
    this.planes = Math.min(this.planes + 1, LIMITS.planeCap);
  }

  losePlane(): void {
    this.planes = Math.max(this.planes - 1, 0);
  }

  // ── Mission events ────────────────────────────────────────────────────────

  siteDestroyed(): void {
    this.sitesDestroyed = Math.min(this.sitesDestroyed + 1, LIMITS.launchSiteCount);
  }

  cityLost(): void {
    this.citiesLost += 1;
  }

  // ── Impact clock ─────────────────────────────────────────────────────────

  /** Set the clock to the given seconds (called when hangar starts). */
  startImpactClock(seconds: number): void {
    this.impactClock = seconds;
  }

  /**
   * Decrement the clock by dt seconds.
   * Returns true the moment the clock first reaches zero.
   */
  tickImpactClock(dt: number): boolean {
    if (this.impactClock <= 0) return false;
    this.impactClock = Math.max(0, this.impactClock - dt);
    return this.impactClock === 0;
  }

  // ── Scoring ───────────────────────────────────────────────────────────────

  addScore(points: number): void {
    const mult = TUNING[this.difficulty].scoreMultiplier;
    this.score += Math.round(points * mult);
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
// Import `missionState` from this file everywhere. Never construct MissionState directly in game code.
export const missionState = new MissionState();
