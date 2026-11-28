// Stage 3 — Attack Run.
// Side-scrolling terrain, side-view plane, enemies (tanks, SAMs, interceptors, heat-seeker).
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { ATTACK_RUN, TUNING, SCORE, BATTLE, LOADOUT } from '../../state/tuning';
import { createRng } from '../../state/rng';
import { ProximityBeep, BeepSource } from '../audio/ProximityBeep';
import { EngineSound } from '../audio/EngineSound';
import { MusicTrack } from '../audio/MusicTrack';
import { VoiceCallout } from '../audio/VoiceCallout';
import { playExplosion } from '../audio/ExplosionSound';
import { PauseController } from '../PauseController';
import { Effects } from '../effects/Effects';
import { pts } from '../effects/points';
import { FX_PALETTE } from '../theme/coldFront';
import { getBiome, type Biome } from '../theme/biomes';
import { Backdrop, hash01 } from '../effects/Backdrop';
import { drawJet, drawTank, TURRET_PIVOT_Y } from '../models/Vehicles';
import { drawBuilding } from '../models/Buildings';
import { drawSamSite, drawTower } from '../models/Structures';
import { drawTracer, drawShell, drawMissile } from '../models/Weapons';
import { BattleLayer } from '../effects/BattleLayer';
import { SOLDIER_RED } from '../theme/factions';
import { playerJet } from '../theme/loadoutTheme';
import { progress } from '../../state/progress';
import { Xform } from '../models/shapes';
import { settings, haptic } from '../../state/settings';

const W = 1280;
const H = 720;
const FIXED_DT = 1 / 60;

// Terrain
const SEGMENT_W = 160;
const GROUND_BASE_Y = H - 90;   // canvas Y of default ground surface
const GROUND_VARIATION = 40;    // ±px random height variation


const PLANE_HIT_W = 28;  // half-width of hitbox
const PLANE_HIT_H = 18;  // half-height

// Enemy & projectile sizes (px)
const TANK_W = 60;   const TANK_H = 28;   const TANK_BARREL = 30;
const SAM_W  = 40;   const SAM_H  = 55;
const INTERC_W = 55; const INTERC_H = 22;
const HEATSEEK_W = 28; const HEATSEEK_H = 10;
const BLDG_W = 90;   const BLDG_H = 140;
const PYLON_H = 180;

interface SceneData {
  launchIndex: number;
}

type PlaneState = 'flying' | 'crashed' | 'gameover';
type HeatSeekerPhase = 'warning' | 'active' | 'passed';

interface GroundEnemy {
  worldX: number;
  type: 'tank' | 'sam';
  alive: boolean;
  fireTimer: number;
  aim: number; // tank turret / SAM rail angle, radians (0 = right, -PI/2 = up)
  /** Seconds left of the firing animation (tank recoil / SAM launch shake). */
  fireAnim: number;
  /** Tanks drive back and forth around their spawn point. */
  homeX: number;
  vx: number;
  driveTimer: number;
  /** Distance driven, px (spins the wheels). */
  travel: number;
  // SAM only:
  missile: { x: number; y: number; vx: number; vy: number } | null;
  /** Tank only: machine-gunner in the hatch who shoots blue soldiers in the background. */
  gunner: Gunner | null;
}

interface Gunner {
  alive: boolean;
  kills: number;
  maxKills: number;
  fireT: number;
  /** Gun angle on screen, radians. */
  aim: number;
  flash: number;
  /** Seconds since he was hit (slumps over the hatch). */
  deadT: number;
}

interface Obstacle {
  worldX: number;
  type: 'building' | 'pylon';
}

interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  alive: boolean;
  fromEnemy: boolean;
  /** bullet = tracer (player / jets), shell = tank round. */
  kind: 'bullet' | 'shell';
}

interface Interceptor {
  x: number; y: number;
  vx: number;
  /** Vertical speed, px/s; the jet pitches its nose to match. */
  vy: number;
  alive: boolean;
  burstLeft: number;
  burstTimer: number;
  whooshPlayed: boolean;
}

interface HeatSeeker {
  phase: HeatSeekerPhase;
  x: number;
  lockedY: number;    // canvas Y locked at warning time
  warnTimer: number;  // counts down before entering
}

interface Bomb {
  worldXDrop: number;
  altAtDrop:  number;
  landWorldX: number;
  t:          number;   // 0 → 1 progress through parabolic arc
  alive:      boolean;
  /** Tank this bomb has locked onto (lands within one tank hitbox of it). */
  target:     GroundEnemy | null;
}


export class AttackRunScene extends Phaser.Scene {
  private launchIndex   = 0;

  // Contextual hint timer.
  private hintTimer = 0;

  // ── Terrain data ─────────────────────────────────────────────────────────
  private groundHeights: number[] = [];
  private obstacles: Obstacle[] = [];
  private groundEnemies: GroundEnemy[] = [];
  private totalSegments = 0;

  // ── Scheduled spawns ──────────────────────────────────────────────────────
  private interceptorSchedule: number[] = [];   // times (seconds from start) to spawn
  private heatSeekerSchedule: number[] = [];    // warning trigger times
  private nextInterceptorIdx = 0;
  private nextHeatSeekerIdx  = 0;

  // ── World / physics state ─────────────────────────────────────────────────
  private cameraX   = 0;    // world X of screen left edge
  private planeX    = ATTACK_RUN.planeXMin + 100; // screen X
  private planeAlt  = ATTACK_RUN.altitudeMax * 0.4;
  private planeState: PlaneState = 'flying';
  private stageTimer = ATTACK_RUN.duration;
  private thrusting  = false;

  // ── Active enemies / projectiles ─────────────────────────────────────────
  private projectiles: Projectile[] = [];
  private interceptors: Interceptor[] = [];
  private heatSeeker: HeatSeeker | null = null;
  private activeEnemies = new Set<GroundEnemy>();

  // ── Bombs & explosions ────────────────────────────────────────────────────
  private bombs: Bomb[] = [];
  private bombReloadTimer = 0;
  private trailTimer = 0;
  private fx!: Effects;

  // ── Pre-run briefing & pause ───────────────────────────────────────────────
  /** Seconds into the fly-in from the takeoff (player input ignored until it ends). */
  private entryT = 0;

  // ── Input ─────────────────────────────────────────────────────────────────
  private prevFire   = false;
  private prevAction = false;
  private accumulator = 0;

  // ── Audio ─────────────────────────────────────────────────────────────────
  private proximityBeep = new ProximityBeep();
  private engineSound   = new EngineSound();
  private musicTrack    = new MusicTrack();
  private pauseCtl!: PauseController;
  private rng = createRng(0);
  private voice         = new VoiceCallout();
  private firstInterceptorVoiced = false;

  // ── Visuals ───────────────────────────────────────────────────────────────
  private backdrop!:     Backdrop;
  private battle!:       BattleLayer;
  private battleSkyGfx!: Phaser.GameObjects.Graphics;
  private battleGfx!:    Phaser.GameObjects.Graphics;
  private biome!:        Biome;
  private terrainGfx!:   Phaser.GameObjects.Graphics;
  private enemyGfx!:     Phaser.GameObjects.Graphics;
  private projGfx!:      Phaser.GameObjects.Graphics;
  private bombGfx!:      Phaser.GameObjects.Graphics;
  private explosionGfx!: Phaser.GameObjects.Graphics;
  private planeGfx!:     Phaser.GameObjects.Graphics;
  private shadowGfx!:    Phaser.GameObjects.Graphics;
  private touchControls!: TouchControls;
  private visibilityHandler!: () => void;

  constructor() { super({ key: 'AttackRunScene' }); }

