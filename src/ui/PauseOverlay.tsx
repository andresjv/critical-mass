import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export function PauseOverlay({ paused, device }: { paused: boolean; device: string }) {
  if (!paused) return null;
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      fontFamily: "'Space Grotesk', system-ui, sans-serif", color: '#fff',
    }}>
      <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: '0.12em' }}>PAUSED</div>
      <div style={{ fontSize: 28, letterSpacing: '0.08em', opacity: 0.75 }}>
        {device === 'gamepad' ? 'PRESS START TO RESUME' : 'PRESS ESC OR P TO RESUME'}
      </div>
    </div>
  );
}
