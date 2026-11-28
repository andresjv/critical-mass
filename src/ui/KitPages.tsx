// Soldier kit pages of the Inventory: side tools (3 slots), character look and armor.
// Reads and writes plain-TS kit state only (no Phaser).
import { useState } from 'react';
import {
  ARMORS, CHARACTERS, TOOLS, armorDef, characterDef, chooseArmor, credits, kit, setCharacter, setTool, toolDef,
  type ArmorId, type CharacterDef, type ToolId,
} from '../state/soldierKit';
import { KIT } from '../state/tuning';
import { ACCENT, MONO, MenuButton, Panel, resetBtn } from './menuKit';
import { ItemIcon } from './WeaponHud';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

const card = (on: boolean, dim = false) => ({
  ...resetBtn, textAlign: 'left' as const, borderRadius: 10, padding: '12px 16px',
  background: on ? 'rgba(136,204,255,0.12)' : dim ? 'rgba(8,14,22,0.6)' : 'rgba(8,14,22,0.92)',
  border: `2px solid ${on ? ACCENT : 'rgba(136,204,255,0.25)'}`,
  boxShadow: on ? `0 0 18px ${ACCENT}44` : 'none',
});

export function CreditsTag() {
  return (
    <span style={{ fontFamily: MONO, fontSize: 24, color: '#ffd76a' }}>
      ◈ {credits()} <span style={{ fontSize: 16, color: '#b8a060' }}>CREDITS</span>
    </span>
  );
}

// ── Side tools: three slots, any of four tools ─────────────────────────────

