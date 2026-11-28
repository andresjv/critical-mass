// Hangar decor (top-down): floor, walls with windows, the level's terrain outside the bay
// doors, parked military kit dressed for the location, and a crew of soldiers walking about
// and chatting. Purely visual — the plane only collides with the walls and doors in HangarScene.
import Phaser from 'phaser';
import type { Biome, TreeKind } from '../theme/biomes';
import type { HangarLocal } from '../theme/hangarLocal';
import { PLAYER_JET, type JetPalette } from '../theme/factions';
import { drawJetTopDown } from '../models/Vehicles';
import { Xform } from '../models/shapes';
import { hash01 } from '../effects/Backdrop';
import type { Rng } from '../../state/rng';

const W = 1280;
const H = 720;

/** Location-independent kit colours (paint, steel, rubber, ordnance). */
const COMMON = {
  steel: 0x7c8690, steelDark: 0x4e565e, rubber: 0x1a1c1e,
  missile: 0xdde4ea, missileTip: 0xd8322a,
  hazard: 0xf2c218, hazardDark: 0x1a1a1a, paint: 0xf2c218, paintRed: 0xc8322a,
};
type Kit = HangarLocal['kit'];

export interface Layout {
  wallMargin: number;
  doorH: number;
}

/** Draws everything that never moves. Call once into a low-depth Graphics. */
export function drawHangarStatic(g: Phaser.GameObjects.Graphics, b: Biome, L: Layout, seed: number): void {
  const hp = b.hangar, M = L.wallMargin, D = L.doorH, loc = hp.local, kit = loc.kit;

  // Outside, seen through the doors: the level's terrain with a taxiway leading out.
  g.fillStyle(hp.outside, 1); g.fillRect(0, 0, W, D);
  g.fillStyle(0x2a2c2e, 1); g.fillRect(W / 2 - 90, 0, 180, D);
  g.fillStyle(0xf2f2f2, 0.85);
  for (let y = 4; y < D; y += 16) g.fillRect(W / 2 - 3, y, 6, 8);
  for (let i = 0; i < 70; i++) {
    const x = hash01(seed + i * 1.7) * W;
    if (Math.abs(x - W / 2) < 100) continue;
    drawOutsideDecor(g, b.forest.kind, x, 6 + hash01(seed + i * 3.1) * (D - 12), hp.outsideDetail, b.forest.light, hash01(i * 7.3));
  }

  // Floor: concrete slabs (metal deck plates on the Moon), stains, tyre marks.
  g.fillStyle(hp.floor, 1); g.fillRect(M, D, W - 2 * M, H - D - M);
  if (loc.style === 'lunar') {
    g.lineStyle(2, hp.floorLine, 1);
    for (let x = M + 80; x < W - M; x += 80) g.lineBetween(x, D, x, H - M);
    for (let y = D + 80; y < H - M; y += 80) g.lineBetween(M, y, W - M, y);
    g.fillStyle(hp.floorLine, 1);
    for (let x = M + 80; x < W - M; x += 80) for (let y = D + 80; y < H - M; y += 80) {
      for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) g.fillCircle(x + dx, y + dy, 1.5);
    }
  } else {
    g.lineStyle(2, hp.floorLine, 1);
    for (let x = M + 120; x < W - M; x += 120) g.lineBetween(x, D, x, H - M);
    for (let y = D + 110; y < H - M; y += 110) g.lineBetween(M, y, W - M, y);
  }
  for (let i = 0; i < 14; i++) {
    const x = M + 40 + hash01(seed + i * 9.1) * (W - 2 * M - 80), y = D + 60 + hash01(seed + i * 4.7) * (H - D - M - 100);
    g.fillStyle(0x000000, 0.12 + hash01(i) * 0.1); g.fillEllipse(x, y, 30 + hash01(i * 2) * 50, 14 + hash01(i * 3) * 20);
  }
  g.lineStyle(10, 0x000000, 0.08);
  g.lineBetween(W / 2 - 28, H - M, W / 2 - 28, D); g.lineBetween(W / 2 + 28, H - M, W / 2 + 28, D);

  // Sand / snow / mud blown in through the doors.
  if (hp.drift !== null) {
    for (let i = 0; i < 26; i++) {
      const x = hash01(seed + i * 5.5) * W, w = 60 + hash01(i * 1.9) * 160;
      g.fillStyle(hp.drift, 0.35 + hash01(i * 2.7) * 0.3);
      g.fillEllipse(x, D + 4 + hash01(i * 8.1) * 26, w, 10 + hash01(i * 3.3) * 14);
    }
  }

  floorDetails(g, loc, M, D, seed);

  // Painted markings: hazard band under the doors, centre taxi line, start pad, parking boxes.
  for (let x = M; x < W - M; x += 24) {
    g.fillStyle(COMMON.hazard, 0.9); g.fillPoints(pts4(x, D + 6, 12), true);
    g.fillStyle(COMMON.hazardDark, 0.9); g.fillPoints(pts4(x + 12, D + 6, 12), true);
  }
  g.fillStyle(COMMON.paint, 0.8);
  for (let y = D + 40; y < H - 180; y += 36) g.fillRect(W / 2 - 3, y, 6, 20);
  g.lineStyle(4, COMMON.paint, 0.8); g.strokeCircle(W / 2, H - 107, 62);
  g.lineStyle(2, COMMON.paint, 0.4); g.strokeCircle(W / 2, H - 107, 92);
  g.lineStyle(3, COMMON.paintRed, 0.7); g.strokeRect(120, 200, 230, 220);
  g.lineStyle(3, COMMON.paint, 0.6); g.strokeRect(910, 150, 250, 190);

  // Walls with structural ribs and windows looking outside.
  g.fillStyle(hp.wall, 1);
  g.fillRect(0, D, M, H - D); g.fillRect(W - M, D, M, H - D); g.fillRect(0, H - M, W, M);
  g.fillStyle(hp.wallRib, 1);
  for (let y = D + 30; y < H - M; y += 70) { g.fillRect(0, y, M, 8); g.fillRect(W - M, y, M, 8); }
  for (let x = 60; x < W; x += 90) g.fillRect(x, H - M, 8, M);
  for (let y = D + 70; y < H - M - 60; y += 140) {
    for (const wx of [6, W - M + 6]) {
      g.fillStyle(hp.outside, 1); g.fillRect(wx, y, M - 12, 52);
      g.fillStyle(hp.outsideDetail, 0.9); g.fillCircle(wx + (M - 12) / 2, y + 18 + hash01(y) * 16, 6);
      if (loc.style === 'arctic') { g.fillStyle(0xffffff, 0.55); g.fillRect(wx, y + 40, M - 12, 12); g.fillRect(wx, y, 6, 52); }
      if (loc.style === 'swamp') { g.fillStyle(kit.accent2, 0.6); g.fillRect(wx, y + 44, M - 12, 8); }
      g.fillStyle(0xffffff, 0.18); g.fillRect(wx, y, 4, 52);
      g.lineStyle(2, hp.wallRib, 1); g.strokeRect(wx, y, M - 12, 52);
    }
  }
  wallDetails(g, loc, M, D);

  // ── Military kit ────────────────────────────────────────────────────────
  drawJetTopDown(g, 235, 310, SPARE_JET, { rot: -Math.PI / 2, scale: 1.25 });
  wheelChocks(g, 235, 310);
  missileCart(g, 395, 470);
  crate(g, kit, 70, 545, 46); crate(g, kit, 120, 545, 46); crate(g, kit, 70, 595, 46); crate(g, kit, 95, 640, 40);
  crate(g, kit, 1185, 600, 46); crate(g, kit, 1135, 640, 40); crate(g, kit, 1190, 650, 40);
  for (const [x, y, red] of [[370, 640, 0], [395, 655, 1], [345, 662, 0], [1200, 120, 0], [1180, 100, 1], [1215, 95, 0]] as const) drum(g, kit, x, y, red === 1);
  if (loc.style === 'lunar') rover(g, kit, 1035, 245); else fuelTruck(g, kit, 1035, 245);
  forklift(g, kit, 930, 540);
  table(g, kit, 1120, 430);
  for (let i = 0; i < 6; i++) sandbag(g, kit, 60 + i * 26, 92 + (i % 2) * 2);
  for (let i = 0; i < 5; i++) sandbag(g, kit, 73 + i * 26, 80);
  toolChest(g, 1100, 100); toolChest(g, 1050, 100);

  localProps(g, loc, M, D, seed);

  // Overhead lamp pools.
  for (let y = D + 140; y < H - M; y += 220) {
    for (const x of [230, 640, 1050]) {
      g.fillStyle(hp.lamp, 0.05); g.fillCircle(x, y, 150);
      g.fillStyle(hp.lamp, 0.05); g.fillCircle(x, y, 90);
    }
  }
  overhead(g, loc);
}

