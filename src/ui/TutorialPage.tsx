// First-play tutorial slides, shown in the menu before the practice run.
// Content lives in state/tutorial.ts; this file only lays it out and draws the pictures.
import { useState, type ReactNode } from 'react';
import { TUTORIAL_SLIDES, withControls, type TutorialSlide } from '../state/tutorial';
import type { DeviceHint } from '../state/gameUi';
import { ACCENT, MONO, MenuButton, Panel, resetBtn } from './menuKit';

export function TutorialPage({ device, onDone, onSkip, onCancel, finishLabel }: {
  device: DeviceHint;
  /** Finished the last slide. */
  onDone: () => void;
  /** Pressed Skip on the first slide. */
  onSkip: () => void;
  /** Escape / back: leave without starting anything. */
  onCancel: () => void;
  finishLabel: string;
}) {
  const [i, setI] = useState(0);
  const slide = TUTORIAL_SLIDES[i];
  const last = i === TUTORIAL_SLIDES.length - 1;

  return (
    <Panel title="How to play" onBack={onCancel}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', minHeight: 330, marginBottom: 20 }}>
        <div style={{
          width: 460, height: 300, flexShrink: 0, borderRadius: 10, overflow: 'hidden',
          background: 'linear-gradient(180deg, #0f2236 0%, #1b3550 62%, #2a3a2a 62%, #22301f 100%)',
          border: '1px solid rgba(136,204,255,0.25)',
        }}>
          <Art kind={slide.art} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 20, color: ACCENT, letterSpacing: 2, marginBottom: 6 }}>
            STEP {i + 1} / {TUTORIAL_SLIDES.length}
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, color: '#fff', marginBottom: 14 }}>{slide.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slide.lines.map(l => (
              <div key={l} style={{ fontSize: 26, lineHeight: 1.35, color: '#cfdde9' }}>
                <Highlight text={withControls(l, device)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <MenuButton onClick={() => (i === 0 ? onSkip() : setI(i - 1))} style={{ width: 220 }}>{i === 0 ? 'Skip' : 'Back'}</MenuButton>
        <Dots n={TUTORIAL_SLIDES.length} at={i} onPick={setI} />
        <MenuButton primary autoFocus onClick={() => (last ? onDone() : setI(i + 1))} style={{ width: 440, whiteSpace: 'nowrap' }}>
          {last ? finishLabel : 'Next'}
        </MenuButton>
      </div>
    </Panel>
  );
}

/** Puts control names (filled in from the device) in the accent colour. */
function Highlight({ text }: { text: string }) {
  const keys = ['Arrow keys / WASD', 'Left stick', 'The joystick', 'Space', 'Shift', 'Esc', 'Start', 'FIRE', '◉'];
  const parts: ReactNode[] = [];
  let rest = text, k = 0;
  while (rest.length) {
    let best = -1, word = '';
    for (const w of keys) { const at = rest.indexOf(w); if (at >= 0 && (best < 0 || at < best)) { best = at; word = w; } }
    if (best < 0) { parts.push(rest); break; }
    parts.push(rest.slice(0, best));
    parts.push(<span key={k++} style={{ color: ACCENT, fontWeight: 700 }}>{word}</span>);
    rest = rest.slice(best + word.length);
  }
  return <>{parts}</>;
}

function Dots({ n, at, onPick }: { n: number; at: number; onPick: (i: number) => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 10 }}>
      {Array.from({ length: n }, (_, k) => (
        <button key={k} aria-label={`Step ${k + 1}`} onClick={() => onPick(k)} style={{
          ...resetBtn, width: k === at ? 34 : 14, height: 14, borderRadius: 7, border: 'none',
          background: k === at ? ACCENT : 'rgba(136,204,255,0.3)', transition: 'width 150ms',
        }} />
      ))}
    </div>
  );
}

// ── Pictures (viewBox 460 × 300; ground line at y = 186) ─────────────────────

