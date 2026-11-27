// Biomes — scenery look for each level: sky, background layers, front ground, buildings.
// Stage code never names colours; it reads the active biome from here (CLAUDE.md theme rule).
import type { LevelId } from '../../state/levels';
import { RED, type JetPalette, type VehiclePalette } from './factions';

export type RidgeStyle = 'peaks' | 'dunes' | 'mesas';
export type TreeKind = 'pine' | 'snowpine' | 'swamp' | 'cactus' | 'rocks';
export type PoolKind = 'lake' | 'ice' | 'bog' | 'oasis' | 'crater';
export type SkyBodyKind = 'moon' | 'sun' | 'earth';
export type BuildingKind = 'block' | 'cabin' | 'adobe' | 'logcabin' | 'dome';
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
  building: { kind: BuildingKind; wall: number; edge: number; roof: number; window: number; windowAlpha: number };
  vehicle: VehiclePalette;
  enemyJet: JetPalette;
  /** SAM launcher box colours. */
  sam: { box: number; rail: number };
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
    building: { kind: 'block', wall: 0x334455, edge: 0x446688, roof: 0x2a3644, window: 0x88aacc, windowAlpha: 0.5 },
    vehicle:  { kind: 'tank', hull: 0x4a5a36, dark: 0x34401f, camo: [0x2f3a1e, 0x5f6e44], tread: 0x22281a, wheel: 0x3a4430, marking: RED },
    enemyJet: { body: 0x56606c, dark: 0x3a424c, camo: [], canopy: 0x9ad0e8, marking: RED, markingCore: 0xffffff },
    sam:      { box: 0x443322, rail: 0x556644 },
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
    building: { kind: 'cabin', wall: 0x5a4430, edge: 0x3a2c1e, roof: 0x5c6260, window: 0xffc860, windowAlpha: 0.85 },
    vehicle:  { kind: 'tank', hull: 0x56592e, dark: 0x3c3e1f, camo: [0x3a3020, 0x6e6a3a, 0x2c3a22], tread: 0x24261a, wheel: 0x3a3c26, marking: RED },
    enemyJet: { body: 0x4e5638, dark: 0x343a24, camo: [0x3a3020, 0x6a6e44], canopy: 0xb8d8a0, marking: RED, markingCore: 0xffffff },
    sam:      { box: 0x4a3a26, rail: 0x5a5a34 },
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
    building: { kind: 'adobe', wall: 0xc8996a, edge: 0xe0b888, roof: 0xa87a50, window: 0x3a2618, windowAlpha: 0.9 },
    vehicle:  { kind: 'tank', hull: 0xc8a870, dark: 0x9a7c4c, camo: [0xa0784a, 0xe2cc98, 0x7a5c38], tread: 0x5a4a34, wheel: 0x7a6448, marking: RED },
    enemyJet: { body: 0xc0a478, dark: 0x8e7650, camo: [0x9c7a4c, 0xdcc498], canopy: 0x6ab0d0, marking: RED, markingCore: 0xffffff },
    sam:      { box: 0xa8885a, rail: 0x8a7048 },
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
    building: { kind: 'logcabin', wall: 0x7a5236, edge: 0x5a3a24, roof: 0xf4f8fc, window: 0xffd070, windowAlpha: 0.9 },
    vehicle:  { kind: 'tank', hull: 0xdfe6ec, dark: 0xaab6c2, camo: [0x8c98a6, 0xbfc9d2, 0x6e7a88], tread: 0x4a525a, wheel: 0x6a747e, marking: RED },
    enemyJet: { body: 0xd2d9e0, dark: 0x9aa6b2, camo: [0x8c98a6, 0xb4bec8], canopy: 0x5a8ab0, marking: RED, markingCore: 0xffffff },
    sam:      { box: 0xc8d0d8, rail: 0x8a96a2 },
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
    building: { kind: 'dome', wall: 0xc8ccd4, edge: 0x8a8f99, roof: 0xe4e8ee, window: 0x66ddff, windowAlpha: 0.85 },
    vehicle:  { kind: 'rover', hull: 0xd4d8e0, dark: 0x8a909a, camo: [], tread: 0x3a3c42, wheel: 0x55585f, marking: RED },
    enemyJet: { body: 0x9aa0aa, dark: 0x5e646e, camo: [], canopy: 0xff6a5a, marking: RED, markingCore: 0x222222 },
    sam:      { box: 0xb8bcc4, rail: 0x6a6e76 },
    pylon:    { body: 0x9aa0aa, beacon: 0x66ddff },
  },
};

export function getBiome(level: LevelId): Biome {
  return BIOMES[level] ?? BIOMES.coldfront;
}
