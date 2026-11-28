// Ground assault menu pages: the daily Store (4 offers rolled per player per day, rarer guns
// less likely) and the Guns loadout (which 4 guns you carry). Plain-TS armory state only.
import { useEffect, useState } from 'react';
import {
  armory, buy, gunDef, gunPrice, gunStats, GUNS, msUntilRefresh, rarityChance, setSlot, SLOT_COUNT, todaysOffers,
  type BuyResult, type GunId, type Rarity,
} from '../state/armory';

import { levelInfo } from '../state/levels';
import { RARITY_COLOR } from '../game/theme/groundAssault';
import { ACCENT, MONO, MenuButton, Panel, resetBtn } from './menuKit';

function Credits() {
  return (
    <span style={{ fontFamily: MONO, fontSize: 24, color: '#ffd76a' }}>
      ◈ {armory.credits} <span style={{ fontSize: 16, color: '#b8a060' }}>CREDITS</span>
    </span>
  );
}

function RarityTag({ r }: { r: Rarity }) {
  return <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: RARITY_COLOR[r] }}>{r.toUpperCase()}</span>;
}

function statLine(id: GunId): string {
  const s = gunStats(id);
  const rate = Math.round(1 / s.fireInterval);
  return `DMG ${s.damage * s.pellets} · ${rate}/s · MAG ${s.mag}${s.pierce ? ' · PIERCE' : ''}${s.splash ? ' · BLAST' : ''}`;
}

function countdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ── Daily store ─────────────────────────────────────────────────────────────

export function StorePage({ onBack }: { onBack: () => void }) {
  const [offers, setOffers] = useState<GunId[]>(() => todaysOffers());
  const [left, setLeft] = useState(() => msUntilRefresh());
  const [msg, setMsg] = useState<{ id: GunId; r: BuyResult } | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = msUntilRefresh();
      setLeft(ms);
      if (ms > left) setOffers(todaysOffers()); // passed midnight: new stock
    }, 1000);
    return () => clearInterval(t);
  }, [left]);

  const onBuy = (id: GunId) => { setMsg({ id, r: buy(id) }); bump(n => n + 1); };

  return (
    <Panel title="Daily store" onBack={onBack}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <span style={{ fontSize: 20, color: '#9fb2c3' }}>Your own stock, new every day. Restocks in <span style={{ fontFamily: MONO, color: '#dde8f2' }}>{countdown(left)}</span></span>
        <Credits />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {offers.map((id, i) => {
          const d = gunDef(id), col = RARITY_COLOR[d.rarity];
          const owned = armory.owned.includes(id), price = gunPrice(id), poor = armory.credits < price;
          return (
            <button key={id} data-nav data-autofocus={i === 0 ? '' : undefined} onClick={() => onBuy(id)} className="cm-card"
              style={{
                ...resetBtn, textAlign: 'left', borderRadius: 10, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6,
                background: `linear-gradient(180deg, ${col}22, rgba(8,14,22,0.94) 45%)`, border: `2px solid ${col}88`,
                opacity: owned ? 0.6 : 1,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <RarityTag r={d.rarity} />
                <span style={{ fontFamily: MONO, fontSize: 14, color: '#7f97ad' }}>{rarityChance(d.rarity)}% roll</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{d.name}</div>
              <div style={{ fontSize: 17, color: '#9fb2c3', minHeight: 44 }}>{d.desc}</div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: '#7f97ad' }}>{statLine(id)}</div>
              <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 22, color: owned ? '#5cf0a0' : poor ? '#ff7a6a' : '#ffd76a' }}>
                {owned ? 'OWNED' : `◈ ${price}`}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ minHeight: 30, fontSize: 20, color: msg?.r === 'ok' ? '#5cf0a0' : '#ffb06a', marginBottom: 12 }}>
        {msg && (msg.r === 'ok' ? `Bought ${gunDef(msg.id).name}. Find it under Guns.`
          : msg.r === 'owned' ? `You already own ${gunDef(msg.id).name}.`
          : msg.r === 'poor' ? `Not enough credits. Earn them in the ground assault.` : 'That gun is no longer on offer.')}
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
        <span style={{ fontSize: 17, color: '#6f879c' }}>
          Roll chances: {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => `${r} ${rarityChance(r)}%`).join(' · ')}
        </span>
      </div>
    </Panel>
  );
}

// ── Guns loadout ────────────────────────────────────────────────────────────

export function GunsPage({ onBack, onStore }: { onBack: () => void; onStore: () => void }) {
  const [active, setActive] = useState(0);
  const [, bump] = useState(0);
  const place = (id: GunId | null) => { setSlot(active, id); bump(n => n + 1); };

  return (
    <Panel title="Guns" onBack={onBack}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 20, color: '#9fb2c3' }}>Pick a slot, then a gun. In the ground assault hold H to switch.</span>
        <Credits />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SLOT_COUNT}, 1fr)`, gap: 12, marginBottom: 18 }}>
        {armory.slots.map((id, i) => {
          const on = i === active, d = id ? gunDef(id) : null, col = d ? RARITY_COLOR[d.rarity] : '#4a5c70';
          return (
            <button key={i} data-nav data-autofocus={i === 0 ? '' : undefined} onClick={() => setActive(i)} style={{
              ...resetBtn, textAlign: 'left', borderRadius: 10, padding: '10px 14px',
              background: on ? 'rgba(136,204,255,0.12)' : 'rgba(8,14,22,0.92)',
              border: `2px solid ${on ? ACCENT : `${col}66`}`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 14, color: '#7f97ad' }}>SLOT {i + 1}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: d ? '#fff' : '#6f879c' }}>{d ? d.name : 'Empty'}</div>
              {d && <RarityTag r={d.rarity} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {GUNS.map(g => {
          const owned = armory.owned.includes(g.id), here = armory.slots[active] === g.id;
          const col = RARITY_COLOR[g.rarity];
          const how = g.unlock ? `Beat ${levelInfo(g.unlock).name} or buy` : 'Daily store only';
          return (
            <button key={g.id} data-nav onClick={() => owned && place(here ? null : g.id)} style={{
              ...resetBtn, textAlign: 'left', borderRadius: 8, padding: '8px 12px',
              background: here ? `${col}22` : 'rgba(8,14,22,0.9)', border: `2px solid ${here ? col : owned ? `${col}55` : 'rgba(255,255,255,0.08)'}`,
              opacity: owned ? 1 : 0.5, cursor: owned ? 'pointer' : 'default',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{g.name}</span>
                <RarityTag r={g.rarity} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#7f97ad', marginTop: 2 }}>
                {owned ? (here ? 'IN THIS SLOT · CLICK TO REMOVE' : statLine(g.id)) : `🔒 ${how}`}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <MenuButton onClick={onBack} style={{ width: 240 }}>Back</MenuButton>
        <MenuButton onClick={onStore} style={{ width: 300 }}>Daily store</MenuButton>
      </div>
    </Panel>
  );
}
