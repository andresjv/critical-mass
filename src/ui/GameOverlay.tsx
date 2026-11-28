import { useCanvasScale } from './useCanvasScale';
import { TouchControlLabels } from './TouchControlLabels';
import { PauseOverlay } from './PauseOverlay';
import { useHudState } from './useHudState';
import { GameHud } from './GameHud';
import { DebugOverlay } from './DebugOverlay';
import { HowToPlayCard } from './HowToPlayCard';
import { MainMenu } from './MainMenu';
import { ProgressBar } from './ProgressBar';
import { StageIntroCard } from './StageIntroCard';
import { EventCallout } from './EventCallout';
import { ContextualHint } from './ContextualHint';
import { StageResultCard } from './StageResultCard';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export function GameOverlay() {
  const { scale, offsetX, offsetY } = useCanvasScale();
  const s = useHudState();

  // Pointer events must be 'auto' for any overlay that needs clicks/taps.
  const inMenu = s.screen === 'menu';
  const needsPointerEvents =
    inMenu ||
    !!s.stageIntro;

  const now = Date.now();

  return (
    // Outer div: exactly covers the letterboxed Phaser canvas.
    <div style={{
      position: 'absolute',
      left: offsetX,
      top: offsetY,
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      pointerEvents: needsPointerEvents ? 'auto' : 'none',
      overflow: 'hidden',
    }}>
      {/*
        Inner div: 1280×720 canvas-coordinate space, scaled to match the canvas.
        Fonts and positions inside here use canvas px 1:1.
        Min readable font: 28 canvas-px × (min scale 0.52) ≈ 14.6 device CSS px.
      */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
      }}>
        {/* Non-interactive HUD elements (hidden behind the title menu) */}
        <div style={{ pointerEvents: 'none', display: s.screen !== 'game' ? 'none' : undefined }}>
          <GameHud s={s} />
          <DebugOverlay s={s} />
          <HowToPlayCard stage={s.howToPlayStage} />
          <ProgressBar
            progressStep={s.progressStep}
            launchNumber={s.launchNumber}
            launchSite={s.launchSite}
            endlessStage={s.endlessStage}
          />
          <EventCallout
            callout={s.callout}
            calloutExpiry={s.calloutExpiry}
            now={now}
          />
          <ContextualHint hint={s.contextualHint} />
          <TouchControlLabels labels={s.touchLabels} />
          <PauseOverlay paused={s.paused} device={s.device} />
          <StageResultCard result={s.stageResult} />
        </div>


        <StageIntroCard intro={s.stageIntro} device={s.device} />
        <MainMenu show={inMenu} device={s.device} />
      </div>
    </div>
  );
}
