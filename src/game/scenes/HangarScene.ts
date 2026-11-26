import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { HANGAR } from '../../state/tuning';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const H = 216;
const FIXED_DT = 1 / 60;

// Door geometry — full canvas width, doors split at centre.
const DOOR_Y = 0;
const DOOR_H = 14;
const DOOR_HALF_W = W / 2; // 192 px each half.

// Plane hitbox (slightly smaller than sprite).
const PLANE_HIT_W = 10; // half-width
const PLANE_HIT_H = 7;  // half-height

// Door open/close animation duration in seconds.
const DOOR_ANIM_TIME = 0.25;

type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'cooldown';
type PlaneState = 'flying' | 'exited' | 'crashed' | 'gameover';

interface HangarData {
  launchIndex: number;
}

export class HangarScene extends Phaser.Scene {
  // ── Persistent across restarts ───────────────────────────────────────────
  private launchIndex = 0;

  // ── Physics state ────────────────────────────────────────────────────────
  private px = W / 2;
  private py = H - 32;
  private vx = 0;
  private vy = 0;
  /** Phaser angle: 0 = pointing right, -90 = pointing up. */
  private shipAngle = -90;
  private thrusting = false;

  // ── Door state ───────────────────────────────────────────────────────────
  private doorState: DoorState = 'closed';
  private doorOpenTimer = 0;   // seconds remaining in OPEN state
  private doorCooldown = 0;    // seconds remaining in COOLDOWN
  private doorOpenAmt = 0;     // 0 = fully closed, 1 = fully open (cosmetic)

  // ── Plane state ──────────────────────────────────────────────────────────
  private planeState: PlaneState = 'flying';
  private spareWindowTimer = 0;
  private sparesLaunched = 0;

  // ── Fixed-step accumulator ───────────────────────────────────────────────
  private accumulator = 0;

  // ── Input edge-detection ─────────────────────────────────────────────────
  private prevAction = false;
  private prevFire = false;

