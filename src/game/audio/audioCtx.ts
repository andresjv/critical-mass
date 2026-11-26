// Shared AudioContext singleton. All audio classes use this one context so we
// never exceed the browser's concurrent-context limit (Chrome mobile: 2–4).
// Call resumeCtx() inside any user-gesture handler to unlock autoplay.

let _ctx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  if (!_ctx) {
    try { _ctx = new AudioContext(); } catch { return null; }
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

/** Call once per user gesture (tap, key, click) to unblock autoplay. */
export function resumeCtx(): void {
  if (_ctx && _ctx.state === 'suspended') _ctx.resume().catch(() => {});
}

export function closeCtx(): void {
  if (_ctx) { _ctx.close().catch(() => {}); _ctx = null; }
}
