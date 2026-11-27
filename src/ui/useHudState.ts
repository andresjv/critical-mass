import { useState, useEffect } from 'react';
import { missionState } from '../state/MissionState';
import { debugInfo } from '../state/debugInfo';
import {
  gameUi,
  type ChallengerData,
  type HowToPlayStage,
  type ProgressStep,
  type StageIntroData,
  type StageResultData,
  type TouchLabels,
  type UiScreen,
} from '../state/gameUi';

export interface HudState {
  screen: UiScreen;
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
  touchLabels: TouchLabels | null;
  paused: boolean;
  // Map overlay
  mapActive: boolean;
  launchSite: string;
  targetCity: string;
  timeToImpactSecs: number;
  autoScrambleRemaining: number;
  // How-to-play
  howToPlayStage: HowToPlayStage | null;
  // Results
  showResults: boolean;
  finalScore: number;
  challengerData: ChallengerData | null;
  playerName: string;
  // Attack run
  attackRunSecsLeft: number;
  // Silo
  silosDestroyed: number;
  centralSiloDown: boolean;
  // Player guidance
  showBriefing: boolean;
  progressStep: ProgressStep | null;
  launchNumber: number;
  stageIntro: StageIntroData | null;
  objective: string;
  contextualHint: string | null;
  callout: string | null;
  calloutExpiry: number;
  stageResult: StageResultData | null;
  showComingSoon: boolean;
}

function snapshot(): HudState {
  return {
    screen:       gameUi.screen,
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
    touchLabels:  gameUi.touchLabels,
    paused:       gameUi.paused,
    mapActive:    gameUi.mapActive,
    launchSite:   gameUi.launchSite,
    targetCity:   gameUi.targetCity,
    timeToImpactSecs:        gameUi.timeToImpactSecs,
    autoScrambleRemaining:   gameUi.autoScrambleRemaining,
    howToPlayStage: gameUi.howToPlayStage,
    showResults:  gameUi.showResults,
    finalScore:   gameUi.finalScore,
    challengerData: gameUi.challengerData,
    playerName:   gameUi.playerName,
    attackRunSecsLeft: gameUi.attackRunSecsLeft,
    silosDestroyed: gameUi.silosDestroyed,
    centralSiloDown: gameUi.centralSiloDown,
    // Player guidance
    showBriefing:    gameUi.showBriefing,
    progressStep:    gameUi.progressStep,
    launchNumber:    gameUi.launchNumber,
    stageIntro:      gameUi.stageIntro,
    objective:       gameUi.objective,
    contextualHint:  gameUi.contextualHint,
    callout:         gameUi.callout,
    calloutExpiry:   gameUi.calloutExpiry,
    stageResult:     gameUi.stageResult,
    showComingSoon:  gameUi.showComingSoon,
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