const SPARE_JET: JetPalette = { ...PLAYER_JET, body: 0x5a7a9a, dark: 0x3a5470 };

function pts4(x: number, y: number, s: number): Phaser.Math.Vector2[] {
  return [{ x, y: y + s }, { x: x + s, y }, { x: x + s * 2, y }, { x: x + s, y: y + s }] as unknown as Phaser.Math.Vector2[];
}

// ── Location details ────────────────────────────────────────────────────────

/** Things on the floor: puddles, mud, ice, sand, boot tracks, dust prints. */
function floorDetails(g: Phaser.GameObjects.Graphics, loc: HangarLocal, M: number, D: number, seed: number): void {
  const k = loc.kit;
  const rx = (i: number) => M + 30 + hash01(seed + i * 3.7) * (W - 2 * M - 60);
  const ry = (i: number) => D + 50 + hash01(seed + i * 6.1) * (H - D - M - 90);
  const tracks = (color: number, alpha: number) => {
    for (let t = 0; t < 3; t++) {
      const x0 = 520 + t * 90, y0 = D + 30;
      for (let s = 0; s < 14; s++) {
        g.fillStyle(color, alpha * (1 - s / 16));
        g.fillEllipse(x0 + (s % 2 ? 6 : -6) + Math.sin(s * 0.7 + t) * 20, y0 + s * 26, 6, 9);
      }
    }
  };
  switch (loc.style) {
    case 'base':
      // Rain puddles blown in by the doors, with a little sheen.
      for (let i = 0; i < 7; i++) {
        const x = 120 + i * 160 + hash01(i * 4.1) * 60, y = D + 40 + hash01(i * 2.9) * 50;
        g.fillStyle(k.accent2, 0.55); g.fillEllipse(x, y, 70 + hash01(i) * 50, 20);
        g.fillStyle(k.accent, 0.25); g.fillEllipse(x - 10, y - 3, 30, 5);
      }
      tracks(0x0e1418, 0.25);
      break;
    case 'swamp':
      // Murky puddles, mud smears and moss creeping in along the walls.
      for (let i = 0; i < 9; i++) {
        g.fillStyle(k.accent, 0.6); g.fillEllipse(rx(i), ry(i), 50 + hash01(i) * 70, 18 + hash01(i * 2) * 14);
        g.fillStyle(0x6d8a70, 0.2); g.fillEllipse(rx(i) - 8, ry(i) - 3, 18, 4);
      }
      tracks(0x2a2214, 0.45);
      for (let y = D + 20; y < H - M; y += 22) {
        g.fillStyle(k.accent2, 0.5); g.fillEllipse(M + 6, y + hash01(y) * 12, 18 + hash01(y * 2) * 16, 12);
        g.fillStyle(k.accent2, 0.5); g.fillEllipse(W - M - 6, y + hash01(y * 3) * 12, 18 + hash01(y * 5) * 16, 12);
      }
      break;
    case 'desert':
      // Sand piled in the corners and ripples of grit across the floor.
      for (const [cx, cy] of [[M + 20, H - M - 20], [W - M - 20, H - M - 20], [M + 30, D + 40], [W - M - 30, D + 40]]) {
        g.fillStyle(0xd2a868, 0.5); g.fillEllipse(cx, cy, 160, 70);
        g.fillStyle(0xe0b878, 0.4); g.fillEllipse(cx, cy, 90, 36);
      }
      g.lineStyle(2, 0xd2a868, 0.35);
      for (let i = 0; i < 18; i++) { const x = rx(i), y = ry(i); g.lineBetween(x - 30, y, x + 30, y - 4); }
      tracks(0x8a6a40, 0.35);
      break;
    case 'arctic':
      // Ice patches with a glint, slush tracks from the doors.
      for (let i = 0; i < 8; i++) {
        g.fillStyle(k.accent, 0.35); g.fillEllipse(rx(i), ry(i), 60 + hash01(i) * 60, 24 + hash01(i * 2) * 16);
        g.fillStyle(0xffffff, 0.45); g.fillEllipse(rx(i) - 12, ry(i) - 4, 20, 3);
      }
      tracks(0xeef4fa, 0.5);
      break;
    case 'lunar':
      // Grey regolith footprints and a glowing guide strip down each side.
      tracks(0x8a8e96, 0.5);
      g.fillStyle(k.accent, 0.5);
      for (let y = D + 20; y < H - M - 10; y += 30) { g.fillRect(M + 6, y, 4, 14); g.fillRect(W - M - 10, y, 4, 14); }
      break;
  }
}

