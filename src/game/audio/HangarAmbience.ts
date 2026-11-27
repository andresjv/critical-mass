// HangarAmbience — distant crew chatter over a low room hum.
// Each "voice" is a sawtooth through two vowel-formant bandpass filters, gated into
// syllables with phrase pauses, then muffled with a lowpass. Routed on the music bus so
// it quiets on pause along with the music. (Math.random here only shapes sound texture.)

import { getAudioCtx, getBus } from './audioCtx';

const VOICES   = 3;
const INTERVAL = 100;  // scheduler tick, ms
const AHEAD    = 0.3;  // schedule this far ahead, s
const FORMANTS: [number, number][] = [[700, 1200], [400, 2000], [300, 900], [500, 1700], [600, 1000]];
const PITCHES  = [105, 130, 175];

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export class HangarAmbience {
  private timer: ReturnType<typeof setInterval> | null = null;
  private out: GainNode | null = null;
  private room: AudioBufferSourceNode | null = null;
  private next: number[] = [];

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), INTERVAL);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    const ctx = getAudioCtx();
    if (ctx && this.out) {
      this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      const out = this.out, room = this.room;
      setTimeout(() => { try { room?.stop(); } catch { /* stopped */ } out.disconnect(); }, 800);
    }
    this.out = null; this.room = null; this.next = [];
  }

  private tick(): void {
    const ctx = getAudioCtx();
    const bus = getBus('music');
    if (!ctx || !bus) return;
    if (!this.out) this.build(ctx, bus);
    const out = this.out!;
    for (let v = 0; v < VOICES; v++) {
      while (this.next[v] < ctx.currentTime + AHEAD) {
        this.next[v] = this.syllable(ctx, out, v, Math.max(this.next[v], ctx.currentTime + 0.02));
      }
    }
  }

  private build(ctx: AudioContext, bus: GainNode): void {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    this.out.connect(bus);

    // Room hum: looped noise, heavily lowpassed.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    this.room = ctx.createBufferSource();
    this.room.buffer = buf; this.room.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const rg = ctx.createGain(); rg.gain.value = 0.5;
    this.room.connect(lp); lp.connect(rg); rg.connect(this.out);
    this.room.start();

    this.next = Array.from({ length: VOICES }, (_, i) => ctx.currentTime + 0.3 + i * rand(0.3, 0.9));
  }

  /** Schedules one syllable for voice v at time t; returns when the next one should start. */
  private syllable(ctx: AudioContext, out: AudioNode, v: number, t: number): number {
    const dur = rand(0.08, 0.22);
    const f0  = PITCHES[v] * rand(0.92, 1.1);
    const [f1, f2] = FORMANTS[Math.floor(Math.random() * FORMANTS.length)];

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f0 * rand(0.9, 1.08), t + dur);

    const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 6;
    const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 8;
    const muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 1600;
    const g = ctx.createGain();
    const peak = rand(0.25, 0.45);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.03);
    g.gain.setValueAtTime(peak, t + dur - 0.04);
    g.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(b1); osc.connect(b2); b1.connect(muffle); b2.connect(muffle);
    muffle.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);

    // Mostly short gaps between syllables, sometimes a pause between phrases.
    return t + dur + (Math.random() < 0.8 ? rand(0.03, 0.12) : rand(0.6, 1.8));
  }
}
