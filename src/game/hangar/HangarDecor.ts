// Hangar decor (top-down): floor, walls with windows, the level's terrain outside the bay
// doors, parked military kit, and a crew of soldiers walking about. Purely visual — the
// plane only collides with the walls and doors defined in HangarScene.
import Phaser from 'phaser';
import type { Biome, TreeKind } from '../theme/biomes';
import { PLAYER_JET, type JetPalette } from '../theme/factions';
import { drawJetTopDown } from '../models/Vehicles';
import { Xform } from '../models/shapes';
import { hash01 } from '../effects/Backdrop';
import type { Rng } from '../../state/rng';

const W = 1280;
const H = 720;

/** Friendly ground crew colours (our side is blue). */
const CREW = {
  uniform: 0x2c4f7c, uniformDark: 0x1d3656, helmet: 0x213a5c, skin: 0xd9a77c,
  vest: 0xff8a1e, vestStripe: 0xfff2a0, pack: 0x3a4a3a,
};
const KIT = {
  crate: 0x6b5a36, crateDark: 0x4c3f24, strap: 0x2e2616,
  barrel: 0x3e5a3a, barrelRed: 0x8a2a22, barrelTop: 0x5c7a56,
  steel: 0x7c8690, steelDark: 0x4e565e, rubber: 0x1a1c1e,
  missile: 0xdde4ea, missileTip: 0xd8322a, truck: 0x4a5a36, truckTank: 0x8c9496,
  hazard: 0xf2c218, hazardDark: 0x1a1a1a, sandbag: 0x9a8a62, sandbagDark: 0x7a6c48,
  paint: 0xf2c218, paintRed: 0xc8322a, table: 0x5a4a34, map: 0xd8d0b0,
};

export interface Layout {
  wallMargin: number;
  doorH: number;
}

/** Draws everything that never moves. Call once into a low-depth Graphics. */
export function drawHangarStatic(g: Phaser.GameObjects.Graphics, b: Biome, L: Layout, seed: number): void {
  const hp = b.hangar, M = L.wallMargin, D = L.doorH;

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

  // Floor: concrete slabs with expansion joints, oil stains, tyre marks.
  g.fillStyle(hp.floor, 1); g.fillRect(M, D, W - 2 * M, H - D - M);
  g.lineStyle(2, hp.floorLine, 1);
  for (let x = M + 120; x < W - M; x += 120) g.lineBetween(x, D, x, H - M);
  for (let y = D + 110; y < H - M; y += 110) g.lineBetween(M, y, W - M, y);
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

  // Painted markings: hazard band under the doors, centre taxi line, start pad, parking boxes.
  for (let x = M; x < W - M; x += 24) {
    g.fillStyle(KIT.hazard, 0.9); g.fillPoints(pts4(x, D + 6, 12), true);
    g.fillStyle(KIT.hazardDark, 0.9); g.fillPoints(pts4(x + 12, D + 6, 12), true);
  }
  g.fillStyle(KIT.paint, 0.8);
  for (let y = D + 40; y < H - 180; y += 36) g.fillRect(W / 2 - 3, y, 6, 20);
  g.lineStyle(4, KIT.paint, 0.8); g.strokeCircle(W / 2, H - 107, 62);
  g.lineStyle(2, KIT.paint, 0.4); g.strokeCircle(W / 2, H - 107, 92);
  g.lineStyle(3, KIT.paintRed, 0.7); g.strokeRect(120, 200, 230, 220);
  g.lineStyle(3, KIT.paint, 0.6); g.strokeRect(910, 150, 250, 190);

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
      g.fillStyle(0xffffff, 0.18); g.fillRect(wx, y, 4, 52);
      g.lineStyle(2, hp.wallRib, 1); g.strokeRect(wx, y, M - 12, 52);
    }
  }

  // ── Military kit ────────────────────────────────────────────────────────
  // Parked spare fighter in the red box, nose to the doors.
  drawJetTopDown(g, 235, 310, SPARE_JET, { rot: -Math.PI / 2, scale: 1.25 });
  wheelChocks(g, 235, 310);
  // Missile cart beside it.
  missileCart(g, 395, 470);
  // Crate stacks.
  crate(g, 70, 545, 46); crate(g, 120, 545, 46); crate(g, 70, 595, 46); crate(g, 95, 640, 40);
  crate(g, 1185, 600, 46); crate(g, 1135, 640, 40); crate(g, 1190, 650, 40);
  // Fuel and oil drums.
  for (const [x, y, red] of [[370, 640, 0], [395, 655, 1], [345, 662, 0], [1200, 120, 0], [1180, 100, 1], [1215, 95, 0]] as const) drum(g, x, y, red === 1);
  // Fuel truck and forklift on the right.
  fuelTruck(g, 1035, 245);
  forklift(g, 930, 540);
  // Briefing table with a map and chairs.
  table(g, 1120, 430);
  // Sandbag wall and tool chests by the doors.
  for (let i = 0; i < 6; i++) sandbag(g, 60 + i * 26, 92 + (i % 2) * 2);
  for (let i = 0; i < 5; i++) sandbag(g, 73 + i * 26, 80);
  toolChest(g, 1100, 100); toolChest(g, 1050, 100);
  // Overhead lamp pools.
  for (let y = D + 140; y < H - M; y += 220) {
    for (const x of [230, 640, 1050]) {
      g.fillStyle(hp.lamp, 0.05); g.fillCircle(x, y, 150);
      g.fillStyle(hp.lamp, 0.05); g.fillCircle(x, y, 90);
    }
  }
}

