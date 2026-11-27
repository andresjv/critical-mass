import { useEffect } from 'react';
import { speakCallout } from '../game/audio/Speech';
import { AUDIO_MIX } from '../state/tuning';

/** Speaks each new on-screen callout once (keyed by text + expiry so repeats re-speak). */
export function useCalloutVoice(callout: string | null, calloutExpiry: number, paused: boolean): void {
  useEffect(() => {
    if (!callout || (calloutExpiry > 0 && Date.now() > calloutExpiry)) return;
    speakCallout(callout, paused ? AUDIO_MIX.musicWhenPaused : 1);
  }, [callout, calloutExpiry]); // not on pause toggles: only new callouts speak
}
