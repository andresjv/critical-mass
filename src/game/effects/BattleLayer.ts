// BattleLayer — the war going on behind the player. Visual only: nothing here can hit or be
// hit by the player.
//   Infantry: on the tree-line floor (2nd layer, parallax 0.45). The layer is split into
//     sectors; in each, a blue line holds the left and a red line holds the right with
//     no-man's-land between. Soldiers kneel, fire tracers across, fall, and are reinforced.
//   Dogfights: small blue / red jets chasing each other in the far sky, shooting bursts;
//     a downed jet spins away trailing smoke and a fresh pair arrives later.
// Tank gunners (in AttackRunScene) use pickBlue / tracer / returnFire to join in.
import Phaser from 'phaser';
import { BATTLE } from '../../state/tuning';
import type { Rng } from '../../state/rng';
import {
  TRACER_BLUE, TRACER_RED, ALLY_JET, type SoldierPalette, type JetPalette,
} from '../theme/factions';
import { soldierLook, type Troops } from '../theme/troops';
import { trooperHead, trooperPack, trooperTorso } from '../models/Trooper';
import { drawJet } from '../models/Vehicles';
import { Xform } from '../models/shapes';
import { FX_PALETTE } from '../theme/coldFront';
import { hash01 } from './Backdrop';

const W = 1280;

type Side = 'blue' | 'red';

export interface Soldier {
  side: Side;
  /** Layer-world x (screen x = wx - layer offset). */
  wx: number;
  /** 0 = far edge of the strip (small, higher), 1 = near edge (bigger, lower). */
  depth: number;
  alive: boolean;
  kneel: boolean;
  /** Seconds until next shot / stance change. */
  fireT: number;
  stanceT: number;
  /** Walking toward this layer x (reinforcements, small advances). */
  targetWx: number;
  phase: number;
  /** Seconds since death (falls over, then fades). */
  deadT: number;
  sector: number;
  /** Last aim angle on screen (for drawing the rifle), radians. */
  aim: number;
  flash: number;
  /** Seed for this soldier's own look (skin, kit shade, hat, height). */
  look: number;
}

interface Tracer { x1: number; y1: number; x2: number; y2: number; life: number; color: number; layer: 'ground' | 'sky' | 'fg' }

interface FarJet {
  side: Side; x: number; y: number; ang: number; alive: boolean;
  fallVy: number; spin: number; smokeT: number; burstT: number;
}
interface Pair { chaser: FarJet; target: FarJet; wobble: number }
interface Puff { x: number; y: number; r: number; life: number; max: number; color: number }

export class BattleLayer {
  private soldiers: Soldier[] = [];
  private sectorsBuilt = new Set<number>();
  private reinforcements: { side: Side; sector: number; t: number }[] = [];
  private tracers: Tracer[] = [];
  private pairs: Pair[] = [];
  private pairRespawn = 0;
  private puffs: Puff[] = [];
  private time = 0;

  constructor(
    private readonly rng: Rng,
    private readonly redJet: JetPalette,
    /** Regional uniforms for both sides. */
    private readonly troops: Troops,
    /** Layer offset (screen x + offset = layer x) and floor y for the current camera. */
    private readonly layer: { offset(): number; floorY(sx: number): number },
    /** Field the infantry stand on (so they read as on the ground, not floating). */
    private readonly field: { fill: number; edge: number },
  ) {
    for (let i = 0; i < BATTLE.dogfightPairs; i++) this.pairs.push(this.newPair(i * 400));
  }

  // ── Public API for tank gunners ──────────────────────────────────────────

  /** A living blue soldier currently on screen (head position), or null. */
  pickBlue(): { s: Soldier; x: number; y: number } | null {
    const off = this.layer.offset();
    const vis = this.soldiers.filter(s => s.alive && s.side === 'blue' && s.wx - off > 20 && s.wx - off < W - 20);
    if (vis.length === 0) return null;
    const s = vis[Math.floor(this.rng.next() * vis.length)];
    const p = this.headPos(s, off);
    return { s, x: p.x, y: p.y };
  }

  kill(s: Soldier): void { if (s.alive) { s.alive = false; s.deadT = 0; this.queueReinforcement(s); } }

  /** Tracer drawn in the foreground (gunner fire). */
  tracer(x1: number, y1: number, x2: number, y2: number, side: Side): void {
    this.tracers.push({ x1, y1, x2, y2, life: 0.09, color: side === 'blue' ? TRACER_BLUE : TRACER_RED, layer: 'fg' });
  }

