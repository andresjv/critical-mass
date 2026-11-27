// Stage 4 — Silo Strike.
// Pseudo-3D view toward 5 silos; player flies a reticle to line up shots.
// Side silo hit: +2000 pts, +1 plane. Central silo hit: ends stage, stops launch.
// All 5 silos hit in one run: +5000 bonus.

import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { PauseController } from '../PauseController';
import { TouchControls } from '../../input/TouchControls';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { SILO, TUNING, SCORE } from '../../state/tuning';
import { createRng } from '../../state/rng';
import { hasSeenHowToPlay, markSeenHowToPlay } from '../../state/howToPlay';
import { showStageIntro } from '../../state/stageIntros';
import {
  project,
  drawGround,
  drawSky,
  HORIZON_Y,
  SILO_Z,
  SILO_X,
  SILO_WINDOW_Y,
  SILO_WORLD_H,
  SILO_WORLD_HW,
  CANVAS_W,
  CANVAS_H,
} from '../pseudo3d';

const W = CANVAS_W;
const H = CANVAS_H;
const FIXED_DT = 1 / 60;

// Number of silos
const SILO_COUNT = 5;
const CENTRAL_IDX = 2;

// Rocket visual
const ROCKET_H = 24;
const ROCKET_W = 8;

// Silo-gun bullet visual
const BULLET_R = 6;

// Interceptor visual
const INTERC_W = 55;
const INTERC_H = 22;

interface SceneData {
  launchIndex: number;
}

interface SiloState {
  alive: boolean;
  gunTimer: number;     // seconds until next shot
  activeBullet: { sx: number; sy: number; vx: number; vy: number } | null;
}

interface Rocket {
  startX: number;  // screen X at launch
  startY: number;  // screen Y at launch
  targetX: number; // screen X of silo window
  targetY: number; // screen Y of silo window
  t: number;       // 0→1 travel progress
  siloIdx: number;
  alive: boolean;
}

interface Interceptor {
  x: number;
  y: number;
  vx: number;
  alive: boolean;
}

export class SiloScene extends Phaser.Scene {
  private launchIndex = 0;

  // Contextual hint timer.
  private hintTimer = 0;

  // ── World state ──────────────────────────────────────────────────────────
  private playerWorldX = 0;      // world X of reticle (±SILO.worldXRange)
  private playerWorldY = 200;    // world altitude of reticle (worldYMin..worldYMax)
  private silos: SiloState[] = [];
  private silosDestroyedCount = 0;
  private rockets: Rocket[] = [];
  private interceptors: Interceptor[] = [];
  private interceptorTimer = 0;
  private stageDone = false;
  private stageDoneTimer = 0;    // brief delay before transitioning

  // ── Input ─────────────────────────────────────────────────────────────────
  private prevFire = false;
  private accumulator = 0;
  private frameTime = 0;

  // ── Visuals ───────────────────────────────────────────────────────────────
  private bgGfx!:        Phaser.GameObjects.Graphics;
  private siloGfx!:      Phaser.GameObjects.Graphics;
  private effectGfx!:    Phaser.GameObjects.Graphics;
  private touchControls!: TouchControls;
  private pauseCtl!: PauseController;
  private visibilityHandler!: () => void;

  constructor() { super({ key: 'SiloScene' }); }

  init(data: Partial<SceneData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.playerWorldX = 0;
    this.playerWorldY = 200;
    this.stageDone = false;
    this.stageDoneTimer = 0;
    this.rockets = [];
    this.interceptors = [];
    this.interceptorTimer = SILO.interceptorInterval;
    this.prevFire = false;
    this.accumulator = 0;
    this.frameTime = 0;
    this.hintTimer = 0;
  }

