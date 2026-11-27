// Speech — British military-style spoken callouts via the browser's Web Speech API.
// Runs on-device (no voice files). Mobile browsers only allow speech after it has been
// started once inside a real user gesture, so primeSpeech() is called from the DOM
// gesture handler in GameCanvas; after that, speakCallout() works from the game loop.

const PREFERRED = /daniel|arthur|oliver|george|uk english male|male/i;

let primed = false;
let voice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  const gb = voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('en-gb'));
  voice = gb.find(v => PREFERRED.test(v.name)) ?? gb[0]
       ?? voices.find(v => v.lang.toLowerCase().startsWith('en')) ?? null;
}

/** Call inside a user-gesture handler (tap/click/key) to unlock speech on mobile. */
export function primeSpeech(): void {
  const s = synth();
  if (!s || primed) return;
  primed = true;
  pickVoice();
  s.addEventListener?.('voiceschanged', pickVoice);
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  s.speak(u);
}

/** Turns HUD callout text ("+500  NICE SHOT", "CITY LOST: X") into a spoken line. */
function toSpoken(text: string): string {
  const t = text
    .replace(/^\+1 PLANE$/i, 'Extra plane')
    .replace(/\+\d+/g, '')
    .replace(/[:]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Speak a callout, cutting off any line still playing. volume 0–1. */
export function speakCallout(text: string, volume = 1): void {
  const s = synth();
  const line = toSpoken(text);
  if (!s || !primed || !line) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(line + '!');
  if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-GB'; }
  u.rate   = 1.1;  // clipped, urgent delivery
  u.pitch  = 0.75; // deeper, gruffer
  u.volume = volume;
  s.speak(u);
}

export function stopSpeech(): void {
  synth()?.cancel();
}