  init(data: Partial<SceneData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.cameraX     = 0;
    this.planeX      = ATTACK_RUN.entryStartX;
    this.planeAlt    = ATTACK_RUN.entryStartAlt;
    this.planeState  = 'flying';
    this.stageTimer  = ATTACK_RUN.duration;
    this.thrusting   = false;
    this.projectiles = [];
    this.interceptors = [];
    this.heatSeeker  = null;
    this.activeEnemies.clear();
    this.groundHeights = [];
    this.obstacles   = [];
    this.groundEnemies = [];
    this.interceptorSchedule = [];
    this.heatSeekerSchedule  = [];
    this.nextInterceptorIdx  = 0;
    this.nextHeatSeekerIdx   = 0;
    this.accumulator   = 0;
    this.prevFire      = false;
    this.prevAction    = false;
    this.bombs         = [];
    this.bombReloadTimer = 0;
    this.engineSound.stop();
    this.musicTrack.stop();
    this.firstInterceptorVoiced = false;
    this.entryT        = 0;
    this.hintTimer     = 0;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive   = false;
    gameUi.attackRunSecsLeft = this.stageTimer;
    missionState.hudCue = 'ATTACK RUN';
    debugInfo.doorState = '—';
    debugInfo.speed     = 0;

    // Progress breadcrumb.
    gameUi.progressStep   = 'attack_run';
    gameUi.launchNumber   = this.launchIndex + 1;
    gameUi.objective      = 'Survive and reach the silos';
    gameUi.contextualHint = null;


    // ── Generate terrain ────────────────────────────────────────────────────
    this.totalSegments = Math.ceil(
      ATTACK_RUN.scrollSpeed * ATTACK_RUN.duration / SEGMENT_W,
    ) + 15;

    const density = ATTACK_RUN.enemyDensity[
      Math.min(this.launchIndex, ATTACK_RUN.enemyDensity.length - 1)
    ];
    const fireRateMult = TUNING[missionState.difficulty].enemyFireRate;
    const rng = createRng(missionState.seed + this.launchIndex * 1000 + 300);
    this.rng = rng;

    for (let i = 0; i < this.totalSegments; i++) {
      const variation = rng.next() * GROUND_VARIATION * 2 - GROUND_VARIATION;
      this.groundHeights[i] = Phaser.Math.Clamp(
        GROUND_BASE_Y + variation, H - 180, H - 50,
      );

      if (i < 5) continue; // safe start zone

      const wx = i * SEGMENT_W + rng.next() * SEGMENT_W * 0.6;
      const gy = this.groundHeights[i];

      if (rng.next() < 0.12 * density) {
        this.groundEnemies.push({
          worldX: wx, type: 'tank', alive: true,
          fireTimer: (ATTACK_RUN.tankFireInterval / fireRateMult) * (0.8 + rng.next() * 0.4),
          missile: null, aim: -Math.PI / 2, fireAnim: 0,
          homeX: wx, vx: 0, driveTimer: rng.next() * 2, travel: 0,
          // Gunner stats from a hash so the main enemy layout sequence is unchanged.
          gunner: {
            alive: true, kills: 0, flash: 0, deadT: 0, aim: Math.PI,
            maxKills: BATTLE.gunnerKillsMin + Math.floor(hash01(wx * 0.37) * (BATTLE.gunnerKillsMax - BATTLE.gunnerKillsMin + 1)),
            fireT: hash01(wx * 0.91) * BATTLE.gunnerFireInterval * 2,
          },
        });
      } else if (rng.next() < 0.08 * density) {
        this.groundEnemies.push({
          worldX: wx, type: 'sam', alive: true,
          fireTimer: (3.0 / fireRateMult) * (0.8 + rng.next() * 0.4),
          missile: null, aim: -Math.PI / 4, fireAnim: 0,
          homeX: wx, vx: 0, driveTimer: 0, travel: 0, gunner: null,
        });
      }

      if (rng.next() < 0.055 * density && gy < H - 100) {
        this.obstacles.push({ worldX: wx + 40, type: 'building' });
      } else if (rng.next() < 0.04 * density) {
        this.obstacles.push({ worldX: wx + 70, type: 'pylon' });
      }
    }

    // ── Scheduled spawns ─────────────────────────────────────────────────────
    let t = 6 + rng.next() * 4;
    while (t < ATTACK_RUN.duration - 6) {
      this.interceptorSchedule.push(ATTACK_RUN.duration - t); // convert to countdown
      t += ATTACK_RUN.interceptorInterval + rng.next() * 4 - 2;
    }
    this.heatSeekerSchedule.push(ATTACK_RUN.duration - (12 + rng.next() * 4));
    if (this.launchIndex >= 1) {
      this.heatSeekerSchedule.push(ATTACK_RUN.duration - (28 + rng.next() * 4));
    }
    this.interceptorSchedule.sort((a, b) => b - a);
    this.heatSeekerSchedule.sort((a, b) => b - a);

    // ── Background ──────────────────────────────────────────────────────────
    // Sky (static, depth 0) + parallax scenery for this level; each launch gets its own layout.
    this.biome = getBiome(missionState.level);
    this.backdrop = new Backdrop(
      this.add.graphics().setDepth(0),
      this.add.graphics().setDepth(0.1), // far ridges
      this.add.graphics().setDepth(0.5), // hills, pools, tree line
      this.biome,
      (missionState.seed % 1000) + this.launchIndex * 7,
    );

    // Background war: dogfights between the far ridges and the hills, infantry on the tree line.
    this.battleSkyGfx = this.add.graphics().setDepth(0.3);
    this.battleGfx    = this.add.graphics().setDepth(0.6);
    this.battle = new BattleLayer(
      createRng(missionState.seed + this.launchIndex * 31 + 4242),
      this.biome.enemyJet,
      { offset: () => this.backdrop.forestOffset(this.cameraX), floorY: (sx) => this.backdrop.forestY(sx, this.cameraX) },
    );

    // ── Graphics layers ──────────────────────────────────────────────────────
    this.terrainGfx   = this.add.graphics().setDepth(1);
    this.shadowGfx    = this.add.graphics().setDepth(2);
    this.enemyGfx     = this.add.graphics().setDepth(3);
    this.explosionGfx = this.add.graphics().setDepth(3.5);
    this.projGfx      = this.add.graphics().setDepth(4);
    this.bombGfx      = this.add.graphics().setDepth(4.5);
    this.planeGfx     = this.add.graphics().setDepth(5);
    this.fx = new Effects(
      this.explosionGfx,
      (wx) => this.groundYAtWorldX(wx),
      createRng(missionState.seed + this.launchIndex * 1000 + 777),
      (wx, gy) => this.fallerImpact(wx, gy),
      this.biome.enemyJet,
    );
    this.pauseCtl = new PauseController(this);

    // ── Touch / pause ────────────────────────────────────────────────────────
    this.touchControls = new TouchControls(this, { move: 'FLY', fire: 'SHOOT', action: 'BOMB' });
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    // Phaser doesn't call shutdown() by name; without this, engine/music kept running in the hangar.
    this.events.once('shutdown', this.shutdown, this);

    // Seamless start: fade in from the takeoff cutscene, music straight away, no briefing card.
    this.cameras.main.fadeIn(ATTACK_RUN.entryFadeMs, 0, 0, 0);
    this.musicTrack.start();
  }

