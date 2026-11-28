// Achievement snow globes: a glass ball on a wooden base with a small 3D model of the
// level inside (CSS 3D: crossed picture planes on a turntable). The model turns and the
// snow falls only while the globe is hovered, focused or tapped; otherwise it holds still.
import type { CSSProperties, ReactNode } from 'react';
import type { LevelId } from '../state/levels';
import { LEVELS } from '../state/levels';
import { JET_SKINS } from '../game/theme/loadoutTheme';
import { PLAYER_JET, type JetPalette } from '../game/theme/factions';

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** Side view of a fighter in the given skin (SVG group, viewBox about -44 -26 92 40). */
export function JetShape({ pal }: { pal: JetPalette }) {
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

// ── 3D building blocks ──────────────────────────────────────────────────────

const abs: CSSProperties = { position: 'absolute', transformStyle: 'preserve-3d' };

/** Places children at (x, z) on the turntable floor, raised by y px. */
function At({ x, z, y = 0, rot = 0, children }: { x: number; z: number; y?: number; rot?: number; children: ReactNode }) {
  return <div style={{ ...abs, left: 0, top: 0, transform: `translate3d(${x}px, ${-y}px, ${z}px) rotateY(${rot}deg)` }}>{children}</div>;
}

/** An upright picture, bottom-centre at the origin. `turn` rotates it about the vertical axis. */
function Plane({ w, h, turn = 0, children, view }: { w: number; h: number; turn?: number; children: ReactNode; view: string }) {
  return (
    <svg viewBox={view} width={w} height={h} style={{ position: 'absolute', left: -w / 2, top: -h, transformOrigin: '50% 100%', transform: `rotateY(${turn}deg)`, overflow: 'visible' }}>
      {children}
    </svg>
  );
}

/** Two crossed upright pictures: reads as a solid object from any angle. */
function Cross({ w, h, view, children }: { w: number; h: number; view: string; children: ReactNode }) {
  return <><Plane w={w} h={h} view={view}>{children}</Plane><Plane w={w} h={h} view={view} turn={90}>{children}</Plane></>;
}

/** A flat picture lying on the floor (or at height via At), centred at the origin. */
function Flat({ w, d, view, children }: { w: number; d: number; view: string; children: ReactNode }) {
  return (
    <svg viewBox={view} width={w} height={d} style={{ position: 'absolute', left: -w / 2, top: -d / 2, transform: 'rotateX(90deg)', overflow: 'visible' }}>
      {children}
    </svg>
  );
}

const Tree = ({ dark, light, trunk = '#3a2a1a', snow }: { dark: string; light: string; trunk?: string; snow?: boolean }) => (
  <Cross w={26} h={44} view="0 0 26 44">
    <rect x="11.5" y="34" width="3" height="10" fill={trunk} />
    <polygon points="13,0 24,22 2,22" fill={light} /><polygon points="13,10 26,36 0,36" fill={dark} />
    {snow && <><polygon points="13,0 18,10 8,10" fill="#ffffff" /><polygon points="13,12 19,22 7,22" fill="#eef4fa" /></>}
  </Cross>
);

const Cypress = () => (
  <Cross w={30} h={50} view="0 0 30 50">
    <polygon points="12,50 18,50 16,14 14,14" fill="#2a2016" />
    <ellipse cx="15" cy="16" rx="12" ry="10" fill="#22341f" /><ellipse cx="11" cy="24" rx="8" ry="6" fill="#2d4426" />
    <path d="M6 22 q1 8 -1 14 M22 20 q1 7 0 13" stroke="#6d8a60" strokeWidth="1.2" fill="none" />
  </Cross>
);

const Cactus = () => (
  <Cross w={18} h={30} view="0 0 18 30">
    <rect x="7" y="2" width="4.5" height="28" rx="2.2" fill="#3f8a3a" />
    <rect x="1" y="9" width="3.5" height="10" rx="1.7" fill="#3f8a3a" /><rect x="1" y="17" width="7" height="3" fill="#3f8a3a" />
    <rect x="13.5" y="6" width="3.5" height="9" rx="1.7" fill="#3f8a3a" /><rect x="10" y="13" width="6" height="3" fill="#3f8a3a" />
  </Cross>
);

/** A 3D jet: side profile upright, wings lying flat across it, on a display stand. */
function Jet3D({ pal, lift = 30, scale = 1 }: { pal: JetPalette; lift?: number; scale?: number }) {
  const w = 78 * scale, h = 34 * scale;
  return (
    <>
      <Plane w={3} h={lift} view="0 0 3 30"><rect width="3" height="30" fill="#5a5a5a" /></Plane>
      <At x={0} z={0} y={lift - 6 * scale}>
        <Plane w={w} h={h} view="-44 -26 92 40"><JetShape pal={pal} /></Plane>
        <At x={0} z={0} y={6 * scale}>
          <Flat w={w * 0.7} d={w * 0.62} view="-30 -26 60 52">
            <polygon points="18,0 -6,-24 -14,-24 -8,0 -14,24 -6,24" fill={hex(pal.body)} />
            <polygon points="-22,0 -30,-10 -30,10" fill={hex(pal.dark)} />
            <circle cx="-8" cy="-14" r="2.6" fill={hex(pal.marking)} /><circle cx="-8" cy="14" r="2.6" fill={hex(pal.marking)} />
          </Flat>
        </At>
      </At>
    </>
  );
}

function Tank3D() {
  return (
    <>
      <Plane w={46} h={22} view="0 0 46 22">
        <rect x="2" y="12" width="42" height="10" rx="5" fill="#3a2e1e" />
        <rect x="4" y="7" width="36" height="8" rx="2" fill="#8e6a3c" />
        <rect x="14" y="1" width="16" height="7" rx="2" fill="#7a5a32" /><rect x="28" y="3" width="18" height="2.5" fill="#5a4224" />
        <rect x="8" y="9" width="5" height="2" fill="#d23a2a" />
      </Plane>
      <Plane w={26} h={22} view="0 0 26 22" turn={90}>
        <rect x="1" y="12" width="24" height="10" rx="3" fill="#3a2e1e" /><rect x="3" y="7" width="20" height="8" fill="#8e6a3c" /><rect x="7" y="1" width="12" height="7" rx="2" fill="#7a5a32" />
      </Plane>
    </>
  );
}

function House({ wall, roof, win, snow }: { wall: string; roof: string; win: string; snow?: boolean }) {
  const face = (wide: boolean) => (
    <>
      <rect x="2" y="16" width={wide ? 36 : 26} height="20" fill={wall} />
      <polygon points={wide ? '0,17 40,17 20,2' : '0,17 30,17 15,4'} fill={snow ? '#f4f8fc' : roof} />
      <rect x={wide ? 8 : 6} y="21" width="6" height="6" fill={win} /><rect x={wide ? 24 : 16} y="24" width="6" height="12" fill="#2a1a10" />
    </>
  );
  return (
    <>
      <Plane w={40} h={36} view="0 0 40 36">{face(true)}</Plane>
      <Plane w={30} h={36} view="0 0 30 36" turn={90}>{face(false)}</Plane>
    </>
  );
}

// ── Globe contents per level ────────────────────────────────────────────────

function Contents({ level }: { level: LevelId }) {
  switch (level) {
    case 'swamp': return <>
      <At x={-34} z={-18}><Cypress /></At><At x={36} z={10}><Cypress /></At><At x={-6} z={34}><Cypress /></At>
      <At x={22} z={-30}><House wall="#5a4430" roof="#5c6260" win="#ffc860" /></At>
      <At x={0} z={4}><Jet3D pal={JET_SKINS.viper ?? PLAYER_JET} /></At>
    </>;
    case 'desert': return <>
      <At x={-30} z={-24}><Cactus /></At><At x={34} z={18}><Cactus /></At><At x={-38} z={22}><Cactus /></At>
      <At x={26} z={-28}><Cross w={40} h={30} view="0 0 40 30"><polygon points="4,30 8,6 32,6 36,30" fill="#9a4f2c" /><rect x="2" y="4" width="36" height="5" fill="#b8613a" /></Cross></At>
      <At x={-2} z={8} rot={-20}><Tank3D /></At>
    </>;
    case 'coldfront': return <>
      <At x={-36} z={-14}><Tree dark="#0e2a1c" light="#17402a" /></At><At x={38} z={6}><Tree dark="#0e2a1c" light="#17402a" /></At>
      <At x={-14} z={-36}><Tree dark="#0e2a1c" light="#17402a" snow /></At><At x={12} z={36}><Tree dark="#0e2a1c" light="#17402a" /></At>
      <At x={24} z={-26}><Plane w={10} h={56} view="0 0 10 56"><line x1="5" y1="0" x2="1" y2="56" stroke="#5a6a7a" strokeWidth="1.5" /><line x1="5" y1="0" x2="9" y2="56" stroke="#5a6a7a" strokeWidth="1.5" /><circle cx="5" cy="2" r="2" fill="#ffaa00" /></Plane></At>
      <At x={0} z={4}><Jet3D pal={PLAYER_JET} /></At>
    </>;
    case 'snow': return <>
      <At x={-34} z={-16}><Tree dark="#1f3a32" light="#2c5044" snow /></At><At x={36} z={14}><Tree dark="#1f3a32" light="#2c5044" snow /></At>
      <At x={-20} z={32}><Tree dark="#1f3a32" light="#2c5044" snow /></At>
      <At x={22} z={-28}><House wall="#7a5236" roof="#f4f8fc" win="#ffd070" snow /></At>
      <At x={0} z={4}><Jet3D pal={JET_SKINS.arctic ?? PLAYER_JET} /></At>
    </>;
    case 'moon': return <>
      <At x={-30} z={-22}><Cross w={36} h={26} view="0 0 36 26"><path d="M2 26 A16 16 0 0 1 34 26 Z" fill="#e4e8ee" /><path d="M8 26 A10 10 0 0 1 28 26" fill="none" stroke="#8a8f99" strokeWidth="1" /><circle cx="18" cy="20" r="2.5" fill="#66ddff" /></Cross></At>
      <At x={30} z={20}><Cross w={14} h={46} view="0 0 14 46"><line x1="7" y1="8" x2="7" y2="46" stroke="#9aa0aa" strokeWidth="2" /><ellipse cx="7" cy="8" rx="7" ry="4" fill="#5a606a" /><circle cx="7" cy="2" r="1.8" fill="#66ddff" /></Cross></At>
      <At x={-36} z={24}><Cross w={14} h={8} view="0 0 14 8"><ellipse cx="7" cy="6" rx="7" ry="3" fill="#7a7e86" /></Cross></At>
      <At x={0} z={4}><Jet3D pal={JET_SKINS.nova ?? PLAYER_JET} /></At>
    </>;
  }
}

/** Floor colour accents per level (puddle, sand ripples, snow, craters). */
function Floor({ level, ground }: { level: LevelId; ground: string }) {
  const extra: Record<LevelId, ReactNode> = {
    swamp: <><ellipse cx="62" cy="70" rx="26" ry="14" fill="#1a2a26" /><ellipse cx="56" cy="66" rx="10" ry="3" fill="#6d8a70" opacity="0.5" /></>,
    desert: <><path d="M10 50 Q40 40 70 52 T120 48" stroke="#b0743c" strokeWidth="5" fill="none" /><path d="M14 84 Q50 74 90 86" stroke="#b0743c" strokeWidth="4" fill="none" /></>,
    coldfront: <><ellipse cx="80" cy="44" rx="22" ry="12" fill="#16304a" /><circle cx="40" cy="80" r="16" fill="#dfe8f2" opacity="0.5" /></>,
    snow: <><circle cx="40" cy="44" r="22" fill="#ffffff" /><circle cx="84" cy="84" r="18" fill="#ffffff" /></>,
    moon: <><circle cx="40" cy="44" r="14" fill="#4e5157" /><circle cx="86" cy="78" r="10" fill="#4e5157" /><circle cx="70" cy="30" r="6" fill="#4e5157" /></>,
  };
  return (
    <Flat w={128} d={128} view="0 0 128 128">
      <circle cx="64" cy="64" r="64" fill={ground} />
      {extra[level]}
      <circle cx="64" cy="64" r="63" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
    </Flat>
  );
}

/** Snowflake positions inside the ball: [left %, delay s, size px]. */
const FLAKES: [number, number, number][] = [
  [18, 0, 3], [30, -1.3, 2], [44, -2.6, 3], [58, -0.6, 2], [70, -3.1, 3], [82, -1.9, 2], [24, -4, 2],
  [38, -2.1, 3], [52, -3.6, 2], [64, -1.1, 3], [76, -4.4, 2], [34, -0.3, 2], [60, -2.9, 3], [48, -4.8, 2],
];

export function SnowGlobe({ level, n, earned, active }: { level: LevelId; n: number; earned: boolean; active: boolean }) {
  const [sky, ground] = LEVELS.find(l => l.id === level)!.preview;
  return (
    <div className={`cm-globe${active ? ' spin' : ''}${earned ? '' : ' locked'}`}>
      <div className="cm-ball" style={{ background: `radial-gradient(circle at 50% 30%, ${sky}cc, ${sky} 70%)` }}>
        <div className="cm-world">
          <div className="cm-turn">
            <Floor level={level} ground={ground} />
            <Contents level={level} />
          </div>
        </div>
        {FLAKES.map(([l, d, s], i) => (
          <span key={i} className="cm-flake" style={{ left: `${l}%`, width: s, height: s, animationDelay: `${d}s` }} />
        ))}
        <div className="cm-glass" />
      </div>
      <div className="cm-base"><span>LV {n}</span></div>
    </div>
  );
}

export const GLOBE_CSS = `
.cm-globe { position: relative; width: 190px; height: 214px; }
.cm-ball { position: absolute; left: 10px; top: 0; width: 170px; height: 170px; border-radius: 50%; overflow: hidden;
  perspective: 520px; perspective-origin: 50% 35%; box-shadow: 0 0 0 2px rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.45); }
.cm-world { position: absolute; left: 50%; top: 64%; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(-16deg) scale3d(1.25, 1.25, 1.25); }
.cm-turn { position: absolute; width: 0; height: 0; transform-style: preserve-3d; animation: cm-turn 11s linear infinite paused; }
.cm-globe.spin .cm-turn { animation-play-state: running; }
@keyframes cm-turn { from { transform: rotateY(-28deg); } to { transform: rotateY(332deg); } }
.cm-flake { position: absolute; top: -6%; border-radius: 50%; background: #fff; opacity: 0.85; pointer-events: none;
  animation: cm-snow 5s linear infinite paused; }
.cm-globe.spin .cm-flake { animation-play-state: running; }
@keyframes cm-snow { 0% { transform: translate(0, 0); } 50% { transform: translate(6px, 90px); } 100% { transform: translate(-2px, 182px); } }
.cm-glass { position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background:
    radial-gradient(ellipse 30% 20% at 32% 22%, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%),
    radial-gradient(circle at 70% 78%, rgba(255,255,255,0.12), rgba(255,255,255,0) 30%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 60%, rgba(180,220,255,0.18) 86%, rgba(255,255,255,0.4) 100%); }
.cm-base { position: absolute; left: 30px; top: 150px; width: 130px; height: 58px;
  clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #8a5a30 0%, #6b4423 45%, #4a2d16 100%);
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px; box-sizing: border-box; }
.cm-base span { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px;
  color: #3a2408; background: linear-gradient(180deg, #ffe08a, #c8941e); padding: 2px 10px; border-radius: 3px; }
.cm-globe.locked .cm-ball, .cm-globe.locked .cm-base { filter: grayscale(1) brightness(0.55); }
.cm-globe.locked .cm-glass { background-color: rgba(220,230,240,0.12); }
@media (prefers-reduced-motion: reduce) { .cm-turn { animation-duration: 30s; } }
`;
