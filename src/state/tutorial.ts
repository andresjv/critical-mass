// First-play tutorial: the slides shown the first time the player presses Play, and the
// step-by-step hints during the easier practice run that follows.
// Plain TypeScript (no Phaser / React). KEEP THIS FILE IN SYNC WITH THE GAME: whenever a main
// mechanic changes (new stage, control, weapon, rule), update the slides and hints here.
import type { DeviceHint } from './gameUi';

export interface TutorialSlide {
  /** Which illustration the menu draws for this slide. */
  art: 'mission' | 'fly' | 'weapons' | 'danger' | 'ground' | 'loadout';
  title: string;
  /** Short lines; `{move}`, `{fire}`, `{action}`, `{pause}` are replaced with the device's controls. */
  lines: string[];
}

export const TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    art: 'mission', title: 'Your mission',
    lines: [
      'Enemy missiles are about to launch. Fly four strikes to stop them.',
      'Each strike: take off from the hangar, fight through the attack run, then eject and fight on foot to the launch button.',
      'Beat all four on a level to win it.',
    ],
  },
  {
    art: 'fly', title: 'Flying',
    lines: [
      '{move} to fly: up and down changes height, left and right moves you forward and back.',
      'Stay above the ground and keep moving.',
    ],
  },
  {
    art: 'weapons', title: 'Guns and bombs',
    lines: [
      '{fire} shoots your guns forward at enemy jets.',
      '{action} drops a bomb. Bombs home in on nearby tanks and missile launchers.',
    ],
  },
  {
    art: 'danger', title: 'Watch out',
    lines: [
      'Your plane can take 3 hits; the hull gauge (top right) shows what is left. The 3rd hit downs it.',
      'Buildings and towers are solid: fly over them. Heat-seekers chase you: duck low to shake them.',
      'Run out of planes and the mission is over.',
    ],
  },
  {
    art: 'ground', title: 'Ground assault',
    lines: [
      'At the end of each run you eject and parachute in. Fight to the bunker; at the big red button a pop-up says press T (tap it on touch).',
      '{move} to walk and crouch, {action} or up to jump, {fire} to shoot. You can take 5 hits.',
      'Hold H (Y on a pad, GUNS on touch) to pick from the 4 guns you carry.',
    ],
  },
  {
    art: 'loadout', title: 'Medals and parts',
    lines: [
      'Beating a level earns its medal and unlocks a new jet, gun or bomb, plus a ground gun.',
      'Endless mode (in Select level) runs random biomes back to back: reach the hangar to fly again. It earns credits for the daily store (Guns & store), new every day; rarer guns show up less often.',
      'Equip parts from Inventory on the main menu. {pause} pauses the game.',
    ],
  },
];

/** Practice-run hints during the first attack run: [start second, text]. */
export const TUTORIAL_HINTS: readonly [number, string][] = [
  [1.5, '{move} to fly'],
  [8, '{fire} to shoot enemy jets'],
  [15, '{action} to drop a bomb on a tank'],
  [22, 'Fly over buildings and towers. You can take 3 hits'],
  [29, 'Reach the end of the run, then eject'],
];
/** Seconds each practice hint stays up. */
export const TUTORIAL_HINT_SECS = 5.5;

const CONTROLS: Record<DeviceHint, Record<'move' | 'fire' | 'action' | 'pause', string>> = {
  keyboard: { move: 'Arrow keys / WASD', fire: 'Space', action: 'Shift', pause: 'Esc' },
  gamepad:  { move: 'Left stick',        fire: 'A',     action: 'B',     pause: 'Start' },
  touch:    { move: 'The joystick',      fire: 'FIRE',  action: '◉',     pause: 'Switching away from the app' },
};

/** Fills in control names for the current device. */
export function withControls(text: string, device: DeviceHint): string {
  const c = CONTROLS[device] ?? CONTROLS.keyboard;
  return text.replace(/\{(move|fire|action|pause)\}/g, (_, k: keyof typeof c) => c[k]);
}

const KEY = 'cm_tutorial_v1';

export function isTutorialDone(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return true; }
}

export function markTutorialDone(): void {
  try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
}
