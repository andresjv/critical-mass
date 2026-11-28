// Shared building blocks for the menu pages (buttons, panels, colours).
import type { CSSProperties, ReactNode } from 'react';

export const ACCENT = '#88ccff';
export const FONT = "'Space Grotesk', sans-serif";
export const MONO = "'JetBrains Mono', monospace";

export const resetBtn: CSSProperties = {
  font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, margin: 0, outlineOffset: 3,
};

export function MenuButton({ children, onClick, primary, autoFocus, style }: {
  children: ReactNode; onClick: () => void; primary?: boolean; autoFocus?: boolean; style?: CSSProperties;
}) {
  return (
    <button data-nav data-autofocus={autoFocus ? '' : undefined} onClick={onClick} style={{
      ...resetBtn, fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
      padding: '13px 24px', borderRadius: 6,
      color: primary ? '#06121e' : '#dde8f2',
      background: primary ? ACCENT : 'rgba(8,14,22,0.85)',
      border: `2px solid ${primary ? ACCENT : 'rgba(136,204,255,0.35)'}`,
      ...style,
    }}>
      {children}
    </button>
  );
}

export function Panel({ title, children, onBack, narrow }: { title: string; children: ReactNode; onBack: () => void; narrow?: boolean }) {
  return (
    <div style={{
      width: narrow ? 760 : 1200, maxHeight: 680, padding: '30px 36px', borderRadius: 10,
      background: 'rgba(4,8,14,0.82)', border: '1px solid rgba(136,204,255,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>{title}</div>
        <button onClick={onBack} style={{ ...resetBtn, background: 'none', border: 'none', fontSize: 22, color: '#7f97ad', letterSpacing: 2 }}>
          ESC · BACK
        </button>
      </div>
      {children}
    </div>
  );
}