  // ── Game objects ─────────────────────────────────────────────────────────
  private planeGfx!: Phaser.GameObjects.Rectangle;
  private thrustGfx!: Phaser.GameObjects.Rectangle;
  private leftDoor!: Phaser.GameObjects.Rectangle;
  private rightDoor!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private touchControls!: TouchControls;

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
    this.py = H - 32;
    this.vx = 0;
    this.vy = 0;
    this.shipAngle = -90;
    this.thrusting = false;
    this.doorState = 'closed';
    this.doorOpenTimer = 0;
    this.doorCooldown = 0;
    this.doorOpenAmt = 0;
    this.planeState = 'flying';
    this.spareWindowTimer = 0;
    this.sparesLaunched = 0;
    this.accumulator = 0;
    this.prevAction = false;
    this.prevFire = false;
  }

  create(): void {
    this.scene.bringToTop('HudScene');

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x060616); // deep space

    // Station walls (placeholder visual lines).
    this.add.rectangle(10, H / 2, 2, H, 0x334455, 0.6);
    this.add.rectangle(W - 10, H / 2, 2, H, 0x334455, 0.6);
    this.add.rectangle(W / 2, H - 10, W - 20, 2, 0x334455, 0.6);

    // Station detail — docking ring.
    this.add.arc(W / 2, H - 32, 18, 0, 360, false, 0x0000ff, 0).setStrokeStyle(1, 0x334488);

    // ── Bay doors ───────────────────────────────────────────────────────────
    this.leftDoor = this.add.rectangle(
      DOOR_HALF_W / 2, DOOR_Y + DOOR_H / 2,
      DOOR_HALF_W, DOOR_H,
      0x445566,
    ).setDepth(2);

    this.rightDoor = this.add.rectangle(
      W - DOOR_HALF_W / 2, DOOR_Y + DOOR_H / 2,
      DOOR_HALF_W, DOOR_H,
      0x445566,
    ).setDepth(2);

    // ── Thrust flame ────────────────────────────────────────────────────────
    this.thrustGfx = this.add.rectangle(0, 0, 6, 8, 0xff8800, 0.9).setDepth(3).setVisible(false);

    // ── Plane (24 × 16 placeholder rectangle) ───────────────────────────────
    this.planeGfx = this.add.rectangle(this.px, this.py, 24, 16, 0x44ddff).setDepth(4);

    // ── Status text (bottom-left) ────────────────────────────────────────────
    this.statusText = this.add.text(4, H - 24, '', {
      fontSize: '7px', color: '#aaaaaa', resolution: DPR,
    }).setDepth(5);

    // ── Touch controls ───────────────────────────────────────────────────────
    this.touchControls = new TouchControls(this);

    // ── Pause on visibility ──────────────────────────────────────────────────
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    missionState.hudCue = '[K] OPEN DOORS';
  }

  update(_time: number, delta: number): void {
    // Update touch controls first so InputRouter has fresh touch state.
    this.touchControls.update();

    const input = InputRouter.read();
    const actionJustPressed = input.action && !this.prevAction;
    const fireJustPressed = input.fire && !this.prevFire;
    this.prevAction = input.action;
    this.prevFire = input.fire;

    // Fixed-step physics loop.
    this.accumulator += delta * 0.001;
    while (this.accumulator >= FIXED_DT) {
      this.fixedStep(FIXED_DT, input.moveX, input.moveY, actionJustPressed, fireJustPressed);
      this.accumulator -= FIXED_DT;
    }

    // Sync visuals to physics state.
    this.syncVisuals();

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  // ── Fixed-step physics ───────────────────────────────────────────────────

  private fixedStep(
    dt: number,
    moveX: number,
    moveY: number,
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
        // Crash animation handled via tween; nothing to step.
        break;

      case 'gameover':
        break;
    }
  }

  private stepFlying(dt: number, moveX: number, moveY: number, _actionJustPressed: boolean): void {
    // Rotate.
    this.shipAngle += moveX * HANGAR.rotateSpeed * dt;

    // Thrust (moveY < 0 = pressing "up" = thrust forward).
    this.thrusting = moveY < -0.1;
    if (this.thrusting) {
      const rad = Phaser.Math.DegToRad(this.shipAngle);
      this.vx += Math.cos(rad) * HANGAR.thrustAccel * dt;
      this.vy += Math.sin(rad) * HANGAR.thrustAccel * dt;
    }

    // Drag.
    const dragFactor = 1 - HANGAR.drag * dt;
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    // Speed cap.
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > HANGAR.maxSpeed) {
      this.vx = (this.vx / speed) * HANGAR.maxSpeed;
      this.vy = (this.vy / speed) * HANGAR.maxSpeed;
    }

    // Move.
    this.px += this.vx * dt;
    this.py += this.vy * dt;

    // Collisions.
    this.checkWallCollisions();
    this.checkDoorCollision();

    // Check exit — plane clears the top.
    if (this.py + PLANE_HIT_H < 0) {
      this.onPlaneExited();
      return;
    }

    // Write debug.
    debugInfo.speed = Math.round(speed);
    debugInfo.angle = Math.round(this.shipAngle);
  }

  private stepDoor(dt: number, actionJustPressed: boolean): void {
    switch (this.doorState) {
      case 'closed':
        if (actionJustPressed) {
          this.doorState = 'opening';
        }
        break;

      case 'opening':
        this.doorOpenAmt = Math.min(1, this.doorOpenAmt + dt / DOOR_ANIM_TIME);
        if (this.doorOpenAmt >= 1) {
          this.doorState = 'open';
          this.doorOpenTimer = HANGAR.doorOpenDuration;
        }
        break;

      case 'open':
        this.doorOpenTimer -= dt;
        if (this.doorOpenTimer <= 0) {
          // Crash if plane is in the door zone when it closes.
          if (this.py - PLANE_HIT_H < DOOR_H + 10) {
            this.crashPlane('DOOR CLOSED ON PLANE');
          } else {
            this.doorState = 'closing';
          }
        }
        break;

      case 'closing':
        this.doorOpenAmt = Math.max(0, this.doorOpenAmt - dt / DOOR_ANIM_TIME);
        if (this.doorOpenAmt <= 0) {
          this.doorState = 'cooldown';
          this.doorCooldown = HANGAR.doorCooldown;
        }
        break;

      case 'cooldown':
        this.doorCooldown -= dt;
        if (this.doorCooldown <= 0) {
          this.doorState = 'closed';
        }
        break;
    }

    // HUD cue and debug info.
    switch (this.doorState) {
      case 'closed':
        missionState.hudCue = '[K] OPEN DOORS';
        debugInfo.doorState = 'CLOSED';
        debugInfo.doorTimer = 0;
        break;
      case 'opening':
        missionState.hudCue = 'DOORS OPENING…';
        debugInfo.doorState = 'OPENING';
        debugInfo.doorTimer = 0;
        break;
      case 'open':
        missionState.hudCue = `DOORS OPEN ${this.doorOpenTimer.toFixed(1)}s — FLY THROUGH!`;
        debugInfo.doorState = 'OPEN';
        debugInfo.doorTimer = this.doorOpenTimer;
        break;
      case 'closing':
        missionState.hudCue = 'DOORS CLOSING';
        debugInfo.doorState = 'CLOSING';
        debugInfo.doorTimer = 0;
        break;
      case 'cooldown':
        missionState.hudCue = `COOLDOWN ${this.doorCooldown.toFixed(1)}s`;
        debugInfo.doorState = 'COOLDOWN';
        debugInfo.doorTimer = this.doorCooldown;
        break;
    }
  }

  private stepImpactClock(dt: number): void {
    if (missionState.tickImpactClock(dt)) {
      this.onImpactExpired();
    }
  }

  private stepSpareWindow(dt: number, actionJustPressed: boolean, fireJustPressed: boolean): void {
    this.spareWindowTimer -= dt;
    const remaining = Math.ceil(Math.max(0, this.spareWindowTimer));
    missionState.hudCue = `LAUNCH SPARE [K] — ${remaining}s`;

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
    // Left wall.
    if (this.px - PLANE_HIT_W < 10) {
      this.px = 10 + PLANE_HIT_W;
      this.wallBounce('x');
    }
    // Right wall.
    if (this.px + PLANE_HIT_W > W - 10) {
      this.px = W - 10 - PLANE_HIT_W;
      this.wallBounce('x');
    }
    // Bottom wall.
    if (this.py + PLANE_HIT_H > H - 10) {
      this.py = H - 10 - PLANE_HIT_H;
      this.wallBounce('y');
    }
  }

  private checkDoorCollision(): void {
    // Door blocks the top only when not fully open.
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
      else this.vy = -this.vy * HANGAR.bounceRestitution;
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private onPlaneExited(): void {
    this.planeState = 'exited';
    this.planeGfx.setVisible(false);
    this.thrustGfx.setVisible(false);
    this.spareWindowTimer = HANGAR.spareWindow;
    this.sparesLaunched = 0;
  }

  private crashPlane(reason: string): void {
    if (this.planeState !== 'flying') return;
    this.planeState = 'crashed';

    this.vx = 0;
    this.vy = 0;
    missionState.losePlane();
    missionState.hudCue = `CRASHED: ${reason}`;

    // Flash the plane red then fade.
    this.tweens.add({
      targets: this.planeGfx,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        if (missionState.planes <= 0) {
          this.planeState = 'gameover';
          this.showGameOver();
        } else {
          // Restart the hangar with one fewer plane.
          this.scene.restart({ launchIndex: this.launchIndex });
        }
      },
    });
    this.cameras.main.shake(300, 0.008);
  }

  private onImpactExpired(): void {
    missionState.cityLost();
    missionState.hudCue = 'CITY LOST';

    this.time.delayedCall(1500, () => {
      if (missionState.isGameOver) {
        this.showGameOver();
      } else {
        // Return to map — same launch re-fires (design: same site can relaunch after miss).
        this.scene.start('MapScene', { launchIndex: this.launchIndex });
      }
    });
  }

  private transitionToAttackRun(): void {
    this.scene.start('PlaceholderAttackRunScene', {
      launchIndex: this.launchIndex,
      sparesLaunched: this.sparesLaunched,
    });
  }

  private showGameOver(): void {
    this.planeState = 'gameover';
    missionState.hudCue = 'GAME OVER';
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(10);
    this.add.text(W / 2, H / 2 - 12, 'GAME OVER', {
      fontSize: '18px', color: '#ff4444', resolution: DPR,
    }).setOrigin(0.5).setDepth(11);
    this.add.text(W / 2, H / 2 + 12, `SCORE: ${missionState.score}`, {
      fontSize: '10px', color: '#ffffff', resolution: DPR,
    }).setOrigin(0.5).setDepth(11);

    this.time.delayedCall(4000, () => {
      missionState.startMission({ theme: 'coldfront', difficulty: missionState.difficulty, seed: Date.now() });
      this.scene.start('MapScene', { launchIndex: 0 });
    });
  }

  // ── Visual sync ──────────────────────────────────────────────────────────

  private syncVisuals(): void {
    // Plane.
    this.planeGfx.setPosition(this.px, this.py).setAngle(this.shipAngle);

    // Thrust flame — appears behind the plane.
    if (this.thrusting && this.planeState === 'flying') {
      const rad = Phaser.Math.DegToRad(this.shipAngle + 180);
      const flameX = this.px + Math.cos(rad) * 14;
      const flameY = this.py + Math.sin(rad) * 14;
      this.thrustGfx.setPosition(flameX, flameY).setAngle(this.shipAngle).setVisible(true);
    } else {
      this.thrustGfx.setVisible(false);
    }

    // Doors.
    const offset = this.doorOpenAmt * DOOR_HALF_W;
    this.leftDoor.setPosition(DOOR_HALF_W / 2 - offset, DOOR_Y + DOOR_H / 2);
    this.rightDoor.setPosition(W - DOOR_HALF_W / 2 + offset, DOOR_Y + DOOR_H / 2);

    // Status text.
    const spd = Math.round(Math.sqrt(this.vx * this.vx + this.vy * this.vy));
    const pln = missionState.planes;
    this.statusText.setText(`spd:${spd}  planes:${pln}  ${this.doorState}`);

    // Colour indicator: plane turns green when aligned with door gap.
    const inGap = Math.abs(this.px - W / 2) < 20;
    const doorOpenEnough = this.doorState === 'open' || this.doorOpenAmt > 0.5;
    this.planeGfx.setFillStyle(
      inGap && doorOpenEnough ? 0x44ff88 : 0x44ddff,
    );
  }

  shutdown(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }
}
