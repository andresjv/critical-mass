// tuning.ts — every numeric constant from docs/DESIGN.md.
// Stage code reads ONLY from this file; nothing is hard-coded elsewhere.

// Canvas scale factor: internal canvas is 1280×720 (was 384×216 at launch).
// All px-based values (speeds, sizes, distances, accelerations) are pre-multiplied by 10/3.
export const WORLD_SCALE = 10 / 3;

/** 'tutorial' is the easier first-play practice run; it is never offered in the level picker. */
export type Difficulty = 'tutorial' | 'cadet' | 'pilot' | 'suicidal';

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
  tutorial: {
    timeToImpact: 360,
    startingPlanes: 7,
    groundContactCrash: false,
    enemyFireRate: 0.4,
    sniperPool: 5,
    robots: 1,
    meltdownTimer: 200,
    mortarArcPreview: true,
    scoreMultiplier: 1,
  },
  cadet: {
    timeToImpact: 270,
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
    timeToImpact: 225,
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
    timeToImpact: 180,
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
  /** Crew chatter: first line delay, rest between exchanges, pause before a reply (s). */
  chatterFirstDelay: 1.5,
  chatterGapMin: 3,
  chatterGapMax: 6,
  chatterReplyGap: 0.35,
  /** Line length: base + per word, capped (s); bubble stays this long after the line. */
  chatterLineBase: 0.5,
  chatterPerWord: 0.27,
  chatterLineMax: 3.6,
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
  /** Length of the takeoff animation after flying out of the bay doors, seconds. */
  takeoffTime: 3.4,
  /** Dissolve from the hangar into the takeoff, and from the takeoff into the attack run (ms). */
  takeoffCrossfadeMs: 380,
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
  interceptorBurstShots: 3,
  /** Seconds between shots in an interceptor burst. */
  interceptorBurstGap: 0.3,
  /** Max climb / dive rate of an interceptor, px/s (it pitches its nose to match). */
  interceptorClimbRate: 115,
  /** How quickly an interceptor changes its climb rate, px/s². Lower = lazier turns. */
  interceptorPitchAccel: 150,
  /** Max nose pitch drawn for an interceptor, radians. */
  interceptorMaxPitch: 0.45,
  /** Tank turret turn speed while tracking the plane, degrees/s. */
  tankTurretTurnRate: 90,
  /** Interceptor bullet speed (fires straight ahead), px/s. */
  interceptorBulletSpeed: 900,
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
  /** Interceptor lateral speed, px/s (≈100 × WORLD_SCALE; slowed from 130 so they read as jets). */
  interceptorSpeed: 340,
  /** Heat-seeker speed, px/s (130 × WORLD_SCALE). */
  heatSeekerSpeed: 433,
  /** Enemy density per launchIndex (0–3): 0.5 → 0.73 → 0.97 → 1.2. */
  enemyDensity: [0.5, 0.73, 0.97, 1.2] as const,
  /** Interceptor spawn interval base, seconds. */
  interceptorInterval: 10,
  /** A bomb landing within this many px of a tank locks on and steers into it (one tank hitbox). */
  bombHomingRange: 60,
  /** How fast a locked bomb shifts its impact point toward the tank, px/s. */
  bombHomingSpeed: 420,
  /** Seconds between smoke puffs left behind a missile in flight. */
  missileTrailInterval: 0.045,
  /** Fly-in after the takeoff cutscene: seconds, start X (px, off-screen) and start altitude. */
  entryTime: 1.2,
  entryStartX: -80 * WORLD_SCALE,
  entryStartAlt: 30 * WORLD_SCALE,
  /** Dissolve from the takeoff cutscene into the run (ms). */
  entryFadeMs: 550,
  /** Flight feel: how quickly speed follows the stick (1/s), max nose pitch (rad), how much
   *  climb rate turns into pitch, and how quickly the nose follows (1/s). */
  planeResponse: 5,
  planeMaxPitch: 0.42,
  planePitchGain: 1.1,
  planePitchResponse: 7,
  /** Gentle idle bob while cruising: amplitude (px) and speed (rad/s). */
  planeBobAmp: 2.5,
  planeBobSpeed: 2.2,
  /** Hull: hits the plane can take (the last one downs it), and invulnerable seconds after a hit. */
  planeHits: 3,
  hitInvuln: 1.6,
  /** Pushed back up after scraping the ground or an obstacle, px/s. */
  hitBounce: 380,
  /** Endless mode: hits the plane can take. */
  endlessPlaneHits: 4,
  /** End-of-run eject: seconds before the cut to the ground assault, seat launch speed and
   *  gravity, when the chute opens (s), chute sink speed and the jet's climb-away speed (px/s). */
  ejectSecs: 2.4,
  ejectSeatSpeed: 820,
  ejectGravity: 1500,
  ejectChuteAt: 0.55,
  ejectChuteSink: 120,
  ejectJetSpeed: 620,
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
  // ── Visual feedback (effects pass) ─────────────────────────────────────────
  /** SAM launch-rail length, px. */
  samRailLength: 46,
  /** SAM rail aim limits, radians (upward arc only). */
  samRailAimMin: -Math.PI * 0.85,
  samRailAimMax: -Math.PI * 0.15,
  /** SAM rail turn speed while tracking, degrees/s. */
  samRailTurnRate: 70,
  /** Seconds of SAM launch shake/glow after firing. */
  samLaunchAnimTime: 0.5,
  /** Seconds of tank barrel recoil after a shot. */
  tankRecoilTime: 0.25,
  /** Barrel recoil distance, px. */
  tankRecoilPx: 9,
  /** Tank driving speed, px/s (world). */
  tankDriveSpeed: 35,
  /** How far a tank strays from its spawn point, px. */
  tankDriveRange: 120,
  /** Minimum seconds between a tank's drive decisions (actual: 1–2×). */
  tankDriveMinSecs: 1.5,
  /** Downward acceleration of a shot-down plane, px/s². */
  fallerGravity: 520,
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
  musicWhenPaused: 0.3,      // music level multiplier while the game is paused
  duckRecoverSecs: 0.6,
};

