// Projectile drawings: bullet tracers, tank shells and guided missiles. Colours come from
// FX_PALETTE; geometry is local so callers only pass position, heading and time.
import type Phaser from 'phaser';
import { FX_PALETTE as P } from '../theme/coldFront';
import { Xform } from './shapes';

/** Glowing tracer streak along its velocity: soft halo, bright core, fading tail. */
export function drawTracer(
  g: Phaser.GameObjects.Graphics, x: number, y: number, vx: number, vy: number, enemy: boolean,
): void {
  const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp;
  const len = enemy ? 26 : 34;
  const col = enemy ? P.tracerEnemy : P.tracerPlayer, core = enemy ? P.tracerEnemyCore : P.tracerPlayerCore;
  // Tail: three segments fading out behind the head.
  for (let k = 0; k < 3; k++) {
    const a = 0.45 - k * 0.14, from = len * (k / 3), to = len * ((k + 1) / 3);
    g.lineStyle(5 - k, col, a);
    g.lineBetween(x - ux * from, y - uy * from, x - ux * to, y - uy * to);
  }
  g.fillStyle(col, 0.35); g.fillCircle(x, y, 6);
  g.lineStyle(3, core, 1); g.lineBetween(x, y, x - ux * 10, y - uy * 10);
  g.fillStyle(core, 1); g.fillCircle(x, y, 2.2);
}

/** Tank round: brass shell with a hot glowing base and a short smoky wake. */
export function drawShell(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, time: number): void {
  const t = new Xform(g, x, y, ang);
  t.line(P.smokeLite, 4, -8, 0, -30, 0, 0.18);
  t.line(P.shellGlow, 3, -6, 0, -16, 0, 0.5);
  t.circle(P.shellGlow, -5, 0, 5 + Math.sin(time * 0.05) * 1, 0.35);
  t.poly(P.shellBody, [[-6, -3], [4, -3], [9, 0], [4, 3], [-6, 3]]);
  t.poly(P.shellTip, [[4, -3], [9, 0], [4, 3]]);
  t.rect(P.shellGlow, -7, -2.5, 2, 5);
}

/**
 * Guided missile (SAM / heat-seeker), nose along `ang`. White body, red nose cone,
 * tail fins and a flickering exhaust plume. `scale` 1 ≈ 30 px long.
 */
export function drawMissile(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, time: number, scale = 1,
): void {
  const t = new Xform(g, x, y, ang, 1, scale);
  const fl = 0.75 + 0.25 * Math.sin(time * 0.06) + 0.1 * Math.sin(time * 0.13);
  // Exhaust plume.
  t.ellipse(P.exhaust, -20 - 8 * fl, 0, 12 * fl, 5, 0.35);
  t.poly(P.exhaust, [[-15, -3], [-15, 3], [-15 - 18 * fl, 0]], 0.85);
  t.poly(P.exhaustCore, [[-15, -1.6], [-15, 1.6], [-15 - 9 * fl, 0]], 1);
  // Fins.
  t.poly(P.missileFin, [[-14, -3], [-8, -3], [-15, -9]]);
  t.poly(P.missileFin, [[-14, 3], [-8, 3], [-15, 9]]);
  // Body, stripe, nose, canards.
  t.rect(P.missileBody, -15, -3, 24, 6);
  t.rect(P.missileStripe, -15, 1.5, 24, 1.5, 0.7);
  t.rect(P.missileNose, -2, -3, 2.5, 6);
  t.poly(P.missileNose, [[9, -3], [16, 0], [9, 3]]);
  t.poly(P.missileFin, [[4, -3], [7, -3], [4, -6]]);
  t.poly(P.missileFin, [[4, 3], [7, 3], [4, 6]]);
}
