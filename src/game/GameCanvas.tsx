import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { getGameConfig } from './config';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      ...getGameConfig(),
      parent: container,
    });

    return () => {
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
