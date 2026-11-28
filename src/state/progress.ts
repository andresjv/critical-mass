// Player progress: level achievements and the equipped loadout (jet skin, gun, bomb).
// Plain TypeScript (no Phaser). Saved to localStorage; every access is guarded so private
// windows or blocked storage just fall back to defaults.
import type { LevelId } from './levels';

export type PartSlot = 'jet' | 'gun' | 'bomb';
export type PartId = 'falcon' | 'viper' | 'arctic' | 'nova' | 'cannon' | 'twin' | 'iron' | 'cluster';

export interface PartDef {
  id: PartId;
  slot: PartSlot;
  name: string;
  /** One-line description shown on the part card. */
  desc: string;
  /** Short stat lines shown when the part is highlighted. */
  stats: string[];
  /** Level whose achievement unlocks this part; null = available from the start. */
  unlock: LevelId | null;
}

export const PARTS: readonly PartDef[] = [
  { id: 'falcon',  slot: 'jet',  name: 'Falcon',      desc: 'Standard-issue blue fighter.',            stats: ['Squadron blue', 'Standard markings'], unlock: null },
  { id: 'viper',   slot: 'jet',  name: 'Bayou Viper', desc: 'Swamp-green camo fighter.',               stats: ['Green camouflage', 'Earned in Black Bayou'], unlock: 'swamp' },
  { id: 'arctic',  slot: 'jet',  name: 'Arctic Fox',  desc: 'Winter-white fighter with ice-blue trim.', stats: ['Snow camouflage', 'Earned in White Out'], unlock: 'snow' },
  { id: 'nova',    slot: 'jet',  name: 'Nova',        desc: 'Black and gold, for pilots who went to the Moon.', stats: ['Gold canopy', 'Earned on Far Side'], unlock: 'moon' },
  { id: 'cannon',  slot: 'gun',  name: 'Cannon',      desc: 'Single forward gun.',                     stats: ['1 round per shot', 'Up to 4 rounds in the air'], unlock: null },
  { id: 'twin',    slot: 'gun',  name: 'Twin Cannon', desc: 'Two guns firing a slight spread.',        stats: ['2 rounds per shot', 'Up to 6 rounds in the air'], unlock: 'desert' },
  { id: 'iron',    slot: 'bomb', name: 'Iron Bomb',   desc: 'Reliable free-fall bomb.',                stats: ['Standard blast', 'Standard reload'], unlock: null },
  { id: 'cluster', slot: 'bomb', name: 'Cluster Bomb', desc: 'Scatters bomblets over a wide area.',   stats: ['Much wider blast', 'Slightly slower reload'], unlock: 'coldfront' },
];

export interface AchievementDef {
  level: LevelId;
  name: string;
  desc: string;
  unlocks: PartId;
}

/** One achievement per level, earned by finishing all four launches on it. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { level: 'swamp',     name: 'Swamp Rat',       desc: 'Beat Black Bayou: survive all four launches in the swamp.', unlocks: 'viper' },
  { level: 'desert',    name: 'Dune Breaker',    desc: 'Beat Red Dunes: finish every launch across the desert.',    unlocks: 'twin' },
  { level: 'coldfront', name: 'Front Line',      desc: 'Beat Cold Front: hold the line through the night storm.',   unlocks: 'cluster' },
  { level: 'snow',      name: 'Whiteout Ace',    desc: 'Beat White Out: fly blind through the blizzard and win.',   unlocks: 'arctic' },
  { level: 'moon',      name: 'Far Side Legend', desc: 'Beat Far Side: take the fight to the Moon and come back.',  unlocks: 'nova' },
];

export interface Progress {
  achieved: LevelId[];
  loadout: Record<PartSlot, PartId>;
}

const KEY = 'cm_progress_v1';
const DEFAULT_LOADOUT: Record<PartSlot, PartId> = { jet: 'falcon', gun: 'cannon', bomb: 'iron' };

function load(): Progress {
  const base: Progress = { achieved: [], loadout: { ...DEFAULT_LOADOUT } };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Progress>;
    if (Array.isArray(p.achieved)) base.achieved = p.achieved.filter(l => ACHIEVEMENTS.some(a => a.level === l));
    if (p.loadout) for (const slot of ['jet', 'gun', 'bomb'] as const) {
      const id = p.loadout[slot];
      const part = PARTS.find(x => x.id === id && x.slot === slot);
      if (part && (part.unlock === null || base.achieved.includes(part.unlock))) base.loadout[slot] = part.id;
    }
  } catch { /* storage unavailable: defaults */ }
  return base;
}

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* ignore */ }
}

export const progress: Progress = load();

export function partDef(id: PartId): PartDef { return PARTS.find(p => p.id === id)!; }

export function isPartUnlocked(id: PartId): boolean {
  const u = partDef(id).unlock;
  return u === null || progress.achieved.includes(u);
}

/** Equips a part if it is unlocked. Returns whether it is now equipped. */
export function equip(id: PartId): boolean {
  if (!isPartUnlocked(id)) return false;
  progress.loadout[partDef(id).slot] = id;
  save();
  return true;
}

export function equipped(slot: PartSlot): PartDef { return partDef(progress.loadout[slot]); }

/** Records beating a level. Returns the achievement if it was newly earned, else null. */
export function earnLevelAchievement(level: LevelId): AchievementDef | null {
  if (progress.achieved.includes(level)) return null;
  const a = ACHIEVEMENTS.find(x => x.level === level);
  if (!a) return null;
  progress.achieved.push(level);
  save();
  return a;
}

/** Test helper: back to a fresh profile. */
export function resetProgress(): void {
  progress.achieved = [];
  progress.loadout = { ...DEFAULT_LOADOUT };
  save();
}
