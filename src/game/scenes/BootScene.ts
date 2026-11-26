// BootScene — runs first every session.
// 1. Loads the real sprite atlas when it exists (commented out until art lands).
// 2. Generates placeholder textures via Graphics.generateTexture() for all sprite keys.
// 3. Routes to MapScene or DebugScene based on ?debug=1 URL param.

import Phaser from 'phaser';

interface PlaceholderSpec {
  key:   string;
  w:     number;
  h:     number;
  color: number;
}

const PLACEHOLDER_SPRITES: PlaceholderSpec[] = [
  { key: 'plane-side',   w: 60,  h: 24, color: 0x44aaff },
  { key: 'tank',         w: 60,  h: 28, color: 0x445533 },
  { key: 'sam',          w: 40,  h: 55, color: 0x443322 },
  { key: 'interceptor',  w: 55,  h: 22, color: 0x556677 },
  { key: 'heat-seeker',  w: 28,  h: 10, color: 0xff3300 },
  { key: 'rocket',       w: 24,  h:  8, color: 0xffffff  },
  { key: 'bomb',         w: 20,  h: 20, color: 0xffcc44  },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Uncomment when real atlas lands in public/assets/:
    // this.load.atlas('sprites', 'assets/sprites.png', 'assets/sprites.json');
  }

  create(): void {
    // Generate placeholder textures for any key not already loaded from the atlas.
    for (const { key, w, h, color } of PLACEHOLDER_SPRITES) {
      if (this.textures.exists(key)) continue;

      const g = this.make.graphics({}, false);
      // Base fill.
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      // Highlight stripe so the shape reads as a solid object.
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(2, 2, w - 4, Math.max(1, Math.floor(h / 3)));
      g.generateTexture(key, w, h);
      g.destroy();
    }

    // Route based on ?debug=1.
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams('');
    const target = params.get('debug') === '1' ? 'DebugScene' : 'MapScene';
    this.scene.start(target);
  }
}
