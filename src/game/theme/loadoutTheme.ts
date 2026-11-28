// Colours for each selectable jet skin. The equipped one comes from state/progress.
import { PLAYER_JET, type JetPalette } from './factions';
import { progress, type PartId } from '../../state/progress';

export const JET_SKINS: Partial<Record<PartId, JetPalette>> = {
  falcon: PLAYER_JET,
  viper:  { body: 0x55803e, dark: 0x2f4a22, camo: [0x3a5a2a, 0x76985a], canopy: 0xbfe6ff, marking: 0xffffff, markingCore: 0x1f5ea8 },
  arctic: { body: 0xe4ebf1, dark: 0x9aa8b6, camo: [0xc3cfdb], canopy: 0x7fd0ff, marking: 0x3a8fe0, markingCore: 0xffffff },
  nova:   { body: 0x24272d, dark: 0x111317, camo: [], canopy: 0xffc94a, marking: 0xffc94a, markingCore: 0x24272d },
};

/** Palette of the jet the player has equipped. */
export function playerJet(): JetPalette {
  return JET_SKINS[progress.loadout.jet] ?? PLAYER_JET;
}