/** Fixtures on the walls: hanging lanterns, heaters, cyan strip lights, cables. */
function wallDetails(g: Phaser.GameObjects.Graphics, loc: HangarLocal, M: number, D: number): void {
  const k = loc.kit;
  switch (loc.style) {
    case 'swamp':
      // Hanging lanterns along the walls with warm pools.
      for (let y = D + 110; y < H - M; y += 160) for (const x of [M + 14, W - M - 14]) {
        g.fillStyle(0xffc860, 0.08); g.fillCircle(x, y, 60);
        g.fillStyle(0xffc860, 0.9); g.fillRect(x - 4, y - 5, 8, 10);
      }
      break;
    case 'arctic':
      // Space heaters glowing orange along the walls.
      for (let y = D + 150; y < H - M - 40; y += 180) for (const x of [M + 22, W - M - 22]) {
        g.fillStyle(k.accent2, 0.1); g.fillCircle(x, y, 70);
        g.fillStyle(k.accent2, 0.18); g.fillCircle(x, y, 38);
        g.fillStyle(0x3a4048, 1); g.fillRect(x - 12, y - 16, 24, 32);
        g.fillStyle(k.accent2, 0.95); for (let r = 0; r < 4; r++) g.fillRect(x - 9, y - 12 + r * 7, 18, 3);
      }
      break;
    case 'lunar':
      // Cyan light strips and pressure doors along the walls.
      g.fillStyle(k.accent, 0.12); g.fillRect(M, D, 26, H - D - M); g.fillRect(W - M - 26, D, 26, H - D - M);
      for (const x of [M + 2, W - M - 30]) {
        g.fillStyle(k.accent2, 1); g.fillRoundedRect(x, 520, 28, 70, 6);
        g.lineStyle(2, COMMON.hazard, 0.9); g.strokeRoundedRect(x, 520, 28, 70, 6);
        g.fillStyle(k.accent, 1); g.fillCircle(x + 14, 512, 3);
      }
      break;
    default:
      break;
  }
}

