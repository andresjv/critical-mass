import type Phaser from 'phaser';

/** Phaser 4 types `fillPoints` as Vector2[], but it only reads x/y. */
export function pts(p: { x: number; y: number }[]): Phaser.Math.Vector2[] {
  return p as unknown as Phaser.Math.Vector2[];
}
