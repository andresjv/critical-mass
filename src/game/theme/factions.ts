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
