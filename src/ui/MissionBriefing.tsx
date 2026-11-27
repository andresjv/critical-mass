import { gameUi } from '../state/gameUi';
import { missionState } from '../state/MissionState';
import { levelInfo } from '../state/levels';

interface Props {
  show: boolean;
}

export function MissionBriefing({ show }: Props) {
  if (!show) return null;

  function handleStart() {
    gameUi.showBriefing = false;
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      pointerEvents: 'auto',
      zIndex: 100,
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(80,160,255,0.35)',
        borderRadius: 6,
        padding: '48px 56px',
        maxWidth: 680,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          letterSpacing: 4,
          color: '#556677',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          {levelInfo(missionState.level).name} OPERATION
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 36,
          fontWeight: 700,
          color: '#88ccff',
          letterSpacing: 3,
          marginBottom: 32,
        }}>
          MISSION BRIEFING
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 20,
          color: '#aaaaaa',
          lineHeight: 1.7,
          marginBottom: 28,
        }}>
          <div>Four missiles. Four launch sites.</div>
          <div>Fly through the hangar, run the attack gauntlet, destroy the central silo.</div>
          <div>Two cities lost — game over.</div>
        </div>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22,
          color: '#ffffff',
          marginBottom: 40,
          padding: '16px 24px',
          background: 'rgba(80,160,255,0.08)',
          borderRadius: 4,
          border: '1px solid rgba(80,160,255,0.2)',
        }}>
          GOAL: Stop all 4 launches before the cities fall.
        </div>

        <button
          onClick={handleStart}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 3,
            color: '#000000',
            background: '#88ccff',
            border: 'none',
            borderRadius: 4,
            padding: '14px 48px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          START MISSION
        </button>
      </div>
    </div>
  );
}