  /** A visible blue soldier fires at (x, y). Returns false if none can. */
  returnFire(x: number, y: number): boolean {
    const b = this.pickBlue();
    if (!b) return false;
    b.s.aim = Math.atan2(y - b.y, x - b.x); b.s.flash = 0.08; b.s.kneel = true;
    this.tracer(b.x + Math.cos(b.s.aim) * 6, b.y + 2, x, y, 'blue');
    return true;
  }

  // ── Simulation ───────────────────────────────────────────────────────────

  update(dt: number): void {
    this.time += dt;
    const off = this.layer.offset();
    this.buildSectors(off);

    for (const s of this.soldiers) {
      if (!s.alive) { s.deadT += dt; continue; }
      s.phase += dt * 8;
      s.flash = Math.max(0, s.flash - dt);
      // Walk toward the target spot (reinforcements running up, small advances).
      const dx = s.targetWx - s.wx;
      if (Math.abs(dx) > 1.5) { s.wx += Math.sign(dx) * Math.min(Math.abs(dx), BATTLE.walkSpeed * dt); s.kneel = false; continue; }
      s.stanceT -= dt;
      if (s.stanceT <= 0) {
        s.stanceT = 2 + this.rng.next() * 4;
        if (this.rng.chance(0.25)) s.targetWx = s.wx + (s.side === 'blue' ? 1 : -1) * (6 + this.rng.next() * 18);
        else s.kneel = this.rng.chance(0.6);
      }
      s.fireT -= dt;
      if (s.fireT <= 0) {
        s.fireT = BATTLE.fireMin + this.rng.next() * (BATTLE.fireMax - BATTLE.fireMin);
        this.soldierShoots(s, off);
      }
    }
    // Remove long-dead bodies and soldiers far behind the camera.
    this.soldiers = this.soldiers.filter(s => (s.alive || s.deadT < 12) && s.wx - off > -300);

    for (const r of this.reinforcements) r.t -= dt;
    for (const r of this.reinforcements.filter(q => q.t <= 0)) this.spawnSoldier(r.side, r.sector, true);
    this.reinforcements = this.reinforcements.filter(r => r.t > 0 && this.sectorsBuilt.has(r.sector));

    this.updateDogfights(dt);

    for (const t of this.tracers) t.life -= dt;
    this.tracers = this.tracers.filter(t => t.life > 0);
    for (const p of this.puffs) p.life -= dt;
    this.puffs = this.puffs.filter(p => p.life > 0);
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  /** Far sky: dogfighting jets, their tracers and smoke. */
  drawSky(g: Phaser.GameObjects.Graphics, time: number): void {
    g.clear();
    for (const p of this.puffs) {
      const k = p.life / p.max;
      g.fillStyle(p.color, 0.45 * k); g.fillCircle(p.x, p.y, p.r * (1.6 - k * 0.6));
    }
    for (const t of this.tracers) if (t.layer === 'sky') this.drawTracer(g, t, 1.5);
    for (const pr of this.pairs) for (const j of [pr.target, pr.chaser]) {
      if (j.y > 470) continue;
      const left = Math.cos(j.ang) < 0;
      drawJet(g, j.x, j.y, j.side === 'blue' ? ALLY_JET : this.redJet, {
        facing: left ? -1 : 1, rot: left ? j.ang - Math.PI : j.ang,
        scale: BATTLE.farJetScale, thrust: j.alive ? 0.7 : 0, time,
      });
      if (!j.alive) { g.fillStyle(FX_PALETTE.fire, 0.8); g.fillCircle(j.x, j.y, 4 + Math.sin(time * 0.04) * 1.5); }
    }
  }

  /** Infantry on the tree-line floor. */
  drawGround(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    const off = this.layer.offset();
    this.drawField(g);
    this.drawEarthworks(g, off);
    // Far soldiers first so nearer ones overlap them.
    const vis = this.soldiers.filter(s => s.wx - off > -30 && s.wx - off < W + 30).sort((a, b) => a.depth - b.depth);
    for (const s of vis) this.drawSoldier(g, s, off);
    for (const t of this.tracers) if (t.layer === 'ground') this.drawTracer(g, t, 1);
  }

  /** Foreground tracers (tank gunners and the blue fire that answers them). */
  drawForeground(g: Phaser.GameObjects.Graphics): void {
    for (const t of this.tracers) if (t.layer === 'fg') this.drawTracer(g, t, 2);
  }

  // ── Internals: infantry ──────────────────────────────────────────────────

  private height(s: Soldier): number { return BATTLE.soldierHeightFar + (BATTLE.soldierHeightNear - BATTLE.soldierHeightFar) * s.depth; }

  private footY(s: Soldier, off: number): number {
    return this.layer.floorY(s.wx - off) + 3 + s.depth * BATTLE.stripDepth;
  }

  private headPos(s: Soldier, off: number): { x: number; y: number } {
    const h = this.height(s);
    return { x: s.wx - off, y: this.footY(s, off) - h * (s.kneel ? 0.72 : 0.95) };
  }

  private sectorFront(n: number): number {
    return n * BATTLE.sectorWidth + BATTLE.sectorWidth * (0.45 + hash01(n * 3.7 + 11) * 0.1);
  }

  private buildSectors(off: number): void {
    const first = Math.floor((off - 200) / BATTLE.sectorWidth), last = Math.floor((off + W + 600) / BATTLE.sectorWidth);
    for (let n = first; n <= last; n++) {
      if (this.sectorsBuilt.has(n)) continue;
      this.sectorsBuilt.add(n);
      for (const side of ['blue', 'red'] as const) {
        const count = BATTLE.soldiersMin + Math.floor(this.rng.next() * (BATTLE.soldiersMax - BATTLE.soldiersMin + 1));
        for (let i = 0; i < count; i++) this.spawnSoldier(side, n, false);
      }
    }
    for (const n of [...this.sectorsBuilt]) if ((n + 1) * BATTLE.sectorWidth < off - 400) this.sectorsBuilt.delete(n);
  }

  private spawnSoldier(side: Side, sector: number, running: boolean): void {
    const front = this.sectorFront(sector);
    const dir = side === 'blue' ? -1 : 1;
    const spot = front + dir * (70 + this.rng.next() * 380);
    this.soldiers.push({
      side, sector, depth: this.rng.next(), alive: true, kneel: this.rng.chance(0.5),
      wx: running ? front + dir * 520 : spot, targetWx: spot,
      fireT: this.rng.next() * BATTLE.fireMax, stanceT: 1 + this.rng.next() * 3,
      phase: this.rng.next() * 6, deadT: 0, aim: side === 'blue' ? 0 : Math.PI, flash: 0,
      look: this.rng.nextInt(100000),
    });
  }

  private queueReinforcement(s: Soldier): void {
    this.reinforcements.push({ side: s.side, sector: s.sector, t: BATTLE.reinforceDelay + this.rng.next() * 3 });
  }

  private soldierShoots(s: Soldier, off: number): void {
    const foes = this.soldiers.filter(o => o.alive && o.side !== s.side && o.sector === s.sector);
    if (foes.length === 0) return;
    const t = foes[Math.floor(this.rng.next() * foes.length)];
    const a = this.headPos(s, off), b = this.headPos(t, off);
    s.aim = Math.atan2(b.y - a.y, b.x - a.x); s.flash = 0.07;
    const mx = a.x + Math.cos(s.aim) * this.height(s) * 0.6, my = a.y + this.height(s) * 0.15;
    if (mx > -50 && mx < W + 50) {
      this.tracers.push({ x1: mx, y1: my, x2: b.x, y2: b.y + 2, life: 0.07, color: s.side === 'blue' ? TRACER_BLUE : TRACER_RED, layer: 'ground' });
    }
    if (this.rng.chance(BATTLE.hitChance)) this.kill(t);
  }

  /** Trodden field strip along the tree line: the ground the infantry stand on. */
  private drawField(g: Phaser.GameObjects.Graphics): void {
    const top: { x: number; y: number }[] = [];
    for (let sx = -20; sx <= W + 20; sx += 20) top.push({ x: sx, y: this.layer.floorY(sx) - 1 });
    const bot = BATTLE.stripDepth + 12;
    g.fillStyle(this.field.fill, 1);
    g.beginPath(); g.moveTo(top[0].x, top[0].y);
    for (const p of top) g.lineTo(p.x, p.y);
    for (let i = top.length - 1; i >= 0; i--) g.lineTo(top[i].x, top[i].y + bot);
    g.closePath(); g.fillPath();
    g.lineStyle(2, this.field.edge, 0.8);
    g.beginPath(); g.moveTo(top[0].x, top[0].y);
    for (const p of top) g.lineTo(p.x, p.y);
    g.strokePath();
  }

  private drawEarthworks(g: Phaser.GameObjects.Graphics, off: number): void {
    // Sandbag line in front of each side's position and a couple of shell craters in no-man's-land.
    for (const n of this.sectorsBuilt) {
      const front = this.sectorFront(n);
      for (const [x0, x1] of [[front - 470, front - 60], [front + 60, front + 470]]) {
        const sx0 = x0 - off, sx1 = x1 - off;
        if (sx1 < -20 || sx0 > W + 20) continue;
        for (let x = sx0; x < sx1; x += 9) {
          const y = this.layer.floorY(x) + BATTLE.stripDepth + 6;
          g.fillStyle(0x6a5c3e, 1); g.fillEllipse(x, y, 10, 5);
          g.fillStyle(0x8a7a56, 1); g.fillEllipse(x - 1, y - 1, 8, 3.5);
        }
      }
      for (let k = 0; k < 3; k++) {
        const x = front - 40 + k * 40 + hash01(n * 5 + k) * 20 - off;
        if (x < -30 || x > W + 30) continue;
        const y = this.layer.floorY(x) + 8 + k * 4;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y, 26, 6);
      }
    }
  }

