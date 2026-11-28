import { describe, it, expect, beforeEach } from 'vitest';
import {
  armory, buy, carried, dailyOffers, GUNS, gunPrice, rarityChance, RARITIES, resetArmory, setSlot,
  syncUnlocks, addCredits, SLOT_COUNT, msUntilRefresh, dayKey,
} from '../src/state/armory';
import { GUN_STATS, STORE } from '../src/state/tuning';

describe('armory', () => {
  beforeEach(() => resetArmory());

  it('every gun has stats and a rarity', () => {
    for (const g of GUNS) {
      expect(GUN_STATS[g.id]).toBeDefined();
      expect(RARITIES).toContain(g.rarity);
    }
  });

  it('starts with pistol and SMG carried, two empty slots and starting credits', () => {
    expect(armory.owned).toEqual(['pistol', 'smg']);
    expect(armory.slots).toEqual(['pistol', 'smg', null, null]);
    expect(armory.slots).toHaveLength(SLOT_COUNT);
    expect(armory.credits).toBe(STORE.startingCredits);
    expect(carried()).toEqual(['pistol', 'smg']);
  });

  it('daily offers are the same for the same player and day', () => {
    expect(dailyOffers('abc', '2026-11-27')).toEqual(dailyOffers('abc', '2026-11-27'));
  });

  it('daily offers are distinct guns and change between players and days', () => {
    const a = dailyOffers('abc', '2026-11-27');
    expect(new Set(a).size).toBe(STORE.offers);
    const variants = new Set<string>();
    for (let i = 0; i < 20; i++) variants.add(dailyOffers(`p${i}`, '2026-11-27').join());
    for (let d = 1; d <= 20; d++) variants.add(dailyOffers('abc', `2026-12-${String(d).padStart(2, '0')}`).join());
    expect(variants.size).toBeGreaterThan(20);
  });

  it('rarer guns show up less often', () => {
    const count: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) for (const id of dailyOffers(`player${i}`, '2026-11-27')) {
      const r = GUNS.find(g => g.id === id)!.rarity;
      count[r] = (count[r] ?? 0) + 1;
    }
    expect(count.common).toBeGreaterThan(count.rare);
    expect(count.rare).toBeGreaterThan(count.legendary);
    expect(rarityChance('common')).toBeGreaterThan(rarityChance('legendary'));
  });

  it('buying spends credits, adds the gun and fills an empty slot', () => {
    addCredits(1000);
    const before = armory.credits;
    expect(buy('lmg', ['lmg'], '2026-11-27')).toBe('ok');
    expect(armory.credits).toBe(before - gunPrice('lmg'));
    expect(armory.owned).toContain('lmg');
    expect(armory.slots[2]).toBe('lmg');
    expect(buy('lmg', ['lmg'], '2026-11-27')).toBe('owned');
  });

  it('refuses guns that are not on offer or too expensive', () => {
    expect(buy('laser', ['shotgun'])).toBe('unavailable');
    expect(buy('laser', ['laser'])).toBe('poor');
    expect(armory.owned).not.toContain('laser');
  });

  it('level medals unlock their guns for free', () => {
    expect(syncUnlocks(['desert'])).toEqual(['shotgun']);
    expect(armory.owned).toContain('shotgun');
    expect(syncUnlocks(['desert'])).toEqual([]);
  });

  it('moving a gun to another slot swaps it', () => {
    setSlot(3, 'pistol');
    expect(armory.slots).toEqual([null, 'smg', null, 'pistol']);
    setSlot(0, 'laser'); // not owned
    expect(armory.slots[0]).toBeNull();
  });

  it('store refreshes at local midnight', () => {
    const d = new Date(2026, 10, 27, 23, 0, 0);
    expect(msUntilRefresh(d)).toBe(60 * 60 * 1000);
    expect(dayKey(d)).toBe('2026-11-27');
  });
});
