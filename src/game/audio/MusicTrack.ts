// MusicTrack — retro synth action loop for the Attack Run.
// 2-bar pattern, 128 BPM, A natural minor.
// Tracks: square-wave bass, sawtooth lead arpeggio, kick + snare + hi-hat.
// Uses the Web Audio "lookahead scheduler" pattern: a 50 ms interval checks
// every 200 ms and schedules all notes that fall within that window, so
// timing stays tight regardless of JS event-loop jitter.

import { getAudioCtx } from './audioCtx';

const BPM        = 128;
const STEP       = (60 / BPM) / 4; // 16th-note duration ≈ 0.117 s
const STEPS      = 32;              // 2 bars (32 × 16th notes)
const LOOKAHEAD  = 0.20;            // schedule notes up to 200 ms ahead
const INTERVAL   = 50;             // scheduler tick, ms

// Bass: square wave, quarter-note hits (every 4 steps).
// A2=110 E2=82 G2=98 D3=147 E3=165
const BASS = [
  110, 0, 0, 0,   110, 0, 0, 0,    82, 0, 0, 0,    98, 0, 0, 0,
  110, 0, 0, 0,   147, 0, 0, 0,   165, 0, 0, 0,   110, 0, 0, 0,
];

// Lead: sawtooth arpeggio, 8th-note hits (every 2 steps).
// A4=440 C5=523 E5=659 G5=784 A5=880
const LEAD = [
    0, 0, 440, 0,   523, 0, 659, 0,   784, 0, 659, 0,   523, 0, 440, 0,
    0, 0, 440, 0,   659, 0, 880, 0,   784, 0, 659, 0,   523, 0, 440, 0,
];

export class MusicTrack {
  private master: GainNode | null  = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;

  start(): void {
    if (this.playing) return;
    // Start the interval timer now. The context may still be suspended (ctx.resume()
    // is async), so tick() handles master GainNode creation on the first running tick.
    this.step     = 0;
    this.nextTime = 0; // tick() will set this once ctx.currentTime is available
    this.playing  = true;
    this.timer    = setInterval(() => this.tick(), INTERVAL);
  }

  fadeOut(duration = 0.5): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.master) return;
    this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    setTimeout(() => this.stopScheduler(), (duration + 0.1) * 1000);
  }

  stop(): void {
    const ctx = getAudioCtx();
    if (this.master && ctx) {
      this.master.gain.setValueAtTime(0, ctx.currentTime);
    }
    this.stopScheduler();
  }

  dispose(): void {
    this.stopScheduler();
    // Don't close the shared context — other audio classes still use it.
    this.master = null; this.noiseBuffer = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private stopScheduler(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.playing = false;
    // Drop the (possibly faded-to-zero) master so the next start() builds a fresh one.
    this.master?.disconnect();
    this.master = null;
  }

  private tick(): void {
    const ctx = getAudioCtx(); // returns null while suspended
    if (!ctx || !this.playing) return;
    // Create master GainNode on the first tick where the context is running.
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(ctx.destination);
    }
    // Catch up if nextTime is in the past (context was suspended when start() ran).
    if (this.nextTime < ctx.currentTime) {
      this.nextTime = ctx.currentTime + 0.05;
    }
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextTime);
      this.step     = (this.step + 1) % STEPS;
      this.nextTime += STEP;
    }
  }

  private scheduleStep(s: number, t: number): void {
    const ctx = getAudioCtx();
    const out = this.master;
    if (!ctx || !out) return;

    const bass = BASS[s];
    const lead = LEAD[s];
    const beat = s % 16; // position within one bar

    if (bass > 0)              this.noteBass(ctx, out, t, bass);
    if (lead > 0)              this.noteLead(ctx, out, t, lead);
    if (beat === 0 || beat === 8)  this.kick(ctx, out, t);
    if (beat === 4 || beat === 12) this.snare(ctx, out, t);
    if (s % 2 === 0)               this.hihat(ctx, out, t);
  }

  private noteBass(ctx: AudioContext, out: AudioNode, t: number, freq: number): void {
    const osc  = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq * 2; // up an octave so phone/laptop speakers reproduce it
    filt.type = 'lowpass'; filt.frequency.value = 1200; filt.Q.value = 1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.008);
    gain.gain.setValueAtTime(0.55, t + STEP * 3.4);
    gain.gain.linearRampToValueAtTime(0, t + STEP * 4);
    osc.connect(filt); filt.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + STEP * 4.1);
  }

  private noteLead(ctx: AudioContext, out: AudioNode, t: number, freq: number): void {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.006);
    gain.gain.setValueAtTime(0.28, t + STEP * 1.5);
    gain.gain.linearRampToValueAtTime(0, t + STEP * 2);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + STEP * 2.1);
  }

  private kick(ctx: AudioContext, out: AudioNode, t: number): void {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.08);
  }

  private snare(ctx: AudioContext, out: AudioNode, t: number): void {
    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.getNoise(ctx);
    filt.type = 'bandpass'; filt.frequency.value = 240; filt.Q.value = 0.8;
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(filt); filt.connect(gain); gain.connect(out);
    src.start(t); src.stop(t + 0.10);
  }

  private hihat(ctx: AudioContext, out: AudioNode, t: number): void {
    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.getNoise(ctx);
    filt.type = 'highpass'; filt.frequency.value = 7000;
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(filt); filt.connect(gain); gain.connect(out);
    src.start(t); src.stop(t + 0.05);
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.1);
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }
}
