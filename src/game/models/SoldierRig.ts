// SoldierRig — an animated side-view soldier for the ground assault, shared by the player and
// every enemy. Two-bone legs and arms solved with simple IK so knees and elbows bend naturally:
// walk/run cycle with arm sway, idle breathing, crouch (and crouch-walk), jump tuck and fall,
// landing squash, recoil, hit flinch, reload, grenade throw, and a death fall.
//
// Units: "trooper units" (the soldier is ~17 units tall), drawn at `k` px per unit.
// Local frame: +x = the way the soldier faces, +y = down, origin = between the feet.
import type Phaser from 'phaser';
import type { SoldierPalette } from '../theme/factions';
import type { GunId } from '../../state/armory';
import { Xform } from './shapes';
import { drawGun, MUZZLE } from './Guns';
import { trooperHead, trooperPack, trooperTorso } from './Trooper';

export interface SoldierPose {
  gun: GunId;
  /** Aim angle in screen space (0 = right, π = left). */
  aim: number;
  /** Walk cycle phase (radians) and how much of a full stride (0 idle … 1 run). */
  walk: number;
  move: number;
  /** 0 standing … 1 fully crouched. */
  crouch: number;
  /** Airborne: vertical speed sign/size (-1 rising … 1 falling); null on the ground. */
  air: number | null;
  /** 0…1 kicks that decay: recoil after a shot, flinch after a hit, landing squash. */
  recoil: number;
  flinch: number;
  land: number;
  /** Seconds, for breathing. */
  time: number;
  /** Throw swing progress 0…1 (null = not throwing). */
  throwT: number | null;
  /** Reload progress 0…1 (null = not reloading). */
  reload: number | null;
  /** Gun held low (patrolling, not alert). */
  relaxed: boolean;
  /** Death fall progress 0…1 (null = alive); direction +1 falls forward, -1 backward. */
  dead: number | null;
  deadDir: 1 | -1;
  alpha: number;
  /** Muzzle flash this frame. */
  flash: boolean;
  /** Ground slope under the feet (screen dy/dx) so both feet sit on a hillside. */
  slope: number;
  /** Wears a backpack. */
  pack: boolean;
  /** Repaint the gun (enemy guns are black); null = the gun's own colours. */
  gunTint: { body: number; accent: number } | null;
  /** Body armor drawn over the torso: 0 none, 1 light vest, 2 heavy armor. */
  armor: 0 | 1 | 2;
}

export function basePose(gun: GunId, aim: number, time: number): SoldierPose {
  return {
    gun, aim, walk: 0, move: 0, crouch: 0, air: null, recoil: 0, flinch: 0, land: 0, time,
    throwT: null, reload: null, relaxed: false, dead: null, deadDir: -1, alpha: 1, flash: false,
    slope: 0, pack: true, gunTint: null, armor: 0,
  };
}

type P = { x: number; y: number };
const THIGH = 3.7, SHIN = 3.7, UPPER = 2.9, FORE = 2.9;
const MUZZLE_COLOR = 0xfff2a8;

/** Two-bone IK: joint between `a` and target `b`; `bend` +1/-1 picks the side the joint bends to. */
function ik(a: P, b: P, l1: number, l2: number, bend: number): P {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
  const base = Math.atan2(dy, dx);
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1);
  const off = Math.acos(Math.max(-1, Math.min(1, cos)));
  const ang = base + bend * off;
  return { x: a.x + Math.cos(ang) * l1, y: a.y + Math.sin(ang) * l1 };
}

/** Aim angle in the soldier's own frame (0 = straight ahead, + = downward). */
function localAim(face: 1 | -1, aim: number): number {
  const la = face === 1 ? aim : Math.PI - aim;
  return Math.atan2(Math.sin(la), Math.cos(la));
}

interface Solved {
  hip: P; shoulder: P; head: P; lean: number;
  legs: { knee: P; foot: P }[];
  gunAt: P; gunAng: number;
  rearHand: P; frontHand: P;
}

