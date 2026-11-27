import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { getGameConfig } from './config';
import { resumeCtx, setPageHidden } from './audio/audioCtx';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Unlock/resume the shared AudioContext from real DOM gestures (autoplay policy).
    // Kept for every gesture, not just the first: iOS can re-suspend audio after
    // the app is backgrounded, and resumeCtx() is a no-op while running.
    const unlock = () => { if (!document.hidden) resumeCtx(); };
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('click',      unlock);
    document.addEventListener('keydown',    unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('visibilitychange', onVisibility);

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
      document.removeEventListener('visibilitychange', onVisibility);
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
