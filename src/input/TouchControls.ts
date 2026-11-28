import Phaser from 'phaser';
import { InputRouter } from './InputRouter';
import { gameUi, type TouchLabels } from '../state/gameUi';

const DEFAULT_LABELS: TouchLabels = { move: 'STEER', fire: 'FIRE', action: 'ACTION' };

import {
  FIRE_CENTER, ACTION_CENTER, FIRE_VISUAL_RADIUS, ACTION_VISUAL_RADIUS, JOYSTICK_ZONE_X,
  INVENTORY_CENTER, INVENTORY_VISUAL_RADIUS, ITEM_CENTER, ITEM_VISUAL_RADIUS,
} from './touchLayout';

const FIRE_TOUCH_RADIUS = 120;   // px — touch hit zone
const ACTION_TOUCH_RADIUS = 93;  // px
const JOYSTICK_VISUAL_RADIUS = 120; // px — base ring radius
const THUMB_VISUAL_RADIUS = 60;     // px
const JOYSTICK_MAX_DELTA = 107;     // px — max thumb travel (32 × WORLD_SCALE)
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
  /** Weapon-wheel button (only when the labels name one). */
  private readonly invArc: Phaser.GameObjects.Arc;
  private invPointerId = -1;
  private readonly itemArc: Phaser.GameObjects.Arc;
  private itemPointerId = -1;

  // Per-pointer tracking (pointer.id == -1 means unassigned)
  private joystickPointerId = -1;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickDelta = { x: 0, y: 0 };

  private firePointerId = -1;
  private actionPointerId = -1;

  private lastTouchMs = 0;
  private destroyed = false;
  private labels: TouchLabels;
  /** Controls are drawn only while touch is the device in use (phones/tablets, or after a real touch). */
  private shown = false;
  private lastDevice = gameUi.device;

  constructor(scene: Phaser.Scene, labels: TouchLabels = DEFAULT_LABELS) {
    this.scene = scene;
    // Listen on anything with a touchscreen, but only show the buttons on phones/tablets
    // (coarse primary pointer) or once the player actually touches the screen. A laptop with a
    // touchscreen played with keyboard/mouse never sees them.
    this.isTouchDevice = navigator.maxTouchPoints > 0;
    this.labels = labels;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    this.shown = this.isTouchDevice && (gameUi.device === 'touch' || (coarse && gameUi.device !== 'gamepad'));
    if (this.shown) gameUi.touchLabels = labels;
    scene.events.once('shutdown', () => this.destroy());

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
      .arc(FIRE_CENTER.x, FIRE_CENTER.y, FIRE_VISUAL_RADIUS, 0, 360, false, 0xcc4444, 0.7)
      .setVisible(this.shown)
      .setDepth(10);

    this.actionArc = scene.add
      .arc(ACTION_CENTER.x, ACTION_CENTER.y, ACTION_VISUAL_RADIUS, 0, 360, false, 0x44cc88, 0.7)
      .setVisible(this.shown)
      .setDepth(10);

    this.invArc = scene.add
      .arc(INVENTORY_CENTER.x, INVENTORY_CENTER.y, INVENTORY_VISUAL_RADIUS, 0, 360, false, 0xd8a838, 0.7)
      .setVisible(this.shown && !!labels.inventory)
      .setDepth(10);

    this.itemArc = scene.add
      .arc(ITEM_CENTER.x, ITEM_CENTER.y, ITEM_VISUAL_RADIUS, 0, 360, false, 0x7a8a9a, 0.7)
      .setVisible(this.shown && !!labels.item)
      .setDepth(10);

    if (this.isTouchDevice) {
      scene.input.on('pointerdown', this.onPointerDown);
      scene.input.on('pointermove', this.onPointerMove);
      scene.input.on('pointerup', this.onPointerUp);
      scene.input.on('pointerupoutside', this.onPointerUp);
    }
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    // Mouse clicks never drive the touch controls.
    if (!pointer.wasTouch) return;
    this.lastTouchMs = this.scene.time.now;
    gameUi.device = 'touch';
    this.setShown(true);

    // Fire button takes priority over joystick in its zone.
    if (
      this.firePointerId === -1 &&
      dist2d(pointer.x, pointer.y, FIRE_CENTER.x, FIRE_CENTER.y) <= FIRE_TOUCH_RADIUS
    ) {
      this.firePointerId = pointer.id;
      return;
    }

    if (
      this.labels.item && this.itemPointerId === -1 &&
      dist2d(pointer.x, pointer.y, ITEM_CENTER.x, ITEM_CENTER.y) <= ITEM_VISUAL_RADIUS + 18
    ) {
      this.itemPointerId = pointer.id;
      return;
    }

    if (
      this.labels.inventory && this.invPointerId === -1 &&
      dist2d(pointer.x, pointer.y, INVENTORY_CENTER.x, INVENTORY_CENTER.y) <= INVENTORY_VISUAL_RADIUS + 20
    ) {
      this.invPointerId = pointer.id;
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
    if (pointer.id === this.invPointerId) this.invPointerId = -1;
    if (pointer.id === this.itemPointerId) this.itemPointerId = -1;
  };

  /** Show or hide the on-screen buttons and their labels. */
  private setShown(on: boolean): void {
    if (on === this.shown || this.destroyed) return;
    this.shown = on;
    this.fireArc.setVisible(on);
    this.actionArc.setVisible(on);
    this.invArc.setVisible(on && !!this.labels.inventory);
    this.itemArc.setVisible(on && !!this.labels.item);
    if (!on) { this.baseArc.setVisible(false); this.thumbArc.setVisible(false); }
    if (on) gameUi.touchLabels = this.labels;
    else if (gameUi.touchLabels === this.labels) gameUi.touchLabels = null;
  }

  update(): void {
    if (!this.isTouchDevice) return;
    // Switching to the keyboard or a gamepad hides the buttons; touching the screen brings them back.
    if (gameUi.device !== this.lastDevice) {
      this.lastDevice = gameUi.device;
      this.setShown(gameUi.device === 'touch');
    }

    const moveX =
      this.joystickPointerId !== -1 ? this.joystickDelta.x / JOYSTICK_MAX_DELTA : 0;
    const moveY =
      this.joystickPointerId !== -1 ? this.joystickDelta.y / JOYSTICK_MAX_DELTA : 0;

    const touchFire   = this.firePointerId !== -1;
    const touchAction = this.actionPointerId !== -1;
    const touchMove   = this.joystickPointerId !== -1;

    if (touchFire || touchAction || touchMove) gameUi.device = 'touch';

    InputRouter.setTouch({
      moveX,
      moveY,
      fire: touchFire,
      action: touchAction,
      pause: false,
      inventory: this.invPointerId !== -1,
      item: this.itemPointerId !== -1,
    });

    // Fade idle controls.
    const elapsed = this.scene.time.now - this.lastTouchMs;
    const alpha = elapsed > FADE_DELAY_MS ? IDLE_ALPHA : ACTIVE_ALPHA;
    this.fireArc.setAlpha(alpha);
    this.actionArc.setAlpha(alpha);
    this.invArc.setAlpha(alpha);
    this.itemArc.setAlpha(alpha);
  }

  /** Change button labels mid-scene (e.g. hangar: OPEN DOORS → LAUNCH). */
  setLabels(labels: TouchLabels): void {
    this.labels = labels;
    if (this.shown && !this.destroyed) gameUi.touchLabels = labels;
    this.invArc.setVisible(this.shown && !!labels.inventory);
    this.itemArc.setVisible(this.shown && !!labels.item);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (gameUi.touchLabels === this.labels) gameUi.touchLabels = null;
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
    this.invArc.destroy();
    this.itemArc.destroy();
  }
}
