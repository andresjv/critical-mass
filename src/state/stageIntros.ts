// Stage intro data for the first-visit intro card.
// Each stage key maps to a StageIntroData object.
// Tracks which stages have been shown this session (clears on page reload).

import { gameUi, type StageIntroData } from './gameUi';

export type StageKey = 'map' | 'hangar' | 'attack_run' | 'ground' | 'ground_endless';

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
  ground: {
    stageName: 'GROUND ASSAULT',
    goal: 'Fight to the bunker and press the red button (T). You can take 5 hits',
    keyboard: ['← → — move, ↓ — crouch', '↑ or Shift K X — jump', 'Space — shoot', 'Hold H — pick a gun (1–4 also swap)', 'T — press button / board plane'],
    touch: ['Stick — move / crouch', 'JUMP — jump', 'SHOOT — fire', 'Hold GUNS — pick a gun', 'Tap the pop-up — press / board'],
  },
  ground_endless: {
    stageName: 'ENDLESS · ON FOOT',
    goal: 'Fight through to the hangar and board your plane (T). You can take 8 hits. Every enemy is 100 points; 1000 points = 5 credits',
    keyboard: ['← → — move, ↓ — crouch', '↑ or Shift K X — jump', 'Space — shoot', 'Hold H — pick a gun (1–4 also swap)', 'T — board plane'],
    touch: ['Stick — move / crouch', 'JUMP — jump', 'SHOOT — fire', 'Hold GUNS — pick a gun', 'Tap the pop-up — board'],
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