/** Free-standing props that sell the location. */
function localProps(g: Phaser.GameObjects.Graphics, loc: HangarLocal, _M: number, _D: number, seed: number): void {
  const k = loc.kit;
  switch (loc.style) {
    case 'base': {
      // Coffee cups on the briefing table, a rack of rain ponchos, wet-floor sign.
      for (const [dx, dy] of [[34, -18], [40, 14]]) { g.fillStyle(0xffffff, 1); g.fillCircle(1120 + dx, 430 + dy, 5); g.fillStyle(0x4a2c18, 1); g.fillCircle(1120 + dx, 430 + dy, 3.5); }
      g.fillStyle(COMMON.steelDark, 1); g.fillRect(560, 650, 160, 6);
      for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? 0x2c3a2a : 0x34462e, 1); g.fillEllipse(575 + i * 26, 640, 22, 16); }
      g.fillStyle(COMMON.hazard, 1); g.fillTriangle(760, 120, 744, 146, 776, 146);
      g.fillStyle(COMMON.hazardDark, 1); g.fillRect(758, 128, 4, 10);
      break;
    }
    case 'swamp': {
      // A flat-bottom boat pulled up inside, coiled rope, mosquito net over the table, palm-thatch mats.
      g.fillStyle(0x000000, 0.25); g.fillEllipse(170, 680, 190, 40);
      g.fillStyle(0x5a4228, 1); g.fillEllipse(165, 675, 180, 36);
      g.fillStyle(0x3a2a18, 1); g.fillEllipse(165, 675, 150, 24);
      g.lineStyle(2, 0x6a5234, 1); for (let x = 115; x < 225; x += 25) g.lineBetween(x, 664, x, 686);
      g.lineStyle(3, 0x9a8a5a, 1); g.strokeCircle(320, 690, 12); g.strokeCircle(320, 690, 7);
      g.fillStyle(0xffffff, 0.16); g.fillCircle(1120, 430, 95);
      g.lineStyle(1, 0xffffff, 0.25); g.strokeCircle(1120, 430, 95); g.strokeCircle(1120, 430, 70);
      for (let i = 0; i < 4; i++) { g.fillStyle(0x7a6a3a, 0.8); g.fillRect(560 + i * 34, 640, 28, 40); g.lineStyle(1, 0x5a4a28, 1); for (let l = 0; l < 5; l++) g.lineBetween(560 + i * 34, 644 + l * 8, 588 + i * 34, 644 + l * 8); }
      break;
    }
    case 'desert': {
      // Water jerrycans, a tarp over spare crates, a shade tarp on poles, palm fronds blown in.
      for (let i = 0; i < 5; i++) { g.fillStyle(k.accent2, 1); g.fillRoundedRect(560 + i * 22, 640, 18, 26, 3); g.fillStyle(0x2a3a20, 1); g.fillRect(564 + i * 22, 636, 10, 5); }
      g.fillStyle(0xc8a878, 1); g.fillRoundedRect(1150, 560, 100, 110, 14);
      g.lineStyle(2, 0x8a6a40, 1); g.lineBetween(1150, 600, 1250, 610); g.lineBetween(1160, 640, 1245, 630);
      for (const [x, y, r] of [[480, 140, 0.4], [820, 660, -0.7], [140, 470, 1.2]] as const) {
        const t = new Xform(g, x, y, r, 1, 1);
        t.rect(0x6a7a3a, -22, -1.5, 44, 3);
        for (let f = -18; f < 20; f += 6) { t.rect(0x7a8a44, f, -9, 3, 8); t.rect(0x5a6a30, f, 1, 3, 8); }
      }
      break;
    }
    case 'arctic': {
      // Skis and a sled, a de-icer cart, frosted crates.
      for (let i = 0; i < 3; i++) { g.fillStyle(i === 1 ? 0xd8322a : 0x2a5aa8, 1); g.fillRoundedRect(560 + i * 14, 610, 6, 80, 3); }
      g.fillStyle(0x7a5236, 1); g.fillRoundedRect(620, 630, 90, 44, 6);
      g.lineStyle(3, COMMON.steelDark, 1); g.lineBetween(616, 680, 714, 680); g.lineBetween(616, 624, 714, 624);
      g.fillStyle(COMMON.steelDark, 1); g.fillRect(480, 160, 40, 56);
      g.fillStyle(k.accent2, 1); g.fillCircle(500, 176, 10);
      g.lineStyle(2, COMMON.rubber, 1); g.beginPath(); g.moveTo(520, 190); g.lineTo(540, 210); g.lineTo(530, 240); g.strokePath();
      for (const [x, y] of [[70, 545], [120, 545], [70, 595], [1185, 600]]) { g.fillStyle(0xffffff, 0.55); g.fillRect(x - 23, y - 23, 46, 10); }
      break;
    }
    case 'lunar': {
      // Oxygen tank rack, a suit-charging station, strapped-down cargo with glowing tags.
      for (let i = 0; i < 6; i++) {
        const x = 570 + i * 24;
        g.fillStyle(0x000000, 0.25); g.fillCircle(x + 2, 652, 10);
        g.fillStyle(0xf4f6f8, 1); g.fillCircle(x, 650, 10);
        g.fillStyle(0x44cc66, 1); g.fillCircle(x, 650, 4);
      }
      g.fillStyle(COMMON.steelDark, 1); g.fillRect(560, 632, 150, 4);
      g.fillStyle(k.accent2, 1); g.fillRoundedRect(470, 150, 54, 70, 8);
      g.fillStyle(k.accent, 1); g.fillRect(480, 160, 34, 6);
      g.fillStyle(0x44ff88, 1); g.fillCircle(486, 205, 3); g.fillCircle(497, 205, 3);
      g.fillStyle(0xffaa33, 1); g.fillCircle(508, 205, 3);
      for (const [x, y] of [[70, 545], [120, 545], [1185, 600]]) { g.fillStyle(k.accent, 0.9); g.fillRect(x - 6, y - 6, 12, 4); }
      void seed;
      break;
    }
  }
}

