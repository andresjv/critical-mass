// Touch control layout in canvas coordinates (1280 × 720). Plain TS so React can read it.
export const FIRE_CENTER   = { x: 1167, y: 633 } as const;
export const ACTION_CENTER = { x: 1060, y: 527 } as const;
export const FIRE_VISUAL_RADIUS   = 80;
export const ACTION_VISUAL_RADIUS = 67;
export const JOYSTICK_ZONE_X = 640; // joystick zone is the left half of the canvas
/** Weapon-wheel (bag) button, only in scenes that have one. */
export const INVENTORY_CENTER = { x: 1190, y: 405 } as const;
export const INVENTORY_VISUAL_RADIUS = 46;
