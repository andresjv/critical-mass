// Biome buildings. Every kind fills the same box (w × h above the ground) so the
// collision rules never change between levels; only the look does.
// `base` is screen-Y at or below the lowest ground under the footprint; the ground is
// drawn afterwards and buries everything below the surface.
//
// Each building is lived in: a resident walks up, goes inside, switches a light on, moves
// past the windows, switches it off again and walks away. Other windows fade on and off
// on their own slow timers, chimneys smoke, lanterns swing. All motion is a smooth function
// of time and the building's seed, so it is deterministic and costs no state.
import type Phaser from 'phaser';
import type { Biome } from '../theme/biomes';
import { hash01 } from '../effects/Backdrop';

interface Win { x: number; y: number; w: number; h: number; shape: 'rect' | 'arch' | 'circle' }

/** Length of one resident visit (s), before the per-building variation. */
const VISIT_SECS = 13;
/** Seconds a window light takes to fade on or off. */
const LIGHT_FADE = 0.45;
/** Resident height, px. */
const PERSON_H = 24;

const smooth = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export function drawBuilding(
  g: Phaser.GameObjects.Graphics, sx: number, top: number, base: number,
  w: number, h: number, b: Biome, seed: number, time: number,
  /** Screen-Y of the ground surface at screen-X, so the residents walk on slopes. */
  groundAt: (x: number) => number = () => top + h,
): void {
  const pal = b.building;
  const t = time / 1000;
  const L = sx - w / 2, R = sx + w / 2;
  const ground = top + h;

  // ── Resident's visit: walk in → light on → move around inside → light off → walk out ──
  const period = VISIT_SECS + hash01(seed * 1.7) * 6;
  const u = (((t + hash01(seed) * period) % period) + period) % period / period;
  /** 0..1 how much the resident's own light is on. */
  const ownLight = smooth((u - 0.30) * period / LIGHT_FADE) * (1 - smooth((u - 0.74) * period / LIGHT_FADE));
  const inside = u > 0.3 && u < 0.76;
  /** Fraction of the inside walk (moves back and forth past the windows). */
  const roam = 0.5 - 0.5 * Math.cos(((u - 0.3) / 0.46) * Math.PI * 2);

  /** Ambient light for window i: on/off on a slow per-window timer, faded smoothly. */
  const ambient = (i: number): number => {
    const per = 7 + hash01(seed + i * 5.1) * 9;
    const k = (t + hash01(seed + i * 2.3) * per) / per;
    const n = Math.floor(k);
    const on = (m: number) => (hash01(seed + i * 7.7 + m * 13.1) > 0.55 ? 1 : 0);
    const f = Math.min(1, ((k - n) * per) / LIGHT_FADE);
    return on(n - 1) + (on(n) - on(n - 1)) * smooth(f);
  };

  const wins: Win[] = [];
  let doorX = sx, onPorch = false, porchY = ground;
  /** Index into wins of the window the resident lights. */
  let ownWin = 0;

  const glass = (wn: Win, a: number): void => {
    const fill = (c: number, al: number, grow = 0) => {
      g.fillStyle(c, al);
      if (wn.shape === 'circle') g.fillCircle(wn.x + wn.w / 2, wn.y + wn.h / 2, wn.w / 2 + grow);
      else if (wn.shape === 'arch') {
        g.fillRect(wn.x - grow, wn.y + wn.w / 2, wn.w + grow * 2, wn.h - wn.w / 2 + grow);
        g.fillCircle(wn.x + wn.w / 2, wn.y + wn.w / 2, wn.w / 2 + grow);
      } else g.fillRect(wn.x - grow, wn.y - grow, wn.w + grow * 2, wn.h + grow * 2);
    };
    fill(0x0d1116, 0.85);
    if (a > 0.01) {
      fill(pal.lamp, a * 0.14, 5);
      fill(pal.lamp, a * Math.max(0.8, pal.windowAlpha));
    }
  };

  /** Draws all windows (light levels) plus the resident's silhouette behind their window. */
  const drawWindows = (): void => {
    wins.forEach((wn, i) => {
      const a = Math.max(ambient(i) * 0.9, i === ownWin ? ownLight : 0);
      glass(wn, a);
    });
    if (!inside || !wins.length) return;
    // Silhouette passes whichever window it is in front of (only visible against a lit one).
    const span = wins.reduce((m, wn) => ({ lo: Math.min(m.lo, wn.x), hi: Math.max(m.hi, wn.x + wn.w) }), { lo: 1e9, hi: -1e9 });
    const px = span.lo + 4 + roam * (span.hi - span.lo - 8);
    wins.forEach((wn, i) => {
      if (px < wn.x + 3 || px > wn.x + wn.w - 3 || wn.shape === 'circle') return;
      const a = Math.max(ambient(i) * 0.9, i === ownWin ? ownLight : 0);
      if (a < 0.2) return;
      const bob = Math.sin(t * 9) * 0.6;
      g.fillStyle(pal.person, 0.85 * a);
      g.fillCircle(px, wn.y + wn.h * 0.42 + bob, Math.min(3, wn.w * 0.18));
      g.fillRect(px - 4, wn.y + wn.h * 0.62 + bob, 8, wn.h * 0.38 - bob);
    });
  };

  /** Rising smoke puffs from (x, y). */
  const smoke = (x: number, y: number): void => {
    for (let k = 0; k < 5; k++) {
      const p = (t * 0.22 + k / 5 + hash01(seed + 3)) % 1;
      const r = 4 + p * 9;
      g.fillStyle(pal.smoke, 0.32 * (1 - p));
      g.fillCircle(x + p * 18 + Math.sin(t * 1.3 + k) * 3, y - p * 55, r);
    }
  };

  switch (pal.kind) {
    case 'block': {
      // Concrete office block: parapet, window grid, entrance canopy, sweeping roof searchlight.
      g.fillStyle(pal.wall, 1); g.fillRect(L, top, w, base - top);
      g.lineStyle(1.5, pal.edge, 0.9); g.strokeRect(L, top, w, base - top);
      g.fillStyle(pal.edge, 1); g.fillRect(L - 3, top - 4, w + 6, 6);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) wins.push({ x: sx - 31 + c * 24, y: top + 16 + r * 30, w: 14, h: 18, shape: 'rect' });
      ownWin = 7;
      drawWindows();
      // Entrance.
      g.fillStyle(0x0d1116, 0.9); g.fillRect(sx - 9, ground - 26, 18, 26);
      g.fillStyle(pal.lamp, 0.25 + 0.6 * ownLight); g.fillRect(sx - 7, ground - 24, 14, 22);
      g.fillStyle(pal.edge, 1); g.fillRect(sx - 14, ground - 30, 28, 4);
      // Rooftop searchlight sweeping slowly across the sky.
      const ang = -Math.PI / 2 + Math.sin(t * 0.6 + seed) * 0.9;
      const lx = R - 14, ly = top - 6;
      g.fillStyle(pal.lamp, 0.08);
      g.fillTriangle(lx, ly, lx + Math.cos(ang - 0.12) * 220, ly + Math.sin(ang - 0.12) * 220, lx + Math.cos(ang + 0.12) * 220, ly + Math.sin(ang + 0.12) * 220);
      g.fillStyle(pal.edge, 1); g.fillRect(lx - 4, ly - 2, 8, 6);
      g.fillStyle(pal.lamp, 0.9); g.fillCircle(lx, ly - 2, 2.5);
      break;
    }
    case 'cabin': {
      // Stilt cabin over the marsh: tin roof, plank walls, porch, swinging lantern, stovepipe smoke.
      const floor = top + h * 0.72;
      onPorch = true; porchY = floor; doorX = sx + 18;
      g.lineStyle(5, pal.edge, 1);
      for (const px of [L + 8, sx - 12, sx + 12, R - 8]) g.lineBetween(px, floor, px, base);
      g.lineStyle(2, pal.edge, 0.8);
      g.lineBetween(L + 8, floor + 8, sx - 12, base - 6); g.lineBetween(sx + 12, base - 6, R - 8, floor + 8);
      g.fillStyle(pal.edge, 1); g.fillRect(L - 6, floor, w + 12, 6); // porch deck
      const wallTop = top + h * 0.3;
      g.fillStyle(pal.wall, 1); g.fillRect(L + 4, wallTop, w - 8, floor - wallTop);
      g.lineStyle(1, pal.edge, 0.7);
      for (let y = wallTop + 8; y < floor; y += 8) g.lineBetween(L + 4, y, R - 4, y);
      wins.push({ x: L + 12, y: wallTop + 14, w: 18, h: 16, shape: 'rect' }, { x: sx - 10, y: wallTop + 14, w: 14, h: 16, shape: 'rect' });
      drawWindows();
      g.lineStyle(1.5, pal.edge, 1); for (const wn of wins) g.strokeRect(wn.x, wn.y, wn.w, wn.h);
      // Door swings open while the resident goes in / comes out.
      const open = Math.max(smooth((u - 0.24) / 0.04) * (1 - smooth((u - 0.31) / 0.04)), smooth((u - 0.74) / 0.04) * (1 - smooth((u - 0.81) / 0.04)));
      g.fillStyle(0x0d1116, 1); g.fillRect(sx + 10, wallTop + 22, 16, floor - wallTop - 22);
      g.fillStyle(pal.lamp, 0.5 * ownLight); g.fillRect(sx + 10, wallTop + 22, 16, floor - wallTop - 22);
      g.fillStyle(pal.edge, 1); g.fillRect(sx + 10, wallTop + 22, 16 * (1 - open * 0.8), floor - wallTop - 22);
      // Corrugated tin roof, a bit crooked.
      g.fillStyle(pal.roof, 1);
      g.fillTriangle(L - 8, wallTop + 2, R + 8, wallTop - 4, sx - 4, top);
      g.lineStyle(1, 0x000000, 0.2);
      for (let k = 1; k < 6; k++) g.lineBetween(sx - 4, top, L - 8 + ((w + 16) * k) / 6, wallTop + 2 - (6 * k) / 6);
      // Stovepipe and smoke.
      g.fillStyle(pal.edge, 1); g.fillRect(R - 22, top + 6, 6, 16);
      smoke(R - 19, top + 4);
      // Lantern swinging under the eave.
      const sw = Math.sin(t * 1.8 + seed) * 0.35;
      const hx = L + 2, hy = wallTop + 4, lx = hx + Math.sin(sw) * 14, ly = hy + Math.cos(sw) * 14;
      g.lineStyle(1, pal.edge, 1); g.lineBetween(hx, hy, lx, ly);
      g.fillStyle(pal.lamp, 0.15); g.fillCircle(lx, ly + 3, 12);
      g.fillStyle(pal.lamp, 0.95); g.fillRect(lx - 2.5, ly, 5, 7);
      break;
    }
    case 'adobe': {
      // Two-storey mud-brick house: rounded parapets, wooden vigas, arched windows, laundry line.
      const upperL = L + 6, upperW = w * 0.55, step = top + h * 0.3;
      g.fillStyle(pal.wall, 1);
      g.fillRoundedRect(upperL, top, upperW, step - top + 10, 6);
      g.fillRoundedRect(L, step, w, base - step, 6);
      g.fillStyle(pal.edge, 0.7);
      g.fillRect(upperL + 3, top + 2, upperW - 6, 3); g.fillRect(L + 3, step + 2, w - 6, 3);
      g.fillStyle(pal.roof, 1);
      for (let k = 0; k < 4; k++) g.fillRect(L + 6 + k * 22, step + 10, 8, 4);
      for (let k = 0; k < 3; k++) g.fillRect(upperL + 6 + k * 16, top + 10, 6, 4);
      wins.push(
        { x: upperL + 12, y: top + 18, w: 12, h: 20, shape: 'arch' },
        { x: L + 12, y: step + 24, w: 13, h: 22, shape: 'arch' },
        { x: R - 28, y: step + 24, w: 13, h: 22, shape: 'arch' },
      );
      ownWin = 1;
      drawWindows();
      // Doorway glows when someone is home.
      g.fillStyle(0x1a0f08, 1);
      g.fillRect(sx - 8, ground - 32, 16, 32); g.fillCircle(sx, ground - 32, 8);
      g.fillStyle(pal.lamp, 0.35 * ownLight);
      g.fillRect(sx - 8, ground - 32, 16, 32); g.fillCircle(sx, ground - 32, 8);
      // Laundry line from the upper storey to a pole, cloths swaying in the breeze.
      const ax = upperL + upperW, ay = step - 6, bx = R + 14, by = step - 2;
      g.lineStyle(2, pal.roof, 1); g.lineBetween(bx, by - 4, bx, ground);
      g.lineStyle(1, 0x2a1a10, 0.8); g.lineBetween(ax, ay, bx, by);
      const cloth = [0xd84a3a, 0xf2e6c8, 0x3a7ac8];
      for (let k = 0; k < 3; k++) {
        const f = (k + 0.7) / 3.4, cx = ax + (bx - ax) * f, cy = ay + (by - ay) * f + 2;
        const sway = Math.sin(t * 2.4 + k * 1.3 + seed) * 3;
        g.fillStyle(cloth[k], 1);
        g.fillTriangle(cx - 4, cy, cx + 4, cy, cx + 4 + sway, cy + 11);
        g.fillTriangle(cx - 4, cy, cx - 4 + sway, cy + 11, cx + 4 + sway, cy + 11);
      }
      break;
    }
    case 'logcabin': {
      // Log cabin under a thick snow-covered A-frame roof, chimney smoke, icicles.
      const wallTop = top + h * 0.38;
      g.fillStyle(pal.wall, 1); g.fillRect(L + 4, wallTop, w - 8, base - wallTop);
      for (let y = wallTop + 4; y < base; y += 9) {
        g.fillStyle(pal.edge, 1); g.fillRect(L + 4, y + 6, w - 8, 2);
        g.fillStyle(pal.wall, 1); g.fillCircle(L + 4, y + 4, 4.5); g.fillCircle(R - 4, y + 4, 4.5);
        g.fillStyle(pal.edge, 1); g.fillCircle(L + 4, y + 4, 2); g.fillCircle(R - 4, y + 4, 2);
      }
      wins.push({ x: L + 16, y: wallTop + 20, w: 18, h: 16, shape: 'rect' }, { x: R - 34, y: wallTop + 20, w: 18, h: 16, shape: 'rect' });
      ownWin = 1;
      drawWindows();
      g.lineStyle(2, pal.edge, 1); for (const wn of wins) { g.strokeRect(wn.x, wn.y, wn.w, wn.h); g.lineBetween(wn.x + wn.w / 2, wn.y, wn.x + wn.w / 2, wn.y + wn.h); }
      g.fillStyle(0x1a120c, 1); g.fillRect(sx - 8, ground - 34, 16, 34);
      g.fillStyle(pal.lamp, 0.4 * ownLight); g.fillRect(sx - 8, ground - 34, 16, 34);
      g.fillStyle(0x6a5a50, 1); g.fillRect(R - 26, top + 4, 12, 30); // chimney
      g.fillStyle(pal.edge, 1); g.fillTriangle(L - 10, wallTop + 4, R + 10, wallTop + 4, sx, top + 8);
      g.fillStyle(pal.roof, 1); g.fillTriangle(L - 12, wallTop, R + 12, wallTop, sx, top);
      g.fillStyle(pal.roof, 1); g.fillRect(R - 28, top, 16, 6); // snow on chimney
      smoke(R - 20, top - 2);
      g.fillStyle(0xdff0ff, 0.9);
      for (let k = 0; k < 7; k++) { const ix = L - 8 + k * 16; g.fillTriangle(ix, wallTop, ix + 4, wallTop, ix + 2, wallTop + 6 + hash01(seed + k) * 6); }
      break;
    }
    case 'dome': {
      // Pressurised dome on a module, airlock, comms mast with pulsing beacon.
      const modTop = top + h * 0.55;
      g.fillStyle(pal.edge, 1); g.fillRect(L, modTop, w, base - modTop);
      g.fillStyle(pal.wall, 1); g.fillRect(L + 2, modTop + 2, w - 4, base - modTop);
      g.fillStyle(pal.roof, 1);
      g.beginPath(); g.slice(sx, modTop + 2, w * 0.46, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.lineStyle(1.5, pal.edge, 0.8);
      const rr = w * 0.46;
      for (let k = 1; k < 4; k++) {
        const dy = (rr * k) / 4, half = Math.sqrt(rr * rr - dy * dy);
        g.lineBetween(sx - half, modTop + 2 - dy, sx + half, modTop + 2 - dy);
      }
      g.lineBetween(sx, modTop + 2 - rr, sx, modTop + 2);
      for (let k = 0; k < 4; k++) wins.push({ x: L + 9 + k * 21, y: modTop + 13, w: 10, h: 10, shape: 'circle' });
      ownWin = 2;
      drawWindows();
      // Airlock: light turns green while cycling.
      g.fillStyle(pal.edge, 1); g.fillRoundedRect(sx - 10, ground - 40, 20, 40, 6);
      const cycling = Math.max(smooth((u - 0.22) / 0.03) * (1 - smooth((u - 0.32) / 0.03)), smooth((u - 0.72) / 0.03) * (1 - smooth((u - 0.82) / 0.03)));
      g.fillStyle(cycling > 0.5 ? 0x44ff88 : 0xff5533, 0.9); g.fillCircle(sx, ground - 44, 2.5);
      g.lineStyle(2, pal.edge, 1); g.lineBetween(R - 12, modTop, R - 12, top);
      g.lineBetween(R - 20, top + 12, R - 4, top + 12);
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + seed);
      g.fillStyle(0xff3322, 0.15 * pulse); g.fillCircle(R - 12, top, 9);
      g.fillStyle(0xff3322, 0.35 + 0.65 * pulse); g.fillCircle(R - 12, top, 3);
      break;
    }
  }

  // ── The resident outside: walks in from the left to the door, later out to the right ──
  let wx: number | null = null, facing = 1, alpha = 1;
  const startX = onPorch ? L - 2 : L - 46, endX = onPorch ? R + 2 : R + 46;
  if (u < 0.26) {
    const f = u / 0.26; wx = startX + (doorX - startX) * f; alpha = smooth(f * 5) * (1 - smooth((f - 0.9) * 10));
  } else if (u > 0.78) {
    const f = (u - 0.78) / 0.22; wx = doorX + (endX - doorX) * f; alpha = smooth((f - 0.02) * 10) * (1 - smooth((f - 0.8) * 5));
  }
  if (wx !== null && alpha > 0.02) drawPerson(g, wx, onPorch ? porchY : groundAt(wx) - 1, facing, t * 7 + seed, pal.person, alpha, pal.kind === 'dome');
}