/** Things hanging above everything: camo netting in the desert. */
function overhead(g: Phaser.GameObjects.Graphics, loc: HangarLocal): void {
  if (loc.style !== 'desert') return;
  const k = loc.kit;
  for (const [x0, y0, w, h] of [[60, 160, 360, 120], [880, 380, 340, 140]]) {
    g.fillStyle(k.accent, 0.22); g.fillRect(x0, y0, w, h);
    g.lineStyle(1, k.accent2, 0.35);
    for (let x = x0; x < x0 + w; x += 14) g.lineBetween(x, y0, x + 30, y0 + h);
    for (let x = x0 + 30; x < x0 + w + 30; x += 14) g.lineBetween(x, y0, x - 30, y0 + h);
    for (let i = 0; i < 18; i++) { g.fillStyle(i % 2 ? k.accent : 0xa4855a, 0.4); g.fillEllipse(x0 + hash01(i * 3 + x0) * w, y0 + hash01(i * 7 + y0) * h, 22, 10); }
  }
}

function drawOutsideDecor(g: Phaser.GameObjects.Graphics, kind: TreeKind, x: number, y: number, dark: number, light: number, r: number): void {
  const s = 5 + r * 6;
  switch (kind) {
    case 'pine': case 'snowpine': case 'swamp':
      g.fillStyle(dark, 1); g.fillCircle(x, y, s);
      g.fillStyle(kind === 'snowpine' ? 0xffffff : light, 0.8); g.fillCircle(x - s * 0.3, y - s * 0.3, s * 0.5);
      break;
    case 'cactus':
      if (r < 0.5) { g.fillStyle(0xa87a4a, 0.6); g.fillEllipse(x, y, s * 3, s * 0.8); break; }
      g.fillStyle(dark, 1); g.fillCircle(x, y, s * 0.6);
      break;
    case 'rocks':
      g.fillStyle(dark, 1); g.fillCircle(x, y, s * 0.8);
      g.fillStyle(0x000000, 0.2); g.fillCircle(x + 1, y + 1, s * 0.5);
      break;
  }
}

// ── Kit ─────────────────────────────────────────────────────────────────────

function crate(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - s / 2 + 4, y - s / 2 + 4, s, s);
  g.fillStyle(k.crate, 1); g.fillRect(x - s / 2, y - s / 2, s, s);
  g.lineStyle(3, k.crateDark, 1); g.strokeRect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4);
  g.lineStyle(3, k.strap, 1);
  g.lineBetween(x - s / 2 + 3, y - s / 2 + 3, x + s / 2 - 3, y + s / 2 - 3);
  g.lineBetween(x + s / 2 - 3, y - s / 2 + 3, x - s / 2 + 3, y + s / 2 - 3);
}

