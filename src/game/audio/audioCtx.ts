// Shared AudioContext singleton. All audio classes use this one context so we
// never exceed the browser's concurrent-context limit (Chrome mobile: 2–4).
//
// IMPORTANT: getAudioCtx() returns null until resumeCtx() is called from a
// real user-gesture handler (tap, key, click). This is the only way to satisfy
// the browser's autoplay policy — never create an AudioContext at module load
// time or in an animation frame.

let _ctx: AudioContext | null = null;

/**
 * Returns the shared context, or null if resumeCtx() has not been called yet.
 * Also returns null while the context is still suspended (safe for callers that
 * schedule timed audio — ctx.currentTime is frozen while suspended).
 */
export function getAudioCtx(): AudioContext | null {
  if (!_ctx) return null; // not yet unlocked by a user gesture
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
    return null; // don't schedule timed audio until running
  }
  return _ctx;
}

/**
 * Creates (if needed) and resumes the shared AudioContext.
 * Must be called directly inside a user-gesture event handler.
 */
export function resumeCtx(): void {
  if (!_ctx) {
    try { _ctx = new AudioContext(); } catch { return; }
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
}

export function closeCtx(): void {
  if (_ctx) { _ctx.close().catch(() => {}); _ctx = null; }
}
