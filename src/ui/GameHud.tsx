import { HudState } from './useHudState';

interface Props {
  s: HudState;
}

// Key hint label per active device.
function actionLabel(device: HudState['device']): string {
  if (device === 'touch') return '◉';
  if (device === 'gamepad') return 'B';
  return 'X';
}

export function GameHud({ s }: Props) {
  const score = String(s.score).padStart(7, '0');
  const clockSecs = Math.ceil(s.clock);
  const clockColor = s.clock > 0 && clockSecs <= 20 ? '#ff4444' : '#22ff88';

  return (
    <>
      {/* ── Top HUD bar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 0,
      }}>
        {/* Score */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28,
          color: '#ffffff',
          letterSpacing: 2,
          flex: 1,
        }}>
          {score}
        </span>

        {/* Impact clock */}
        {s.clock > 0 && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 32,
            color: clockColor,
            letterSpacing: 1,
            flex: 1,
            textAlign: 'center',
          }}>
            {clockSecs}s
          </span>
        )}
        {s.clock <= 0 && <span style={{ flex: 1 }} />}

        {/* Planes */}
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 24,
          color: '#88ccff',
          flex: 1,
          textAlign: 'right',
          letterSpacing: 4,
        }}>
          {'▶'.repeat(Math.max(0, s.planes))}
        </span>
      </div>

      {/* ── Stage cue at bottom-centre ──────────────────────────────────── */}
      {s.hudCue && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            color: '#ffee66',
            textShadow: '0 0 12px rgba(255,220,80,0.6)',
          }}>
            {s.hudCue.replace('[ACTION]', `[${actionLabel(s.device)}]`)}
          </span>
        </div>
      )}

      {/* ── Map info panel ──────────────────────────────────────────────── */}
      {s.mapActive && s.launchSite && (
        <div style={{
          position: 'absolute',
          bottom: 68,
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 24px',
            borderRadius: 4,
          }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 24,
              color: '#ff8844',
              marginBottom: 4,
            }}>
              LAUNCH DETECTED
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              color: '#ffcc44',
            }}>
              {s.launchSite} → {s.targetCity}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20,
              color: '#aaaaaa',
              marginTop: 4,
            }}>
              TIME TO IMPACT: {s.timeToImpactSecs}s
            </div>
          </div>
        </div>
      )}
    </>
  );
}
