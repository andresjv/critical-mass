// Placeholder for Stage 4 — Silo Strike (implemented in T7).
// Keeps the clock running, then marks the launch as resolved and returns to map.
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { SCORE } from '../../state/tuning';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const H = 216;
const FIXED_DT = 1 / 60;
const DISPLAY_DURATION = 1.5;

interface SiloData {
  launchIndex: number;
}

export class PlaceholderSiloScene extends Phaser.Scene {
  private launchIndex = 0;
  private timer = 0;
  private accumulator = 0;
  private completed = false;

  constructor() {
    super({ key: 'PlaceholderSiloScene' });
  }

  init(data: Partial<SiloData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.timer = 0;
    this.accumulator = 0;
    this.completed = false;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    missionState.hudCue = 'SILO STRIKE';
    debugInfo.doorState = '—';

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a0a08);
    this.add.text(W / 2, H / 2 - 20, 'SILO STRIKE', {
      fontSize: '16px', color: '#ff8844', resolution: DPR,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 8, '[ Stage 4 — coming in T7 ]', {
      fontSize: '8px', color: '#886644', resolution: DPR,
    }).setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    if (this.completed) return;

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
      this.completeLaunch();
    }

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private completeLaunch(): void {
    this.completed = true;

    // Award clock bonus and mark site destroyed.
    const clockBonus = Math.ceil(missionState.impactClock) * SCORE.impactClockSecond;
    missionState.addScore(SCORE.centralSilo + clockBonus);
    missionState.impactClock = 0; // stop the clock
    missionState.siteDestroyed();
    missionState.hudCue = 'LAUNCH NEUTRALISED';

    this.time.delayedCall(1000, () => {
      const nextLaunchIndex = this.launchIndex + 1;
      this.scene.start('MapScene', { launchIndex: nextLaunchIndex });
    });
  }

  private onClockExpired(): void {
    this.completed = true;
    missionState.cityLost();
    missionState.hudCue = 'CITY LOST';

    this.time.delayedCall(1200, () => {
      if (missionState.isGameOver) {
        missionState.startMission({ theme: 'coldfront', difficulty: missionState.difficulty, seed: Date.now() });
        this.scene.start('MapScene', { launchIndex: 0 });
      } else {
        this.scene.start('MapScene', { launchIndex: this.launchIndex + 1 });
      }
    });
  }
}
