// Small helpers for drawing vector models in local coordinates with Phaser Graphics.
import type Phaser from 'phaser';
import { pts } from '../effects/points';

/** Maps local model coordinates to screen space: translate, optional mirror, rotate, scale. */
export class Xform {
  private c: number;
  private s: number;
  constructor(
    public readonly g: Phaser.GameObjects.Graphics,
    private readonly ox: number,
    private readonly oy: number,
    rot = 0,
    private readonly flip = 1,
    private readonly scale = 1,
  ) {
    this.c = Math.cos(rot);
    this.s = Math.sin(rot);
  }

  p(x: number, y: number): { x: number; y: number } {
    const lx = x * this.flip * this.scale, ly = y * this.scale;
    return { x: this.ox + lx * this.c - ly * this.s, y: this.oy + lx * this.s + ly * this.c };
  }

  poly(color: number, points: [number, number][], alpha = 1): void {
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(pts(points.map(([x, y]) => this.p(x, y))), true);
  }

  rect(color: number, x: number, y: number, w: number, h: number, alpha = 1): void {
    this.poly(color, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], alpha);
  }

  circle(color: number, x: number, y: number, r: number, alpha = 1): void {
    const q = this.p(x, y);
    this.g.fillStyle(color, alpha);
    this.g.fillCircle(q.x, q.y, r * this.scale);
  }

  line(color: number, width: number, x1: number, y1: number, x2: number, y2: number, alpha = 1): void {
    const a = this.p(x1, y1), b = this.p(x2, y2);
    this.g.lineStyle(width * this.scale, color, alpha);
    this.g.lineBetween(a.x, a.y, b.x, b.y);
  }

  /** Ellipse approximated by a polygon (keeps rotation/mirroring correct). */
  ellipse(color: number, cx: number, cy: number, rx: number, ry: number, alpha = 1, from = 0, to = Math.PI * 2): void {
    const n = 14;
    const ptsList: [number, number][] = [];
    const full = to - from >= Math.PI * 2 - 1e-6;
    if (!full) ptsList.push([cx, cy]);
    for (let i = 0; i <= n; i++) {
      const a = from + ((to - from) * i) / n;
      ptsList.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    this.poly(color, ptsList, alpha);
  }
}
