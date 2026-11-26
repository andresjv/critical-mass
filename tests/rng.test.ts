import { describe, it, expect } from 'vitest';
import { createRng } from '../src/state/rng';

describe('rng — mulberry32 determinism', () => {
  it('same seed produces the same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt(max) returns integers in [0, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick() selects from the array', () => {
    const rng = createRng(123);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('seed=0 is a valid seed and is deterministic', () => {
    const a = createRng(0);
    const b = createRng(0);
    expect(a.next()).toBe(b.next());
  });
});