function drum(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number, red: boolean): void {
  g.fillStyle(0x000000, 0.25); g.fillCircle(x + 3, y + 3, 13);
  g.fillStyle(red ? k.barrelRed : k.barrel, 1); g.fillCircle(x, y, 13);
  g.lineStyle(2, 0x000000, 0.3); g.strokeCircle(x, y, 9);
  g.fillStyle(k.barrelTop, 0.6); g.fillCircle(x - 4, y - 4, 3);
}

function missileCart(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COMMON.steelDark, 1); g.fillRect(x - 20, y - 50, 40, 100);
  g.fillStyle(COMMON.rubber, 1);
  for (const [dx, dy] of [[-24, -40], [20, -40], [-24, 34], [20, 34]]) g.fillRect(x + dx, y + dy, 5, 12);
  for (const dx of [-9, 9]) {
    g.fillStyle(COMMON.missile, 1); g.fillRect(x + dx - 4, y - 46, 8, 86);
    g.fillStyle(COMMON.missileTip, 1); g.fillTriangle(x + dx - 4, y - 46, x + dx + 4, y - 46, x + dx, y - 56);
    g.fillStyle(COMMON.steel, 1); g.fillTriangle(x + dx - 9, y + 40, x + dx + 9, y + 40, x + dx, y + 28);
  }
  g.lineStyle(3, COMMON.steel, 1); g.lineBetween(x, y + 50, x, y + 70);
}

function fuelTruck(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - 36, y - 76, 80, 160, 8);
  g.fillStyle(COMMON.rubber, 1);
  for (const dy of [-50, 10, 46]) { g.fillRect(x - 40, y + dy, 8, 20); g.fillRect(x + 32, y + dy, 8, 20); }
  g.fillStyle(k.truck, 1); g.fillRoundedRect(x - 34, y - 80, 68, 44, 6);
  g.fillStyle(0x9ac8e0, 0.8); g.fillRect(x - 26, y - 76, 52, 10);
  g.fillStyle(k.truckTank, 1); g.fillRoundedRect(x - 32, y - 32, 64, 108, 28);
  g.lineStyle(2, COMMON.steelDark, 1);
  for (let i = 0; i < 3; i++) g.lineBetween(x - 30, y - 4 + i * 30, x + 30, y - 4 + i * 30);
  g.fillStyle(COMMON.paintRed, 1); g.fillRect(x - 6, y + 10, 12, 30);
  g.lineStyle(3, COMMON.rubber, 1);
  g.beginPath(); g.moveTo(x - 32, y + 30);
  for (let i = 1; i <= 8; i++) g.lineTo(x - 32 - i * 18, y + 30 + Math.sin(i) * 14);
  g.strokePath();
}

/** Six-wheeled lunar rover with a cargo tank (Moon replaces the fuel truck). */
function rover(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - 40, y - 72, 88, 156, 12);
  g.fillStyle(COMMON.rubber, 1);
  for (const dy of [-56, 0, 52]) { g.fillRoundedRect(x - 48, y + dy - 12, 12, 26, 5); g.fillRoundedRect(x + 36, y + dy - 12, 12, 26, 5); }
  g.fillStyle(k.truck, 1); g.fillRoundedRect(x - 38, y - 76, 76, 152, 14);
  g.fillStyle(k.accent2, 1); g.fillRoundedRect(x - 28, y - 66, 56, 40, 10);
  g.fillStyle(k.accent, 0.8); g.fillRect(x - 20, y - 60, 40, 8);
  g.fillStyle(k.truckTank, 1); g.fillCircle(x, y + 24, 26);
  g.lineStyle(2, COMMON.hazard, 1); g.strokeCircle(x, y + 24, 26);
  g.fillStyle(k.accent, 1); g.fillCircle(x - 30, y - 74, 3); g.fillCircle(x + 30, y - 74, 3);
  g.lineStyle(3, COMMON.rubber, 1);
  g.beginPath(); g.moveTo(x - 36, y + 30);
  for (let i = 1; i <= 8; i++) g.lineTo(x - 36 - i * 18, y + 30 + Math.sin(i) * 14);
  g.strokePath();
}

function forklift(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - 20, y - 26, 48, 64);
  g.fillStyle(COMMON.hazard, 1); g.fillRect(x - 22, y - 30, 44, 56);
  g.fillStyle(COMMON.hazardDark, 1); g.fillRect(x - 16, y - 22, 32, 26);
  g.fillStyle(COMMON.rubber, 1); g.fillRect(x - 26, y - 26, 6, 16); g.fillRect(x + 20, y - 26, 6, 16);
  g.fillRect(x - 26, y + 6, 6, 16); g.fillRect(x + 20, y + 6, 6, 16);
  g.fillStyle(COMMON.steelDark, 1); g.fillRect(x - 14, y - 66, 6, 36); g.fillRect(x + 8, y - 66, 6, 36);
  crate(g, k, x, y - 58, 36);
}

