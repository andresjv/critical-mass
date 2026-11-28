// Crossfade between views without going through black: grab the current frame as an image,
// then lay it over the next view and fade it out. Also carries where the jet was on screen at
// the end of the takeoff cutscene so the attack run can pick it up from the same spot.
import type Phaser from 'phaser';

const W = 1280, H = 720;

let pending: HTMLImageElement | null = null;
let counter = 0;

/** Capture what is on screen now; `then` runs once the image is ready (next rendered frame). */
export function captureFrame(scene: Phaser.Scene, then: () => void): void {
  scene.game.renderer.snapshot(snap => {
    pending = snap instanceof HTMLImageElement ? snap : null;
    then();
  });
}

/** Lay the captured frame over `scene` and fade it out over `ms` (no-op if nothing was captured). */
export function fadeFromCapture(scene: Phaser.Scene, depth: number, ms: number): void {
  const img = pending;
  pending = null;
  if (!img) return;
  const key = `__xfade${counter++}`;
  scene.textures.addImage(key, img);
  const im = scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(depth);
  scene.tweens.add({
    targets: im, alpha: 0, duration: ms, ease: 'Sine.easeInOut',
    onComplete: () => { im.destroy(); scene.textures.remove(key); },
  });
}

/** Jet position on screen (px) and nose-up pitch (rad) as the takeoff cutscene ends. */
export interface JetHandoff { x: number; y: number; pitch: number }
let handoff: JetHandoff | null = null;
export function setJetHandoff(h: JetHandoff): void { handoff = h; }
/** Read and clear the handoff (null when the run didn't start from a takeoff). */
export function takeJetHandoff(): JetHandoff | null { const h = handoff; handoff = null; return h; }
