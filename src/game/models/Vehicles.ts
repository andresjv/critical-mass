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
  if (pal.ufo) { drawUfo(g, x, y, pal, o); return; }
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
/** Gun pivot height per vehicle kind (the swamp truck is taller, the humvee a bit lower). */
export function turretPivotY(kind: VehiclePalette['kind']): number {
  return kind === 'hauler' ? -47 : kind === 'humvee' ? -35 : TURRET_PIVOT_Y;
}

/** Tank sitting on (x, gy). Local y is up-negative, origin at the ground under its centre. */
export function drawTank(g: Phaser.GameObjects.Graphics, x: number, gy: number, pal: VehiclePalette, o: GroundVehicleOpts): void {
  if (pal.kind === 'rover') { drawRover(g, x, gy, pal, o); return; }
  if (pal.kind === 'humvee') { drawHumvee(g, x, gy, pal, o); return; }
  if (pal.kind === 'hauler') { drawHauler(g, x, gy, pal, o); return; }
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

/**
 * Flying saucer, about the size of a jet: metal disc with a rim of chasing lights, a glass dome
 * with a pilot silhouette, and a glowing underside. Tilts with `rot` (banking when diving/climbing).
 */
function drawUfo(g: Phaser.GameObjects.Graphics, x: number, y: number, pal: JetPalette, o: JetOpts): void {
  // Saucers hover level-ish: only a gentle tilt toward the direction of travel.
  const tilt = Math.max(-0.3, Math.min(0.3, (o.rot ?? 0) * 0.5));
  const t = new Xform(g, x, y, tilt, o.facing, o.scale ?? 1);
  const time = o.time ?? 0;
  const thrust = o.thrust ?? 0;
  // Underside glow / tractor shimmer.
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
  t.ellipse(pal.canopy, 0, 7, 20, 5, (0.18 + 0.2 * pulse) * (0.4 + thrust));
  // Dome (behind the disc rim) with the pilot.
  t.ellipse(pal.canopy, 2, -6, 13, 11, 0.75, Math.PI, Math.PI * 2);
  t.ellipse(pal.dark, 2, -6, 4, 5, 0.85, Math.PI, Math.PI * 2);
  t.circle(pal.dark, 2, -10, 2.6, 0.85);
  t.ellipse(0xffffff, -3, -12, 4, 2, 0.45);
  // Disc: lower hull, upper hull, rim.
  t.ellipse(pal.dark, 0, 2, 38, 7);
  t.ellipse(pal.body, 0, -1, 38, 6.5);
  t.ellipse(pal.dark, 0, -4, 24, 3.5, 0.6);
  t.line(pal.dark, 1, -37, 0.5, 37, 0.5, 0.8);
  // Chasing rim lights.
  for (let k = 0; k < 7; k++) {
    const lx = -30 + k * 10;
    const on = (Math.floor(time / 90) + k) % 3 === 0;
    t.circle(on ? pal.marking : pal.markingCore, lx, 1.5, on ? 2.2 : 1.6, on ? 1 : 0.8);
  }
  // Bottom emitter.
  t.circle(pal.canopy, 0, 7, 3.5, 0.6 + 0.4 * pulse);
}

/** Desert humvee: four big tyres, sloped bonnet, armoured roof ring with a heavy gun (the gunner is drawn by the scene). */
function drawHumvee(g: Phaser.GameObjects.Graphics, x: number, gy: number, pal: VehiclePalette, o: GroundVehicleOpts): void {
  const t = new Xform(g, x, gy, o.tilt);
  // Tyres with turning hub spokes.
  for (const wx of [-20, 20]) {
    t.circle(pal.tread, wx, -8, 8.5);
    t.circle(pal.wheel, wx, -8, 4.2);
    const a = o.travel / 8.5;
    t.line(pal.tread, 1.4, wx - Math.cos(a) * 3.6, -8 - Math.sin(a) * 3.6, wx + Math.cos(a) * 3.6, -8 + Math.sin(a) * 3.6);
  }
  // Body: low wide hull, bonnet sloping to the front grille, cab, wheel arches.
  t.poly(pal.hull, [[-33, -10], [-33, -26], [-8, -27], [-4, -31], [14, -31], [18, -24], [33, -21], [34, -10]]);
  t.poly(pal.dark, [[-33, -10], [34, -10], [34, -14], [-33, -14]]);
  t.ellipse(pal.dark, -20, -11, 11, 6, 1, Math.PI, Math.PI * 2);
  t.ellipse(pal.dark, 20, -11, 11, 6, 1, Math.PI, Math.PI * 2);
  camo(t, pal, o.seed, -30, -28, 58, 14);
  // Windscreen (armoured slit), door line, grille, spare jerrycan at the back.
  t.poly(0x2a3238, [[0, -30], [12, -30], [16, -24.5], [2, -24.5]], 0.9);
  t.line(pal.dark, 1, -6, -26, -6, -14, 0.8);
  t.rect(pal.dark, 31, -20, 3, 7);
  t.rect(pal.dark, -36, -24, 4, 9);
  // Roof gun ring.
  t.rect(pal.dark, -10, -34, 16, 3.5);
  // Red marking on the door.
  t.rect(pal.marking, -18, -22, 5, 3);
  gunBarrel(g, t, pal, o, 3, 2.2);
}

/**
 * Swamp armoured truck: a towering boxy armoured hull on three huge flotation tyres,
 * with a cage-guarded cab, exhaust stacks, and a cannon on a roof mount.
 */
function drawHauler(g: Phaser.GameObjects.Graphics, x: number, gy: number, pal: VehiclePalette, o: GroundVehicleOpts): void {
  const t = new Xform(g, x, gy, o.tilt);
  // Huge tyres with chunky tread blocks.
  for (const wx of [-24, 0, 24]) {
    t.circle(pal.tread, wx, -11, 11.5);
    const a = o.travel / 11.5;
    for (let k = 0; k < 6; k++) {
      const b = a + k * Math.PI / 3;
      t.circle(pal.dark, wx + Math.cos(b) * 10, -11 + Math.sin(b) * 10, 2.2);
    }
    t.circle(pal.wheel, wx, -11, 5);
    t.circle(pal.tread, wx, -11, 1.8);
  }
  // Mud splashed on the lower hull.
  t.poly(pal.dark, [[-36, -18], [36, -18], [36, -24], [-36, -24]]);
  // Tall armoured hull with a stepped cab at the front.
  t.poly(pal.hull, [[-36, -22], [-36, -40], [8, -42], [12, -48], [26, -48], [34, -36], [36, -22]]);
  camo(t, pal, o.seed, -32, -42, 60, 16);
  // Armour plate seams and rivets.
  t.line(pal.dark, 1, -14, -40, -14, -22, 0.7);
  t.line(pal.dark, 1, 6, -42, 6, -22, 0.7);
  for (let k = 0; k < 5; k++) t.circle(pal.dark, -30 + k * 12, -37, 1);
  // Cab window behind a protective cage.
  t.poly(0x2a3238, [[14, -46], [24, -46], [30, -38], [14, -38]], 0.9);
  for (let k = 0; k < 4; k++) t.line(pal.dark, 1, 15 + k * 4, -46, 16 + k * 4.5, -38);
  // Exhaust stacks with a puff of smoke.
  t.rect(pal.dark, -32, -50, 3, 10); t.rect(pal.dark, -27, -48, 3, 8);
  t.circle(0x8a8a80, -30, -54 - (o.travel % 20) * 0.2, 3, 0.35);
  // Front bull bar and a winch.
  t.rect(pal.dark, 35, -30, 3, 10);
  t.circle(pal.dark, 37, -24, 2);
  // Roof mount and red marking.
  t.rect(pal.dark, -8, -48, 18, 4);
  t.rect(pal.marking, -26, -33, 8, 4);
  gunBarrel(g, t, pal, o, 5, 3.2);
}

/** Main gun from the turret pivot, aimed in screen space. */
function gunBarrel(g: Phaser.GameObjects.Graphics, t: Xform, pal: VehiclePalette, o: GroundVehicleOpts, w: number, muzzle: number): void {
  const piv = t.p(0, turretPivotY(pal.kind));
  const len = o.barrelLen - o.recoil * o.recoilPx;
  const c = Math.cos(o.aim), s = Math.sin(o.aim);
  g.lineStyle(w + 2, pal.dark, 1);
  g.lineBetween(piv.x, piv.y, piv.x + c * len, piv.y + s * len);
  g.lineStyle(w, pal.hull, 1);
  g.lineBetween(piv.x, piv.y, piv.x + c * (len - 1), piv.y + s * (len - 1));
  g.fillStyle(pal.dark, 1);
  g.fillCircle(piv.x + c * len, piv.y + s * len, muzzle);
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

/**
 * Top-down fighter jet (hangar view), ~80 px long and ~76 px wingspan, nose pointing +x.
 * Draw at (x, y) with `rot` in radians, or at (0, 0) inside a rotated container.
 */
export function drawJetTopDown(
  g: Phaser.GameObjects.Graphics, x: number, y: number, pal: JetPalette,
  o: { rot?: number; scale?: number; thrust?: number; time?: number },
): void {
  const t = new Xform(g, x, y, o.rot ?? 0, 1, o.scale ?? 1);
  const thrust = o.thrust ?? 0, time = o.time ?? 0;

  // Twin afterburners.
  if (thrust > 0) {
    const fl = 0.75 + 0.25 * Math.sin(time * 0.03);
    const len = 18 + 34 * thrust * fl;
    for (const sy of [-3, 3]) {
      t.poly(0xff6a1a, [[-38, sy - 3], [-38, sy + 3], [-38 - len, sy]], 0.75);
      t.poly(0xffe8a0, [[-38, sy - 1.6], [-38, sy + 1.6], [-38 - len * 0.6, sy]], 0.9);
    }
  }
  // Delta wings (both sides) with darker leading edge.
  for (const sgn of [-1, 1]) {
    t.poly(pal.dark, [[12, 6 * sgn], [-14, 37 * sgn], [-23, 37 * sgn], [-21, 6 * sgn]]);
    t.poly(pal.body, [[9, 6 * sgn], [-14, 34 * sgn], [-21, 34 * sgn], [-19, 6 * sgn]]);
    // Wingtip missile rail.
    t.rect(0xdde4ea, -22, 36 * sgn - 1.2, 16, 2.4);
    t.poly(pal.marking, [[-6, 36 * sgn - 1.2], [-3, 36 * sgn], [-6, 36 * sgn + 1.2]]);
    // Roundel.
    t.circle(pal.marking, -11, 21 * sgn, 4);
    t.circle(pal.markingCore, -11, 21 * sgn, 2);
    // Tailplanes.
    t.poly(pal.dark, [[-25, 6 * sgn], [-35, 18 * sgn], [-39, 18 * sgn], [-37, 6 * sgn]]);
    // Intake.
    t.rect(0x15181c, 2, sgn > 0 ? 6 : -9, 10, 3);
  }
  // Fuselage.
  t.poly(pal.body, [[42, 0], [32, -3.5], [16, -6.5], [-30, -6.5], [-37, -4.5], [-37, 4.5], [-30, 6.5], [16, 6.5], [32, 3.5]]);
  t.poly(pal.dark, [[42, 0], [33, -2.2], [33, 2.2]]);
  // Twin fins seen from above.
  t.rect(pal.dark, -34, -6, 14, 2.2);
  t.rect(pal.dark, -34, 3.8, 14, 2.2);
  t.rect(pal.marking, -26, -6, 5, 2.2);
  t.rect(pal.marking, -26, 3.8, 5, 2.2);
  // Spine line and canopy.
  t.line(pal.dark, 1, 8, 0, -28, 0, 0.6);
  t.ellipse(pal.canopy, 20, 0, 9, 3.6);
  t.ellipse(0xffffff, 23, -1, 3.5, 1.2, 0.6);
  // Nozzles.
  t.circle(0x2a2e33, -37.5, -3, 2.4);
  t.circle(0x2a2e33, -37.5, 3, 2.4);
}
