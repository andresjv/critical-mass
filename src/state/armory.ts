// Armory — the soldier's guns for the ground assault: which guns exist and how rare they are,
// which ones the player owns, the 4 carried in the weapon wheel, credits, and the daily store.
// Plain TypeScript (no Phaser). Saved to localStorage; every access is guarded.
//
// Daily store: 4 offers that change at local midnight and differ per player. The offers are
// picked with a seeded rng from (player id, date), weighted by rarity, so rarer guns turn up
// less often. The player id is a random token made once per browser profile.
import type { LevelId } from './levels';
import { createRng } from './rng';
import { GUN_STATS, STORE, type GunStats } from './tuning';

export type GunId = keyof typeof GUN_STATS;
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface GunDef {
  id: GunId;
  name: string;
  rarity: Rarity;
  desc: string;
  /** Level medal that unlocks it for free; null = only from the store (or owned at start). */
  unlock: LevelId | null;
}

export const GUNS: readonly GunDef[] = [
  { id: 'pistol',  name: 'Service Pistol', rarity: 'common',    desc: 'Reliable sidearm. Tap to fire.',              unlock: null },
  { id: 'smg',     name: 'Bullpup SMG',    rarity: 'common',    desc: 'Sprays fast, hits light. Hold to fire.',      unlock: null },
  { id: 'shotgun', name: 'Pump Shotgun',   rarity: 'uncommon',  desc: 'Seven pellets. Devastating up close.',        unlock: 'desert' },
  { id: 'rifle',   name: 'Assault Rifle',  rarity: 'uncommon',  desc: 'Accurate automatic rifle.',                   unlock: 'swamp' },
  { id: 'burst',   name: 'Burst Carbine',  rarity: 'rare',      desc: 'Three-round bursts that hit hard.',           unlock: 'coldfront' },
  { id: 'sniper',  name: 'Longshot Sniper', rarity: 'rare',     desc: 'One shot, one kill. Goes through targets.',   unlock: 'snow' },
  { id: 'lmg',     name: 'Heavy LMG',      rarity: 'epic',      desc: 'Ninety-round belt. Long reload.',             unlock: null },
  { id: 'rocket',  name: 'Rocket Tube',    rarity: 'epic',      desc: 'Explosive rockets. Clears machine-gun nests.', unlock: null },
  { id: 'laser',   name: 'Photon Lance',   rarity: 'legendary', desc: 'Piercing beam rifle from the Far Side.',      unlock: 'moon' },
];

export const SLOT_COUNT = 4;

export function gunDef(id: GunId): GunDef { return GUNS.find(g => g.id === id)!; }
export function gunStats(id: GunId): GunStats { return GUN_STATS[id]; }
export function gunPrice(id: GunId): number { return STORE.price[gunDef(id).rarity]; }

/** Chance (0–1) that a single store slot rolls this rarity. */
export function rarityChance(r: Rarity): number {
  const total = RARITIES.reduce((s, x) => s + STORE.weight[x], 0);
  return STORE.weight[r] / total;
}

export interface Armory {
  owned: GunId[];
  /** Guns carried into battle (weapon wheel); null = empty slot. */
  slots: (GunId | null)[];
  credits: number;
  /** Store offers already bought, keyed by date ("2026-11-27:shotgun"). */
  bought: string[];
}

const KEY = 'cm_armory_v1';
const ID_KEY = 'cm_player_id';
/** Everyone starts with only the Service Pistol; other guns come from the store or level medals. */
export const STARTER_GUN: GunId = 'pistol';
const START_OWNED: GunId[] = [STARTER_GUN];
/** Save format: v2 = only the pistol is free; medal guns are granted only when a medal is newly
 *  earned (v1 gave a free SMG and granted guns for every medal already held). */
const SAVE_VERSION = 2;

function fresh(): Armory {
  return { owned: [...START_OWNED], slots: [STARTER_GUN, null, null, null], credits: STORE.startingCredits, bought: [] };
}

function isGun(id: unknown): id is GunId { return typeof id === 'string' && id in GUN_STATS; }

function load(): Armory {
  const a = fresh();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return a;
    const p = JSON.parse(raw) as Partial<Armory> & { v?: number };
    if (Array.isArray(p.bought)) a.bought = p.bought.filter(b => typeof b === 'string').slice(-40);
    if (Array.isArray(p.owned)) {
      let owned = p.owned.filter(isGun);
      // Older saves: keep only guns that were actually bought (no free SMG, no guns from medals
      // earned before this change).
      if ((p.v ?? 1) < SAVE_VERSION) owned = owned.filter(g => a.bought.some(b => b.endsWith(`:${g}`)));
      a.owned = [...new Set([...START_OWNED, ...owned])];
    }
    if (Array.isArray(p.slots)) {
      a.slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
        const g = p.slots![i];
        return isGun(g) && a.owned.includes(g) ? g : null;
      });
    }
    if (typeof p.credits === 'number' && p.credits >= 0) a.credits = Math.floor(p.credits);
    if (!a.slots.some(g => g !== null)) a.slots[0] = STARTER_GUN;
  } catch { /* storage unavailable: defaults */ }
  return a;
}

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...armory, v: SAVE_VERSION })); } catch { /* ignore */ }
}