// ─── Background battle (attack run, visual only) ─────────────────────────────

export const BATTLE = {
  /** Width of one battle sector on the tree-line layer, px. Each has a blue and a red line. */
  sectorWidth: 1500,
  /** Soldiers per side per sector (min..max). */
  soldiersMin: 5,
  soldiersMax: 8,
  /** Soldier height at the far / near edge of the strip, px (plane is ~74 px long). */
  soldierHeightFar: 14,
  soldierHeightNear: 22,
  /** Depth of the strip below the tree-line floor, px. */
  stripDepth: 18,
  /** Seconds between shots per soldier (min..max). */
  fireMin: 0.9,
  fireMax: 2.8,
  /** Chance a soldier's shot drops its target. */
  hitChance: 0.07,
  /** Seconds before a fallen soldier is replaced by a reinforcement running in. */
  reinforceDelay: 4,
  /** Soldier walk speed when advancing / reinforcing, px/s. */
  walkSpeed: 22,
  /** Tank gunner: seconds between bursts, chance each burst kills, kills before he is shot. */
  gunnerFireInterval: 1.1,
  gunnerHitChance: 0.55,
  gunnerKillsMin: 3,
  gunnerKillsMax: 5,
  /** Far-layer dogfights: pairs in the sky at once, jet scale, speed px/s, turn rate rad/s. */
  dogfightPairs: 2,
  farJetScale: 0.3,
  farJetSpeed: 120,
  farJetTurn: 1.3,
  /** Chance per burst that a chasing jet shoots its target down; seconds before a new pair arrives. */
  farKillChance: 0.12,
  farRespawn: 5,
} as const;

// ─── Game over screen ────────────────────────────────────────────────────────

export const GAME_OVER = {
  /** Seconds before FIRE / tap can dismiss it (avoids skipping it by accident). */
  minShowSecs: 1.2,
  /** Seconds before it returns to the menu on its own. */
  autoReturnSecs: 9,
} as const;

// ─── Loadout parts (inventory) ───────────────────────────────────────────────

