// GameOverScene — pixel-art game over: your jet crashed nose-first into the level's terrain,
// burning, with smoke drifting up. Everything is drawn on a coarse grid (PX canvas pixels per
// art pixel) so it reads as chunky pixel art, including a tiny bitmap font for the text.
// Returns to the menu on FIRE / tap, or automatically.
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { missionState } from '../../state/MissionState';
import { gameUi } from '../../state/gameUi';
import { GAME_OVER } from '../../state/tuning';
import { getBiome, type Biome } from '../theme/biomes';
import { PLAYER_JET } from '../theme/factions';
import { FX_PALETTE } from '../theme/coldFront';
import { hash01 } from '../effects/Backdrop';

const W = 1280;
const H = 720;
const PX = 8;                 // canvas pixels per art pixel
const GW = W / PX;            // 160 art pixels wide
const GH = H / PX;            // 90 tall
const GROUND = 64;            // art-pixel row of the ground line

// Crashed jet, nose buried to the lower right, tail fin up to the upper left.
// B body, D dark, C canopy, W roundel, K scorched, . empty
const JET = [
  '...D..........................',
  '...DD.........................',
  '...DBD........................',
  '...DBBD.......................',
  '....DBBD......................',
  'DDD..DBBBD....................',
  '.DBBDDBBBBBD..................',
  '..DBBBBBBWWBBD................',
  '...DDBBBBWWBBBBD..............',
  '.....DDBBBBBBBBBBD............',
  '.......DDBBBBBBCCBBD..........',
  '.........DDBBBKBBCCCBD........',
  '...........DDBKKBBBBBBD.......',
  '.............DDDKBBBBBBD......',
  '................DDDBBBBD......',
  '...................DDDD.......',
];
// Torn-off wing lying on the ground.
const WING = [
  '....DD',
  '..DBBD',
  'DDBBBD',
  'DDDDD.',
];

// 5×7 bitmap glyphs (rows top→bottom, 1 = lit).
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  0: ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

interface Puff { x: number; y: number; r: number; age: number; drift: number }

