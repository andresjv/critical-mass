// Side-view guns held by the ground-assault soldier, pointing along +x in local units
// (the Xform handles aim rotation, facing and scale). Origin = the grip / hand.
// t21: more detailed: receiver, barrel, muzzle device, sights, magazine, stock, grip, trigger
// guard and a highlight edge, all from the gun's two colours (or the tint).
import type { GunId } from '../../state/armory';
import { GUN_LOOK } from '../theme/groundAssault';
import type { Xform } from './shapes';

/** Muzzle position in local units (bullets start here). */
export const MUZZLE: Record<GunId, number> = {
  pistol: 6, smg: 9, shotgun: 13, rifle: 12, burst: 11, sniper: 17, lmg: 14, rocket: 12, laser: 13,
};

/** Mixes a colour toward white (f > 0) or black (f < 0). */
function shade(c: number, f: number): number {
  const ch = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}

/** Pistol grip with a trigger guard (origin = the hand). */
function grip(t: Xform, body: number, dark: number, h = 2.6): void {
  t.poly(body, [[-0.8, -0.2], [0.8, -0.2], [0.5, h], [-1.1, h]]);
  t.line(dark, 0.35, 0.9, 0.1, 2.2, 0.1);
  t.line(dark, 0.35, 2.2, 0.1, 2.0, 1.1);
  t.line(dark, 0.3, 2.0, 1.1, 0.8, 1.2);
}

