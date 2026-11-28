// Which enemy types a ground assault gets: a seeded, weighted pick from FOE_WEIGHTS by tier.
// Plain TypeScript (no Phaser): unit-tested in tests/foes.test.ts.
import { FOE_WEIGHTS, type FoeKind } from './tuning';
import type { Rng } from './rng';

export const FOE_KINDS: readonly FoeKind[] = ['rifleman', 'smg', 'shotgun', 'gunner', 'grenadier'];

/** Difficulty tier 0–3: by launch in a normal mission, by stage in Endless. */
export function foeTier(launchIndex: number, endless: boolean, endlessStage: number): number {
  const t = endless ? Math.floor(endlessStage / 2) + 1 : launchIndex;
  return Math.max(0, Math.min(FOE_WEIGHTS.length - 1, t));
}

/** One weighted pick for the tier. */
export function pickFoe(rng: Rng, tier: number): FoeKind {
  const w = FOE_WEIGHTS[Math.max(0, Math.min(FOE_WEIGHTS.length - 1, tier))];
  const total = FOE_KINDS.reduce((s, k) => s + w[k], 0);
  let r = rng.next() * total;
  for (const k of FOE_KINDS) { r -= w[k]; if (r < 0) return k; }
  return 'rifleman';
}

/** `count` enemies for the tier; the first is always a rifleman so every level opens gently. */
export function foeRoster(rng: Rng, count: number, tier: number): FoeKind[] {
  return Array.from({ length: count }, (_, i) => (i === 0 ? 'rifleman' : pickFoe(rng, tier)));
}