function table(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - 56, y - 30, 120, 70);
  g.fillStyle(k.table, 1); g.fillRect(x - 60, y - 34, 120, 68);
  g.fillStyle(k.map, 1); g.fillRect(x - 46, y - 24, 70, 46);
  g.lineStyle(2, COMMON.paintRed, 0.9); g.lineBetween(x - 36, y + 10, x + 10, y - 12);
  g.fillStyle(COMMON.paintRed, 1); g.fillCircle(x + 10, y - 12, 4);
  g.fillStyle(0x6a7a4a, 0.9); g.fillEllipse(x - 20, y - 6, 22, 14);
  g.fillStyle(COMMON.steelDark, 1);
  for (const [dx, dy] of [[-40, -48], [10, -48], [-40, 48], [10, 48]]) g.fillRect(x + dx, y + dy - 8, 18, 16);
}

function sandbag(g: Phaser.GameObjects.Graphics, k: Kit, x: number, y: number): void {
  g.fillStyle(k.sandbagDark, 1); g.fillEllipse(x + 1, y + 2, 28, 15);
  g.fillStyle(k.sandbag, 1); g.fillEllipse(x, y, 26, 13);
}

function toolChest(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COMMON.paintRed, 1); g.fillRect(x - 18, y - 12, 36, 24);
  g.lineStyle(1.5, 0x000000, 0.4); g.lineBetween(x - 18, y - 4, x + 18, y - 4); g.lineBetween(x - 18, y + 4, x + 18, y + 4);
}

function wheelChocks(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COMMON.hazard, 1);
  g.fillRect(x - 4, y - 64, 8, 5); g.fillRect(x - 26, y + 20, 8, 5); g.fillRect(x + 18, y + 20, 8, 5);
}

// ── Crew ────────────────────────────────────────────────────────────────────

interface Soldier {
  x: number; y: number;
  /** Patrol endpoints; a === b means the soldier stands guard. */
  ax: number; ay: number; bx: number; by: number;
  toB: boolean; heading: number; speed: number;
  pause: number; phase: number; mechanic: boolean;
  /** Seconds left in a conversation (stands still, faces the partner). */
  talking: number;
  /** 0..1 how open the mouth / head-bob is while speaking. */
  speaking: number;
}

/** Patrol routes kept to the sides so the flight corridor stays clear. */
const ROUTES: [number, number, number, number, boolean][] = [
  [90, 170, 90, 470, false],      // 0 left wall patrol
  [450, 560, 450, 140, false],    // 1 inner left patrol
  [300, 395, 300, 395, true],     // 2 mechanic at the spare jet
  [175, 455, 175, 455, true],     // 3 mechanic at the jet's tail
  [870, 120, 870, 420, false],    // 4 inner right patrol
  [1180, 230, 1180, 520, false],  // 5 right wall patrol
  [1060, 400, 1060, 400, false],  // 6 officer at the briefing table
  [1110, 470, 1110, 470, false],  // 7 second officer
  [965, 610, 1100, 610, false],   // 8 walking past the forklift
  [600, 70, 680, 70, false],      // 9 guard pacing at the doors
];

/** Pairs of crew who chat (they are near each other on their routes). */
export const TALK_PAIRS: readonly [number, number][] = [[6, 7], [2, 3], [1, 2], [4, 9], [5, 6], [8, 7], [0, 3]];

export class HangarCrew {
  private crew: Soldier[] = [];

  constructor(rng: Rng, private readonly look: HangarLocal['crew']) {
    for (const [ax, ay, bx, by, mech] of ROUTES) {
      this.crew.push({
        x: ax + (bx - ax) * rng.next(), y: ay + (by - ay) * rng.next(),
        ax, ay, bx, by, toB: rng.chance(0.5), heading: rng.next() * Math.PI * 2,
        speed: 40 + rng.next() * 25, pause: rng.next() * 2, phase: rng.next() * 6, mechanic: mech,
        talking: 0, speaking: 0,
      });
    }
  }

  /** Screen position of crew member i (for speech bubbles). */
  pos(i: number): { x: number; y: number } { return { x: this.crew[i].x, y: this.crew[i].y }; }

  /** Two crew stop and face each other for `secs`; `speaker` bobs while talking. */
  converse(a: number, b: number, secs: number): void {
    const A = this.crew[a], B = this.crew[b];
    A.talking = Math.max(A.talking, secs); B.talking = Math.max(B.talking, secs);
    A.heading = Math.atan2(B.y - A.y, B.x - A.x); B.heading = Math.atan2(A.y - B.y, A.x - B.x);
  }

  setSpeaking(i: number, on: boolean): void { this.crew[i].speaking = on ? 1 : 0; }

