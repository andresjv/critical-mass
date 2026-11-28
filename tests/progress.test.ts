import { describe, it, expect, beforeEach } from 'vitest';
import { progress, equip, equipped, isPartUnlocked, earnLevelAchievement, resetProgress, ACHIEVEMENTS, PARTS } from '../src/state/progress';

describe('progress', () => {
  beforeEach(() => resetProgress());

  it('starts with the default loadout', () => {
    expect(equipped('jet').id).toBe('falcon');
    expect(equipped('gun').id).toBe('cannon');
    expect(equipped('bomb').id).toBe('iron');
  });

  it('has one achievement per level, each unlocking a real part', () => {
    expect(ACHIEVEMENTS).toHaveLength(5);
    for (const a of ACHIEVEMENTS) expect(PARTS.some(p => p.id === a.unlocks && p.unlock === a.level)).toBe(true);
  });

  it('refuses to equip a locked part', () => {
    expect(isPartUnlocked('twin')).toBe(false);
    expect(equip('twin')).toBe(false);
    expect(equipped('gun').id).toBe('cannon');
  });

  it('beating a level unlocks its part once', () => {
    expect(earnLevelAchievement('desert')?.unlocks).toBe('twin');
    expect(earnLevelAchievement('desert')).toBeNull();
    expect(progress.achieved).toEqual(['desert']);
    expect(equip('twin')).toBe(true);
    expect(equipped('gun').id).toBe('twin');
  });
});
