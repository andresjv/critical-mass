import Phaser from 'phaser';
import { DebugScene } from './scenes/DebugScene';
import { MapScene } from './scenes/MapScene';
import { HangarScene } from './scenes/HangarScene';
import { AttackRunScene } from './scenes/AttackRunScene';
import { SiloScene } from './scenes/SiloScene';
import { PlaceholderAttackRunScene } from './scenes/PlaceholderAttackRunScene';
import { PlaceholderSiloScene } from './scenes/PlaceholderSiloScene';
import { PlaceholderAssaultScene } from './scenes/PlaceholderAssaultScene';
import { HudScene } from './scenes/HudScene';
import { InputScene } from './scenes/InputScene';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

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
    // Vector / smooth rendering: antialias on, pixel-art mode off.
    pixelArt: false,
    roundPixels: false,
    antialias: true,
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
      AttackRunScene,
      SiloScene,
      PlaceholderAttackRunScene,
      PlaceholderSiloScene,
      PlaceholderAssaultScene,
      // Persistent parallel scenes (launched once, never stopped by scene.start).
      HudScene,
      InputScene,
      DebugOverlayScene,
    ].flat(),
  };
}