export class GameOverScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private biome!: Biome;
  private puffs: Puff[] = [];
  private puffT = 0;
  private t = 0;
  private prevFire = true;
  private leaving = false;

  constructor() { super({ key: 'GameOverScene' }); }

  create(): void {
    this.t = 0; this.puffs = []; this.puffT = 0; this.prevFire = true; this.leaving = false;
    gameUi.screen = 'gameover';
    gameUi.contextualHint = null;
    gameUi.stageResult = null;
    missionState.hudCue = '';
    if (this.scene.isActive('HudScene')) this.scene.stop('HudScene');
    this.biome = getBiome(missionState.level);
    // Static art is ~15k art pixels: bake it into a texture once instead of redrawing each frame.
    this.bg = this.add.graphics();
    this.drawStatic();
    const key = 'gameover-bg';
    if (this.textures.exists(key)) this.textures.remove(key);
    this.bg.generateTexture(key, W, H);
    this.bg.destroy();
    this.add.image(0, 0, key).setOrigin(0, 0);
    this.fx = this.add.graphics();
    this.input.on('pointerdown', () => this.leave());
    this.time.delayedCall(GAME_OVER.autoReturnSecs * 1000, () => this.leave());
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    const fire = InputRouter.read().fire;
    if (fire && !this.prevFire && this.t > GAME_OVER.minShowSecs) this.leave();
    this.prevFire = fire;

    // Smoke column from the wreck: puffs rise, grow and drift with the wind.
    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = 0.12;
      const n = Math.floor(this.t * 10);
      this.puffs.push({ x: 92 + hash01(n) * 6, y: GROUND - 8, r: 2 + hash01(n * 2.3) * 1.5, age: 0, drift: 2 + hash01(n * 3.1) * 3 });
    }
    for (const p of this.puffs) { p.age += dt; p.y -= dt * 6; p.x -= dt * p.drift; p.r += dt * 1.6; }
    this.puffs = this.puffs.filter(p => p.age < 7);
    this.drawAnimated();
  }

  private leave(): void {
    if (this.leaving || this.t < GAME_OVER.minShowSecs) return;
    this.leaving = true;
    missionState.endMission();
    gameUi.screen = 'menu';
    this.scene.start('MenuScene');
  }

  // ── Pixel helpers ────────────────────────────────────────────────────────

  private px(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, a = 1): void {
    g.fillStyle(c, a); g.fillRect(Math.round(x) * PX, Math.round(y) * PX, PX, PX);
  }

  private disc(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, c: number, a = 1): void {
    for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      if (x * x + y * y <= r * r) this.px(g, cx + x, cy + y, c, a);
    }
  }

  private sprite(g: Phaser.GameObjects.Graphics, rows: string[], ox: number, oy: number, map: Record<string, number>): void {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (map[ch] !== undefined) this.px(g, ox + x, oy + y, map[ch]); }));
  }

  private text(g: Phaser.GameObjects.Graphics, s: string, cx: number, y: number, scale: number, c: number, shadow: number): void {
    const w = s.length * 6 * scale - scale;
    const x0 = Math.round(cx - w / 2);
    for (const [col, dx, dy] of [[shadow, scale, scale], [c, 0, 0]] as const) {
      [...s].forEach((ch, i) => {
        const glyph = FONT[ch] ?? FONT[' '];
        glyph.forEach((row, gy) => [...row].forEach((bit, gx) => {
          if (bit !== '1') return;
          for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) this.px(g, x0 + i * 6 * scale + gx * scale + sx + dx, y + gy * scale + sy + dy, col);
        }));
      });
    }
  }

  // ── Scene ────────────────────────────────────────────────────────────────

  private drawStatic(): void {
    const g = this.bg, b = this.biome;
    // Sky: hard colour bands with a dithered seam between each, darkened for the mood.
    const top = Phaser.Display.Color.IntegerToColor(b.sky.top), bot = Phaser.Display.Color.IntegerToColor(b.sky.bottom);
    const bands = 7, bandH = Math.ceil(GROUND / bands);
    const bandCol = (i: number): number => {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, bands - 1, Math.min(i, bands - 1));
      return Phaser.Display.Color.GetColor(c.r * 0.8, c.g * 0.8, c.b * 0.8);
    };
    for (let y = 0; y < GROUND; y++) {
      const i = Math.floor(y / bandH), seam = y % bandH === bandH - 1;
      for (let x = 0; x < GW; x++) this.px(g, x, y, seam && (x + y) % 2 === 0 ? bandCol(i + 1) : bandCol(i));
    }
    if (b.sky.starAlpha > 0) {
      for (let i = 0; i < 60; i++) this.px(g, hash01(i * 3.3) * GW, hash01(i * 7.1) * 36, b.sky.stars, 0.4 + hash01(i) * 0.5);
    }
    // Sun / moon / Earth.
    // Fixed spot to the right of the title so the text stays readable on every level.
    const bx = 145, by = 12;
    this.disc(g, bx, by, 6, b.body.glow, 0.15);
    this.disc(g, bx, by, 4, b.body.color);
    if (b.body.kind === 'earth') { this.px(g, bx - 1, by - 1, 0x3f8f4a); this.px(g, bx, by - 1, 0x3f8f4a); this.px(g, bx + 1, by + 1, 0x3f8f4a); }
    // Far ridge and nearer hills: blocky silhouettes.
    for (let x = 0; x < GW; x++) {
      const far = 40 - Math.round(Math.abs(Math.sin(x * 0.07 + 1)) * 10 + hash01(Math.floor(x / 3)) * 3);
      for (let y = far; y < GROUND; y++) this.px(g, x, y, b.far.color);
      if (b.far.cap !== null && y0Cap(far)) this.px(g, x, far, b.far.cap);
      const mid = 52 - Math.round(Math.sin(x * 0.11 + 2) * 4 + hash01(Math.floor(x / 2) + 50) * 2);
      for (let y = mid; y < GROUND; y++) this.px(g, x, y, b.mid.color);
    }
    // Tree line (simple pixel trees / cacti / rocks in the level's colours).
    for (let i = 0; i < 26; i++) {
      const x = Math.round(hash01(i * 4.7 + 3) * GW), h = 3 + Math.round(hash01(i * 2.1) * 3);
      const col = i % 2 ? b.forest.dark : b.forest.light;
      if (b.forest.kind === 'cactus') { for (let y = 0; y < h; y++) this.px(g, x, GROUND - 1 - y, col); this.px(g, x - 1, GROUND - h + 1, col); this.px(g, x + 1, GROUND - h + 2, col); }
      else if (b.forest.kind === 'rocks') { this.px(g, x, GROUND - 1, col); this.px(g, x + 1, GROUND - 1, col); this.px(g, x, GROUND - 2, col); }
      else for (let y = 0; y < h; y++) for (let dx = -Math.floor((h - y) / 2); dx <= Math.floor((h - y) / 2); dx++) this.px(g, x + dx, GROUND - 1 - y, y === h - 1 && b.forest.kind === 'snowpine' ? b.forest.accent : col);
    }
    // Ground with surface row, darker band and scattered pebbles.
    for (let y = GROUND; y < GH; y++) for (let x = 0; x < GW; x++) {
      const c = y === GROUND ? b.ground.surface : y > GROUND + 10 && y < GROUND + 12 ? b.ground.band : b.ground.fill;
      this.px(g, x, y, c);
    }
    for (let i = 0; i < 70; i++) this.px(g, hash01(i * 5.1) * GW, GROUND + 2 + hash01(i * 1.9) * (GH - GROUND - 3), b.ground.decorColor, 0.7);

    // Crash: scorched crater, furrow ploughed by the jet, the wreck, the torn wing, debris.
    const k = FX_PALETTE;
    for (let x = 40; x < 100; x++) if (hash01(x) > 0.25) this.px(g, x, GROUND + (x > 70 ? 1 : 0), k.scorch);
    for (let x = 84; x < 112; x++) for (let y = GROUND - 1; y < GROUND + 3; y++) if (hash01(x * 9 + y) > 0.3) this.px(g, x, y, y === GROUND - 1 ? b.ground.surface : k.scorch);
    const jetMap = { B: PLAYER_JET.body, D: PLAYER_JET.dark, C: PLAYER_JET.canopy, W: PLAYER_JET.marking, K: k.wreck };
    this.sprite(g, JET, 76, GROUND - 14, jetMap);
    // Dirt mound piled over the buried nose.
    for (let x = 95; x < 106; x++) { const hgt = 3 - Math.abs(x - 100) / 2; for (let y = 0; y < hgt; y++) this.px(g, x, GROUND - 1 - y, hash01(x + y) > 0.5 ? b.ground.fill : b.ground.band); }
    this.sprite(g, WING, 52, GROUND - 3, jetMap);
    for (let i = 0; i < 14; i++) this.px(g, 46 + hash01(i * 3.9) * 70, GROUND - hash01(i * 2.2) * 2, i % 3 ? k.wreck : PLAYER_JET.dark);

    // Title and score.
    this.text(g, 'GAME OVER', GW / 2, 10, 2, 0xff4a3a, 0x3a0a08);
    this.text(g, `SCORE ${missionState.score}`, GW / 2, 30, 1, 0xffffff, 0x101010);

    function y0Cap(top: number): boolean { return top < 33; }
  }

  private drawAnimated(): void {
    const g = this.fx;
    g.clear();
    // Smoke.
    for (const p of this.puffs) {
      const a = Math.max(0, 0.7 - p.age / 10);
      this.disc(g, p.x, p.y, p.r, p.age < 0.6 ? FX_PALETTE.smokeLite : FX_PALETTE.smoke, a);
    }
    // Flickering fire on the wreck: pixels hop between three heat colours.
    const f = Math.floor(this.t * 12);
    const flames: [number, number][] = [[86, GROUND - 6], [88, GROUND - 7], [90, GROUND - 6], [87, GROUND - 5], [89, GROUND - 5], [91, GROUND - 5], [92, GROUND - 7], [85, GROUND - 5]];
    flames.forEach(([x, y], i) => {
      const h = hash01(f * 1.3 + i);
      if (h < 0.15) return;
      const c = h > 0.7 ? FX_PALETTE.fireCore : h > 0.4 ? FX_PALETTE.fire : FX_PALETTE.fireOuter;
      this.px(g, x, y - (h > 0.85 ? 1 : 0), c);
      if (h > 0.55) this.px(g, x, y - 1 - (h > 0.8 ? 1 : 0), FX_PALETTE.fireOuter, 0.9);
    });
    // Embers.
    for (let i = 0; i < 6; i++) {
      const life = (this.t * 0.7 + i / 6) % 1;
      this.px(g, 89 + Math.sin(i * 2 + this.t) * 3, GROUND - 8 - life * 14, FX_PALETTE.ember, 1 - life);
    }
    // "Tap to continue" prompt blinks once the minimum show time has passed.
    if (this.t > GAME_OVER.minShowSecs && Math.floor(this.t * 2) % 2 === 0) {
      this.text(g, 'TAP TO CONTINUE', GW / 2, 80, 1, 0xdfe6ee, 0x101010);
    }
  }
}
