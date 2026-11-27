// Side-view vector models: fighter jet, tank, moon rover.
// All coordinates are local (px at scale 1); Xform handles position, mirroring and rotation.
import type Phaser from 'phaser';
import type { JetPalette, VehiclePalette } from '../theme/factions';
import { hash01 } from '../effects/Backdrop';
import { Xform } from './shapes';

export interface JetOpts {
  /** 1 = nose pointing right, -1 = nose pointing left. */
  facing: 1 | -1;
  /** Rotation in radians (screen space). */
  rot?: number;
  scale?: number;
  /** 0 = engine idle glow, 1 = full afterburner. */
  thrust?: number;
  /** Game time in ms, for flame flicker. */
  time?: number;
}

/**
 * Fighter jet, ~74 px long at scale 1, centred on (x, y).
 * Nose cone, bubble canopy, intake, swept wing, tail fin, stabilizer, nozzle, afterburner.
 */
export function drawJet(g: Phaser.GameObjects.Graphics, x: number, y: number, pal: JetPalette, o: JetOpts): void {
  const t = new Xform(g, x, y, o.rot ?? 0, o.facing, o.scale ?? 1);
  const time = o.time ?? 0;
  const thrust = o.thrust ?? 0;

  // Afterburner / exhaust glow (behind everything).
  const fl = 0.75 + 0.25 * Math.sin(time * 0.03) + 0.1 * Math.sin(time * 0.071);
  const len = 8 + thrust * 30 * fl;
  t.poly(0xff6a1a, [[-38, -3.5], [-38, 3.5], [-38 - len, 0]], 0.55 + thrust * 0.3);
  t.poly(0xffe8a0, [[-38, -2], [-38, 2], [-38 - len * 0.6, 0]], 0.7 + thrust * 0.3);

  // Far-side wing and stabilizer (darker, peeking out above the fuselage).
  t.poly(pal.dark, [[2, -4], [-12, -4], [-20, -10], [-12, -10]]);

  // Vertical tail fin with team marking.
  t.poly(pal.body, [[-16, -5], [-30, -5], [-37, -23], [-30, -23]]);
  t.poly(pal.marking, [[-27, -14], [-33, -14], [-35.5, -21], [-30.5, -21]]);

  // Fuselage.
  t.poly(pal.body, [
    [38, 0.5], [28, -2], [16, -5], [0, -6.5], [-22, -6.5], [-32, -5], [-37, -3.5],
    [-37, 3.5], [-30, 5.5], [-6, 6.5], [12, 6], [26, 3],
  ]);
  // Belly shade.
  t.poly(pal.dark, [[-37, 3.5], [-30, 5.5], [-6, 6.5], [12, 6], [26, 3], [20, 2], [-30, 2.5]], 0.55);

  // Camouflage blotches (fixed pattern so the jet doesn't shimmer).
  pal.camo.forEach((c, i) => {
    t.ellipse(c, -18 + i * 13, -2 + (i % 2) * 3, 6, 2.2, 0.85);
    t.ellipse(c, 6 - i * 9, 1.5 - (i % 2) * 3, 4.5, 1.8, 0.85);
  });

  // Nose cone (radome) and stripe.
  t.poly(pal.dark, [[38, 0.5], [30, -1.6], [30, 3.4]]);
  t.poly(pal.marking, [[24, -3], [21, -3.8], [21, 4.6], [24, 3.8]], 0.9);

  // Intake under the cockpit.
  t.poly(0x15181c, [[10, 1.5], [2, 1.5], [0, 6], [8, 6]]);

  // Canopy with frame and glint.
  t.poly(pal.canopy, [[22, -4.5], [16, -9.5], [8, -10.5], [2, -6.5]]);
  t.line(pal.dark, 1, 9, -10.3, 8, -6.2);
  t.poly(0xffffff, [[16, -8.6], [12, -9.6], [10, -9], [14, -8]], 0.6);

  // Main wing (near side, swept back and down).
  t.poly(pal.dark, [[8, 2.5], [-10, 2.5], [-22, 12], [-14, 12]]);
  t.poly(pal.body, [[6, 2.5], [-9, 2.5], [-19, 10.5], [-13, 10.5]]);
  // Horizontal stabilizer.
  t.poly(pal.dark, [[-25, 2], [-34, 2], [-39, 8], [-33, 8]]);

  // Roundel.
  t.circle(pal.marking, -8, -0.5, 3.6);
  t.circle(pal.markingCore, -8, -0.5, 1.8);

  // Exhaust nozzle and panel line.
  t.rect(0x2a2e33, -40, -3.5, 3.5, 7);
  t.line(pal.dark, 0.8, 14, -5, 14, 6, 0.7);
}

export interface GroundVehicleOpts {
  /** Hull tilt from the ground slope, radians. */
  tilt: number;
  /** Turret / weapon angle in screen space, radians. */
  aim: number;
  /** 0..1 recoil kick (1 = just fired). */
  recoil: number;
  /** Distance driven, px (spins the wheels). */
  travel: number;
  /** Per-vehicle seed for the camo pattern. */
  seed: number;
  barrelLen: number;
  recoilPx: number;
}

/** Turret pivot in local coordinates (above the ground point). */
export const TURRET_PIVOT_Y = -34;

