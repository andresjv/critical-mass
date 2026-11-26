// rng.ts — seeded pseudo-random number generator (mulberry32).
// All game-code randomness MUST go through createRng(); never call Math.random().
// Same seed → same sequence, so challenge links and replays work deterministically.

export interface Rng {
  /** Returns the next value in [0, 1). */
  next(): number;
  /** Returns the next integer in [0, max). */
  nextInt(max: number): number;
  /** Returns true with the given probability (0–1). */
  chance(p: number): boolean;
  /** Returns a random element from an array. */
  pick<T>(arr: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  // mulberry32 — simple, fast, good statistical quality for games.
  let t = seed >>> 0;

  const next = (): number => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    nextInt: (max: number) => Math.floor(next() * max),
    chance: (p: number) => next() < p,
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
  };
}
