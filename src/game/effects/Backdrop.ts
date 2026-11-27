// Backdrop — sky plus scrolling parallax scenery for a biome.
//   sky  (static):  gradient, stars, sun / moon / Earth
//   far  (0.05 / 0.12): two ridge layers (peaks, dunes or mesas) with optional caps
//   mid  (0.25 / 0.35 / 0.45): hills with pools and landmarks, a distant tree row, the main tree line
//   atmosphere: drifting clouds, haze between layers, twinkling stars, weather particles
// Visual only; layout comes from a deterministic hash so a given seed always looks the same.
import Phaser from 'phaser';
import type { Biome, RidgeLayer } from '../theme/biomes';
import { pts } from './points';

const W = 1280;
const H = 720;

/** Deterministic 0..1 hash for scenery placement (not gameplay). */
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Linear blend of two 0xRRGGBB colours (t = 0 → a, 1 → b). */
function mix(a: number, b: number, t: number): number {
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh;
  return ch(16) | ch(8) | ch(0);
}

export class Backdrop {
  constructor(
    private readonly skyGfx: Phaser.GameObjects.Graphics,
    private readonly farGfx: Phaser.GameObjects.Graphics,
    private readonly midGfx: Phaser.GameObjects.Graphics,
    private biome: Biome,
    /** Varies the layout (per level and launch) without changing the look. */
    private seed: number,
  ) {
    this.drawSky();
  }

  setBiome(biome: Biome, seed: number): void {
    this.biome = biome;
    this.seed = seed;
    this.drawSky();
  }

