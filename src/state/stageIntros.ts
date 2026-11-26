// Stage intro data for the first-visit intro card.
// Each stage key maps to a StageIntroData object.
// Tracks which stages have been shown this session (clears on page reload).

import { gameUi, type StageIntroData } from './gameUi';

export type StageKey = 'map' | 'hangar' | 'attack_run' | 'silos';

const INTRO_DATA: Record<StageKey, StageIntroData> = {
  map: {
    stageName: 'COMMAND MAP',
    goal: 'Scramble your plane to intercept the launch',
    keyboard: ['FIRE / Space — scramble'],
    touch: ['Tap anywhere — scramble'],
  },
  hangar: {
    stageName: 'HANGAR LAUNCH',
    goal: 'Fly your plane through the bay doors',
    keyboard: ['↑ W — thrust', '← → A D — rotate', 'Shift K X — open doors'],
    touch: ['Stick up — thrust', 'Stick left/right — rotate', '◉ — open doors'],
  },
  attack_run: {
    stageName: 'ATTACK RUN',
    goal: 'Survive the terrain and reach the silos',
    keyboard: ['↑ ↓ — altitude', '← → — position', 'Space — fire gun'],
    touch: ['Stick — move', 'Fire button — shoot'],
  },
  silos: {
    stageName: 'SILO STRIKE',
    goal: 'Destroy the central silo to stop the launch',
    keyboard: ['Arrows — aim reticle', 'Space — fire rocket', 'Diamond = locked on target'],
    touch: ['Stick — aim', 'Fire — shoot', 'Diamond = locked'],
  },
};

/** Stages that have already been introduced this session. */
const shownStages = new Set<StageKey>();

/**
 * Show the stage intro card if this stage hasn't been shown this session.
 * Sets gameUi.stageIntro. The React component clears it on dismiss.
 */
export function showStageIntro(key: StageKey): void {
  if (shownStages.has(key)) return;
  shownStages.add(key);
  gameUi.stageIntro = INTRO_DATA[key];
}
