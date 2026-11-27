// Placeholder for Stage 4 — Silo Strike (implemented in T7).
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { SCORE } from '../../state/tuning';

const W = 1280;
const H = 720;
const FIXED_DT = 1 / 60;
const DISPLAY_DURATION = 1.5;

interface SiloData {
  launchIndex: number;
}

export class PlaceholderSiloScene extends Phaser.Scene {
  private launchIndex  = 0;
  private timer        = 0;
  private accumulator  = 0;
  private completed    = false;

  constructor() {
    super({ key: 'PlaceholderSiloScene' });
  }

  init(data: Partial<SiloData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.timer       = 0;
    this.accumulator = 0;
    this.completed   = false;
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive    = false;
    missionState.hudCue  = 'SILO STRIKE';
    debugInfo.doorState  = '—';

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a0a08);
    this.add.rectangle(W / 2, 6, W, 12, 0xff8844, 0.5);
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
    if (this.timer >= DISPLAY_DURATION) this.completeLaunch();

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private completeLaunch(): void {
    this.completed = true;
    const clockBonus = Math.ceil(missionState.impactClock) * SCORE.impactClockSecond;
    missionState.addScore(SCORE.centralSilo + clockBonus);
    missionState.impactClock = 0;
    missionState.siteDestroyed();
    missionState.hudCue = 'LAUNCH NEUTRALISED';

    this.time.delayedCall(1000, () => {
      this.scene.start('MapScene', { launchIndex: this.launchIndex + 1 });
    });
  }

  private onClockExpired(): void {
    this.completed = true;
    missionState.cityLost();
    missionState.hudCue = 'CITY LOST';

    this.time.delayedCall(1200, () => {
      if (missionState.isGameOver) {
        missionState.endMission();
        this.scene.start('MenuScene');
      } else {
        this.scene.start('MapScene', { launchIndex: this.launchIndex + 1 });
      }
    });
  }
}
