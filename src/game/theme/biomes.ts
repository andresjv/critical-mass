// Biomes — scenery look for each level: sky, background layers, front ground, buildings.
// Stage code never names colours; it reads the active biome from here (CLAUDE.md theme rule).
import type { LevelId } from '../../state/levels';

export type RidgeStyle = 'peaks' | 'dunes' | 'mesas';
export type TreeKind = 'pine' | 'snowpine' | 'swamp' | 'cactus' | 'rocks';
export type PoolKind = 'lake' | 'ice' | 'bog' | 'oasis' | 'crater';
export type SkyBodyKind = 'moon' | 'sun' | 'earth';
export type GroundDecor = 'grass' | 'reeds' | 'stones' | 'snow' | 'craters';

export interface RidgeLayer {
  style: RidgeStyle;
  color: number;
  /** Colour of the summit caps (snow / ice / highlights); null = no caps. */
  cap: number | null;
}

export interface Biome {
  sky: { top: number; bottom: number; stars: number; starAlpha: number; horizonGlow: number | null };
  body: { kind: SkyBodyKind; color: number; glow: number; x: number; y: number; r: number };
  far: RidgeLayer;
  mid: RidgeLayer;
  hills: number;
  pools: { kind: PoolKind; color: number; shine: number; chance: number };
  forest: { kind: TreeKind; floor: number; dark: number; light: number; accent: number };
  /** Low mist band over the forest (swamp); null = none. */
  fog: { color: number; alpha: number } | null;
  ground: { fill: number; band: number; surface: number; decor: GroundDecor; decorColor: number };
  building: { wall: number; edge: number; window: number; windowAlpha: number };
  pylon: { body: number; beacon: number };
}

