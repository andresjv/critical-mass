import type { TouchLabels } from '../state/gameUi';
import {
  FIRE_CENTER, ACTION_CENTER, FIRE_VISUAL_RADIUS, ACTION_VISUAL_RADIUS, JOYSTICK_ZONE_X,
} from '../input/touchLayout';

const LABEL_FONT = "'Space Grotesk', system-ui, sans-serif";

function ButtonLabel({ x, y, r, text }: { x: number; y: number; r: number; text: string }) {
  return (
    <div style={{
      position: 'absolute',
      left: x - r, top: y - r, width: r * 2, height: r * 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 26, lineHeight: 1.05,
      letterSpacing: '0.06em', color: '#fff',
      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
      padding: 8, boxSizing: 'border-box',
    }}>
      {text}
    </div>
  );
}

/** Labels on the on-screen touch controls so players know what each one does. */
export function TouchControlLabels({ labels }: { labels: TouchLabels | null }) {
  if (!labels) return null;
  return (
    <>
      <div style={{
        position: 'absolute', left: 40, bottom: 28, width: JOYSTICK_ZONE_X - 80,
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 26, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.75)', textShadow: '0 2px 4px rgba(0,0,0,0.8)',
      }}>
        <span style={{
          width: 52, height: 52, borderRadius: '50%', flex: 'none',
          border: '3px dashed rgba(136,153,221,0.8)',
        }} />
        DRAG HERE TO {labels.move}
      </div>
      <ButtonLabel x={FIRE_CENTER.x} y={FIRE_CENTER.y} r={FIRE_VISUAL_RADIUS} text={labels.fire} />
      {labels.action && (
        <ButtonLabel x={ACTION_CENTER.x} y={ACTION_CENTER.y} r={ACTION_VISUAL_RADIUS} text={labels.action} />
      )}
    </>
  );
}
