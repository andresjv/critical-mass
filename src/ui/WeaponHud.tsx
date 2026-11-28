// Ground assault weapon readouts: the equipped gun with its ammo/reload (top-left, under the
// score), credits earned this stage, and the Hold-H weapon wheel (4 slots: up, right, down, left,
// matching keys 1–4 and the stick direction used to pick one).
import type { HudState } from './useHudState';
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
