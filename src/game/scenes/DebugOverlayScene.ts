import Phaser from 'phaser';
import { debugInfo } from '../../state/debugInfo';
import { missionState } from '../../state/MissionState';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;

export class DebugOverlayScene extends Phaser.Scene {
  private lines!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DebugOverlayScene', active: false });
  }

  create(): void {
    // Semi-transparent panel.
    this.add.rectangle(2, 18, 120, 68, 0x000000, 0.75).setOrigin(0, 0).setDepth(0);

    this.lines = this.add
      .text(6, 20, '', {
        fontSize: '8px',
        color: '#00ff88',
        lineSpacing: 3,
        resolution: DPR,
      })
      .setDepth(1);
  }

  update(): void {
    this.lines.setText([
      `FPS   ${debugInfo.fps}`,
      `SPEED ${debugInfo.speed} px/s`,
      `ANGLE ${debugInfo.angle}°`,
      `DOOR  ${debugInfo.doorState} ${debugInfo.doorTimer > 0 ? debugInfo.doorTimer.toFixed(1) + 's' : ''}`,
      `CLOCK ${missionState.impactClock.toFixed(1)}s`,
    ]);
  }
}
