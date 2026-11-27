// Stage 3 — Attack Run.
// Side-scrolling terrain, side-view plane, enemies (tanks, SAMs, interceptors, heat-seeker).
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { ATTACK_RUN, TUNING, SCORE } from '../../state/tuning';
import { createRng } from '../../state/rng';
import { hasSeenHowToPlay, markSeenHowToPlay } from '../../state/howToPlay';
import { showStageIntro } from '../../state/stageIntros';
import { ProximityBeep, BeepSource } from '../audio/ProximityBeep';
import { EngineSound } from '../audio/EngineSound';
import { MusicTrack } from '../audio/MusicTrack';
import { VoiceCallout } from '../audio/VoiceCallout';
import { playExplosion } from '../audio/ExplosionSound';
import { PauseController } from '../PauseController';

const W = 1280;
const H = 720;
const FIXED_DT = 1 / 60;

// Terrain
const SEGMENT_W = 160;
const GROUND_BASE_Y = H - 90;   // canvas Y of default ground surface
const GROUND_VARIATION = 40;    // ±px random height variation

// Plane visual (side-view, pointing right, local origin at centre)
const PLANE_SIDE_POLY: [number, number][] = [
  [-28,  -6], [-10, -10], [15,  -4], [30,  0],
  [ 15,   4], [-10,  10], [-28,  6],
];
// Wing (swept-back triangle below fuselage)
const WING_POLY: [number, number][] = [
  [12, 4], [-5, 4], [-2, 28],
];

const PLANE_HIT_W = 28;  // half-width of hitbox
const PLANE_HIT_H = 18;  // half-height

// Enemy & projectile sizes (px)
const TANK_W = 60;   const TANK_H = 28;
const SAM_W  = 40;   const SAM_H  = 55;
const INTERC_W = 55; const INTERC_H = 22;
const BULLET_W = 18; const BULLET_H = 7;
const FLAK_SIZE = 10;
const MISSILE_W = 24; const MISSILE_H = 8;
const HEATSEEK_W = 28; const HEATSEEK_H = 10;
const BLDG_W = 90;   const BLDG_H = 140;

interface SceneData {
  launchIndex: number;
  sparesLaunched?: number;
}

type PlaneState = 'flying' | 'crashed' | 'gameover';
type HeatSeekerPhase = 'warning' | 'active' | 'passed';

interface GroundEnemy {
  worldX: number;
  type: 'tank' | 'sam';
  alive: boolean;
  fireTimer: number;
  burstLeft: number; // tank: shots left in the current burst
  // SAM only:
  missile: { x: number; y: number; vx: number; vy: number } | null;
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
}

interface Interceptor {
  x: number; y: number;
  vx: number;
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
}

interface Explosion {
  worldX:  number;
  screenY: number;  // screen Y locked at creation
  t:       number;  // 0 → 1; advances over 0.6s
  size:    number;  // max radius px
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
  private explosions: Explosion[] = [];

  // ── Pre-run briefing & pause ───────────────────────────────────────────────
  private preRunActive = true;
  private preRunTimer  = 0;

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
  private bgFarGfx!:     Phaser.GameObjects.Graphics;
  private bgMidGfx!:     Phaser.GameObjects.Graphics;
  private terrainGfx!:   Phaser.GameObjects.Graphics;
  private enemyGfx!:     Phaser.GameObjects.Graphics;
  private projGfx!:      Phaser.GameObjects.Graphics;
  private bombGfx!:      Phaser.GameObjects.Graphics;
  private explosionGfx!: Phaser.GameObjects.Graphics;
  private planeGfx!:     Phaser.GameObjects.Graphics;
  private shadowGfx!:    Phaser.GameObjects.Graphics;
  private preRunGfx!:    Phaser.GameObjects.Graphics;
  private crashGfx!:     Phaser.GameObjects.Graphics;
  private preRunTitleText!:  Phaser.GameObjects.Text;
  private preRunBodyText!:   Phaser.GameObjects.Text;
  private preRunPromptText!: Phaser.GameObjects.Text;
  private touchControls!: TouchControls;
  private visibilityHandler!: () => void;

  constructor() { super({ key: 'AttackRunScene' }); }

