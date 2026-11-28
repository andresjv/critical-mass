import { describe, it, expect } from 'vitest';
import { foeRoster, foeTier, pickFoe, FOE_KINDS } from '../src/state/foes';
import { createRng } from '../src/state/rng';
import { FOES, FOE_WEIGHTS } from '../src/state/tuning';

describe('foes', () => {
  it('every enemy type has stats and appears in every tier table', () => {
    for (const k of FOE_KINDS) {
      expect(FOES[k]).toBeDefined();
      for (const w of FOE_WEIGHTS) expect(w[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it('the same seed gives the same roster', () => {
    expect(foeRoster(createRng(5), 12, 2)).toEqual(foeRoster(createRng(5), 12, 2));
  });

  it('first launch has no machine gunners or grenadiers; the hardest tier has all types', () => {
    const early = new Set(foeRoster(createRng(1), 400, 0));
    expect(early.has('gunner') || early.has('grenadier')).toBe(false);
    const late = new Set(foeRoster(createRng(1), 400, 3));
    for (const k of FOE_KINDS) expect(late.has(k)).toBe(true);
  });

  it('enemies only carry pistols, shotguns, machine guns or assault rifles', () => {
    for (const k of FOE_KINDS) expect(['pistol', 'shotgun', 'smg', 'lmg', 'rifle']).toContain(FOES[k].gun);
  });

  it('rosters open with a rifleman', () => {
    expect(foeRoster(createRng(9), 3, 3)[0]).toBe('rifleman');
  });

  it('tiers rise with launches and Endless stages, capped', () => {
    expect(foeTier(0, false, 0)).toBe(0);
    expect(foeTier(2, false, 0)).toBe(2);
    expect(foeTier(0, true, 0)).toBe(1);
    expect(foeTier(0, true, 40)).toBe(FOE_WEIGHTS.length - 1);
    expect(pickFoe(createRng(3), 99)).toBeDefined();
  });
});