export const LOADOUT = {
  /** Max player rounds in the air with the standard cannon. */
  cannonMaxInAir: 4,
  /** Twin cannon: max rounds in the air, vertical spread speed px/s, muzzle offset px. */
  twinMaxInAir: 6,
  twinSpreadVy: 45,
  twinOffsetY: 5,
  /** Cluster bomb: blast radius multiplier and extra reload seconds. */
  clusterBlastMult: 1.6,
  clusterReloadAdd: 0.3,
} as const;

// ─── Ground assault (on foot, after ejecting) ────────────────────────────────

export const GROUND = {
  /** Hits the soldier can take before going down (costs a life, like a lost plane). */
  playerHits: 5,
  /** Invulnerable seconds after a hit. */
  hitInvuln: 1.1,
  /** Level length (px) from the landing zone to the launch-control bunker. */
  levelLength: 5200,
  /** Rolling hills: total rise between the lowest and highest ground point, px. */
  hillHeight: 36,
  /** Walk speed px/s, acceleration (1/s easing), gravity px/s², jump speed px/s. */
  walkSpeed: 330,
  walkResponse: 12,
  gravity: 2300,
  jumpSpeed: 880,
  /** Grace after walking off a ledge in which a jump still works, s. */
  coyoteTime: 0.1,
  /** Parachute descent: start height above ground (px), sink speed (px/s), drift speed (px/s). */
  chuteStartHeight: 560,
  chuteSinkSpeed: 210,
  chuteDrift: 90,
  /** Soldier drawn at this scale (trooper parts are ~16 px tall at scale 1). */
  soldierScale: 4.6,
  /** Player hitbox half-width and height, px. */
  playerHalfW: 20,
  playerH: 74,
  /** Camera keeps the player this far from the left edge (fraction of width). */
  cameraLead: 0.36,
  /** Weapon wheel: game speed while it is open. */
  wheelTimeScale: 0.25,
  /** Enemy soldiers: count per 1000 px, hit points, sight range px, fire interval s,
   *  bullet speed px/s, walk speed px/s. */
  enemiesPer1000: 1.3,
  enemyHp: 4,
  enemySight: 760,
  enemyFireInterval: 1.5,
  enemyBulletSpeed: 560,
  enemyWalk: 70,
  /** Machine-gun nests: count per level, hit points, burst size, burst gap s, shot gap s. */
  nests: 2,
  nestHp: 14,
  nestBurst: 4,
  nestBurstGap: 2.2,
  nestShotGap: 0.12,
  /** Auto-aim: max vertical angle toward a target in front, rad. */
  autoAimAngle: 0.42,
  /** Credits: per enemy soldier, per nest, for pressing the button. */
  /** Endless: soldier health, and how much harder each stage gets (enemy count ×, capped). */
  endlessHits: 8,
  endlessStageScale: 0.12,
  endlessMaxScale: 2.2,
  /** Score: per kill, per nest, for pressing the button. */
  scoreKill: 250,
  scoreNest: 750,
  scoreButton: 5000,
  /** Distance from the button that lets the soldier press it, px. */
  buttonReach: 70,
} as const;

/** Per-gun handling. Speeds in px/s (already in world scale), times in seconds. */
export interface GunStats {
  damage: number;
  /** Seconds between shots (between bursts for burst guns). */
  fireInterval: number;
  /** Hold fire to keep shooting. */
  auto: boolean;
  mag: number;
  reload: number;
  bulletSpeed: number;
  /** Random spread per pellet, rad. */
  spread: number;
  pellets: number;
  /** Bullet lifetime, s (short for shotguns). */
  life: number;
  /** Rounds per trigger pull (burst rifles). */
  burst: number;
  /** Goes through enemies. */
  pierce: boolean;
  /** Explosion radius on impact, px (0 = none). */
  splash: number;
}

