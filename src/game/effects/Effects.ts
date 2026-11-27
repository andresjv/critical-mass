// Effects — visual-only explosions, debris, smoke, burning wrecks, falling planes and
// muzzle flashes for the Attack Run. Positions are world-X + screen-Y so things that hit
// the ground scroll with it. No gameplay state lives here.
import Phaser from 'phaser';
import type { Rng } from '../../state/rng';
import { FX_PALETTE as C } from '../theme/coldFront';
import { ATTACK_RUN } from '../../state/tuning';
import { pts } from './points';
import { settings } from '../../state/settings';
import { drawJet } from '../models/Vehicles';
import type { JetPalette } from '../theme/factions';

type PartKind = 'debris' | 'spark' | 'smoke' | 'fire';

interface Particle {
  wx: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  kind: PartKind; rot: number; spin: number; color: number;
}
interface Blast { wx: number; y: number; t: number; dur: number; size: number; shock: boolean }
interface Wreck { wx: number; kind: 'tank' | 'sam' | 'scorch'; w: number; h: number; smokeT: number; age: number }
interface Faller { wx: number; y: number; vx: number; vy: number; rot: number; spin: number; smokeT: number }
interface Flash { wx: number; y: number; ang: number; t: number }

const GRAVITY   = 900;  // px/s² for debris
const MAX_PARTS = 600;

export class Effects {
  private parts:   Particle[] = [];
  private blasts:  Blast[]    = [];
  private wrecks:  Wreck[]    = [];
  private fallers: Faller[]   = [];
  private flashes: Flash[]    = [];

  constructor(
    private readonly gfx: Phaser.GameObjects.Graphics,
    private readonly groundY: (wx: number) => number,
    private readonly rng: Rng,
    private readonly onFallerImpact: (wx: number, groundY: number) => void,
    private readonly fallerJet: JetPalette,
  ) {}

  private r(a: number, b: number): number { return a + this.rng.next() * (b - a); }

  private add(p: Omit<Particle, 'rot' | 'spin' | 'maxLife'> & { rot?: number; spin?: number }): void {
    if (this.parts.length >= MAX_PARTS) this.parts.shift();
    this.parts.push({ rot: 0, spin: 0, ...p, maxLife: p.life });
  }