  update(time: number, delta: number): void {
    this.touchControls.update();
    const input = InputRouter.read();
    const fireJust   = input.fire   && !this.prevFire;
    const actionJust = input.action && !this.prevAction;
    this.prevFire   = input.fire;
    this.prevAction = input.action;

    // ── Pause toggle ──────────────────────────────────────────────────────────
    const wasPaused = this.pauseCtl.paused;
    if (this.pauseCtl.update(input.pause)) {
      if (!wasPaused) { this.engineSound.stop(); this.proximityBeep.stop(); }
      debugInfo.fps = Math.round(this.game.loop.actualFps);
      return;
    }

    // ── Normal game update ────────────────────────────────────────────────────
    this.accumulator += delta * 0.001;
    while (this.accumulator >= FIXED_DT) {
      this.fixedStep(FIXED_DT, input.moveX, input.moveY, fireJust, actionJust);
      this.fx.update(FIXED_DT, this.cameraX); // keeps burning after a crash too
      this.battle.update(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    // Engine sound: update every game frame while flying.
    if (this.planeState === 'flying') {
      this.engineSound.update(this.thrusting);
    }

    this.renderFrame(time);
    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  // ── Fixed step ────────────────────────────────────────────────────────────

  private fixedStep(dt: number, mx: number, my: number, fireJust: boolean, actionJust: boolean): void {
    if (this.planeState !== 'flying') return;

    // Scroll camera.
    this.cameraX += ATTACK_RUN.scrollSpeed * dt;

    // Fly-in after takeoff: glide in from off-screen left, climbing to cruise height.
    if (this.entryT < ATTACK_RUN.entryTime) {
      this.entryT = Math.min(ATTACK_RUN.entryTime, this.entryT + dt);
      const e = 1 - Math.pow(1 - this.entryT / ATTACK_RUN.entryTime, 3);
      this.planeX = Phaser.Math.Linear(ATTACK_RUN.entryStartX, ATTACK_RUN.planeXMin + 100, e);
      this.planeAlt = Phaser.Math.Linear(ATTACK_RUN.entryStartAlt, ATTACK_RUN.altitudeMax * 0.4, e);
      mx = 0; my = 0;
    } else {
      // Move plane.
      this.planeX = Phaser.Math.Clamp(
        this.planeX + mx * ATTACK_RUN.planeXSpeed * dt,
        ATTACK_RUN.planeXMin,
        ATTACK_RUN.planeXMax,
      );
      this.planeAlt = Phaser.Math.Clamp(
        this.planeAlt - my * ATTACK_RUN.planeAltSpeed * dt,
        ATTACK_RUN.altitudeMin,
        ATTACK_RUN.altitudeMax,
      );
    }
    this.thrusting = Math.abs(mx) > 0.05 || Math.abs(my) > 0.05;

    // Contextual hint after 5s without movement.
    if (this.thrusting) {
      this.hintTimer = 0;
      gameUi.contextualHint = null;
    } else {
      this.hintTimer += dt;
      if (this.hintTimer >= 5) {
        gameUi.contextualHint = 'Move up/down to dodge enemies';
      }
    }

    // Ground collision.
    const groundY = this.groundYAtWorldX(this.cameraX + this.planeX);
    const planeScreenY = groundY - this.planeAlt;
    if (this.planeAlt <= ATTACK_RUN.altitudeMin + 2) {
      if (TUNING[missionState.difficulty].groundContactCrash) {
        this.crashPlane('GROUND HIT');
        return;
      }
    }

    // Obstacle collision.
    for (const obs of this.obstacles) {
      const sx = obs.worldX - this.cameraX;
      if (sx < -BLDG_W || sx > W + BLDG_W) continue;
      const obsTopY = obs.type === 'building'
        ? this.groundYAtWorldX(obs.worldX) - BLDG_H
        : this.groundYAtWorldX(obs.worldX) - PYLON_H; // pylon taller
      const obsW = obs.type === 'building' ? BLDG_W : 20;
      if (
        Math.abs(sx - this.planeX) < (PLANE_HIT_W + obsW / 2) &&
        planeScreenY + PLANE_HIT_H > obsTopY
      ) {
        this.crashPlane('OBSTACLE');
        return;
      }
    }

    // Player fire.
    const twin = progress.loadout.gun === 'twin';
    const maxRounds = twin ? LOADOUT.twinMaxInAir : LOADOUT.cannonMaxInAir;
    if (fireJust && this.projectiles.filter(p => !p.fromEnemy && p.alive).length < maxRounds) {
      const spreads = twin ? [-LOADOUT.twinSpreadVy, LOADOUT.twinSpreadVy] : [0];
      for (const vy of spreads) {
        this.projectiles.push({
          x: this.planeX + PLANE_HIT_W,
          y: planeScreenY + Math.sign(vy) * LOADOUT.twinOffsetY,
          vx: ATTACK_RUN.bulletSpeed, vy,
          alive: true, fromEnemy: false, kind: 'bullet',
        });
      }
    }

    // Bomb drop.
    this.bombReloadTimer -= dt;
    if (
      actionJust &&
      this.bombReloadTimer <= 0 &&
      this.bombs.filter(b => b.alive).length < ATTACK_RUN.bombMaxInAir
    ) {
      this.dropBomb();
      this.bombReloadTimer = ATTACK_RUN.bombReloadTime + (progress.loadout.bomb === 'cluster' ? LOADOUT.clusterReloadAdd : 0);
    }

    // Update bombs.
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      bomb.t += dt / ATTACK_RUN.bombArcTime;

      // Homing: lock onto a tank if the impact point is within one tank hitbox of it,
      // then slide the impact point onto the tank as it drives.
      if (!bomb.target || !bomb.target.alive) {
        bomb.target = null;
        let best: number = ATTACK_RUN.bombHomingRange;
        for (const e of this.groundEnemies) {
          if (!e.alive || e.type !== 'tank') continue;
          const d = Math.abs(e.worldX - bomb.landWorldX);
          if (d <= best) { best = d; bomb.target = e; }
        }
      }
      if (bomb.target) {
        const maxStep = ATTACK_RUN.bombHomingSpeed * dt;
        bomb.landWorldX += Phaser.Math.Clamp(bomb.target.worldX - bomb.landWorldX, -maxStep, maxStep);
      }

      // Mid-flight proximity check for aerial targets.
      const curWX    = bomb.worldXDrop + (bomb.landWorldX - bomb.worldXDrop) * bomb.t;
      const bombSX   = curWX - this.cameraX;
      const bombGroundY = this.groundYAtWorldX(curWX);
      const bombSY   = bombGroundY - bomb.altAtDrop * (1 - bomb.t * bomb.t);
      const airHitR  = 55;

      for (const ic of this.interceptors) {
        if (!ic.alive) continue;
        const dist = Math.sqrt((bombSX - ic.x) ** 2 + (bombSY - ic.y) ** 2);
        if (dist < airHitR) {
          bomb.alive = false;
          this.killInterceptor(ic);
          missionState.addScore(SCORE.interceptor);
          missionState.hudCue = `+${SCORE.interceptor}`;
          break;
        }
      }

      if (!bomb.alive) continue;

      if (this.heatSeeker && this.heatSeeker.phase !== 'warning') {
        const hs   = this.heatSeeker;
        const dist = Math.sqrt((bombSX - hs.x) ** 2 + (bombSY - hs.lockedY) ** 2);
        if (dist < airHitR) {
          this.heatSeeker = null; bomb.alive = false;
          this.spawnExplosion(hs.x + this.cameraX, hs.lockedY, 60);
          missionState.addScore(SCORE.heatSeekerFromBehind);
          missionState.hudCue = `HEAT-SEEKER DOWN! +${SCORE.heatSeekerFromBehind}`;
          gameUi.callout = `+${SCORE.heatSeekerFromBehind}  NICE SHOT`;
          gameUi.calloutExpiry = Date.now() + 1500;
          continue;
        }
      }

      if (bomb.t >= 1) {
        bomb.t     = 1;
        bomb.alive = false;
        this.bombExplode(bomb.landWorldX);
      }
    }

    // Update projectiles.
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if (proj.x > W + 50 || proj.x < -50 || proj.y < 0 || proj.y > H) {
        proj.alive = false;
      }
    }

    // Smoke trails behind missiles in flight.
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = ATTACK_RUN.missileTrailInterval;
      for (const e of this.activeEnemies) {
        if (!e.missile) continue;
        const a = Math.atan2(e.missile.vy, e.missile.vx);
        this.fx.smokePuff(e.missile.x - Math.cos(a) * 22 + this.cameraX, e.missile.y - Math.sin(a) * 22, 7);
      }
      const hs = this.heatSeeker;
      if (hs && hs.phase !== 'warning') this.fx.smokePuff(hs.x - 26 + this.cameraX, hs.lockedY, 7);
    }

    // Activate ground enemies entering viewport.
    for (const enemy of this.groundEnemies) {
      if (!enemy.alive) continue;
      const sx = enemy.worldX - this.cameraX;
      if (sx > -100 && sx < W + 100) this.activeEnemies.add(enemy);
      else if (sx < -200) this.activeEnemies.delete(enemy);
    }

    // Step active ground enemies.
    for (const enemy of this.activeEnemies) {
      if (!enemy.alive) continue;
      enemy.fireTimer -= dt;
      enemy.fireAnim = Math.max(0, enemy.fireAnim - dt);

      if (enemy.type === 'tank') {
        // Drive: pick forward / back / stop every few seconds, stay near the spawn point.
        enemy.driveTimer -= dt;
        if (enemy.driveTimer <= 0) {
          enemy.driveTimer = ATTACK_RUN.tankDriveMinSecs + this.rng.next() * ATTACK_RUN.tankDriveMinSecs;
          const r = this.rng.next();
          enemy.vx = r < 0.4 ? -ATTACK_RUN.tankDriveSpeed : r < 0.8 ? ATTACK_RUN.tankDriveSpeed : 0;
        }
        if (Math.abs(enemy.worldX + enemy.vx * dt - enemy.homeX) > ATTACK_RUN.tankDriveRange) enemy.vx = -enemy.vx;
        enemy.worldX += enemy.vx * dt;
        enemy.travel += enemy.vx * dt;
        // Turret swings toward the plane at a limited rate, never below the horizon.
        const pivot  = this.tankPivot(enemy);
        let target = Phaser.Math.Angle.Between(pivot.x, pivot.y, this.planeX, planeScreenY);
        if (target > 0) target = target > Math.PI / 2 ? -Math.PI : 0; // plane below: stay level on its side
        const maxTurn = Phaser.Math.DegToRad(ATTACK_RUN.tankTurretTurnRate) * dt;
        enemy.aim += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(target - enemy.aim), -maxTurn, maxTurn);
        this.stepGunner(enemy, dt);
      } else {
        // SAM launch rail swings up toward the plane (upward arc only).
        const base   = this.samRailBase(enemy);
        const target = Phaser.Math.Clamp(
          Phaser.Math.Angle.Between(base.x, base.y, this.planeX, planeScreenY),
          ATTACK_RUN.samRailAimMin, ATTACK_RUN.samRailAimMax);
        const maxTurn = Phaser.Math.DegToRad(ATTACK_RUN.samRailTurnRate) * dt;
        enemy.aim = Phaser.Math.Clamp(
          enemy.aim + Phaser.Math.Clamp(target - enemy.aim, -maxTurn, maxTurn),
          ATTACK_RUN.samRailAimMin, ATTACK_RUN.samRailAimMax);
      }

      if (enemy.fireTimer <= 0) {
        const gy = this.groundYAtWorldX(enemy.worldX);

        if (enemy.type === 'tank') {
          // One round out of the barrel, along wherever the turret is pointing.
          enemy.fireTimer = ATTACK_RUN.tankFireInterval / TUNING[missionState.difficulty].enemyFireRate;
          const pivot = this.tankPivot(enemy);
          const mx = pivot.x + Math.cos(enemy.aim) * TANK_BARREL;
          const my = pivot.y + Math.sin(enemy.aim) * TANK_BARREL;
          this.projectiles.push({
            x: mx, y: my,
            vx: Math.cos(enemy.aim) * ATTACK_RUN.flakSpeed,
            vy: Math.sin(enemy.aim) * ATTACK_RUN.flakSpeed,
            alive: true, fromEnemy: true, kind: 'shell',
          });
          enemy.fireAnim = ATTACK_RUN.tankRecoilTime;
          this.fx.muzzleFlash(mx + this.cameraX, my, enemy.aim);
        } else { // sam
          enemy.fireTimer = 3.0 / TUNING[missionState.difficulty].enemyFireRate;
          if (!enemy.missile) {
            // Missile leaves from the rail tip, along the rail.
            const base = this.samRailBase(enemy);
            const tipX = base.x + Math.cos(enemy.aim) * ATTACK_RUN.samRailLength;
            const tipY = base.y + Math.sin(enemy.aim) * ATTACK_RUN.samRailLength;
            enemy.missile = {
              x: tipX, y: tipY,
              vx: Math.cos(enemy.aim) * ATTACK_RUN.samMissileSpeed,
              vy: Math.sin(enemy.aim) * ATTACK_RUN.samMissileSpeed,
            };
            enemy.fireAnim = ATTACK_RUN.samLaunchAnimTime;
            this.fx.muzzleFlash(tipX + this.cameraX, tipY, enemy.aim + Math.PI); // back-blast
            for (let i = 0; i < 4; i++) {
              this.fx.smokePuff(enemy.worldX + (i - 1.5) * 12, gy - 6, 12);
            }
          }
        }
      }

      // SAM missile homing.
      if (enemy.missile) {
        const m   = enemy.missile;
        const ang = Phaser.Math.Angle.Between(m.x, m.y, this.planeX, planeScreenY);
        const curAng = Math.atan2(m.vy, m.vx);
        const maxTurn = Phaser.Math.DegToRad(ATTACK_RUN.samTurnRate) * dt;
        const diff = Phaser.Math.Angle.Wrap(ang - curAng);
        const turn = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        const newAng = curAng + turn;
        const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        m.vx = Math.cos(newAng) * spd;
        m.vy = Math.sin(newAng) * spd;
        m.x += m.vx * dt;
        m.y += m.vy * dt;

        if (m.x < -50 || m.x > W + 50 || m.y < -50 || m.y > H + 50) {
          enemy.missile = null;
        }
        // Missile hits player?
        if (Math.abs(m.x - this.planeX) < PLANE_HIT_W && Math.abs(m.y - planeScreenY) < PLANE_HIT_H) {
          enemy.missile = null;
          this.crashPlane('SAM HIT');
          return;
        }
      }
    }

