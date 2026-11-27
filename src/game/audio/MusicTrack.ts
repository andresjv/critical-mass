// MusicTrack — synthesised music loops on a Web Audio lookahead scheduler.
// A 25 ms timer schedules every 16th-note step that falls inside the next 200 ms, so timing
// stays tight regardless of JS jitter. Two songs:
//   BATTLE – tense, 108 BPM, D minor. Pulsing filtered bass ostinato, dark pad, sparse muted
//            square lead (retro but low-key), half-time drums with a ticking clock.
//   MENU   – upbeat, 132 BPM, F major. Bouncy bass, bright plucky hook, marching snare,
//            claps — a cheerful toy-army march. Original composition.

import { getAudioCtx, getBus } from './audioCtx';

const LOOKAHEAD = 0.20;
const INTERVAL  = 25;

/** Semitone offset from A4 (440 Hz) → Hz. */
const hz = (semi: number): number => 440 * Math.pow(2, semi / 12);
// Note helpers (semitones from A4).
const N: Record<string, number> = {
  C2: -33, D2: -31, E2: -29, F2: -28, G2: -26, A2: -24, Bb2: -23, C3: -21, D3: -19, E3: -17, F3: -16, G3: -14,
  A3: -12, Bb3: -11, C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, Bb4: 1, C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, A5: 12,
};

interface Song {
  bpm: number;
  steps: number;
  play(m: MusicTrack, ctx: AudioContext, out: AudioNode, step: number, t: number, stepDur: number): void;
}

// ── Battle ───────────────────────────────────────────────────────────────────
// 4 bars: Dm | Bb | C | A  (pedal-driven, minor, unresolved → tension)
const BATTLE_ROOTS = [N.D2, N.Bb2 - 12, N.C2, N.A2 - 12];
const BATTLE_PAD: number[][] = [
  [N.D3, N.F3, N.A3], [N.D3, N.F3, N.Bb3], [N.E3, N.G3, N.C4], [N.E3, N.A3, N.C4 + 1],
];
// Sparse lead motif: [step, note, lengthSteps]
const BATTLE_LEAD: [number, number, number][] = [
  [0, N.A4, 6], [6, N.Bb4, 2], [8, N.A4, 4], [12, N.F4, 4],
  [16, N.D4, 8], [24, N.F4, 4], [28, N.E4, 4],
  [32, N.G4, 6], [38, N.A4, 2], [40, N.G4, 4], [44, N.E4, 4],
  [48, N.C5 + 1, 8], [56, N.A4, 4], [60, N.E4, 4],
];

const BATTLE: Song = {
  bpm: 108, steps: 64,
  play(m, ctx, out, s, t, d) {
    const bar = Math.floor(s / 16), beat = s % 16;
    const root = BATTLE_ROOTS[bar];
    // Pulsing 16th bass: root with an octave jump on offbeats, filter opens through the bar.
    m.bass(ctx, out, t, hz(root + (beat % 4 === 2 ? 12 : 0)), d * 0.9, 380 + beat * 25);
    if (beat === 0) m.pad(ctx, out, t, BATTLE_PAD[bar].map(hz), d * 16);
    for (const [st, note, len] of BATTLE_LEAD) if (st === s) m.lead(ctx, out, t, hz(note), d * len, 0.07, 'square', 1700);
    // Half-time drums: kick on 1 and the "and" of 2, snare on 3, quiet 8th hats, clock tick.
    if (beat === 0 || beat === 6 || (bar === 3 && beat === 10)) m.kick(ctx, out, t, 0.75);
    if (beat === 8) m.snare(ctx, out, t, 0.4);
    if (beat % 2 === 0) m.hat(ctx, out, t, beat % 4 === 2 ? 0.07 : 0.04);
    if (beat % 4 === 0) m.clockTick(ctx, out, t);
    if (bar === 3 && beat >= 12) m.tom(ctx, out, t, 140 - (beat - 12) * 18);
  },
};

// ── Menu ─────────────────────────────────────────────────────────────────────
// 4 bars: F | C | Dm | Bb→C  (bright, heroic, bouncy)
const MENU_ROOTS = [N.F2, N.C2, N.D2, N.Bb2 - 12];
const MENU_CHORDS: number[][] = [
  [N.F3, N.A3, N.C4], [N.E3, N.G3, N.C4], [N.D3, N.F3, N.A3], [N.D3, N.F3, N.Bb3],
];
// Hook: [step, note, lengthSteps]
const MENU_HOOK: [number, number, number][] = [
  [0, N.C5, 2], [2, N.A4, 1], [3, N.C5, 1], [4, N.F5, 3], [8, N.E5, 2], [10, N.D5, 2], [12, N.C5, 4],
  [16, N.G4, 2], [18, N.C5, 2], [20, N.E5, 3], [24, N.D5, 2], [26, N.C5, 2], [28, N.G4, 4],
  [32, N.A4, 2], [34, N.D5, 2], [36, N.F5, 3], [40, N.E5, 2], [42, N.D5, 1], [43, N.E5, 1], [44, N.F5, 4],
  [48, N.D5, 2], [50, N.F5, 2], [52, N.G5, 4], [56, N.E5, 2], [58, N.G5, 2], [60, N.C5 + 12, 4],
];