/** Small walking figure, feet at (x, y). `phase` drives the stride; astronauts bounce. */
function drawPerson(
  g: Phaser.GameObjects.Graphics, x: number, y: number, facing: number, phase: number,
  color: number, alpha: number, astronaut: boolean,
): void {
  const k = PERSON_H / 24;
  const stride = Math.sin(phase);
  const bounce = astronaut ? Math.abs(Math.sin(phase * 0.5)) * 5 * k : Math.abs(stride) * 1.2 * k;
  const hipY = y - 10 * k - bounce, hipX = x;
  g.lineStyle(2.6 * k, color, alpha);
  // Legs swing from the hip.
  g.lineBetween(hipX, hipY, hipX + stride * 4 * k, y - bounce);
  g.lineBetween(hipX, hipY, hipX - stride * 4 * k, y - bounce);
  // Body, arms counter-swinging.
  const neckY = hipY - 9 * k;
  g.lineStyle(4 * k, color, alpha); g.lineBetween(hipX, hipY, hipX + facing * 0.6 * k, neckY);
  g.lineStyle(2 * k, color, alpha);
  g.lineBetween(hipX, neckY + 2 * k, hipX - stride * 3.5 * k, neckY + 8 * k);
  g.lineBetween(hipX, neckY + 2 * k, hipX + stride * 3.5 * k, neckY + 8 * k);
  g.fillStyle(color, alpha); g.fillCircle(hipX + facing * k, neckY - 3 * k, (astronaut ? 3.6 : 2.8) * k);
  if (astronaut) { g.fillStyle(0x2a3a55, alpha); g.fillCircle(hipX + facing * 2 * k, neckY - 3 * k, 1.8 * k); }
}