  init(data: Partial<SceneData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.cameraX     = 0;
    this.planeX      = ATTACK_RUN.planeXMin + 100;
    this.planeAlt    = ATTACK_RUN.altitudeMax * 0.4;
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
    this.explosions    = [];
    this.engineSound.stop();
    this.musicTrack.stop();
    this.firstInterceptorVoiced = false;
    this.preRunActive  = true;
    this.preRunTimer   = 0;
    this.hintTimer     = 0;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive   = false;
    gameUi.attackRunSecsLeft = this.stageTimer;
    missionState.hudCue = 'ATTACK RUN';
    this.voice.setTextCallback((text) => {
      gameUi.callout       = text;
      gameUi.calloutExpiry = Date.now() + 2200;
    });
    debugInfo.doorState = '—';
    debugInfo.speed     = 0;

    // Progress breadcrumb.
    gameUi.progressStep   = 'attack_run';
    gameUi.launchNumber   = this.launchIndex + 1;
    gameUi.objective      = 'Survive and reach the silos';
    gameUi.contextualHint = null;

    // Stage intro card (first visit this session).
    showStageIntro('attack_run');

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
          missile: null, burstLeft: 0,
        });
      } else if (rng.next() < 0.08 * density) {
        this.groundEnemies.push({
          worldX: wx, type: 'sam', alive: true,
          fireTimer: (3.0 / fireRateMult) * (0.8 + rng.next() * 0.4),
          missile: null, burstLeft: 0,
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
    // Static sky base (depth 0); parallax layers redraw every frame on top.
    const sky = this.add.graphics().setDepth(0);
    sky.fillStyle(0x0a1828, 1); sky.fillRect(0, 0, W, H * 0.5);
    sky.fillStyle(0x102030, 1); sky.fillRect(0, H * 0.5, W, H * 0.5);

    // Parallax layers — redrawn each frame in drawParallaxBg().
    this.bgFarGfx = this.add.graphics().setDepth(0.1); // far mountains
    this.bgMidGfx = this.add.graphics().setDepth(0.5); // mid hills

    // ── Graphics layers ──────────────────────────────────────────────────────
    this.terrainGfx   = this.add.graphics().setDepth(1);
    this.shadowGfx    = this.add.graphics().setDepth(2);
    this.enemyGfx     = this.add.graphics().setDepth(3);
    this.explosionGfx = this.add.graphics().setDepth(3.5);
    this.projGfx      = this.add.graphics().setDepth(4);
    this.bombGfx      = this.add.graphics().setDepth(4.5);
    this.planeGfx     = this.add.graphics().setDepth(5);
    this.preRunGfx    = this.add.graphics().setDepth(20);
    this.crashGfx     = this.add.graphics().setDepth(15);

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
    this.preRunTitleText = this.add.text(W / 2, H / 2 - 90,
      `ATTACK RUN — LAUNCH ${this.launchIndex + 1}`, {
        fontSize: '44px', color: '#44aaff',
        fontFamily: "'Space Grotesk', sans-serif", resolution: dpr,
      }).setOrigin(0.5).setDepth(21);

    const diffLabel = missionState.difficulty.toUpperCase();
    this.preRunBodyText = this.add.text(W / 2, H / 2 - 20,
      `Threat: ${diffLabel}  ·  ${ATTACK_RUN.duration}s run  ·  Reach the silo`, {
        fontSize: '26px', color: '#8aaabb',
        fontFamily: "'Space Grotesk', sans-serif", resolution: dpr,
      }).setOrigin(0.5).setDepth(21);

    this.preRunPromptText = this.add.text(W / 2, H / 2 + 50,
      'Press FIRE to launch', {
        fontSize: '30px', color: '#ffffff',
        fontFamily: "'Space Grotesk', sans-serif", resolution: dpr,
      }).setOrigin(0.5).setDepth(21);

    this.pauseCtl = new PauseController(this);

    // ── Touch / pause ────────────────────────────────────────────────────────
    this.touchControls = new TouchControls(this, { move: 'FLY', fire: 'SHOOT', action: 'BOMB' });
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    // Phaser doesn't call shutdown() by name; without this, engine/music kept running in the hangar.
    this.events.once('shutdown', this.shutdown, this);

    // ── How-to-play (first visit) ────────────────────────────────────────────
    if (!hasSeenHowToPlay('attack_run')) {
      markSeenHowToPlay('attack_run');
      gameUi.howToPlayStage = 'attack_run';
      this.time.delayedCall(5500, () => { gameUi.howToPlayStage = null; });
    }
  }

  update(time: number, delta: number): void {
    this.touchControls.update();
    const input = InputRouter.read();
    const fireJust   = input.fire   && !this.prevFire;
    const actionJust = input.action && !this.prevAction;
    this.prevFire   = input.fire;
    this.prevAction = input.action;

    // ── Pre-run briefing ──────────────────────────────────────────────────────
    if (this.preRunActive) {
      this.preRunTimer += delta * 0.001;
      if (fireJust || this.preRunTimer >= 4.0) {
        this.preRunActive = false;
        this.preRunGfx.clear();
        this.preRunTitleText.setVisible(false);
        this.preRunBodyText.setVisible(false);
        this.preRunPromptText.setVisible(false);
        this.musicTrack.start();
        this.voice.say('Engage', 'engage');
      } else {
        this.renderPreRun(time);
        debugInfo.fps = Math.round(this.game.loop.actualFps);
        return;
      }
    }

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
        : this.groundYAtWorldX(obs.worldX) - 180; // pylon taller
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
    if (fireJust && this.projectiles.filter(p => !p.fromEnemy && p.alive).length < 4) {
      this.projectiles.push({
        x: this.planeX + PLANE_HIT_W,
        y: planeScreenY,
        vx: ATTACK_RUN.bulletSpeed, vy: 0,
        alive: true, fromEnemy: false,
      });
    }

    // Bomb drop.
    this.bombReloadTimer -= dt;
    if (
      actionJust &&
      this.bombReloadTimer <= 0 &&
      this.bombs.filter(b => b.alive).length < ATTACK_RUN.bombMaxInAir
    ) {
      this.dropBomb();
      this.bombReloadTimer = ATTACK_RUN.bombReloadTime;
    }

    // Update bombs.
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      bomb.t += dt / ATTACK_RUN.bombArcTime;

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
          ic.alive = false; bomb.alive = false;
          this.spawnExplosion(ic.x + this.cameraX, ic.y, 55);
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

    // Advance explosions.
    for (const ex of this.explosions) {
      if (ex.t < 1) ex.t = Math.min(1, ex.t + dt / 0.6);
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

      if (enemy.fireTimer <= 0) {
        const sx = enemy.worldX - this.cameraX;
        const gy = this.groundYAtWorldX(enemy.worldX);

        if (enemy.type === 'tank') {
          // Aimed bursts: a few quick shots at the plane, then a reload.
          if (enemy.burstLeft <= 0) enemy.burstLeft = ATTACK_RUN.tankBurstShots;
          enemy.burstLeft--;
          enemy.fireTimer = enemy.burstLeft > 0
            ? ATTACK_RUN.tankBurstGap
            : ATTACK_RUN.tankFireInterval / TUNING[missionState.difficulty].enemyFireRate;
          const ty  = gy - TANK_H;
          const ang = Phaser.Math.Angle.Between(sx, ty, this.planeX, planeScreenY);
          this.projectiles.push({
            x: sx, y: ty,
            vx: Math.cos(ang) * ATTACK_RUN.flakSpeed,
            vy: Math.sin(ang) * ATTACK_RUN.flakSpeed,
            alive: true, fromEnemy: true,
          });
        } else { // sam
          enemy.fireTimer = 3.0 / TUNING[missionState.difficulty].enemyFireRate;
          if (!enemy.missile) {
            const gy2 = gy - SAM_H;
            const ang = Phaser.Math.Angle.Between(sx, gy2, this.planeX, planeScreenY);
            enemy.missile = {
              x: sx, y: gy2,
              vx: Math.cos(ang) * ATTACK_RUN.samMissileSpeed,
              vy: Math.sin(ang) * ATTACK_RUN.samMissileSpeed,
            };
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
          enemy.alive  = false;
          this.activeEnemies.delete(enemy);
          const exGy = this.groundYAtWorldX(enemy.worldX);
          this.spawnExplosion(enemy.worldX, exGy - (enemy.type === 'tank' ? TANK_H * 0.5 : SAM_H * 0.5), enemy.type === 'tank' ? 50 : 60);
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
        vx: -ATTACK_RUN.interceptorSpeed * density,
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
      ic.x += ic.vx * dt;
      // Steer toward the player's altitude until it has passed them.
      if (ic.x > this.planeX) {
        const maxDy = ATTACK_RUN.interceptorTrackSpeed * dt;
        ic.y += Phaser.Math.Clamp(planeScreenY - ic.y, -maxDy, maxDy);
      }

      // Burst fire.
      ic.burstTimer -= dt;
      if (ic.burstTimer <= 0 && ic.burstLeft > 0) {
        ic.burstLeft--;
        ic.burstTimer = ATTACK_RUN.interceptorBurstGap;
        const ang = Phaser.Math.Angle.Between(ic.x, ic.y, this.planeX, planeScreenY);
        this.projectiles.push({
          x: ic.x, y: ic.y,
          vx: Math.cos(ang) * 300,
          vy: Math.sin(ang) * 300,
          alive: true, fromEnemy: true,
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
          proj.alive = false; ic.alive = false;
          this.spawnExplosion(ic.x + this.cameraX, ic.y, 45);
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
    this.drawParallaxBg();

    // ── Terrain ──────────────────────────────────────────────────────────────
    this.terrainGfx.clear();
    // Draw ground segments.
    this.terrainGfx.fillStyle(0x1a3020, 1);
    const startSeg = Math.max(0, Math.floor(this.cameraX / SEGMENT_W) - 1);
    const endSeg   = Math.min(this.totalSegments - 1, Math.ceil((this.cameraX + W) / SEGMENT_W) + 1);
    for (let i = startSeg; i <= endSeg; i++) {
      const sx = i * SEGMENT_W - this.cameraX;
      const gy = this.groundHeights[i] ?? GROUND_BASE_Y;
      this.terrainGfx.fillRect(sx, gy, SEGMENT_W + 1, H - gy);
    }
    // Ground surface highlight.
    this.terrainGfx.lineStyle(2, 0x2a5030, 0.8);
    this.terrainGfx.beginPath();
    for (let i = startSeg; i <= endSeg; i++) {
      const sx = i * SEGMENT_W - this.cameraX;
      const gy = this.groundHeights[i] ?? GROUND_BASE_Y;
      if (i === startSeg) this.terrainGfx.moveTo(sx, gy);
      else this.terrainGfx.lineTo(sx, gy);
    }
    this.terrainGfx.strokePath();

    // Obstacles.
    for (const obs of this.obstacles) {
      const sx = obs.worldX - this.cameraX;
      if (sx < -BLDG_W || sx > W + BLDG_W) continue;
      const gy = this.groundYAtWorldX(obs.worldX);
      if (obs.type === 'building') {
        this.terrainGfx.fillStyle(0x334455, 1);
        this.terrainGfx.fillRect(sx - BLDG_W / 2, gy - BLDG_H, BLDG_W, BLDG_H);
        this.terrainGfx.lineStyle(1, 0x446688, 0.8);
        this.terrainGfx.strokeRect(sx - BLDG_W / 2, gy - BLDG_H, BLDG_W, BLDG_H);
        // Windows.
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          this.terrainGfx.fillStyle(0x88aacc, 0.5);
          this.terrainGfx.fillRect(sx - 30 + c * 24, gy - BLDG_H + 20 + r * 38, 14, 20);
        }
      } else { // pylon
        this.terrainGfx.fillStyle(0x445566, 1);
        this.terrainGfx.fillRect(sx - 10, gy - 180, 20, 180);
        this.terrainGfx.fillStyle(0xffaa00, 0.9);
        this.terrainGfx.fillRect(sx - 8, gy - 180, 16, 10); // top beacon
      }
    }

    // ── Enemies ───────────────────────────────────────────────────────────────
    this.enemyGfx.clear();
    for (const enemy of this.activeEnemies) {
      if (!enemy.alive) continue;
      const sx = enemy.worldX - this.cameraX;
      const gy = this.groundYAtWorldX(enemy.worldX);

      if (enemy.type === 'tank') {
        // Body.
        this.enemyGfx.fillStyle(0x445533, 1);
        this.enemyGfx.fillRect(sx - TANK_W / 2, gy - TANK_H, TANK_W, TANK_H);
        // Turret.
        this.enemyGfx.fillStyle(0x556644, 1);
        this.enemyGfx.fillRect(sx - 15, gy - TANK_H - 12, 30, 12);
        // Barrel (angled up).
        this.enemyGfx.lineStyle(4, 0x667755, 1);
        this.enemyGfx.lineBetween(sx + 10, gy - TANK_H - 6, sx + 36, gy - TANK_H - 24);
        // Treads.
        this.enemyGfx.fillStyle(0x334422, 1);
        this.enemyGfx.fillRect(sx - TANK_W / 2, gy - 10, TANK_W, 10);
      } else { // sam
        this.enemyGfx.fillStyle(0x443322, 1);
        this.enemyGfx.fillRect(sx - SAM_W / 2, gy - SAM_H, SAM_W, SAM_H);
        // Launch rail.
        this.enemyGfx.lineStyle(5, 0x556644, 1);
        this.enemyGfx.lineBetween(sx, gy - SAM_H, sx + 30, gy - SAM_H - 40);
        // Missile on rail.
        this.enemyGfx.fillStyle(0xcc4422, 1);
        this.enemyGfx.fillRect(sx + 5, gy - SAM_H - 42, 20, 8);
      }

      // SAM missile in flight.
      if (enemy.missile) {
        const m = enemy.missile;
        this.enemyGfx.fillStyle(0xff6633, 1);
        this.enemyGfx.fillRect(m.x - MISSILE_W / 2, m.y - MISSILE_H / 2, MISSILE_W, MISSILE_H);
        // Flame.
        this.enemyGfx.fillStyle(0xff9900, 0.7);
        this.enemyGfx.fillRect(m.x + MISSILE_W / 2 - 4, m.y - 4, 10, 8);
      }
    }

    // Interceptors.
    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      this.enemyGfx.fillStyle(0x556677, 1);
      this.enemyGfx.fillRect(ic.x - INTERC_W / 2, ic.y - INTERC_H / 2, INTERC_W, INTERC_H);
      // Nose pointing left.
      this.enemyGfx.fillStyle(0x778899, 1);
      this.enemyGfx.fillTriangle(
        ic.x - INTERC_W / 2 - 15, ic.y,
        ic.x - INTERC_W / 2, ic.y - 10,
        ic.x - INTERC_W / 2, ic.y + 10,
      );
      // Wing.
      this.enemyGfx.fillStyle(0x445566, 1);
      this.enemyGfx.fillTriangle(
        ic.x, ic.y + 5, ic.x - 20, ic.y + 5, ic.x - 5, ic.y + 30,
      );
    }

    // Heat-seeker.
    if (this.heatSeeker && this.heatSeeker.phase !== 'warning') {
      const hs = this.heatSeeker;
      const flicker = Math.sin(time * 0.025) > 0 ? 1 : 0.6;
      this.enemyGfx.fillStyle(0xff3300, flicker);
      this.enemyGfx.fillRect(hs.x - HEATSEEK_W / 2, hs.lockedY - HEATSEEK_H / 2, HEATSEEK_W, HEATSEEK_H);
      // Flame trail.
      this.enemyGfx.fillStyle(0xff8800, 0.5 * flicker);
      this.enemyGfx.fillRect(hs.x - HEATSEEK_W / 2 - 20, hs.lockedY - 4, 20, 8);
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

    // ── Explosions ────────────────────────────────────────────────────────────
    this.renderExplosions();

    // ── Projectiles ────────────────────────────────────────────────────────────
    this.projGfx.clear();
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      if (proj.fromEnemy) {
        this.projGfx.fillStyle(0xff6622, 0.9);
        this.projGfx.fillRect(proj.x - FLAK_SIZE / 2, proj.y - FLAK_SIZE / 2, FLAK_SIZE, FLAK_SIZE);
      } else {
        this.projGfx.fillStyle(0xffee44, 1);
        this.projGfx.fillRect(proj.x, proj.y - BULLET_H / 2, BULLET_W, BULLET_H);
      }
    }

    // ── Bombs ─────────────────────────────────────────────────────────────────
    this.bombGfx.clear();
    for (const bomb of this.bombs) {
      if (!bomb.alive) continue;
      const landSX  = bomb.landWorldX - this.cameraX;
      const frac    = bomb.t;
      const curWX   = bomb.worldXDrop + (bomb.landWorldX - bomb.worldXDrop) * frac;
      const bombSX  = curWX - this.cameraX;
      const alt     = bomb.altAtDrop * (1 - frac * frac); // gravity: accelerates as it falls
      const bombGroundY = this.groundYAtWorldX(curWX);
      const bombSY  = bombGroundY - alt;

      // Ground crosshair at landing point.
      const crossY  = this.groundYAtWorldX(bomb.landWorldX);
      const alpha   = 0.5 + 0.5 * Math.sin(time * 0.02); // subtle pulse
      this.bombGfx.lineStyle(2, 0xffcc44, alpha);
      this.bombGfx.strokeCircle(landSX, crossY, 18);
      this.bombGfx.lineBetween(landSX - 24, crossY, landSX + 24, crossY);
      this.bombGfx.lineBetween(landSX, crossY - 24, landSX, crossY + 24);

      // Bomb body.
      this.bombGfx.fillStyle(0xffcc44, 1);
      this.bombGfx.fillRect(bombSX - 10, bombSY - 10, 20, 20);
      // Fin detail.
      this.bombGfx.fillStyle(0xcc9900, 1);
      this.bombGfx.fillRect(bombSX - 10, bombSY - 10, 4, 20);
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

  private drawSidePlane(sy: number, time: number): void {
    const px = this.planeX;

    // Thrust flame (at tail, left side).
    if (this.thrusting) {
      const fl = 0.7 + 0.3 * Math.sin(time * 0.02);
      this.planeGfx.fillStyle(0xff6600, 0.75 * fl);
      this.planeGfx.fillTriangle(px - 28, sy - 6, px - 28, sy + 6, px - 28 - 36 * fl, sy);
      this.planeGfx.fillStyle(0xffee88, 0.9 * fl);
      this.planeGfx.fillTriangle(px - 28, sy - 3, px - 28, sy + 3, px - 28 - 22 * fl, sy);
    }

    // Body.
    this.planeGfx.fillStyle(0x44aaff, 1);
    this.planeGfx.beginPath();
    this.planeGfx.moveTo(px + PLANE_SIDE_POLY[0][0], sy + PLANE_SIDE_POLY[0][1]);
    for (let i = 1; i < PLANE_SIDE_POLY.length; i++) {
      this.planeGfx.lineTo(px + PLANE_SIDE_POLY[i][0], sy + PLANE_SIDE_POLY[i][1]);
    }
    this.planeGfx.closePath();
    this.planeGfx.fillPath();

    // Wing.
    this.planeGfx.fillStyle(0x2288cc, 1);
    this.planeGfx.fillTriangle(
      px + WING_POLY[0][0], sy + WING_POLY[0][1],
      px + WING_POLY[1][0], sy + WING_POLY[1][1],
      px + WING_POLY[2][0], sy + WING_POLY[2][1],
    );

    // Cockpit highlight.
    this.planeGfx.fillStyle(0xcceeFF, 0.6);
    this.planeGfx.fillEllipse(px + 10, sy - 7, 14, 7);

    // Outline.
    this.planeGfx.lineStyle(1, 0xaaddff, 0.7);
    this.planeGfx.beginPath();
    this.planeGfx.moveTo(px + PLANE_SIDE_POLY[0][0], sy + PLANE_SIDE_POLY[0][1]);
    for (let i = 1; i < PLANE_SIDE_POLY.length; i++) {
      this.planeGfx.lineTo(px + PLANE_SIDE_POLY[i][0], sy + PLANE_SIDE_POLY[i][1]);
    }
    this.planeGfx.closePath();
    this.planeGfx.strokePath();
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
    });
    this.voice.say('Bomb away', 'bomb');
  }

  private bombExplode(landWorldX: number): void {
    const groundY = this.groundYAtWorldX(landWorldX);
    this.spawnExplosion(landWorldX, groundY - 20, 80);

    for (const enemy of this.activeEnemies) {
      if (!enemy.alive) continue;
      if (Math.abs(enemy.worldX - landWorldX) <= ATTACK_RUN.bombBlastRadius) {
        enemy.alive = false;
        this.activeEnemies.delete(enemy);
        const exEGy = this.groundYAtWorldX(enemy.worldX);
        this.spawnExplosion(enemy.worldX, exEGy - (enemy.type === 'tank' ? TANK_H * 0.5 : SAM_H * 0.5), 55);
        const pts = enemy.type === 'sam' ? SCORE.bombSam : SCORE.tank;
        missionState.addScore(pts);
        missionState.hudCue = `+${pts}`;
      }
    }
    this.cameras.main.shake(200, 0.008);
  }

  /** Draw scrolling parallax mountain/hill layers behind the terrain. */
  private drawParallaxBg(): void {
    // Far layer — distant mountains (parallax factor 0.12).
    this.bgFarGfx.clear();
    this.bgFarGfx.fillStyle(0x0d1f2d, 1);
    const farOff = this.cameraX * 0.12;
    this.bgFarGfx.beginPath();
    this.bgFarGfx.moveTo(0, H);
    this.bgFarGfx.lineTo(0, 400);
    for (let sx = 0; sx <= W; sx += 40) {
      const wx = sx + farOff;
      const y  = 400
        + Math.sin(wx * 0.0030) * 60
        + Math.cos(wx * 0.0051) * 40
        + Math.sin(wx * 0.0011) * 25;
      this.bgFarGfx.lineTo(sx, y);
    }
    this.bgFarGfx.lineTo(W, H);
    this.bgFarGfx.closePath();
    this.bgFarGfx.fillPath();

    // Mid layer — nearer hills (parallax factor 0.35).
    this.bgMidGfx.clear();
    this.bgMidGfx.fillStyle(0x112218, 1);
    const midOff = this.cameraX * 0.35;
    this.bgMidGfx.beginPath();
    this.bgMidGfx.moveTo(0, H);
    this.bgMidGfx.lineTo(0, 500);
    for (let sx = 0; sx <= W; sx += 40) {
      const wx = sx + midOff;
      const y  = 500
        + Math.sin(wx * 0.0027) * 50
        + Math.cos(wx * 0.0049) * 35
        + Math.sin(wx * 0.0011) * 20;
      this.bgMidGfx.lineTo(sx, y);
    }
    this.bgMidGfx.lineTo(W, H);
    this.bgMidGfx.closePath();
    this.bgMidGfx.fillPath();
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
    const t   = (worldX % SEGMENT_W) / SEGMENT_W;
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
    this.musicTrack.fadeOut(0.6);
    missionState.losePlane();
    if (missionState.planes > 0) {
      this.voice.say('Eject eject', 'eject', true);
    } else {
      this.voice.say('Mission failed', 'failed', true);
    }
    missionState.hudCue = `CRASHED: ${reason}`;
    gameUi.attackRunSecsLeft = 0;

    this.cameras.main.shake(300, 0.01);
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
    missionState.hudCue = 'GAME OVER';

    const rng        = createRng(missionState.seed + 7919);
    const terrain    = Math.floor(rng.next() * 3); // 0=forest, 1=river, 2=mountains
    const dpr        = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
    const GY         = 490; // crash ground horizon Y on screen
    const cx         = W / 2 + 55; // crash center X

    const goText = this.add.text(W / 2, GY - 170, 'GAME OVER', {
      fontSize: '76px', color: '#ff4444',
      fontFamily: "'Space Grotesk', sans-serif", resolution: dpr,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    const scoreText = this.add.text(W / 2, GY - 90, `SCORE: ${missionState.score}`, {
      fontSize: '38px', color: '#ffffff',
      fontFamily: "'JetBrains Mono', monospace", resolution: dpr,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.time.delayedCall(1800, () => {
      goText.setAlpha(1);
      scoreText.setAlpha(1);
    });

    let firePhase = 0;
    const drawScene = (): void => {
      firePhase += 0.18;
      this.crashGfx.clear();

      // Dramatic smoke-orange sky (horizontal gradient strips).
      const sky: [number, number][] = [
        [0, 0x0a0505], [70, 0x1c0906], [140, 0x380e08], [210, 0x601808],
        [280, 0x902808], [350, 0xbe3c08], [410, 0xd85010], [455, 0xec7020],
        [480, 0xf09030],
      ];
      for (let i = 0; i < sky.length - 1; i++) {
        this.crashGfx.fillStyle(sky[i][1], 1);
        this.crashGfx.fillRect(0, sky[i][0], W, sky[i + 1][0] - sky[i][0]);
      }
      this.crashGfx.fillStyle(0xf09030, 1);
      this.crashGfx.fillRect(0, sky[sky.length - 1][0], W, GY - sky[sky.length - 1][0]);

      // ── Terrain ───────────────────────────────────────────────────────────
      if (terrain === 0) {
        // Forest.
        this.crashGfx.fillStyle(0x0e1e14, 1);
        this.crashGfx.fillRect(0, GY, W, H - GY);
        // Ground surface.
        this.crashGfx.fillStyle(0x162218, 1);
        this.crashGfx.fillRect(0, GY, W, 18);
        // Pine trees.
        for (const [tx, by] of [[80, GY], [220, GY - 10], [370, GY + 5], [830, GY - 5], [970, GY], [1150, GY - 8]] as [number, number][]) {
          this.crashGfx.fillStyle(0x0a1810, 1);
          this.crashGfx.fillTriangle(tx, by - 82, tx - 28, by, tx + 28, by);
          this.crashGfx.fillTriangle(tx, by - 60, tx - 22, by + 10, tx + 22, by + 10);
          this.crashGfx.fillTriangle(tx, by - 38, tx - 16, by + 20, tx + 16, by + 20);
          this.crashGfx.fillStyle(0x1a0e06, 1);
          this.crashGfx.fillRect(tx - 4, by + 18, 8, GY - by + 4);
        }
      } else if (terrain === 1) {
        // Riverside.
        this.crashGfx.fillStyle(0x162010, 1);
        this.crashGfx.fillRect(0, GY, W, H - GY);
        this.crashGfx.fillStyle(0x162218, 1);
        this.crashGfx.fillRect(0, GY, W, 18);
        // River channel.
        this.crashGfx.fillStyle(0x1e2c3e, 1);
        this.crashGfx.fillRect(230, GY + 15, 520, 72);
        this.crashGfx.fillStyle(0x162434, 1);
        this.crashGfx.fillRect(255, GY + 25, 470, 52);
        // Reeds.
        for (let r = 0; r < 10; r++) {
          this.crashGfx.lineStyle(2, 0x2a4420, 0.85);
          this.crashGfx.lineBetween(222 + r * 14, GY + 62, 220 + r * 14, GY + 22);
          this.crashGfx.lineBetween(758 - r * 14, GY + 62, 756 - r * 14, GY + 22);
        }
      } else {
        // Mountainside.
        this.crashGfx.fillStyle(0x1e1c20, 1);
        this.crashGfx.fillRect(0, GY, W, H - GY);
        this.crashGfx.fillStyle(0x28242c, 1);
        this.crashGfx.fillTriangle(0, GY + 20, 200, GY - 95, 390, GY + 10);
        this.crashGfx.fillTriangle(370, GY + 10, 580, GY - 125, 770, GY + 10);
        this.crashGfx.fillTriangle(750, GY + 10, 950, GY - 100, 1110, GY + 10);
        this.crashGfx.fillTriangle(1090, GY + 10, 1280, GY - 80, 1280, GY + 20);
        // Snow caps.
        this.crashGfx.fillStyle(0xdde0e8, 0.4);
        this.crashGfx.fillTriangle(200, GY - 95, 170, GY - 65, 230, GY - 65);
        this.crashGfx.fillTriangle(580, GY - 125, 548, GY - 90, 614, GY - 90);
        this.crashGfx.fillTriangle(950, GY - 100, 920, GY - 72, 980, GY - 72);
      }

      // ── Rising smoke (5 puffs) ────────────────────────────────────────────
      for (let s = 0; s < 5; s++) {
        const px = cx - 28 + Math.sin(firePhase * 0.07 + s * 0.9) * 7 + s * 9;
        const py = GY - 52 - s * 44;
        const pr = 26 + s * 17 + Math.sin(firePhase + s * 1.3) * 5;
        const pa = (0.65 - s * 0.1) * 0.9;
        this.crashGfx.fillStyle(0x2a1a14, pa);
        this.crashGfx.fillCircle(px, py, pr);
      }

      // ── Crashed plane ─────────────────────────────────────────────────────
      const ang = 0.52; // ~30° clockwise (nose tilting forward/down)
      const cosA = Math.cos(ang); const sinA = Math.sin(ang);
      const rot = (lx: number, ly: number): [number, number] => [
        cx + lx * cosA - ly * sinA,
        GY - 22 + lx * sinA + ly * cosA,
      ];

      // Fuselage (slightly desaturated — battle-worn).
      this.crashGfx.fillStyle(0x2d7ab0, 1);
      this.crashGfx.beginPath();
      const [px0, py0] = rot(PLANE_SIDE_POLY[0][0], PLANE_SIDE_POLY[0][1]);
      this.crashGfx.moveTo(px0, py0);
      for (let i = 1; i < PLANE_SIDE_POLY.length; i++) {
        const [px, py] = rot(PLANE_SIDE_POLY[i][0], PLANE_SIDE_POLY[i][1]);
        this.crashGfx.lineTo(px, py);
      }
      this.crashGfx.closePath();
      this.crashGfx.fillPath();

      // Broken wing (droops further than normal).
      this.crashGfx.fillStyle(0x1e6090, 1);
      const [bw0x, bw0y] = rot(12,  4);
      const [bw1x, bw1y] = rot(-5,  4);
      const [bw2x, bw2y] = rot(-2, 46); // droops extra
      this.crashGfx.fillTriangle(bw0x, bw0y, bw1x, bw1y, bw2x, bw2y);

      // Cockpit (dark, shattered).
      this.crashGfx.fillStyle(0x0a1a28, 1);
      const [cpx, cpy] = rot(10, -7);
      this.crashGfx.fillEllipse(cpx, cpy, 14, 7);

      // Fire at engine (rear/tail).
      const [efx, efy] = rot(-22, 2);
      const fv1 = 0.75 + 0.25 * Math.sin(firePhase * 2.1);
      const fv2 = 0.70 + 0.30 * Math.cos(firePhase * 1.8 + 0.9);
      this.crashGfx.fillStyle(0xaa1800, 0.9);
      this.crashGfx.fillEllipse(efx, efy, 54 * fv1, 60 * fv1);
      this.crashGfx.fillStyle(0xff5500, 0.9);
      this.crashGfx.fillEllipse(efx + 2, efy - 6, 38 * fv2, 46 * fv2);
      this.crashGfx.fillStyle(0xffaa00, 1);
      this.crashGfx.fillEllipse(efx + 2, efy - 11, 24 * fv1, 30 * fv1);
      this.crashGfx.fillStyle(0xffffff, 0.85);
      this.crashGfx.fillEllipse(efx + 2, efy - 15, 10, 13);

      // Ground crash marks / debris cloud.
      this.crashGfx.fillStyle(0x443322, 0.35);
      this.crashGfx.fillEllipse(cx + 65, GY + 12, 200, 22);
      this.crashGfx.lineStyle(2, 0x443322, 0.55);
      for (let d = 0; d < 4; d++) {
        this.crashGfx.lineBetween(cx + 32 + d * 44, GY + 4, cx + 50 + d * 44, GY + 14);
      }
    };

    drawScene();
    this.time.addEvent({ delay: 60, loop: true, callback: drawScene });

    this.time.delayedCall(5000, () => {
      missionState.startMission({ theme: 'coldfront', difficulty: missionState.difficulty, seed: Date.now() });
      this.scene.start('MapScene', { launchIndex: 0 });
    });
  }

  private spawnExplosion(worldX: number, screenY: number, size: number): void {
    this.explosions.push({ worldX, screenY, t: 0, size });
    playExplosion(size);
  }

  private renderExplosions(): void {
    this.explosionGfx.clear();
    for (const ex of this.explosions) {
      if (ex.t >= 1) continue;
      const sx    = ex.worldX - this.cameraX;
      const sy    = ex.screenY;
      const eased = 1 - (1 - ex.t) * (1 - ex.t); // ease-out
      const radius = ex.size * eased;
      const alpha  = 1 - eased;

      // White flash core.
      this.explosionGfx.fillStyle(0xffffff, alpha * 0.9);
      this.explosionGfx.fillCircle(sx, sy, radius * 0.35);

      // Outer orange ring.
      this.explosionGfx.lineStyle(3, 0xff6600, alpha);
      this.explosionGfx.strokeCircle(sx, sy, radius);

      // Inner yellow ring (fades faster).
      if (ex.t < 0.6) {
        const innerAlpha = alpha * (1 - ex.t / 0.6);
        this.explosionGfx.lineStyle(2, 0xffcc44, innerAlpha);
        this.explosionGfx.strokeCircle(sx, sy, radius * 0.55);
      }

      // 6 debris dots orbiting outward.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const dr  = radius * 1.1;
        this.explosionGfx.fillStyle(0xffcc44, alpha * 0.8);
        this.explosionGfx.fillCircle(sx + Math.cos(ang) * dr, sy + Math.sin(ang) * dr, 3);
      }
    }
  }

  private renderPreRun(time: number): void {
    this.preRunGfx.clear();
    // Dark overlay.
    this.preRunGfx.fillStyle(0x000000, 0.78);
    this.preRunGfx.fillRect(0, 0, W, H);
    // Countdown bar.
    const prog  = Math.min(this.preRunTimer / 4.0, 1);
    const BAR_W = 320; const BAR_H = 8;
    const bx = W / 2 - BAR_W / 2;
    const by = H / 2 + 100;
    this.preRunGfx.fillStyle(0x223344, 1);
    this.preRunGfx.fillRect(bx, by, BAR_W, BAR_H);
    this.preRunGfx.fillStyle(0x44aaff, 1);
    this.preRunGfx.fillRect(bx, by, BAR_W * prog, BAR_H);
    // Flashing prompt.
    if (Math.sin(time * 0.006) > 0) {
      this.preRunPromptText.setAlpha(1);
    } else {
      this.preRunPromptText.setAlpha(0.4);
    }
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
