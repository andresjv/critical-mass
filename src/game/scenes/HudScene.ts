import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const HUD_H = 16;

export class HudScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private planesText!: Phaser.GameObjects.Text;
  private cueText!: Phaser.GameObjects.Text;
  private f1Key!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'HudScene', active: false });
  }

  create(): void {
    const style = { fontSize: '9px', resolution: DPR };

    // Subtle background bar across the top.
    this.add.rectangle(W / 2, HUD_H / 2, W, HUD_H, 0x000000, 0.6).setDepth(0);

    this.scoreText = this.add
      .text(4, 2, 'SCORE 0', { ...style, color: '#ffffff' })
      .setDepth(1);

    this.clockText = this.add
      .text(W / 2, 2, '150s', { ...style, color: '#00ff88' })
      .setOrigin(0.5, 0)
      .setDepth(1);

    this.planesText = this.add
      .text(W - 4, 2, '>>>>  ', { ...style, color: '#88ccff' })
      .setOrigin(1, 0)
      .setDepth(1);

    // Stage cue at bottom-centre.
    this.cueText = this.add
      .text(W / 2, 208, '', { ...style, color: '#ffff88', fontSize: '8px' })
      .setOrigin(0.5, 0)
      .setDepth(1);

    // F1 → toggle debug overlay.
    this.f1Key = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
  }

  update(): void {
    // Score
    const score = String(missionState.score).padStart(7, '0');
    this.scoreText.setText(`SCORE ${score}`);

    // Impact clock (red under 20 s, hidden when 0)
    const clock = missionState.impactClock;
    if (clock > 0) {
      const secs = Math.ceil(clock);
      this.clockText.setText(`${secs}s`).setColor(secs <= 20 ? '#ff4444' : '#00ff88');
    } else {
      this.clockText.setText('');
    }

    // Planes
    const p = missionState.planes;
    this.planesText.setText('▶'.repeat(Math.max(0, p)));

    // Stage cue
    this.cueText.setText(missionState.hudCue);

    // F1 toggle
    if (Phaser.Input.Keyboard.JustDown(this.f1Key)) {
      if (this.scene.isActive('DebugOverlayScene')) {
        this.scene.stop('DebugOverlayScene');
      } else {
        this.scene.launch('DebugOverlayScene');
        this.scene.bringToTop('DebugOverlayScene');
      }
    }
  }
}
