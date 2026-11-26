// Placeholder for Stage 3 — Attack Run (implemented in T6).
// Keeps the impact clock running. Auto-advances after a short delay.
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';

const W = 1280;
const H = 720;
const FIXED_DT = 1 / 60;
const DISPLAY_DURATION = 2.5;

interface AttackRunData {
  launchIndex: number;
  sparesLaunched: number;
}

export class PlaceholderAttackRunScene extends Phaser.Scene {
  private launchIndex    = 0;
  private timer          = 0;
  private accumulator    = 0;

  constructor() {
    super({ key: 'PlaceholderAttackRunScene' });
  }

  init(data: Partial<AttackRunData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.timer       = 0;
    this.accumulator = 0;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive   = false;
    missionState.hudCue = 'ATTACK RUN';
    debugInfo.doorState  = '—';
    debugInfo.speed      = 0;

    // Placeholder background — no text in canvas.
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1a08);

    // Simple visual indicator: coloured bar across top.
    this.add.rectangle(W / 2, 6, W, 12, 0x44ff44, 0.5);
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
