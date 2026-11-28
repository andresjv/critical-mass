// Inventory, part picker and achievements pages of the main menu.
// Reads and writes plain-TS progress state only (no Phaser).
import { useState, type ReactNode } from 'react';
import { ACHIEVEMENTS, PARTS, equip, isPartUnlocked, partDef, progress, type PartDef, type PartSlot } from '../state/progress';
import { LEVELS, levelInfo, type LevelId } from '../state/levels';
import { JET_SKINS } from '../game/theme/loadoutTheme';
import { PLAYER_JET, type JetPalette } from '../game/theme/factions';
import { ACCENT, MONO, MenuButton, Panel, resetBtn } from './menuKit';

const SLOTS: { slot: PartSlot; label: string }[] = [
  { slot: 'jet',  label: 'Jet' },
  { slot: 'gun',  label: 'Gun' },
  { slot: 'bomb', label: 'Bomb' },
];

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

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
      <style>{COIN_CSS}</style>
      <div style={{ fontFamily: MONO, fontSize: 20, color: '#7f97ad', marginBottom: 14 }}>
        {earnedCount}/{ACHIEVEMENTS.length} EARNED · Beat a level to earn its medal
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14, justifyItems: 'center' }}>
        {ACHIEVEMENTS.map((a, i) => {
          const earned = progress.achieved.includes(a.level);
          const on = active === a.level;
          return (
            <button key={a.level} data-nav
              aria-label={`${a.name}${earned ? '' : ' (locked)'}`}
              className={`cm-coin${on ? ' spin' : ''}${earned ? '' : ' locked'}`}
              onMouseEnter={() => setActive(a.level)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(a.level)} onBlur={() => setActive(null)}
              onClick={() => setActive(a.level)}
              style={{ ...resetBtn, background: 'none', border: 'none' }}>
              <div className="cm-coin-body">
                {RIM_LAYERS.map(z => <div key={z} className="cm-coin-rim" style={{ transform: `translateZ(${z}px)` }} />)}
                <div className="cm-coin-face front"><Diorama level={a.level} /></div>
                <div className="cm-coin-face back"><Emblem n={i + 1} /></div>
              </div>
              {!earned && <div className="cm-coin-lock"><LockIcon /></div>}
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
          <div style={{ fontSize: 22, color: '#6f879c', paddingTop: 34 }}>Hover or tap a medal to see what it is for.</div>
        )}
      </div>
      <MenuButton autoFocus onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

/** Depths (px) of the stacked discs that give the coin its thickness. */
const RIM_LAYERS = [-7, -5.5, -4, -2.5, -1, 0.5, 2, 3.5, 5, 6.5];

const COIN_CSS = `
.cm-card { transition: transform 120ms, box-shadow 120ms, border-color 120ms; }
.cm-card:hover, .cm-card:focus-visible { transform: translateY(-4px); }
.cm-coin { position: relative; width: 196px; height: 196px; perspective: 900px; outline-offset: 6px; border-radius: 50%; }
.cm-coin-body { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateY(0deg); }
.cm-coin.spin .cm-coin-body { animation: cm-spin 2.4s linear infinite; }
@keyframes cm-spin { from { transform: rotateX(8deg) rotateY(0deg); } to { transform: rotateX(8deg) rotateY(360deg); } }
.cm-coin-rim { position: absolute; inset: 0; border-radius: 50%; background: #a8781e; box-shadow: inset 0 0 0 3px #7a5512; }
.cm-coin-face { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; backface-visibility: hidden;
  border: 8px solid #e8b83c; box-shadow: inset 0 0 0 3px #8a6418, inset 0 0 18px rgba(0,0,0,0.45); box-sizing: border-box; }
.cm-coin-face.front { transform: translateZ(8px); }
.cm-coin-face.back { transform: rotateY(180deg) translateZ(8px); background: radial-gradient(circle at 40% 35%, #ffe08a, #d8a12c 60%, #9a6c16); }
.cm-coin-face svg { width: 100%; height: 100%; display: block; }
.cm-coin:not(.spin) .cm-coin-rim { visibility: hidden; }
.cm-coin.locked .cm-coin-face { filter: grayscale(1) brightness(0.5); }
.cm-coin.locked .cm-coin-face, .cm-coin.locked .cm-coin-rim { border-color: #8a8f96; }
.cm-coin-lock { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(1.6); pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
.cm-coin.spin .cm-coin-lock { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .cm-coin.spin .cm-coin-body { animation-duration: 6s; } }
`;

/** Back of each coin: a star medal with the level number. */
function Emblem({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="34" fill="none" stroke="#8a6418" strokeWidth="2.5" />
      <polygon points="50,22 57,41 77,41 61,53 67,73 50,61 33,73 39,53 23,41 43,41" fill="#fff3c4" stroke="#8a6418" strokeWidth="2" />
      <text x="50" y="91" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#6a4a10">LV {n}</text>
    </svg>
  );
}

/** A tiny scene of the level inside the coin. */
function Diorama({ level }: { level: LevelId }) {
  const [sky, ground] = LEVELS.find(l => l.id === level)!.preview;
  const jet = (x: number, y: number, s: number, pal: JetPalette = PLAYER_JET) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}><JetShape pal={pal} /></g>
  );
  let scene: ReactNode;
  switch (level) {
    case 'swamp':
      scene = <>
        <rect width="100" height="100" fill={sky} />
        <circle cx="72" cy="26" r="9" fill="#d7e4c0" opacity="0.85" />
        <rect y="34" width="100" height="14" fill="#9fb59a" opacity="0.18" />
        {[14, 30, 80, 92].map((x, i) => <g key={x}>
          <rect x={x - 1.5} y={46 - i % 2 * 6} width="3" height="30" fill="#141d16" />
          <ellipse cx={x} cy={44 - i % 2 * 6} rx="9" ry="7" fill="#22341f" />
          <ellipse cx={x + 3} cy={50 - i % 2 * 6} rx="6" ry="4" fill="#2d4426" />
        </g>)}
        <rect y="70" width="100" height="30" fill={ground} />
        <rect y="74" width="100" height="26" fill="#1a2a26" opacity="0.8" />
        {[20, 46, 70].map(x => <rect key={x} x={x} y={80} width="14" height="1.5" fill="#6d8a70" opacity="0.6" />)}
        {jet(52, 56, 0.6)}
      </>;
      break;
    case 'desert':
      scene = <>
        <rect width="100" height="100" fill={sky} />
        <circle cx="30" cy="34" r="13" fill="#ffd27a" />
        <rect x="58" y="48" width="26" height="20" fill="#9a4f2c" /><rect x="54" y="46" width="34" height="4" fill="#b8613a" />
        <path d="M0 70 Q25 58 50 68 T100 64 V100 H0Z" fill={ground} />
        <path d="M0 82 Q30 72 60 80 T100 78 V100 H0Z" fill="#b0743c" />
        {/* tank */}
        <g transform="translate(34 72)">
          <rect x="-9" y="-3" width="18" height="6" rx="2" fill="#7a5a32" /><rect x="-5" y="-7" width="9" height="4" fill="#8e6a3c" />
          <rect x="4" y="-6.5" width="9" height="1.6" fill="#5a4224" /><rect x="-7" y="-5.5" width="3" height="1.2" fill="#d23a2a" />
        </g>
        {jet(66, 30, 0.5)}
        <path d="M64 33 L36 66" stroke="#ffe8a0" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
      </>;
      break;
    case 'coldfront':
      scene = <>
        <rect width="100" height="100" fill={sky} />
        {[[12, 14], [30, 8], [56, 18], [84, 12], [70, 28]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="0.9" fill="#cfe0ff" />)}
        <ellipse cx="62" cy="22" rx="30" ry="9" fill="#18263a" />
        <polyline points="66,26 60,40 66,40 58,56" fill="none" stroke="#e8f0ff" strokeWidth="1.6" />
        <polygon points="0,72 18,46 30,60 44,40 62,66 78,50 100,70 100,100 0,100" fill="#1e3348" />
        <polygon points="44,40 38,49 50,49" fill="#dfe8f2" /><polygon points="18,46 13,53 23,53" fill="#dfe8f2" />
        <rect y="76" width="100" height="24" fill={ground} />
        {[8, 18, 82, 92].map(x => <polygon key={x} points={`${x},66 ${x - 5},80 ${x + 5},80`} fill="#0e1c16" />)}
        {[40, 48, 56].map((x, i) => <rect key={x} x={x} y={70 - i * 3} width="6" height={10 + i * 3} fill="#0b1520" />)}
        <circle cx="47" cy="66" r="1" fill="#ffd060" />
        {jet(36, 34, 0.5)}
      </>;
      break;
    case 'snow':
      scene = <>
        <rect width="100" height="100" fill={sky} />
        <polygon points="0,66 22,34 38,54 56,26 76,52 100,38 100,100 0,100" fill="#c6d6e4" />
        <polygon points="56,26 48,38 64,38" fill="#ffffff" /><polygon points="22,34 16,43 28,43" fill="#ffffff" />
        <rect y="70" width="100" height="30" fill={ground} />
        <path d="M0 74 Q50 66 100 76" stroke="#ffffff" strokeWidth="3" fill="none" />
        {[[10, 20], [26, 60], [44, 14], [66, 64], [80, 22], [90, 58], [56, 82], [16, 86]].map(([x, y]) =>
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#ffffff" opacity="0.9" />)}
        {jet(54, 50, 0.6, JET_SKINS.arctic ?? PLAYER_JET)}
      </>;
      break;
    case 'moon':
      scene = <>
        <rect width="100" height="100" fill={sky} />
        {[[8, 10], [20, 30], [40, 8], [86, 34], [64, 14], [12, 50], [92, 8]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" />)}
        <circle cx="72" cy="28" r="13" fill="#2e6fd0" />
        <path d="M64 22 q6 -4 10 2 q-2 6 -8 4z M74 32 q5 -2 7 3 q-4 4 -7 0z" fill="#5fae5a" />
        <path d="M0 74 Q30 64 60 72 T100 70 V100 H0Z" fill={ground} />
        <ellipse cx="26" cy="82" rx="10" ry="3" fill="#4e5157" /><ellipse cx="70" cy="86" rx="7" ry="2.2" fill="#4e5157" />
        <rect x="40" y="64" width="16" height="8" rx="2" fill="#9aa0a8" /><path d="M42 64 a6 6 0 0 1 12 0z" fill="#b8bec6" />
        {jet(36, 44, 0.55, JET_SKINS.nova ?? PLAYER_JET)}
      </>;
      break;
  }
  return <svg viewBox="0 0 100 100" aria-hidden="true">{scene}</svg>;
}

// ── Icons ───────────────────────────────────────────────────────────────────

function PartIcon({ part, big }: { part: PartDef; big?: boolean }) {
  if (part.slot === 'jet') return <JetIcon pal={JET_SKINS[part.id] ?? PLAYER_JET} big={big} />;
  if (part.slot === 'gun') return <GunIcon twin={part.id === 'twin'} />;
  return <BombIcon cluster={part.id === 'cluster'} />;
}

/** Side view of a fighter in the given skin, matching the in-game model. */
function JetShape({ pal }: { pal: JetPalette }) {
  const body = hex(pal.body), dark = hex(pal.dark);
  return (
    <g>
      <polygon points="-16,-5 -30,-5 -37,-23 -30,-23" fill={body} />
      <polygon points="-27,-14 -33,-14 -35.5,-21 -30.5,-21" fill={hex(pal.marking)} />
      <polygon points="38,0.5 28,-2 16,-5 0,-6.5 -22,-6.5 -32,-5 -37,-3.5 -37,3.5 -30,5.5 -6,6.5 12,6 26,3" fill={body} />
      {pal.camo.map((c, i) => <ellipse key={i} cx={-18 + i * 16} cy={-1 + (i % 2) * 2} rx="7" ry="2.6" fill={hex(c)} />)}
      <polygon points="38,0.5 30,-1.6 30,3.4" fill={dark} />
      <polygon points="22,-4.5 16,-9.5 8,-10.5 2,-6.5" fill={hex(pal.canopy)} />
      <polygon points="6,2.5 -9,2.5 -19,10.5 -13,10.5" fill={dark} />
      <polygon points="-25,2 -34,2 -39,8 -33,8" fill={dark} />
      <circle cx="-8" cy="-0.5" r="3.6" fill={hex(pal.marking)} /><circle cx="-8" cy="-0.5" r="1.8" fill={hex(pal.markingCore)} />
      <rect x="-40" y="-3.5" width="3.5" height="7" fill="#2a2e33" />
    </g>
  );
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
