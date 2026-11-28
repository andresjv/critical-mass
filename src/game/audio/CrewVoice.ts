// CrewVoice — the hangar crew actually say their lines out loud, using the browser's built-in
// speech voices (Web Speech API). Each crew member gets their own voice, pitch and pace so a
// conversation sounds like two different people; volume follows the SFX setting and stays low
// so it reads as overheard chatter, not narration. Without speech support the chatter falls back to a
// murmur timed by word count.

import { settings } from '../../state/settings';
import { HANGAR } from '../../state/tuning';

/** Novelty/effect voices shipped on macOS/iOS that sound nothing like a person. */
const NOVELTY = /bells|bubbles|boing|cellos|zarvox|trinoids|whisper|wobble|bahh|albert|bad news|good news|jester|organ|superstar|hysterical|deranged|pipe|grandpa|grandma|rocko|shelley|sandy|flo|reed|eddy|kathy|fred|junior|ralph|princess|agnes|vicki|victoria/i;

/** Per-crew pitch and pace offsets so even the same OS voice sounds like different people. */
const PERSONA: { pitch: number; rate: number }[] = [
  { pitch: 0.85, rate: 1.02 }, { pitch: 1.15, rate: 1.08 }, { pitch: 0.75, rate: 0.96 },
  { pitch: 1.0, rate: 1.12 }, { pitch: 1.25, rate: 1.0 }, { pitch: 0.92, rate: 1.05 },
];

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let voices: SpeechSynthesisVoice[] = [];
function loadVoices(): void {
  const s = synth();
  if (!s) return;
  const all = s.getVoices().filter(v => v.lang.toLowerCase().startsWith('en') && !NOVELTY.test(v.name));
  // Prefer natural/enhanced voices, then local ones; keep a few distinct ones.
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|enhanced|premium|neural|google/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  voices = all.sort((a, b) => score(b) - score(a)).slice(0, 8);
}
if (synth()) {
  loadVoices();
  synth()!.addEventListener?.('voiceschanged', loadVoices);
}

/** iOS only lets speech start after a gesture: call from a real tap/click/key handler. */
let unlocked = false;
export function unlockSpeech(): void {
  const s = synth();
  if (unlocked || !s) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  s.speak(u);
}

export function speechAvailable(): boolean { return synth() !== null; }

/** Stop anyone mid-sentence (pause, tab hidden, leaving the hangar). */
export function hushCrew(): void { synth()?.cancel(); }

/**
 * Crew member `who` says `text`. `onEnd` fires when they finish (or immediately if speech
 * isn't available / muted, so the caller falls back to its own timing).
 */
export function speakLine(who: number, text: string, radio: boolean, onEnd: () => void): boolean {
  const s = synth();
  const vol = HANGAR.crewVoiceVolume * settings.sfxVolume;
  if (!s || vol < 0.02) return false;
  if (!voices.length) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  const p = PERSONA[who % PERSONA.length];
  if (voices.length) u.voice = voices[who % voices.length];
  u.lang = u.voice?.lang ?? 'en-US';
  // Radio voices are a touch faster and flatter, like clipped comms.
  u.pitch = radio ? p.pitch * 0.92 : p.pitch;
  u.rate = radio ? p.rate * 1.08 : p.rate;
  u.volume = vol;
  let done = false;
  const finish = () => { if (!done) { done = true; onEnd(); } };
  u.onend = finish;
  u.onerror = finish;
  s.speak(u);
  return true;
}
