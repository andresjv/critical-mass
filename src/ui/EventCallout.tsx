interface Props {
  callout: string | null;
  calloutExpiry: number;
  now: number;
}

export function EventCallout({ callout, calloutExpiry, now }: Props) {
  if (!callout) return null;
  if (calloutExpiry > 0 && now > calloutExpiry) return null;

  // Determine colour by content
  const isWarning = callout.startsWith('CITY LOST') || callout.startsWith('LAUNCH SUCCEEDED');
  const isNeutral = callout.startsWith('+');
  const color = isWarning ? '#ff6644' : isNeutral ? '#22ff88' : '#88ccff';

  return (
    <div style={{
      position: 'absolute',
      top: '40%',
      left: 0,
      right: 0,
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 60,
    }}>
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 48,
        fontWeight: 700,
        color,
        letterSpacing: 3,
        textShadow: `0 0 24px ${color}88`,
      }}>
        {callout}
      </span>
    </div>
  );
}
