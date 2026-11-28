// Small geometry helpers shared by game code (plain TypeScript, unit-tested in tests/geom.test.ts).
/** First point (as a 0..1 fraction of the way from p0 to p1) where segment p0→p1 enters the
 *  rectangle, or null if it misses. Starting inside counts as 0. */
export function segRect(x0: number, y0: number, x1: number, y1: number, l: number, t: number, r: number, b: number): number | null {
  let lo = 0, hi = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const u = q / p;
    if (p < 0) { if (u > hi) return false; if (u > lo) lo = u; }
    else { if (u < lo) return false; if (u < hi) hi = u; }
    return true;
  };
  if (!clip(-dx, x0 - l) || !clip(dx, r - x0) || !clip(-dy, y0 - t) || !clip(dy, b - y0)) return null;
  return lo <= hi ? lo : null;
}
