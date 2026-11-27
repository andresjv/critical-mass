import { useCanvasScale } from './useCanvasScale';
import { TouchControlLabels } from './TouchControlLabels';
import { PauseOverlay } from './PauseOverlay';
import { useHudState } from './useHudState';
import { GameHud } from './GameHud';
import { DebugOverlay } from './DebugOverlay';
import { HowToPlayCard } from './HowToPlayCard';
import { ResultsScreen } from './ResultsScreen';
import { MissionBriefing } from './MissionBriefing';
import { ProgressBar } from './ProgressBar';
import { StageIntroCard } from './StageIntroCard';
import { EventCallout } from './EventCallout';
import { ContextualHint } from './ContextualHint';
import { StageResultCard } from './StageResultCard';
import { gameUi } from '../state/gameUi';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export function GameOverlay() {
  const { scale, offsetX, offsetY } = useCanvasScale();
  const s = useHudState();

  // Pointer events must be 'auto' for any overlay that needs clicks/taps.
  const needsPointerEvents =
    s.showResults ||
    s.showBriefing ||
    !!s.stageIntro ||
    s.showComingSoon;

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
        {/* Non-interactive HUD elements */}
        <div style={{ pointerEvents: 'none' }}>
          <GameHud s={s} />
          <DebugOverlay s={s} />
          <HowToPlayCard stage={s.howToPlayStage} />
          <ProgressBar
            progressStep={s.progressStep}
            launchNumber={s.launchNumber}
            launchSite={s.launchSite}
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

        {/* Interactive overlays — order matters: later = higher z-index */}
        <ResultsScreen s={s} />

        {/* Coming soon (shown after results disappear) */}
        {s.showComingSoon && !s.showResults && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            pointerEvents: 'auto',
            zIndex: 80,
          }}
            onClick={() => { gameUi.showComingSoon = false; }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(80,160,255,0.35)',
              borderRadius: 6,
              padding: '48px 64px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 36,
                fontWeight: 700,
                color: '#88ccff',
                letterSpacing: 3,
                marginBottom: 12,
              }}>
                VOSTGRAD ASSAULT
              </div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 24,
                color: '#aaaaaa',
                marginBottom: 32,
              }}>
                Coming soon
              </div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15,
                color: '#556677',
                letterSpacing: 2,
              }}>
                SPACE OR FIRE TO SKIP
              </div>
            </div>
          </div>
        )}

        <StageIntroCard intro={s.stageIntro} device={s.device} />
        <MissionBriefing show={s.showBriefing} />
      </div>
    </div>
  );
}
