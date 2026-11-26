// Placeholder for Stage 3 — Attack Run (implemented in T6).
// Keeps the impact clock running. Auto-advances after a short delay.
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const H = 216;
const FIXED_DT = 1 / 60;
const DISPLAY_DURATION = 2.5; // seconds before auto-advancing

interface AttackRunData {
  launchIndex: number;
  sparesLaunched: number;
}

export class PlaceholderAttackRunScene extends Phaser.Scene {
  private launchIndex = 0;
  private timer = 0;
  private accumulator = 0;

  constructor() {
    super({ key: 'PlaceholderAttackRunScene' });
  }

  init(data: Partial<AttackRunData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.timer = 0;
    this.accumulator = 0;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    missionState.hudCue = 'ATTACK RUN';
    debugInfo.doorState = '—';
    debugInfo.speed = 0;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1a08);
    this.add.text(W / 2, H / 2 - 20, 'ATTACK RUN', {
      fontSize: '16px', color: '#44ff44', resolution: DPR,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 8, '[ Stage 3 — coming in T6 ]', {
      fontSize: '8px', color: '#668866', resolution: DPR,
    }).setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    this.accumulator += delta * 0.001;
    while (this.accumulator >= FIXED_DT) {
      if (missionState.tickImpactClock(FIXED_DT)) {
        this.onClockExpired();
        return;
      }
      this.accumulator -= FIXED_DT;
    }

    this.timer += delta * 0.001;
    if (this.timer >= DISPLAY_DURATION) {
      this.scene.start('PlaceholderSiloScene', { launchIndex: this.launchIndex });
    }

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private onClockExpired(): void {
    missionState.cityLost();
    this.time.delayedCall(1200, () => {
      if (missionState.isGameOver) {
        this.scene.start('MapScene', { launchIndex: 0 });
      } else {
        this.scene.start('MapScene', { launchIndex: this.launchIndex });
      }
    });
  }
}