const Jet = ({ x, y, s = 1, color = '#3a8fe0', flip = false }: { x: number; y: number; s?: number; color?: string; flip?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <polygon points="-16,-5 -30,-5 -37,-23 -30,-23" fill={color} />
    <polygon points="38,0.5 28,-2 16,-5 0,-6.5 -22,-6.5 -32,-5 -37,-3.5 -37,3.5 -30,5.5 -6,6.5 12,6 26,3" fill={color} />
    <polygon points="22,-4.5 16,-9.5 8,-10.5 2,-6.5" fill="#bfe6ff" />
    <polygon points="6,2.5 -9,2.5 -19,10.5 -13,10.5" fill="#1f3a5a" />
    <circle cx="-8" cy="-0.5" r="3.4" fill={flip ? '#d8322a' : '#fff'} />
  </g>
);

const Tank = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 186)`}>
    <rect x="-24" y="-12" width="48" height="12" rx="6" fill="#3a2e1e" />
    <rect x="-20" y="-20" width="40" height="10" rx="2" fill="#7a6a3c" />
    <rect x="-8" y="-28" width="18" height="9" rx="2" fill="#6a5a32" /><rect x="-30" y="-25" width="24" height="3" fill="#4a4024" />
    <rect x="12" y="-17" width="6" height="3" fill="#d23a2a" />
  </g>
);

const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
  return (
    <g stroke={ACCENT} strokeWidth="4" fill={ACCENT} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon stroke="none" points={`${x2},${y2} ${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)} ${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}`} />
    </g>
  );
};

function Art({ kind }: { kind: TutorialSlide['art'] }) {
  let body: ReactNode;
  switch (kind) {
    case 'mission':
      body = <>
        {[0, 1, 2, 3].map(k => {
          const x = 70 + k * 105;
          return <g key={k}>
            {k < 3 && <line x1={x + 22} y1={110} x2={x + 83} y2={110} stroke="rgba(136,204,255,0.5)" strokeWidth="3" strokeDasharray="6 6" />}
            <circle cx={x} cy={110} r="22" fill="#0b1724" stroke={ACCENT} strokeWidth="3" />
            <text x={x} y={119} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="24" fontWeight="700" fill="#fff">{k + 1}</text>
          </g>;
        })}
        {[150, 230, 310].map(x => <g key={x}><rect x={x - 14} y={186} width="28" height="60" fill="#3a4250" /><ellipse cx={x} cy={186} rx="14" ry="5" fill="#5a6474" /></g>)}
        <polygon points="230,140 222,176 238,176" fill="#cc4422" /><rect x="226" y="176" width="8" height="10" fill="#8a8f96" />
        <text x="230" y="276" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="20" fill="#cfdde9">4 strikes · stop the launch</text>
      </>;
      break;
    case 'fly':
      body = <>
        <Jet x={230} y={110} s={1.6} />
        <Arrow x1={230} y1={70} x2={230} y2={30} /><Arrow x1={230} y1={150} x2={230} y2={176} />
        <Arrow x1={160} y1={110} x2={110} y2={110} /><Arrow x1={300} y1={110} x2={350} y2={110} />
      </>;
      break;
    case 'weapons':
      body = <>
        <Jet x={120} y={90} s={1.2} />
        {[190, 230, 270].map(x => <rect key={x} x={x} y={89} width="22" height="3" rx="1.5" fill="#ffd060" />)}
        <Jet x={380} y={84} s={1} color="#8a4a3a" flip />
        <path d="M140 108 Q190 120 238 166" stroke="#ffd060" strokeWidth="2" strokeDasharray="5 5" fill="none" />
        <ellipse cx="238" cy="166" rx="7" ry="4" fill="#4a5444" transform="rotate(50 238 166)" />
        <Tank x={250} />
      </>;
      break;
    case 'danger':
      body = <>
        <rect x="250" y="70" width="70" height="116" fill="#334455" /><rect x="246" y="66" width="78" height="6" fill="#446688" />
        {[0, 1, 2].map(r => [0, 1].map(c => <rect key={`${r}${c}`} x={262 + c * 28} y={84 + r * 32} width="16" height="18" fill="#ffe6a0" opacity="0.8" />))}
        <line x1="380" y1="186" x2="380" y2="40" stroke="#556677" strokeWidth="8" /><circle cx="380" cy="38" r="5" fill="#ffaa00" />
        <Jet x={120} y={40} s={1.1} />
        <Arrow x1={170} y1={46} x2={230} y2={40} />
        <path d="M30 150 Q70 120 100 140" stroke="#cfd8e0" strokeWidth="5" strokeLinecap="round" opacity="0.5" fill="none" />
        <polygon points="118,132 98,128 100,140" fill="#cc4422" />
      </>;
      break;
    case 'ground':
      body = <>
        <rect x="0" y="210" width="460" height="90" fill="#4a5a3a" />
        <rect x="300" y="110" width="140" height="100" fill="#8a8d90" /><polygon points="292,114 370,84 448,114" fill="#a9adb0" />
        <rect x="336" y="140" width="60" height="70" fill="#0e1114" />
        <rect x="352" y="176" width="28" height="34" fill="#2c3238" /><ellipse cx="366" cy="172" rx="10" ry="4" fill="#e0302a" />
        <path d="M70 80 A46 46 0 0 1 162 80 Z" fill="#e8e2d0" />
        <line x1="74" y1="80" x2="110" y2="128" stroke="#2a2a2a" strokeWidth="2" /><line x1="158" y1="80" x2="122" y2="128" stroke="#2a2a2a" strokeWidth="2" />
        <rect x="108" y="126" width="16" height="24" rx="3" fill="#4a5634" /><circle cx="116" cy="120" r="7" fill="#3a4428" />
        <rect x="190" y="178" width="14" height="22" rx="3" fill="#4a5634" /><circle cx="197" cy="172" r="6" fill="#3a4428" />
        <rect x="200" y="184" width="22" height="4" fill="#1e2226" /><line x1="226" y1="186" x2="270" y2="186" stroke="#fff0a0" strokeWidth="3" />
        <Arrow x1={240} y1={150} x2={330} y2={160} />
        <text x="230" y="260" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="18" fill="#cfdde9">5 hits · reach the button</text>
      </>;
      break;
    case 'loadout':
      body = <>
        <circle cx="150" cy="120" r="62" fill="#a8781e" /><circle cx="150" cy="114" r="62" fill="#e8b83c" /><circle cx="150" cy="114" r="50" fill="#d8a12c" />
        <polygon points="150,80 159,104 184,104 164,119 172,144 150,129 128,144 136,119 116,104 141,104" fill="#fff3c4" />
        <Arrow x1={226} y1={114} x2={270} y2={114} />
        <Jet x={350} y={80} s={1} color="#55803e" />
        <rect x="314" y="124" width="60" height="7" rx="2" fill="#8ea3b6" /><rect x="314" y="136" width="60" height="7" rx="2" fill="#8ea3b6" />
        <ellipse cx="350" cy="168" rx="26" ry="8" fill="#55604a" />
      </>;
      break;
  }
  return <svg viewBox="0 0 460 300" width="100%" height="100%" aria-hidden="true">{body}</svg>;
}
