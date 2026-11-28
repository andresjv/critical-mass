import { type ProgressStep } from '../state/gameUi';

interface Props {
  progressStep: ProgressStep | null;
  launchNumber: number;
  launchSite: string;
}

type StepDef = { key: ProgressStep; label: string };

const STEPS: StepDef[] = [
  { key: 'hangar',     label: 'HANGAR' },
  { key: 'attack_run', label: 'ATTACK RUN' },
  { key: 'ground',     label: 'GROUND ASSAULT' },
];

const STEP_ORDER: ProgressStep[] = ['map', 'hangar', 'attack_run', 'silos', 'ground'];

function stepColor(key: ProgressStep, current: ProgressStep): string {
  const ci = STEP_ORDER.indexOf(current);
  const ki = STEP_ORDER.indexOf(key);
  if (ki === ci) return '#ffcc44'; // current — amber
  if (ki < ci) return '#7f95ab';   // completed — dim
  return '#4a5c70';                // future — very dim
}

export function ProgressBar({ progressStep, launchNumber, launchSite }: Props) {
  if (!progressStep) return null;
  const SANS = "'Space Grotesk', sans-serif";

  return (
    <div style={{
      position: 'absolute', top: 80, left: 0, right: 0, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      {/* Breadcrumb pill: stage dots with the current stage lit */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px', borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(14,22,34,0.78), rgba(8,13,20,0.66))',
        border: '1px solid rgba(140,180,220,0.16)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {STEPS.map((step, i) => {
          const c = stepColor(step.key, progressStep);
          const cur = step.key === progressStep;
          return (
            <span key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && <span style={{ width: 18, height: 1, background: 'rgba(140,170,200,0.3)' }} />}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: c,
                  boxShadow: cur ? `0 0 8px ${c}` : 'none',
                }} />
                <span style={{ fontFamily: SANS, fontSize: 12, letterSpacing: 1.5, color: c, fontWeight: cur ? 700 : 500 }}>
                  {step.label}
                </span>
              </span>
            </span>
          );
        })}
      </div>

      {/* Sub-line: launch N of 4 — site name */}
      {launchSite && (
        <span style={{
          fontFamily: SANS, fontSize: 12, color: 'rgba(200,215,230,0.7)', letterSpacing: 1,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          Launch {launchNumber} of 4  ·  {launchSite}
        </span>
      )}
    </div>
  );
}