  /** Fireball + sparks + smoke + flying debris. `shock` adds a ground shockwave ring. */
  explosion(wx: number, y: number, size: number, debris = 8, shock = false, dirt = false): void {
    this.blasts.push({ wx, y, t: 0, dur: 0.45 + size / 200, size, shock });
    for (let i = 0; i < debris; i++) {
      const palette = dirt && i % 2 === 0 ? C.dirt : C.debris;
      this.add({
        wx, y, kind: 'debris', vx: this.r(-1, 1) * size * 7, vy: -this.r(0.4, 1) * size * 9,
        life: this.r(0.9, 1.6), size: this.r(3, 7), color: this.rng.pick(palette),
        rot: this.r(0, 6), spin: this.r(-12, 12),
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = this.r(0, Math.PI * 2), s = this.r(200, 520);
      this.add({ wx, y, kind: 'spark', vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: this.r(0.25, 0.5), size: this.r(2, 3.5), color: C.fire });
    }
    for (let i = 0; i < Math.ceil(size / 12); i++) this.smokePuff(wx + this.r(-1, 1) * size * 0.4, y + this.r(-1, 1) * size * 0.3, size * 0.35, 0.25);
  }

  /** Charred, smoking remains left on the ground. */
  wreck(wx: number, kind: 'tank' | 'sam' | 'scorch', w: number, h: number): void {
    this.wrecks.push({ wx, kind, w, h, smokeT: 0, age: 0 });
  }

  /** A shot-down plane: tumbles, trails smoke and fire, explodes on the ground. */
  fallingPlane(wx: number, y: number, vxWorld: number): void {
    this.fallers.push({ wx, y, vx: vxWorld, vy: -80, rot: 0, spin: this.r(2.5, 4.5) * (this.rng.chance(0.5) ? 1 : -1), smokeT: 0 });
  }

  muzzleFlash(wx: number, y: number, ang: number): void {
    this.flashes.push({ wx, y, ang, t: 0 });
    this.smokePuff(wx + Math.cos(ang) * 8, y + Math.sin(ang) * 8, 10, 0.4);
  }

  smokePuff(wx: number, y: number, size: number, delay = 0): void {
    this.add({ wx, y, kind: 'smoke', vx: this.r(-20, 20), vy: this.r(-50, -20),
      life: this.r(1.1, 1.9) + delay, size, color: this.rng.chance(0.5) ? C.smoke : C.smokeLite });
  }

  update(dt: number, cameraX: number): void {
    for (const p of this.parts) {
      p.life -= dt;
      if (p.kind === 'debris') {
        p.vy += GRAVITY * dt;
        const gy = this.groundY(p.wx);
        if (p.y + p.vy * dt >= gy && p.vy > 0) { p.y = gy; p.vy *= -0.25; p.vx *= 0.5; p.spin *= 0.5; }
      } else if (p.kind === 'spark') {
        p.vy += 500 * dt; p.vx *= 0.97;
      } else if (p.kind === 'smoke') {
        p.vx *= 0.98; p.size += 14 * dt;
      } else {
        p.vy -= 30 * dt; p.size *= 0.97;
      }
      p.wx += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    }
    this.parts = this.parts.filter(p => p.life > 0);

    for (const b of this.blasts) b.t += dt / b.dur;
    this.blasts = this.blasts.filter(b => b.t < 1);
    for (const f of this.flashes) f.t += dt / 0.12;
    this.flashes = this.flashes.filter(f => f.t < 1);

    for (const w of this.wrecks) {
      w.age += dt;
      w.smokeT -= dt;
      if (w.kind !== 'scorch' && w.smokeT <= 0) {
        w.smokeT = this.r(0.18, 0.35);
        const gy = this.groundY(w.wx);
        this.smokePuff(w.wx + this.r(-w.w, w.w) * 0.3, gy - w.h * 0.6, 8);
        if (this.rng.chance(0.6)) this.add({ wx: w.wx + this.r(-w.w, w.w) * 0.3, y: gy - w.h * 0.5,
          kind: 'fire', vx: this.r(-10, 10), vy: this.r(-60, -30), life: this.r(0.3, 0.6), size: this.r(4, 7), color: C.fire });
      }
    }
    this.wrecks = this.wrecks.filter(w => w.wx - cameraX > -200);

    for (const f of this.fallers) {
      f.vy += ATTACK_RUN.fallerGravity * dt;
      f.wx += f.vx * dt; f.y += f.vy * dt; f.rot += f.spin * dt;
      f.smokeT -= dt;
      if (f.smokeT <= 0) {
        f.smokeT = 0.04;
        this.smokePuff(f.wx, f.y, 9);
        this.add({ wx: f.wx, y: f.y, kind: 'fire', vx: 0, vy: 0, life: 0.25, size: 7, color: C.fire });
      }
    }
    const landed = this.fallers.filter(f => f.y >= this.groundY(f.wx) - 6);
    this.fallers = this.fallers.filter(f => !landed.includes(f));
    for (const f of landed) this.onFallerImpact(f.wx, this.groundY(f.wx));
  }

  render(cameraX: number, time: number): void {
    const g = this.gfx;
    g.clear();

    // Wrecks and scorch marks (on the ground, behind everything else here).
    for (const w of this.wrecks) {
      const sx = w.wx - cameraX, gy = this.groundY(w.wx);
      if (w.kind === 'scorch') {
        g.fillStyle(C.scorch, Math.max(0, 0.7 - w.age * 0.05));
        g.fillEllipse(sx, gy + 2, w.w * 1.6, 12);
        continue;
      }
      g.fillStyle(C.scorch, 0.6); g.fillEllipse(sx, gy + 2, w.w * 1.5, 10);
      g.fillStyle(C.wreck, 1);
      if (w.kind === 'tank') {
        g.fillRect(sx - w.w / 2, gy - w.h * 0.55, w.w, w.h * 0.55);
        g.fillRect(sx - 12, gy - w.h * 0.55 - 8, 24, 8);
        g.lineStyle(4, C.wreck, 1); g.lineBetween(sx + 6, gy - w.h * 0.55 - 4, sx + 30, gy - w.h * 0.55 + 6); // drooping barrel
      } else {
        g.fillPoints(pts([
          { x: sx - w.w / 2, y: gy }, { x: sx - w.w / 2 + 6, y: gy - w.h * 0.5 },
          { x: sx + 4, y: gy - w.h * 0.35 }, { x: sx + w.w / 2, y: gy - w.h * 0.6 }, { x: sx + w.w / 2, y: gy },
        ]), true);
      }
      const flick = 0.5 + 0.5 * Math.sin(time * 0.02 + w.wx);
      g.fillStyle(C.ember, 0.5 + 0.5 * flick);
      g.fillRect(sx - 6, gy - w.h * 0.45, 4, 3); g.fillRect(sx + 8, gy - w.h * 0.3, 3, 3);
    }

    // Smoke behind fire.
    for (const p of this.parts) {
      if (p.kind !== 'smoke') continue;
      const a = Math.min(1, p.life / p.maxLife) * 0.55;
      g.fillStyle(p.color, a); g.fillCircle(p.wx - cameraX, p.y, p.size);
    }

    // Fireballs + shockwaves.
    for (const b of this.blasts) {
      const sx = b.wx - cameraX;
      const e  = 1 - (1 - b.t) * (1 - b.t);
      const fade = 1 - b.t;
      if (b.shock) {
        g.lineStyle(4, C.fireCore, fade * 0.8);
        g.strokeEllipse(sx, b.y + b.size * 0.25, b.size * 4 * e, b.size * 0.9 * e);
      }
      g.fillStyle(C.fireOuter, fade * 0.85); g.fillCircle(sx, b.y - b.size * 0.3 * e, b.size * (0.5 + 0.6 * e));
      g.fillStyle(C.fire, fade);              g.fillCircle(sx, b.y - b.size * 0.25 * e, b.size * (0.4 + 0.4 * e));
      g.fillStyle(C.fireCore, fade);          g.fillCircle(sx, b.y - b.size * 0.2 * e, b.size * 0.35 * (1 - b.t * 0.6));
      if (b.t < 0.18 && !settings.reducedFlashing) { g.fillStyle(C.flash, 1 - b.t / 0.18); g.fillCircle(sx, b.y, b.size * 0.9); }
    }

    // Falling planes: the same jet model, tumbling nose-first (they flew left).
    for (const f of this.fallers) {
      drawJet(g, f.wx - cameraX, f.y, this.fallerJet, { facing: -1, rot: f.rot, thrust: 0, time });
    }

    // Fire, sparks, debris.
    for (const p of this.parts) {
      if (p.kind === 'smoke') continue;
      const a = Math.min(1, p.life / p.maxLife);
      const sx = p.wx - cameraX;
      if (p.kind === 'debris') {
        g.fillStyle(p.color, Math.min(1, a * 2));
        const c = Math.cos(p.rot) * p.size, s = Math.sin(p.rot) * p.size;
        g.fillPoints(pts([{ x: sx - c, y: p.y - s }, { x: sx + s, y: p.y - c }, { x: sx + c, y: p.y + s }, { x: sx - s * 0.6, y: p.y + c * 0.6 }]), true);
      } else {
        g.fillStyle(p.kind === 'spark' ? C.fireCore : p.color, a); g.fillCircle(sx, p.y, p.size * (p.kind === 'fire' ? a : 1));
      }
    }

    // Muzzle flashes.
    for (const fl of this.flashes) {
      const sx = fl.wx - cameraX, a = 1 - fl.t, len = 22 * (1 - fl.t * 0.5);
      const c = Math.cos(fl.ang), s = Math.sin(fl.ang);
      g.fillStyle(C.fire, a);
      g.fillTriangle(sx - s * 7, fl.y + c * 7, sx + s * 7, fl.y - c * 7, sx + c * len, fl.y + s * len);
      g.fillStyle(C.fireCore, a); g.fillCircle(sx, fl.y, 6 * a);
    }
  }
}
