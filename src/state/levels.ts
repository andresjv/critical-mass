// Levels — which world the mission is flown in. A level is a skin: it changes the
// scenery, colours and names only; rules, timing and scoring are identical (PRD T-02).
// Plain TypeScript: NO Phaser imports.

export type LevelId = 'swamp' | 'desert' | 'coldfront' | 'snow' | 'moon';

export interface LevelInfo {
  id: LevelId;
  name: string;
  premise: string;
  /** Two CSS colours for the menu card preview (sky → ground). */
  preview: [string, string];
}

export const LEVELS: readonly LevelInfo[] = [
  { id: 'swamp',     name: 'Black Bayou',   premise: 'Fog, moss and mangroves. Launch sites hide in the marsh.', preview: ['#1d2a22', '#2f3a1e'] },
  { id: 'desert',    name: 'Red Dunes',     premise: 'Blazing dunes and mesas under a low sun.',                preview: ['#e88a4a', '#c98a4a'] },
  { id: 'coldfront', name: 'Cold Front',    premise: 'Night over pine forests, lakes and snowy peaks.',         preview: ['#07111f', '#16304a'] },
  { id: 'snow',      name: 'White Out',     premise: 'Frozen tundra, glaciers and blizzard skies.',            preview: ['#9fb6cc', '#e6eef5'] },
  { id: 'moon',      name: 'Far Side',      premise: 'A cratered moon base with Earth hanging overhead.',      preview: ['#020308', '#6b6e75'] },
] as const;

export function levelInfo(id: LevelId): LevelInfo {
  return LEVELS.find(l => l.id === id) ?? LEVELS[2];
}
