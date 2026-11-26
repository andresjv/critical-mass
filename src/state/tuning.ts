// tuning.ts — every numeric constant from docs/DESIGN.md.
// Stage code reads ONLY from this file; nothing is hard-coded elsewhere.

// Canvas scale factor: internal canvas is 1280×720 (was 384×216 at launch).
// All px-based values (speeds, sizes, distances, accelerations) are pre-multiplied by 10/3.
export const WORLD_SCALE = 10 / 3;

export type Difficulty = 'cadet' | 'pilot' | 'suicidal';

// ─── Per-difficulty settings ─────────────────────────────────────────────────

export interface DifficultyTuning {
  /** Impact countdown per launch, seconds. */
  timeToImpact: number;
  /** Planes at mission start. */
  startingPlanes: number;
  /** Ground contact in Attack Run causes a crash. */
  groundContactCrash: boolean;
  /** Multiplier applied to all enemy fire intervals (< 1 = slower fire). */
  enemyFireRate: number;
  /** Total sniper pool in Stage 5. */
  sniperPool: number;
  /** Number of reactor robots in Stage 6. */
  robots: number;
  /** ETCM meltdown timer, seconds. */
  meltdownTimer: number;
  /** Show dotted arc preview for mortar in Stage 5. */
  mortarArcPreview: boolean;
  /** Score multiplier applied to all points. */
  scoreMultiplier: number;
}