export const GUN_STATS = {
  pistol:  { damage: 2, fireInterval: 0.28, auto: false, mag: 12, reload: 1.0, bulletSpeed: 1250, spread: 0.02, pellets: 1, life: 1.1, burst: 1, pierce: false, splash: 0 },
  smg:     { damage: 1, fireInterval: 0.08, auto: true,  mag: 32, reload: 1.4, bulletSpeed: 1250, spread: 0.07, pellets: 1, life: 0.9, burst: 1, pierce: false, splash: 0 },
  shotgun: { damage: 1, fireInterval: 0.72, auto: false, mag: 6,  reload: 1.8, bulletSpeed: 1050, spread: 0.2,  pellets: 7, life: 0.32, burst: 1, pierce: false, splash: 0 },
  rifle:   { damage: 2, fireInterval: 0.12, auto: true,  mag: 28, reload: 1.6, bulletSpeed: 1600, spread: 0.035, pellets: 1, life: 1.1, burst: 1, pierce: false, splash: 0 },
  burst:   { damage: 3, fireInterval: 0.42, auto: false, mag: 24, reload: 1.5, bulletSpeed: 1700, spread: 0.02, pellets: 1, life: 1.1, burst: 3, pierce: false, splash: 0 },
  sniper:  { damage: 10, fireInterval: 1.0, auto: false, mag: 5,  reload: 2.0, bulletSpeed: 2600, spread: 0,    pellets: 1, life: 1.2, burst: 1, pierce: true,  splash: 0 },
  lmg:     { damage: 2, fireInterval: 0.07, auto: true,  mag: 90, reload: 3.0, bulletSpeed: 1500, spread: 0.09, pellets: 1, life: 1.0, burst: 1, pierce: false, splash: 0 },
  rocket:  { damage: 9, fireInterval: 1.2, auto: false, mag: 3,  reload: 2.2, bulletSpeed: 760,  spread: 0,    pellets: 1, life: 2.0, burst: 1, pierce: false, splash: 110 },
  laser:   { damage: 3, fireInterval: 0.09, auto: true,  mag: 45, reload: 1.6, bulletSpeed: 2800, spread: 0.01, pellets: 1, life: 0.8, burst: 1, pierce: true,  splash: 0 },
} as const satisfies Record<string, GunStats>;

/** Daily store: offers per day, chance weight and price per rarity, credits for a new profile. */
export const STORE = {
  offers: 4,
  weight: { common: 40, uncommon: 30, rare: 18, epic: 9, legendary: 3 },
  price:  { common: 80, uncommon: 150, rare: 260, epic: 450, legendary: 800 },
  startingCredits: 150,
} as const;

/** Endless mode scoring: every enemy is worth the same, and points turn into store credits. */
export const ENDLESS = {
  /** Points for any enemy destroyed (soldier, nest, tank, SAM, jet, heat-seeker). No difficulty multiplier. */
  pointsPerKill: 100,
  /** Every this many points earns `creditsPerStep` store credits. */
  pointsPerStep: 1000,
  creditsPerStep: 5,
} as const;

// ─── Ground assault: enemy types, side items and cover (t20) ────────────────

export type FoeKind = 'rifleman' | 'smg' | 'shotgun' | 'gunner' | 'grenadier';

/** How each enemy type fights. Speeds px/s, times s, ranges px. Enemy guns are only
 *  assault rifles, SMGs, shotguns, machine guns and pistols (drawn black). */
export interface FoeStats {
  /** Gun drawn in their hands (and its sound). */
  gun: 'rifle' | 'smg' | 'shotgun' | 'lmg' | 'pistol';
  hp: number;
  /** Starts shooting inside this range. */
  range: number;
  /** Seconds between bursts, shots per burst, seconds between burst shots. */
  fireInterval: number;
  burst: number;
  burstGap: number;
  spread: number;
  pellets: number;
  bulletSpeed: number;
  /** Hits each bullet costs the player. */
  damage: number;
  moveSpeed: number;
  /** 'cover': runs next to cover and peeks; 'rush': charges the player; 'hold': stays put. */
  style: 'cover' | 'rush' | 'hold';
  /** Seconds between grenade throws; 0 = never throws. */
  throwInterval: number;
}

