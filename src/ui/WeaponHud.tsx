// Ground assault weapon readouts: the equipped gun with its ammo/reload (top-left, under the
// score), credits earned this stage, and the Hold-H weapon wheel (4 slots: up, right, down, left,
// matching keys 1–4 and the stick direction used to pick one).
import type { HudState } from './useHudState';
import { InputRouter } from '../input/InputRouter';
import { RARITY_COLOR } from '../game/theme/groundAssault';

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', sans-serif";

const PANEL: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(14,22,34,0.86), rgba(8,13,20,0.76))',
  border: '1px solid rgba(140,180,220,0.18)', borderRadius: 12,
  boxShadow: '0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const LABEL: React.CSSProperties = {
  fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: 2.5,
  color: 'rgba(190,210,230,0.7)', textTransform: 'uppercase', lineHeight: 1,
};

/** Card offsets from the wheel centre for slots 1–4 (up, right, down, left). */
const SLOT_POS: [number, number][] = [[0, -120], [190, 0], [0, 120], [-190, 0]];

function wheelKey(device: HudState['device']): string {
  if (device === 'touch') return 'GUNS';
  if (device === 'gamepad') return 'Y';
  return 'H';
}

export function WeaponHud({ s }: { s: HudState }) {
  const w = s.weapon;
  if (!w) return null;
  const col = RARITY_COLOR[w.rarity] ?? '#ffffff';
  const reloading = w.reload >= 0;
  const low = !reloading && w.ammo <= Math.ceil(w.mag * 0.2);

  return (
    <>
      {/* Equipped gun */}
      <div style={{
        position: 'absolute', top: 82, left: 16, ...PANEL, padding: '8px 14px 9px', minWidth: 170,
        borderColor: `${col}55`, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <span style={{ ...LABEL, color: col }}>{w.rarity}</span>
          <span style={{ ...LABEL, fontSize: 10 }}>Hold {wheelKey(s.device)} · guns</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>{w.name}</div>
        {reloading ? (
          <div style={{ marginTop: 6 }}>
            <span style={{ ...LABEL, color: '#ffc23d' }}>Reloading</span>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
              <div style={{ width: `${Math.round(w.reload * 100)}%`, height: '100%', borderRadius: 3, background: '#ffc23d' }} />
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: low ? '#ff6a5a' : '#d8e2ec', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {w.ammo}<span style={{ fontSize: 13, color: 'rgba(200,215,230,0.6)' }}> / {w.mag}</span>
          </div>
        )}
        {s.creditsEarned > 0 && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#ffd76a', marginTop: 4 }}>+{s.creditsEarned} credits</div>
        )}
      </div>

      {/* Weapon wheel */}
      {s.wheel && (
        <div style={{
          position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 60%)',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <div style={{ ...LABEL, fontSize: 12 }}>Pick a gun</div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(200,215,230,0.6)', marginTop: 4 }}>
              {s.device === 'keyboard' ? 'Arrows or 1–4 · release H' : 'Stick · release to equip'}
            </div>
          </div>
          {s.wheel.slots.map((slot, i) => {
            const [dx, dy] = SLOT_POS[i];
            const empty = !slot.name;
            const c = RARITY_COLOR[slot.rarity] ?? '#6a7a8a';
            const hi = i === s.wheel!.highlight;
            const eq = i === s.wheel!.equipped;
            return (
              <div key={i} style={{
                position: 'absolute', left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)`,
                transform: `translate(-50%,-50%) scale(${hi ? 1.08 : 1})`, transition: 'transform 90ms',
                width: 170, padding: '10px 12px', ...PANEL,
                borderColor: hi ? c : empty ? 'rgba(140,180,220,0.12)' : `${c}55`,
                boxShadow: hi ? `0 0 22px ${c}88` : PANEL.boxShadow as string,
                opacity: empty ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(200,215,230,0.6)' }}>{i + 1}</span>
                  {eq && <span style={{ ...LABEL, fontSize: 9, color: '#5cf0a0' }}>Equipped</span>}
                </div>
                {empty ? (
                  <div style={{ fontFamily: SANS, fontSize: 14, color: 'rgba(200,215,230,0.6)', marginTop: 4 }}>Empty slot</div>
                ) : (
                  <>
                    <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 2 }}>{slot.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ ...LABEL, fontSize: 9, color: c }}>{slot.rarity}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: '#d8e2ec' }}>{slot.ammo}/{slot.mag}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function interactKey(device: HudState['device']): string {
  if (device === 'gamepad') return 'X';
  return 'T';
}

const PROMPT_CSS = `@keyframes cm-prompt { 0%,100% { transform: translate(-50%, 0) } 50% { transform: translate(-50%, -6px) } }`;

/** "Press T to …" pop-up near an interactable (the launch button, the hangar). On touch the
 *  pop-up itself is the button: tapping it interacts. */
export function InteractPrompt({ s }: { s: HudState }) {
  if (!s.interactPrompt) return null;
  const touch = s.device === 'touch';
  return (
    <>
      <style>{PROMPT_CSS}</style>
      <button
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); InputRouter.tapInteract(); }}
        style={{
          position: 'absolute', left: '50%', top: '30%', animation: 'cm-prompt 1.1s ease-in-out infinite',
          ...PANEL, borderRadius: 999, borderColor: 'rgba(255,215,106,0.7)', padding: '10px 22px 10px 12px',
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: '#fff',
          boxShadow: '0 0 24px rgba(255,200,80,0.35)', pointerEvents: touch ? 'auto' : 'none',
          font: 'inherit',
        }}>
        <span style={{
          minWidth: 40, height: 40, borderRadius: touch ? 999 : 8, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#ffd76a', color: '#1a1406', fontFamily: MONO, fontSize: touch ? 14 : 22, fontWeight: 800,
        }}>{touch ? 'TAP' : interactKey(s.device)}</span>
        <span style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{s.interactPrompt}</span>
      </button>
    </>
  );
}

function itemKey(device: HudState['device']): { use: string; next: string } {
  if (device === 'gamepad') return { use: 'RB', next: 'LB' };
  if (device === 'touch') return { use: 'ITEM', next: 'TAP' };
  return { use: 'J', next: 'Q' };
}

/** Small drawn icon for each side item. */
export function ItemIcon({ kind, size = 26 }: { kind: string; size?: number }) {
  if (kind === 'medkit') return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <rect x="2" y="5" width="22" height="17" rx="3" fill="#f2f2f2" />
      <rect x="10.5" y="8" width="5" height="11" fill="#e0302a" /><rect x="7.5" y="11" width="11" height="5" fill="#e0302a" />
    </svg>
  );
  if (kind === 'smoke') return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <rect x="7" y="8" width="12" height="16" rx="2" fill="#7a8088" /><rect x="7" y="13" width="12" height="3" fill="#e0e4e8" />
      <rect x="10" y="4" width="6" height="4" fill="#55595e" /><circle cx="20" cy="5" r="3" fill="#d8dcdc" opacity="0.8" />
    </svg>
  );
  if (kind === 'molotov') return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <rect x="8" y="10" width="10" height="14" rx="3" fill="#6a8a4a" /><rect x="11" y="5" width="4" height="6" fill="#6a8a4a" />
      <path d="M13 1 C16 4 15 6 13 6 C11 6 10 4 13 1Z" fill="#ff9a2a" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <ellipse cx="13" cy="15" rx="8" ry="9" fill="#3e4a2c" /><rect x="5" y="13" width="16" height="3" fill="#9a9a7a" />
      <rect x="10" y="3" width="6" height="4" fill="#55595e" /><path d="M16 4 L22 2" stroke="#9a9a7a" strokeWidth="2" />
    </svg>
  );
}

/** Side item (J): the selected item with its count and the others; tap or Q to switch.
 *  Also the "In cover" badge while crouched behind cover. */
export function ItemHud({ s }: { s: HudState }) {
  const it = s.item;
  if (!it) return null;
  const keys = itemKey(s.device);
  return (
    <>
      <button
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); InputRouter.tapItemNext(); }}
        style={{
          position: 'absolute', top: s.creditsEarned > 0 ? 196 : 178, left: 16, ...PANEL, padding: '7px 12px 7px 9px',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 170, cursor: 'pointer', color: '#fff', font: 'inherit',
          pointerEvents: 'auto', opacity: it.count > 0 ? 1 : 0.55,
        }}>
        <ItemIcon kind={it.kind} />
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ ...LABEL, fontSize: 10 }}>{keys.use} · use  ·  {keys.next} · switch</div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, marginTop: 3 }}>
            {it.name} <span style={{ fontFamily: MONO, color: it.count > 0 ? '#ffd76a' : '#ff6a5a' }}>×{it.count}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {it.all.filter(a => a.kind !== it.kind).map(a => (
            <span key={a.kind} style={{ display: 'flex', alignItems: 'center', gap: 1, opacity: a.count > 0 ? 0.8 : 0.3 }}>
              <ItemIcon kind={a.kind} size={16} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#d8e2ec' }}>{a.count}</span>
            </span>
          ))}
        </div>
      </button>
      {s.inCover && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 108, transform: 'translateX(-50%)', ...PANEL,
          borderRadius: 999, padding: '6px 16px', borderColor: 'rgba(95,209,122,0.6)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#5fd17a' }} />
          <span style={{ ...LABEL, color: '#cfeedd', fontSize: 12 }}>In cover</span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(200,215,230,0.7)' }}>
            {s.device === 'touch' ? 'Hold SHOOT to pop up' : s.device === 'gamepad' ? 'Hold fire to pop up' : 'Hold Space to pop up'}
          </span>
        </div>
      )}
    </>
  );
}
