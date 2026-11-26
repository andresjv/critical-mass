// VoiceCallout — military-style voice tips via Web Speech API.
// Short clipped phrases with a 2.5 s global cooldown so they never overlap.

const COOLDOWN_MS = 2500;

export class VoiceCallout {
  private synth: SpeechSynthesis | null = null;
  private lastAt  = 0;
  private ready   = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.ready = true;
    }
  }

  say(text: string, force = false): void {
    if (!this.ready || !this.synth) return;
    const now = performance.now();
    if (!force && now - this.lastAt < COOLDOWN_MS) return;
    this.lastAt = now;
    this.synth.cancel();
    const utt    = new SpeechSynthesisUtterance(text);
    utt.rate     = 1.0;
    utt.pitch    = 0.6;  // lower pitch = more authoritative
    utt.volume   = 0.9;
    this.synth.speak(utt);
  }

  stop(): void {
    this.synth?.cancel();
  }
}