function solve(face: 1 | -1, p: SoldierPose): Solved {
  const c = p.crouch;
  const breathe = Math.sin(p.time * 2.3) * 0.18;
  const runBob = -Math.abs(Math.sin(p.walk)) * 0.7 * p.move;
  let hipH = 7 - c * 2.6 - p.land * 1.6 + (p.move > 0.05 ? runBob : breathe * 0.4);
  if (p.air !== null) hipH = 7.3;
  // Feet first (stride / crouch stance / tucked in the air); on a slope each foot drops or
  // rises to the ground under it, and the hips sink so the lower leg still reaches.
  const air = p.air;
  const feet = [0, Math.PI].map((off, i) => {
    if (air !== null) {
      const tuck = Math.max(0, -air);
      return i === 0
        ? { x: 1.6 + tuck * 0.8, y: -hipH + 6.2 - tuck * 2.6 }
        : { x: -1.4, y: -hipH + 6.8 - tuck * 1.8 };
    }
    let foot: P;
    if (p.move > 0.05) {
      const ph = p.walk + off;
      const stride = (2.4 + 0.9 * p.move) * (1 - c * 0.35);
      foot = { x: Math.sin(ph) * stride, y: -Math.max(0, Math.cos(ph)) * 1.5 * p.move };
    } else {
      foot = { x: i === 0 ? 1.2 + c * 1.4 : -1.0 - c * 1.3, y: 0 };
    }
    foot.y += p.slope * face * foot.x;
    return foot;
  });
  if (air === null) hipH -= Math.max(0, Math.max(feet[0].y, feet[1].y) - 0.3);
  const hip: P = { x: 0, y: -hipH };
  const legs = feet.map(foot => ({ knee: ik(hip, foot, THIGH, SHIN, -1), foot })); // knees bend forward

  // Torso lean: forward when running or crouched, back on recoil/flinch.
  let lean = p.move * 0.16 + c * 0.22 - p.recoil * 0.08 - p.flinch * 0.35;
  if (p.air !== null) lean = 0.05;
  const up = (len: number): P => ({ x: hip.x + Math.sin(lean) * len, y: hip.y - Math.cos(lean) * len });
  const shoulder = up(6.6);
  const head = up(9.0);

  // Gun: along the aim, held low while relaxed, tipped down while reloading or throwing.
  let gunAng = localAim(face, p.aim);
  if (p.relaxed) gunAng = 0.6;
  if (p.reload !== null) gunAng = 0.75 + Math.sin(p.reload * Math.PI) * 0.25;
  if (p.throwT !== null) gunAng = 1.1;
  const dir = { x: Math.cos(gunAng), y: Math.sin(gunAng) };
  const kick = p.recoil * 1.3;
  const gunAt: P = {
    x: shoulder.x + 1.1 + Math.cos(gunAng) * 0.6 - dir.x * kick,
    y: shoulder.y + 2.1 + Math.sin(gunAng) * 0.6 - dir.y * kick,
  };
  const short = p.gun === 'pistol';
  const rearHand = gunAt;
  let frontHand: P = short ? { x: gunAt.x + dir.x * 1.2, y: gunAt.y + dir.y * 1.2 } : { x: gunAt.x + dir.x * 4.4, y: gunAt.y + dir.y * 4.4 + 0.6 };
  if (p.reload !== null) {
    // Front hand goes down to the magazine and back.
    const r = Math.sin(p.reload * Math.PI);
    frontHand = { x: gunAt.x + dir.x * 2 - r * 0.6, y: gunAt.y + dir.y * 2 + 1.5 + r * 2.2 };
  }
  if (p.throwT !== null) {
    // Arm winds back behind the head, then swings over and forward.
    const a = -2.6 + p.throwT * 3.4;
    frontHand = { x: shoulder.x + Math.cos(a) * 5.4, y: shoulder.y + Math.sin(a) * 5.4 };
  }
  return { hip, shoulder, head, lean, legs, gunAt, gunAng, rearHand, frontHand };
}

/** Plate carrier over the torso; heavy armor adds shoulder pads and a collar. */
export function drawArmor(t: Xform, pal: SoldierPalette, level: 1 | 2, al: number): void {
  t.rect(pal.dark, -2.8, -6.4, 5.6, 4.6, al);
  t.rect(pal.gear, -2.4, -6.0, 4.8, 3.8, al);
  t.rect(pal.dark, -1.6, -4.6, 1.2, 1.4, al); t.rect(pal.dark, 0.4, -4.6, 1.2, 1.4, al); // pouches
  if (level === 2) {
    t.rect(pal.dark, -3.0, -7.2, 6.0, 1.2, al);   // collar
    t.ellipse(pal.gear, 1.6, -6.4, 1.5, 1.0, al); // shoulder pad
    t.rect(pal.dark, -2.8, -1.8, 5.6, 1.0, al);   // lower plate
  }
}

export interface RigJoints {
  head: P; neck: P; hip: P;
  knee: [P, P]; foot: [P, P];
  elbow: [P, P]; hand: [P, P];
}

/** World positions of every joint for this pose (ragdolls start from these). Index 0 = near
 *  leg / front arm, 1 = far leg / rear arm. */
