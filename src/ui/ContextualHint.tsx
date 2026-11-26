interface Props {
  hint: string | null;
}

export function ContextualHint({ hint }: Props) {
  if (!hint) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '55%',
      left: 0,
      right: 0,
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 50,
    }}>
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 22,
        color: '#aaaaaa',
        letterSpacing: 1,
        background: 'rgba(0,0,0,0.5)',
        padding: '6px 20px',
        borderRadius: 4,
      }}>
        {hint}
      </span>
    </div>
  );
}
