// MenuScene — title / level select / settings backdrop.
// The menu itself is React (<MainMenu/>); this scene only scrolls the highlighted level's
// scenery behind it and starts the mission when React posts gameUi.menuRequest.
import Phaser from 'phaser';
import { gameUi } from '../../state/gameUi';
import { missionState } from '../../state/MissionState';
import { updateSettings } from '../../state/settings';
import type { LevelId } from '../../state/levels';
import { getBiome } from '../theme/biomes';
import { Backdrop } from '../effects/Backdrop';
import { MusicTrack } from '../audio/MusicTrack';

/** Menu backdrop scroll speed, px/s. */
const MENU_SCROLL = 60;

export class MenuScene extends Phaser.Scene {
  private backdrop!: Backdrop;
  private shownLevel: LevelId = 'coldfront';
  private cameraX = 0;

  constructor() { super({ key: 'MenuScene' }); }

  private music = new MusicTrack('menu');

  create(): void {
    gameUi.screen       = 'menu';
    gameUi.menuRequest  = null;
    gameUi.mapActive    = false;
    gameUi.progressStep = null;
    gameUi.touchLabels  = null;
    gameUi.paused       = false;
    gameUi.attackRunSecsLeft = 0;
    missionState.hudCue = '';
    if (this.scene.isActive('HudScene')) this.scene.stop('HudScene');

    this.shownLevel = gameUi.menuPreview;
    this.backdrop = new Backdrop(
      this.add.graphics().setDepth(0),
      this.add.graphics().setDepth(1),
      this.add.graphics().setDepth(2),
      getBiome(this.shownLevel),
      3,
    );
    // Darken the bottom so the menu text stays readable over bright biomes.
    const shade = this.add.graphics().setDepth(3);
    shade.fillStyle(0x000000, 0.12);
    shade.fillRect(0, 0, 1280, 720);

    // Menu theme (waits silently until the first tap/click unlocks audio).
    this.music.start();
    this.events.once('shutdown', () => this.music.fadeOut(0.8));
  }

  update(_time: number, delta: number): void {
    const req = gameUi.menuRequest;
    if (req) {
      gameUi.menuRequest = null;
      updateSettings({ lastLevel: req.level, lastDifficulty: req.difficulty });
      missionState.startMission({ theme: 'coldfront', level: req.level, difficulty: req.difficulty, seed: Date.now() });
      gameUi.screen = 'game';
      this.scene.start('MapScene', { launchIndex: 0 });
      return;
    }
    if (gameUi.menuPreview !== this.shownLevel) {
      this.shownLevel = gameUi.menuPreview;
      this.backdrop.setBiome(getBiome(this.shownLevel), 3);
    }
    this.cameraX += MENU_SCROLL * delta * 0.001;
    this.backdrop.draw(this.cameraX, this.time.now);
  }
}