export function rigJoints(x: number, y: number, face: 1 | -1, k: number, p: SoldierPose): RigJoints {
  const s = solve(face, p);
  const w = (q: P): P => ({ x: x + q.x * face * k, y: y + q.y * k });
  const fE = ik(s.shoulder, s.frontHand, UPPER, FORE, 1), rE = ik(s.shoulder, s.rearHand, UPPER, FORE, 1);
  return {
    head: w(s.head), neck: w(s.shoulder), hip: w(s.hip),
    knee: [w(s.legs[0].knee), w(s.legs[1].knee)], foot: [w(s.legs[0].foot), w(s.legs[1].foot)],
    elbow: [w(fE), w(rE)], hand: [w(s.frontHand), w(s.rearHand)],
  };
}

/** World position of the muzzle (for bullets, flashes and laser sights). */
export function rigMuzzle(x: number, y: number, face: 1 | -1, k: number, p: SoldierPose): P {
  const s = solve(face, p);
  const len = MUZZLE[p.gun] * 0.8;
  const lx = s.gunAt.x + Math.cos(s.gunAng) * len, ly = s.gunAt.y + Math.sin(s.gunAng) * len;
  return { x: x + lx * face * k, y: y + ly * k };
}

/** World position of the head centre (for "!" marks and headshots). */
export function rigHead(x: number, y: number, face: 1 | -1, k: number, p: SoldierPose): P {
  const s = solve(face, p);
  return { x: x + s.head.x * face * k, y: y + s.head.y * k };
}

/** Throw hand position (where a grenade leaves from). */
export function rigHand(x: number, y: number, face: 1 | -1, k: number, p: SoldierPose): P {
  const s = solve(face, p);
  return { x: x + s.frontHand.x * face * k, y: y + s.frontHand.y * k };
}

export function drawSoldierRig(
  g: Phaser.GameObjects.Graphics, x: number, y: number, face: 1 | -1, k: number,
  pal: SoldierPalette, p: SoldierPose,
): void {
  const s = solve(face, p);
  const al = p.alpha;
  // A death fall pivots the whole body about the feet.
  const fall = p.dead !== null ? Math.min(1, p.dead) : 0;
  const rot = fall * (Math.PI / 2) * p.deadDir * face;
  const t = new Xform(g, x, y - fall * 2 * k, rot, face, k);

  // Far leg and far arm first (darker), then torso, head, gun, near leg and arm.
  const leg = (i: number, shade: number) => {
    const L = s.legs[i];
    t.line(shade, 2.3, s.hip.x, s.hip.y, L.knee.x, L.knee.y, al);
    t.line(shade, 2.1, L.knee.x, L.knee.y, L.foot.x, L.foot.y, al);
    t.line(pal.dark, 1.5, L.foot.x - 0.4, L.foot.y - 0.3, L.foot.x + 1.3, L.foot.y - 0.3, al); // boot
  };
  leg(1, pal.dark);

  // Far (rear) arm to the grip.
  const rElbow = ik(s.shoulder, s.rearHand, UPPER, FORE, 1);
  t.line(pal.dark, 1.6, s.shoulder.x - 0.3, s.shoulder.y + 0.2, rElbow.x, rElbow.y, al);
  t.line(pal.dark, 1.5, rElbow.x, rElbow.y, s.rearHand.x, s.rearHand.y, al);

  // Torso and pack, leaning with the body.
  const hipW = t.p(s.hip.x, s.hip.y);
  const torso = new Xform(g, hipW.x, hipW.y, rot + s.lean * face, face, k);
  if (p.pack) trooperPack(torso, pal, -4.2, -6.8, 2, 5, al);
  trooperTorso(torso, pal, -2.5, -7, 5, 7.2, al);
  if (p.armor !== 0) drawArmor(torso, pal, p.armor, al);

  trooperHead(t, pal, s.head.x + 0.4, s.head.y, 2, al);

  // Gun.
  const gw = t.p(s.gunAt.x, s.gunAt.y);
  const gt = new Xform(g, gw.x, gw.y, rot + s.gunAng * face, face, k * 0.8);
  drawGun(gt, p.gun, p.time * 1000, p.gunTint ?? undefined);
  if (p.flash) gt.circle(MUZZLE_COLOR, MUZZLE[p.gun] + 1.5, -1.2, 2.2);

  leg(0, pal.uniform === pal.dark ? pal.gear : pal.dark);

  // Near (front) arm.
  const fElbow = ik(s.shoulder, s.frontHand, UPPER, FORE, p.throwT !== null ? -1 : 1);
  t.line(pal.uniform, 1.8, s.shoulder.x, s.shoulder.y, fElbow.x, fElbow.y, al);
  t.line(pal.uniform, 1.7, fElbow.x, fElbow.y, s.frontHand.x, s.frontHand.y, al);
  t.circle(pal.skin, s.frontHand.x, s.frontHand.y, 0.55, al);
}