  create(): void {
    // ── Build silo states ──────────────────────────────────────────────────
    const rng = createRng(missionState.seed + this.launchIndex * 1000 + 400);
    this.silosDestroyedCount = 0;
    this.silos = Array.from({ length: SILO_COUNT }, () => ({
      alive: true,
      gunTimer: 0.5 + rng.next() * 2,  // staggered initial fire
      activeBullet: null,
    }));

    // ── Graphics layers ───────────────────────────────────────────────────
    this.bgGfx     = this.add.graphics();
    this.siloGfx   = this.add.graphics();
    this.effectGfx = this.add.graphics();

    // ── Touch controls ────────────────────────────────────────────────────
    this.touchControls = new TouchControls(this, { move: 'MOVE', fire: 'FIRE', action: 'FIRE' });
    this.pauseCtl = new PauseController(this);

    // ── HUD setup ─────────────────────────────────────────────────────────
    gameUi.mapActive = false;
    gameUi.silosDestroyed = 0;
    gameUi.centralSiloDown = false;
    missionState.hudCue = 'ALIGN RETICLE — FIRE [ACTION]';

    // Progress breadcrumb.
    gameUi.progressStep   = 'silos';
    gameUi.launchNumber   = this.launchIndex + 1;
    gameUi.objective      = 'Destroy the central silo';
    gameUi.contextualHint = null;

    // Stage intro card (first visit this session).
    showStageIntro('silos');

    // ── How-to-play ───────────────────────────────────────────────────────
    if (!hasSeenHowToPlay('silo_strike')) {
      markSeenHowToPlay('silo_strike');
      gameUi.howToPlayStage = 'silo_strike';
    }

    // ── Visibility pause ─────────────────────────────────────────────────
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once('shutdown', this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    this.touchControls.update();
    if (this.pauseCtl.update(InputRouter.read().pause)) return;
    this.frameTime = delta * 0.001;
    this.accumulator += this.frameTime;

    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.draw();

    // Debug
    debugInfo.fps = Math.round(1 / (this.frameTime || 0.016));
  }

  // ── Fixed-step simulation ────────────────────────────────────────────────

  private step(dt: number): void {
    if (this.stageDone) {
      this.stageDoneTimer -= dt;
      if (this.stageDoneTimer <= 0) {
        this.endStage();
      }
      return;
    }

    const inp = InputRouter.read();

    // ── Move reticle ───────────────────────────────────────────────────────
    this.playerWorldX = Phaser.Math.Clamp(
      this.playerWorldX + inp.moveX * SILO.worldXSpeed * dt,
      -SILO.worldXRange,
      SILO.worldXRange,
    );
    this.playerWorldY = Phaser.Math.Clamp(
      this.playerWorldY - inp.moveY * SILO.worldYSpeed * dt,  // moveY -1 = up
      SILO.worldYMin,
      SILO.worldYMax,
    );

    // Contextual hint after 5s without movement.
    const hasMovement = Math.abs(inp.moveX) > 0.05 || Math.abs(inp.moveY) > 0.05;
    if (hasMovement) {
      this.hintTimer = 0;
      gameUi.contextualHint = null;
    } else {
      this.hintTimer += dt;
      if (this.hintTimer >= 5) {
        gameUi.contextualHint = 'Move reticle to a silo window';
      }
    }

    // ── Fire rocket ────────────────────────────────────────────────────────
    const fireNow = inp.fire || inp.action;
    if (fireNow && !this.prevFire) {
      this.tryFireRocket();
    }
    this.prevFire = fireNow;

    // ── Tick rockets ──────────────────────────────────────────────────────
    for (const r of this.rockets) {
      if (!r.alive) continue;
      r.t += dt / SILO.rocketTravelTime;
      if (r.t >= 1) {
        r.t = 1;
        r.alive = false;
        this.hitSilo(r.siloIdx);
      }
    }

    // ── Silo guns ─────────────────────────────────────────────────────────
    const fireRate = TUNING[missionState.difficulty].enemyFireRate;
    for (let i = 0; i < SILO_COUNT; i++) {
      const s = this.silos[i];
      if (!s.alive) continue;

      // Update existing bullet
      if (s.activeBullet) {
        s.activeBullet.sx += s.activeBullet.vx * dt;
        s.activeBullet.sy += s.activeBullet.vy * dt;
        // Check if it hit the player reticle
        const rp = project(this.playerWorldX, this.playerWorldY, SILO_Z);
        const dx = s.activeBullet.sx - rp.sx;
        const dy = s.activeBullet.sy - rp.sy;
        if (Math.hypot(dx, dy) < 20) {
          this.crashPlane();
          s.activeBullet = null;
          continue;
        }
        // Bullet off-screen
        if (s.activeBullet.sx < 0 || s.activeBullet.sx > W ||
            s.activeBullet.sy < 0 || s.activeBullet.sy > H) {
          s.activeBullet = null;
        }
      }

      // Fire timer
      s.gunTimer -= dt * fireRate;
      if (s.gunTimer <= 0 && !s.activeBullet) {
        s.gunTimer = SILO.siloGunInterval / fireRate;
        // Fire toward current player reticle position
        const wp = this.siloWindowScreen(i);
        const rp = project(this.playerWorldX, this.playerWorldY, SILO_Z);
        const dist = Math.hypot(rp.sx - wp.sx, rp.sy - wp.sy);
        if (dist > 1) {
          const speed = W / SILO.siloGunBulletTime;  // pixel travel speed
          s.activeBullet = {
            sx: wp.sx,
            sy: wp.sy,
            vx: ((rp.sx - wp.sx) / dist) * speed,
            vy: ((rp.sy - wp.sy) / dist) * speed,
          };
        }
      }
    }

    // ── Interceptors ──────────────────────────────────────────────────────
    this.interceptorTimer -= dt;
    if (this.interceptorTimer <= 0) {
      this.interceptorTimer = SILO.interceptorInterval;
      const fromLeft = Math.random() < 0.5;
      this.interceptors.push({
        x: fromLeft ? -INTERC_W : W + INTERC_W,
        y: HORIZON_Y + 50 + Math.random() * (H - HORIZON_Y - 100),
        vx: fromLeft ? SILO.interceptorSpeed : -SILO.interceptorSpeed,
        alive: true,
      });
    }
    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      ic.x += ic.vx * dt;
      if (ic.x < -INTERC_W * 2 || ic.x > W + INTERC_W * 2) {
        ic.alive = false;
        continue;
      }
      // Check collision with player reticle (screen-space: reticle is always at projected position)
      const rp = project(this.playerWorldX, this.playerWorldY, SILO_Z);
      const dx = ic.x - rp.sx;
      const dy = ic.y - rp.sy;
      if (Math.abs(dx) < INTERC_W / 2 + 20 && Math.abs(dy) < INTERC_H / 2 + 20) {
        this.crashPlane();
        ic.alive = false;
      }
    }
  }