    // Check player bullets hitting enemies.
    for (const proj of this.projectiles) {
      if (!proj.alive || proj.fromEnemy) continue;
      for (const enemy of this.activeEnemies) {
        if (!enemy.alive) continue;
        const esx = enemy.worldX - this.cameraX;
        const egy = this.groundYAtWorldX(enemy.worldX);
        const eh  = enemy.type === 'tank' ? TANK_H : SAM_H;
        const ew  = enemy.type === 'tank' ? TANK_W : SAM_W;
        if (
          Math.abs(proj.x - esx) < ew / 2 &&
          Math.abs(proj.y - (egy - eh / 2)) < eh / 2
        ) {
          proj.alive   = false;
          this.killGroundEnemy(enemy);
          missionState.addScore(SCORE.tank);
          missionState.hudCue = `+${SCORE.tank}`;
        }
      }
    }

    // Enemy flak/missiles hitting player.
    for (const proj of this.projectiles) {
      if (!proj.alive || !proj.fromEnemy) continue;
      if (Math.abs(proj.x - this.planeX) < PLANE_HIT_W && Math.abs(proj.y - planeScreenY) < PLANE_HIT_H) {
        proj.alive = false;
        this.crashPlane('ENEMY FIRE');
        return;
      }
    }

    // ── Interceptors ──────────────────────────────────────────────────────────
    const density = ATTACK_RUN.enemyDensity[
      Math.min(this.launchIndex, ATTACK_RUN.enemyDensity.length - 1)
    ];

    // Spawn from schedule.
    while (
      this.nextInterceptorIdx < this.interceptorSchedule.length &&
      this.stageTimer <= this.interceptorSchedule[this.nextInterceptorIdx]
    ) {
      const spawnY = GROUND_BASE_Y - ATTACK_RUN.altitudeMax * 0.5 -
                     (this.rng.next() * ATTACK_RUN.altitudeMax * 0.3);
      this.interceptors.push({
        x: W + 60, y: spawnY,
        vx: -ATTACK_RUN.interceptorSpeed * density, vy: 0,
        alive: true, burstLeft: ATTACK_RUN.interceptorBurstShots,
        burstTimer: 0.5, whooshPlayed: false,
      });
      if (!this.firstInterceptorVoiced) {
        this.firstInterceptorVoiced = true;
        this.voice.say('Hostile aircraft', 'hostile');
      }
      this.nextInterceptorIdx++;
    }

    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      // Fly like a jet: ease the climb rate toward the player's altitude (level off once
      // past them); the nose pitches with the climb in renderFrame.
      const wantVy = ic.x > this.planeX
        ? Phaser.Math.Clamp((planeScreenY - ic.y) * 1.4, -ATTACK_RUN.interceptorClimbRate, ATTACK_RUN.interceptorClimbRate)
        : 0;
      const dv = ATTACK_RUN.interceptorPitchAccel * dt;
      ic.vy += Phaser.Math.Clamp(wantVy - ic.vy, -dv, dv);
      ic.x += ic.vx * dt;
      ic.y += ic.vy * dt;