export const armory: Armory = load();

/** A level medal was just earned for the first time: grants that level's gun (if any, and not
 *  already owned). Medals earned before are not rewarded again. Returns the new gun or null. */
export function grantMedalGun(level: LevelId): GunId | null {
  const g = GUNS.find(x => x.unlock === level);
  if (!g || armory.owned.includes(g.id)) return null;
  armory.owned.push(g.id);
  const empty = armory.slots.indexOf(null);
  if (empty >= 0) armory.slots[empty] = g.id;
  save();
  return g.id;
}

/** Spends store credits if there are enough. */
export function spendCredits(n: number): boolean {
  const c = Math.max(0, Math.floor(n));
  if (armory.credits < c) return false;
  armory.credits -= c;
  save();
  return true;
}

export function addCredits(n: number): void {
  armory.credits += Math.max(0, Math.floor(n));
  save();
}

/** Puts an owned gun in a slot (moving it if it was in another one). */
export function setSlot(slot: number, id: GunId | null): void {
  if (slot < 0 || slot >= SLOT_COUNT) return;
  if (id !== null && !armory.owned.includes(id)) return;
  if (id !== null) {
    const was = armory.slots.indexOf(id);
    if (was >= 0) armory.slots[was] = armory.slots[slot];
  }
  armory.slots[slot] = id;
  save();
}

/** Carried guns in slot order; always at least the pistol. */
export function carried(): GunId[] {
  const c = armory.slots.filter((g): g is GunId => g !== null);
  return c.length ? c : [STARTER_GUN];
}

/** Guns for one ground assault: the wheel slots, always including the Service Pistol (it takes
 *  the first empty slot, or the last slot for this run if all are full), and the slot of the
 *  pistol, which is the gun you start with. Does not change the saved loadout. */
export function startingLoadout(slots: readonly (GunId | null)[]): { slots: (GunId | null)[]; start: number } {
  const out = Array.from({ length: SLOT_COUNT }, (_, i) => slots[i] ?? null);
  let start = out.indexOf('pistol');
  if (start < 0) {
    start = out.indexOf(null);
    if (start < 0) start = SLOT_COUNT - 1;
    out[start] = 'pistol';
  }
  return { slots: out, start };
}

// ── Daily store ─────────────────────────────────────────────────────────────

/** Local calendar day, e.g. "2026-11-27". */
export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Milliseconds until the store refreshes (next local midnight). */
export function msUntilRefresh(d: Date = new Date()): number {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getTime() - d.getTime();
}

/** FNV-1a 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** This browser profile's random player id (made once). */
export function playerId(): string {
  try {
    const have = localStorage.getItem(ID_KEY);
    if (have) return have;
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(ID_KEY, id);
    return id;
  } catch {
    return 'guest';
  }
}

/**
 * Today's offers for a player: STORE.offers different guns. Each slot first rolls a rarity
 * (weighted), then a gun of that rarity not already offered. Pure: same inputs, same offers.
 */
export function dailyOffers(player: string, day: string): GunId[] {
  const rng = createRng(hashString(`${player}|${day}`));
  const picked: GunId[] = [];
  const total = RARITIES.reduce((s, r) => s + STORE.weight[r], 0);
  let guard = 0;
  while (picked.length < Math.min(STORE.offers, GUNS.length - 1) && guard++ < 200) {
    let roll = rng.next() * total, rarity: Rarity = 'common';
    for (const r of RARITIES) { roll -= STORE.weight[r]; if (roll < 0) { rarity = r; break; } }
    const pool = GUNS.filter(g => g.rarity === rarity && g.id !== STARTER_GUN && !picked.includes(g.id));
    if (pool.length) picked.push(rng.pick(pool).id);
  }
  return picked;
}

export function todaysOffers(): GunId[] { return dailyOffers(playerId(), dayKey()); }

export type BuyResult = 'ok' | 'owned' | 'poor' | 'unavailable';

/** Buys one of today's offers. */
export function buy(id: GunId, offers: readonly GunId[] = todaysOffers(), day = dayKey()): BuyResult {
  if (!offers.includes(id)) return 'unavailable';
  if (armory.owned.includes(id)) return 'owned';
  const price = gunPrice(id);
  if (armory.credits < price) return 'poor';
  armory.credits -= price;
  armory.owned.push(id);
  armory.bought.push(`${day}:${id}`);
  const empty = armory.slots.indexOf(null);
  if (empty >= 0) armory.slots[empty] = id;
  save();
  return 'ok';
}

/** Test helper: back to a fresh armory. */
export function resetArmory(): void {
  Object.assign(armory, fresh());
  save();
}
