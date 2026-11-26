import { type ProgressStep } from '../state/gameUi';

interface Props {
  progressStep: ProgressStep | null;
  launchNumber: number;
  launchSite: string;
}

type StepDef = { key: ProgressStep; label: string };

const STEPS: StepDef[] = [
  { key: 'map',        label: 'MAP' },
  { key: 'hangar',     label: 'HANGAR' },
  { key: 'attack_run', label: 'ATTACK RUN' },
  { key: 'silos',      label: 'SILOS' },
];

const STEP_ORDER: ProgressStep[] = ['map', 'hangar', 'attack_run', 'silos'];

function stepColor(key: ProgressStep, current: ProgressStep): string {
  const ci = STEP_ORDER.indexOf(current);
  const ki = STEP_ORDER.indexOf(key);
  if (ki === ci) return '#ffcc44'; // current — amber
  if (ki < ci) return '#556677';   // completed — dim
  return '#334455';                // future — very dim
}

export function ProgressBar({ progressStep, launchNumber, launchSite }: Props) {
  if (!progressStep) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 64,
      left: 0,
      right: 0,
      pointerEvents: 'none',
    }}>
      {/* Breadcrumb row */}
      <div style={{
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '6px 24px',
        borderBottom: '1px solid rgba(80,160,255,0.15)',
      }}>
        {STEPS.map((step, i) => (
          <span key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                color: '#334455',
                margin: '0 8px',
              }}>›</span>
            )}
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              letterSpacing: 1.5,
              color: stepColor(step.key, progressStep),
              fontWeight: step.key === progressStep ? 700 : 400,
            }}>
              {step.label}
            </span>
          </span>
        ))}
      </div>

      {/* Sub-line: launch N of 4 — site name */}
      {launchSite && (
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          textAlign: 'center',
          padding: '3px 24px',
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12,
            color: '#556677',
            letterSpacing: 1,
          }}>
            Launch {launchNumber} of 4  —  {launchSite}
          </span>
        </div>
      )}
    </div>
  );
}