/** Tank sitting on (x, gy). Local y is up-negative, origin at the ground under its centre. */
export function drawTank(g: Phaser.GameObjects.Graphics, x: number, gy: number, pal: VehiclePalette, o: GroundVehicleOpts): void {
  if (pal.kind === 'rover') { drawRover(g, x, gy, pal, o); return; }
  const t = new Xform(g, x, gy, o.tilt);

  // Tracks + road wheels.
  t.poly(pal.tread, [[-31, -12], [29, -12], [33, -6], [29, 0], [-31, 0], [-34, -6]]);
  for (let k = 0; k < 5; k++) {
    const wx = -22 + k * 11;
    t.circle(pal.wheel, wx, -6, 4.6);
    const a = o.travel / 4.6 + k;
    t.line(pal.tread, 1.4, wx - Math.cos(a) * 3.6, -6 - Math.sin(a) * 3.6, wx + Math.cos(a) * 3.6, -6 + Math.sin(a) * 3.6);
  }
  t.circle(pal.wheel, -30, -7, 3.2); t.circle(pal.wheel, 29, -7, 3.2);

  // Hull with sloped glacis and side skirt.
  t.poly(pal.hull, [[-32, -12], [-30, -24], [16, -28], [32, -17], [32, -12]]);
  t.poly(pal.dark, [[-32, -12], [32, -12], [32, -15], [-32, -15]]);
  camo(t, pal, o.seed, -26, -25, 50, 10);

  // Turret (stays on the hull; barrel aims in screen space from the pivot).
  t.poly(pal.hull, [[-16, -27], [-12, -39], [10, -40], [17, -33], [16, -27]]);
  t.poly(pal.dark, [[-16, -27], [16, -27], [16, -29.5], [-16, -29.5]]);
  camo(t, pal, o.seed + 7, -12, -38, 22, 8);
  // Red team flag on the antenna.
  t.line(pal.dark, 1, -12, -39, -14, -54);
  t.poly(pal.marking, [[-14, -54], [-6, -52], [-14, -49]]);
  // Commander hatch.
  t.rect(pal.dark, -6, -42.5, 9, 3);

  const piv = t.p(0, TURRET_PIVOT_Y);
  const len = o.barrelLen - o.recoil * o.recoilPx;
  const c = Math.cos(o.aim), s = Math.sin(o.aim);
  g.lineStyle(5, pal.dark, 1);
  g.lineBetween(piv.x, piv.y, piv.x + c * len, piv.y + s * len);
  g.lineStyle(3, pal.hull, 1);
  g.lineBetween(piv.x, piv.y, piv.x + c * (len - 1), piv.y + s * (len - 1));
  g.fillStyle(pal.dark, 1);
  g.fillCircle(piv.x + c * len, piv.y + s * len, 3.2); // muzzle brake
}

/** Six-wheeled moon rover with a pulse-cannon turret. */
function drawRover(g: Phaser.GameObjects.Graphics, x: number, gy: number, pal: VehiclePalette, o: GroundVehicleOpts): void {
  const t = new Xform(g, x, gy, o.tilt);
  // Suspension arms.
  for (const wx of [-22, 0, 22]) t.line(pal.dark, 3, wx, -8, wx * 0.7, -18);
  // Wheels with hubs and spinning spokes.
  for (const wx of [-22, 0, 22]) {
    t.circle(pal.tread, wx, -8, 8);
    t.circle(pal.wheel, wx, -8, 4.5);
    const a = o.travel / 8;
    t.line(pal.hull, 1.2, wx - Math.cos(a) * 6.5, -8 - Math.sin(a) * 6.5, wx + Math.cos(a) * 6.5, -8 + Math.sin(a) * 6.5);
  }
  // Chassis with sloped nose and red stripe.
  t.poly(pal.hull, [[-30, -16], [24, -16], [32, -22], [26, -28], [-28, -28]]);
  t.poly(pal.dark, [[-30, -16], [24, -16], [27, -19], [-30, -19]]);
  t.rect(pal.marking, -24, -25, 34, 3);
  // Cab window.
  t.poly(0x66ddff, [[14, -27], [24, -27], [29, -22], [18, -22]], 0.85);
  // Antenna with blinking tip.
  t.line(pal.dark, 1.2, -24, -28, -26, -50);
  t.circle(pal.marking, -26, -50, 2);
  // Turret dome.
  t.ellipse(pal.hull, -2, -30, 12, 8, 1, Math.PI, Math.PI * 2);
  const piv = t.p(0, TURRET_PIVOT_Y);
  const len = o.barrelLen - o.recoil * o.recoilPx;
  const c = Math.cos(o.aim), s = Math.sin(o.aim);
  g.lineStyle(4, pal.dark, 1);
  g.lineBetween(piv.x, piv.y, piv.x + c * len, piv.y + s * len);
  g.fillStyle(pal.marking, 1);
  g.fillCircle(piv.x + c * len, piv.y + s * len, 2.6); // emitter tip
}

/** Deterministic camo blotches inside a local box. */
function camo(t: Xform, pal: VehiclePalette, seed: number, x: number, y: number, w: number, h: number): void {
  if (!pal.camo.length) return;
  for (let i = 0; i < 6; i++) {
    const r = hash01(seed * 9.1 + i * 3.7);
    const cx = x + hash01(seed * 4.3 + i * 1.9) * w;
    const cy = y + hash01(seed * 2.2 + i * 5.3) * h;
    t.ellipse(pal.camo[i % pal.camo.length], cx, cy, 3 + r * 4, 1.6 + r * 2, 0.9);
  }
}
