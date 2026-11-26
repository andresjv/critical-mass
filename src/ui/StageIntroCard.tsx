import { useEffect, useRef } from 'react';
import { gameUi, type StageIntroData } from '../state/gameUi';

interface Props {
  intro: StageIntroData | null;
  device: 'keyboard' | 'touch' | 'gamepad';
}

const AUTO_DISMISS_MS = 6000;

export function StageIntroCard({ intro, device }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismiss() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    gameUi.stageIntro = null;
  }

  useEffect(() => {
    if (!intro) return;

    // Auto-dismiss after 6s
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    // Dismiss on Space keydown
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('keydown', onKey);
    };
  }, [intro]);

  if (!intro) return null;

  const controls = device === 'touch' ? intro.touch : intro.keyboard;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        pointerEvents: 'auto',
        zIndex: 90,
      }}
      onClick={dismiss}
    >
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(80,160,255,0.35)',
        borderRadius: 6,
        padding: '36px 48px',
        maxWidth: 580,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11,
          letterSpacing: 4,
          color: '#556677',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          STAGE
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 30,
          fontWeight: 700,
          color: '#88ccff',
          letterSpacing: 3,
          marginBottom: 16,
        }}>
          {intro.stageName}
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          color: '#ffffff',
          marginBottom: 24,
        }}>
          {intro.goal}
        </div>

        <div style={{
          borderTop: '1px solid rgba(80,160,255,0.2)',
          paddingTop: 20,
          marginBottom: 20,
        }}>
          {controls.map((line, i) => (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15,
              color: '#aaaaaa',
              marginBottom: 6,
            }}>
              {line}
            </div>
          ))}
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
          color: '#334455',
          letterSpacing: 1,
        }}>
          TAP / SPACE / FIRE TO DISMISS
        </div>
      </div>
    </div>
  );
}
