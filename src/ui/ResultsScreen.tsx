import { useState, useCallback } from 'react';
import type { HudState } from './useHudState';
import { buildChallengeURL, setPlayerName } from '../state/challengeLink';
import { gameUi } from '../state/gameUi';
import { missionState } from '../state/MissionState';

interface Props {
  s: HudState;
}

function formatScore(n: number): string {
  return String(n).padStart(7, '0');
}

export function ResultsScreen({ s }: Props) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => s.playerName);

  const handleShare = useCallback(async () => {
    const url = buildChallengeURL({
      seed: missionState.seed,
      theme: missionState.theme,
      difficulty: missionState.difficulty,
      name,
      score: s.finalScore,
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Critical Mass Challenge', url });
        return;
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }, [name, s.finalScore]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, 20);
    setName(v);
    gameUi.playerName = v;
    setPlayerName(v);
  }, []);

  if (!s.showResults) return null;

  const youWin = s.challengerData
    ? s.finalScore >= s.challengerData.score
    : null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'rgba(10,20,35,0.97)',
        border: '1px solid rgba(80,160,255,0.35)',
        borderRadius: 8,
        padding: '48px 64px',
        minWidth: 540,
        textAlign: 'center',
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 42,
          color: '#88ccff',
          letterSpacing: 4,
          marginBottom: 32,
        }}>
          MISSION COMPLETE
        </div>

        {/* Score comparison */}
        {s.challengerData ? (
          <div style={{ marginBottom: 32 }}>
            <ScoreRow label="YOU" score={s.finalScore} highlight={youWin === true} />
            <ScoreRow label={s.challengerData.name.toUpperCase()} score={s.challengerData.score} highlight={youWin === false} />
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 28,
              color: youWin ? '#22ff88' : '#ff6644',
              marginTop: 16,
            }}>
              {youWin === true ? 'YOU WIN!' : youWin === false ? 'BEATEN!' : 'TIE!'}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <ScoreRow label="SCORE" score={s.finalScore} highlight />
          </div>
        )}

        {/* Name input */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            color: '#556677',
            marginBottom: 8,
          }}>
            YOUR NAME
          </div>
          <input
            value={name}
            onChange={handleNameChange}
            maxLength={20}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 24,
              color: '#ffffff',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(80,160,255,0.3)',
              borderRadius: 4,
              padding: '8px 16px',
              textAlign: 'center',
              outline: 'none',
              width: 240,
            }}
          />
        </div>

        {/* Challenge button */}
        <button
          onClick={handleShare}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 24,
            color: copied ? '#22ff88' : '#ffffff',
            background: copied ? 'rgba(34,255,136,0.15)' : 'rgba(80,160,255,0.2)',
            border: `1px solid ${copied ? 'rgba(34,255,136,0.5)' : 'rgba(80,160,255,0.4)'}`,
            borderRadius: 4,
            padding: '12px 32px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? 'LINK COPIED!' : '⟳ CHALLENGE A FRIEND'}
        </button>

        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          color: '#334455',
          marginTop: 24,
        }}>
          New mission starting shortly…
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, highlight }: {
  label: string; score: number; highlight: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12,
      padding: '8px 24px',
      background: highlight ? 'rgba(80,160,255,0.08)' : 'transparent',
      borderRadius: 4,
    }}>
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 22,
        color: highlight ? '#88ccff' : '#446677',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 32,
        color: highlight ? '#ffffff' : '#668899',
        letterSpacing: 2,
      }}>
        {formatScore(score)}
      </span>
    </div>
  );
}