const BIOMES: Record<LevelId, Biome> = {
  coldfront: {
    sky:  { top: 0x07111f, bottom: 0x16304a, stars: 0xc8d8ff, starAlpha: 0.85, horizonGlow: null },
    body: { kind: 'moon', color: 0xe8eef8, glow: 0xe8eef8, x: 1030, y: 110, r: 30 },
    far:  { style: 'peaks', color: 0x1f3550, cap: 0x9fb4cc },
    mid:  { style: 'peaks', color: 0x172a3e, cap: 0x9fb4cc },
    hills: 0x12291f,
    pools:  { kind: 'lake', color: 0x1f4466, shine: 0x6f9cc4, chance: 0.65 },
    forest: { kind: 'pine', floor: 0x0d2017, dark: 0x0a1a12, light: 0x163a26, accent: 0x2a1d12 },
    fog: null,
    ground:   { fill: 0x1a3020, band: 0x15281a, surface: 0x2a5030, decor: 'grass', decorColor: 0x2f5a34 },
    building: { wall: 0x334455, edge: 0x446688, window: 0x88aacc, windowAlpha: 0.5 },
    pylon:    { body: 0x445566, beacon: 0xffaa00 },
  },
  swamp: {
    sky:  { top: 0x0e1612, bottom: 0x2b3a2c, stars: 0xc9d6b0, starAlpha: 0.35, horizonGlow: 0x4a5a38 },
    body: { kind: 'moon', color: 0xd8e0a8, glow: 0xb8c890, x: 260, y: 130, r: 26 },
    far:  { style: 'dunes', color: 0x223024, cap: null },
    mid:  { style: 'dunes', color: 0x1b2a1d, cap: null },
    hills: 0x17241a,
    pools:  { kind: 'bog', color: 0x2a3a22, shine: 0x6b7f4a, chance: 0.9 },
    forest: { kind: 'swamp', floor: 0x121d13, dark: 0x0f1a10, light: 0x22361f, accent: 0x5a6b3a },
    fog: { color: 0x9aaa88, alpha: 0.14 },
    ground:   { fill: 0x24301a, band: 0x1c2614, surface: 0x3c4a26, decor: 'reeds', decorColor: 0x4f6030 },
    building: { wall: 0x3a3a2c, edge: 0x5a5a40, window: 0xc8c070, windowAlpha: 0.45 },
    pylon:    { body: 0x4a4a3a, beacon: 0xffcc33 },
  },
  desert: {
    sky:  { top: 0x5a8cc8, bottom: 0xf0c890, stars: 0xffffff, starAlpha: 0, horizonGlow: 0xffd8a0 },
    body: { kind: 'sun', color: 0xfff4c8, glow: 0xffe0a0, x: 980, y: 150, r: 42 },
    far:  { style: 'mesas', color: 0xc88a5a, cap: 0xe0a878 },
    mid:  { style: 'dunes', color: 0xd8a060, cap: null },
    hills: 0xe2b070,
    pools:  { kind: 'oasis', color: 0x3a8aa0, shine: 0xbfe8f0, chance: 0.25 },
    forest: { kind: 'cactus', floor: 0xd8a464, dark: 0x4a7a3a, light: 0x6a9a4a, accent: 0xb07840 },
    fog: null,
    ground:   { fill: 0xc8935a, band: 0xb27f4a, surface: 0xe0b078, decor: 'stones', decorColor: 0x8a6440 },
    building: { wall: 0xb8946a, edge: 0xd8b48a, window: 0x3a2a1a, windowAlpha: 0.7 },
    pylon:    { body: 0x8a7458, beacon: 0xff5522 },
  },
  snow: {
    sky:  { top: 0x7f9ab8, bottom: 0xdfe8f0, stars: 0xffffff, starAlpha: 0, horizonGlow: 0xf4f8fc },
    body: { kind: 'sun', color: 0xfafcff, glow: 0xe8f0f8, x: 300, y: 120, r: 32 },
    far:  { style: 'peaks', color: 0xa8bccf, cap: 0xf4f8fc },
    mid:  { style: 'peaks', color: 0x8ea6bd, cap: 0xeef4fa },
    hills: 0xd8e4ee,
    pools:  { kind: 'ice', color: 0xb8d8ec, shine: 0xffffff, chance: 0.6 },
    forest: { kind: 'snowpine', floor: 0xcfdce8, dark: 0x1f3a32, light: 0x2c4c40, accent: 0xf4f8fc },
    fog: { color: 0xffffff, alpha: 0.12 },
    ground:   { fill: 0xe6eef5, band: 0xcfdce8, surface: 0xffffff, decor: 'snow', decorColor: 0xb8c8d8 },
    building: { wall: 0x5a6a7a, edge: 0x8a9aaa, window: 0xffe8a0, windowAlpha: 0.6 },
    pylon:    { body: 0x5a6a7a, beacon: 0xff3322 },
  },
  moon: {
    sky:  { top: 0x010205, bottom: 0x0a0c14, stars: 0xffffff, starAlpha: 1, horizonGlow: null },
    body: { kind: 'earth', color: 0x3a78c8, glow: 0x6aa8ff, x: 1000, y: 140, r: 48 },
    far:  { style: 'dunes', color: 0x3a3c42, cap: 0x55585f },
    mid:  { style: 'peaks', color: 0x2c2e33, cap: 0x4a4d54 },
    hills: 0x4a4c52,
    pools:  { kind: 'crater', color: 0x34363b, shine: 0x6a6d74, chance: 0.85 },
    forest: { kind: 'rocks', floor: 0x55575d, dark: 0x3a3c41, light: 0x6a6c72, accent: 0x2a2b2f },
    fog: null,
    ground:   { fill: 0x6b6e75, band: 0x5a5c62, surface: 0x8a8d94, decor: 'craters', decorColor: 0x4e5056 },
    building: { wall: 0x8a8f99, edge: 0xc0c6d0, window: 0x66ddff, windowAlpha: 0.7 },
    pylon:    { body: 0x9aa0aa, beacon: 0x66ddff },
  },
};

export function getBiome(level: LevelId): Biome {
  return BIOMES[level] ?? BIOMES.coldfront;
}
