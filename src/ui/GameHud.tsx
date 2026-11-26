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

/** Format seconds as m:ss when >= 60, otherwise Ns. */
function formatClock(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}s`;
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 11,
  letterSpacing: 2,
  color: '#556677',
  textTransform: 'uppercase' as const,
  display: 'block',
  marginBottom: 2,
};

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
        height: 64,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 0,
      }}>
        {/* Score */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={LABEL_STYLE}>SCORE</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28,
            color: '#ffffff',
            letterSpacing: 2,
          }}>
            {score}
          </span>
        </div>

        {/* Impact clock */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {s.clock > 0 ? (
            <>
              <span style={{ ...LABEL_STYLE, textAlign: 'center' }}>MISSILE IMPACT</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 32,
                color: clockColor,
                letterSpacing: 1,
              }}>
                {formatClock(clockSecs)}
              </span>
            </>
          ) : (
            <span style={{ flex: 1 }} />
          )}
        </div>

        {/* Planes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
          <span style={{ ...LABEL_STYLE, textAlign: 'right' }}>PLANES</span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24,
            color: '#88ccff',
            letterSpacing: 4,
          }}>
            {'▶'.repeat(Math.max(0, s.planes))}
          </span>
        </div>
      </div>

      {/* ── Objective line ───────────────────────────────────────────────── */}
      {s.objective && s.progressStep && (
        <div style={{
          position: 'absolute',
          top: s.launchSite ? 103 : 85,
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            color: '#556677',
            letterSpacing: 1,
          }}>
            {s.objective}
          </span>
        </div>
      )}

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

      {/* ── Attack run timer ────────────────────────────────────────────── */}
      {s.attackRunSecsLeft > 0 && (
        <div style={{
          position: 'absolute',
          top: 72,
          right: 24,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 26,
          color: '#aaaaaa',
        }}>
          {Math.ceil(s.attackRunSecsLeft)}s
        </div>
      )}

      {/* ── Silo status ──────────────────────────────────────────────────── */}
      {s.silosDestroyed > 0 && (
        <div style={{
          position: 'absolute',
          top: 72,
          right: 24,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22,
          color: '#88ff88',
        }}>
          {'◆'.repeat(s.silosDestroyed)}
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