  private tryFireRocket(): void {
    // Only 1 rocket in flight at a time
    if (this.rockets.some(r => r.alive)) return;

    // Find nearest silo we're close enough to target
    const rp = project(this.playerWorldX, this.playerWorldY, SILO_Z);
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < SILO_COUNT; i++) {
      if (!this.silos[i].alive) continue;
      const wp = this.siloWindowScreen(i);
      const dist = Math.hypot(rp.sx - wp.sx, rp.sy - wp.sy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return;

    const locked = bestDist <= SILO.lockRadius;
    const wp = this.siloWindowScreen(bestIdx);

    // Always fire (locked or not); if locked, guaranteed hit
    this.rockets.push({
      startX: W / 2,
      startY: H - 60,
      targetX: locked ? wp.sx : wp.sx + (Math.random() - 0.5) * 60,
      targetY: locked ? wp.sy : wp.sy + (Math.random() - 0.5) * 60,
      t: 0,
      siloIdx: bestIdx,
      alive: true,
    });
  }

  private hitSilo(idx: number): void {
    const s = this.silos[idx];
    if (!s.alive) return;
    s.alive = false;

    if (idx === CENTRAL_IDX) {
      missionState.addScore(SCORE.centralSilo);
      gameUi.centralSiloDown = true;
      missionState.siteDestroyed();
      // Check all-silos bonus
      const allDown = this.silosDestroyedCount + 1 >= SILO_COUNT;
      if (allDown) {
        missionState.addScore(SCORE.allSilosBonus);
        gameUi.callout       = 'ALL SILOS DOWN  +5000';
        gameUi.calloutExpiry = Date.now() + 1500;
      } else {
        gameUi.callout       = 'LAUNCH STOPPED';
        gameUi.calloutExpiry = Date.now() + 1500;
      }
      this.silosDestroyedCount++;
      gameUi.silosDestroyed = this.silosDestroyedCount;
      this.startStageDone();
    } else {
      this.silosDestroyedCount++;
      gameUi.silosDestroyed = this.silosDestroyedCount;
      missionState.addScore(SCORE.sideSilo);
      missionState.addPlane();
      gameUi.callout       = '+1 PLANE';
      gameUi.calloutExpiry = Date.now() + 1500;
      // Check all-silos bonus (only if all 5 destroyed, central included as last)
      if (this.silosDestroyedCount >= SILO_COUNT) {
        missionState.addScore(SCORE.allSilosBonus);
        this.startStageDone();
      }
    }
  }

  private startStageDone(): void {
    this.stageDone = true;
    this.stageDoneTimer = 2.0;  // show result briefly before transitioning
    missionState.hudCue = '';
    gameUi.contextualHint = null;

    // Stage result card — central silo destroyed.
    const moreSites = this.launchIndex < 3; // 0-indexed, 4 total sites
    gameUi.stageResult = {
      headline: 'LAUNCH STOPPED',
      details: ['Central silo destroyed'],
      next: moreSites ? 'Next launch site' : 'Vostgrad Assault',
    };
  }

  private crashPlane(): void {
    missionState.losePlane();
    if (missionState.planes > 0) {
      this.scene.restart({ launchIndex: this.launchIndex });
    } else {
      this.scene.start('GameOverScene');
    }
  }

  private endStage(): void {
    // Add clock bonus
    if (missionState.impactClock > 0) {
      missionState.addScore(Math.floor(missionState.impactClock) * SCORE.impactClockSecond);
    }

    // If central silo is NOT down, the launch succeeds → lose a city
    const centralDown = gameUi.centralSiloDown;
    if (!centralDown) {
      const CITIES = ['Harlan Bay', 'Port Cressa', 'New Allis', 'Veldor'];
      const cityName = CITIES[this.launchIndex % CITIES.length] ?? 'City';
      missionState.cityLost();
      // Show "launch succeeded" result card briefly.
      gameUi.stageResult = {
        headline: 'LAUNCH SUCCEEDED',
        details: [`City hit — one city lost`],
        next: 'Next launch site',
      };
      gameUi.callout       = `CITY LOST: ${cityName}`;
      gameUi.calloutExpiry = Date.now() + 1500;
    }

    gameUi.silosDestroyed  = 0;
    gameUi.centralSiloDown = false;

    if (missionState.isGameOver) {
      gameUi.stageResult = null;
      this.scene.start('GameOverScene');
      return;
    }

    // Delay transition slightly so the result card is visible.
    this.time.delayedCall(centralDown ? 0 : 2000, () => {
      gameUi.stageResult = null;
      this.scene.start('PlaceholderAssaultScene', { launchIndex: this.launchIndex });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Screen position of silo i's window (the aim point). */
  private siloWindowScreen(i: number): { sx: number; sy: number } {
    return project(SILO_X[i], SILO_WINDOW_Y[i], SILO_Z);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  private draw(): void {
    this.bgGfx.clear();
    this.siloGfx.clear();
    this.effectGfx.clear();

    // ── Background ──────────────────────────────────────────────────────────
    drawSky(this.bgGfx);
    drawGround(this.bgGfx);

    // ── Silos ───────────────────────────────────────────────────────────────
    for (let i = 0; i < SILO_COUNT; i++) {
      this.drawSilo(i);
    }

    // ── Interceptors ────────────────────────────────────────────────────────
    for (const ic of this.interceptors) {
      if (!ic.alive) continue;
      const dir = ic.vx > 0 ? 1 : -1;
      this.siloGfx.fillStyle(0xcc4422, 1);
      this.siloGfx.fillRect(
        ic.x - INTERC_W / 2,
        ic.y - INTERC_H / 2,
        INTERC_W, INTERC_H,
      );
      // Cockpit
      this.siloGfx.fillStyle(0xffee88, 1);
      this.siloGfx.fillRect(
        ic.x + dir * 8 - 8,
        ic.y - INTERC_H / 2 + 4,
        16, INTERC_H - 8,
      );
    }

    // ── Silo-gun bullets ────────────────────────────────────────────────────
    for (const s of this.silos) {
      if (!s.activeBullet) continue;
      this.effectGfx.fillStyle(0xffcc00, 1);
      this.effectGfx.fillCircle(s.activeBullet.sx, s.activeBullet.sy, BULLET_R);
    }

    // ── In-flight rockets ────────────────────────────────────────────────────
    for (const r of this.rockets) {
      if (!r.alive) continue;
      const rx = Phaser.Math.Linear(r.startX, r.targetX, r.t);
      const ry = Phaser.Math.Linear(r.startY, r.targetY, r.t);
      // Simple arc (parabolic screen path)
      const arc = -Math.sin(r.t * Math.PI) * 80;
      const drawY = ry + arc;
      this.effectGfx.fillStyle(0xffffff, 1);
      this.effectGfx.fillRect(rx - ROCKET_W / 2, drawY - ROCKET_H / 2, ROCKET_W, ROCKET_H);
      // Flame
      this.effectGfx.fillStyle(0xff6600, 1);
      this.effectGfx.fillRect(rx - ROCKET_W / 2 - 10, drawY - 4, 10, 8);
    }

    // ── Player reticle ──────────────────────────────────────────────────────
    this.drawReticle();
  }

  private drawSilo(i: number): void {
    const s = this.silos[i];

    // Project four corners of the silo face
    const bottom = project(SILO_X[i], 0,            SILO_Z);
    const top    = project(SILO_X[i], SILO_WORLD_H, SILO_Z);
    const tl     = project(SILO_X[i] - SILO_WORLD_HW, SILO_WORLD_H, SILO_Z);
    const tr     = project(SILO_X[i] + SILO_WORLD_HW, SILO_WORLD_H, SILO_Z);
    const bl     = project(SILO_X[i] - SILO_WORLD_HW, 0,            SILO_Z);
    const br     = project(SILO_X[i] + SILO_WORLD_HW, 0,            SILO_Z);

    if (!s.alive) {
      // Destroyed: draw rubble
      this.siloGfx.fillStyle(0x443322, 1);
      this.siloGfx.fillRect(bl.sx, bl.sy, br.sx - bl.sx, 10);
      return;
    }

    const bodyColor = i === CENTRAL_IDX ? 0x445566 : 0x334455;
    const doorColor = i === CENTRAL_IDX ? 0x336688 : 0x2a3a4a;

    // Silo body (trapezoid)
    this.siloGfx.fillStyle(bodyColor, 1);
    this.siloGfx.beginPath();
    this.siloGfx.moveTo(bl.sx, bl.sy);
    this.siloGfx.lineTo(br.sx, br.sy);
    this.siloGfx.lineTo(tr.sx, tr.sy);
    this.siloGfx.lineTo(tl.sx, tl.sy);
    this.siloGfx.closePath();
    this.siloGfx.fillPath();

    // Silo door (darker rectangle on face)
    const doorW = (tr.sx - tl.sx) * 0.5;
    const doorH = (bl.sy - tl.sy) * 0.6;
    const doorX = (tl.sx + tr.sx) / 2 - doorW / 2;
    const doorY = (tl.sy + bl.sy) / 2 - doorH / 2;
    this.siloGfx.fillStyle(doorColor, 1);
    this.siloGfx.fillRect(doorX, doorY, doorW, doorH);

    // Window / aim point (small glowing circle)
    const wp = this.siloWindowScreen(i);
    this.siloGfx.fillStyle(0x88ffcc, 0.9);
    this.siloGfx.fillCircle(wp.sx, wp.sy, top.scale * 20);

    // Edge highlight
    this.siloGfx.lineStyle(1, 0x667788, 0.7);
    this.siloGfx.beginPath();
    this.siloGfx.moveTo(bl.sx, bl.sy);
    this.siloGfx.lineTo(tl.sx, tl.sy);
    this.siloGfx.lineTo(tr.sx, tr.sy);
    this.siloGfx.lineTo(br.sx, br.sy);
    this.siloGfx.closePath();
    this.siloGfx.strokePath();

    // ── Unused var suppression ───────────────────────────────────────────
    void bottom;
    void top;
  }

  private drawReticle(): void {
    const rp = project(this.playerWorldX, this.playerWorldY, SILO_Z);

    // Check if near a silo window (locked)
    let locked = false;
    for (let i = 0; i < SILO_COUNT; i++) {
      if (!this.silos[i].alive) continue;
      const wp = this.siloWindowScreen(i);
      if (Math.hypot(rp.sx - wp.sx, rp.sy - wp.sy) <= SILO.lockRadius) {
        locked = true;
        break;
      }
    }

    const color = locked ? 0x22ff88 : 0xffffff;
    const alpha = 0.9;
    const r = 20;

    this.effectGfx.lineStyle(2, color, alpha);

    if (locked) {
      // Diamond shape when locked
      this.effectGfx.beginPath();
      this.effectGfx.moveTo(rp.sx,     rp.sy - r);
      this.effectGfx.lineTo(rp.sx + r, rp.sy    );
      this.effectGfx.lineTo(rp.sx,     rp.sy + r);
      this.effectGfx.lineTo(rp.sx - r, rp.sy    );
      this.effectGfx.closePath();
      this.effectGfx.strokePath();
    } else {
      // Circle reticle
      this.effectGfx.strokeCircle(rp.sx, rp.sy, r);
      // Crosshair ticks
      const tick = 8;
      this.effectGfx.lineBetween(rp.sx - r - tick, rp.sy, rp.sx - r, rp.sy);
      this.effectGfx.lineBetween(rp.sx + r,        rp.sy, rp.sx + r + tick, rp.sy);
      this.effectGfx.lineBetween(rp.sx, rp.sy - r - tick, rp.sx, rp.sy - r);
      this.effectGfx.lineBetween(rp.sx, rp.sy + r,        rp.sx, rp.sy + r + tick);
    }

    // Dot at centre
    this.effectGfx.fillStyle(color, alpha);
    this.effectGfx.fillCircle(rp.sx, rp.sy, 3);
  }

  shutdown(): void {
    gameUi.contextualHint = null;
    gameUi.stageResult    = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }

  destroy(): void {
    this.shutdown();
  }
}
