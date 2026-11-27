// Faction colours: the player's side is blue, the enemy is red. Bodies of enemy
// vehicles take the level's camouflage (biomes.ts) but always carry red markings.

export interface JetPalette {
  body: number;
  dark: number;
  /** Optional camo blotch colours on the fuselage. */
  camo: readonly number[];
  canopy: number;
  /** Team marking colour (fin, nose stripe, roundel). */
  marking: number;
  /** Roundel centre colour. */
  markingCore: number;
}

export interface VehiclePalette {
  kind: 'tank' | 'rover';
  hull: number;
  dark: number;
  camo: readonly number[];
  tread: number;
  wheel: number;
  marking: number;
}

export const PLAYER_JET: JetPalette = {
  body: 0x3a8fe0, dark: 0x1f5ea8, camo: [], canopy: 0xbfe6ff, marking: 0xffffff, markingCore: 0x1f5ea8,
};

export const RED = 0xd8322a;

/** Infantry colours for the background battle (blue = us, red = enemy). */
export interface SoldierPalette { uniform: number; dark: number; helmet: number; skin: number; gun: number }
export const SOLDIER_BLUE: SoldierPalette = { uniform: 0x3468b8, dark: 0x22457e, helmet: 0x1f3d6e, skin: 0xd9a77c, gun: 0x1a1a1a };
export const SOLDIER_RED: SoldierPalette  = { uniform: 0xb8352a, dark: 0x7e241c, helmet: 0x5e1a14, skin: 0xd9a77c, gun: 0x1a1a1a };
export const TRACER_BLUE = 0x9fd0ff;
export const TRACER_RED = 0xffa070;
