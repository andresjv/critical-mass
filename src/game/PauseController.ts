// Shared pause for every stage: toggles on the pause input (Esc / P / pad Start),
// freezes the scene's clock and tweens, quiets the music, and shows the React pause overlay.
import Phaser from 'phaser';
import { gameUi } from '../state/gameUi';
import { setMusicPaused } from './audio/audioCtx';

export class PauseController {
  paused = false;
  private prevHeld = false;

  constructor(private readonly scene: Phaser.Scene) {
    scene.events.once('shutdown', () => this.set(false));
  }

  /** Call at the top of update() with the raw pause input. Returns true while paused. */
  update(pauseHeld: boolean): boolean {
    const just = pauseHeld && !this.prevHeld;
    this.prevHeld = pauseHeld;
    if (just) this.set(!this.paused);
    return this.paused;
  }

  private set(paused: boolean): void {
    if (paused === this.paused && gameUi.paused === paused) return;
    this.paused = paused;
    gameUi.paused = paused;
    setMusicPaused(paused);
    this.scene.time.paused = paused;
    if (paused) this.scene.tweens.pauseAll(); else this.scene.tweens.resumeAll();
  }
}
