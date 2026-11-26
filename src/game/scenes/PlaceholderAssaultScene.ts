// Placeholder for Stages 5 + 6 (implemented in T8 + T9).
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { gameUi } from '../../state/gameUi';

const W = 1280;
const H = 720;

export class PlaceholderAssaultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlaceholderAssaultScene' });
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive     = false;
    missionState.hudCue  = 'VOSTGRAD ASSAULT';

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a0808);
    this.add.rectangle(W / 2, 6, W, 12, 0xff4444, 0.5);

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
