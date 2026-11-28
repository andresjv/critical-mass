// MissionState — single source of truth for a running mission.
// Pure TypeScript: NO Phaser imports. Unit-tested in tests/MissionState.test.ts.

import { Difficulty, ENDLESS, LIMITS, TUNING } from './tuning';
import { LEVELS, type LevelId } from './levels';
import { createRng } from './rng';

export type ThemeId = 'coldfront' | 'xenoworld';

export interface MissionConfig {
  theme: ThemeId;
  difficulty: Difficulty;
  seed: number;
  /** World the mission is flown in (skin only). Defaults to Cold Front. */
  level?: LevelId;
  /** Endless mode: loop hangar → attack run → ground assault through random biomes, no missile clock. */
  endless?: boolean;
}

export class MissionState {
  // ── Config ──────────────────────────────────────────────────────────────
  theme: ThemeId = 'coldfront';
  difficulty: Difficulty = 'pilot';
  seed: number = 0;
  level: LevelId = 'coldfront';
  /** True once a mission has been started from the menu (or a challenge link). */
  started = false;
  /** Endless mode run (see MissionConfig.endless). */
  endless = false;
  /** Endless: stages cleared so far (0 on the first). */
  endlessStage = 0;
  /** Endless: store credits earned from score so far this run. */
  creditsEarned = 0;
  /** Called with newly earned store credits (Endless only). Wired up by game code to the armory. */
  onCredits: ((n: number) => void) | null = null;

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
    this.endless = config.endless ?? false;
    this.endlessStage = 0;
    this.creditsEarned = 0;
    this.level = config.level ?? (this.endless ? this.endlessLevel(0, null) : 'coldfront');
    this.started = true;

    this.planes = TUNING[config.difficulty].startingPlanes;
    this.discs = LIMITS.startingDiscs;
    this.sitesDestroyed = 0;
    this.citiesLost = 0;
    this.score = 0;
    this.impactClock = 0;
    this.hudCue = '';
  }

  /** Endless: biome for stage `n`: seeded by the mission seed, never the same one twice in a row. */
  endlessLevel(n: number, previous: LevelId | null): LevelId {
    const pool = LEVELS.map(l => l.id).filter(id => id !== previous);
    return createRng(this.seed + n * 7919).pick(pool);
  }

  /** Endless: stage cleared, move on to the next random biome. Returns it. */
  nextEndlessStage(): LevelId {
    this.endlessStage += 1;
    this.level = this.endlessLevel(this.endlessStage, this.level);
    return this.level;
  }

  /** Mission over (game over or finished): the next scene shown is the menu. */
  endMission(): void {
    this.started = false;
    this.planes = 0;
    this.impactClock = 0;
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
    this.payCredits();
  }

  /**
   * An enemy was destroyed. Normal missions score `normalPoints` (× difficulty); Endless scores a flat
   * ENDLESS.pointsPerKill for every enemy. Returns the points actually added (for the HUD cue).
   */
  addKill(normalPoints: number): number {
    if (!this.endless) {
      const before = this.score;
      this.addScore(normalPoints);
      return this.score - before;
    }
    this.score += ENDLESS.pointsPerKill;
    this.payCredits();
    return ENDLESS.pointsPerKill;
  }

  /** Endless: every ENDLESS.pointsPerStep points earns ENDLESS.creditsPerStep credits. */
  private payCredits(): void {
    if (!this.endless) return;
    const due = Math.floor(this.score / ENDLESS.pointsPerStep) * ENDLESS.creditsPerStep;
    const n = due - this.creditsEarned;
    if (n <= 0) return;
    this.creditsEarned = due;
    this.onCredits?.(n);
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
// Import `missionState` from this file everywhere. Never construct MissionState directly in game code.
export const missionState = new MissionState();
