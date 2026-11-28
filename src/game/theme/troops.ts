// Troops — what the infantry and vehicle crews wear on each level. Both sides wear real,
// region-appropriate military kit; the only team colour is a tiny shoulder/helmet patch
// (blue = us, red = enemy). Read via biome.troops.
import type { LevelId } from '../../state/levels';
import type { Headgear } from './hangarLocal';
import { BLUE_PATCH, RED, type SoldierPalette } from './factions';

export interface Troops { blue: SoldierPalette; red: SoldierPalette }

const SKIN = [0xd9a77c, 0xb98a62, 0x8a5a3a, 0xe0b090];

function kit(
  uniform: number, dark: number, camo: number | null, helmet: number, headgear: Headgear,
  gear: number, patch: number, skin = SKIN[0],
): SoldierPalette {
  return { uniform, dark, camo, helmet, headgear, gear, patch, skin, gun: 0x1a1a1a };
}

export const TROOPS: Record<LevelId, Troops> = {
  // Rainy temperate front: woodland camo vs. grey-green flecked camo, steel helmets.
  coldfront: {
    blue: kit(0x4a5634, 0x323a22, 0x2a301c, 0x3c4630, 'helmet', 0x5a5838, BLUE_PATCH),
    red:  kit(0x5e6250, 0x3e4234, 0x7a6a48, 0x484a3c, 'helmet', 0x3a3a30, RED, SKIN[3]),
  },
  // Swamp: jungle-green camo and boonie hats vs. brown-olive with helmets.
  swamp: {
    blue: kit(0x4a5a32, 0x323e22, 0x6b7a44, 0x5a6a3a, 'boonie', 0x3a3424, BLUE_PATCH, SKIN[1]),
    red:  kit(0x5a4c30, 0x3c3220, 0x3a4626, 0x4a4030, 'helmet', 0x2e2a1c, RED),
  },
  // Desert: tan fatigues and shemaghs vs. khaki chocolate-chip camo with helmets.
  desert: {
    blue: kit(0xc2a274, 0x8e7450, 0xa4855a, 0xd8c8a0, 'shemagh', 0x7a6440, BLUE_PATCH, SKIN[1]),
    red:  kit(0xa8966a, 0x7a6a48, 0x6a5034, 0x9a8a62, 'helmet', 0x5a4c34, RED, SKIN[2]),
  },
  // Arctic: white parkas with fur hoods vs. grey-white snow camo with white helmets.
  snow: {
    blue: kit(0xe4ebf1, 0xb4c0cc, null, 0xe4ebf1, 'hood', 0x8a96a2, BLUE_PATCH, SKIN[3]),
    red:  kit(0xc8cdd2, 0x969ea8, 0x8c96a0, 0xdfe4e8, 'helmet', 0x5a6068, RED),
  },
  // Moon: pressure suits for everyone; ours white with gold visors, theirs grey with dark visors.
  moon: {
    blue: kit(0xeef0f4, 0xb8bcc4, null, 0xe8b83c, 'spacesuit', 0xc8ccd4, BLUE_PATCH),
    red:  kit(0x9aa0aa, 0x6a707a, null, 0x3a2a2a, 'spacesuit', 0x7a808a, RED),
  },
};

/** A soldier's own look: the side's kit with small personal differences. */
export interface SoldierLook { pal: SoldierPalette; scale: number; pack: boolean }

function shade(c: number, f: number): number {
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((c >> s) & 0xff) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Same uniform and side, but each soldier differs a little: skin, a lighter or darker
 *  shade of kit, sometimes a soft hat instead of a helmet, height, with or without a pack.
 *  Deterministic from `seed`, so a soldier keeps their look. */
export function soldierLook(base: SoldierPalette, seed: number): SoldierLook {
  const r = (k: number) => hash(seed * 13.7 + k);
  const suit = base.headgear === 'spacesuit';
  const f = 0.9 + r(1) * 0.2;
  let headgear = base.headgear;
  if (headgear === 'helmet' && r(2) < 0.22) headgear = 'boonie';
  else if (headgear === 'boonie' && r(2) < 0.25) headgear = 'helmet';
  return {
    pal: {
      ...base,
      uniform: shade(base.uniform, f),
      dark: shade(base.dark, 0.92 + r(3) * 0.16),
      helmet: shade(base.helmet, 0.88 + r(4) * 0.24),
      gear: shade(base.gear, 0.9 + r(5) * 0.2),
      headgear,
      skin: suit ? base.skin : SKIN[Math.floor(r(6) * SKIN.length)],
    },
    scale: 0.93 + r(7) * 0.13,
    pack: suit || r(8) < 0.7,
  };
}