const SPARE_JET: JetPalette = { ...PLAYER_JET, body: 0x5a7a9a, dark: 0x3a5470 };

function pts4(x: number, y: number, s: number): Phaser.Math.Vector2[] {
  return [{ x, y: y + s }, { x: x + s, y }, { x: x + s * 2, y }, { x: x + s, y: y + s }] as unknown as Phaser.Math.Vector2[];
}

function drawOutsideDecor(g: Phaser.GameObjects.Graphics, kind: TreeKind, x: number, y: number, dark: number, light: number, r: number): void {
  const s = 5 + r * 6;
  switch (kind) {
    case 'pine': case 'snowpine': case 'swamp':
      g.fillStyle(dark, 1); g.fillCircle(x, y, s);
      g.fillStyle(kind === 'snowpine' ? 0xffffff : light, 0.8); g.fillCircle(x - s * 0.3, y - s * 0.3, s * 0.5);
      break;
    case 'cactus':
      if (r < 0.5) { g.fillStyle(0xa87a4a, 0.6); g.fillEllipse(x, y, s * 3, s * 0.8); break; } // sand ripple
      g.fillStyle(dark, 1); g.fillCircle(x, y, s * 0.6);
      break;
    case 'rocks':
      g.fillStyle(dark, 1); g.fillCircle(x, y, s * 0.8);
      g.fillStyle(0x000000, 0.2); g.fillCircle(x + 1, y + 1, s * 0.5);
      break;
  }
}

function crate(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - s / 2 + 4, y - s / 2 + 4, s, s);
  g.fillStyle(KIT.crate, 1); g.fillRect(x - s / 2, y - s / 2, s, s);
  g.lineStyle(3, KIT.crateDark, 1); g.strokeRect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4);
  g.lineStyle(3, KIT.strap, 1);
  g.lineBetween(x - s / 2 + 3, y - s / 2 + 3, x + s / 2 - 3, y + s / 2 - 3);
  g.lineBetween(x + s / 2 - 3, y - s / 2 + 3, x - s / 2 + 3, y + s / 2 - 3);
}

function drum(g: Phaser.GameObjects.Graphics, x: number, y: number, red: boolean): void {
  g.fillStyle(0x000000, 0.25); g.fillCircle(x + 3, y + 3, 13);
  g.fillStyle(red ? KIT.barrelRed : KIT.barrel, 1); g.fillCircle(x, y, 13);
  g.lineStyle(2, 0x000000, 0.3); g.strokeCircle(x, y, 9);
  g.fillStyle(KIT.barrelTop, 0.6); g.fillCircle(x - 4, y - 4, 3);
}

