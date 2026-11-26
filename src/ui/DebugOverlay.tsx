import { HudState } from './useHudState';

interface Props {
  s: HudState;
}

export function DebugOverlay({ s }: Props) {
  if (!s.debugVisible) return null;

  const rows: [string, string][] = [
    ['FPS',   String(s.fps)],
    ['SPEED', `${s.speed} px/s`],
    ['ANGLE', `${s.angle}°`],
    ['DOOR',  `${s.doorState}${s.doorTimer > 0 ? ' ' + s.doorTimer.toFixed(1) + 's' : ''}`],
    ['CLOCK', `${s.clock.toFixed(1)}s`],
    ['INPUT', s.device.toUpperCase()],
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 56,
      left: 8,
      background: 'rgba(0,0,0,0.78)',
      border: '1px solid rgba(0,255,136,0.3)',
      borderRadius: 4,
      padding: '10px 16px',
      minWidth: 200,
    }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{
          display: 'flex',
          gap: 12,
          marginBottom: 4,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            color: '#448866',
            minWidth: 60,
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            color: '#00ff88',
          }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