      // Burst fire.
      ic.burstTimer -= dt;
      if (ic.burstTimer <= 0 && ic.burstLeft > 0) {
        ic.burstLeft--;
        ic.burstTimer = ATTACK_RUN.interceptorBurstGap;
        // Straight out of the nose, along the direction the jet is flying.
        const p = this.interceptorPitch(ic), c = Math.cos(p), sn = Math.sin(p);
        this.projectiles.push({
          x: ic.x - 30 * c, y: ic.y + 30 * sn,
          vx: -ATTACK_RUN.interceptorBulletSpeed * c, vy: ATTACK_RUN.interceptorBulletSpeed * sn,
          alive: true, fromEnemy: true, kind: 'bullet',
        });
      }

      if (!ic.whooshPlayed && ic.x < this.planeX + 60) {
        ic.whooshPlayed = true;
        this.engineSound.playWhoosh();
      }
      if (ic.x < -80) ic.alive = false;

      // Player bullet kills interceptor.
      for (const proj of this.projectiles) {
        if (!proj.alive || proj.fromEnemy) continue;
        if (Math.abs(proj.x - ic.x) < INTERC_W / 2 && Math.abs(proj.y - ic.y) < INTERC_H) {
          proj.alive = false;
          this.killInterceptor(ic);
          missionState.addScore(SCORE.interceptor);
          missionState.hudCue = `+${SCORE.interceptor}`;
          break;
        }
      }