function missileCart(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(KIT.steelDark, 1); g.fillRect(x - 20, y - 50, 40, 100);
  g.fillStyle(KIT.rubber, 1);
  for (const [dx, dy] of [[-24, -40], [20, -40], [-24, 34], [20, 34]]) g.fillRect(x + dx, y + dy, 5, 12);
  for (const dx of [-9, 9]) {
    g.fillStyle(KIT.missile, 1); g.fillRect(x + dx - 4, y - 46, 8, 86);
    g.fillStyle(KIT.missileTip, 1); g.fillTriangle(x + dx - 4, y - 46, x + dx + 4, y - 46, x + dx, y - 56);
    g.fillStyle(KIT.steel, 1); g.fillTriangle(x + dx - 9, y + 40, x + dx + 9, y + 40, x + dx, y + 28);
  }
  g.lineStyle(3, KIT.steel, 1); g.lineBetween(x, y + 50, x, y + 70); // tow bar
}

function fuelTruck(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - 36, y - 76, 80, 160, 8);
  g.fillStyle(KIT.rubber, 1);
  for (const dy of [-50, 10, 46]) { g.fillRect(x - 40, y + dy, 8, 20); g.fillRect(x + 32, y + dy, 8, 20); }
  g.fillStyle(KIT.truck, 1); g.fillRoundedRect(x - 34, y - 80, 68, 44, 6);
  g.fillStyle(0x9ac8e0, 0.8); g.fillRect(x - 26, y - 76, 52, 10);
  g.fillStyle(KIT.truckTank, 1); g.fillRoundedRect(x - 32, y - 32, 64, 108, 28);
  g.lineStyle(2, KIT.steelDark, 1);
  for (let k = 0; k < 3; k++) g.lineBetween(x - 30, y - 4 + k * 30, x + 30, y - 4 + k * 30);
  g.fillStyle(KIT.paintRed, 1); g.fillRect(x - 6, y + 10, 12, 30);
  // Hose snaking toward the spare jet.
  g.lineStyle(3, KIT.rubber, 1);
  g.beginPath(); g.moveTo(x - 32, y + 30);
  for (let k = 1; k <= 8; k++) g.lineTo(x - 32 - k * 18, y + 30 + Math.sin(k) * 14);
  g.strokePath();
}

function forklift(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - 20, y - 26, 48, 64);
  g.fillStyle(KIT.hazard, 1); g.fillRect(x - 22, y - 30, 44, 56);
  g.fillStyle(KIT.hazardDark, 1); g.fillRect(x - 16, y - 22, 32, 26);
  g.fillStyle(KIT.rubber, 1); g.fillRect(x - 26, y - 26, 6, 16); g.fillRect(x + 20, y - 26, 6, 16);
  g.fillRect(x - 26, y + 6, 6, 16); g.fillRect(x + 20, y + 6, 6, 16);
  g.fillStyle(KIT.steelDark, 1); g.fillRect(x - 14, y - 66, 6, 36); g.fillRect(x + 8, y - 66, 6, 36);
  crate(g, x, y - 58, 36);
}

function table(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x - 56, y - 30, 120, 70);
  g.fillStyle(KIT.table, 1); g.fillRect(x - 60, y - 34, 120, 68);
  g.fillStyle(KIT.map, 1); g.fillRect(x - 46, y - 24, 70, 46);
  g.lineStyle(2, KIT.paintRed, 0.9); g.lineBetween(x - 36, y + 10, x + 10, y - 12);
  g.fillStyle(KIT.paintRed, 1); g.fillCircle(x + 10, y - 12, 4);
  g.fillStyle(0x6a7a4a, 0.9); g.fillEllipse(x - 20, y - 6, 22, 14);
  g.fillStyle(KIT.steelDark, 1);
  for (const [dx, dy] of [[-40, -48], [10, -48], [-40, 48], [10, 48]]) g.fillRect(x + dx, y + dy - 8, 18, 16);
}

