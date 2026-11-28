// Colours for the ground assault that don't come from the level biome: the launch-control
// bunker, its button, bullets, the parachute and how each gun looks.
import type { GunId } from '../../state/armory';

export const GROUND_FX = {
  concrete: 0x8a8d90, concreteDark: 0x5e6266, concreteLight: 0xa9adb0,
  hazard: 0xf2c218, hazardDark: 0x1a1a1a,
  console: 0x2c3238, consoleLight: 0x4a5560, screen: 0x46e08a,
  button: 0xe0302a, buttonRim: 0xf2f2f2, buttonGlow: 0xff6a5a,
  doorDark: 0x0e1114, lamp: 0xffe08a,
  playerBullet: 0xfff0a0, enemyBullet: 0xff8a5a, laser: 0x66f0ff, rocket: 0x5a6048, rocketFlame: 0xff8a2a,
  muzzle: 0xfff2a8, blood: 0x7a1a14, chute: 0xe8e2d0, chuteStripe: 0x3a8fe0, chuteLine: 0xc8c4b4,
  shadow: 0x000000, nestBag: 0x8a7a56, nestBagDark: 0x6a5c3e, gunMetal: 0x1e2226,
  // Side items, sniper sight and the enemy "!" mark.
  grenade: 0x3e4a2c, grenadeBand: 0x9a9a7a, bottle: 0x6a8a4a, bottleRag: 0xe8d8b0,
  fireCore: 0xffe27a, fireMid: 0xff9a2a, fireOuter: 0xe0441a, ember: 0xffc040, scorch: 0x1a1410,
  medkit: 0xf2f2f2, medkitCross: 0xe0302a, healGlow: 0x5fd17a,
  foeGun: 0x0e0f11, foeGunAccent: 0x24262a, fuseLight: 0xff3a2a,
  alertMark: 0xffd23a, alertEdge: 0x1a1406,
} as const;

/** Rarity colours (store cards, weapon wheel, HUD). */
export const RARITY_COLOR: Record<string, string> = {
  common: '#a8b4c0', uncommon: '#5fd17a', rare: '#4aa8ff', epic: '#b468ff', legendary: '#ffb636',
};

/** Gun silhouettes: body colour, accent colour. */
export const GUN_LOOK: Record<GunId, { body: number; accent: number }> = {
  pistol:  { body: 0x2a2e33, accent: 0x55595e },
  smg:     { body: 0x2a2e33, accent: 0x6a6e44 },
  shotgun: { body: 0x3a2e22, accent: 0x6a4a2a },
  rifle:   { body: 0x30362a, accent: 0x5a6a3a },
  burst:   { body: 0x2a3036, accent: 0x5a7a9a },
  sniper:  { body: 0x3a3a2a, accent: 0x7a7a5a },
  lmg:     { body: 0x24282c, accent: 0x5a5a5a },
  rocket:  { body: 0x4a5236, accent: 0xb0a070 },
  laser:   { body: 0xd8dce2, accent: 0x66f0ff },
};
