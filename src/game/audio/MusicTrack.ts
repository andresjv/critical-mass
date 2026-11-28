// MusicTrack — synthesised music loops on a Web Audio lookahead scheduler.
// A 25 ms timer schedules every 16th-note step that falls inside the next 200 ms, so timing
// stays tight regardless of JS jitter. Two songs:
//   BATTLE – tense, 108 BPM, D minor. Pulsing filtered bass ostinato, dark pad, sparse muted
//            square lead (retro but low-key), half-time drums with a ticking clock.
//   MENU   – tense orchestral war-march, 96 BPM, C minor. Galloping low strings, sustained
//            string section, horn melody, timpani and war drums, choir in the second half,
//            all in a reverb hall. Epic-but-playful battle-menu feel. Original composition.

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
  /** Reverb send level (0 = dry). */
  reverb?: number;
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
/** Note name (e.g. 'Eb4') → semitones from A4. */
const nt = (name: string): number => {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(name);
  if (!m) return 0;
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  return base[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + (Number(m[3]) - 4) * 12;
};
// 8 bars: Cm | Ab | Fm | G | Cm | Ab | Bb | G   (minor, ends on the dominant → loops with tension)
const MENU_ROOTS = ['C2', 'Ab1', 'F2', 'G1', 'C2', 'Ab1', 'Bb1', 'G1'].map(nt);
const MENU_CHORDS: number[][] = [
  ['C3', 'G3', 'Eb4'], ['C3', 'Ab3', 'Eb4'], ['C3', 'F3', 'Ab3'], ['B2', 'D3', 'G3'],
  ['C3', 'G3', 'Eb4'], ['C3', 'Ab3', 'Eb4'], ['D3', 'F3', 'Bb3'], ['B2', 'D3', 'G3'],
].map(c => c.map(nt));
// Horn melody: [step, note, lengthSteps]
const MENU_HORN: [number, number, number][] = ([
  [0, 'C4', 6], [6, 'Eb4', 2], [8, 'G4', 8],
  [16, 'Ab4', 6], [22, 'G4', 2], [24, 'F4', 4], [28, 'Eb4', 4],
  [32, 'F4', 6], [38, 'Ab4', 2], [40, 'C5', 8],
  [48, 'B4', 12], [60, 'D5', 4],
  [64, 'C5', 6], [70, 'D5', 2], [72, 'Eb5', 8],
  [80, 'Ab4', 6], [86, 'C5', 2], [88, 'Eb5', 8],
  [96, 'D5', 6], [102, 'C5', 2], [104, 'Bb4', 4], [108, 'D5', 4],
  [112, 'B4', 8], [120, 'G4', 4], [124, 'B4', 4],
] as [number, string, number][]).map(([st, n, len]) => [st, nt(n), len]);

const MENU: Song = {
  bpm: 96, steps: 128, reverb: 0.32,
  play(m, ctx, out, s, t, d) {
    const bar = Math.floor(s / 16), beat = s % 16, big = bar >= 4;
    const root = MENU_ROOTS[bar];
    // Galloping low strings: da-da-DUM on every beat (16ths 0, 2, 3), fifth on the last 16th.
    const g = beat % 4;
    if (g === 0 || g === 2 || g === 3) m.spiccato(ctx, out, t, hz(root + 12 + (g === 3 && beat === 15 ? 7 : 0)), g === 0 ? 0.15 : 0.1);
    // Sustained string section, one chord per bar (an octave higher in the second half).
    if (beat === 0) m.strings(ctx, out, t, MENU_CHORDS[bar].map(n => hz(n + (big ? 12 : 0))), d * 16, big ? 0.03 : 0.024);
    // Choir enters for the climb.
    if (big && beat === 0) m.choir(ctx, out, t, MENU_CHORDS[bar].map(hz), d * 16, 0.022);
    for (const [st, note, len] of MENU_HORN) if (st === s) m.brass(ctx, out, t, hz(note), d * len, big ? 0.085 : 0.065);
    // Low brass hits on the turnarounds and da-DUM stabs in the second half.
    if ((bar === 3 || bar === 7) && beat === 0) m.brass(ctx, out, t, hz(root + 12), d * 8, 0.09);
    if (big && (beat === 14 || beat === 15)) m.brass(ctx, out, t, hz(root + 24), d * (beat === 14 ? 0.8 : 1.6), 0.05);
    // Timpani on the downbeats, rolls into each half.
    if (beat === 0) m.timpani(ctx, out, t, hz(root + 12), 0.34);
    if (big && beat === 8) m.timpani(ctx, out, t, hz(root + 19), 0.24);
    if ((bar === 3 && beat >= 12) || (bar === 7 && beat >= 8)) m.timpani(ctx, out, t, hz(MENU_ROOTS[0] + 12), 0.08 + (beat - 8) * 0.022);
    // War drum march and quiet military snare.
    if (beat === 0 || beat === 6 || beat === 8) m.kick(ctx, out, t, beat === 0 ? 0.36 : 0.22);
    if (big) {
      if (beat === 4 || beat === 12) m.snare(ctx, out, t, 0.2);
      if (beat === 11 || beat === 13) m.snare(ctx, out, t, 0.08);
    }
    // Crash at the top of each half, reverse swell into the loop point.
    if (s === 0 || s === 64) m.cymbal(ctx, out, t, 0.12);
    if (s === 112) m.swell(ctx, out, t, d * 16, 0.1);
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
      const bus = getBus('music') ?? ctx.destination;
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(bus);
      if (this.song.reverb) {
        const verb = ctx.createConvolver(), wet = ctx.createGain();
        verb.buffer = this.makeImpulse(ctx, 2.6);
        wet.gain.value = this.song.reverb;
        this.master.connect(verb); verb.connect(wet); wet.connect(bus);
      }
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

  /** Short bowed note for galloping string ostinatos. */
  spiccato(ctx: AudioContext, out: AudioNode, t: number, f: number, level: number): void {
    const fl = ctx.createBiquadFilter(), g = ctx.createGain();
    fl.type = 'lowpass'; fl.frequency.value = 1100; fl.Q.value = 0.8;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    fl.connect(g); g.connect(out);
    for (const [mult, det] of [[1, -6], [1, 6], [0.5, 0]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f * mult; o.detune.value = det;
      o.connect(fl); o.start(t); o.stop(t + 0.18);
    }
  }

  /** Sustained string section: detuned saws with vibrato, soft attack. */
  strings(ctx: AudioContext, out: AudioNode, t: number, freqs: number[], len: number, level: number): void {
    const fl = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    fl.type = 'lowpass'; fl.frequency.value = 1700; fl.Q.value = 0.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.45);
    g.gain.setValueAtTime(level, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0, t + len + 0.25);
    vib.frequency.value = 5.2; vg.gain.value = 7; vib.connect(vg);
    fl.connect(g); g.connect(out);
    for (const f of freqs) for (const det of [-11, 0, 11]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      vg.connect(o.detune);
      o.connect(fl); o.start(t); o.stop(t + len + 0.3);
    }
    vib.start(t); vib.stop(t + len + 0.3);
  }

  /** Horn / brass: the filter swells open on each note for a bold, round attack. */
  brass(ctx: AudioContext, out: AudioNode, t: number, f: number, len: number, level: number): void {
    const fl = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    fl.type = 'lowpass'; fl.Q.value = 1.5;
    fl.frequency.setValueAtTime(350, t);
    fl.frequency.linearRampToValueAtTime(2000, t + 0.1);
    fl.frequency.exponentialRampToValueAtTime(1100, t + Math.max(0.15, len));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.05);
    g.gain.setValueAtTime(level * 0.85, t + Math.max(0.06, len - 0.06));
    g.gain.linearRampToValueAtTime(0, t + len + 0.08);
    vib.frequency.value = 4.8; vg.gain.value = 5; vib.connect(vg);
    fl.connect(g); g.connect(out);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      vg.connect(o.detune); o.connect(fl); o.start(t); o.stop(t + len + 0.1);
    }
    vib.start(t); vib.stop(t + len + 0.1);
  }

  /** Choir "ah": saws through two vowel formants, slow swell. */
  choir(ctx: AudioContext, out: AudioNode, t: number, freqs: number[], len: number, level: number): void {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.7);
    g.gain.setValueAtTime(level, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0, t + len + 0.3);
    g.connect(out);
    const formants = [[750, 4, 1], [1150, 5, 0.6]].map(([fr, q, amp]) => {
      const b = ctx.createBiquadFilter(), ga = ctx.createGain();
      b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q; ga.gain.value = amp;
      b.connect(ga); ga.connect(g); return b;
    });
    for (const f of freqs) for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      for (const b of formants) o.connect(b);
      o.start(t); o.stop(t + len + 0.35);
    }
  }

  /** Timpani: tuned boom with a slight pitch settle and a felt-mallet thump. */
  timpani(ctx: AudioContext, out: AudioNode, t: number, f: number, level: number): void {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.12, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    o2.type = 'triangle'; o2.frequency.value = f * 1.5;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    g2.gain.setValueAtTime(level * 0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); o2.connect(g2); g.connect(out); g2.connect(out);
    o.start(t); o2.start(t); o.stop(t + 1.15); o2.stop(t + 0.4);
    this.noise(ctx, out, t, 'lowpass', 500, 0.7, level * 0.5, 0.06);
  }

  cymbal(ctx: AudioContext, out: AudioNode, t: number, level: number): void {
    this.noise(ctx, out, t, 'highpass', 5500, 0.5, level, 1.8);
  }

  /** Rising noise wash leading into a downbeat. */
  swell(ctx: AudioContext, out: AudioNode, t: number, len: number, level: number): void {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.getNoise(ctx); src.loop = true;
    fl.type = 'highpass'; fl.frequency.setValueAtTime(1500, t); fl.frequency.linearRampToValueAtTime(6000, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + len);
    g.gain.linearRampToValueAtTime(0, t + len + 0.02);
    src.connect(fl); fl.connect(g); g.connect(out);
    src.start(t); src.stop(t + len + 0.05);
  }

  /** Decaying stereo noise as a reverb impulse (audio texture only, not game logic). */
  private makeImpulse(ctx: AudioContext, secs: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

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
    src.buffer = this.getNoise(ctx); src.loop = true;
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
