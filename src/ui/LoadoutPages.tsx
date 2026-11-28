// Inventory, part picker and achievements pages of the main menu.
// Reads and writes plain-TS progress state only (no Phaser).
import { useState } from 'react';
import { ACHIEVEMENTS, PARTS, equip, isPartUnlocked, partDef, progress, type PartDef, type PartSlot } from '../state/progress';
import { levelInfo, type LevelId } from '../state/levels';
import { GLOBE_CSS, JetShape, SnowGlobe } from './SnowGlobe';
import { JET_SKINS } from '../game/theme/loadoutTheme';
import { PLAYER_JET, type JetPalette } from '../game/theme/factions';
import { ACCENT, MONO, MenuButton, Panel, resetBtn } from './menuKit';

const SLOTS: { slot: PartSlot; label: string }[] = [
  { slot: 'jet',  label: 'Jet' },
  { slot: 'gun',  label: 'Gun' },
  { slot: 'bomb', label: 'Bomb' },
];


// ── Inventory: one clickable card per slot ──────────────────────────────────

export function InventoryPage({ onBack, onOpenSlot }: { onBack: () => void; onOpenSlot: (s: PartSlot) => void }) {
  return (
    <Panel title="Inventory" onBack={onBack}>
      <div style={{ fontSize: 22, color: '#9fb2c3', marginBottom: 18 }}>
        Pick a slot to change parts. Beat levels to unlock more.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 26 }}>
        {SLOTS.map(({ slot, label }, i) => {
          const part = partDef(progress.loadout[slot]);
          const all = PARTS.filter(p => p.slot === slot);
          const open = all.filter(p => isPartUnlocked(p.id)).length;
          return (
            <button key={slot} data-nav data-autofocus={i === 0 ? '' : undefined} onClick={() => onOpenSlot(slot)}
              className="cm-card"
              style={{
                ...resetBtn, textAlign: 'left', borderRadius: 10, padding: '16px 20px 18px',
                background: 'rgba(8,14,22,0.92)', border: '2px solid rgba(136,204,255,0.3)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 18, color: '#6f879c' }}>
                <span>{label.toUpperCase()}</span><span>{open}/{all.length} UNLOCKED</span>
              </div>
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PartIcon part={part} big />
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>{part.name}</div>
              <div style={{ fontSize: 20, color: '#9fb2c3', minHeight: 52 }}>{part.desc}</div>
              <div style={{ fontSize: 20, color: ACCENT, letterSpacing: 2 }}>CHANGE ›</div>
            </button>
          );
        })}
      </div>
      <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

// ── Part picker for one slot ────────────────────────────────────────────────

export function PartsPage({ slot, onBack }: { slot: PartSlot; onBack: () => void }) {
  const parts = PARTS.filter(p => p.slot === slot);
  const [, bump] = useState(0);
  const [focus, setFocus] = useState<PartDef>(partDef(progress.loadout[slot]));
  const label = SLOTS.find(s => s.slot === slot)!.label;
  const pick = (p: PartDef) => { if (equip(p.id)) bump(n => n + 1); setFocus(p); };
  const unlocked = isPartUnlocked(focus.id);
  const isOn = progress.loadout[slot] === focus.id;

  return (
    <Panel title={`Choose ${label.toLowerCase()}`} onBack={onBack}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(parts.length, 3)}, 1fr)`, gap: 14, marginBottom: 20 }}>
        {parts.map(p => {
          const open = isPartUnlocked(p.id);
          const on = progress.loadout[slot] === p.id;
          return (
            <button key={p.id} data-nav data-autofocus={on ? '' : undefined}
              onClick={() => pick(p)} onFocus={() => setFocus(p)} onMouseEnter={() => setFocus(p)}
              className="cm-card"
              style={{
                ...resetBtn, textAlign: 'left', borderRadius: 10, padding: '14px 16px 16px', position: 'relative',
                background: open ? 'rgba(8,14,22,0.92)' : 'rgba(8,14,22,0.6)',
                border: `2px ${open ? 'solid' : 'dashed'} ${on ? ACCENT : focus.id === p.id ? 'rgba(136,204,255,0.6)' : 'rgba(136,204,255,0.2)'}`,
                boxShadow: on ? `0 0 22px ${ACCENT}44` : 'none',
                cursor: open ? 'pointer' : 'not-allowed',
              }}>
              <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: open ? 'none' : 'grayscale(1) brightness(0.55)' }}>
                <PartIcon part={p} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: open ? '#fff' : '#8195a8' }}>{p.name}</div>
              <div style={{ fontSize: 18, color: on ? ACCENT : open ? '#9fb2c3' : '#6f879c' }}>
                {on ? 'EQUIPPED' : open ? 'Tap to equip' : `Beat ${levelInfo(p.unlock!).name} to unlock`}
              </div>
              {!open && <div style={{ position: 'absolute', top: 12, right: 14 }}><LockIcon /></div>}
            </button>
          );
        })}
      </div>
      {/* Details of the highlighted part. */}
      <div style={{
        display: 'flex', gap: 24, alignItems: 'center', padding: '14px 20px', borderRadius: 8, marginBottom: 22,
        background: 'rgba(136,204,255,0.06)', borderLeft: `4px solid ${unlocked ? ACCENT : '#55677a'}`, minHeight: 100,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>
            {focus.name} {isOn && <span style={{ fontSize: 20, color: ACCENT, letterSpacing: 2, marginLeft: 8 }}>EQUIPPED</span>}
          </div>
          <div style={{ fontSize: 22, color: '#b9cad8' }}>{focus.desc}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: MONO, fontSize: 19, color: unlocked ? '#cfe6f8' : '#6f879c' }}>
          {focus.stats.map(s => <span key={s}>▸ {s}</span>)}
        </div>
      </div>
      <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

// ── Achievements: 3D coins with a diorama of each level ────────────────────

export function AchievementsPage({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<LevelId | null>(null);
  const earnedCount = ACHIEVEMENTS.filter(a => progress.achieved.includes(a.level)).length;
  const shown = ACHIEVEMENTS.find(a => a.level === active) ?? null;

  return (
    <Panel title="Achievements" onBack={onBack}>
      <style>{GLOBE_CSS}</style>
      <div style={{ fontFamily: MONO, fontSize: 20, color: '#7f97ad', marginBottom: 14 }}>
        {earnedCount}/{ACHIEVEMENTS.length} EARNED · Beat a level to earn its snow globe
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14, justifyItems: 'center' }}>
        {ACHIEVEMENTS.map((a, i) => {
          const earned = progress.achieved.includes(a.level);
          const on = active === a.level;
          return (
            <button key={a.level} data-nav
              aria-label={`${a.name}${earned ? '' : ' (locked)'}`}
              onMouseEnter={() => setActive(a.level)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(a.level)} onBlur={() => setActive(null)}
              onClick={() => setActive(a.level)}
              style={{ ...resetBtn, background: 'none', border: 'none', position: 'relative', borderRadius: 12, outlineOffset: 4 }}>
              <SnowGlobe level={a.level} n={i + 1} earned={earned} active={on} />
              {!earned && <div style={{ position: 'absolute', left: '50%', top: 85, transform: 'translate(-50%, -50%) scale(1.5)', pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', opacity: on ? 0 : 1, transition: 'opacity 200ms' }}><LockIcon /></div>}
            </button>
          );
        })}
      </div>
      {/* Tooltip for the hovered / focused / tapped coin. */}
      <div style={{
        minHeight: 128, padding: '14px 20px', borderRadius: 8, marginBottom: 20,
        background: 'rgba(136,204,255,0.06)', borderLeft: `4px solid ${shown ? (progress.achieved.includes(shown.level) ? '#f2c94c' : '#55677a') : 'transparent'}`,
      }}>
        {shown ? (() => {
          const earned = progress.achieved.includes(shown.level);
          const prize = partDef(shown.unlocks);
          return (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
                  {shown.name}
                  <span style={{ fontFamily: MONO, fontSize: 18, marginLeft: 12, letterSpacing: 2, color: earned ? '#f2c94c' : '#7f97ad' }}>
                    {earned ? 'EARNED' : 'LOCKED'}
                  </span>
                </div>
                <div style={{ fontSize: 22, color: '#b9cad8' }}>{shown.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, letterSpacing: 2, color: '#7f97ad' }}>UNLOCKS</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: earned ? ACCENT : '#cfd8e0' }}>{prize.name}</div>
                  <div style={{ fontSize: 17, color: '#8ea3b6' }}>{SLOTS.find(s => s.slot === prize.slot)!.label}</div>
                </div>
                <div style={{ width: 120, display: 'flex', justifyContent: 'center' }}><PartIcon part={prize} /></div>
              </div>
            </div>
          );
        })() : (
          <div style={{ fontSize: 22, color: '#6f879c', paddingTop: 34 }}>Hover or tap a snow globe to see what it is for.</div>
        )}
      </div>
      <MenuButton autoFocus onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function PartIcon({ part, big }: { part: PartDef; big?: boolean }) {
  if (part.slot === 'jet') return <JetIcon pal={JET_SKINS[part.id] ?? PLAYER_JET} big={big} />;
  if (part.slot === 'gun') return <GunIcon twin={part.id === 'twin'} />;
  return <BombIcon cluster={part.id === 'cluster'} />;
}

function JetIcon({ pal, big }: { pal: JetPalette; big?: boolean }) {
  return (
    <svg viewBox="-44 -26 92 40" width={big ? 250 : 180} height={big ? 108 : 78} aria-hidden="true">
      <JetShape pal={pal} />
    </svg>
  );
}

function GunIcon({ twin }: { twin?: boolean }) {
  const barrel = (y: number) => <g key={y} transform={`translate(0 ${y})`}>
    <rect x="4" y="12" width="34" height="8" rx="2" fill="#8ea3b6" />
    <rect x="36" y="13" width="20" height="3" fill="#cfd8e0" /><rect x="36" y="17" width="20" height="2" fill="#cfd8e0" />
  </g>;
  return (
    <svg viewBox="0 0 60 30" width="140" height="70" aria-hidden="true">
      {twin ? [-6, 6].map(barrel) : barrel(0)}
      {!twin && <><rect x="40" y="6" width="10" height="3" rx="1" fill="#ffd060" /><rect x="40" y="22" width="10" height="3" rx="1" fill="#ffd060" /></>}
      {twin && <><rect x="56" y="7" width="3" height="2" fill="#ffd060" /><rect x="56" y="19" width="3" height="2" fill="#ffd060" /></>}
    </svg>
  );
}

function BombIcon({ cluster }: { cluster?: boolean }) {
  if (cluster) {
    return (
      <svg viewBox="-24 -12 48 24" width="140" height="70" aria-hidden="true">
        <polygon points="-10,0 -20,-9 -22,-9 -18,0 -22,9 -20,9" fill="#6b7660" />
        <polygon points="-14,-5 6,-7 12,-5 16,0 12,5 6,7 -14,5" fill="#55604a" />
        <line x1="-2" y1="-6.5" x2="-2" y2="6.5" stroke="#2f362b" strokeWidth="0.8" />
        {[[-8, -2], [-4, 2], [2, -2], [6, 2]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="#d8c040" />)}
        {[[18, -8], [21, -3], [20, 6]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#4a5444" />)}
      </svg>
    );
  }
  return (
    <svg viewBox="-24 -10 44 20" width="130" height="62" aria-hidden="true">
      <polygon points="-10,0 -20,-9 -22,-9 -18,0 -22,9 -20,9" fill="#6b7660" />
      <polygon points="-14,-4 6,-6 12,-4 16,0 12,4 6,6 -14,4" fill="#4a5444" />
      <polygon points="10,-4.5 14,-2.5 16,0 14,2.5 10,4.5" fill="#2f362b" />
      <rect x="-4" y="-5.6" width="3" height="11.2" fill="#d8c040" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 24" width="22" height="26" aria-hidden="true">
      <path d="M5 10 V7 a5 5 0 0 1 10 0 V10" fill="none" stroke="#cfd8e0" strokeWidth="2.4" />
      <rect x="2" y="10" width="16" height="12" rx="2" fill="#cfd8e0" />
      <rect x="9" y="14" width="2" height="4" fill="#3a4654" />
    </svg>
  );
}
