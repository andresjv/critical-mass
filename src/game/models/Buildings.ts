// Biome buildings. Every kind fills the same box (w × h above the ground) so the
// collision rules never change between levels; only the look does.
// `base` is screen-Y at or below the lowest ground under the footprint; the ground is
// drawn afterwards and buries everything below the surface.
import type Phaser from 'phaser';
import type { Biome } from '../theme/biomes';
import { hash01 } from '../effects/Backdrop';

export function drawBuilding(
  g: Phaser.GameObjects.Graphics, sx: number, top: number, base: number,
  w: number, h: number, b: Biome, seed: number, time: number,
): void {
  const pal = b.building;
  const L = sx - w / 2, R = sx + w / 2;
  const lit = (i: number): number => (hash01(seed + i * 3.3) > 0.3 ? pal.windowAlpha : pal.windowAlpha * 0.25);

  switch (pal.kind) {
    case 'block': {
      g.fillStyle(pal.wall, 1); g.fillRect(L, top, w, base - top);
      g.lineStyle(1.5, pal.edge, 0.9); g.strokeRect(L, top, w, base - top);
      g.fillStyle(pal.edge, 1); g.fillRect(L - 3, top - 4, w + 6, 6);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        g.fillStyle(pal.window, lit(r * 3 + c)); g.fillRect(sx - 30 + c * 24, top + 20 + r * 38, 14, 20);
      }
      break;
    }
    case 'cabin': {
      // Stilt cabin over the marsh: tin roof, plank walls, porch, lit window.
      const floor = top + h * 0.72;
      g.lineStyle(5, pal.edge, 1);
      for (const px of [L + 8, sx - 12, sx + 12, R - 8]) g.lineBetween(px, floor, px, base);
      g.lineStyle(2, pal.edge, 0.8);
      g.lineBetween(L + 8, floor + 8, sx - 12, base - 6); g.lineBetween(sx + 12, base - 6, R - 8, floor + 8);
      g.fillStyle(pal.edge, 1); g.fillRect(L - 6, floor, w + 12, 6); // porch deck
      const wallTop = top + h * 0.3;
      g.fillStyle(pal.wall, 1); g.fillRect(L + 4, wallTop, w - 8, floor - wallTop);
      g.lineStyle(1, pal.edge, 0.7);
      for (let y = wallTop + 8; y < floor; y += 8) g.lineBetween(L + 4, y, R - 4, y);
      g.fillStyle(pal.edge, 1); g.fillRect(sx + 10, wallTop + 22, 16, floor - wallTop - 22); // door
      g.fillStyle(pal.window, lit(1)); g.fillRect(L + 14, wallTop + 16, 18, 14);
      g.lineStyle(1.5, pal.edge, 1); g.strokeRect(L + 14, wallTop + 16, 18, 14);
      // Corrugated tin roof, a bit crooked.
      g.fillStyle(pal.roof, 1);
      g.fillTriangle(L - 8, wallTop + 2, R + 8, wallTop - 4, sx - 4, top);
      g.lineStyle(1, 0x000000, 0.2);
      for (let k = 1; k < 6; k++) g.lineBetween(sx - 4, top, L - 8 + ((w + 16) * k) / 6, wallTop + 2 - (6 * k) / 6);
      // Stovepipe.
      g.fillStyle(pal.edge, 1); g.fillRect(R - 22, top + 6, 6, 16);
      break;
    }
    case 'adobe': {
      // Two-storey mud-brick house: rounded parapets, wooden vigas, arched windows.
      const upperL = L + 6, upperW = w * 0.55, step = top + h * 0.3;
      g.fillStyle(pal.wall, 1);
      g.fillRoundedRect(upperL, top, upperW, step - top + 10, 6);
      g.fillRoundedRect(L, step, w, base - step, 6);
      g.fillStyle(pal.edge, 0.7);
      g.fillRect(upperL + 3, top + 2, upperW - 6, 3); g.fillRect(L + 3, step + 2, w - 6, 3);
      g.fillStyle(pal.roof, 1);
      for (let k = 0; k < 4; k++) g.fillRect(L + 6 + k * 22, step + 10, 8, 4);
      for (let k = 0; k < 3; k++) g.fillRect(upperL + 6 + k * 16, top + 10, 6, 4);
      const arch = (x: number, y: number, ww: number, hh: number, a: number): void => {
        g.fillStyle(pal.window, a);
        g.fillRect(x, y + ww / 2, ww, hh - ww / 2);
        g.fillCircle(x + ww / 2, y + ww / 2, ww / 2);
      };
      arch(upperL + 12, top + 18, 12, 20, lit(1));
      arch(L + 14, step + 26, 13, 22, lit(2));
      arch(R - 30, step + 26, 13, 22, lit(3));
      arch(sx - 8, base - 50, 16, 40, 0.95); // doorway
      break;
    }
    case 'logcabin': {
      // Log cabin under a thick snow-covered A-frame roof, smoke-stained chimney.
      const wallTop = top + h * 0.38;
      g.fillStyle(pal.wall, 1); g.fillRect(L + 4, wallTop, w - 8, base - wallTop);
      for (let y = wallTop + 4; y < base; y += 9) {
        g.fillStyle(pal.edge, 1); g.fillRect(L + 4, y + 6, w - 8, 2);
        g.fillStyle(pal.wall, 1); g.fillCircle(L + 4, y + 4, 4.5); g.fillCircle(R - 4, y + 4, 4.5);
        g.fillStyle(pal.edge, 1); g.fillCircle(L + 4, y + 4, 2); g.fillCircle(R - 4, y + 4, 2);
      }
      g.fillStyle(pal.window, lit(1)); g.fillRect(L + 16, wallTop + 20, 18, 16);
      g.fillStyle(pal.window, lit(2)); g.fillRect(R - 34, wallTop + 20, 18, 16);
      g.lineStyle(2, pal.edge, 1); g.strokeRect(L + 16, wallTop + 20, 18, 16); g.strokeRect(R - 34, wallTop + 20, 18, 16);
      g.fillStyle(pal.edge, 1); g.fillRect(sx - 8, base - 46, 16, 46);
      g.fillStyle(0x6a5a50, 1); g.fillRect(R - 26, top + 4, 12, 30); // chimney
      g.fillStyle(pal.edge, 1); g.fillTriangle(L - 10, wallTop + 4, R + 10, wallTop + 4, sx, top + 8);
      g.fillStyle(pal.roof, 1); g.fillTriangle(L - 12, wallTop, R + 12, wallTop, sx, top);
      g.fillStyle(pal.roof, 1); g.fillRect(R - 28, top, 16, 6); // snow on chimney
      // Icicles.
      g.fillStyle(0xdff0ff, 0.9);
      for (let k = 0; k < 7; k++) { const ix = L - 8 + k * 16; g.fillTriangle(ix, wallTop, ix + 4, wallTop, ix + 2, wallTop + 6 + hash01(seed + k) * 6); }
      break;
    }
    case 'dome': {
      // Pressurised dome on a module, airlock, comms mast with blinking beacon.
      const modTop = top + h * 0.55;
      g.fillStyle(pal.edge, 1); g.fillRect(L, modTop, w, base - modTop);
      g.fillStyle(pal.wall, 1); g.fillRect(L + 2, modTop + 2, w - 4, base - modTop);
      g.fillStyle(pal.roof, 1);
      g.beginPath(); g.slice(sx, modTop + 2, w * 0.46, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.lineStyle(1.5, pal.edge, 0.8);
      const rr = w * 0.46;
      for (let k = 1; k < 4; k++) { // horizontal panel seams across the dome
        const dy = (rr * k) / 4, half = Math.sqrt(rr * rr - dy * dy);
        g.lineBetween(sx - half, modTop + 2 - dy, sx + half, modTop + 2 - dy);
      }
      g.lineBetween(sx, modTop + 2 - rr, sx, modTop + 2);
      for (let k = 0; k < 4; k++) { g.fillStyle(pal.window, lit(k)); g.fillCircle(L + 14 + k * 21, modTop + 18, 5); }
      g.fillStyle(pal.edge, 1); g.fillRoundedRect(sx - 10, base - 40, 20, 40, 6); // airlock
      g.lineStyle(2, pal.edge, 1); g.lineBetween(R - 12, modTop, R - 12, top);
      g.lineBetween(R - 20, top + 12, R - 4, top + 12);
      const blink = Math.sin(time * 0.006 + seed) > 0.4;
      g.fillStyle(0xff3322, blink ? 1 : 0.25); g.fillCircle(R - 12, top, 3);
      break;
    }
  }
}
