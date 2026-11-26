// Placeholder for Stages 5 + 6 (implemented in T8 + T9).
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const H = 216;

export class PlaceholderAssaultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlaceholderAssaultScene' });
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    missionState.hudCue = 'VOSTGRAD ASSAULT';

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a0808);
    this.add.text(W / 2, H / 2 - 24, 'VOSTGRAD ASSAULT', {
      fontSize: '14px', color: '#ff4444', resolution: DPR,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2, '[ Stages 5 & 6 — coming in T8–T9 ]', {
      fontSize: '8px', color: '#886666', resolution: DPR,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 20, `FINAL SCORE: ${missionState.score}`, {
      fontSize: '10px', color: '#ffffff', resolution: DPR,
    }).setOrigin(0.5);

    // Return to map (new mission) after 5 s.
    this.time.delayedCall(5000, () => {
      missionState.startMission({
        theme: 'coldfront',
        difficulty: missionState.difficulty,
        seed: Date.now(),
      });
      this.scene.start('MapScene', { launchIndex: 0 });
    });
  }
}
