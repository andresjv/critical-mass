// VoiceCallout — military-style audio callouts via Web Audio API.
// speechSynthesis is blocked on iOS/Android from rAF callbacks, so we
// synthesise a short "radio blip" instead and expose the text via callback.
// Sounds: static crackle → rising tone → message tone at freq for ~0.4s.

import { getAudioCtx } from './audioCtx';

const COOLDOWN_MS = 2800;

// Different tones for different message types so the player can learn them.
const TONES: Record<string, number> = {
  engage:    660,   // A5 — mission start
  bomb:      440,   // A4 — bomb drop
  hostile:   880,   // A5 octave — warning
  heat:      1047,  // C6 — urgent
  eject:     784,   // G5 — crash
  complete:  523,   // C5 — success
  failed:    220,   // A3 — doom
};

export class VoiceCallout {
  private lastAt = 0;
  private onText: ((text: string) => void) | null = null;

  /** Optional callback so the caller can show the text on-screen. */
  setTextCallback(fn: (text: string) => void): void {
    this.onText = fn;
  }

  say(text: string, toneKey: string, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastAt < COOLDOWN_MS) return;
    this.lastAt = now;

    this.onText?.(text);
    this.playRadioBlip(TONES[toneKey] ?? 440);
  }

  stop(): void {
    // nothing persistent to stop
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private playRadioBlip(freq: number): void {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Static crackle (noise burst through bandpass).
    const noise = ctx.createBufferSource();
    const noiseLen = Math.floor(ctx.sampleRate * 0.06);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 2000; noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
    noise.start(t0); noise.stop(t0 + 0.07);

    // Message tone: square wave at freq, 0.28s, with brief volume envelope.
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0 + 0.05);
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.08);
    gain.gain.setValueAtTime(0.18, t0 + 0.30);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0 + 0.05); osc.stop(t0 + 0.40);
  }

}
