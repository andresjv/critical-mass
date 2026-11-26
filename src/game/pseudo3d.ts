// pseudo3d.ts — perspective projection helpers for the Silo Strike scene.
// All units: world coordinates are abstract (not canvas px), screen coords are canvas px.

import Phaser from 'phaser';

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

/** Canvas Y of the horizon line. */
export const HORIZON_Y = 240;

/** Perspective focal length (world units). Increase = narrower FOV. */
const FOV = 500;

/** Z distance to the silo face (world units). */
export const SILO_Z = 1200;

/** World X positions of the five silos (left-to-right). */
export const SILO_X = [-600, -300, 0, 300, 600] as const;

/** World Y height of each silo's window (world units above ground). */
export const SILO_WINDOW_Y = [150, 220, 180, 220, 150] as const;

/** Full world height of a silo (world units). */
export const SILO_WORLD_H = 380;

/** Half-width of a silo in world units. */
export const SILO_WORLD_HW = 50;

export interface ScreenPoint {
  sx: number;
  sy: number;
  scale: number; // FOV/z — multiply world sizes to get screen sizes
}

/** Project a world point (worldX, worldY, worldZ) onto the canvas. */
export function project(worldX: number, worldY: number, worldZ: number): ScreenPoint {
  const z = Math.max(worldZ, 1);
  const scale = FOV / z;
  return {
    sx: CANVAS_W / 2 + worldX * scale,
    sy: HORIZON_Y  - worldY * scale,
    scale,
  };
}

/** Draw the perspective ground plane (strips of alternating colour). */
export function drawGround(gfx: Phaser.GameObjects.Graphics): void {
  const strips = 12;
  for (let i = 0; i < strips; i++) {
    const t0 = i / strips;
    const t1 = (i + 1) / strips;
    const y0 = HORIZON_Y + (CANVAS_H - HORIZON_Y) * t0;
    const y1 = HORIZON_Y + (CANVAS_H - HORIZON_Y) * t1;
    // Trapezoid width expands toward the bottom.
    const halfW0 = (CANVAS_W / 2) * t0;
    const halfW1 = (CANVAS_W / 2) * t1;
    const color = i % 2 === 0 ? 0x1a2a1a : 0x142014;
    gfx.fillStyle(color, 1);
    gfx.beginPath();
    gfx.moveTo(CANVAS_W / 2 - halfW0, y0);
    gfx.lineTo(CANVAS_W / 2 + halfW0, y0);
    gfx.lineTo(CANVAS_W / 2 + halfW1, y1);
    gfx.lineTo(CANVAS_W / 2 - halfW1, y1);
    gfx.closePath();
    gfx.fillPath();
  }

  // Perspective guide lines radiating from vanishing point.
  gfx.lineStyle(1, 0x2a4a2a, 0.5);
  const lines = 7;
  for (let i = 0; i <= lines; i++) {
    const t = i / lines;
    const bx = CANVAS_W * t;
    gfx.lineBetween(CANVAS_W / 2, HORIZON_Y, bx, CANVAS_H);
  }
}

/** Draw the sky gradient above the horizon. */
export function drawSky(gfx: Phaser.GameObjects.Graphics): void {
  // Simple two-tone sky.
  gfx.fillStyle(0x0a1020, 1);
  gfx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

  // Horizon glow.
  gfx.fillStyle(0x1a3040, 0.6);
  gfx.fillRect(0, HORIZON_Y - 30, CANVAS_W, 30);
}
