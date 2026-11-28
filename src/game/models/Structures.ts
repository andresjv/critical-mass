// Per-level looks for the SAM launch site ("ground cannon") and the tall obstacle (pylon).
// Every kind keeps the same footprint and rail pivot, so gameplay and hitboxes never change;
// only the art and its idle animation do. All motion is a smooth function of time + seed.
import type Phaser from 'phaser';
import type { Biome } from '../theme/biomes';
import { pts } from '../effects/points';

export interface SamDrawOpts {
  /** Rail angle, radians (0 = right, -PI/2 = up). */
  aim: number;
  railLen: number;
  /** Launch kick, 1 → 0 just after firing. */
  kick: number;
  /** A missile is sitting on the rail. */
  loaded: boolean;
  /** Seconds. */
  t: number;
  seed: number;
}

/**
 * SAM site centred at bx with its base on the ground at gy. The launch rail pivots at
 * (bx, gy - h), the same point the scene uses to spawn missiles.
 */
export function drawSamSite(
  g: Phaser.GameObjects.Graphics, bx: number, gy: number, w: number, h: number, b: Biome, o: SamDrawOpts,
): void {
  const s = b.sam, t = o.t;
  const L = bx - w / 2, top = gy - h;
  const blink = 0.35 + 0.35 * Math.sin(t * 8 + o.seed);
  const light = (x: number, y: number) => {
    g.fillStyle(s.light, 0.18 * (blink + o.kick)); g.fillCircle(x, y, 7 + o.kick * 6);
    g.fillStyle(s.light, Math.min(1, blink + o.kick)); g.fillCircle(x, y, 2.5 + o.kick * 3);
  };

  switch (s.kind) {
    case 'bunker': {
      // Concrete bunker with a sloped front, gun slit and a spinning radar dish.
      g.fillStyle(s.trim, 1);
      g.fillPoints(pts([{ x: L - 8, y: gy + 4 }, { x: L, y: top + 8 }, { x: L + w, y: top + 8 }, { x: L + w + 8, y: gy + 4 }]), true);
      g.fillStyle(s.box, 1); g.fillRect(L + 4, top + 4, w - 8, h - 4);
      g.fillStyle(0x000000, 0.45); g.fillRect(L + 8, top + 16, w - 16, 5);
      g.lineStyle(1, 0x000000, 0.2); for (let y = top + 28; y < gy; y += 9) g.lineBetween(L + 4, y, L + w - 4, y);
      // Radar dish on a post, turning (its width follows the cosine of its heading).
      const dx = L + 4, dy = top - 10, c = Math.cos(t * 1.6 + o.seed);
      g.lineStyle(2, s.trim, 1); g.lineBetween(dx, top + 4, dx, dy);
      g.fillStyle(s.rail, 1); g.fillEllipse(dx, dy, 4 + Math.abs(c) * 16, 10);
      g.fillStyle(s.trim, 1); g.fillCircle(dx + c * 6, dy, 1.6);
      light(L + w - 8, top + 30);
      break;
    }
    case 'raft': {
      // Launcher on a log platform over the bog, draped in camo netting, lantern bobbing.
      const bob = Math.sin(t * 1.4 + o.seed) * 1.5;
      g.lineStyle(4, s.box, 1);
      for (const px of [L - 2, bx, L + w + 2]) g.lineBetween(px, top + 26 + bob, px, gy + 6);
      g.fillStyle(s.box, 1); g.fillRect(L - 10, top + 22 + bob, w + 20, 7);
      g.lineStyle(1, 0x000000, 0.3); for (let x = L - 6; x < L + w + 10; x += 8) g.lineBetween(x, top + 22 + bob, x, top + 29 + bob);
      g.fillStyle(s.rail, 1); g.fillRect(L + 6, top + 4 + bob, w - 12, 18);
      // Netting: ragged leafy triangles that sway a little.
      for (let k = 0; k < 6; k++) {
        const nx = L + 2 + k * (w - 4) / 5, sway = Math.sin(t * 2 + k) * 1.5;
        g.fillStyle(k % 2 ? s.trim : 0x3e5c2a, 1);
        g.fillTriangle(nx - 6, top + 4 + bob, nx + 6, top + 4 + bob, nx + sway, top + 16 + bob + (k % 3) * 2);
      }
      // Water ripples around the stilts.
      for (let k = 0; k < 2; k++) {
        const p = (t * 0.5 + k * 0.5) % 1;
        g.lineStyle(1, 0xbfd4b0, 0.35 * (1 - p)); g.strokeEllipse(bx, gy + 4, 20 + p * 40, 4 + p * 4);
      }
      light(L + w + 6, top + 16 + bob);
      break;
    }
    case 'sandbag': {
      // Launcher box inside a ring of stacked sandbags, camo net and a flag in the wind.
      g.fillStyle(s.box, 1); g.fillRect(L + 6, top + 2, w - 12, h - 2);
      g.fillStyle(0x000000, 0.25); g.fillRect(L + 10, top + 12, w - 20, 4);
      for (let row = 0; row < 3; row++) {
        const y = gy - 6 - row * 9, n = 5 - row, span = w + 20 - row * 8;
        for (let k = 0; k < n; k++) {
          const x = bx - span / 2 + (k + 0.5) * span / n;
          g.fillStyle(0x8a7450, 1); g.fillEllipse(x + 1, y + 1.5, span / n + 2, 10);
          g.fillStyle(s.trim, 1); g.fillEllipse(x, y, span / n + 1, 9);
        }
      }
      // Flag pole with a waving pennant.
      const fx = L - 6, fy = top - 16;
      g.lineStyle(2, 0x3a2c20, 1); g.lineBetween(fx, gy - 20, fx, fy);
      const wv = (k: number) => Math.sin(t * 5 - k * 1.2 + o.seed) * 2.5;
      g.fillStyle(s.light, 1);
      g.fillPoints(pts([{ x: fx, y: fy }, { x: fx + 8, y: fy + wv(1) }, { x: fx + 16, y: fy + 1 + wv(2) },
        { x: fx + 16, y: fy + 8 + wv(2) }, { x: fx + 8, y: fy + 8 + wv(1) }, { x: fx, y: fy + 9 }]), true);
      light(L + w - 12, top + 22);
      break;
    }
    case 'snowdome': {
      // Snow-camo shelter dome with a drift, the launcher rising from the top, heater steam.
      g.fillStyle(s.box, 1);
      g.beginPath(); g.slice(bx, gy + 2, w * 0.62, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.fillStyle(s.trim, 1); g.fillEllipse(bx - 6, gy - 2, w * 1.5, 12);
      g.fillStyle(s.trim, 1); g.fillRect(bx - 7, top, 14, h - w * 0.5);
      g.lineStyle(1.5, s.rail, 0.6);
      g.beginPath(); g.arc(bx, gy + 2, w * 0.45, Math.PI, 0, false); g.strokePath();
      g.fillStyle(0x1a2430, 0.8); g.fillRect(bx - 8, gy - 12, 16, 10);
      for (let k = 0; k < 4; k++) {
        const p = (t * 0.35 + k / 4 + o.seed * 0.1) % 1;
        g.fillStyle(0xffffff, 0.4 * (1 - p)); g.fillCircle(L + w + 2 + p * 10, gy - 16 - p * 40, 3 + p * 6);
      }
      light(bx + 12, top + 18);
      break;
    }
    case 'pod': {
      // Armoured hex pod on landing legs, ring of lights chasing around it.
      g.lineStyle(3, s.trim, 1);
      g.lineBetween(L + 6, gy - 16, L - 4, gy + 2); g.lineBetween(L + w - 6, gy - 16, L + w + 4, gy + 2);
      g.fillStyle(s.trim, 1); g.fillRect(L - 8, gy, 8, 3); g.fillRect(L + w, gy, 8, 3);
      g.fillStyle(s.box, 1);
      g.fillPoints(pts([{ x: L, y: top + 12 }, { x: L + 10, y: top }, { x: L + w - 10, y: top }, { x: L + w, y: top + 12 },
        { x: L + w, y: gy - 18 }, { x: L + w - 10, y: gy - 10 }, { x: L + 10, y: gy - 10 }, { x: L, y: gy - 18 }]), true);
      g.fillStyle(s.trim, 1); g.fillRect(L + 4, top + 20, w - 8, 4);
      for (let k = 0; k < 5; k++) {
        const on = 0.5 + 0.5 * Math.cos(t * 6 - k * 1.1);
        g.fillStyle(s.light, 0.25 + 0.75 * on); g.fillCircle(L + 8 + k * (w - 16) / 4, top + 22, 1.8);
      }
      // Antenna whip that sways.
      const ax = L + w - 8, sway = Math.sin(t * 1.5 + o.seed) * 4;
      g.lineStyle(1.5, s.trim, 1); g.lineBetween(ax, top, ax + sway, top - 22);
      light(ax + sway, top - 22);
      break;
    }
  }

  // Shared launch rail (tracks the plane) and the missile waiting on it.
  if (o.kick > 0) { g.fillStyle(0xffaa33, 0.35 * o.kick); g.fillCircle(bx, top, 30 * o.kick); }
  const c = Math.cos(o.aim), sn = Math.sin(o.aim);
  const tipX = bx + c * o.railLen, tipY = top + sn * o.railLen;
  g.lineStyle(6, s.rail, 1); g.lineBetween(bx, top, tipX, tipY);
  g.lineStyle(1.5, 0x000000, 0.25); g.lineBetween(bx - sn * 2, top + c * 2, tipX - sn * 2, tipY + c * 2);
  g.fillStyle(s.rail, 1); g.fillCircle(bx, top, 6);
  if (o.loaded) {
    const mx = bx + c * o.railLen * 0.55, my = top + sn * o.railLen * 0.55;
    const hx = c * 13, hy = sn * 13, px = -sn * 4, py = c * 4;
    g.fillStyle(0xcc4422, 1);
    g.fillPoints(pts([
      { x: mx - hx + px, y: my - hy + py }, { x: mx + hx + px, y: my + hy + py },
      { x: mx + hx * 1.5, y: my + hy * 1.5 },
      { x: mx + hx - px, y: my + hy - py }, { x: mx - hx - px, y: my - hy - py },
    ]), true);
  }
}

/** Tall obstacle centred at sx, standing on gy, `height` tall; base buried down to `base`. */
export function drawTower(
  g: Phaser.GameObjects.Graphics, sx: number, gy: number, base: number, height: number, b: Biome, t: number, seed: number,
): void {
  const p = b.pylon, top = gy - height;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3 + seed);
  const beacon = (x: number, y: number, r = 3) => {
    g.fillStyle(p.beacon, 0.15 * pulse); g.fillCircle(x, y, r * 4);
    g.fillStyle(p.beacon, 0.4 + 0.6 * pulse); g.fillCircle(x, y, r);
  };

  switch (p.kind) {
    case 'mast': {
      // Steel lattice radio mast, guy wires, pulsing beacon.
      g.lineStyle(3, p.body, 1);
      g.lineBetween(sx - 10, base, sx - 3, top); g.lineBetween(sx + 10, base, sx + 3, top);
      g.lineStyle(1.5, p.body, 1);
      for (let y = top + 10, k = 0; y < gy; y += 18, k++) {
        const hw = 3 + (7 * (y - top)) / (base - top);
        g.lineBetween(sx - hw, y, sx + hw, y + 18 * 0.9);
        g.lineBetween(sx + hw, y, sx - hw, y + 18 * 0.9);
      }
      g.lineStyle(1, p.detail, 0.6); g.lineBetween(sx, top + 30, sx - 50, gy); g.lineBetween(sx, top + 30, sx + 50, gy);
      g.fillStyle(p.detail, 1); g.fillRect(sx - 8, top + 50, 5, 14); g.fillRect(sx + 3, top + 80, 5, 14);
      beacon(sx, top - 3);
      break;
    }
    case 'watchtower': {
      // Wooden swamp watchtower on stilts; a guard paces the hut and sweeps a flashlight.
      const hutTop = top + 4, hutBot = top + 40;
      g.lineStyle(4, p.detail, 1);
      g.lineBetween(sx - 14, base, sx - 9, hutBot); g.lineBetween(sx + 14, base, sx + 9, hutBot);
      g.lineStyle(2, p.detail, 0.9);
      for (let y = hutBot + 14; y < gy - 8; y += 28) { g.lineBetween(sx - 12, y, sx + 12, y + 22); g.lineBetween(sx + 12, y, sx - 12, y + 22); }
      g.fillStyle(p.body, 1); g.fillRect(sx - 18, hutTop + 10, 36, hutBot - hutTop - 10);
      g.fillStyle(0x0d1116, 0.9); g.fillRect(sx - 14, hutTop + 14, 28, 12);
      // Guard walking back and forth inside the window.
      const gx = sx + Math.sin(t * 0.7 + seed) * 9, facing = Math.cos(t * 0.7 + seed) > 0 ? 1 : -1;
      g.fillStyle(0x1a1408, 1); g.fillCircle(gx, hutTop + 18, 2.6); g.fillRect(gx - 3.5, hutTop + 21, 7, 5);
      // Flashlight cone.
      const ang = 0.6 + Math.sin(t * 0.9 + seed) * 0.5;
      const fx = gx + facing * 4, fy = hutTop + 22;
      g.fillStyle(p.beacon, 0.1);
      g.fillTriangle(fx, fy, fx + facing * Math.cos(ang - 0.18) * 120, fy + Math.sin(ang - 0.18) * 120, fx + facing * Math.cos(ang + 0.18) * 120, fy + Math.sin(ang + 0.18) * 120);
      g.fillStyle(p.detail, 1); g.fillRect(sx - 20, hutBot - 2, 40, 4);
      g.fillTriangle(sx - 24, hutTop + 12, sx + 24, hutTop + 12, sx, hutTop - 8);
      // Lantern swinging from the roof edge.
      const sw = Math.sin(t * 1.7 + seed) * 0.4, lx = sx + 22 + Math.sin(sw) * 10, ly = hutTop + 12 + Math.cos(sw) * 10;
      g.lineStyle(1, p.detail, 1); g.lineBetween(sx + 22, hutTop + 12, lx, ly);
      beacon(lx, ly + 2, 2.5);
      break;
    }
    case 'derrick': {
      // Oil derrick with a crown block, a rocking pumpjack at its foot and a flickering gas flare.
      g.lineStyle(3, p.body, 1);
      g.lineBetween(sx - 16, base, sx - 2, top + 8); g.lineBetween(sx + 16, base, sx + 2, top + 8);
      g.lineStyle(1.5, p.body, 1);
      for (let y = top + 16; y < gy; y += 16) {
        const hw = 2 + (14 * (y - top)) / (base - top), hw2 = 2 + (14 * (y + 16 - top)) / (base - top);
        g.lineBetween(sx - hw, y, sx + hw2, y + 16); g.lineBetween(sx + hw, y, sx - hw2, y + 16);
        g.lineBetween(sx - hw, y, sx + hw, y);
      }
      g.fillStyle(p.detail, 1); g.fillRect(sx - 6, top, 12, 9);
      // Flare stack on the crown.
      const fl = 0.7 + 0.3 * Math.sin(t * 17 + seed) * Math.sin(t * 7.3);
      g.fillStyle(0xff7a1a, 0.9); g.fillTriangle(sx - 3, top, sx + 3, top, sx + Math.sin(t * 4) * 2, top - 12 * fl);
      g.fillStyle(0xffe08a, 1); g.fillTriangle(sx - 1.5, top, sx + 1.5, top, sx, top - 6 * fl);
      // Pumpjack: walking beam rocking on a samson post, horse head dipping into the well.
      const px = sx + 34, py = gy - 22, rock = Math.sin(t * 1.6 + seed) * 0.32;
      g.lineStyle(3, p.detail, 1); g.lineBetween(px - 6, gy, px, py); g.lineBetween(px + 6, gy, px, py);
      const hx = px + Math.cos(rock) * 18, hy = py + Math.sin(rock) * 18;
      const tx = px - Math.cos(rock) * 14, ty = py - Math.sin(rock) * 14;
      g.lineStyle(4, p.body, 1); g.lineBetween(tx, ty, hx, hy);
      g.fillStyle(p.beacon, 1); g.fillCircle(hx, hy, 4);
      g.lineStyle(1, p.detail, 1); g.lineBetween(hx + 3, hy, hx + 3, gy - 2);
      g.fillStyle(p.detail, 1); g.fillCircle(tx, ty + 4, 5);
      break;
    }
    case 'turbine': {
      // Wind turbine: tapered pole, nacelle, three blades turning; red night light.
      g.fillStyle(p.detail, 1);
      g.fillPoints(pts([{ x: sx - 6, y: base }, { x: sx + 6, y: base }, { x: sx + 3, y: top + 18 }, { x: sx - 3, y: top + 18 }]), true);
      g.fillStyle(p.body, 0.25); g.fillRect(sx + 1, top + 18, 3, base - top - 18);
      const hx = sx, hy = top + 16;
      g.fillStyle(p.detail, 1); g.fillRoundedRect(hx - 10, hy - 5, 20, 10, 4);
      const rot = t * 1.9 + seed;
      for (let k = 0; k < 3; k++) {
        const a = rot + (k * Math.PI * 2) / 3, c = Math.cos(a), sn = Math.sin(a);
        g.fillStyle(p.detail, 1);
        g.fillPoints(pts([
          { x: hx - sn * 3, y: hy + c * 3 }, { x: hx + c * 58 - sn * 1, y: hy + sn * 58 + c * 1 },
          { x: hx + c * 58 + sn * 1, y: hy + sn * 58 - c * 1 }, { x: hx + c * 10 + sn * 4, y: hy + sn * 10 - c * 4 },
        ]), true);
        g.lineStyle(1, p.body, 0.5); g.lineBetween(hx, hy, hx + c * 58, hy + sn * 58);
      }
      g.fillStyle(p.body, 1); g.fillCircle(hx, hy, 4);
      beacon(hx, hy - 7, 2.5);
      break;
    }
    case 'antenna': {
      // Truss comms tower: dish slowly sweeping, signal rings pulsing outward.
      g.lineStyle(2.5, p.body, 1);
      g.lineBetween(sx - 8, base, sx - 4, top + 30); g.lineBetween(sx + 8, base, sx + 4, top + 30);
      g.lineStyle(1.2, p.body, 0.9);
      for (let y = top + 34; y < gy; y += 14) { g.lineBetween(sx - 7, y, sx + 7, y + 12); g.lineBetween(sx + 7, y, sx - 7, y + 12); }
      g.lineStyle(2, p.detail, 1); g.lineBetween(sx, top + 30, sx, top);
      const c = Math.cos(t * 0.8 + seed);
      g.fillStyle(p.detail, 1); g.fillEllipse(sx, top + 26, 6 + Math.abs(c) * 26, 14);
      g.fillStyle(p.body, 1); g.fillEllipse(sx + c * 3, top + 26, 3 + Math.abs(c) * 16, 8);
      g.lineStyle(1, p.detail, 1); g.lineBetween(sx, top + 26, sx + c * 12, top + 18);
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.6 + k / 3) % 1;
        g.lineStyle(1.5, p.beacon, 0.6 * (1 - q)); g.strokeCircle(sx, top, 6 + q * 40);
      }
      beacon(sx, top, 2.5);
      break;
    }
  }
}