  update(dt: number, rng: Rng): void {
    for (const s of this.crew) {
      s.phase += dt * (s.mechanic ? 3 : 9);
      if (s.talking > 0) { s.talking -= dt; continue; }
      if (s.ax === s.bx && s.ay === s.by) {
        s.pause -= dt;
        if (s.pause <= 0) { s.pause = 1.5 + rng.next() * 2.5; s.heading = rng.next() * Math.PI * 2; }
        continue;
      }
      if (s.pause > 0) { s.pause -= dt; continue; }
      const tx = s.toB ? s.bx : s.ax, ty = s.toB ? s.by : s.ay;
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d < 2) { s.toB = !s.toB; s.pause = 0.8 + rng.next() * 1.6; continue; }
      s.heading = Math.atan2(dy, dx);
      const step = Math.min(d, s.speed * dt);
      s.x += (dx / d) * step; s.y += (dy / d) * step;
    }
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    const c = this.look;
    g.clear();
    for (const s of this.crew) {
      const walking = s.talking <= 0 && s.pause <= 0 && !(s.ax === s.bx && s.ay === s.by);
      const swing = walking ? Math.sin(s.phase) * 4 : 0;
      const gesture = s.speaking > 0 ? Math.sin(s.phase * 1.6) * 2.5 : 0;
      const suit = c.headgear === 'spacesuit', bulky = suit || c.headgear === 'hood';
      const t = new Xform(g, s.x, s.y, s.heading, 1, 1.6);
      // Shadow and feet.
      t.ellipse(0x000000, 2, 2, bulky ? 10 : 9, bulky ? 8 : 7, 0.25);
      if (walking) { t.ellipse(0x1a1a1a, swing, -3.5, 3.2, 2, 1); t.ellipse(0x1a1a1a, -swing, 3.5, 3.2, 2, 1); }
      // Life-support pack (spacesuits) or field pack, behind the body.
      if (suit) t.rect(c.pack, -9, -5, 5, 10);
      else if (!s.mechanic) t.rect(c.pack, -7, -4, 4, 8);
      // Body: uniform (with camo blotches) or a hi-vis vest for mechanics.
      const bw = bulky ? 6 : 5, bh = bulky ? 9 : 8;
      t.ellipse(s.mechanic && !suit ? c.vest : c.uniform, 0, 0, bw, bh);
      if (c.camo !== null && !s.mechanic) { t.circle(c.camo, -1.5, -3, 1.8); t.circle(c.camo, 1.5, 3.5, 1.6); }
      if (s.mechanic) t.rect(suit ? c.vest : c.vestStripe, -1, -bh, 2, bh * 2);
      // Faction patch on the left shoulder.
      t.circle(c.patch, 0, -bh + 2, 1.4);
      // Arms (mechanics work on the jet; talkers gesture).
      const armL = s.mechanic ? 5 + Math.sin(s.phase) * 2 : 1 + gesture;
      const armR = s.mechanic ? 5 - Math.sin(s.phase) * 2 : 1 - gesture * 0.5;
      t.circle(c.uniformDark, -swing * 0.6 + armL, -bh - 0.5, 2.2);
      t.circle(c.uniformDark, swing * 0.6 + armR, bh + 0.5, 2.2);
      // Head and headgear.
      const bob = s.speaking > 0 ? Math.abs(Math.sin(s.phase * 2.2)) * 0.6 : 0;
      switch (c.headgear) {
        case 'helmet':
          t.circle(c.hat, 0.5 + bob, 0, 4.6);
          t.circle(0xffffff, 1.5 + bob, -1.2, 1.1, 0.25);
          break;
        case 'boonie':
          t.circle(c.hatTrim, 0.5 + bob, 0, 6.2);
          t.circle(c.hat, 0.5 + bob, 0, 4.2);
          t.circle(c.camo ?? c.hat, -0.5 + bob, 1, 1.4);
          break;
        case 'shemagh':
          t.circle(c.hat, 0 + bob, 0, 4.6);
          t.rect(c.hatTrim, 2 + bob, -3.4, 2, 6.8);         // goggles strap across the front
          t.rect(c.hat, -6 + bob, -1.5, 3, 3);              // tail of the wrap
          break;
        case 'hood':
          t.circle(c.hatTrim, 0.5 + bob, 0, 5.8);           // fur trim
          t.circle(c.hat, 0.2 + bob, 0, 4.2);
          t.circle(c.skin, 2.2 + bob, 0, 1.8);              // face peeking out
          break;
        case 'spacesuit':
          t.circle(c.hat, 0.5 + bob, 0, 5.4);
          t.ellipse(c.hatTrim, 3 + bob, 0, 2.2, 3.8);        // gold visor facing forward
          t.circle(0xffffff, 1.2 + bob, -2, 1.2, 0.5);
          break;
      }
    }
  }
}