const MENU: Song = {
  bpm: 132, steps: 64,
  play(m, ctx, out, s, t, d) {
    const bar = Math.floor(s / 16), beat = s % 16;
    const root = bar === 3 && beat >= 8 ? N.C2 : MENU_ROOTS[bar];
    // Bouncy root–fifth bass on 8ths.
    if (beat % 2 === 0) m.bass(ctx, out, t, hz(root + (beat % 4 === 2 ? 7 : 0) + 12), d * 1.6, 900);
    // Offbeat chord stabs.
    if (beat % 4 === 2) m.pad(ctx, out, t, MENU_CHORDS[bar].map(n => hz(n + 12)), d * 1.4, 0.05, 2400);
    for (const [st, note, len] of MENU_HOOK) if (st === s) m.lead(ctx, out, t, hz(note), d * len, 0.11, 'square', 3200);
    // March: kick on 1 & 3, snare on 2 & 4 with a roll into each phrase, claps doubling the snare.
    if (beat === 0 || beat === 8) m.kick(ctx, out, t, 0.8);
    if (beat === 4 || beat === 12) { m.snare(ctx, out, t, 0.45); m.clap(ctx, out, t); }
    if (bar % 2 === 1 && beat >= 13) m.snare(ctx, out, t, 0.18 + (beat - 13) * 0.06);
    if (beat % 2 === 1) m.hat(ctx, out, t, 0.06);
  },
};

export type SongName = 'battle' | 'menu';
const SONGS: Record<SongName, Song> = { battle: BATTLE, menu: MENU };

export class MusicTrack {
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly song: Song;

  constructor(song: SongName = 'battle') { this.song = SONGS[song]; }

  start(): void {
    if (this.fadeTimer !== null) { clearTimeout(this.fadeTimer); this.fadeTimer = null; this.stopScheduler(); }
    if (this.playing) return;
    this.step = 0;
    this.nextTime = 0;
    this.playing = true;
    this.timer = setInterval(() => this.tick(), INTERVAL);
  }

  fadeOut(duration = 0.5): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.master) { this.stopScheduler(); return; }
    this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    this.fadeTimer = setTimeout(() => { this.fadeTimer = null; this.stopScheduler(); }, (duration + 0.1) * 1000);
  }

  stop(): void {
    const ctx = getAudioCtx();
    if (this.master && ctx) this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.stopScheduler();
  }

  dispose(): void {
    this.stopScheduler();
    this.master = null; this.noiseBuffer = null;
  }

  // ── Scheduler ────────────────────────────────────────────────────────────

  private stopScheduler(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.playing = false;
    this.master?.disconnect();
    this.master = null;
  }

  private tick(): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.playing) return;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(getBus('music') ?? ctx.destination);
    }
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    const d = 60 / this.song.bpm / 4;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.song.play(this, ctx, this.master, this.step, this.nextTime, d);
      this.step = (this.step + 1) % this.song.steps;
      this.nextTime += d;
    }
  }

  // ── Instruments (used by the songs) ───────────────────────────────────────

  bass(ctx: AudioContext, out: AudioNode, t: number, f: number, len: number, cutoff: number): void {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    o2.type = 'square'; o2.frequency.value = f * 2; o2.detune.value = 6;
    fl.type = 'lowpass'; fl.frequency.value = cutoff; fl.Q.value = 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(out);
    o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
  }

  pad(ctx: AudioContext, out: AudioNode, t: number, freqs: number[], len: number, level = 0.045, cutoff = 900): void {
    const fl = ctx.createBiquadFilter(), g = ctx.createGain();
    fl.type = 'lowpass'; fl.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.4, len * 0.3));
    g.gain.setValueAtTime(level, t + len * 0.8);
    g.gain.linearRampToValueAtTime(0, t + len);
    fl.connect(g); g.connect(out);
    for (const f of freqs) for (const det of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(fl); o.start(t); o.stop(t + len + 0.05);
    }
  }

  lead(ctx: AudioContext, out: AudioNode, t: number, f: number, len: number, level: number, type: OscillatorType, cutoff: number): void {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = type; o.frequency.value = f;
    vib.frequency.value = 5.5; vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o.frequency);
    fl.type = 'lowpass'; fl.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.setValueAtTime(level * 0.8, t + len * 0.7);
    g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(fl); fl.connect(g); g.connect(out);
    o.start(t); vib.start(t); o.stop(t + len + 0.02); vib.stop(t + len + 0.02);
  }

  kick(ctx: AudioContext, out: AudioNode, t: number, level: number): void {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.17);
  }

  snare(ctx: AudioContext, out: AudioNode, t: number, level: number): void {
    this.noise(ctx, out, t, 'bandpass', 1800, 0.8, level, 0.12);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    g.gain.setValueAtTime(level * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
  }

  clap(ctx: AudioContext, out: AudioNode, t: number): void {
    for (let k = 0; k < 3; k++) this.noise(ctx, out, t + k * 0.012, 'bandpass', 1200, 1.5, 0.18, 0.05);
  }

  hat(ctx: AudioContext, out: AudioNode, t: number, level: number): void {
    this.noise(ctx, out, t, 'highpass', 7500, 0.7, level, 0.035);
  }

  /** Thin wooden "clock" tick — keeps the pulse anxious without being loud. */
  clockTick(ctx: AudioContext, out: AudioNode, t: number): void {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 2100;
    g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.03);
  }

  tom(ctx: AudioContext, out: AudioNode, t: number, f: number): void {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.15);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
  }

  private noise(ctx: AudioContext, out: AudioNode, t: number, type: BiquadFilterType, f: number, q: number, level: number, len: number): void {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.getNoise(ctx);
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(fl); fl.connect(g); g.connect(out);
    src.start(t); src.stop(t + len + 0.01);
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.2);
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; // audio noise, not game logic
    }
    return this.noiseBuffer;
  }
}
