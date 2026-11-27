// Cold Front palette for the Attack Run backdrop and effects.
// Seed of the T12 ThemePack: stage code reads colours from here, not literals.

export const ATTACK_RUN_PALETTE = {
  skyTop:        0x07111f,
  skyBottom:     0x16304a,
  stars:         0xc8d8ff,
  moon:          0xe8eef8,
  mountainFar:   0x1f3550,
  mountainMid:   0x172a3e,
  snow:          0x9fb4cc,
  hills:         0x12291f,
  lake:          0x1f4466,
  lakeShine:     0x6f9cc4,
  forestFloor:   0x0d2017,
  forestDark:    0x0a1a12,
  forestLight:   0x163a26,
  trunk:         0x2a1d12,
} as const;

export const FX_PALETTE = {
  flash:     0xffffff,
  fireCore:  0xfff2a8,
  fire:      0xffaa33,
  fireOuter: 0xff5511,
  smoke:     0x2b2b2b,
  smokeLite: 0x555555,
  debris:    [0x3a3a30, 0x55553f, 0x222218, 0x6b5a3a] as readonly number[],
  dirt:      [0x3b2a1a, 0x4a3522, 0x2a1d12] as readonly number[],
  wreck:     0x1c1c16,
  ember:     0xff6a1a,
  scorch:    0x0a0a08,
  planeHull: 0x3a4450,
  planeDark: 0x22282f,
  bombBody:  0x4a5444,
  bombNose:  0x2f362b,
  bombFin:   0x6b7660,
  bombBand:  0xd8c040,
  aimMarker: 0xff2a2a,
} as const;
