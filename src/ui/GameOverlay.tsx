import { useCanvasScale } from './useCanvasScale';
import { useHudState } from './useHudState';
import { GameHud } from './GameHud';
import { DebugOverlay } from './DebugOverlay';
import { HowToPlayCard } from './HowToPlayCard';
import { ResultsScreen } from './ResultsScreen';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export function GameOverlay() {
  const { scale, offsetX, offsetY } = useCanvasScale();
  const s = useHudState();

  return (
    // Outer div: exactly covers the letterboxed Phaser canvas.
    <div style={{
      position: 'absolute',
      left: offsetX,
      top: offsetY,
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      // ResultsScreen needs pointer-events, so we can't disable globally here.
      // Individual non-interactive children set pointerEvents:'none'.
      pointerEvents: s.showResults ? 'auto' : 'none',
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
        <div style={{ pointerEvents: 'none' }}>
          <GameHud s={s} />
          <DebugOverlay s={s} />
          <HowToPlayCard stage={s.howToPlayStage} />
        </div>
        <ResultsScreen s={s} />
      </div>
    </div>
  );
}
