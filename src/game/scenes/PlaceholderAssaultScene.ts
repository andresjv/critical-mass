// Placeholder for Stages 5 + 6 (implemented in T8 + T9).
// For now: shows the results screen, then starts a new mission.
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { gameUi } from '../../state/gameUi';

const W = 1280;
const H = 720;
const RESULTS_DISPLAY_MS = 12_000; // time before auto-restarting

export class PlaceholderAssaultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlaceholderAssaultScene' });
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive    = false;
    missionState.hudCue = '';

    // Show background while results are visible
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Show the results screen
    gameUi.showResults = true;
    gameUi.finalScore  = missionState.score;

    // Auto-restart after delay (player can interact with results screen in between)
    this.time.delayedCall(RESULTS_DISPLAY_MS, () => {
      gameUi.showResults = false;

      missionState.startMission({
        theme:      missionState.theme,
        difficulty: missionState.difficulty,
        seed:       Date.now(),
      });
      this.scene.start('MapScene', { launchIndex: 0 });
    });
  }
}
