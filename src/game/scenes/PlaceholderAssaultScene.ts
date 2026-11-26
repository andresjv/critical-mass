// Placeholder for Stages 5 + 6 (implemented in T8 + T9).
// For now: shows the results screen, then starts a new mission.
import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { gameUi } from '../../state/gameUi';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';

const W = 1280;
const H = 720;
const RESULTS_DISPLAY_MS = 12_000; // time before showing coming-soon

export class PlaceholderAssaultScene extends Phaser.Scene {
  private touchControls!: TouchControls;
  private prevFire = false;
  private visibilityHandler!: () => void;

  constructor() {
    super({ key: 'PlaceholderAssaultScene' });
  }

  create(): void {
    this.scene.bringToTop('HudScene');
    gameUi.mapActive      = false;
    gameUi.progressStep   = null;
    gameUi.objective      = '';
    gameUi.contextualHint = null;
    gameUi.stageResult    = null;
    missionState.hudCue   = '';
    this.prevFire         = false;

    // Show background while results are visible.
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // Show the results screen.
    gameUi.showResults    = true;
    gameUi.showComingSoon = false;
    gameUi.finalScore     = missionState.score;

    // After results period, switch to coming-soon card.
    this.time.delayedCall(RESULTS_DISPLAY_MS, () => {
      gameUi.showResults    = false;
      gameUi.showComingSoon = true;
    });

    // Touch controls for skip detection.
    this.touchControls = new TouchControls(this);

    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  update(): void {
    this.touchControls.update();

    // Only handle skip after coming-soon is shown (not during results).
    if (!gameUi.showComingSoon) return;

    const inp = InputRouter.read();
    const fireJust = inp.fire && !this.prevFire;
    this.prevFire = inp.fire;

    if (fireJust || inp.action) {
      this.startNewMission();
    }
  }

  private startNewMission(): void {
    gameUi.showComingSoon = false;
    gameUi.showResults    = false;

    missionState.startMission({
      theme:      missionState.theme,
      difficulty: missionState.difficulty,
      seed:       Date.now(),
    });
    this.scene.start('MapScene', { launchIndex: 0 });
  }

  shutdown(): void {
    gameUi.showResults    = false;
    gameUi.showComingSoon = false;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }
}