export const FOES: Record<FoeKind, FoeStats> = {
  rifleman:  { gun: 'rifle',   hp: 4, range: 760, fireInterval: 1.4, burst: 3, burstGap: 0.12, spread: 0.05, pellets: 1, bulletSpeed: 600, damage: 1, moveSpeed: 150, style: 'cover', throwInterval: 0 },
  smg:       { gun: 'smg',     hp: 3, range: 520, fireInterval: 1.6, burst: 5, burstGap: 0.08, spread: 0.12, pellets: 1, bulletSpeed: 560, damage: 1, moveSpeed: 210, style: 'rush',  throwInterval: 0 },
  shotgun:   { gun: 'shotgun', hp: 5, range: 340, fireInterval: 1.5, burst: 1, burstGap: 0,    spread: 0.2,  pellets: 4, bulletSpeed: 620, damage: 1, moveSpeed: 190, style: 'rush',  throwInterval: 0 },
  gunner:    { gun: 'lmg',     hp: 7, range: 820, fireInterval: 2.6, burst: 8, burstGap: 0.09, spread: 0.1,  pellets: 1, bulletSpeed: 620, damage: 1, moveSpeed: 90,  style: 'hold',  throwInterval: 0 },
  grenadier: { gun: 'pistol',  hp: 4, range: 620, fireInterval: 1.8, burst: 1, burstGap: 0,    spread: 0.06, pellets: 1, bulletSpeed: 560, damage: 1, moveSpeed: 140, style: 'cover', throwInterval: 3.8 },
};

/** Enemy mix per difficulty tier (0 = first launch … 3 = deep in Endless): relative weights. */
export const FOE_WEIGHTS: readonly Record<FoeKind, number>[] = [
  { rifleman: 6, smg: 3, shotgun: 2, gunner: 0, grenadier: 0 },
  { rifleman: 5, smg: 3, shotgun: 2, gunner: 1, grenadier: 1 },
  { rifleman: 4, smg: 3, shotgun: 2, gunner: 2, grenadier: 2 },
  { rifleman: 3, smg: 3, shotgun: 3, gunner: 2, grenadier: 3 },
];

/** Enemy behaviour timing (s) and distances (px). */
export const FOE_AI = {
  /** "!" reaction before acting after spotting the player. */
  alertTime: 0.55,
  /** Ducked behind cover, between peeks. */
  coverDuckMin: 0.9,
  coverDuckMax: 1.9,
  /** Standing up out of cover to shoot. */
  peekTime: 1.0,
  /** Bursts before a reload, and how long it takes. */
  burstsPerReload: 3,
  reloadTime: 1.6,
  /** Idle: seconds between glancing the other way. */
  lookMin: 1.8,
  lookMax: 4,
  /** Runs from a live grenade inside this distance. */
  fleeRadius: 190,
  /** Hit flinch duration and knock-back speed. */
  flinchTime: 0.28,
  knockback: 140,
  /** Rushers stop this far from the player. */
  rushStop: 120,
  /** A crouched soldier this close to a crate/sandbags counts as in cover. */
  coverGap: 30,
  /** Troops keep at least this far from each other and from the player. */
  personalSpace: 72,
  /** …and this far from a machine-gun nest. */
  nestSpace: 110,
} as const;

/** Side items (J). Speeds px/s, gravity px/s², radii px. */
export const ITEMS = {
  /** Uses carried into each ground assault (refilled on a new life). */
  start: { frag: 3, molotov: 2, medkit: 1 },
  /** Delay between uses. */
  cooldown: 0.6,
  throwSpeed: 640,
  throwLift: 560,
  gravity: 1700,
  /** Frag grenade: fuse, blast radius, damage to enemies, hits to the player inside it. */
  fragFuse: 1.4,
  fragRadius: 150,
  fragDamage: 9,
  fragPlayerHits: 2,
  /** Firebomb: burn time, fire width, damage per tick to enemies, tick seconds. */
  burnSecs: 4.5,
  burnWidth: 180,
  burnDamage: 2,
  burnTick: 0.45,
  /** Medkit: health restored. */
  medkitHeal: 3,
  /** Enemy grenadier throws: flight time to the target. */
  foeThrowTime: 1.05,
} as const;

/** Player animation and cover. */
export const SOLDIER_ANIM = {
  /** Seconds the player stays up after the last shot when popping out of cover. */
  peekHold: 0.45,
  /** Landing squash time and recoil kick time. */
  landTime: 0.18,
  recoilTime: 0.09,
  /** Throw arm swing time. */
  throwTime: 0.32,
} as const;
