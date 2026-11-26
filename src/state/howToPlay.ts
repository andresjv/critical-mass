// howToPlay.ts — first-visit how-to-play card data and seen-tracking.
// Plain TypeScript: NO Phaser or React imports.

export type HowToPlayStage = 'attack_run' | 'silo_strike';

export interface HowToPlayInfo {
  title: string;
  lines: string[];
}

export const HOW_TO_PLAY: Record<HowToPlayStage, HowToPlayInfo> = {
  attack_run: {
    title: 'ATTACK RUN',
    lines: [
      '← →   Move position',
      '↑ ↓   Change altitude',
      'FIRE  Shoot forward',
      'Buildings + pylons are lethal',
      'Duck low to dodge heat-seekers',
    ],
  },
  silo_strike: {
    title: 'SILO STRIKE',
    lines: [
      '← →   Aim left / right',
      '↑ ↓   Aim altitude',
      'FIRE  Launch rocket',
      'Reticle turns ◆ when aligned',
      'Central silo ends the launch',
      'Side silos → +1 plane',
    ],
  },
};

const LS_PREFIX = 'cm_htplay_';

export function hasSeenHowToPlay(stage: HowToPlayStage): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(LS_PREFIX + stage) === '1';
}

export function markSeenHowToPlay(stage: HowToPlayStage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LS_PREFIX + stage, '1');
  }
}