/** `tint` repaints the gun in one colour family (enemy guns are plain black). */
export function drawGun(t: Xform, id: GunId, time = 0, tint?: { body: number; accent: number }): void {
  const { body, accent } = tint ?? GUN_LOOK[id];
  const hi = shade(body, 0.28), dark = shade(body, -0.45), metal = shade(accent, 0.15);
  switch (id) {
    case 'pistol':
      t.rect(body, -1, -2.4, 7, 2.3);                 // slide
      t.rect(hi, -1, -2.4, 7, 0.45);                  // top edge
      t.rect(dark, 1.6, -1.9, 1.6, 0.6);              // ejection port
      for (let i = 0; i < 3; i++) t.rect(dark, -0.6 + i * 0.5, -2.0, 0.22, 1.3); // serrations
      t.rect(body, 5.6, -2.9, 0.5, 0.5); t.rect(body, -0.7, -2.9, 0.7, 0.5); // sights
      t.rect(accent, -0.8, -0.2, 6.2, 0.6);           // frame
      grip(t, body, dark, 3.2);
      t.rect(accent, -0.7, 0.6, 1.2, 1.8);            // grip panel
      break;
    case 'smg':
      t.rect(body, -3, -2.5, 11.5, 2.7);              // receiver
      t.rect(hi, -3, -2.5, 11.5, 0.45);
      t.rect(dark, 8.5, -1.9, 0.8, 1.5);              // muzzle
      t.rect(dark, 2.5, -2.0, 2.0, 0.7);              // ejection port
      t.rect(body, 1.2, 0, 1.6, 4.4); t.rect(metal, 1.2, 3.8, 1.6, 0.6); // magazine + base plate
      t.rect(body, 6.6, -3.2, 0.6, 0.8); t.rect(body, -2.2, -3.2, 1.2, 0.8); // sights
      t.rect(accent, -6, -2.0, 3.2, 0.7); t.rect(accent, -6, -0.6, 3.2, 0.7); t.rect(accent, -6.4, -2.0, 0.8, 2.1); // wire stock
      grip(t, body, dark);
      break;
    case 'shotgun':
      t.poly(accent, [[-7, -1.4], [-1, -2.1], [-0.6, 0.6], [-6.6, 1.4]]); // stock
      t.rect(dark, -7.1, -1.5, 0.6, 2.9);             // butt pad
      t.rect(body, -1, -2.4, 4.5, 2.6);               // receiver
      t.rect(hi, -1, -2.4, 4.5, 0.45);
      t.rect(body, 3.5, -2.3, 9.5, 1.3);              // barrel
      t.rect(hi, 3.5, -2.3, 9.5, 0.35);
      t.rect(dark, 3.5, -1.0, 8.5, 0.9);              // magazine tube
      t.rect(accent, 5, -1.3, 4.2, 1.7);              // pump
      for (let i = 0; i < 4; i++) t.rect(shade(accent, -0.3), 5.4 + i * 1, -1.3, 0.3, 1.7);
      t.circle(metal, 12.6, -2.6, 0.35);              // bead sight
      grip(t, body, dark, 2.2);
      break;
    case 'rifle':
      t.poly(accent, [[-7, -1.8], [-1.2, -2.2], [-1.2, 0.6], [-6.4, 1.4]]); // stock
      t.rect(dark, -7.1, -1.9, 0.6, 3.3);
      t.rect(body, -1.2, -2.6, 8.5, 2.8);             // receiver
      t.rect(hi, -1.2, -2.6, 8.5, 0.45);
      t.rect(dark, 1.5, -2.0, 2.2, 0.7);              // ejection port
      t.rect(accent, 4.6, -2.3, 4.8, 2.1);            // handguard
      for (let i = 0; i < 3; i++) t.rect(shade(accent, -0.3), 5.2 + i * 1.4, -1.8, 0.8, 0.5);
      t.rect(body, 9.4, -1.9, 2.0, 0.8);              // barrel
      t.rect(dark, 11.2, -2.1, 0.9, 1.2);             // flash hider
      t.poly(body, [[2, 0.2], [4, 0.2], [5, 4.2], [3.1, 4.4]]); // curved magazine
      t.line(dark, 0.3, 2.6, 1.4, 4.1, 1.2);
      t.rect(body, 4.2, -3.6, 2.8, 1.0); t.rect(body, 8.6, -3.3, 0.5, 1.0); // carry rail + front sight
      grip(t, body, dark);
      break;
    case 'burst':
      t.poly(accent, [[-5.6, -2.0], [-1.0, -2.2], [-1.0, 0.4], [-5.2, 1.0]]); // stock
      t.rect(body, -1.0, -2.6, 9.0, 2.8);
      t.rect(hi, -1.0, -2.6, 9.0, 0.45);
      t.rect(dark, 1.4, -2.0, 1.8, 0.7);
      t.rect(accent, 4.4, -2.4, 4.4, 2.2);            // handguard
      t.rect(body, 8.6, -1.9, 1.6, 0.8); t.rect(dark, 10.1, -2.1, 0.9, 1.2);
      t.rect(body, 2.4, 0.2, 1.8, 3.6); t.rect(metal, 2.4, 3.5, 1.8, 0.5); // magazine
      t.rect(dark, 0.6, -4.0, 4.4, 1.4); t.rect(accent, 0.8, -3.8, 4.0, 1.0); // optic
      t.circle(0x9ad0e8, 4.8, -3.3, 0.35);
      grip(t, body, dark);
      break;
    case 'sniper':
      t.poly(accent, [[-7.4, -1.6], [-1.2, -2.0], [-0.6, 0.4], [-3.2, 0.6], [-4.2, 1.6], [-7.0, 1.6]]); // thumbhole stock
      t.rect(dark, -7.5, -1.7, 0.6, 3.3);
      t.rect(body, -1.2, -2.2, 6.6, 2.2);             // receiver
      t.rect(hi, -1.2, -2.2, 6.6, 0.4);
      t.rect(metal, 2.4, -1.6, 1.2, 0.4); t.circle(metal, 3.8, -1.4, 0.45); // bolt handle
      t.rect(body, 5.4, -1.9, 11.0, 1.1);             // long barrel
      t.rect(hi, 5.4, -1.9, 11.0, 0.3);
      t.rect(dark, 15.8, -2.2, 1.4, 1.7);             // muzzle brake
      t.rect(body, -1, -0.2, 6, 1.4);                 // stock body under receiver
      t.rect(body, 1, -4.6, 6, 1.8); t.rect(dark, 0.2, -4.8, 1.4, 2.2); t.rect(dark, 6.4, -4.9, 1.4, 2.4); // scope
      t.rect(body, 2.6, -2.8, 0.6, 0.6); t.rect(body, 5.0, -2.8, 0.6, 0.6); // scope rings
      t.circle(0x9ad0e8, 7.6, -3.7, 0.8);
      t.rect(dark, 2.2, 0, 1.5, 1.8);                 // magazine
      t.line(body, 0.5, 12, 0, 13, 2.5); t.line(body, 0.5, 12, 0, 11, 2.5); // bipod
      grip(t, body, dark, 2.2);
      break;
    case 'lmg':
      t.poly(accent, [[-6.4, -2.2], [-1, -2.6], [-1, 0.8], [-6.0, 1.4]]); // stock
      t.rect(dark, -6.5, -2.3, 0.6, 3.8);
      t.rect(body, -1, -2.9, 9.5, 3.4);               // receiver
      t.rect(hi, -1, -2.9, 9.5, 0.5);
      t.rect(dark, -0.2, -3.6, 6.0, 0.8);             // feed cover
      t.rect(body, 8.4, -2.2, 5.0, 1.4);              // barrel
      for (let i = 0; i < 4; i++) t.rect(dark, 8.8 + i * 1.1, -2.0, 0.5, 1.0); // cooling holes
      t.rect(dark, 13.2, -2.4, 1.0, 1.8);
      t.rect(metal, 10.0, -3.8, 1.2, 0.5);            // carry handle
      t.rect(accent, 1.8, 0.5, 4.8, 3.8); t.rect(shade(accent, -0.3), 1.8, 0.5, 4.8, 0.6); // ammo box
      for (let i = 0; i < 3; i++) t.circle(metal, 1.0 - i * 0.4, 1.0 + i * 0.6, 0.35); // belt
      t.line(body, 0.6, 11, 0.6, 12.5, 3.6); t.line(body, 0.6, 11, 0.6, 9.5, 3.6); // bipod
      grip(t, body, dark);
      break;
    case 'rocket':
      t.rect(body, -6, -3.8, 18, 4.4);                // tube
      t.rect(hi, -6, -3.8, 18, 0.6);
      t.rect(accent, 10.5, -4.2, 2, 5.2); t.rect(accent, -6.5, -4.2, 1.5, 5.2); // end caps
      t.rect(shade(accent, -0.3), 3, -3.8, 0.6, 4.4); t.rect(shade(accent, -0.3), -2, -3.8, 0.6, 4.4); // bands
      t.rect(dark, 1.6, -5.6, 3.4, 1.8); t.rect(accent, 1.8, -5.4, 3.0, 1.2); // sight
      t.rect(body, 4, 0.6, 1.4, 2.4);                 // front grip
      grip(t, body, dark, 2.8);
      break;
    case 'laser': {
      const glow = 0.6 + 0.4 * Math.sin(time * 0.012);
      t.poly(body, [[-5.2, -2.2], [-1, -2.6], [-1, 0.4], [-4.6, 0.8]]);
      t.rect(body, -1, -3.0, 13, 3.4);
      t.rect(hi, -1, -3.0, 13, 0.5);
      t.rect(dark, 2, -0.2, 6, 0.5);
      t.rect(accent, 0, -1.8, 11, 0.9, glow);         // energy channel
      for (let i = 0; i < 4; i++) t.rect(accent, 1.5 + i * 2.4, -3.4, 1.0, 0.5, glow); // vents
      t.rect(dark, 11.6, -2.4, 1.4, 2.2);
      t.circle(accent, 12.5, -1.2, 1.1, glow);
      t.rect(dark, 2.8, 0.4, 1.6, 2.2);               // cell
      grip(t, body, dark);
      break;
    }
  }
}
