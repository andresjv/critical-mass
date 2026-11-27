// MainMenu — title screen, level select and settings (PRD F-01, F-23, T-01).
// React only writes plain-TS state (gameUi.menuRequest / menuPreview, settings);
// MenuScene picks the request up and starts the mission.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { gameUi } from '../state/gameUi';
import { LEVELS, levelInfo, type LevelId } from '../state/levels';
import { settings, updateSettings, type Settings } from '../state/settings';
import type { Difficulty } from '../state/tuning';

type Page = 'title' | 'levels' | 'settings';

const ACCENT = '#88ccff';
const FONT = "'Space Grotesk', sans-serif";
const MONO = "'JetBrains Mono', monospace";

const DIFFICULTIES: { id: Difficulty; label: string; note: string }[] = [
  { id: 'cadet',    label: 'Cadet',    note: 'More planes, slower enemies' },
  { id: 'pilot',    label: 'Pilot',    note: 'The intended challenge' },
  { id: 'suicidal', label: 'Suicidal', note: 'Fewer planes, aggressive fire' },
];

export function MainMenu({ show, device }: { show: boolean; device: 'keyboard' | 'touch' | 'gamepad' }) {
  const [page, setPage]   = useState<Page>('title');
  const [level, setLevel] = useState<LevelId>(settings.lastLevel);
  const [diff, setDiff]   = useState<Difficulty>(settings.lastDifficulty);
  const [prefs, setPrefs] = useState<Settings>({ ...settings });
  const rootRef = useRef<HTMLDivElement>(null);

  // Scenery behind the menu follows the highlighted level.
  useEffect(() => { gameUi.menuPreview = level; }, [level]);

  // Back to the title page whenever the menu reappears (e.g. after game over).
  useEffect(() => { if (show) setPage('title'); }, [show]);

  // Focus the first item on each page so keyboard players can start right away.
  useEffect(() => {
    if (!show) return;
    const first = rootRef.current?.querySelector<HTMLElement>('[data-nav][data-autofocus]')
      ?? rootRef.current?.querySelector<HTMLElement>('[data-nav]');
    first?.focus();
  }, [page, show]);

  // Arrow keys move focus, Enter/Space press, Escape goes back. Phaser captures arrows
  // and Space, so the menu handles them itself instead of relying on browser defaults.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-nav]') ?? []);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        const active = items[i];
        // Sliders use left/right for their value.
        if (active?.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          const input = active as HTMLInputElement;
          const step = e.key === 'ArrowRight' ? 0.1 : -0.1;
          input.value = String(Math.min(1, Math.max(0, Number(input.value) + step)));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
        items[(i + (fwd ? 1 : -1) + items.length) % items.length].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (i >= 0 && items[i].tagName === 'BUTTON') { e.preventDefault(); items[i].click(); }
      } else if (e.key === 'Escape' && page !== 'title') {
        e.preventDefault(); setPage('title');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, page]);

  if (!show) return null;

  const setPref = (patch: Partial<Settings>) => {
    updateSettings(patch);
    setPrefs({ ...settings });
  };
  const play = () => { gameUi.menuRequest = { level, difficulty: diff }; };

  return (
    <div ref={rootRef} style={{
      position: 'absolute', inset: 0, zIndex: 120, pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, color: '#dde8f2',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
    }}>
      {page === 'title' && (
        <>
          <div style={{ fontSize: 22, letterSpacing: 8, color: '#7f97ad', marginBottom: 10 }}>
            FOUR LAUNCHES · ONE PILOT
          </div>
          <div style={{
            fontSize: 112, fontWeight: 700, letterSpacing: 10, color: '#ffffff', lineHeight: 1,
            textShadow: `0 0 40px ${ACCENT}66`, marginBottom: 14,
          }}>
            CRITICAL MASS
          </div>
          <div style={{ fontSize: 26, color: '#a9bccd', marginBottom: 44 }}>
            {levelInfo(level).name} · {DIFFICULTIES.find(d => d.id === diff)?.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 420 }}>
            <MenuButton primary autoFocus onClick={play}>Play</MenuButton>
            <MenuButton onClick={() => setPage('levels')}>Select level</MenuButton>
            <MenuButton onClick={() => setPage('settings')}>Settings</MenuButton>
          </div>
        </>
      )}

      {page === 'levels' && (
        <Panel title="Select level" onBack={() => setPage('title')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
            {LEVELS.map((l, i) => {
              const selected = l.id === level;
              return (
                <button
                  key={l.id}
                  data-nav
                  data-autofocus={selected ? '' : undefined}
                  onClick={() => setLevel(l.id)}
                  onFocus={() => setLevel(l.id)}
                  style={{
                    ...resetBtn, textAlign: 'left', borderRadius: 8, overflow: 'hidden',
                    border: `2px solid ${selected ? ACCENT : 'rgba(255,255,255,0.12)'}`,
                    background: 'rgba(8,14,22,0.9)',
                    boxShadow: selected ? `0 0 24px ${ACCENT}55` : 'none',
                    transform: selected ? 'translateY(-4px)' : 'none',
                    transition: 'transform 120ms, box-shadow 120ms, border-color 120ms',
                  }}
                >
                  <div style={{ height: 96, background: `linear-gradient(180deg, ${l.preview[0]} 0%, ${l.preview[0]} 55%, ${l.preview[1]} 55%, ${l.preview[1]} 100%)` }} />
                  <div style={{ padding: '12px 14px 16px' }}>
                    <div style={{ fontFamily: MONO, fontSize: 20, color: '#6f879c', marginBottom: 2 }}>LEVEL {i + 1}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{l.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 24, color: '#b9cad8', minHeight: 34, marginBottom: 18 }}>{levelInfo(level).premise}</div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: '#7f97ad', marginBottom: 10 }}>DIFFICULTY</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            {DIFFICULTIES.map(d => (
              <button key={d.id} data-nav onClick={() => setDiff(d.id)} style={{
                ...resetBtn, flex: 1, padding: '10px 16px', borderRadius: 6, textAlign: 'left',
                border: `2px solid ${d.id === diff ? ACCENT : 'rgba(255,255,255,0.12)'}`,
                background: d.id === diff ? 'rgba(136,204,255,0.12)' : 'rgba(8,14,22,0.9)',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{d.label}</div>
                <div style={{ fontSize: 20, color: '#9fb2c3' }}>{d.note}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
            <MenuButton onClick={() => setPage('title')} style={{ width: 200 }}>Back</MenuButton>
            <MenuButton primary onClick={play} style={{ width: 340 }}>Play</MenuButton>
          </div>
        </Panel>
      )}

      {page === 'settings' && (
        <Panel title="Settings" onBack={() => setPage('title')} narrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 32 }}>
            <Slider label="Music volume" value={prefs.musicVolume} onChange={v => setPref({ musicVolume: v })} autoFocus />
            <Slider label="Sound effects volume" value={prefs.sfxVolume} onChange={v => setPref({ sfxVolume: v })} />
            <Toggle label="Vibration" note="Buzz on crashes and big blasts (phones only)"
              value={prefs.haptics} onChange={v => setPref({ haptics: v })} />
            <Toggle label="Reduced flashing" note="No white explosion flashes or screen shake"
              value={prefs.reducedFlashing} onChange={v => setPref({ reducedFlashing: v })} />
          </div>
          <MenuButton onClick={() => setPage('title')}>Done</MenuButton>
        </Panel>
      )}

      {page === 'title' && device !== 'touch' && (
        <div style={{ position: 'absolute', bottom: 22, fontSize: 20, color: '#6f879c', letterSpacing: 2 }}>
          ARROWS / TAB TO MOVE · ENTER TO SELECT
        </div>
      )}
    </div>
  );
}

const resetBtn: CSSProperties = {
  font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, margin: 0, outlineOffset: 3,
};

function MenuButton({ children, onClick, primary, autoFocus, style }: {
  children: ReactNode; onClick: () => void; primary?: boolean; autoFocus?: boolean; style?: CSSProperties;
}) {
  return (
    <button data-nav data-autofocus={autoFocus ? '' : undefined} onClick={onClick} style={{
      ...resetBtn, fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
      padding: '16px 24px', borderRadius: 6,
      color: primary ? '#06121e' : '#dde8f2',
      background: primary ? ACCENT : 'rgba(8,14,22,0.85)',
      border: `2px solid ${primary ? ACCENT : 'rgba(136,204,255,0.35)'}`,
      ...style,
    }}>
      {children}
    </button>
  );
}

function Panel({ title, children, onBack, narrow }: { title: string; children: ReactNode; onBack: () => void; narrow?: boolean }) {
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

function Slider({ label, value, onChange, autoFocus }: { label: string; value: number; onChange: (v: number) => void; autoFocus?: boolean }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr 280px 70px', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 28 }}>{label}</span>
      <input
        data-nav data-autofocus={autoFocus ? '' : undefined}
        type="range" min={0} max={1} step={0.05} value={value}
        onInput={e => onChange(Number((e.target as HTMLInputElement).value))}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: ACCENT, height: 28 }}
      />
      <span style={{ fontFamily: MONO, fontSize: 24, textAlign: 'right', color: ACCENT }}>{Math.round(value * 100)}</span>
    </label>
  );
}

function Toggle({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button data-nav onClick={() => onChange(!value)} style={{
      ...resetBtn, background: 'none', border: 'none', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, textAlign: 'left',
    }}>
      <span>
        <span style={{ display: 'block', fontSize: 28 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 20, color: '#8ea3b6' }}>{note}</span>
      </span>
      <span style={{
        width: 72, height: 38, borderRadius: 19, flexShrink: 0, position: 'relative',
        background: value ? ACCENT : 'rgba(255,255,255,0.15)', transition: 'background 120ms',
      }}>
        <span style={{
          position: 'absolute', top: 4, left: value ? 38 : 4, width: 30, height: 30, borderRadius: 15,
          background: value ? '#06121e' : '#cfd8e0', transition: 'left 120ms',
        }} />
      </span>
    </button>
  );
}
