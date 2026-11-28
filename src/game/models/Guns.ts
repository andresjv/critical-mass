// Side-view guns held by the ground-assault soldier, pointing along +x in local units
// (the Xform handles aim rotation, facing and scale). Origin = the grip / hand.
import type { GunId } from '../../state/armory';
import { GUN_LOOK } from '../theme/groundAssault';
import type { Xform } from './shapes';

/** Muzzle position in local units (bullets start here). */
export const MUZZLE: Record<GunId, number> = {
  pistol: 6, smg: 9, shotgun: 13, rifle: 12, burst: 11, sniper: 17, lmg: 14, rocket: 12, laser: 13,
};

/** `tint` repaints the gun in one colour family (enemy guns are plain black). */
export function drawGun(t: Xform, id: GunId, time = 0, tint?: { body: number; accent: number }): void {
  const { body, accent } = tint ?? GUN_LOOK[id];
  switch (id) {
    case 'pistol':
      t.rect(body, -1, -2.2, 7, 2.2); t.rect(body, -1, -0.2, 1.8, 3); t.rect(accent, 0.5, -2.2, 4, 0.7);
      break;
    case 'smg':
      t.rect(body, -3, -2.4, 12, 2.6); t.rect(body, 1, 0, 1.6, 4); t.rect(body, -0.8, 0, 1.4, 2.4);
      t.rect(accent, -5, -1.8, 2.4, 1.6);
      break;
    case 'shotgun':
      t.rect(accent, -6, -1.8, 6, 2.6); t.rect(body, 0, -2.2, 13, 1.6); t.rect(body, 2, -0.8, 9, 1.2);
      t.rect(accent, 5, -1, 4, 1.8); t.rect(body, -0.6, 0, 1.4, 2.4);
      break;
    case 'rifle':
      t.rect(accent, -6, -1.8, 5, 2.8); t.rect(body, -1, -2.4, 13, 2.6);
      t.poly(body, [[2, 0], [4, 0], [5, 4], [3, 4.2]]); t.rect(body, -0.6, 0, 1.4, 2.6);
      t.rect(body, 4, -3.4, 3, 1);
      break;
    case 'burst':
      t.rect(accent, -5, -1.8, 4, 2.6); t.rect(body, -1, -2.4, 12, 2.6); t.rect(body, 2.5, 0, 1.8, 3.4);
      t.rect(accent, 1, -3.6, 4, 1.2); t.rect(body, -0.6, 0, 1.4, 2.6);
      break;
    case 'sniper':
      t.rect(accent, -7, -1.6, 6, 2.6); t.rect(body, -1, -2, 18, 1.8); t.rect(body, -1, -0.4, 6, 1.6);
      t.rect(body, 1, -4.4, 6, 1.8); t.circle(0x9ad0e8, 7, -3.5, 0.8); t.rect(body, -0.6, 0, 1.4, 2.6);
      t.line(body, 0.5, 12, 0, 13, 2.5); t.line(body, 0.5, 12, 0, 11, 2.5);
      break;
    case 'lmg':
      t.rect(accent, -6, -2, 5, 3); t.rect(body, -1, -2.8, 15, 3.4); t.rect(accent, 2, 0.4, 4.5, 3.6);
      t.rect(body, -0.6, 0.4, 1.4, 2.6); t.line(body, 0.6, 11, 0.6, 12.5, 3.6); t.line(body, 0.6, 11, 0.6, 9.5, 3.6);
      break;
    case 'rocket':
      t.rect(body, -6, -3.6, 18, 4.2); t.rect(accent, 10.5, -4, 2, 5); t.rect(accent, -6.5, -4, 1.5, 5);
      t.rect(body, 0, 0.4, 1.6, 2.6); t.rect(accent, 2, -5.2, 3, 1.6);
      break;
    case 'laser': {
      const glow = 0.6 + 0.4 * Math.sin(time * 0.012);
      t.rect(body, -5, -2, 4, 2.6); t.rect(body, -1, -2.8, 13, 3.2); t.rect(body, -0.6, 0.4, 1.4, 2.6);
      t.rect(accent, 0, -1.6, 11, 0.9, glow); t.circle(accent, 12.5, -1.2, 1.1, glow);
      break;
    }
  }
}
