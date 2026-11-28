import { describe, it, expect, beforeEach } from 'vitest';
import { MissionState } from '../src/state/MissionState';
import { ENDLESS, LIMITS, TUNING } from '../src/state/tuning';

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

describe('MissionState — level and menu lifecycle', () => {
  it('defaults to the Cold Front level and is not started until a mission begins', () => {
    const s = new MissionState();
    expect(s.started).toBe(false);
    expect(s.level).toBe('coldfront');
  });

  it('stores the chosen level when a mission starts', () => {
    const s = new MissionState();
    s.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 5, level: 'moon' });
    expect(s.started).toBe(true);
    expect(s.level).toBe('moon');
  });

  it('endMission sends the player back to the menu state', () => {
    const s = startedState();
    s.endMission();
    expect(s.started).toBe(false);
    expect(s.planes).toBe(0);
  });
});

describe('MissionState — endless', () => {
  it('starts in a seeded random biome with no missile clock', () => {
    const a = new MissionState(), b = new MissionState();
    a.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 42, endless: true });
    b.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 42, endless: true });
    expect(a.endless).toBe(true);
    expect(a.level).toBe(b.level);
    expect(a.impactClock).toBe(0);
  });

  it('moves to a different biome each stage, the same way for the same seed', () => {
    const a = new MissionState(), b = new MissionState();
    a.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 7, endless: true });
    b.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 7, endless: true });
    for (let i = 0; i < 10; i++) {
      const prev = a.level;
      expect(a.nextEndlessStage()).not.toBe(prev);
      expect(b.nextEndlessStage()).toBe(a.level);
    }
    expect(a.endlessStage).toBe(10);
  });

  it('a normal mission is not endless', () => {
    expect(startedState().endless).toBe(false);
  });
});

describe('MissionState — endless scoring and credits', () => {
  it('every enemy is worth a flat 100 in endless, normal points otherwise', () => {
    const e = new MissionState();
    e.startMission({ theme: 'coldfront', difficulty: 'suicidal', seed: 1, endless: true });
    expect(e.addKill(250)).toBe(ENDLESS.pointsPerKill);
    expect(e.score).toBe(100);
    const n = startedState();
    expect(n.addKill(250)).toBe(250 * TUNING.pilot.scoreMultiplier);
  });

  it('pays 5 credits per 1000 points in endless only', () => {
    const e = new MissionState();
    const paid: number[] = [];
    e.onCredits = c => paid.push(c);
    e.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: 1, endless: true });
    for (let i = 0; i < 9; i++) e.addKill(0);
    expect(paid).toEqual([]);
    e.addKill(0); // 1000 points
    expect(paid).toEqual([5]);
    for (let i = 0; i < 20; i++) e.addKill(0); // 3000 points
    expect(paid.reduce((a, b) => a + b, 0)).toBe(15);
    expect(e.creditsEarned).toBe(15);
    const n = startedState();
    n.onCredits = c => paid.push(c);
    n.addScore(5000);
    expect(e.creditsEarned).toBe(15);
    expect(paid.reduce((a, b) => a + b, 0)).toBe(15);
  });
});
