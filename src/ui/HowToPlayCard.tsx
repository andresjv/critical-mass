import { useEffect, useState } from 'react';
import { HOW_TO_PLAY, type HowToPlayStage } from '../state/howToPlay';
import { gameUi } from '../state/gameUi';

interface Props {
  stage: HowToPlayStage | null;
}

const AUTO_DISMISS_MS = 5500;

export function HowToPlayCard({ stage }: Props) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!stage) return;
    setOpacity(1);

    // Start fade-out 1 s before dismiss.
    const fadeId = setTimeout(() => setOpacity(0), AUTO_DISMISS_MS - 1000);
    const clearId = setTimeout(() => { gameUi.howToPlayStage = null; }, AUTO_DISMISS_MS);

    return () => { clearTimeout(fadeId); clearTimeout(clearId); };
  }, [stage]);

  if (!stage) return null;

  const info = HOW_TO_PLAY[stage];

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -60%)',
      background: 'rgba(0,0,0,0.85)',
      border: '1px solid rgba(80,160,255,0.4)',
      borderRadius: 6,
      padding: '32px 48px',
      minWidth: 420,
      textAlign: 'center',
      opacity,
      transition: 'opacity 0.9s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 36,
        color: '#88ccff',
        letterSpacing: 3,
        marginBottom: 24,
      }}>
        {info.title}
      </div>
      {info.lines.map((line, i) => (
        <div key={i} style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 24,
          color: '#ccddee',
          marginBottom: 10,
          whiteSpace: 'pre',
        }}>
          {line}
        </div>
      ))}
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 20,
        color: '#445566',
        marginTop: 20,
      }}>
        Auto-closing…
      </div>
    </div>
  );
}