function sandbag(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(KIT.sandbagDark, 1); g.fillEllipse(x + 1, y + 2, 28, 15);
  g.fillStyle(KIT.sandbag, 1); g.fillEllipse(x, y, 26, 13);
}

function toolChest(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(KIT.paintRed, 1); g.fillRect(x - 18, y - 12, 36, 24);
  g.lineStyle(1.5, 0x000000, 0.4); g.lineBetween(x - 18, y - 4, x + 18, y - 4); g.lineBetween(x - 18, y + 4, x + 18, y + 4);
}

function wheelChocks(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(KIT.hazard, 1);
  g.fillRect(x - 4, y - 64, 8, 5); g.fillRect(x - 26, y + 20, 8, 5); g.fillRect(x + 18, y + 20, 8, 5);
}

// ── Crew ────────────────────────────────────────────────────────────────────

interface Soldier {
  x: number; y: number;
  /** Patrol endpoints; a === b means the soldier stands guard. */
  ax: number; ay: number; bx: number; by: number;
  toB: boolean; heading: number; speed: number;
  pause: number; phase: number; mechanic: boolean;
}

/** Patrol routes kept to the sides so the flight corridor stays clear. */
const ROUTES: [number, number, number, number, boolean][] = [
  [90, 170, 90, 470, false],      // left wall patrol
  [450, 560, 450, 140, false],    // inner left patrol
  [300, 395, 300, 395, true],     // mechanic at the spare jet
  [175, 455, 175, 455, true],     // mechanic at the jet's tail
  [870, 120, 870, 420, false],    // inner right patrol
  [1180, 230, 1180, 520, false],  // right wall patrol
  [1060, 400, 1060, 400, false],  // officer at the briefing table
  [1110, 470, 1110, 470, false],  // second officer
  [965, 610, 1100, 610, false],   // walking past the forklift
  [600, 70, 680, 70, false],      // guard pacing at the doors
];

export class HangarCrew {
  private crew: Soldier[] = [];

  constructor(rng: Rng) {
    for (const [ax, ay, bx, by, mech] of ROUTES) {
      this.crew.push({
        x: ax + (bx - ax) * rng.next(), y: ay + (by - ay) * rng.next(),
        ax, ay, bx, by, toB: rng.chance(0.5), heading: rng.next() * Math.PI * 2,
        speed: 40 + rng.next() * 25, pause: rng.next() * 2, phase: rng.next() * 6, mechanic: mech,
      });
    }
  }

  update(dt: number, rng: Rng): void {
    for (const s of this.crew) {
      s.phase += dt * (s.mechanic ? 3 : 9);
      if (s.ax === s.bx && s.ay === s.by) {
        // Standing: occasionally turn to look around.
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
    g.clear();
    for (const s of this.crew) {
      const walking = s.pause <= 0 && !(s.ax === s.bx && s.ay === s.by);
      const swing = walking ? Math.sin(s.phase) * 4 : 0;
      const t = new Xform(g, s.x, s.y, s.heading, 1, 1.6);
      // Shadow, feet, body, arms, pack, helmet.
      t.ellipse(0x000000, 2, 2, 9, 7, 0.25);
      if (walking) { t.ellipse(0x1a1a1a, swing, -3.5, 3.2, 2, 1); t.ellipse(0x1a1a1a, -swing, 3.5, 3.2, 2, 1); }
      t.ellipse(s.mechanic ? CREW.vest : CREW.uniform, 0, 0, 5, 8);
      if (s.mechanic) t.rect(CREW.vestStripe, -1, -8, 2, 16);
      t.circle(CREW.uniformDark, -swing * 0.6 + (s.mechanic ? 5 + Math.sin(s.phase) * 2 : 1), -8.5, 2.2);
      t.circle(CREW.uniformDark, swing * 0.6 + (s.mechanic ? 5 - Math.sin(s.phase) * 2 : 1), 8.5, 2.2);
      if (!s.mechanic) t.rect(CREW.pack, -7, -4, 4, 8);
      t.circle(CREW.helmet, 0.5, 0, 4.6);
      t.circle(0xffffff, 1.5, -1.2, 1.1, 0.25);
    }
  }
}
