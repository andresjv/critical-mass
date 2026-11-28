// Small side-view soldier parts shared by the background infantry and vehicle gunners:
// a torso in regional camo with webbing and a tiny team patch, and a head with the
// region's headgear (helmet, boonie hat, shemagh, parka hood, or space helmet).
import type { SoldierPalette } from '../theme/factions';
import type { Xform } from './shapes';

/** Torso box with camo blotches, chest webbing and a tiny team patch on the shoulder. */
export function trooperTorso(t: Xform, pal: SoldierPalette, x: number, y: number, w: number, h: number, alpha = 1): void {
  t.rect(pal.uniform, x, y, w, h, alpha);
  if (pal.camo !== null) {
    t.ellipse(pal.camo, x + w * 0.3, y + h * 0.35, w * 0.22, h * 0.12, 0.9 * alpha);
    t.ellipse(pal.camo, x + w * 0.7, y + h * 0.75, w * 0.2, h * 0.1, 0.9 * alpha);
  }
  // Webbing / vest band and belt.
  t.rect(pal.gear, x, y + h * 0.42, w, h * 0.18, alpha);
  t.rect(pal.dark, x, y + h - h * 0.12, w, h * 0.12, alpha);
  // Team patch: a speck on the upper arm, the only team colour on the soldier.
  const p = Math.max(0.9, w * 0.3);
  t.rect(pal.patch, x + w - p - w * 0.05, y + h * 0.1, p, p * 0.9, alpha);
}

/** Head at (cx, cy) with radius r, wearing the region's headgear. */
export function trooperHead(t: Xform, pal: SoldierPalette, cx: number, cy: number, r: number, alpha = 1): void {
  switch (pal.headgear) {
    case 'helmet':
      t.circle(pal.skin, cx, cy, r, alpha);
      t.ellipse(pal.helmet, cx - r * 0.1, cy - r * 0.45, r * 1.4, r * 0.9, alpha, Math.PI, Math.PI * 2);
      t.line(pal.dark, r * 0.35, cx - r * 1.4, cy - r * 0.45, cx + r * 1.45, cy - r * 0.45, alpha);
      break;
    case 'boonie':
      t.circle(pal.skin, cx, cy, r, alpha);
      t.ellipse(pal.helmet, cx, cy - r * 0.6, r * 1.9, r * 0.38, alpha);
      t.ellipse(pal.helmet, cx - r * 0.1, cy - r * 0.9, r * 1.05, r * 0.75, alpha, Math.PI, Math.PI * 2);
      break;
    case 'shemagh':
      // Wrapped head scarf with the face showing at the front and a tail hanging behind.
      t.poly(pal.helmet, [[cx - r * 0.6, cy], [cx - r * 1.5, cy + r * 1.6], [cx - r * 0.2, cy + r * 1.2]], alpha);
      t.circle(pal.helmet, cx - r * 0.1, cy - r * 0.1, r * 1.18, alpha);
      t.ellipse(pal.skin, cx + r * 0.55, cy + r * 0.1, r * 0.55, r * 0.5, alpha);
      t.line(pal.dark, r * 0.25, cx - r * 1.1, cy - r * 0.55, cx + r * 0.9, cy - r * 0.55, 0.6 * alpha);
      break;
    case 'hood':
      t.circle(pal.helmet, cx - r * 0.1, cy, r * 1.25, alpha);
      t.ellipse(pal.gear, cx + r * 0.5, cy + r * 0.05, r * 0.75, r * 0.85, alpha);
      t.ellipse(pal.skin, cx + r * 0.6, cy + r * 0.1, r * 0.48, r * 0.55, alpha);
      break;
    case 'spacesuit':
      t.circle(pal.uniform, cx, cy, r * 1.4, alpha);
      t.ellipse(pal.helmet, cx + r * 0.5, cy, r * 0.75, r * 0.85, alpha);
      t.circle(0xffffff, cx + r * 0.75, cy - r * 0.35, r * 0.22, 0.7 * alpha);
      break;
  }
}

/** Life-support pack on the back for spacesuits; a small pack otherwise. */
export function trooperPack(t: Xform, pal: SoldierPalette, x: number, y: number, w: number, h: number, alpha = 1): void {
  t.rect(pal.headgear === 'spacesuit' ? pal.gear : pal.dark, x, y, w, h, alpha);
}
