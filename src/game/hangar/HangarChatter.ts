// HangarChatter — runs short conversations between pairs of crew: picks an exchange from the
// location's script, has the two stop and face each other and murmur back and forth (synthesised
// unintelligible babble from HangarAmbience, timed by each line's length). No text is shown.
import type { HangarLocal } from '../theme/hangarLocal';
import type { Rng } from '../../state/rng';
import { HANGAR } from '../../state/tuning';
import { TALK_PAIRS, type HangarCrew } from './HangarDecor';
import type { HangarAmbience } from '../audio/HangarAmbience';

/** Seconds a line takes to say (used for the gesture/face timing and as a no-speech fallback). */
export function lineSecs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(HANGAR.chatterLineMax, HANGAR.chatterLineBase + words * HANGAR.chatterPerWord);
}

export class HangarChatter {
  private order: number[] = [];
  private lines: readonly string[] | null = null;
  private pair: readonly [number, number] = [0, 1];
  private idx = 0;
  /** Seconds until the next line (or next exchange when idle). */
  private wait: number;
  private speaker = -1;

  constructor(
    private readonly local: HangarLocal, private readonly rng: Rng,
    private readonly crew: HangarCrew, private readonly voice: HangarAmbience,
  ) {
    this.wait = HANGAR.chatterFirstDelay;
  }

  /** Stop talking now (pause, tab hidden, takeoff, leaving the hangar). */
  hush(): void {
    if (this.speaker >= 0) this.crew.setSpeaking(this.speaker, false);
  }

  update(dt: number): void {
    this.wait -= dt;
    if (this.wait > 0) return;
    if (!this.lines) this.startExchange();
    const lines = this.lines!;
    if (this.idx >= lines.length) {
      // Exchange over: stop speaking, rest before the next one.
      this.crew.setSpeaking(this.pair[0], false); this.crew.setSpeaking(this.pair[1], false);
      this.lines = null;
      this.wait = HANGAR.chatterGapMin + this.rng.next() * (HANGAR.chatterGapMax - HANGAR.chatterGapMin);
      return;
    }
    const text = lines[this.idx];
    const speaker = this.pair[this.idx % 2], listener = this.pair[(this.idx + 1) % 2];
    const secs = lineSecs(text);
    this.speaker = speaker;
    this.crew.setSpeaking(speaker, true); this.crew.setSpeaking(listener, false);
    this.crew.converse(speaker, listener, secs + HANGAR.chatterReplyGap + 0.2);
    const radio = this.local.voice === 'radio';
    if (radio) this.voice.squelch(false);
    this.voice.speak(speaker, secs, text.trim().endsWith('?'));
    if (radio) this.voice.squelchAfter(secs);
    this.wait = secs + HANGAR.chatterReplyGap;
    this.idx++;
  }

  private startExchange(): void {
    const script = this.local.chatter;
    if (!this.order.length) {
      this.order = script.map((_, i) => i);
      for (let i = this.order.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
      }
    }
    this.lines = script[this.order.pop()!];
    this.pair = TALK_PAIRS[Math.floor(this.rng.next() * TALK_PAIRS.length)];
    this.idx = 0;
  }
}
