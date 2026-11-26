import { type StageResultData } from '../state/gameUi';

interface Props {
  result: StageResultData | null;
}

export function StageResultCard({ result }: Props) {
  if (!result) return null;

  const isSuccess = !result.headline.includes('FAILED') && !result.headline.includes('SUCCEEDED');

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 70,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(80,160,255,0.35)',
        borderRadius: 6,
        padding: '32px 48px',
        minWidth: 400,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 32,
          fontWeight: 700,
          color: isSuccess ? '#22ff88' : '#ff6644',
          letterSpacing: 3,
          marginBottom: result.details.length > 0 ? 16 : 20,
        }}>
          {result.headline}
        </div>

        {result.details.map((line, i) => (
          <div key={i} style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            color: '#aaaaaa',
            marginBottom: 8,
          }}>
            {line}
          </div>
        ))}

        {result.next && (
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16,
            color: '#556677',
            marginTop: 16,
            borderTop: '1px solid rgba(80,160,255,0.15)',
            paddingTop: 12,
            letterSpacing: 1,
          }}>
            NEXT: {result.next}
          </div>
        )}
      </div>
    </div>
  );
}
