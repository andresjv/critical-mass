import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';

// Keyboard key codes used for movement and actions.
const { LEFT, RIGHT, UP, DOWN, W, A, S, D, SPACE, J, SHIFT, K, ESC, P } =
  Phaser.Input.Keyboard.KeyCodes;

export class DebugScene extends Phaser.Scene {
  private touchControls!: TouchControls;
  private infoText!: Phaser.GameObjects.Text;

  // Keyboard keys — initialised in create(), not null-asserted after that.
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;

  private visibilityHandler!: () => void;

  constructor() {
    super({ key: 'DebugScene' });
  }

  create(): void {
    // Dark background.
    this.add.rectangle(192, 108, 384, 216, 0x1a1a2e).setDepth(0);

    // Label.
    this.add
      .text(192, 20, 'INPUT DEBUG', { fontSize: '14px', color: '#ffff00' })
      .setOrigin(0.5, 0)
      .setDepth(1);

    // Instruction.
    const isTouch = navigator.maxTouchPoints > 0;
    this.add
      .text(192, 36, isTouch ? 'Touch: stick BL · Fire BR · Action above Fire' : 'WASD/Arrows · Space=fire · Shift=action · Esc=pause', {
        fontSize: '7px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0)
      .setDepth(1);

    // Live-values text block.
    this.infoText = this.add
      .text(10, 60, '', { fontSize: '10px', color: '#ffffff', lineSpacing: 4 })
      .setDepth(1);

    // Register keyboard keys via the Phaser keyboard plugin.
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
    this.keyEsc   = kb.addKey(ESC);
    this.keyP     = kb.addKey(P);

    // Touch controls overlay.
    this.touchControls = new TouchControls(this);

    // Pause on tab-switch / app background, resume on return.
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.scene.pause();
      } else {
        this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  update(): void {
    // --- Keyboard ---
    const moveX =
      (this.keyRight.isDown || this.keyD.isDown ? 1 : 0) -
      (this.keyLeft.isDown || this.keyA.isDown ? 1 : 0);
    const moveY =
      (this.keyDown.isDown || this.keyS.isDown ? 1 : 0) -
      (this.keyUp.isDown || this.keyW.isDown ? 1 : 0);

    InputRouter.setKeyboard({
      moveX,
      moveY,
      fire: this.keySpace.isDown || this.keyJ.isDown,
      action: this.keyShift.isDown || this.keyK.isDown,
      pause: Phaser.Input.Keyboard.JustDown(this.keyEsc) ||
             Phaser.Input.Keyboard.JustDown(this.keyP),
    });

    // --- Gamepad ---
    const pads = this.input.gamepad?.gamepads ?? [];
    if (pads.length > 0) {
      const pad = pads[0];
      InputRouter.setGamepad({
        moveX: pad.leftStick.x,
        moveY: pad.leftStick.y,
        fire: pad.isButtonDown(0),    // A / Cross
        action: pad.isButtonDown(1),  // B / Circle
        pause: pad.isButtonDown(9),   // Start
      });
    }

    // --- Touch ---
    this.touchControls.update();

    // --- Display ---
    const s = InputRouter.read();
    this.infoText.setText([
      `moveX : ${s.moveX.toFixed(3)}`,
      `moveY : ${s.moveY.toFixed(3)}`,
      `fire  : ${s.fire}`,
      `action: ${s.action}`,
      `pause : ${s.pause}`,
      '',
      `device: ${navigator.maxTouchPoints > 0 ? 'TOUCH' : 'KEYBOARD'}`,
      `pads  : ${pads.length}`,
    ]);
  }

  shutdown(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls.destroy();
  }
}
