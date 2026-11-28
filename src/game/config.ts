import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { MenuScene } from './scenes/MenuScene';
import { MapScene } from './scenes/MapScene';
import { HangarScene } from './scenes/HangarScene';
import { AttackRunScene } from './scenes/AttackRunScene';
import { GroundAssaultScene } from './scenes/GroundAssaultScene';
import { HudScene } from './scenes/HudScene';
import { InputScene } from './scenes/InputScene';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';
import { GameOverScene } from './scenes/GameOverScene';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export function getGameConfig(): Phaser.Types.Core.GameConfig {
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
    // All audio is managed via raw Web Audio API (src/game/audio/).
    // Disabling Phaser's audio prevents it from creating its own AudioContext
    // before a user gesture, which triggers browser autoplay warnings.
    audio: {
      noAudio: true,
    },
    input: {
      gamepad: true,
      // Phaser tracks one touch by default; steer + fire + action needs three.
      activePointers: 4,
    },
    scene: [
      // BootScene auto-starts first; it generates placeholder textures then
      // routes to MapScene or DebugScene (?debug=1).
      BootScene,
      MenuScene,
      MapScene,
      DebugScene,
      HangarScene,
      AttackRunScene,
      GroundAssaultScene,
      GameOverScene,
      // Persistent parallel scenes (launched once, never stopped by scene.start).
      HudScene,
      InputScene,
      DebugOverlayScene,
    ],
  };
}
