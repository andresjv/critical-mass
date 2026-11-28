import { HudState } from './useHudState';
import { InteractPrompt, ItemHud, WeaponHud } from './WeaponHud';

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
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', sans-serif";

const LABEL: React.CSSProperties = {
  fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: 2.5,
  color: 'rgba(190,210,230,0.7)', textTransform: 'uppercase', display: 'block', lineHeight: 1,
};

/** Rounded translucent panel used by every HUD readout. */
const PANEL: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(14,22,34,0.82), rgba(8,13,20,0.72))',
  border: '1px solid rgba(140,180,220,0.18)',
  borderRadius: 12,
  boxShadow: '0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
  backdropFilter: 'blur(4px)',
};

/** Small side-view jet icon for the spare-planes readout. */
function JetIcon({ dim }: { dim?: boolean }) {
  return (
    <svg width="30" height="16" viewBox="0 0 30 16" aria-hidden="true" style={{ opacity: dim ? 0.25 : 1 }}>
      <path d="M29 8 L22 6 L15 4.6 L3 4.6 L1 1 L-1 1 L1 6 L1 10 L10 11 L22 10 Z" fill="#7cc4ff" />
      <path d="M17 4.8 L13 1.6 L9 1.4 L11 4.8 Z" fill="#cfeaff" />
      <path d="M14 9 L6 9 L2 14.5 L6 14.5 Z" fill="#3f86c8" />
    </svg>
  );
}

/** Segmented hull gauge: green → amber → red as hits land. */
function HullGauge({ hull, max, label }: { hull: number; max: number; label: string }) {
  const color = hull >= max ? '#4ee08a' : hull > 1 ? '#ffc23d' : '#ff4b3e';
  const critical = hull <= 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LABEL}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: max }, (_, i) => (
          <div key={i} style={{
            width: max > 3 ? 18 : 26, height: 12, borderRadius: 3,
            background: i < hull ? color : 'rgba(255,255,255,0.08)',
            border: `1px solid ${i < hull ? color : 'rgba(255,255,255,0.15)'}`,
            boxShadow: i < hull ? `0 0 8px ${color}88` : 'none',
            animation: critical && i < hull ? 'cm-hud-pulse 0.7s ease-in-out infinite' : undefined,
          }} />
        ))}
      </div>
    </div>
  );
}

const HUD_CSS = `
@keyframes cm-hud-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
@keyframes cm-cue-in { from { opacity: 0; transform: translate(-50%, 8px) } to { opacity: 1; transform: translate(-50%, 0) } }
`;

export function GameHud({ s }: Props) {
  const score = String(s.score).padStart(7, '0');
  const clockSecs = Math.ceil(s.clock);
  const urgent = s.clock > 0 && clockSecs <= 20;
  const clockColor = urgent ? '#ff5a4a' : '#5cf0a0';
  const showHull = s.hullMax > 0;

  return (
    <>
      <style>{HUD_CSS}</style>

      {/* ── Top HUD: score · impact clock · planes + hull ───────────────── */}
      <div style={{
        position: 'absolute', top: 10, left: 16, right: 16, height: 62,
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 12,
        pointerEvents: 'none',
      }}>
        {/* Score */}
        <div style={{ ...PANEL, justifySelf: 'start', padding: '9px 16px 8px', minWidth: 170 }}>
          <span style={LABEL}>Score</span>
          <span style={{
            fontFamily: MONO, fontSize: 28, fontWeight: 700, color: '#ffffff',
            letterSpacing: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15,
          }}>
            {score}
          </span>
        </div>

        {/* Impact clock */}
        {s.clock > 0 ? (
          <div style={{
            ...PANEL, padding: '9px 22px 8px', textAlign: 'center',
            borderColor: urgent ? 'rgba(255,90,74,0.6)' : PANEL.border as string,
            animation: urgent ? 'cm-hud-pulse 1s ease-in-out infinite' : undefined,
          }}>
            <span style={{ ...LABEL, textAlign: 'center' }}>Missile impact</span>
            <span style={{
              fontFamily: MONO, fontSize: 30, fontWeight: 700, color: clockColor,
              letterSpacing: 1, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
              textShadow: `0 0 12px ${clockColor}66`,
            }}>
              {formatClock(clockSecs)}
            </span>
          </div>
        ) : <span />}

        {/* Planes + hull */}
        <div style={{ ...PANEL, justifySelf: 'end', padding: '9px 16px 8px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          {showHull && <HullGauge hull={s.hull} max={s.hullMax} label={s.hullLabel} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
            <span style={{ ...LABEL, textAlign: 'right' }}>Planes</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: Math.max(0, s.planes) }, (_, i) => <JetIcon key={i} />)}
              {s.planes <= 0 && <JetIcon dim />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Objective line ───────────────────────────────────────────────── */}
      {s.objective && s.progressStep && (
        <div style={{
          position: 'absolute', top: s.launchSite || s.endlessStage ? 132 : 114, left: 0, right: 0,
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: SANS, fontSize: 13, color: 'rgba(200,215,230,0.75)', letterSpacing: 1,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}>
            {s.objective}
          </span>
        </div>
      )}

      {/* ── Stage cue at bottom-centre ──────────────────────────────────── */}
      {s.hudCue && (
        <div key={s.hudCue} style={{
          position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          ...PANEL, borderRadius: 999, padding: '8px 26px', whiteSpace: 'nowrap',
          borderColor: 'rgba(255,220,90,0.35)', animation: 'cm-cue-in 180ms ease-out',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: SANS, fontSize: 24, fontWeight: 700, letterSpacing: 1.5, color: '#ffe16a',
            textShadow: '0 0 12px rgba(255,220,80,0.5)',
          }}>
            {s.hudCue.replace('[ACTION]', `[${actionLabel(s.device)}]`)}
          </span>
        </div>
      )}

      {/* ── Attack run timer ────────────────────────────────────────────── */}
      {s.attackRunSecsLeft > 0 && (
        <div style={{
          position: 'absolute', top: 82, right: 16, ...PANEL, borderRadius: 999,
          padding: '4px 14px', display: 'flex', alignItems: 'baseline', gap: 8, pointerEvents: 'none',
        }}>
          <span style={{ ...LABEL, fontSize: 10 }}>Run</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: '#d8e2ec', fontVariantNumeric: 'tabular-nums' }}>
            {Math.ceil(s.attackRunSecsLeft)}s
          </span>
        </div>
      )}

      <WeaponHud s={s} />
      <ItemHud s={s} />
      <InteractPrompt s={s} />

      {/* ── Map info panel ──────────────────────────────────────────────── */}
      {s.mapActive && s.launchSite && (
        <div style={{
          position: 'absolute', bottom: 68, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ ...PANEL, display: 'inline-block', padding: '12px 28px', borderColor: 'rgba(255,136,68,0.4)' }}>
            <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: '#ff8844', marginBottom: 4 }}>
              LAUNCH DETECTED
            </div>
            <div style={{ fontFamily: MONO, fontSize: 21, color: '#ffcc44' }}>
              {s.launchSite} → {s.targetCity}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 18, color: 'rgba(210,220,230,0.8)', marginTop: 4 }}>
              TIME TO IMPACT: {s.timeToImpactSecs}s
            </div>
          </div>
        </div>
      )}
    </>
  );
}
