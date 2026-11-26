// Shared mutable bag for the F1 debug overlay.
// Stage scenes write here each frame; DebugOverlayScene reads and displays.

export const debugInfo = {
  fps: 0,
  /** Current plane speed in px/s (Hangar). */
  speed: 0,
  /** Current plane angle in degrees (Hangar). */
  angle: 0,
  /** Door open timer, seconds remaining. 0 when closed/cooldown. */
  doorTimer: 0,
  /** Door state label (e.g. "OPEN", "COOLDOWN"). */
  doorState: 'CLOSED',
};