export function ToolsPage({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(0);
  const [, bump] = useState(0);
  const place = (id: ToolId | null) => { setTool(active, id); bump(n => n + 1); };
  return (
    <Panel title="Side tools" onBack={onBack}>
      <div style={{ fontSize: 20, color: '#9fb2c3', marginBottom: 14 }}>
        Pick a slot, then a tool. In the ground assault press J to use, Q to switch. Hold J to aim a throw.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KIT.toolSlots}, 1fr)`, gap: 12, marginBottom: 18 }}>
        {kit.tools.map((id, i) => (
          <button key={i} data-nav data-autofocus={i === 0 ? '' : undefined} onClick={() => setActive(i)} style={card(i === active)}>
            <div style={{ fontFamily: MONO, fontSize: 14, color: '#7f97ad' }}>SLOT {i + 1}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              {id ? <ItemIcon kind={id} size={34} /> : <span style={{ width: 34, height: 34 }} />}
              <span style={{ fontSize: 22, fontWeight: 700, color: id ? '#fff' : '#6f879c' }}>{id ? toolDef(id).name : 'Empty'}</span>
            </div>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
        {TOOLS.map(t => {
          const here = kit.tools[active] === t.id, slot = kit.tools.indexOf(t.id);
          return (
            <button key={t.id} data-nav onClick={() => place(here ? null : t.id)} style={card(here)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ItemIcon kind={t.id} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    {t.name} <span style={{ fontFamily: MONO, fontSize: 16, color: '#ffd76a' }}>×{KIT.toolCount[t.id]}</span>
                  </div>
                  <div style={{ fontSize: 17, color: '#9fb2c3' }}>{t.desc}</div>
                </div>
                <span style={{ fontSize: 15, color: here ? ACCENT : '#7f97ad', letterSpacing: 1 }}>
                  {here ? 'IN SLOT · TAP TO REMOVE' : slot >= 0 ? `IN SLOT ${slot + 1}` : 'TAP TO EQUIP'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

// ── Character ───────────────────────────────────────────────────────────────

/** Head-and-shoulders portrait drawn with shapes (the in-game soldier's face and headgear). */
export function CharacterPortrait({ c, size = 90 }: { c: CharacterDef; size?: number }) {
  const skin = hex(c.skin), gear = '#4f5b3a', dark = '#2a3020';
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden>
      <path d="M12 60 C12 44 20 40 30 40 C40 40 48 44 48 60Z" fill="#5d6b46" />
      <rect x="20" y="44" width="20" height="16" fill={dark} opacity="0.5" />
      {c.headgear === 'hood' && <circle cx="30" cy="27" r="16" fill="#8a9298" />}
      {c.headgear === 'shemagh' && <path d="M14 28 C14 12 46 12 46 28 L44 44 L16 44Z" fill="#c8b48a" />}
      <circle cx="30" cy="28" r={c.headgear === 'hood' || c.headgear === 'shemagh' ? 10 : 12} fill={skin} />
      <circle cx="34.5" cy="27" r="1.4" fill="#1a1a1a" /><circle cx="26" cy="27" r="1.4" fill="#1a1a1a" />
      {c.headgear === 'helmet' && <><path d="M16 25 C16 9 44 9 44 25Z" fill={gear} /><rect x="15" y="24" width="30" height="3" fill={dark} /></>}
      {c.headgear === 'boonie' && <><ellipse cx="30" cy="21" rx="20" ry="4" fill="#6a7a48" /><path d="M20 21 C20 10 40 10 40 21Z" fill="#6a7a48" /></>}
      {c.headgear === 'shemagh' && <rect x="19" y="33" width="22" height="8" rx="3" fill="#c8b48a" />}
      {c.headgear === 'hood' && <path d="M14 30 C14 44 46 44 46 30" stroke="#d8dcdc" strokeWidth="4" fill="none" />}
    </svg>
  );
}

export function CharacterPage({ onBack }: { onBack: () => void }) {
  const [, bump] = useState(0);
  return (
    <Panel title="Character" onBack={onBack}>
      <div style={{ fontSize: 20, color: '#9fb2c3', marginBottom: 14 }}>
        Who you are on the ground. Looks only: every character fights the same. (On the Moon everyone wears a pressure suit.)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {CHARACTERS.map(c => {
          const on = kit.character === c.id;
          return (
            <button key={c.id} data-nav data-autofocus={on ? '' : undefined}
              onClick={() => { setCharacter(c.id); bump(n => n + 1); }} style={{ ...card(on), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <CharacterPortrait c={c} />
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{c.name}</div>
              <div style={{ fontSize: 16, color: '#9fb2c3', textAlign: 'center', minHeight: 42 }}>{c.desc}</div>
              <div style={{ fontSize: 15, color: on ? ACCENT : '#7f97ad', letterSpacing: 2 }}>{on ? 'SELECTED' : 'TAP TO PICK'}</div>
            </button>
          );
        })}
      </div>
      <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

// ── Armor ───────────────────────────────────────────────────────────────────

export function ArmorIcon({ id, size = 60 }: { id: ArmorId; size?: number }) {
  if (id === 'none') return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M12 8 L28 8 L32 34 L8 34Z" fill="#5d6b46" opacity="0.7" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M12 8 L28 8 L32 34 L8 34Z" fill="#5d6b46" />
      <rect x="11" y="12" width="18" height="16" rx="2" fill="#2c3220" />
      <rect x="13" y="14" width="14" height="12" rx="1.5" fill="#4a5434" />
      {id === 'heavy' && <><rect x="10" y="7" width="20" height="4" fill="#2c3220" /><ellipse cx="9" cy="13" rx="4" ry="3" fill="#4a5434" /><ellipse cx="31" cy="13" rx="4" ry="3" fill="#4a5434" /><rect x="11" y="29" width="18" height="3" fill="#2c3220" /></>}
    </svg>
  );
}

export function ArmorPage({ onBack }: { onBack: () => void }) {
  const [, bump] = useState(0);
  const [msg, setMsg] = useState('');
  return (
    <Panel title="Armor" onBack={onBack}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 20, color: '#9fb2c3' }}>Buy once with credits, then switch any time.</span>
        <CreditsTag />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {ARMORS.map(a => {
          const on = kit.armor === a.id, owned = kit.ownedArmor.includes(a.id), price = KIT.armorPrice[a.id];
          return (
            <button key={a.id} data-nav data-autofocus={on ? '' : undefined}
              onClick={() => {
                const r = chooseArmor(a.id);
                setMsg(r === 'poor' ? `Not enough credits for the ${a.name.toLowerCase()} (${price}).` : '');
                bump(n => n + 1);
              }}
              style={{ ...card(on, !owned), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <ArmorIcon id={a.id} />
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{a.name}</div>
              <div style={{ fontSize: 17, color: '#9fb2c3', textAlign: 'center', minHeight: 44 }}>{a.desc}</div>
              <div style={{ fontFamily: MONO, fontSize: 16, color: on ? ACCENT : owned ? '#9fb2c3' : '#ffd76a', letterSpacing: 1 }}>
                {on ? 'EQUIPPED' : owned ? 'OWNED · TAP TO WEAR' : `◈ ${price} · TAP TO BUY`}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ minHeight: 28, fontSize: 19, color: '#ff8a7a', marginBottom: 8 }}>{msg}</div>
      <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
    </Panel>
  );
}

/** Short summaries used by the Inventory cards. */
export function kitSummary() {
  return {
    tools: kit.tools,
    character: characterDef(),
    armor: armorDef(),
  };
}
