// Soldier kit — what the pilot wears and carries on foot, chosen in the Inventory: three side-tool
// slots, a character look and armor. Guns live in armory.ts. Plain TypeScript (no Phaser);
// saved to localStorage with every access guarded. Unit-tested in tests/soldierKit.test.ts.
import { armory, spendCredits } from './armory';
import { KIT } from './tuning';

export type ToolId = 'frag' | 'molotov' | 'medkit' | 'smoke';
export type ArmorId = 'none' | 'light' | 'heavy';
export type CharacterId = 'rook' | 'vale' | 'mara' | 'dex';

export interface ToolDef { id: ToolId; name: string; desc: string }
export const TOOLS: readonly ToolDef[] = [
  { id: 'frag',    name: 'Frag grenade',   desc: 'Bounces, then blows up. Hold J to aim.' },
  { id: 'molotov', name: 'Firebomb',       desc: 'Shatters into a patch of fire.' },
  { id: 'medkit',  name: 'Medkit',         desc: 'Restores 3 health.' },
  { id: 'smoke',   name: 'Smoke grenade',  desc: 'Thick smoke: enemies cannot see through it.' },
];

export interface CharacterDef {
  id: CharacterId; name: string; desc: string;
  skin: number;
  /** Headgear on Earth levels (everyone wears a pressure suit on the Moon). */
  headgear: 'helmet' | 'boonie' | 'shemagh' | 'hood';
}
export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'rook', name: 'Rook', desc: 'Steady, by the book. Steel helmet.',      skin: 0xd9a77c, headgear: 'helmet' },
  { id: 'vale', name: 'Vale', desc: 'Jungle scout. Soft bush hat.',            skin: 0xb98a62, headgear: 'boonie' },
  { id: 'mara', name: 'Mara', desc: 'Desert veteran. Wrapped head scarf.',     skin: 0x8a5a3a, headgear: 'shemagh' },
  { id: 'dex',  name: 'Dex',  desc: 'Cold-weather specialist. Parka hood.',    skin: 0xe0b090, headgear: 'hood' },
];

export interface ArmorDef { id: ArmorId; name: string; desc: string }
export const ARMORS: readonly ArmorDef[] = [
  { id: 'none',  name: 'No armor',     desc: 'Light and quick.' },
  { id: 'light', name: 'Light vest',   desc: '+1 hit. No slow-down.' },
  { id: 'heavy', name: 'Heavy armor',  desc: '+2 hits, but you move a little slower.' },
];

export interface SoldierKit {
  tools: (ToolId | null)[];
  character: CharacterId;
  armor: ArmorId;
  ownedArmor: ArmorId[];
}

const KEY = 'cm_kit_v1';

function fresh(): SoldierKit {
  return { tools: ['frag', 'molotov', 'medkit'], character: 'rook', armor: 'none', ownedArmor: ['none'] };
}

const isTool = (t: unknown): t is ToolId => TOOLS.some(d => d.id === t);
const isArmor = (a: unknown): a is ArmorId => ARMORS.some(d => d.id === a);

function load(): SoldierKit {
  const k = fresh();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return k;
    const p = JSON.parse(raw) as Partial<SoldierKit>;
    if (Array.isArray(p.tools)) {
      const seen = new Set<ToolId>();
      k.tools = Array.from({ length: KIT.toolSlots }, (_, i) => {
        const t = p.tools![i];
        if (!isTool(t) || seen.has(t)) return null;
        seen.add(t); return t;
      });
    }
    if (CHARACTERS.some(c => c.id === p.character)) k.character = p.character as CharacterId;
    if (Array.isArray(p.ownedArmor)) k.ownedArmor = [...new Set<ArmorId>(['none', ...p.ownedArmor.filter(isArmor)])];
    if (isArmor(p.armor) && k.ownedArmor.includes(p.armor)) k.armor = p.armor;
  } catch { /* storage unavailable: defaults */ }
  return k;
}

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(kit)); } catch { /* ignore */ }
}

export const kit: SoldierKit = load();

/** Puts a tool in a side-tool slot (moving it if it was in another slot); null empties it. */
export function setTool(slot: number, id: ToolId | null): void {
  if (slot < 0 || slot >= KIT.toolSlots) return;
  if (id !== null) {
    const was = kit.tools.indexOf(id);
    if (was >= 0) kit.tools[was] = kit.tools[slot];
  }
  kit.tools[slot] = id;
  save();
}

export function setCharacter(id: CharacterId): void { kit.character = id; save(); }

export type ArmorResult = 'ok' | 'poor';

/** Equips armor, buying it first (once) with store credits if needed. */
export function chooseArmor(id: ArmorId): ArmorResult {
  if (!kit.ownedArmor.includes(id)) {
    if (!spendCredits(KIT.armorPrice[id])) return 'poor';
    kit.ownedArmor.push(id);
  }
  kit.armor = id;
  save();
  return 'ok';
}

export function characterDef(id: CharacterId = kit.character): CharacterDef { return CHARACTERS.find(c => c.id === id)!; }
export function toolDef(id: ToolId): ToolDef { return TOOLS.find(t => t.id === id)!; }
export function armorDef(id: ArmorId = kit.armor): ArmorDef { return ARMORS.find(a => a.id === id)!; }

/** Side tools carried into a ground assault, in slot order, with their counts. */
export function toolLoadout(): { id: ToolId; count: number }[] {
  return kit.tools.filter((t): t is ToolId => t !== null).map(id => ({ id, count: KIT.toolCount[id] }));
}

/** Credits available to buy armor (shared with the gun store). */
export function credits(): number { return armory.credits; }

/** Test helper: back to a fresh kit. */
export function resetKit(): void {
  Object.assign(kit, fresh());
  save();
}
