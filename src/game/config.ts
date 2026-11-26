import Phaser from 'phaser';
import { DebugScene } from './scenes/DebugScene';

export const CANVAS_WIDTH = 384;
export const CANVAS_HEIGHT = 216;

export function getGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#000000',
    banner: false,
    // Pixel-art rendering: disables anti-aliasing and rounds sprite positions.
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      gamepad: true,
    },
    scene: [DebugScene],
  };
}