      // Interceptor collides with player.
      if (Math.abs(ic.x - this.planeX) < PLANE_HIT_W + INTERC_W / 2 &&
          Math.abs(ic.y - planeScreenY) < PLANE_HIT_H + INTERC_H) {
        ic.alive = false;
        this.crashPlane('INTERCEPTOR COLLISION');
        return;
      }
    }

    // ── Heat-seeker ───────────────────────────────────────────────────────────
    while (
      this.nextHeatSeekerIdx < this.heatSeekerSchedule.length &&
      this.stageTimer <= this.heatSeekerSchedule[this.nextHeatSeekerIdx] &&
      !this.heatSeeker
    ) {
      const groundY2 = this.groundYAtWorldX(this.cameraX + this.planeX);
      this.heatSeeker = {
        phase: 'warning',
        x: -60,
        lockedY: groundY2 - this.planeAlt,
        warnTimer: ATTACK_RUN.heatSeekerWarnTime,
      };
      this.voice.say('Heat seeker incoming', 'heat');
      this.nextHeatSeekerIdx++;
    }

    if (this.heatSeeker) {
      const hs = this.heatSeeker;
      if (hs.phase === 'warning') {
        hs.warnTimer -= dt;
        missionState.hudCue = '⚠ HEAT-SEEKER INCOMING';
        if (hs.warnTimer <= 0) hs.phase = 'active';
      } else if (hs.phase === 'active') {
        hs.x += ATTACK_RUN.heatSeekerSpeed * dt;
        // Overshoot check: if player is very low, the heat-seeker flies over.
        const isLow = this.planeAlt <= ATTACK_RUN.heatSeekerOvershootAlt;
        if (!isLow) {
          // Check hit.
          if (Math.abs(hs.x - this.planeX) < PLANE_HIT_W + HEATSEEK_W / 2 &&
              Math.abs(hs.lockedY - planeScreenY) < PLANE_HIT_H + HEATSEEK_H) {
            this.heatSeeker = null;
            this.crashPlane('HEAT-SEEKER HIT');
            return;
          }
        }
        if (hs.x > this.planeX + PLANE_HIT_W + 20) {
          hs.phase = 'passed';
          this.engineSound.playWhoosh();
        }
      } else { // passed
        hs.x += ATTACK_RUN.heatSeekerSpeed * dt;
        missionState.hudCue = 'SHOOT IT!';

        // Player bullet hits heat-seeker.
        for (const proj of this.projectiles) {
          if (!proj.alive || proj.fromEnemy) continue;
          if (Math.abs(proj.x - hs.x) < HEATSEEK_W && Math.abs(proj.y - hs.lockedY) < HEATSEEK_H + 10) {
            proj.alive = false;
            this.heatSeeker = null;
            this.spawnExplosion(hs.x + this.cameraX, hs.lockedY, 50);
            missionState.addScore(SCORE.heatSeekerFromBehind);
            missionState.hudCue = `HEAT-SEEKER DOWN! +${SCORE.heatSeekerFromBehind}`;
            gameUi.callout = `+${SCORE.heatSeekerFromBehind}  NICE SHOT`;
            gameUi.calloutExpiry = Date.now() + 1500;
            break;
          }
        }

        if (this.heatSeeker && hs.x > W + 60) this.heatSeeker = null;
      }
    }

    // ── Stage timer & impact clock ────────────────────────────────────────────
    this.stageTimer -= dt;
    gameUi.attackRunSecsLeft = Math.max(0, this.stageTimer);

    if (missionState.tickImpactClock(dt)) {
      this.onImpactExpired();
      return;
    }

    if (this.stageTimer <= 0) {
      gameUi.attackRunSecsLeft = 0;
      gameUi.contextualHint = null;
      // Show stage result card for 2s before transitioning.
      this.musicTrack.fadeOut(1.5);
      this.engineSound.stop();
      this.proximityBeep.stop();
      this.voice.say('Mission complete', 'complete', true);
      gameUi.stageResult = {
        headline: 'ATTACK RUN COMPLETE',
        details: [],
        next: 'SILO STRIKE — target the central silo',
      };
      this.time.delayedCall(2000, () => {
        gameUi.stageResult = null;
        this.scene.start('SiloScene', { launchIndex: this.launchIndex });
      });
      this.planeState = 'gameover'; // freeze updates
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private renderFrame(time: number): void {
    const groundY = this.groundYAtWorldX(this.cameraX + this.planeX);
    const planeScreenY = groundY - this.planeAlt;

    // ── Parallax background ──────────────────────────────────────────────────
    this.backdrop.draw(this.cameraX, this.time.now);
    this.battle.drawSky(this.battleSkyGfx, this.time.now);
    this.battle.drawGround(this.battleGfx);

    // ── Terrain ──────────────────────────────────────────────────────────────
    this.terrainGfx.clear();
    // Buildings and pylons first, so the ground drawn over them buries their base:
    // they always stand up out of the ground, even on a slope.
    this.drawObstacles();
    this.drawGround();

    // ── Enemies ───────────────────────────────────────────────────────────────
    this.enemyGfx.clear();
    for (const enemy of this.activeEnemies) {
      if (!enemy.alive) continue;
      const sx = enemy.worldX - this.cameraX;
      const gy = this.groundYAtWorldX(enemy.worldX);

      if (enemy.type === 'tank') {
        drawTank(this.enemyGfx, sx, gy, this.biome.vehicle, {
          tilt: this.slopeAt(enemy.worldX), aim: enemy.aim,
          recoil: enemy.fireAnim / ATTACK_RUN.tankRecoilTime, travel: enemy.travel,
          seed: Math.floor(enemy.homeX), barrelLen: TANK_BARREL, recoilPx: ATTACK_RUN.tankRecoilPx,
        });
        if (enemy.gunner) this.drawGunner(enemy, enemy.gunner);
      } else { // sam
        // Launch: the site kicks and its warning light flares, then settles.
        const lk = enemy.fireAnim / ATTACK_RUN.samLaunchAnimTime;      // 1 → 0
        const shake = lk > 0 ? Math.sin(time * 0.09) * 3 * lk : 0;
        drawSamSite(this.enemyGfx, sx + shake, gy, SAM_W, SAM_H, this.biome, {
          aim: enemy.aim, railLen: ATTACK_RUN.samRailLength, kick: lk, loaded: !enemy.missile,
          t: time / 1000, seed: Math.floor(enemy.worldX) % 97,
        });
      }

      // SAM missile in flight.
      if (enemy.missile) {
        const m = enemy.missile;
        drawMissile(this.enemyGfx, m.x, m.y, Math.atan2(m.vy, m.vx), time);
      }
    }

    // Interceptors: red-marked fighter jets flying left, afterburners lit.
    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      // Mirrored jet: positive rot lifts the nose (which points left).
      drawJet(this.enemyGfx, ic.x, ic.y, this.biome.enemyJet, { facing: -1, rot: this.interceptorPitch(ic), thrust: 0.8, time });
    }

    // Heat-seeker.
    if (this.heatSeeker && this.heatSeeker.phase !== 'warning') {
      const hs = this.heatSeeker;
      drawMissile(this.enemyGfx, hs.x, hs.lockedY, 0, time, 1.15);
    }

    // Heat-seeker warning arrow.
    if (this.heatSeeker?.phase === 'warning') {
      const hs    = this.heatSeeker;
      const flash = Math.sin(time * 0.02) > 0;
      if (flash) {
        const ay = hs.lockedY;
        this.enemyGfx.fillStyle(0xff3300, 0.9);
        this.enemyGfx.fillTriangle(0, ay - 20, 0, ay + 20, 50, ay);
        // Pulsing ring.
        this.enemyGfx.lineStyle(3, 0xff3300, 0.6);
        this.enemyGfx.strokeCircle(30, ay, 25 + Math.sin(time * 0.03) * 5);
      }
    }

    // ── Explosions, debris, smoke, wrecks, falling planes ───────────────────────
    this.fx.render(this.cameraX, time);

    // ── Projectiles ────────────────────────────────────────────────────────────
    this.projGfx.clear();
    this.battle.drawForeground(this.projGfx);
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      if (proj.kind === 'shell') drawShell(this.projGfx, proj.x, proj.y, Math.atan2(proj.vy, proj.vx), time);
      else drawTracer(this.projGfx, proj.x, proj.y, proj.vx, proj.vy, proj.fromEnemy);
    }

    // ── Bombs ─────────────────────────────────────────────────────────────────
    this.bombGfx.clear();
    // Red aim marker: always shows where a bomb dropped right now would land.
    if (this.planeState === 'flying') {
      const aimWX = this.cameraX + this.planeX + ATTACK_RUN.bombHorizOffset;
      this.drawAimMarker(aimWX - this.cameraX, this.groundYAtWorldX(aimWX), time, this.bombReloadTimer <= 0);
    }
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      const landSX  = bomb.landWorldX - this.cameraX;
      const frac    = bomb.t;
      const curWX   = bomb.worldXDrop + (bomb.landWorldX - bomb.worldXDrop) * frac;
      const bombSX  = curWX - this.cameraX;
      const alt     = bomb.altAtDrop * (1 - frac * frac); // gravity: accelerates as it falls
      const bombSY  = this.groundYAtWorldX(curWX) - alt;

      // Locked marker where this bomb will hit (solid, smaller).
      const crossY = this.groundYAtWorldX(bomb.landWorldX);
      this.bombGfx.fillStyle(FX_PALETTE.aimMarker, 0.35 + 0.25 * Math.sin(time * 0.03));
      this.bombGfx.fillEllipse(landSX, crossY, 40, 10);
      if (bomb.target?.alive) {
        // Lock-on brackets around the tank this bomb is homing onto.
        const tx = bomb.target.worldX - this.cameraX, ty = this.groundYAtWorldX(bomb.target.worldX) - TANK_H / 2;
        const r = 40 + Math.sin(time * 0.02) * 4;
        this.bombGfx.lineStyle(3, FX_PALETTE.lockRing, 0.9);
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          this.bombGfx.lineBetween(tx + sx * r, ty + sy * r * 0.7, tx + sx * (r - 12), ty + sy * r * 0.7);
          this.bombGfx.lineBetween(tx + sx * r, ty + sy * r * 0.7, tx + sx * r, ty + sy * (r * 0.7 - 10));
        }
      }

      // Bomb, nose along its on-screen velocity (level at release, tips over as it falls).
      const vx = (bomb.landWorldX - bomb.worldXDrop) / ATTACK_RUN.bombArcTime - ATTACK_RUN.scrollSpeed;
      const vy = 2 * bomb.altAtDrop * frac / ATTACK_RUN.bombArcTime;
      this.drawBomb(bombSX, bombSY, Math.atan2(vy, vx));
    }

    // ── Shadow ─────────────────────────────────────────────────────────────────
    this.shadowGfx.clear();
    if (this.planeState === 'flying') {
      const altFrac = (this.planeAlt - ATTACK_RUN.altitudeMin) / (ATTACK_RUN.altitudeMax - ATTACK_RUN.altitudeMin);
      const shadowW = Phaser.Math.Linear(60, 20, altFrac);
      const shadowAlpha = Phaser.Math.Linear(0.5, 0.1, altFrac);
      this.shadowGfx.fillStyle(0x000000, shadowAlpha);
      this.shadowGfx.fillEllipse(this.planeX, groundY - 4, shadowW, 12);
    }

    // ── Plane (side view) ─────────────────────────────────────────────────────
    this.planeGfx.clear();
    if (this.planeState === 'flying') {
      this.drawSidePlane(planeScreenY, time);

      // ── Proximity beep + pulsing ring ──────────────────────────────────────
      const beepSources = this.collectBeepSources(planeScreenY);
      this.proximityBeep.update(beepSources, this.planeX, planeScreenY, missionState.impactClock);
      if (this.proximityBeep.isActive) {
        const ringRadius = 25 + this.proximityBeep.ringPhase * 50;
        const ringAlpha  = (1 - this.proximityBeep.ringPhase) * 0.6;
        this.planeGfx.lineStyle(2, 0xff4444, ringAlpha);
        this.planeGfx.strokeCircle(this.planeX, planeScreenY, ringRadius);
      }
    }
  }

  /** Hatch position of a tank's gunner (screen space), following the hull tilt. */
  private gunnerPos(enemy: GroundEnemy): { x: number; y: number; tilt: number } {
    const p = this.tankPivot(enemy), tilt = this.slopeAt(enemy.worldX);
    const lx = -9, ly = -9; // behind and above the turret pivot
    return { x: p.x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y: p.y + lx * Math.sin(tilt) + ly * Math.cos(tilt), tilt };
  }

  /** Gunner fires bursts at blue soldiers in the background; after a few kills he is shot. */
  private stepGunner(enemy: GroundEnemy, dt: number): void {
    const gn = enemy.gunner;
    if (!gn) return;
    gn.flash = Math.max(0, gn.flash - dt);
    if (!gn.alive) { gn.deadT += dt; return; }
    const sx = enemy.worldX - this.cameraX;
    if (sx < 0 || sx > W) return;
    gn.fireT -= dt;
    if (gn.fireT > 0) return;
    gn.fireT = BATTLE.gunnerFireInterval * (0.8 + this.rng.next() * 0.4);
    const pos = this.gunnerPos(enemy);
    if (gn.kills >= gn.maxKills) {
      // His luck runs out: blue soldiers return fire and drop him.
      if (this.battle.returnFire(pos.x, pos.y - 6)) { gn.alive = false; gn.deadT = 0; }
      return;
    }
    const tgt = this.battle.pickBlue();
    if (!tgt) return;
    gn.aim = Math.atan2(tgt.y - pos.y, tgt.x - pos.x);
    gn.flash = 0.08;
    const mx = pos.x + Math.cos(gn.aim) * 14, my = pos.y - 6 + Math.sin(gn.aim) * 14;
    this.battle.tracer(mx, my, tgt.x, tgt.y, 'red');
    if (this.rng.chance(BATTLE.gunnerHitChance)) { this.battle.kill(tgt.s); gn.kills++; }
  }

  /** Red gunner standing in the hatch with a pintle machine gun; slumps when hit. */
  private drawGunner(enemy: GroundEnemy, gn: Gunner): void {
    const { x, y, tilt } = this.gunnerPos(enemy);
    const g = this.enemyGfx, pal = SOLDIER_RED;
    if (!gn.alive) {
      // Slumped forward over the hatch rim, arm hanging down.
      const t = new Xform(g, x, y, tilt + Math.min(1, gn.deadT / 0.5) * 1.1, 1, 1.3);
      t.rect(pal.uniform, -3, -8, 6, 8); t.circle(pal.helmet, 1, -10, 3);
      t.line(pal.uniform, 2, 2, -6, 5, 0);
      return;
    }
    const t = new Xform(g, x, y, 0, 1, 1.3);
    // Gun on its mount, swung toward the target.
    const c = Math.cos(gn.aim), s = Math.sin(gn.aim);
    t.line(0x1a1a1a, 1.6, 0, -5, 0, -1);
    t.line(0x1a1a1a, 2.4, 0, -5, c * 12, -5 + s * 12);
    if (gn.flash > 0) t.circle(0xfff2a8, c * 13, -5 + s * 13, 2.4);
    // Torso, arms on the gun, head.
    t.rect(pal.uniform, -3, -9, 6, 9);
    t.line(pal.uniform, 2, 0, -7, c * 5, -5 + s * 5);
    t.circle(pal.skin, 0, -11, 2.3);
    t.ellipse(pal.helmet, 0, -12.3, 3.1, 2);
  }

  /** Ground blast radius of the equipped bomb, px. */
  private bombRadius(): number {
    return ATTACK_RUN.bombBlastRadius * (progress.loadout.bomb === 'cluster' ? LOADOUT.clusterBlastMult : 1);
  }

  /** Interceptor nose pitch from its climb rate (positive = nose up), radians. */
  private interceptorPitch(ic: Interceptor): number {
    return Phaser.Math.Clamp(Math.atan2(-ic.vy, Math.abs(ic.vx)), -ATTACK_RUN.interceptorMaxPitch, ATTACK_RUN.interceptorMaxPitch);
  }

  private drawSidePlane(sy: number, time: number): void {
    drawJet(this.planeGfx, this.planeX, sy, playerJet(), { facing: 1, thrust: this.thrusting ? 1 : 0.15, time });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private dropBomb(): void {
    const worldXDrop = this.cameraX + this.planeX;
    this.bombs.push({
      worldXDrop,
      altAtDrop:  this.planeAlt,
      landWorldX: worldXDrop + ATTACK_RUN.bombHorizOffset,
      t: 0,
      alive: true,
      target: null,
    });
    this.voice.say('Bomb away', 'bomb');
  }

  private bombExplode(landWorldX: number): void {
    const groundY = this.groundYAtWorldX(landWorldX);
    // Big ground blast: fireball, shockwave, dirt thrown up, crater scorch.
    this.fx.explosion(landWorldX, groundY - 10, 85, 16, true, true);
    this.fx.wreck(landWorldX, 'scorch', 60, 0);
    if (progress.loadout.bomb === 'cluster') {
      // Bomblets popping across the wider blast area.
      const r = this.bombRadius();
      for (const f of [-0.8, -0.4, 0.4, 0.8]) {
        const wx = landWorldX + f * r;
        this.fx.explosion(wx, this.groundYAtWorldX(wx) - 6, 40, 6, false, true);
      }
    }
    playExplosion(90);

    for (const enemy of this.activeEnemies) {
      if (!enemy.alive) continue;
      if (Math.abs(enemy.worldX - landWorldX) <= this.bombRadius()) {
        this.killGroundEnemy(enemy, false);
        const pts = enemy.type === 'sam' ? SCORE.bombSam : SCORE.tank;
        missionState.addScore(pts);
        missionState.hudCue = `+${pts}`;
      }
    }
    if (!settings.reducedFlashing) this.cameras.main.shake(200, 0.008);
    haptic(60);
  }

  /** Smooth ground surface for the visible span, with a darker sub-band and biome decor. */
  private drawGround(): void {
    const g = this.terrainGfx, gr = this.biome.ground;
    const STEP = 16;
    const x0 = -(((this.cameraX % STEP) + STEP) % STEP);
    const surface: { x: number; y: number }[] = [];
    for (let sx = x0 - STEP; sx <= W + STEP; sx += STEP) surface.push({ x: sx, y: this.groundYAtWorldX(sx + this.cameraX) });

    const fillBelow = (dy: number, color: number): void => {
      g.fillStyle(color, 1);
      g.fillPoints(pts([...surface.map(p => ({ x: p.x, y: p.y + dy })), { x: W + STEP, y: H }, { x: x0 - STEP, y: H }]), true);
    };
    fillBelow(0, gr.fill);
    fillBelow(26, gr.band);

    g.lineStyle(3, gr.surface, 1);
    g.beginPath();
    surface.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();

    // Decor on world-fixed spots so it scrolls with the ground.
    const GAP = 46;
    for (let n = Math.floor(this.cameraX / GAP) - 1; n <= Math.floor((this.cameraX + W) / GAP) + 1; n++) {
      const r = hash01(n * 1.37 + 5);
      if (r < 0.35) continue;
      const wx = n * GAP + hash01(n * 2.9) * GAP;
      const sx = wx - this.cameraX, gy = this.groundYAtWorldX(wx);
      g.fillStyle(gr.decorColor, 1);
      g.lineStyle(2, gr.decorColor, 1);
      switch (gr.decor) {
        case 'grass':  g.fillTriangle(sx - 4, gy + 1, sx + 4, gy + 1, sx + (r - 0.6) * 10, gy - 6 - r * 6); break;
        case 'reeds':  for (let k = -1; k <= 1; k++) g.lineBetween(sx + k * 3, gy + 1, sx + k * 5, gy - 10 - r * 10); break;
        case 'stones': g.fillEllipse(sx, gy + 2, 6 + r * 8, 4 + r * 3); break;
        case 'snow':   g.fillEllipse(sx, gy + 10 + r * 20, 18 + r * 20, 3); break;
        case 'craters':
          g.fillEllipse(sx, gy + 14 + r * 22, 18 + r * 26, 5 + r * 4);
          g.fillStyle(gr.surface, 0.5); g.fillEllipse(sx, gy + 12 + r * 22, 18 + r * 26, 2);
          break;
      }
    }
  }

  /** Buildings and pylons; their base reaches below the lowest ground under them. */
  private drawObstacles(): void {
    const g = this.terrainGfx;
    for (const obs of this.obstacles) {
      const sx = obs.worldX - this.cameraX;
      if (sx < -BLDG_W || sx > W + BLDG_W) continue;
      const gy = this.groundYAtWorldX(obs.worldX);
      const halfW = obs.type === 'building' ? BLDG_W / 2 : 10;
      const base = Math.max(this.groundYAtWorldX(obs.worldX - halfW), this.groundYAtWorldX(obs.worldX + halfW), gy) + 12;
      if (obs.type === 'building') {
        drawBuilding(g, sx, gy - BLDG_H, base, BLDG_W, BLDG_H, this.biome, Math.floor(obs.worldX), this.time.now,
          x => this.groundYAtWorldX(x + this.cameraX));
      } else {
        drawTower(g, sx, gy, base, PYLON_H, this.biome, this.time.now / 1000, Math.floor(obs.worldX) % 89);
      }
    }
  }

  /** Pulsing red target marker on the ground. Dimmer while the bomb is reloading. */
  private drawAimMarker(sx: number, gy: number, time: number, ready: boolean): void {
    const g = this.bombGfx;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
    const a = ready ? 0.65 + 0.35 * pulse : 0.3;
    const r = 16 + pulse * 4;
    g.lineStyle(2.5, FX_PALETTE.aimMarker, a);
    g.strokeEllipse(sx, gy, r * 2.4, r * 0.7);
    g.lineBetween(sx - r * 1.6, gy, sx - r * 0.6, gy);
    g.lineBetween(sx + r * 0.6, gy, sx + r * 1.6, gy);
    // Downward pointer above the spot.
    g.fillStyle(FX_PALETTE.aimMarker, a);
    const by = gy - 30 - pulse * 6;
    g.fillTriangle(sx - 9, by - 14, sx + 9, by - 14, sx, by);
    g.lineBetween(sx, by, sx, gy - 6);
  }

  /** Classic finned bomb, nose along `ang`. */
  private drawBomb(x: number, y: number, ang: number): void {
    const g = this.bombGfx;
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (lx: number, ly: number): { x: number; y: number } => ({ x: x + lx * c - ly * s, y: y + lx * s + ly * c });
    // Fins (tail at -x).
    g.fillStyle(FX_PALETTE.bombFin, 1);
    g.fillPoints(pts([P(-10, 0), P(-20, -9), P(-22, -9), P(-18, 0), P(-22, 9), P(-20, 9)]), true);
    // Body.
    g.fillStyle(FX_PALETTE.bombBody, 1);
    g.fillPoints(pts([P(-14, -4), P(6, -6), P(12, -4), P(16, 0), P(12, 4), P(6, 6), P(-14, 4)]), true);
    // Nose cap + band.
    g.fillStyle(FX_PALETTE.bombNose, 1);
    g.fillPoints(pts([P(10, -4.5), P(14, -2.5), P(16, 0), P(14, 2.5), P(10, 4.5)]), true);
    g.fillStyle(FX_PALETTE.bombBand, 1);
    g.fillPoints(pts([P(-4, -5.5), P(-1, -5.8), P(-1, 5.8), P(-4, 5.5)]), true);
  }

  /** Destroy a tank or SAM: fireball, debris, burning wreck. */
  private killGroundEnemy(enemy: GroundEnemy, withSound = true): void {
    enemy.alive = false;
    enemy.missile = null;
    this.activeEnemies.delete(enemy);
    const gy = this.groundYAtWorldX(enemy.worldX);
    const isTank = enemy.type === 'tank';
    const h = isTank ? TANK_H : SAM_H;
    this.fx.explosion(enemy.worldX, gy - h * 0.5, isTank ? 55 : 65, 14, false);
    this.fx.wreck(enemy.worldX, enemy.type, isTank ? TANK_W : SAM_W, h);
    if (withSound) playExplosion(isTank ? 55 : 65);
  }

  /** Shoot down an interceptor: mid-air burst, then it tumbles to the ground. */
  private killInterceptor(ic: Interceptor): void {
    ic.alive = false;
    const wx = ic.x + this.cameraX;
    this.fx.explosion(wx, ic.y, 30, 6, false);
    // Keep most of its world speed so it arcs down ahead of where it was hit.
    this.fx.fallingPlane(wx, ic.y, ic.vx * 0.35 + ATTACK_RUN.scrollSpeed);
    playExplosion(35);
  }

  /** A falling plane hits the ground. */
  private fallerImpact(wx: number, gy: number): void {
    this.fx.explosion(wx, gy - 12, 70, 14, true, true);
    this.fx.wreck(wx, 'scorch', 50, 0);
    playExplosion(70);
  }

  /** Screen-space pivot of a SAM's launch rail (top of the box). */
  private samRailBase(enemy: GroundEnemy): { x: number; y: number } {
    return { x: enemy.worldX - this.cameraX, y: this.groundYAtWorldX(enemy.worldX) - SAM_H };
  }

  /** Collect missile and heat-seeker screen positions for proximity beep. */
  private collectBeepSources(_planeScreenY: number): BeepSource[] {
    const sources: BeepSource[] = [];
    for (const enemy of this.activeEnemies) {
      if (!enemy.alive || !enemy.missile) continue;
      sources.push({ x: enemy.missile.x, y: enemy.missile.y });
    }
    if (this.heatSeeker && this.heatSeeker.phase === 'active') {
      sources.push({ x: this.heatSeeker.x, y: this.heatSeeker.lockedY });
    }
    // Interceptors count too when close.
    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      sources.push({ x: ic.x, y: ic.y });
    }
    return sources;
  }

  private groundYAtWorldX(worldX: number): number {
    const idx = Math.floor(worldX / SEGMENT_W);
    if (idx < 0 || idx >= this.groundHeights.length) return GROUND_BASE_Y;
    const f   = (worldX % SEGMENT_W) / SEGMENT_W;
    const t   = f * f * (3 - 2 * f); // smoothstep: rounded hills instead of sharp kinks
    const h0  = this.groundHeights[idx];
    const h1  = this.groundHeights[Math.min(idx + 1, this.groundHeights.length - 1)];
    return Phaser.Math.Linear(h0, h1, t);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private crashPlane(reason: string): void {
    if (this.planeState !== 'flying') return;
    this.planeState = 'crashed';
    this.proximityBeep.stop();
    this.engineSound.stop();
    playExplosion(80);
    const pwx = this.cameraX + this.planeX;
    this.fx.explosion(pwx, this.groundYAtWorldX(pwx) - this.planeAlt, 75, 16, false);
    this.musicTrack.fadeOut(0.6);
    missionState.losePlane();
    if (missionState.planes > 0) {
      this.voice.say('Eject eject', 'eject', true);
    } else {
      this.voice.say('Mission failed', 'failed', true);
    }
    missionState.hudCue = `CRASHED: ${reason}`;
    gameUi.attackRunSecsLeft = 0;

    if (!settings.reducedFlashing) this.cameras.main.shake(300, 0.01);
    haptic(200);
    this.time.delayedCall(1200, () => {
      if (missionState.planes <= 0) {
        this.showGameOver();
      } else {
        // Spare takes over: restart attack run.
        this.scene.restart({ launchIndex: this.launchIndex });
      }
    });
  }

  private onImpactExpired(): void {
    this.proximityBeep.stop();
    this.engineSound.stop();
    this.musicTrack.fadeOut(0.6);
    const CITIES = ['Harlan Bay', 'Port Cressa', 'New Allis', 'Veldor'];
    const cityName = CITIES[this.launchIndex % CITIES.length] ?? 'City';
    missionState.cityLost();
    missionState.hudCue      = 'CITY LOST';
    gameUi.attackRunSecsLeft = 0;
    gameUi.contextualHint    = null;
    gameUi.callout           = `CITY LOST: ${cityName}`;
    gameUi.calloutExpiry     = Date.now() + 1500;
    this.planeState = 'gameover';

    this.time.delayedCall(1500, () => {
      if (missionState.isGameOver) {
        this.showGameOver();
      } else {
        this.scene.start('MapScene', { launchIndex: this.launchIndex });
      }
    });
  }

  private showGameOver(): void {
    this.musicTrack.stop();
    this.engineSound.stop();
    this.proximityBeep.stop();
    this.scene.start('GameOverScene');
  }

  private tankPivot(enemy: GroundEnemy): { x: number; y: number } {
    // Turret pivot follows the hull tilt on slopes.
    const tilt = this.slopeAt(enemy.worldX);
    const sx = enemy.worldX - this.cameraX, gy = this.groundYAtWorldX(enemy.worldX);
    return { x: sx - Math.sin(tilt) * TURRET_PIVOT_Y, y: gy + Math.cos(tilt) * TURRET_PIVOT_Y };
  }

  /** Ground slope angle (radians) under a vehicle's footprint. */
  private slopeAt(worldX: number): number {
    const half = TANK_W / 2;
    return Math.atan2(this.groundYAtWorldX(worldX + half) - this.groundYAtWorldX(worldX - half), TANK_W);
  }

  /** Mid-air explosion with sound (heat-seeker kills etc.). */
  private spawnExplosion(worldX: number, screenY: number, size: number): void {
    this.fx.explosion(worldX, screenY, size, 8, false);
    playExplosion(size);
  }

  shutdown(): void {
    gameUi.contextualHint = null;
    gameUi.stageResult    = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
    this.proximityBeep.dispose();
    this.engineSound.dispose();
    this.musicTrack.dispose();
    this.voice.stop();
    gameUi.attackRunSecsLeft = 0;
  }
}
