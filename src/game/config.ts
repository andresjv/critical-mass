import Phaser from 'phaser';
import { DebugScene } from './scenes/DebugScene';
import { MapScene } from './scenes/MapScene';
import { HangarScene } from './scenes/HangarScene';
import { PlaceholderAttackRunScene } from './scenes/PlaceholderAttackRunScene';
import { PlaceholderSiloScene } from './scenes/PlaceholderSiloScene';
import { PlaceholderAssaultScene } from './scenes/PlaceholderAssaultScene';
import { HudScene } from './scenes/HudScene';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';

export const CANVAS_WIDTH = 384;
export const CANVAS_HEIGHT = 216;

/** Returns the key of the scene to auto-start. Use ?debug=1 for the input debug screen. */
function startScene(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') return 'DebugScene';
  }
  return 'MapScene';
}

export function getGameConfig(): Phaser.Types.Core.GameConfig {
  const start = startScene();
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
    scene: [
      // The first entry auto-starts; all others are registered but idle.
      start === 'DebugScene'
        ? [DebugScene, MapScene]
        : [MapScene, DebugScene],
      HangarScene,
      PlaceholderAttackRunScene,
      PlaceholderSiloScene,
      PlaceholderAssaultScene,
      HudScene,
      DebugOverlayScene,
    ].flat(),
  };
}
