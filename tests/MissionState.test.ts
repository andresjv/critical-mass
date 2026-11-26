import { describe, it, expect, beforeEach } from 'vitest';
import { MissionState } from '../src/state/MissionState';
import { LIMITS, TUNING } from '../src/state/tuning';

function startedState(difficulty: 'cadet' | 'pilot' | 'suicidal' = 'pilot') {
  const s = new MissionState();
  s.startMission({ theme: 'coldfront', difficulty, seed: 1 });
  return s;
}

describe('MissionState — city loss', () => {
  it('starts with 0 cities lost', () => {
    expect(startedState().citiesLost).toBe(0);
  });

  it('increments citiesLost on cityLost()', () => {
    const s = startedState();
    s.cityLost();
    expect(s.citiesLost).toBe(1);
    s.cityLost();
    expect(s.citiesLost).toBe(2);
  });

  it('isGameOver is true after losing 2 cities', () => {
    const s = startedState();
    expect(s.isGameOver).toBe(false);
    s.cityLost();
    expect(s.isGameOver).toBe(false);
    s.cityLost();
    expect(s.isGameOver).toBe(true);
  });
});

describe('MissionState — plane cap', () => {
  it('starts with the correct number of planes per difficulty', () => {
    expect(startedState('cadet').planes).toBe(TUNING.cadet.startingPlanes);
    expect(startedState('pilot').planes).toBe(TUNING.pilot.startingPlanes);
    expect(startedState('suicidal').planes).toBe(TUNING.suicidal.startingPlanes);
  });

  it('caps planes at 9 regardless of how many are added', () => {
    const s = startedState();
    for (let i = 0; i < 20; i++) s.addPlane();
    expect(s.planes).toBe(LIMITS.planeCap);
  });

  it('losePlane() does not go below 0', () => {
    const s = startedState('suicidal'); // starts with 3
    for (let i = 0; i < 10; i++) s.losePlane();
    expect(s.planes).toBe(0);
  });
});

describe('MissionState — Stage 5 unlock', () => {
  let s: MissionState;

  beforeEach(() => {
    s = startedState();
  });

  it('stage5Unlocked is false at mission start', () => {
    expect(s.stage5Unlocked).toBe(false);
  });

  it('stage5Unlocked is false after fewer than 4 sites destroyed', () => {
    s.siteDestroyed();
    s.siteDestroyed();
    s.siteDestroyed();
    expect(s.stage5Unlocked).toBe(false);
  });

  it('stage5Unlocked becomes true after all 4 sites destroyed', () => {
    for (let i = 0; i < LIMITS.launchSiteCount; i++) s.siteDestroyed();
    expect(s.stage5Unlocked).toBe(true);
  });

  it('sitesDestroyed is capped at launchSiteCount', () => {
    for (let i = 0; i < 10; i++) s.siteDestroyed();
    expect(s.sitesDestroyed).toBe(LIMITS.launchSiteCount);
  });
});

describe('MissionState — scoring', () => {
  it('applies scoreMultiplier to added points', () => {
    const s = startedState('suicidal'); // multiplier ×2
    s.addScore(1_000);
    expect(s.score).toBe(2_000);
  });

  it('rounds the score after multiplication', () => {
    const s = startedState('pilot'); // multiplier ×1.5
    s.addScore(100);
    expect(s.score).toBe(150);
  });

  it('accumulates score across multiple calls', () => {
    const s = startedState('cadet'); // multiplier ×1
    s.addScore(500);
    s.addScore(300);
    expect(s.score).toBe(800);
  });
});

describe('MissionState — startMission resets all state', () => {
  it('resets everything when startMission is called again', () => {
    const s = startedState();
    s.cityLost();
    s.siteDestroyed();
    s.addScore(9_999);
    s.losePlane();

    s.startMission({ theme: 'xenoworld', difficulty: 'cadet', seed: 99 });
    expect(s.citiesLost).toBe(0);
    expect(s.sitesDestroyed).toBe(0);
    expect(s.score).toBe(0);
    expect(s.planes).toBe(TUNING.cadet.startingPlanes);
    expect(s.theme).toBe('xenoworld');
  });
});
