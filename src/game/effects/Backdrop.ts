// Backdrop — sky plus scrolling parallax scenery for a biome.
//   sky  (static):  gradient, stars, sun / moon / Earth
//   far  (0.05 / 0.12): two ridge layers (peaks, dunes or mesas) with optional caps
//   mid  (0.25 / 0.45): hills with pools, then a tree line (pines, swamp trees, cacti, rocks)
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

  draw(cameraX: number): void {
    const b = this.biome;
    const g = this.farGfx;
    g.clear();
    this.drawRidge(g, cameraX * 0.05, 330, 150, 380, b.far, 1);
    this.drawRidge(g, cameraX * 0.12, 400, 120, 260, b.mid, 2);

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

    // Pools in the hills: lakes, frozen ponds, bogs, oases or craters.
    const GAP = 640;
    for (let n = Math.floor(hillOff / GAP) - 1; n <= Math.floor((hillOff + W) / GAP) + 1; n++) {
      if (hash01(n + s) > b.pools.chance) continue;
      const sx = n * GAP + hash01(n + 0.5 + s) * 300 - hillOff;
      const w  = 140 + hash01(n + 0.25 + s) * 180;
      const y  = hillY(sx) + 22;
      this.drawPool(m, sx, y, w);
    }

    // Tree line (fastest background layer).
    const forOff = cameraX * 0.45 + s * 53;
    const forY = (sx: number): number => {
      const wx = sx + forOff;
      return 568 + Math.sin(wx * 0.006) * 14 + Math.cos(wx * 0.0027) * 10;
    };
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

  private drawTree(m: Phaser.GameObjects.Graphics, sx: number, base: number, n: number): void {
    const f = this.biome.forest, s = this.seed;
    const r = hash01(n * 2.3 + s);
    const col = hash01(n * 4.1 + s) < 0.5 ? f.dark : f.light;
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
