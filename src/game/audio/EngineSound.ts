// EngineSound — fighter jet engine rumble + interceptor whoosh SFX.
// Engine: two layered sawtooth oscillators (83 Hz + 167 Hz) whose gain ramps
// between idle and thrust level. Whoosh: pitch-swept sine burst (650→70 Hz).

import { getAudioCtx, getBus } from './audioCtx';

export class EngineSound {
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain1: GainNode | null = null;
  private gain2: GainNode | null = null;
  private started = false;

  update(thrusting: boolean): void {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (!this.started) this.startOscillators(ctx);
    const t1 = thrusting ? 0.20 : 0.07;
    const t2 = thrusting ? 0.08 : 0.03;
    const ramp = ctx.currentTime + 0.08;
    this.gain1?.gain.linearRampToValueAtTime(t1, ramp);
    this.gain2?.gain.linearRampToValueAtTime(t2, ramp);
  }

  playWhoosh(): void {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 1200;
    gain.gain.value = 0.30;
    osc.connect(gain);
    gain.connect(getBus('sfx') ?? ctx.destination);
    const t0 = ctx.currentTime;
    osc.frequency.exponentialRampToValueAtTime(250, t0 + 0.35);
    gain.gain.setValueAtTime(0.30, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    osc.start(t0);
    osc.stop(t0 + 0.36);
  }

  stop(): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.gain1 || !this.gain2) return;
    const ramp = ctx.currentTime + 0.15;
    this.gain1.gain.linearRampToValueAtTime(0, ramp);
    this.gain2.gain.linearRampToValueAtTime(0, ramp);
  }

  dispose(): void {
    try { this.osc1?.stop(); } catch { /* already stopped */ }
    try { this.osc2?.stop(); } catch { /* already stopped */ }
    // Don't close the shared context — other audio classes still use it.
    this.osc1 = null; this.osc2 = null;
    this.gain1 = null; this.gain2 = null; this.started = false;
  }

  private startOscillators(ctx: AudioContext): void {
    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.gain1 = ctx.createGain();
    this.gain2 = ctx.createGain();
    this.osc1.type = 'sawtooth'; this.osc1.frequency.value = 130;
    this.osc2.type = 'sawtooth'; this.osc2.frequency.value = 260;
    this.gain1.gain.value = 0.07;
    this.gain2.gain.value = 0.03;
    this.osc1.connect(this.gain1); this.gain1.connect(getBus('sfx') ?? ctx.destination);
    this.osc2.connect(this.gain2); this.gain2.connect(getBus('sfx') ?? ctx.destination);
    this.osc1.start(); this.osc2.start();
    this.started = true;
  }

}