  private drawSoldier(g: Phaser.GameObjects.Graphics, s: Soldier, off: number): void {
    const look = soldierLook(s.side === 'blue' ? this.troops.blue : this.troops.red, s.look);
    const pal: SoldierPalette = look.pal;
    const x = s.wx - off, fy = this.footY(s, off), h = this.height(s) * look.scale, k = h / 16;
    const face = s.side === 'blue' ? 1 : -1;
    if (!s.alive) {
      // Fallen: topples backwards over ~0.4 s, then lies still and fades.
      const tip = Math.min(1, s.deadT / 0.4) * (Math.PI / 2) * -face;
      const a = s.deadT > 9 ? Math.max(0, 1 - (s.deadT - 9) / 3) : 1;
      const t = new Xform(g, x, fy, tip, face, k);
      t.rect(pal.dark, -1.5, -8, 3, 8, a); trooperTorso(t, pal, -2.5, -14, 5, 7, a); trooperHead(t, pal, 0, -15.5, 2, a);
      return;
    }
    const walking = Math.abs(s.targetWx - s.wx) > 1.5;
    const sw = walking ? Math.sin(s.phase) * 2.5 : 0;
    const t = new Xform(g, x, fy, 0, face, k);
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, fy, 9 * k, 2.5 * k);
    if (s.kneel) {
      t.line(pal.dark, 2.4, 0, -5, 3, -1); t.line(pal.dark, 2.4, 3, -1, 3, 0); // front leg
      t.line(pal.dark, 2.4, 0, -5, -4, 0);                                       // knee down
      if (look.pack) trooperPack(t, pal, -4, -10.5, 2, 4.5);
      trooperTorso(t, pal, -2.5, -11, 5, 7);
      this.arms(t, pal, -9, s, face);
      trooperHead(t, pal, 0.5, -12.8, 2);
    } else {
      t.line(pal.dark, 2.4, 0, -7, sw, 0); t.line(pal.dark, 2.4, 0, -7, -sw, 0);
      if (look.pack) trooperPack(t, pal, -4, -13.5, 2, 5);
      trooperTorso(t, pal, -2.5, -14, 5, 8);
      this.arms(t, pal, -12, s, face);
      trooperHead(t, pal, 0.5, -15.8, 2);
    }
    if (s.flash > 0) {
      const sh = s.kneel ? -9 : -12;
      t.circle(0xfff2a8, 9.5, sh, 1.8);
    }
  }

  /** Arms + rifle pointing roughly along the soldier's aim (limited to ±25° from level). */
  private arms(t: Xform, pal: SoldierPalette, shoulder: number, s: Soldier, face: number): void {
    const lean = Phaser.Math.Clamp(face === 1 ? s.aim : Math.PI - s.aim, -0.45, 0.45);
    const c = Math.cos(lean), sn = Math.sin(lean);
    t.line(pal.gun, 1.6, 1 - c * 2, shoulder - sn * 2, 1 + c * 9, shoulder + sn * 9);
    t.line(pal.uniform, 1.8, 0, shoulder, 1 + c * 4, shoulder + sn * 4);
  }

  // ── Internals: dogfights ─────────────────────────────────────────────────

  private newPair(delayX = 0): Pair {
    const fromLeft = this.rng.chance(0.5);
    const blueChases = this.rng.chance(0.5);
    const y = 90 + this.rng.next() * 170;
    const x = fromLeft ? -60 - delayX : W + 60 + delayX;
    const ang = fromLeft ? 0 : Math.PI;
    const mk = (side: Side, dx: number): FarJet => ({ side, x: x + dx, y: y + this.rng.next() * 20, ang, alive: true, fallVy: 0, spin: 0, smokeT: 0, burstT: 1 + this.rng.next() * 2 });
    const behind = fromLeft ? -90 : 90;
    return {
      target: mk(blueChases ? 'red' : 'blue', 0),
      chaser: mk(blueChases ? 'blue' : 'red', behind),
      wobble: this.rng.next() * 10,
    };
  }

  private updateDogfights(dt: number): void {
    const sp = BATTLE.farJetSpeed, turn = BATTLE.farJetTurn * dt;
    for (const pr of this.pairs) {
      const { target: tg, chaser: ch } = pr;
      pr.wobble += dt;
      // Target jinks: a slowly wandering heading, pulled back toward the sky box when it strays.
      if (tg.alive) {
        let want = tg.ang + Math.sin(pr.wobble * 0.9) * 0.9 * dt * 2;
        const right = Math.cos(tg.ang) >= 0;
        if (tg.y < 70) want = right ? 0.5 : Math.PI - 0.5;          // too high: nose down
        else if (tg.y > 300) want = right ? -0.5 : -(Math.PI - 0.5); // too low: pull up
        tg.ang += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - tg.ang), -turn, turn);
      }
      for (const j of [tg, ch]) this.moveJet(j, dt, sp);
      // Chaser pursues and fires bursts when lined up.
      if (ch.alive) {
        const toT = Math.atan2(tg.y - ch.y, tg.x - ch.x);
        if (tg.alive) ch.ang += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(toT - ch.ang), -turn * 1.1, turn * 1.1);
        ch.burstT -= dt;
        const d = Math.hypot(tg.x - ch.x, tg.y - ch.y);
        if (tg.alive && ch.burstT <= 0 && d < 260 && Math.abs(Phaser.Math.Angle.Wrap(toT - ch.ang)) < 0.35) {
          ch.burstT = 0.9 + this.rng.next() * 1.4;
          for (let k = 0; k < 3; k++) {
            const sx = ch.x + Math.cos(ch.ang) * 12, sy = ch.y + Math.sin(ch.ang) * 12;
            this.tracers.push({ x1: sx, y1: sy, x2: sx + Math.cos(ch.ang + (k - 1) * 0.04) * 90, y2: sy + Math.sin(ch.ang + (k - 1) * 0.04) * 90, life: 0.06 + k * 0.03, color: ch.side === 'blue' ? TRACER_BLUE : TRACER_RED, layer: 'sky' });
          }
          if (this.rng.chance(BATTLE.farKillChance)) {
            tg.alive = false; tg.spin = (this.rng.chance(0.5) ? 1 : -1) * 3;
            this.puffs.push({ x: tg.x, y: tg.y, r: 10, life: 0.4, max: 0.4, color: FX_PALETTE.fire });
          }
        }
      }
    }
    // Retire pairs that left the screen or crashed; send in new ones after a pause.
    const gone = (j: FarJet): boolean => j.x < -200 || j.x > W + 200 || j.y > 480;
    const before = this.pairs.length;
    this.pairs = this.pairs.filter(pr => !(gone(pr.target) && gone(pr.chaser)) && !(gone(pr.target) && !pr.target.alive && pr.chaser.x < -150));
    if (this.pairs.length < before) this.pairRespawn = BATTLE.farRespawn;
    if (this.pairs.length < BATTLE.dogfightPairs) {
      this.pairRespawn -= dt;
      if (this.pairRespawn <= 0) { this.pairs.push(this.newPair()); this.pairRespawn = BATTLE.farRespawn; }
    }
  }

  private moveJet(j: FarJet, dt: number, sp: number): void {
    if (!j.alive) {
      // Spin down trailing smoke.
      j.fallVy += 160 * dt; j.ang += j.spin * dt;
      j.x += Math.cos(j.ang) * sp * 0.5 * dt; j.y += (Math.sin(j.ang) * sp * 0.3 + j.fallVy) * dt;
      j.smokeT -= dt;
      if (j.smokeT <= 0) { j.smokeT = 0.05; this.puffs.push({ x: j.x, y: j.y, r: 4, life: 1.4, max: 1.4, color: FX_PALETTE.smoke }); }
      return;
    }
    j.x += Math.cos(j.ang) * sp * dt; j.y += Math.sin(j.ang) * sp * dt;
  }

  private drawTracer(g: Phaser.GameObjects.Graphics, t: Tracer, width: number): void {
    g.lineStyle(width * 2.2, t.color, 0.25); g.lineBetween(t.x1, t.y1, t.x2, t.y2);
    g.lineStyle(width, t.color, 0.95); g.lineBetween(t.x1, t.y1, t.x2, t.y2);
  }
}
