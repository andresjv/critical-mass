// HangarAmbience — room hum, a faint distant murmur, and the crew's spoken lines.
// Speech is synthesised to sound like real (unintelligible) talking rather than beeps:
// words of 1–3 syllables with consonant onsets (fricative hiss, plosive clicks), vowels shaped
// by three formant filters that glide between vowels, a sentence pitch contour that drifts down
// and rises at the end of a question, stressed syllables, and short pauses between words.
// 'radio' voices (Moon) are band-limited, slightly distorted and wrapped in squelch clicks.
// Routed on the music bus so it quiets on pause with the music.
// (Math.random here only shapes sound texture, never game logic.)

import { getAudioCtx, getBus } from './audioCtx';

interface VoiceSpec { f0: number; formant: number }
/** A mix of lower and higher voices; crew index picks one. */
const VOICES: VoiceSpec[] = [
  { f0: 112, formant: 1 }, { f0: 196, formant: 1.17 }, { f0: 98, formant: 0.95 },
  { f0: 132, formant: 1.03 }, { f0: 214, formant: 1.2 }, { f0: 120, formant: 0.98 },
];
/** Vowel formants F1, F2, F3 (Hz, adult male reference). */
const VOWELS: [number, number, number][] = [
  [730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410],
  [300, 870, 2240], [500, 1500, 2500], [660, 1720, 2410],
];
const MURMUR_EVERY = [2.5, 6];

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export class HangarAmbience {
  private out: GainNode | null = null;
  private room: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextMurmur = 0;

  constructor(private readonly radio = false) {}

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), 200);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    const ctx = getAudioCtx();
    if (ctx && this.out) {
      this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      const out = this.out, room = this.room;
      setTimeout(() => { try { room?.stop(); } catch { /* stopped */ } out.disconnect(); }, 800);
    }
    this.out = null; this.room = null;
  }

  /** Suit-radio key click + squelch (Moon), played around each spoken line. */
  squelch(release: boolean): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.out) return;
    if (release) this.burst(ctx, this.out, ctx.currentTime + 0.02, 'bandpass', 2000, 0.16, 0.09, 1.0);
    else this.burst(ctx, this.out, ctx.currentTime + 0.02, 'bandpass', 2400, 0.12, 0.06, 1.2);
  }

  /** Fallback when the browser has no speech voices: babble lasting about `secs`. */
  speak(who: number, secs: number, question: boolean): void {
    const ctx = getAudioCtx();
    if (!ctx || !this.out) return;
    const v = VOICES[who % VOICES.length];
    this.utterance(ctx, this.out, v, ctx.currentTime + 0.05, secs, question, this.radio, 0.55, 3800);
  }

  private tick(): void {
    const ctx = getAudioCtx();
    const bus = getBus('music');
    if (!ctx || !bus) return;
    if (!this.out) this.build(ctx, bus);
    // Faint conversation somewhere else in the hangar, heavily muffled.
    if (ctx.currentTime >= this.nextMurmur) {
      const secs = rand(0.8, 2.2);
      this.utterance(ctx, this.out!, pick(VOICES), ctx.currentTime + 0.05, secs, Math.random() < 0.25, this.radio, 0.12, 700);
      this.nextMurmur = ctx.currentTime + secs + rand(MURMUR_EVERY[0], MURMUR_EVERY[1]);
    }
  }

  private build(ctx: AudioContext, bus: GainNode): void {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    this.out.connect(bus);
    // Room hum: looped brown noise, heavily lowpassed.
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
    this.nextMurmur = ctx.currentTime + rand(1, 3);
  }

  private white(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const n = Math.floor(ctx.sampleRate * 0.5);
      this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /** One spoken phrase from t lasting about `secs`. */
  private utterance(
    ctx: AudioContext, dest: AudioNode, v: VoiceSpec, t0: number, secs: number,
    question: boolean, radio: boolean, level: number, bright: number,
  ): void {
    // Per-utterance output chain: brightness lowpass, optional radio colouring.
    const out = ctx.createGain(); out.gain.value = level;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright;
    out.connect(lp);
    if (radio) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
      const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 2600;
      const shape = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
      shape.curve = curve;
      lp.connect(hp); hp.connect(shape); shape.connect(bp); bp.connect(dest);
      this.burst(ctx, dest, t0 - 0.04, 'bandpass', 2400, 0.12, 0.06, 1.2);          // key-up squelch
      this.burst(ctx, dest, t0 + secs + 0.05, 'bandpass', 2000, 0.16, 0.09, 1.0);   // release squelch
    } else {
      lp.connect(dest);
    }

    // Voice source: one sawtooth for the whole phrase, pitch automated; formant filters glide.
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const amp = ctx.createGain(); amp.gain.value = 0;
    const forms = [0, 1, 2].map(k => {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = [7, 9, 10][k];
      const g = ctx.createGain(); g.gain.value = [1, 0.7, 0.35][k];
      amp.connect(b); b.connect(g); g.connect(out);
      return b;
    });
    osc.connect(amp);

    let t = t0;
    const end = t0 + secs;
    let vowel = pick(VOWELS);
    const pitchAt = (p: number) => v.f0 * (1.12 - 0.22 * p);
    osc.frequency.setValueAtTime(pitchAt(0), t);
    for (const b of forms) b.frequency.setValueAtTime(1000, t);

    let wordLeft = Math.floor(rand(1, 4));
    while (t < end - 0.08) {
      const p = (t - t0) / secs;
      const last = end - t < 0.32;
      const stressed = Math.random() < 0.3;
      const dur = rand(0.1, 0.19) * (stressed ? 1.25 : 1) * (last ? 1.3 : 1);

      // Onset consonant.
      const c = Math.random();
      if (c < 0.22) this.burst(ctx, out, t, 'highpass', rand(4200, 6500), rand(0.05, 0.09), 0.09, 0.7);    // s / sh / f
      else if (c < 0.5) this.burst(ctx, out, t, 'bandpass', rand(1500, 3800), 0.018, 0.16, 1.5);       // t / k / p
      const vt = t + (c < 0.22 ? 0.05 : c < 0.5 ? 0.015 : 0);

      // Vowel: glide formants to the new vowel, set pitch (stress lifts it), envelope in.
      vowel = Math.random() < 0.8 ? pick(VOWELS) : vowel;
      vowel.forEach((fr, k) => forms[k].frequency.linearRampToValueAtTime(fr * v.formant, vt + 0.04));
      let f0 = pitchAt(p) * (stressed ? 1.12 : 1) * rand(0.97, 1.03);
      osc.frequency.linearRampToValueAtTime(f0, vt + 0.03);
      if (last) {
        f0 = f0 * (question ? 1.35 : 0.8);
        osc.frequency.linearRampToValueAtTime(f0, vt + dur);
      }
      const peak = stressed ? 0.42 : 0.3;
      amp.gain.setValueAtTime(0.0001, vt);
      amp.gain.linearRampToValueAtTime(peak, vt + 0.02);
      amp.gain.linearRampToValueAtTime(peak * 0.7, vt + dur * 0.75);
      amp.gain.linearRampToValueAtTime(0.0001, vt + dur);

      // Occasional closing consonant.
      if (Math.random() < 0.25) this.burst(ctx, out, vt + dur - 0.01, 'bandpass', rand(2000, 4500), 0.02, 0.1, 1.5);

      t = vt + dur;
      if (--wordLeft <= 0) {
        wordLeft = Math.floor(rand(1, 4));
        t += Math.random() < 0.12 ? rand(0.16, 0.28) : rand(0.03, 0.08);   // comma pause / word gap
      }
    }
    osc.start(t0); osc.stop(Math.max(t, end) + 0.1);
  }

  /** Short filtered noise burst (consonants, radio squelch). */
  private burst(ctx: AudioContext, out: AudioNode, t: number, type: BiquadFilterType, f: number, len: number, level: number, q: number): void {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.white(ctx);
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.01, len * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(fl); fl.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.3); src.stop(t + len + 0.02);
  }
}
