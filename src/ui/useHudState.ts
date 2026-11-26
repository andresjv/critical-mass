import { useState, useEffect } from 'react';
import { missionState } from '../state/MissionState';
import { debugInfo } from '../state/debugInfo';
import { gameUi } from '../state/gameUi';

export interface HudState {
  score: number;
  clock: number;
  planes: number;
  hudCue: string;
  fps: number;
  speed: number;
  angle: number;
  doorState: string;
  doorTimer: number;
  debugVisible: boolean;
  device: 'keyboard' | 'touch' | 'gamepad';
  // Map overlay
  mapActive: boolean;
  launchSite: string;
  targetCity: string;
  timeToImpactSecs: number;
  autoScrambleRemaining: number;
}

function snapshot(): HudState {
  return {
    score:        missionState.score,
    clock:        missionState.impactClock,
    planes:       missionState.planes,
    hudCue:       missionState.hudCue,
    fps:          debugInfo.fps,
    speed:        debugInfo.speed,
    angle:        debugInfo.angle,
    doorState:    debugInfo.doorState,
    doorTimer:    debugInfo.doorTimer,
    debugVisible: gameUi.debugVisible,
    device:       gameUi.device,
    mapActive:    gameUi.mapActive,
    launchSite:   gameUi.launchSite,
    targetCity:   gameUi.targetCity,
    timeToImpactSecs:        gameUi.timeToImpactSecs,
    autoScrambleRemaining:   gameUi.autoScrambleRemaining,
  };
}

export function useHudState(): HudState {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      setState(snapshot());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return state;
}
