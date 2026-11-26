import Phaser from 'phaser';
import { InputRouter } from './InputRouter';

// Canvas-coordinate positions (384 × 216 internal canvas).
const FIRE_CENTER = { x: 350, y: 190 } as const;
const ACTION_CENTER = { x: 318, y: 158 } as const;
const FIRE_TOUCH_RADIUS = 36;    // px — touch hit zone
const ACTION_TOUCH_RADIUS = 28;  // px
const JOYSTICK_VISUAL_RADIUS = 36; // px — base ring radius
const THUMB_VISUAL_RADIUS = 18;    // px
const JOYSTICK_MAX_DELTA = 32;     // px — max thumb travel
const JOYSTICK_ZONE_X = 192;       // joystick zone is left half of canvas
const FADE_DELAY_MS = 3000;
const ACTIVE_ALPHA = 1.0;
const IDLE_ALPHA = 0.35;

function dist2d(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly isTouchDevice: boolean;

  // Joystick objects (only visible while joystick pointer is active)
  private readonly baseArc: Phaser.GameObjects.Arc;
  private readonly thumbArc: Phaser.GameObjects.Arc;

  // Fixed button objects
  private readonly fireArc: Phaser.GameObjects.Arc;
  private readonly actionArc: Phaser.GameObjects.Arc;

  // Per-pointer tracking (pointer.id == -1 means unassigned)
  private joystickPointerId = -1;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickDelta = { x: 0, y: 0 };

  private firePointerId = -1;
  private actionPointerId = -1;

  private lastTouchMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Show only on actual touch devices.
    this.isTouchDevice = navigator.maxTouchPoints > 0;

    // Build visuals regardless of device so references are always valid;
    // hide everything on non-touch devices.
    this.baseArc = scene.add
      .arc(0, 0, JOYSTICK_VISUAL_RADIUS, 0, 360, false, 0x4455aa, 0.5)
      .setVisible(false)
      .setDepth(10);

    this.thumbArc = scene.add
      .arc(0, 0, THUMB_VISUAL_RADIUS, 0, 360, false, 0x8899dd, 0.9)
      .setVisible(false)
      .setDepth(11);

    this.fireArc = scene.add
      .arc(FIRE_CENTER.x, FIRE_CENTER.y, 24, 0, 360, false, 0xcc4444, 0.7)
      .setVisible(this.isTouchDevice)
      .setDepth(10);

    this.actionArc = scene.add
      .arc(ACTION_CENTER.x, ACTION_CENTER.y, 20, 0, 360, false, 0x44cc88, 0.7)
      .setVisible(this.isTouchDevice)
      .setDepth(10);

    if (this.isTouchDevice) {
      scene.input.on('pointerdown', this.onPointerDown);
      scene.input.on('pointermove', this.onPointerMove);
      scene.input.on('pointerup', this.onPointerUp);
      scene.input.on('pointerupoutside', this.onPointerUp);
    }
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.lastTouchMs = this.scene.time.now;

    // Fire button takes priority over joystick in its zone.
    if (
      this.firePointerId === -1 &&
      dist2d(pointer.x, pointer.y, FIRE_CENTER.x, FIRE_CENTER.y) <= FIRE_TOUCH_RADIUS
    ) {
      this.firePointerId = pointer.id;
      return;
    }

    if (
      this.actionPointerId === -1 &&
      dist2d(pointer.x, pointer.y, ACTION_CENTER.x, ACTION_CENTER.y) <= ACTION_TOUCH_RADIUS
    ) {
      this.actionPointerId = pointer.id;
      return;
    }

    // Any remaining touch in the left half starts the joystick.
    if (this.joystickPointerId === -1 && pointer.x < JOYSTICK_ZONE_X) {
      this.joystickPointerId = pointer.id;
      this.joystickOrigin = { x: pointer.x, y: pointer.y };
      this.joystickDelta = { x: 0, y: 0 };
      this.baseArc.setPosition(pointer.x, pointer.y).setVisible(true);
      this.thumbArc.setPosition(pointer.x, pointer.y).setVisible(true);
    }
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.joystickPointerId) return;
    this.lastTouchMs = this.scene.time.now;

    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > JOYSTICK_MAX_DELTA) {
      this.joystickDelta.x = (dx / len) * JOYSTICK_MAX_DELTA;
      this.joystickDelta.y = (dy / len) * JOYSTICK_MAX_DELTA;
    } else {
      this.joystickDelta.x = dx;
      this.joystickDelta.y = dy;
    }

    this.thumbArc.setPosition(
      this.joystickOrigin.x + this.joystickDelta.x,
      this.joystickOrigin.y + this.joystickDelta.y,
    );
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.joystickPointerId) {
      this.joystickPointerId = -1;
      this.joystickDelta = { x: 0, y: 0 };
      this.baseArc.setVisible(false);
      this.thumbArc.setVisible(false);
    }
    if (pointer.id === this.firePointerId) this.firePointerId = -1;
    if (pointer.id === this.actionPointerId) this.actionPointerId = -1;
  };

  update(): void {
    if (!this.isTouchDevice) return;

    const moveX =
      this.joystickPointerId !== -1 ? this.joystickDelta.x / JOYSTICK_MAX_DELTA : 0;
    const moveY =
      this.joystickPointerId !== -1 ? this.joystickDelta.y / JOYSTICK_MAX_DELTA : 0;

    InputRouter.setTouch({
      moveX,
      moveY,
      fire: this.firePointerId !== -1,
      action: this.actionPointerId !== -1,
      pause: false,
    });

    // Fade idle controls.
    const elapsed = this.scene.time.now - this.lastTouchMs;
    const alpha = elapsed > FADE_DELAY_MS ? IDLE_ALPHA : ACTIVE_ALPHA;
    this.fireArc.setAlpha(alpha);
    this.actionArc.setAlpha(alpha);
  }

  destroy(): void {
    if (this.isTouchDevice) {
      this.scene.input.off('pointerdown', this.onPointerDown);
      this.scene.input.off('pointermove', this.onPointerMove);
      this.scene.input.off('pointerup', this.onPointerUp);
      this.scene.input.off('pointerupoutside', this.onPointerUp);
    }
    this.baseArc.destroy();
    this.thumbArc.destroy();
    this.fireArc.destroy();
    this.actionArc.destroy();
  }
}
