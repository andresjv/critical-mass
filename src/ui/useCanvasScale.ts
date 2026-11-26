import { useState, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/config';

export interface CanvasScale {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function computeScale(): CanvasScale {
  if (typeof window === 'undefined') return { scale: 1, offsetX: 0, offsetY: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / CANVAS_WIDTH, vh / CANVAS_HEIGHT);
  return {
    scale,
    offsetX: (vw - CANVAS_WIDTH * scale) / 2,
    offsetY: (vh - CANVAS_HEIGHT * scale) / 2,
  };
}

export function useCanvasScale(): CanvasScale {
  const [state, setState] = useState(computeScale);

  useEffect(() => {
    const update = () => setState(computeScale());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return state;
}
