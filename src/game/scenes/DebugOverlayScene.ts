// DebugOverlayScene — stub kept for scene registration compatibility.
// The debug overlay is now rendered by React <DebugOverlay /> (toggled via F1 in InputScene).
import Phaser from 'phaser';

export class DebugOverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DebugOverlayScene', active: false });
  }
}
