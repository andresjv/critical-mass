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
  /** Draw as a flying saucer instead of a jet (Moon enemies). `canopy` = dome, `marking` = lights. */
  ufo?: boolean;
}

export interface VehiclePalette {
  /** tank, moon rover, desert humvee with roof gunner, swamp armoured truck on flotation tyres. */
  kind: 'tank' | 'rover' | 'humvee' | 'hauler';
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

/** Tiny team patch colours on uniforms (blue = us; RED above = enemy). */
export const BLUE_PATCH = 0x3a8fe0;

/** Infantry / vehicle crew kit (region-specific sets live in troops.ts). */
export interface SoldierPalette {
  uniform: number; dark: number;
  /** Camo blotch colour on the uniform; null = plain. */
  camo: number | null;
  /** Helmet / hat / hood / visor colour, depending on headgear. */
  helmet: number;
  headgear: 'helmet' | 'boonie' | 'shemagh' | 'hood' | 'spacesuit';
  /** Webbing / vest / life-support pack. */
  gear: number;
  /** Tiny team patch. */
  patch: number;
  skin: number; gun: number;
}
export const TRACER_BLUE = 0x9fd0ff;
export const TRACER_RED = 0xffa070;
