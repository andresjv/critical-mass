// InputScene — persistent parallel scene that owns keyboard + gamepad input.
// Runs alongside every stage scene so InputRouter always has fresh state.
// Also handles F1 debug toggle and device-hint tracking.
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { gameUi } from '../../state/gameUi';

const { LEFT, RIGHT, UP, DOWN, W, A, S, D, SPACE, J, SHIFT, K, X, ESC, P, F1 } =
  Phaser.Input.Keyboard.KeyCodes;

export class InputScene extends Phaser.Scene {
  private keyLeft!:  Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyUp!:    Phaser.Input.Keyboard.Key;
  private keyDown!:  Phaser.Input.Keyboard.Key;
  private keyW!:     Phaser.Input.Keyboard.Key;
  private keyA!:     Phaser.Input.Keyboard.Key;
  private keyS!:     Phaser.Input.Keyboard.Key;
  private keyD!:     Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyJ!:     Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keyK!:     Phaser.Input.Keyboard.Key;
  private keyX!:     Phaser.Input.Keyboard.Key;
  private keyEsc!:   Phaser.Input.Keyboard.Key;
  private keyP!:     Phaser.Input.Keyboard.Key;
  private keyF1!:    Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'InputScene', active: false });
  }

  create(): void {
    const kb = this.input.keyboard!;
    this.keyLeft  = kb.addKey(LEFT);
    this.keyRight = kb.addKey(RIGHT);
    this.keyUp    = kb.addKey(UP);
    this.keyDown  = kb.addKey(DOWN);
    this.keyW     = kb.addKey(W);
    this.keyA     = kb.addKey(A);
    this.keyS     = kb.addKey(S);
    this.keyD     = kb.addKey(D);
    this.keySpace = kb.addKey(SPACE);
    this.keyJ     = kb.addKey(J);
    this.keyShift = kb.addKey(SHIFT);
    this.keyK     = kb.addKey(K);
    this.keyX     = kb.addKey(X);
    this.keyEsc   = kb.addKey(ESC);
    this.keyP     = kb.addKey(P);
    this.keyF1    = kb.addKey(F1);
  }

  update(): void {
    // ── Keyboard ──────────────────────────────────────────────────────────
    const moveX =
      (this.keyRight.isDown || this.keyD.isDown ? 1 : 0) -
      (this.keyLeft.isDown  || this.keyA.isDown ? 1 : 0);
    const moveY =
      (this.keyDown.isDown  || this.keyS.isDown ? 1 : 0) -
      (this.keyUp.isDown    || this.keyW.isDown ? 1 : 0);

    const kbActive = moveX !== 0 || moveY !== 0
      || this.keySpace.isDown || this.keyJ.isDown
      || this.keyShift.isDown || this.keyK.isDown || this.keyX.isDown;

    InputRouter.setKeyboard({
      moveX,
      moveY,
      fire: this.keySpace.isDown || this.keyJ.isDown,
      action: this.keyShift.isDown || this.keyK.isDown || this.keyX.isDown,
      pause: Phaser.Input.Keyboard.JustDown(this.keyEsc) ||
             Phaser.Input.Keyboard.JustDown(this.keyP),
    });

    if (kbActive) gameUi.device = 'keyboard';

    // ── Gamepad ───────────────────────────────────────────────────────────
    const pads = this.input.gamepad?.gamepads ?? [];
    if (pads.length > 0) {
      const pad = pads[0];
      const padMoveX = pad.leftStick.x;
      const padMoveY = pad.leftStick.y;
      const padFire   = pad.isButtonDown(0); // A / Cross
      const padAction = pad.isButtonDown(1); // B / Circle
      const padPause  = pad.isButtonDown(9); // Start

      InputRouter.setGamepad({
        moveX: padMoveX,
        moveY: padMoveY,
        fire: padFire,
        action: padAction,
        pause: padPause,
      });

      if (Math.abs(padMoveX) > 0.1 || Math.abs(padMoveY) > 0.1 || padFire || padAction) {
        gameUi.device = 'gamepad';
      }
    }

    // ── F1 — debug overlay toggle ─────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      gameUi.debugVisible = !gameUi.debugVisible;
    }
  }
}
