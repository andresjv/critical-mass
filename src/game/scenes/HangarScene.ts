import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { HANGAR } from '../../state/tuning';
import { showStageIntro } from '../../state/stageIntros';

const W = 1280;
const H = 720;
const FIXED_DT = 1 / 60;

// Door geometry — full canvas width, doors split at centre.
const DOOR_Y = 0;
const DOOR_H = 47;         // 14 × WORLD_SCALE
const DOOR_HALF_W = W / 2; // 640 px each half

// Plane hitbox half-extents (px).
const PLANE_HIT_W = 33;    // 10 × WORLD_SCALE
const PLANE_HIT_H = 23;    // 7 × WORLD_SCALE

// Door open/close animation duration (seconds).
const DOOR_ANIM_TIME = 0.25;

// Wall margins (px) — 10 × WORLD_SCALE.
const WALL_MARGIN = 33;

// Fighter-jet polygon points (pointing right, local origin at centre).
// Built for approx 80 × 76 bounding box.
const PLANE_POLY: [number, number][] = [
  [38,   0],
  [20,  -8],
  [ 0, -10],
  [-8,  -38],
  [-18, -10],
  [-30, -16],
  [-30,  -6],
  [-36,   0],
  [-30,   6],
  [-30,  16],
  [-18,  10],
  [-8,   38],
  [  0,  10],
  [ 20,   8],
];

type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'cooldown';
type PlaneState = 'flying' | 'exited' | 'crashed' | 'gameover';

interface HangarData {
  launchIndex: number;
}

export class HangarScene extends Phaser.Scene {
  // ── Persistent across restarts ───────────────────────────────────────────
  private launchIndex = 0;

  // Contextual hint timer (seconds of no relevant input).
  private hintTimer = 0;

  // ── Physics state ────────────────────────────────────────────────────────
  private px = W / 2;
  private py = H - 107;  // ≈ H-32 scaled
  private vx = 0;
  private vy = 0;
  /** Phaser angle: 0 = pointing right, -90 = pointing up. */
  private shipAngle = -90;
  private thrusting = false;

  // ── Door state ───────────────────────────────────────────────────────────
  private doorState: DoorState = 'closed';
  private doorOpenTimer = 0;
  private doorCooldown  = 0;
  private doorOpenAmt   = 0; // 0 = fully closed, 1 = fully open

  // ── Plane state ──────────────────────────────────────────────────────────
  private planeState: PlaneState = 'flying';
  private spareWindowTimer = 0;
  private sparesLaunched   = 0;

  // ── Fixed-step accumulator ───────────────────────────────────────────────
  private accumulator = 0;

  // ── Input edge-detection ─────────────────────────────────────────────────
  private prevAction = false;
  private prevFire   = false;

  // ── Game objects ─────────────────────────────────────────────────────────
  private planeContainer!: Phaser.GameObjects.Container;
  private planeGfx!:        Phaser.GameObjects.Graphics;
  private flameGfx!:        Phaser.GameObjects.Graphics;
  private leftDoor!:        Phaser.GameObjects.Rectangle;
  private rightDoor!:       Phaser.GameObjects.Rectangle;
  private doorGfx!:         Phaser.GameObjects.Graphics; // door trim + lights
  private touchControls!:   TouchControls;

  private visibilityHandler!: () => void;

  constructor() {
    super({ key: 'HangarScene' });
  }

  init(data: Partial<HangarData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.resetPhysics();
  }

  private resetPhysics(): void {
    this.px = W / 2;
    this.py = H - 107;
    this.vx = 0;
    this.vy = 0;
    this.shipAngle = -90;
    this.thrusting  = false;
    this.doorState  = 'closed';
    this.doorOpenTimer = 0;
    this.doorCooldown  = 0;
    this.doorOpenAmt   = 0;
    this.planeState    = 'flying';
    this.spareWindowTimer = 0;
    this.sparesLaunched   = 0;
    this.accumulator = 0;
    this.prevAction  = false;
    this.prevFire    = false;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive = false;

    // Progress breadcrumb.
    gameUi.progressStep   = 'hangar';
    gameUi.launchNumber   = this.launchIndex + 1;
    gameUi.objective      = 'Fly through the bay doors';
    gameUi.contextualHint = null;

    // Stage intro card (first visit this session).
    showStageIntro('hangar');

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x040410);

