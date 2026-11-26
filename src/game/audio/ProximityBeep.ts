// ProximityBeep.ts — Web Audio proximity warning for missiles and heat-seekers.
import { getAudioCtx } from './audioCtx';
// Nearest-2 sources; interval/volume/pitch all lerp with distance.
// Also drives a pulsing ring radius for sound-off players (ringPhase, isActive).

const MAX_DIST     = 640;  // px; beyond this, no beep
const MAX_ACTIVE   = 2;    // only nearest N sources beep
const MIN_INTERVAL = 120;  // ms fastest beep
const MAX_INTERVAL = 900;  // ms slowest beep
const SOLID_FREQ   = 1200; // Hz: continuous tone when < 1 s to impact
const CANVAS_W     = 1280; // used for stereo pan calculation

export interface BeepSource {
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export class ProximityBeep {
  /** 0 → 1 progress within the current beep cycle; drives the ring animation. */
  ringPhase = 0;
  /** True when at least one source is in range (or solid tone is active). */
  isActive  = false;
  /** Current beep interval in ms; exposed so external code can read rate. */
  beepInterval = MAX_INTERVAL;

  private lastBeepAt = 0;
  private solidOsc: OscillatorNode | null = null;

  /**
   * Call once per render frame.
   * @param sources       All missile / heat-seeker screen positions.
   * @param planeX        Player plane screen X (for pan reference).
   * @param planeY        Player plane screen Y.
   * @param impactSecs    Seconds until missile impact (missionState.impactClock).
   */
  update(
    sources:    BeepSource[],
    planeX:     number,
    planeY:     number,
    impactSecs: number,
  ): void {
    const now = performance.now();

    // ── Solid tone when under 1 s to impact ──────────────────────────────────
    if (impactSecs > 0 && impactSecs < 1) {
      const pan = Math.max(-1, Math.min(1, (planeX / CANVAS_W) * 2 - 1));
      this.ensureSolid(SOLID_FREQ, 0.6, pan);
      this.isActive    = true;
      this.ringPhase   = (now % 300) / 300; // fast pulse independent of beep
      return;
    }
    this.stopSolid();

    // ── No sources ───────────────────────────────────────────────────────────
    if (sources.length === 0) {
      this.isActive = false;
      return;
    }

    // Sort by distance; keep nearest MAX_ACTIVE within MAX_DIST.
    const inRange = sources
      .map(s => {
        const dx = s.x - planeX;
        const dy = s.y - planeY;
        return { s, dist: Math.sqrt(dx * dx + dy * dy) };
      })
      .filter(e => e.dist <= MAX_DIST)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, MAX_ACTIVE);

    if (inRange.length === 0) {
      this.isActive = false;
      return;
    }

    // Drive beep params from the nearest source.
    const { s, dist } = inRange[0];
    const t        = 1 - dist / MAX_DIST;
    const interval = lerp(MAX_INTERVAL, MIN_INTERVAL, t);
    const volume   = lerp(0.15, 0.90, t);
    const freq     = lerp(880, 1100, t);
    const pan      = Math.max(-1, Math.min(1, (s.x / CANVAS_W) * 2 - 1));

    this.beepInterval = interval;
    this.isActive     = true;
    this.ringPhase    = Math.max(0, Math.min(1, (now - this.lastBeepAt) / interval));

    if (now - this.lastBeepAt >= interval) {
      this.lastBeepAt = now;
      this.ringPhase  = 0;
      this.playBeep(freq, volume, pan);
    }
  }

  /** Stop all audio immediately (call on crash / stage end). Context stays open for reuse. */
  stop(): void {
    this.stopSolid();
    this.isActive = false;
  }

  dispose(): void {
    this.stopSolid();
    // Don't close the shared context — other audio classes still use it.
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private playBeep(freq: number, volume: number, pan: number): void {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc    = ctx.createOscillator();
    const gain   = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.value  = freq;
    gain.gain.value      = volume * 0.15; // keep overall level gentle
    panner.pan.value     = pan;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(volume * 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  private ensureSolid(freq: number, volume: number, pan: number): void {
    if (this.solidOsc) return; // already playing
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc    = ctx.createOscillator();
    const gain   = ctx.createGain();
    const panner = ctx.createStereoPanner();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value     = volume * 0.15;
    panner.pan.value    = pan;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    osc.start();

    this.solidOsc = osc;
  }

  private stopSolid(): void {
    if (!this.solidOsc) return;
    try { this.solidOsc.stop(); } catch { /* already stopped */ }
    this.solidOsc = null;
  }
}
