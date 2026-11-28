// Ragdoll — a killed soldier goes limp: a little Verlet body (head, neck, hip, knees, feet,
// elbows, hands) built from the rig's last pose, thrown by the shot or blast, then tumbling under
// gravity and settling on the ground and on crates. Drawn with the same trooper parts and palette.
import type Phaser from 'phaser';
import type { SoldierPalette } from '../theme/factions';
import { drawArmor, type RigJoints } from './SoldierRig';
import { Xform } from './shapes';
import { trooperHead, trooperPack, trooperTorso } from './Trooper';

type P = { x: number; y: number };
interface Pt { x: number; y: number; px: number; py: number }
interface Stick { a: number; b: number; len: number }

// Point indices.
const HEAD = 0, NECK = 1, HIP = 2, KNEE0 = 3, FOOT0 = 4, KNEE1 = 5, FOOT1 = 6, ELB0 = 7, HAND0 = 8, ELB1 = 9, HAND1 = 10;

export interface RagdollWorld {
  gravity: number;
  ground(x: number): number;
  /** Solid boxes (crates, sandbags): a point inside is pushed out of the nearest side. */
  boxes: readonly { x: number; w: number; top: number; bottom: number }[];
}

export class Ragdoll {
  private pts: Pt[];
  private sticks: Stick[] = [];
  t = 0;
  private still = 0;

  constructor(
    j: RigJoints,
    /** Throw velocity px/s (upper body gets the full push, legs less). */
    vx: number, vy: number,
    readonly pal: SoldierPalette,
    readonly k: number,
    readonly face: 1 | -1,
    readonly pack: boolean,
    readonly armor: 0 | 1 | 2,
    dt: number,
  ) {
    const list: P[] = [j.head, j.neck, j.hip, j.knee[0], j.foot[0], j.knee[1], j.foot[1], j.elbow[0], j.hand[0], j.elbow[1], j.hand[1]];
    const upper = new Set([HEAD, NECK, ELB0, HAND0, ELB1, HAND1]);
    this.pts = list.map((q, i) => {
      const f = upper.has(i) ? 1 : i === HIP ? 0.75 : 0.45;
      return { x: q.x, y: q.y, px: q.x - vx * f * dt, py: q.y - vy * f * dt };
    });
    const link = (a: number, b: number) => this.sticks.push({ a, b, len: Math.hypot(list[a].x - list[b].x, list[a].y - list[b].y) || 1 });
    link(HEAD, NECK); link(NECK, HIP); link(HEAD, HIP);
    link(HIP, KNEE0); link(KNEE0, FOOT0); link(HIP, KNEE1); link(KNEE1, FOOT1);
    link(NECK, ELB0); link(ELB0, HAND0); link(NECK, ELB1); link(ELB1, HAND1);
    // Soft limits so limbs don't fold through the body: keep feet and hands a bit away.
    link(HIP, FOOT0); link(HIP, FOOT1);
  }

  /** Extra shove (another bullet or a blast hitting the body). */
  push(vx: number, vy: number, dt: number): void {
    for (const p of this.pts) { p.px -= vx * dt; p.py -= vy * dt; }
    this.still = 0;
  }

  get resting(): boolean { return this.still > 0.6; }

  center(): P { return { x: this.pts[HIP].x, y: this.pts[HIP].y }; }

  step(dt: number, w: RagdollWorld): void {
    this.t += dt;
    if (this.resting) return;
    let motion = 0;
    for (const p of this.pts) {
      const vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + w.gravity * dt * dt;
      motion += Math.abs(vx) + Math.abs(vy);
    }
    for (let it = 0; it < 6; it++) {
      for (const s of this.sticks) {
        const a = this.pts[s.a], b = this.pts[s.b];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3;
        // Hip-to-foot links only stop the leg folding shut (they may stretch).
        if ((s.b === FOOT0 || s.b === FOOT1) && s.a === HIP && d > s.len * 0.7) continue;
        const diff = (d - s.len) / d / 2;
        a.x += dx * diff; a.y += dy * diff; b.x -= dx * diff; b.y -= dy * diff;
      }
      for (const p of this.pts) this.collide(p, w);
    }
    this.still = motion / this.pts.length < 0.25 ? this.still + dt : 0;
  }

  private collide(p: Pt, w: RagdollWorld): void {
    const gy = w.ground(p.x) - 2;
    if (p.y > gy) {
      p.y = gy;
      p.px = p.x - (p.x - p.px) * 0.6; // ground friction
      p.py = p.y + (p.y - p.py) * 0.2;
    }
    for (const b of w.boxes) {
      if (p.x <= b.x || p.x >= b.x + b.w || p.y <= b.top || p.y >= b.bottom) continue;
      const dl = p.x - b.x, dr = b.x + b.w - p.x, dt = p.y - b.top;
      if (dt <= dl && dt <= dr) { p.y = b.top; p.px = p.x - (p.x - p.px) * 0.6; }
      else if (dl < dr) p.x = b.x; else p.x = b.x + b.w;
    }
  }

  draw(g: Phaser.GameObjects.Graphics, camX: number, alpha: number): void {
    const P = this.pts, k = this.k, pal = this.pal;
    const sx = (i: number) => P[i].x - camX;
    const limb = (a: number, b: number, c: number, color: number, w1: number, w2: number) => {
      g.lineStyle(w1 * k, color, alpha); g.lineBetween(sx(a), P[a].y, sx(b), P[b].y);
      g.lineStyle(w2 * k, color, alpha); g.lineBetween(sx(b), P[b].y, sx(c), P[c].y);
    };
    const boot = (knee: number, foot: number) => {
      const dx = P[foot].x - P[knee].x, dy = P[foot].y - P[knee].y, d = Math.hypot(dx, dy) || 1;
      const ux = -dy / d * this.face, uy = dx / d * this.face; // across the shin, toward the toes
      g.lineStyle(1.5 * k, pal.dark, alpha);
      g.lineBetween(sx(foot) - ux * 0.4 * k, P[foot].y - uy * 0.4 * k, sx(foot) + ux * 1.3 * k, P[foot].y + uy * 1.3 * k);
    };
    // Far limbs, torso, head, near limbs (same colours as the live rig).
    limb(HIP, KNEE1, FOOT1, pal.dark, 2.3, 2.1); boot(KNEE1, FOOT1);
    limb(NECK, ELB1, HAND1, pal.dark, 1.6, 1.5);
    const hip = P[HIP], neck = P[NECK];
    const rot = Math.atan2(neck.x - hip.x, -(neck.y - hip.y));
    const tl = new Xform(g, hip.x - camX, hip.y, rot, this.face, k);
    if (this.pack) trooperPack(tl, pal, -4.2, -6.8, 2, 5, alpha);
    trooperTorso(tl, pal, -2.5, -7, 5, 7.2, alpha);
    if (this.armor !== 0) drawArmor(tl, pal, this.armor, alpha);
    const head = P[HEAD];
    const hrot = Math.atan2(head.x - neck.x, -(head.y - neck.y));
    const ht = new Xform(g, head.x - camX, head.y, hrot, this.face, k);
    trooperHead(ht, pal, 0.4, 0, 2, alpha);
    limb(HIP, KNEE0, FOOT0, pal.uniform === pal.dark ? pal.gear : pal.dark, 2.3, 2.1); boot(KNEE0, FOOT0);
    limb(NECK, ELB0, HAND0, pal.uniform, 1.8, 1.7);
    g.fillStyle(pal.skin, alpha); g.fillCircle(sx(HAND0), P[HAND0].y, 0.55 * k);
  }
}