export const TUNING: Record<Difficulty, DifficultyTuning> = {
  cadet: {
    timeToImpact: 180,
    startingPlanes: 5,
    groundContactCrash: false,
    enemyFireRate: 0.7,
    sniperPool: 8,
    robots: 2,
    meltdownTimer: 150,
    mortarArcPreview: true,
    scoreMultiplier: 1,
  },
  pilot: {
    timeToImpact: 150,
    startingPlanes: 4,
    groundContactCrash: true,
    enemyFireRate: 1.0,
    sniperPool: 12,
    robots: 4,
    meltdownTimer: 120,
    mortarArcPreview: false,
    scoreMultiplier: 1.5,
  },
  suicidal: {
    timeToImpact: 120,
    startingPlanes: 3,
    groundContactCrash: true,
    enemyFireRate: 1.3,
    sniperPool: 16,
    robots: 5,
    meltdownTimer: 90,
    mortarArcPreview: false,
    scoreMultiplier: 2,
  },
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

export const SCORE = {
  /** Tank or SAM site destroyed in Attack Run. */
  tank: 150,
  samSite: 150,
  /** Interceptor shot down. */
  interceptor: 250,
  /** Heat-seeker shot from behind after it passes. */
  heatSeekerFromBehind: 500,
  /** Side silo destroyed (also grants +1 plane). */
  sideSilo: 2_000,
  /** Central silo destroyed (ends the stage). */
  centralSilo: 3_000,
  /** Bonus for destroying all 5 silos in one run. */
  allSilosBonus: 5_000,
  /** SAM site destroyed by bomb (more than gun: 150). */
  bombSam: 200,
  /** Points per second remaining on the impact clock. */
  impactClockSecond: 10,
  /** Sniper killed in Stage 5. */
  sniper: 100,
  /** Tank destroyed in Stage 5. */
  assaultTank: 300,
  /** Tower destroyed in Stage 5 (bonus). */
  tower: 1_000,
  /** Reactor door opened. */
  reactorDoor: 1_500,
  /** Single hit on a reactor robot. */
  robotHit: 200,
  /** Robot fully destroyed. */
  robotDestroyed: 2_500,
  /** Points per ETCM second remaining on escape. */
  etcmSecond: 100,
  /** Points per surviving commando at mission end. */
  survivingMan: 5_000,
} as const;

// ─── Shared gameplay constants ────────────────────────────────────────────────

export const LIMITS = {
  planeCap: 9,
  startingDiscs: 5,
  launchSiteCount: 4,
  /** Cities lost to end the game. */
  gameOverCitiesLost: 2,
  /** Seconds before the map auto-scrambles if the player does nothing. */
  autoScrambleDelay: 5,
} as const;

// ─── Stage 2 — Hangar ────────────────────────────────────────────────────────

export const HANGAR = {
  /** Rotation speed, degrees/s. */
  rotateSpeed: 210,
  /** Thrust acceleration, px/s² (70 × WORLD_SCALE). */
  thrustAccel: 233,
  /** Maximum speed, px/s (95 × WORLD_SCALE). */
  maxSpeed: 317,
  /** Drag fraction per second (0.5 %). */
  drag: 0.005,
  /** Below this speed (px/s), a wall hit bounces instead of crashing (30 × WORLD_SCALE). */
  bounceThreshold: 100,
  /** Restitution on a soft wall bounce. */
  bounceRestitution: 0.5,
  /** How long the bay doors stay open, seconds. */
  doorOpenDuration: 3.0,
  /** Cooldown after doors close before they can reopen, seconds. */
  doorCooldown: 2.0,
  /** Window after exit during which a spare plane can be launched, seconds. */
  spareWindow: 6.0,
  /** Maximum spare planes in flight simultaneously. */
  spareMaxInFlight: 3,
} as const;

// ─── Stage 3 — Attack Run ────────────────────────────────────────────────────

export const ATTACK_RUN = {
  /** Auto-scroll speed, px/s (80 × WORLD_SCALE). */
  scrollSpeed: 267,
  /** Stage duration, seconds. */
  duration: 45,
  /** Minimum altitude, px (8 × WORLD_SCALE). */
  altitudeMin: 27,
  /** Maximum altitude, px (150 × WORLD_SCALE). */
  altitudeMax: 500,
  /** Warning lead time before heat-seeker arrives, seconds. */
  heatSeekerWarnTime: 1.5,
  /** Altitude at or below which a heat-seeker overshoots (20 × WORLD_SCALE). */
  heatSeekerOvershootAlt: 67,
  /** Tank flak interval (Pilot ×1.0 baseline), seconds. */
  tankFireInterval: 2.5,
  /** SAM homing-missile turn rate, degrees/s. */
  samTurnRate: 60,
  /** Interceptor burst count per pass. */
  interceptorBurstShots: 2,
  // ── Added for T6 ──────────────────────────────────────────────────────────
  /** Leftmost screen X the plane can occupy, px. */
  planeXMin: 100,
  /** Rightmost screen X (at canvas centre), px. */
  planeXMax: 580,
  /** Horizontal movement speed, px/s. */
  planeXSpeed: 450,
  /** Altitude change speed, px/s (100 × WORLD_SCALE). */
  planeAltSpeed: 333,
  /** Player bullet speed, px/s (200 × WORLD_SCALE). */
  bulletSpeed: 667,
  /** Upward flak projectile speed, px/s (80 × WORLD_SCALE). */
  flakSpeed: 267,
  /** SAM homing missile speed, px/s (80 × WORLD_SCALE). */
  samMissileSpeed: 267,
  /** Interceptor lateral speed, px/s (130 × WORLD_SCALE). */
  interceptorSpeed: 433,
  /** Heat-seeker speed, px/s (130 × WORLD_SCALE). */
  heatSeekerSpeed: 433,
  /** Enemy density per launchIndex (0–3): 0.5 → 0.73 → 0.97 → 1.2. */
  enemyDensity: [0.5, 0.73, 0.97, 1.2] as const,
  /** Interceptor spawn interval base, seconds. */
  interceptorInterval: 9,
  /** Seconds bomb travels to ground. */
  bombArcTime: 1.4,
  /** Max simultaneous bombs in flight. */
  bombMaxInAir: 2,
  /** Seconds reload after a bomb drop. */
  bombReloadTime: 1.2,
  /** Blast radius in px; enemies within range are destroyed. */
  bombBlastRadius: 80,
  /** World-px ahead of drop point where bomb lands. */
  bombHorizOffset: 600,
} as const;

// ─── Stage 4 — Silo Strike ───────────────────────────────────────────────────

export const SILO = {
  /** Reticle snaps to "locked" within this many screen-px of a window centre (4 × WORLD_SCALE). */
  lockRadius: 13,
  /** Rocket travel time, seconds. */
  rocketTravelTime: 0.8,
  /** Silo-gun fire interval (Pilot ×1.0 baseline), seconds. */
  siloGunInterval: 1.8,
  /** Interceptor spawn interval, seconds. */
  interceptorInterval: 6,
  // ── Added for T7 ──────────────────────────────────────────────────────────
  /** Player reticle world-X movement speed (world units/s). */
  worldXSpeed: 500,
  /** Player reticle world-Y (altitude) movement speed (world units/s). */
  worldYSpeed: 350,
  /** Max world-X extent the player can reach (±range). */
  worldXRange: 800,
  /** Minimum player altitude in world units. */
  worldYMin: 80,
  /** Maximum player altitude in world units. */
  worldYMax: 500,
  /** Silo-gun bullet travel time, seconds. */
  siloGunBulletTime: 1.4,
  /** Interceptor lateral speed, px/s. */
  interceptorSpeed: 350,
} as const;

// ─── Stage 5 — Vostgrad Assault ──────────────────────────────────────────────

export const ASSAULT = {
  /** Seconds before a killed sniper respawns. */
  sniperRespawnTime: 4.0,
  /** Tanks per wave. */
  tanksPerWave: 3,
  /** Hits required to open a door. */
  doorHitsRequired: 2,
  /** Seconds tower debris blocks the trench. */
  towerDebrisTime: 1.5,
  /** Number of doors on the fortress facade. */
  doorCount: 5,
} as const;

// ─── Stage 6 — Reactor ───────────────────────────────────────────────────────

export const REACTOR = {
  /** Discs the commando starts with. */
  discsStart: 5,
  /** Robot base speed, px/s (40 × WORLD_SCALE). */
  robotSpeed: 133,
  /** Speed added per hit received, px/s (15 × WORLD_SCALE). */
  robotSpeedPerHit: 50,
  /** Robot fire interval base, seconds. */
  robotFireInterval: 2.0,
  /** Fire interval reduction per hit, seconds. */
  robotFireIntervalPerHit: 0.3,
  /** Rear hits needed to destroy one robot. */
  hitsToDestroy: 4,
} as const;

// Audio mix: channel levels into the master limiter (0–1).
export const AUDIO_MIX = {
  master: 0.9,
  music:  0.45,
  sfx:    0.9,
  radio:  0.7,
  musicDuckOnExplosion: 0.4, // music level multiplier during a blast
  duckRecoverSecs: 0.6,
};
