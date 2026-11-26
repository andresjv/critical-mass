// gameUi — shared mutable state for the React overlay.
// Phaser scenes write here; React reads via useHudState (rAF polling).
// Plain TypeScript: NO Phaser imports, NO React imports.

export type DeviceHint = 'keyboard' | 'touch' | 'gamepad';

export const gameUi = {
  /** Last active input device — drives key-hint labels in the HUD. */
  device: 'keyboard' as DeviceHint,

  /** Whether the F1 debug overlay is visible. */
  debugVisible: false,

  // ── Map overlay data ───────────────────────────────────────────────────
  /** True while MapScene is the active stage. */
  mapActive: false,
  launchIndex: 0,
  launchSite: '',
  targetCity: '',
  timeToImpactSecs: 0,
  autoScrambleRemaining: 0,
};
