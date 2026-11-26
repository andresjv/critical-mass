// HudScene — kept as an empty parallel scene so existing scene.launch('HudScene') calls
// still work. All HUD rendering has moved to the React <GameOverlay /> component.
// InputScene now handles F1 / keyboard / gamepad input.
import Phaser from 'phaser';

export class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene', active: false });
  }

  create(): void {
    // Boot InputScene alongside HudScene so it always runs.
    if (!this.scene.isActive('InputScene')) {
      this.scene.launch('InputScene');
    }
  }
}
