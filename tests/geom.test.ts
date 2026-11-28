import { describe, expect, it } from 'vitest';
import { segRect } from '../src/state/geom';

describe('segRect (swept bullet hits)', () => {
  it('finds where a fast segment crosses a thin box it would skip as a point', () => {
    // Bullet moves 100 px in one step past a 36 px-wide soldier.
    const t = segRect(0, 50, 100, 50, 40, 0, 76, 100);
    expect(t).toBeCloseTo(0.4);
  });
  it('misses a box above the path (shooting over low sandbags)', () => {
    expect(segRect(0, 10, 200, 10, 80, 30, 140, 70)).toBeNull();
  });
  it('counts a start inside the box as an immediate hit (point-blank)', () => {
    expect(segRect(50, 50, 120, 50, 40, 0, 76, 100)).toBe(0);
  });
  it('handles vertical and diagonal paths', () => {
    expect(segRect(10, -50, 10, 50, 0, 0, 20, 20)).toBeCloseTo(0.5);
    expect(segRect(0, 0, 100, 100, 40, 40, 60, 60)).toBeCloseTo(0.4);
    expect(segRect(0, 100, 100, 0, 0, 0, 20, 20)).toBeNull();
  });
});