    // Station walls.
    this.add.rectangle(WALL_MARGIN / 2,         H / 2, WALL_MARGIN,     H, 0x1a2235);
    this.add.rectangle(W - WALL_MARGIN / 2,     H / 2, WALL_MARGIN,     H, 0x1a2235);
    this.add.rectangle(W / 2,     H - WALL_MARGIN / 2, W,     WALL_MARGIN, 0x1a2235);

    // Hangar floor glow lines.
    const floorGfx = this.add.graphics();
    floorGfx.lineStyle(2, 0x2244aa, 0.4);
    for (let i = 0; i < 8; i++) {
      const x = WALL_MARGIN + (W - WALL_MARGIN * 2) * i / 7;
      floorGfx.lineBetween(x, H - WALL_MARGIN - 60, x, H - WALL_MARGIN);
    }

    // Docking ring where plane starts.
    const ringGfx = this.add.graphics();
    ringGfx.lineStyle(2, 0x2244aa, 0.6);
    ringGfx.strokeCircle(W / 2, H - 107, 60);
    ringGfx.lineStyle(1, 0x2244aa, 0.3);
    ringGfx.strokeCircle(W / 2, H - 107, 90);

    // ── Bay doors ───────────────────────────────────────────────────────────
    this.leftDoor = this.add.rectangle(
      DOOR_HALF_W / 2, DOOR_Y + DOOR_H / 2,
      DOOR_HALF_W, DOOR_H,
      0x2a3a4a,
    ).setDepth(2);

    this.rightDoor = this.add.rectangle(
      W - DOOR_HALF_W / 2, DOOR_Y + DOOR_H / 2,
      DOOR_HALF_W, DOOR_H,
      0x2a3a4a,
    ).setDepth(2);

    // Door trim & status lights drawn on a persistent Graphics layer.
    this.doorGfx = this.add.graphics().setDepth(3);

    // ── Plane container ──────────────────────────────────────────────────────
    this.planeContainer = this.add.container(this.px, this.py).setDepth(4);

    this.flameGfx = this.add.graphics();
    this.planeContainer.add(this.flameGfx);

    this.planeGfx = this.add.graphics();
    this.planeContainer.add(this.planeGfx);

    this.drawPlane(0x44aaff, false);

    // ── Touch controls ───────────────────────────────────────────────────────
    this.touchControls = new TouchControls(this, { move: 'FLY', fire: 'SKIP', action: 'OPEN / LAUNCH' });

