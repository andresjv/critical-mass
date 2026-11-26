import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { getGameConfig } from './config';
import { resumeCtx } from './audio/audioCtx';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Unlock the shared AudioContext on the first real DOM gesture.
    // Must run directly in the event handler — not in rAF/update loops —
    // for browser autoplay policy to allow ctx.resume().
    const unlock = () => {
      resumeCtx();
      document.removeEventListener('click',      unlock);
      document.removeEventListener('keydown',    unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click',      unlock);
    document.addEventListener('keydown',    unlock);
    document.addEventListener('touchstart', unlock);

    const container = containerRef.current;
    if (!container || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      ...getGameConfig(),
      parent: container,
    });

    return () => {
      document.removeEventListener('click',      unlock);
      document.removeEventListener('keydown',    unlock);
      document.removeEventListener('touchstart', unlock);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
