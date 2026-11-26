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

  // ── Scoring ───────────────────────────────────────────────────────────────

  addScore(points: number): void {
    const mult = TUNING[this.difficulty].scoreMultiplier;
    this.score += Math.round(points * mult);
  }
}