    // ── Pause on visibility ──────────────────────────────────────────────────
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.updateHudCue();
  }

  update(time: number, delta: number): void {
    this.touchControls.update();

    const input = InputRouter.read();
    const actionJustPressed = input.action && !this.prevAction;
    const fireJustPressed   = input.fire   && !this.prevFire;
    this.prevAction = input.action;
    this.prevFire   = input.fire;

    // Fixed-step physics loop.
    this.accumulator += delta * 0.001;
    while (this.accumulator >= FIXED_DT) {
      this.fixedStep(FIXED_DT, input.moveX, input.moveY, actionJustPressed, fireJustPressed);
      this.accumulator -= FIXED_DT;
    }

    this.syncVisuals(time);
    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  // ── Fixed-step physics ───────────────────────────────────────────────────

  private fixedStep(
    dt: number,
    moveX: number, moveY: number,
    actionJustPressed: boolean,
    fireJustPressed: boolean,
  ): void {
    switch (this.planeState) {
      case 'flying':
        this.stepFlying(dt, moveX, moveY, actionJustPressed);
        this.stepDoor(dt, actionJustPressed);
        this.stepImpactClock(dt);
        break;

      case 'exited':
        this.stepSpareWindow(dt, actionJustPressed, fireJustPressed);
        this.stepImpactClock(dt);
        break;

      case 'crashed':
        // Crash animation runs via tween.
        break;

      case 'gameover':
        break;
    }
  }

  private stepFlying(dt: number, moveX: number, moveY: number, _action: boolean): void {
    this.shipAngle += moveX * HANGAR.rotateSpeed * dt;

    this.thrusting = moveY < -0.1;
    if (this.thrusting) {
      const rad = Phaser.Math.DegToRad(this.shipAngle);
      this.vx += Math.cos(rad) * HANGAR.thrustAccel * dt;
      this.vy += Math.sin(rad) * HANGAR.thrustAccel * dt;
    }

    // Contextual hints.
    const hasThrust = this.thrusting || Math.abs(moveX) > 0.1;
    if (hasThrust) {
      this.hintTimer = 0;
      gameUi.contextualHint = null;
    } else {
      this.hintTimer += dt;
      if (this.hintTimer >= 5) {
        // Different hint depending on door state.
        if (this.doorState === 'open') {
          gameUi.contextualHint = 'Doors open — fly up through them!';
        } else {
          gameUi.contextualHint = 'Hold ↑ to thrust forward';
        }
      }
    }

    const dragFactor = 1 - HANGAR.drag * dt;
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > HANGAR.maxSpeed) {
      this.vx = (this.vx / speed) * HANGAR.maxSpeed;
      this.vy = (this.vy / speed) * HANGAR.maxSpeed;
    }

    this.px += this.vx * dt;
    this.py += this.vy * dt;

    this.checkWallCollisions();
    this.checkDoorCollision();

    if (this.py + PLANE_HIT_H < 0) {
      this.onPlaneExited();
      return;
    }

    debugInfo.speed = Math.round(speed);
    debugInfo.angle = Math.round(this.shipAngle);
  }

  private stepDoor(dt: number, actionJustPressed: boolean): void {
    switch (this.doorState) {
      case 'closed':
        if (actionJustPressed) this.doorState = 'opening';
        break;

      case 'opening':
        this.doorOpenAmt = Math.min(1, this.doorOpenAmt + dt / DOOR_ANIM_TIME);
        if (this.doorOpenAmt >= 1) {
          this.doorState  = 'open';
          this.doorOpenTimer = HANGAR.doorOpenDuration;
        }
        break;

      case 'open':
        this.doorOpenTimer -= dt;
        if (this.doorOpenTimer <= 0) {
          if (this.py - PLANE_HIT_H < DOOR_H + 33) {
            this.crashPlane('DOOR CLOSED ON PLANE');
          } else {
            this.doorState = 'closing';
          }
        }
        break;

      case 'closing':
        this.doorOpenAmt = Math.max(0, this.doorOpenAmt - dt / DOOR_ANIM_TIME);
        if (this.doorOpenAmt <= 0) {
          this.doorState  = 'cooldown';
          this.doorCooldown = HANGAR.doorCooldown;
        }
        break;

      case 'cooldown':
        this.doorCooldown -= dt;
        if (this.doorCooldown <= 0) this.doorState = 'closed';
        break;
    }

    // Write debug info.
    switch (this.doorState) {
      case 'closed':
        debugInfo.doorState = 'CLOSED';
        debugInfo.doorTimer = 0;
        break;
      case 'opening':
        debugInfo.doorState = 'OPENING';
        debugInfo.doorTimer = 0;
        break;
      case 'open':
        debugInfo.doorState = 'OPEN';
        debugInfo.doorTimer = this.doorOpenTimer;
        break;
      case 'closing':
        debugInfo.doorState = 'CLOSING';
        debugInfo.doorTimer = 0;
        break;
      case 'cooldown':
        debugInfo.doorState = 'COOLDOWN';
        debugInfo.doorTimer = this.doorCooldown;
        break;
    }

    this.updateHudCue();
  }

  private updateHudCue(): void {
    const key = gameUi.device === 'touch' ? '[◉]'
              : gameUi.device === 'gamepad' ? '[B]'
              : '[ACTION]';

    switch (this.doorState) {
      case 'closed':
        missionState.hudCue = `${key} OPEN DOORS`;
        break;
      case 'opening':
        missionState.hudCue = 'DOORS OPENING…';
        break;
      case 'open':
        missionState.hudCue = `DOORS OPEN ${this.doorOpenTimer.toFixed(1)}s — FLY THROUGH!`;
        break;
      case 'closing':
        missionState.hudCue = 'DOORS CLOSING';
        break;
      case 'cooldown':
        missionState.hudCue = `COOLDOWN ${this.doorCooldown.toFixed(1)}s`;
        break;
    }
  }

  private stepImpactClock(dt: number): void {
    if (missionState.tickImpactClock(dt)) this.onImpactExpired();
  }

  private stepSpareWindow(dt: number, actionJustPressed: boolean, fireJustPressed: boolean): void {
    this.spareWindowTimer -= dt;
    const remaining = Math.ceil(Math.max(0, this.spareWindowTimer));
    const key = gameUi.device === 'touch' ? '[◉]'
              : gameUi.device === 'gamepad' ? '[B]'
              : '[ACTION]';
    missionState.hudCue = `LAUNCH SPARE ${key} — ${remaining}s`;

    if (actionJustPressed && this.sparesLaunched < HANGAR.spareMaxInFlight) {
      this.sparesLaunched++;
      missionState.hudCue = `SPARE ${this.sparesLaunched} LAUNCHED`;
    }

    if (this.spareWindowTimer <= 0 || fireJustPressed) {
      this.transitionToAttackRun();
    }
  }

  // ── Collision ────────────────────────────────────────────────────────────

  private checkWallCollisions(): void {
    if (this.px - PLANE_HIT_W < WALL_MARGIN) {
      this.px = WALL_MARGIN + PLANE_HIT_W;
      this.wallBounce('x');
    }
    if (this.px + PLANE_HIT_W > W - WALL_MARGIN) {
      this.px = W - WALL_MARGIN - PLANE_HIT_W;
      this.wallBounce('x');
    }
    if (this.py + PLANE_HIT_H > H - WALL_MARGIN) {
      this.py = H - WALL_MARGIN - PLANE_HIT_H;
      this.wallBounce('y');
    }
  }

  private checkDoorCollision(): void {
    if (this.doorState === 'open') return;
    if (this.py - PLANE_HIT_H < DOOR_Y + DOOR_H) {
      this.py = DOOR_Y + DOOR_H + PLANE_HIT_H;
      this.wallBounce('y');
    }
  }

  private wallBounce(axis: 'x' | 'y'): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > HANGAR.bounceThreshold) {
      this.crashPlane('HIT WALL');
    } else {
      if (axis === 'x') this.vx = -this.vx * HANGAR.bounceRestitution;
      else              this.vy = -this.vy * HANGAR.bounceRestitution;
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private onPlaneExited(): void {
    this.planeState = 'exited';
    this.planeContainer.setVisible(false);
    this.spareWindowTimer = HANGAR.spareWindow;
    this.sparesLaunched   = 0;
  }

  private crashPlane(reason: string): void {
    if (this.planeState !== 'flying') return;
    this.planeState = 'crashed';
    this.vx = 0;
    this.vy = 0;
    missionState.losePlane();
    missionState.hudCue = `CRASHED: ${reason}`;

    this.tweens.add({
      targets: this.planeContainer,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        if (missionState.planes <= 0) {
          this.planeState = 'gameover';
          this.showGameOver();
        } else {
          this.scene.restart({ launchIndex: this.launchIndex });
        }
      },
    });
    this.cameras.main.shake(300, 0.008);
  }

  private onImpactExpired(): void {
    const CITIES = ['Harlan Bay', 'Port Cressa', 'New Allis', 'Veldor'];
    const cityName = CITIES[this.launchIndex % CITIES.length] ?? 'City';
    missionState.cityLost();
    missionState.hudCue = 'CITY LOST';
    gameUi.callout       = `CITY LOST: ${cityName}`;
    gameUi.calloutExpiry = Date.now() + 1500;
    this.time.delayedCall(1500, () => {
      if (missionState.isGameOver) {
        this.showGameOver();
      } else {
        this.scene.start('MapScene', { launchIndex: this.launchIndex });
      }
    });
  }

  private transitionToAttackRun(): void {
    this.scene.start('AttackRunScene', {
      launchIndex:    this.launchIndex,
      sparesLaunched: this.sparesLaunched,
    });
  }

  private showGameOver(): void {
    this.planeState = 'gameover';
    missionState.hudCue = 'GAME OVER';

    // Overlay panel (canvas side — covers whole screen, full opacity).
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(10);

    const goGfx = this.add.graphics().setDepth(11);
    // "GAME OVER" in large vector text simulation: just use Phaser text at high resolution.
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
    this.add.text(W / 2, H / 2 - 48, 'GAME OVER', {
      fontSize: '80px', color: '#ff4444',
      fontFamily: "'Space Grotesk', sans-serif",
      resolution: dpr,
    }).setOrigin(0.5).setDepth(12);
    this.add.text(W / 2, H / 2 + 36, `SCORE: ${missionState.score}`, {
      fontSize: '40px', color: '#ffffff',
      fontFamily: "'JetBrains Mono', monospace",
      resolution: dpr,
    }).setOrigin(0.5).setDepth(12);
    goGfx.destroy(); // unused, just kept to satisfy lint

    this.time.delayedCall(4000, () => {
      missionState.startMission({ theme: 'coldfront', difficulty: missionState.difficulty, seed: Date.now() });
      this.scene.start('MapScene', { launchIndex: 0 });
    });
  }

  // ── Visual sync ──────────────────────────────────────────────────────────

  private syncVisuals(time: number): void {
    // ── Plane ──────────────────────────────────────────────────────────────
    this.planeContainer.setPosition(this.px, this.py).setAngle(this.shipAngle);

    // Determine plane tint based on alignment.
    const inGap       = Math.abs(this.px - W / 2) < 67;
    const doorReady   = this.doorState === 'open' || this.doorOpenAmt > 0.5;
    const planeColor  = inGap && doorReady ? 0x44ff88 : 0x44aaff;

    this.drawPlane(planeColor, this.thrusting && this.planeState === 'flying', time);

    // ── Doors ──────────────────────────────────────────────────────────────
    const offset = this.doorOpenAmt * DOOR_HALF_W;
    this.leftDoor.setPosition(DOOR_HALF_W / 2 - offset, DOOR_Y + DOOR_H / 2);
    this.rightDoor.setPosition(W - DOOR_HALF_W / 2 + offset, DOOR_Y + DOOR_H / 2);

    // Door tint by state.
    const doorColor = this.doorState === 'open'                       ? 0x224433
                    : this.doorState === 'closing' || this.doorState === 'cooldown' ? 0x332222
                    : 0x2a3a4a;
    this.leftDoor.setFillStyle(doorColor);
    this.rightDoor.setFillStyle(doorColor);

    this.drawDoorExtras();
  }

  private drawPlane(color: number, thrusting: boolean, time = 0): void {
    // ── Flame ──────────────────────────────────────────────────────────────
    this.flameGfx.clear();
    if (thrusting) {
      const flicker   = 0.75 + 0.25 * Math.sin(time * 0.018);
      const flameLen  = 48 * flicker;

      // Outer flame (orange).
      this.flameGfx.fillStyle(0xff6600, 0.75 * flicker);
      this.flameGfx.fillTriangle(-36, -10, -36, 10, -36 - flameLen, 0);

      // Inner flame (yellow-white core).
      this.flameGfx.fillStyle(0xffee88, 0.9 * flicker);
      this.flameGfx.fillTriangle(-36, -5, -36, 5, -36 - flameLen * 0.6, 0);
    }

    // ── Plane body ─────────────────────────────────────────────────────────
    this.planeGfx.clear();

    // Body fill.
    this.planeGfx.fillStyle(color, 1);
    this.planeGfx.beginPath();
    this.planeGfx.moveTo(PLANE_POLY[0][0], PLANE_POLY[0][1]);
    for (let i = 1; i < PLANE_POLY.length; i++) {
      this.planeGfx.lineTo(PLANE_POLY[i][0], PLANE_POLY[i][1]);
    }
    this.planeGfx.closePath();
    this.planeGfx.fillPath();

    // Bright edge outline.
    this.planeGfx.lineStyle(1.5, 0xaaddff, 0.8);
    this.planeGfx.beginPath();
    this.planeGfx.moveTo(PLANE_POLY[0][0], PLANE_POLY[0][1]);
    for (let i = 1; i < PLANE_POLY.length; i++) {
      this.planeGfx.lineTo(PLANE_POLY[i][0], PLANE_POLY[i][1]);
    }
    this.planeGfx.closePath();
    this.planeGfx.strokePath();

    // Cockpit canopy highlight.
    this.planeGfx.fillStyle(0xcceeFF, 0.5);
    this.planeGfx.fillEllipse(22, 0, 14, 7);
  }

  private drawDoorExtras(): void {
    this.doorGfx.clear();

    // Edge trim lines on each door panel.
    const leftX  = this.leftDoor.x  - DOOR_HALF_W / 2;
    const rightX = this.rightDoor.x - DOOR_HALF_W / 2;

    this.doorGfx.lineStyle(1, 0x446688, 0.8);
    this.doorGfx.lineBetween(leftX,  DOOR_Y,         leftX  + DOOR_HALF_W, DOOR_Y);
    this.doorGfx.lineBetween(leftX,  DOOR_Y + DOOR_H, leftX + DOOR_HALF_W, DOOR_Y + DOOR_H);
    this.doorGfx.lineBetween(rightX, DOOR_Y,          rightX + DOOR_HALF_W, DOOR_Y);
    this.doorGfx.lineBetween(rightX, DOOR_Y + DOOR_H, rightX + DOOR_HALF_W, DOOR_Y + DOOR_H);

    // Status glow lights — one per door half, positioned at door centre.
    const lightColor = this.doorState === 'open'    ? 0x22ff88
                     : this.doorState === 'opening' ? 0xffffff
                     : this.doorState === 'cooldown'|| this.doorState === 'closing' ? 0xff4422
                     : 0xffaa22; // closed = amber standby

    const lx = this.leftDoor.x;
    const rx = this.rightDoor.x;
    const ly = DOOR_Y + DOOR_H / 2;

    // Soft glow (large low-alpha circle).
    this.doorGfx.fillStyle(lightColor, 0.18);
    this.doorGfx.fillCircle(lx, ly, 22);
    this.doorGfx.fillCircle(rx, ly, 22);

    // Bright core.
    this.doorGfx.fillStyle(lightColor, 0.9);
    this.doorGfx.fillCircle(lx, ly, 7);
    this.doorGfx.fillCircle(rx, ly, 7);

    // Door open timer indicator — a progress bar above the door.
    if (this.doorState === 'open' && this.doorOpenTimer > 0) {
      const pct    = this.doorOpenTimer / HANGAR.doorOpenDuration;
      const barW   = W * pct;
      const barH   = 4;
      this.doorGfx.fillStyle(0x22ff88, 0.6);
      this.doorGfx.fillRect((W - barW) / 2, DOOR_H + 2, barW, barH);
    }
  }

  shutdown(): void {
    gameUi.contextualHint = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }
}