  private drawSky(): void {
    const g = this.skyGfx, b = this.biome, s = this.seed;
    g.clear();
    const top = Phaser.Display.Color.IntegerToColor(b.sky.top);
    const bot = Phaser.Display.Color.IntegerToColor(b.sky.bottom);
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, bands - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (H * i) / bands, W, H / bands + 1);
    }
    if (b.sky.horizonGlow !== null) {
      for (let i = 0; i < 6; i++) {
        g.fillStyle(b.sky.horizonGlow, 0.06);
        g.fillRect(0, 300 + i * 30, W, 420 - i * 30);
      }
    }
    if (b.sky.starAlpha > 0) {
      const count = b.body.kind === 'earth' ? 220 : 90;
      for (let i = 0; i < count; i++) {
        const x = hash01(i * 3.1 + s) * W, y = hash01(i * 7.7 + s) * H * 0.6;
        g.fillStyle(b.sky.stars, (0.2 + hash01(i * 1.3) * 0.7) * b.sky.starAlpha);
        g.fillCircle(x, y, hash01(i * 5.9) < 0.12 ? 1.7 : 0.9);
      }
    }
    const { kind, color, glow, x, y, r } = b.body;
    g.fillStyle(glow, 0.07); g.fillCircle(x, y, r * 2.4);
    g.fillStyle(glow, 0.14); g.fillCircle(x, y, r * 1.55);
    g.fillStyle(color, 0.97); g.fillCircle(x, y, r);
    if (kind === 'moon') {
      g.fillStyle(b.sky.top, 0.22); g.fillCircle(x + r * 0.3, y - r * 0.2, r * 0.23); g.fillCircle(x - r * 0.3, y + r * 0.33, r * 0.17);
    } else if (kind === 'earth') {
      // Continents, cloud streaks, night-side shadow.
      g.fillStyle(0x3f8f4a, 1);
      g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.8, r * 0.55);
      g.fillEllipse(x + r * 0.35, y + r * 0.3, r * 0.55, r * 0.7);
      g.fillStyle(0xffffff, 0.55);
      g.fillEllipse(x, y - r * 0.55, r * 1.2, r * 0.14);
      g.fillEllipse(x - r * 0.1, y + r * 0.05, r * 1.0, r * 0.1);
      g.fillStyle(0x000000, 0.45);
      g.beginPath();
      g.slice(x, y, r, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(120), false);
      g.closePath();
      g.fillPath();
    }
  }

  /** Layer-world offset of the tree line (parallax 0.45) — screen x + this = layer x. */
  forestOffset(cameraX: number): number { return cameraX * 0.45 + this.seed * 53; }

  /** Screen y of the tree-line floor at screen x (where background soldiers stand). */
  forestY(sx: number, cameraX: number): number {
    const wx = sx + this.forestOffset(cameraX);
    return 568 + Math.sin(wx * 0.006) * 14 + Math.cos(wx * 0.0027) * 10;
  }

  /** time = scene clock in ms (drives clouds, weather and blinking lights). */
  draw(cameraX: number, time = 0): void {
    const b = this.biome;
    const g = this.farGfx;
    g.clear();
    this.drawTwinkles(g, time);
    this.drawClouds(g, cameraX * 0.02 + time * 0.006, 0);
    this.drawRidge(g, cameraX * 0.05, 330, 150, 380, b.far, 1);
    this.haze(g, 180, 0.22);
    this.drawClouds(g, cameraX * 0.06 + time * 0.012, 1);
    this.drawRidge(g, cameraX * 0.12, 400, 120, 260, b.mid, 2);
    this.haze(g, 280, 0.12);

    const m = this.midGfx;
    m.clear();
    const s = this.seed;

    // Rolling hills.
    const hillOff = cameraX * 0.25 + s * 97;
    const hillY = (sx: number): number => {
      const wx = sx + hillOff;
      return 500 + Math.sin(wx * 0.0042) * 26 + Math.cos(wx * 0.0021) * 18;
    };
    m.fillStyle(b.hills, 1);
    m.beginPath(); m.moveTo(0, H);
    for (let sx = 0; sx <= W; sx += 20) m.lineTo(sx, hillY(sx));
    m.lineTo(W, H); m.closePath(); m.fillPath();

    // Landmarks on the hills: radio towers, shacks, rock arches, radar domes, dishes.
    const LGAP = 760;
    for (let n = Math.floor(hillOff / LGAP) - 1; n <= Math.floor((hillOff + W) / LGAP) + 1; n++) {
      if (hash01(n * 1.37 + s + 9) > 0.7) continue;
      const sx = n * LGAP + 340 + hash01(n * 2.9 + s) * 200 - hillOff;
      this.drawLandmark(m, sx, hillY(sx) + 6, n, time);
    }

    // Pools in the hills: lakes, frozen ponds, bogs, oases or craters.
    const GAP = 640;
    for (let n = Math.floor(hillOff / GAP) - 1; n <= Math.floor((hillOff + W) / GAP) + 1; n++) {
      if (hash01(n + s) > b.pools.chance) continue;
      const sx = n * GAP + hash01(n + 0.5 + s) * 300 - hillOff;
      const w  = 140 + hash01(n + 0.25 + s) * 180;
      const y  = hillY(sx) + 22;
      this.drawPool(m, sx, y, w);
    }

    // Distant tree row: smaller, hazier, slower.
    const rowOff = cameraX * 0.35 + s * 71;
    const rowY = (sx: number): number => 540 + Math.sin((sx + rowOff) * 0.005) * 10;
    const rgap = 26;
    for (let n = Math.floor(rowOff / rgap) - 2; n <= Math.floor((rowOff + W) / rgap) + 2; n++) {
      if (hash01(n * 0.53 + s + 3) < (b.forest.kind === 'cactus' ? 0.7 : 0.35)) continue;
      const sx = n * rgap + hash01(n * 2.1 + s) * rgap * 0.6 - rowOff;
      this.drawTree(m, sx, rowY(sx) + 4, n + 5000, 0.62, 0.7);
    }
    this.haze(m, 500, 0.1);

    // Tree line (fastest background layer).
    const forOff = this.forestOffset(cameraX);
    const forY = (sx: number): number => this.forestY(sx, cameraX);
    m.fillStyle(b.forest.floor, 1);
    m.beginPath(); m.moveTo(0, H);
    for (let sx = 0; sx <= W; sx += 20) m.lineTo(sx, forY(sx));
    m.lineTo(W, H); m.closePath(); m.fillPath();

    const kind = b.forest.kind;
    const gap = kind === 'cactus' ? 70 : kind === 'rocks' ? 40 : kind === 'swamp' ? 34 : 18;
    const skip = kind === 'cactus' ? 0.45 : 0.18;
    for (let n = Math.floor(forOff / gap) - 2; n <= Math.floor((forOff + W) / gap) + 2; n++) {
      if (hash01(n * 0.37 + s) < skip) continue; // clearings
      const sx = n * gap + hash01(n * 1.7 + s) * gap * 0.55 - forOff;
      this.drawTree(m, sx, forY(sx) + 4, n);
    }

    if (b.fog) {
      // Stacked thin layers so the mist fades in softly instead of a hard band.
      for (let i = 0; i < 8; i++) {
        m.fillStyle(b.fog.color, b.fog.alpha / 4);
        m.fillRect(0, 495 + i * 10, W, 110 - i * 10);
      }
    }
    this.drawWeather(m, cameraX, time);
  }

  private skyAt(y: number): number {
    return mix(this.biome.sky.top, this.biome.sky.bottom, Phaser.Math.Clamp(y / H, 0, 1));
  }

  /** Thin wash of the horizon colour over everything below y — fakes atmospheric depth. */
  private haze(g: Phaser.GameObjects.Graphics, y: number, alpha: number): void {
    g.fillStyle(this.biome.sky.bottom, alpha * 0.5); g.fillRect(0, y, W, H - y);
    g.fillStyle(this.biome.sky.bottom, alpha * 0.5); g.fillRect(0, y + 60, W, H - y - 60);
  }

  private drawTwinkles(g: Phaser.GameObjects.Graphics, time: number): void {
    const b = this.biome;
    if (b.sky.starAlpha <= 0) return;
    for (let i = 0; i < 28; i++) {
      const x = hash01(i * 9.3 + this.seed + 50) * W, y = hash01(i * 4.1 + this.seed + 50) * H * 0.45;
      const a = (0.5 + 0.5 * Math.sin(time * 0.002 * (0.6 + hash01(i))+ i * 2.1)) * b.sky.starAlpha;
      g.fillStyle(b.sky.stars, a); g.fillCircle(x, y, 1.6);
      g.fillStyle(b.sky.stars, a * 0.35);
      g.fillRect(x - 5, y - 0.5, 10, 1); g.fillRect(x - 0.5, y - 5, 1, 10);
    }
  }

  /** Puffy cloud banks; layer 0 = high and faint, layer 1 = lower, larger, in front of the far ridge. */
  private drawClouds(g: Phaser.GameObjects.Graphics, off: number, layer: number): void {
    const c = this.biome.atmos.clouds;
    if (c === null) return;
    const GAP = layer === 0 ? 300 : 460, s = this.seed + layer * 31;
    for (let n = Math.floor(off / GAP) - 1; n <= Math.floor((off + W) / GAP) + 1; n++) {
      if (hash01(n * 1.9 + s) < 0.3) continue;
      const cx = n * GAP + hash01(n * 3.7 + s) * GAP * 0.5 - off;
      const cy = (layer === 0 ? 50 : 170) + hash01(n * 5.3 + s) * (layer === 0 ? 110 : 90);
      const w = (layer === 0 ? 140 : 220) + hash01(n * 7.1 + s) * 160;
      // Opaque colours pre-mixed with the sky behind, so overlapping puffs don't show seams.
      const a = c.alpha * (layer === 0 ? 0.6 : 1);
      const sky = this.skyAt(cy);
      const body = mix(sky, c.color, a), shade = mix(sky, c.shade, a);
      g.fillStyle(shade, 1); g.fillEllipse(cx, cy + w * 0.05, w, w * 0.16);
      const puffs = 5;
      for (let k = 0; k < puffs; k++) {
        const t = k / (puffs - 1) - 0.5;
        const px = cx + t * w * 0.7, r = w * (0.1 + hash01(n * 11 + k + s) * 0.08) * (1 - Math.abs(t) * 0.6);
        g.fillStyle(body, 1); g.fillCircle(px, cy - r * 0.35, r);
      }
      g.fillStyle(body, 1); g.fillEllipse(cx, cy, w * 0.85, w * 0.12);
    }
  }

  private drawLandmark(m: Phaser.GameObjects.Graphics, x: number, base: number, n: number, time: number): void {
    const b = this.biome, sil = b.forest.dark, hi = b.forest.light, beacon = b.atmos.beacon;
    const blink = Math.sin(time * 0.004 + n) > 0.2;
    switch (b.atmos.landmark) {
      case 'tower': {
        // Lattice radio mast with guy wires and a blinking beacon.
        const h = 120 + hash01(n * 4.4) * 40;
        m.lineStyle(2, sil, 1);
        m.lineBetween(x - 9, base, x, base - h); m.lineBetween(x + 9, base, x, base - h);
        for (let y = 14; y < h - 10; y += 14) {
          const w = 9 * (1 - y / h);
          m.lineBetween(x - w, base - y, x + w * 0.8, base - y - 12);
        }
        m.lineStyle(1, sil, 0.6);
        m.lineBetween(x, base - h * 0.7, x - 60, base + 4); m.lineBetween(x, base - h * 0.7, x + 60, base + 4);
        m.fillStyle(sil, 1); m.fillRect(x - 16, base - 14, 18, 14); // equipment hut
        if (blink) { m.fillStyle(beacon, 0.35); m.fillCircle(x, base - h, 7); m.fillStyle(beacon, 1); m.fillCircle(x, base - h, 2.5); }
        break;
      }
      case 'shack': {
        // Stilt shack over the water with a lit window and a jetty.
        m.lineStyle(3, sil, 1);
        for (const dx of [-22, -6, 10, 24]) m.lineBetween(x + dx, base, x + dx, base - 26);
        m.lineBetween(x + 24, base - 18, x + 70, base - 16);
        m.fillStyle(sil, 1); m.fillRect(x - 28, base - 54, 58, 30);
        m.fillTriangle(x - 34, base - 52, x + 36, base - 52, x + 2, base - 74);
        m.fillStyle(beacon, 0.25); m.fillCircle(x - 8, base - 40, 12);
        m.fillStyle(beacon, 0.9); m.fillRect(x - 13, base - 45, 10, 9);
        // Dead tree beside it.
        m.lineStyle(3, sil, 1); m.lineBetween(x - 60, base, x - 64, base - 70);
        m.lineStyle(2, sil, 1); m.lineBetween(x - 63, base - 48, x - 84, base - 66); m.lineBetween(x - 64, base - 60, x - 48, base - 82);
        break;
      }
      case 'arch': {
        // Wind-carved rock arch: two tapering legs and a thick sagging span.
        const w = 130 + hash01(n * 2.2) * 50, h = 85 + hash01(n * 3.4) * 30, col = b.far.color;
        const leg = (x0: number, x1: number, lean: number): void => {
          m.fillStyle(col, 1);
          m.fillPoints(pts([{ x: x0, y: base + 4 }, { x: x1, y: base + 4 }, { x: x1 + lean, y: base - h }, { x: x0 + lean * 0.4, y: base - h }]), true);
        };
        leg(x - w / 2, x - w / 2 + w * 0.3, 6);
        leg(x + w / 2 - w * 0.28, x + w / 2, -4);
        m.fillStyle(col, 1); m.fillEllipse(x, base - h + 4, w * 1.08, h * 0.42);
        m.fillStyle(b.hills, 1); m.fillEllipse(x + 2, base - h * 0.28, w * 0.42, h * 1.05);
        m.fillStyle(0x000000, 0.18); m.fillEllipse(x + 4, base - h + 14, w * 0.9, h * 0.12);
        m.fillStyle(b.far.cap ?? b.mid.color, 0.25); m.fillEllipse(x - w * 0.1, base - h - 2, w * 0.7, h * 0.1);
        break;
      }
      case 'radar': {
        // Early-warning station: dome, mast, rotating dish.
        m.fillStyle(sil, 1); m.fillRect(x - 30, base - 22, 60, 22);
        m.fillStyle(hi, 1); m.beginPath(); m.arc(x, base - 22, 26, Math.PI, 0, false); m.closePath(); m.fillPath();
        m.fillStyle(0xffffff, 0.5); m.beginPath(); m.arc(x, base - 22, 26, Math.PI, Math.PI * 1.35, false); m.lineTo(x, base - 22); m.closePath(); m.fillPath();
        m.lineStyle(2, sil, 1); m.lineBetween(x + 46, base, x + 46, base - 70);
        const sw = Math.cos(time * 0.0015 + n) * 16;
        m.lineStyle(4, sil, 1); m.lineBetween(x + 46 - sw, base - 76, x + 46 + sw, base - 70);
        if (blink) { m.fillStyle(beacon, 1); m.fillCircle(x + 46, base - 80, 2.5); }
        break;
      }
      case 'dish': {
        // Lunar antenna dish on a tripod.
        m.lineStyle(2, sil, 1);
        m.lineBetween(x - 20, base, x, base - 40); m.lineBetween(x + 20, base, x, base - 40); m.lineBetween(x, base, x, base - 40);
        m.fillStyle(hi, 1);
        m.beginPath(); m.arc(x - 6, base - 58, 34, Math.PI * 0.85, Math.PI * 1.85, false); m.closePath(); m.fillPath();
        m.lineStyle(2, sil, 1); m.lineBetween(x - 6, base - 58, x + 14, base - 82);
        if (blink) { m.fillStyle(beacon, 0.4); m.fillCircle(x + 14, base - 82, 6); m.fillStyle(beacon, 1); m.fillCircle(x + 14, base - 82, 2); }
        break;
      }
    }
  }

  /** Screen-space weather. Deterministic in (time, camera) so nothing needs per-particle state. */
  private drawWeather(m: Phaser.GameObjects.Graphics, cameraX: number, time: number): void {
    const a = this.biome.atmos, c = a.weatherColor, t = time * 0.001;
    const wrap = (v: number, span: number): number => ((v % span) + span) % span;
    switch (a.weather) {
      case 'rain':
        m.lineStyle(1.2, c, 0.35);
        for (let i = 0; i < 70; i++) {
          const x = wrap(hash01(i * 1.3) * W - cameraX * 0.6 - t * 140, W + 40) - 20;
          const y = wrap(hash01(i * 2.7) * H + t * (700 + hash01(i) * 200), H);
          m.lineBetween(x, y, x - 5, y + 16);
        }
        break;
      case 'snow':
        for (let i = 0; i < 80; i++) {
          const r = 1 + hash01(i * 3.1) * 2;
          const x = wrap(hash01(i * 1.7) * W - cameraX * (0.3 + r * 0.15) + Math.sin(t * 1.3 + i) * 14, W);
          const y = wrap(hash01(i * 5.3) * H + t * (30 + r * 22), H);
          m.fillStyle(c, 0.5 + r * 0.15); m.fillCircle(x, y, r);
        }
        break;
      case 'dust':
        for (let i = 0; i < 45; i++) {
          const x = wrap(hash01(i * 2.3) * W - cameraX * 0.5 - t * (60 + hash01(i) * 80), W);
          const y = 380 + hash01(i * 4.9) * 300 + Math.sin(t * 2 + i) * 8;
          m.fillStyle(c, 0.25 + hash01(i * 7) * 0.3); m.fillCircle(x, y, 1 + hash01(i * 8.8) * 1.6);
        }
        // Occasional low dust gust streak.
        m.fillStyle(c, 0.06);
        m.fillEllipse(wrap(-t * 220 - cameraX * 0.4, W + 800) - 400, 600, 700, 50);
        break;
      case 'fireflies':
        for (let i = 0; i < 30; i++) {
          const x = wrap(hash01(i * 2.9) * W - cameraX * 0.45 + Math.sin(t * 0.7 + i * 1.3) * 30, W);
          const y = 500 + hash01(i * 6.1) * 120 + Math.cos(t * 0.9 + i) * 14;
          const glow = Math.max(0, Math.sin(t * (1.5 + hash01(i) * 2) + i * 4));
          if (glow < 0.05) continue;
          m.fillStyle(c, glow * 0.25); m.fillCircle(x, y, 5);
          m.fillStyle(c, glow); m.fillCircle(x, y, 1.6);
        }
        break;
      case 'meteors': {
        // A shooting star every few seconds, at a seeded spot per cycle.
        const period = 3.5, k = Math.floor(t / period), ph = (t % period) / 0.6;
        if (ph < 1) {
          const sx = 200 + hash01(k * 1.7 + this.seed) * 900, sy = 40 + hash01(k * 2.3 + this.seed) * 160;
          const x = sx + ph * 220, y = sy + ph * 90;
          m.lineStyle(2, c, 0.8 * (1 - ph)); m.lineBetween(x, y, x - 60, y - 25);
          m.fillStyle(c, 1 - ph); m.fillCircle(x, y, 2);
        }
        break;
      }
      case 'none':
        break;
    }
  }

  private drawPool(m: Phaser.GameObjects.Graphics, sx: number, y: number, w: number): void {
    const p = this.biome.pools;
    if (p.kind === 'crater') {
      m.fillStyle(this.biome.mid.color, 0.6); m.fillEllipse(sx, y - 3, w * 0.75, 22);
      m.fillStyle(p.color, 1);                m.fillEllipse(sx, y, w * 0.65, 16);
      m.lineStyle(2, p.shine, 0.6);           m.strokeEllipse(sx, y - 2, w * 0.72, 20);
      return;
    }
    const pw = p.kind === 'oasis' ? w * 0.6 : w;
    m.fillStyle(p.color, 1); m.fillEllipse(sx, y, pw, p.kind === 'bog' ? 24 : 20);
    m.fillStyle(p.shine, p.kind === 'ice' ? 0.8 : 0.5);
    m.fillRect(sx - pw * 0.25, y - 3, pw * 0.3, 1.5);
    m.fillRect(sx + pw * 0.05, y + 2, pw * 0.18, 1.5);
    if (p.kind === 'oasis') {
      // A couple of palms on the bank.
      for (const dx of [-pw * 0.45, pw * 0.42]) this.drawPalm(m, sx + dx, y);
    }
  }

  private drawPalm(m: Phaser.GameObjects.Graphics, x: number, base: number): void {
    const f = this.biome.forest;
    m.lineStyle(3, f.accent, 1); m.lineBetween(x, base, x + 4, base - 34);
    m.fillStyle(f.dark, 1);
    for (const a of [-2.6, -2.0, -1.2, -0.6]) {
      m.fillTriangle(x + 4, base - 34, x + 4 + Math.cos(a) * 20, base - 34 + Math.sin(a) * 8 + 8, x + 4 + Math.cos(a) * 12, base - 36);
    }
  }

  private drawTree(m: Phaser.GameObjects.Graphics, sx: number, base: number, n: number, k = 1, alpha = 1): void {
    const f = this.biome.forest, s = this.seed;
    const r = hash01(n * 2.3 + s);
    const col = hash01(n * 4.1 + s) < 0.5 ? f.dark : f.light;
    if (k !== 1 || alpha !== 1) {
      // Distant row: plain silhouettes scaled down.
      m.fillStyle(col, alpha);
      if (f.kind === 'cactus') { const h = (22 + r * 22) * k; m.fillRect(sx - 2.5 * k, base - h, 5 * k, h); return; }
      if (f.kind === 'rocks') { const w = (10 + r * 18) * k; m.fillEllipse(sx, base - w * 0.25, w, w * 0.6); return; }
      if (f.kind === 'swamp') { const h = (34 + r * 26) * k; m.fillRect(sx - 1.5, base - h, 3, h); m.fillEllipse(sx, base - h, 32 * k, 14 * k); return; }
      const h = (26 + r * 30) * k, w = h * 0.42;
      m.fillTriangle(sx - w, base, sx + w, base, sx, base - h);
      if (f.kind === 'snowpine') { m.fillStyle(f.accent, alpha * 0.8); m.fillTriangle(sx - w * 0.35, base - h * 0.7, sx + w * 0.35, base - h * 0.7, sx, base - h); }
      return;
    }
    switch (f.kind) {
      case 'pine':
      case 'snowpine': {
        const h = 26 + r * 30, w = h * 0.42;
        m.fillStyle(col, 1);
        m.fillTriangle(sx - w, base - h * 0.25, sx + w, base - h * 0.25, sx, base - h);
        m.fillTriangle(sx - w * 1.2, base, sx + w * 1.2, base, sx, base - h * 0.6);
        if (f.kind === 'snowpine') {
          m.fillStyle(f.accent, 0.9);
          m.fillTriangle(sx - w * 0.35, base - h * 0.78, sx + w * 0.35, base - h * 0.78, sx, base - h);
          m.fillTriangle(sx - w * 0.6, base - h * 0.4, sx + w * 0.6, base - h * 0.4, sx, base - h * 0.6);
        }
        break;
      }
      case 'swamp': {
        // Leaning trunk, wide lumpy canopy, hanging moss.
        const h = 34 + r * 26, lean = (hash01(n * 6.1) - 0.5) * 10;
        m.lineStyle(4, f.floor, 1); m.lineBetween(sx, base, sx + lean, base - h);
        m.fillStyle(col, 1);
        m.fillEllipse(sx + lean, base - h, 36 + r * 14, 18);
        m.fillEllipse(sx + lean - 12, base - h + 6, 22, 14);
        m.fillEllipse(sx + lean + 13, base - h + 5, 24, 13);
        m.lineStyle(1.5, f.accent, 0.7);
        for (let k = -2; k <= 2; k++) m.lineBetween(sx + lean + k * 7, base - h + 8, sx + lean + k * 7, base - h + 18 + hash01(n + k) * 10);
        break;
      }
      case 'cactus': {
        const h = 22 + r * 22;
        m.fillStyle(col, 1);
        m.fillRoundedRect(sx - 3.5, base - h, 7, h, 3.5);
        m.fillRoundedRect(sx - 12, base - h * 0.7, 5, h * 0.35, 2.5);
        m.fillRect(sx - 12, base - h * 0.4, 9, 4);
        m.fillRoundedRect(sx + 7, base - h * 0.85, 5, h * 0.4, 2.5);
        m.fillRect(sx + 3, base - h * 0.5, 9, 4);
        break;
      }
      case 'rocks': {
        const w = 10 + r * 18;
        m.fillStyle(col, 1); m.fillEllipse(sx, base - w * 0.25, w, w * 0.6);
        m.fillStyle(f.accent, 0.6); m.fillEllipse(sx + w * 0.15, base - w * 0.1, w * 0.6, w * 0.25);
        break;
      }
    }
  }

  /** One ridge layer: peaks (triangles), dunes (smooth waves) or mesas (flat tops). */
  private drawRidge(
    g: Phaser.GameObjects.Graphics, cam: number, baseY: number, amp: number, gap: number,
    layer: RidgeLayer, layerSeed: number,
  ): void {
    const seed = layerSeed + this.seed * 13;
    const off = cam + this.seed * 211;
    const ridgeY = (sx: number): number => {
      const wx = sx + off;
      if (layer.style === 'dunes') {
        return baseY + 40 - (Math.sin(wx * 0.004 + seed) * 0.5 + 0.5) * amp * 0.55
          - Math.sin(wx * 0.0093 + seed * 2) * amp * 0.15;
      }
      const n0 = Math.floor(wx / gap);
      let top = 0;
      for (let n = n0 - 1; n <= n0 + 1; n++) {
        const cx = (n + 0.2 + hash01(n * 3.3 + seed) * 0.6) * gap;
        const halfW = gap * (0.55 + hash01(n * 5.1 + seed) * 0.5);
        const h = 0.35 + hash01(n * 1.9 + seed) * 0.65;
        let v: number;
        if (layer.style === 'mesas') {
          // Separate flat-topped buttes with steep sides; some cells left empty.
          const d = Math.abs(wx - cx) / (halfW * 0.45);
          v = hash01(n * 7.7 + seed) < 0.4 ? 0 : h * Phaser.Math.Clamp((1 - d) * 4, 0, 1);
        } else {
          v = h * (1 - Math.abs(wx - cx) / halfW);
        }
        top = Math.max(top, v);
      }
      return baseY - top * amp + (layer.style === 'peaks' ? Math.sin(wx * 0.031 + seed) * 4 : 0);
    };
    g.fillStyle(layer.color, 1);
    g.beginPath(); g.moveTo(0, H);
    const start = -(((off % 12) + 12) % 12); // world-aligned columns so edges don't shimmer
    for (let sx = start; sx <= W + 12; sx += 12) g.lineTo(sx, ridgeY(sx));
    g.lineTo(W, H); g.closePath(); g.fillPath();
    // Shadowed faces: darken columns where the skyline falls away to the right (light from the left).
    g.fillStyle(0x000000, 0.2);
    if (layer.style === 'mesas') {
      for (let sx = start; sx < W; sx += 12) {
        const y0 = ridgeY(sx), y1 = ridgeY(sx + 12);
        if (y1 - y0 < 0.8) continue;
        g.fillPoints(pts([{ x: sx, y: y0 }, { x: sx + 12, y: y1 }, { x: sx + 12, y: H }, { x: sx, y: H }]), true);
      }
    } else if (layer.style === 'peaks') {
      // One shadow facet per peak: summit → right foot → a point under the summit.
      for (let n = Math.floor(off / gap) - 2; n <= Math.floor((off + W) / gap) + 2; n++) {
        const cx = (n + 0.2 + hash01(n * 3.3 + seed) * 0.6) * gap - off;
        const halfW = gap * (0.55 + hash01(n * 5.1 + seed) * 0.5);
        if (cx + halfW < -20 || cx - 20 > W) continue;
        // Follow the skyline down the right flank until it turns upward (next peak) so the
        // facet never spills into the sky.
        const edge: { x: number; y: number }[] = [{ x: cx, y: ridgeY(cx) }];
        let prev = edge[0].y;
        for (let x = cx + 8; x <= cx + halfW; x += 8) {
          const y = ridgeY(x);
          if (y < prev - 1) break;
          edge.push({ x, y }); prev = y;
        }
        if (edge.length < 3) continue;
        edge.push({ x: cx + halfW * 0.12, y: baseY + 60 });
        g.fillPoints(pts(edge), true);
      }
    }
    if (layer.cap === null) return;

    if (layer.style === 'mesas') {
      // Lighter rim along each flat top.
      g.fillStyle(layer.cap, 0.9);
      for (let sx = start; sx < W; sx += 12) {
        const y0 = ridgeY(sx), y1 = ridgeY(sx + 12);
        if (y0 > baseY - amp * 0.3 || Math.abs(y0 - y1) > 2) continue;
        g.fillRect(sx, y0, 12, 5);
      }
      return;
    }
    // Snow / highlight caps on summits that poke above the cap line.
    const capLine = baseY - amp * (layer.style === 'dunes' ? 0.25 : 0.55);
    g.fillStyle(layer.cap, 0.8);
    const ragged = (x: number): number => capLine + Math.sin((x + off) * 0.05 + seed) * 7 + Math.sin((x + off) * 0.17) * 3;
    for (let sx = start; sx < W; sx += 12) {
      const y0 = ridgeY(sx), y1 = ridgeY(sx + 12);
      if (y0 >= capLine && y1 >= capLine) continue;
      const b0 = Math.max(y0, Math.min(ragged(sx), y0 + 40)), b1 = Math.max(y1, Math.min(ragged(sx + 12), y1 + 40));
      g.fillPoints(pts([{ x: sx, y: y0 }, { x: sx + 12, y: y1 }, { x: sx + 12, y: b1 }, { x: sx, y: b0 }]), true);
    }
  }
}
