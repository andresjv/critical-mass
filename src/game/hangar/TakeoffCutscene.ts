// Takeoff cutscene: after the plane clears the bay doors, cut to a side view of the hangar
// on the level's terrain. The jet rolls out of the open door, races down the runway, lifts
// off and climbs away while the camera follows. Purely visual; ends after HANGAR.takeoffTime.
import Phaser from 'phaser';
import type { Biome } from '../theme/biomes';
import { PLAYER_JET } from '../theme/factions';
import { drawJet } from '../models/Vehicles';
import { Backdrop, hash01 } from '../effects/Backdrop';
import { HANGAR } from '../../state/tuning';

const W = 1280;
const H = 720;
const GROUND_Y = 610;
/** Jet start (inside the hangar door) and motion profile, px and px/s². */
const START_X = 240;
const ROLL_ACCEL = 430;
const LIFTOFF_T = 1.55;
const CLIMB_ACCEL = 270;
const MAX_PITCH = 0.36;
const FADE_IN = 0.3;
const FADE_OUT = 0.45;
/** Jet drawn larger than in the attack run so it reads next to the hangar. */
const JET_SCALE = 1.7;

export class TakeoffCutscene {
  private t = 0;
  private backdrop: Backdrop;
  private fg: Phaser.GameObjects.Graphics;
  private fade: Phaser.GameObjects.Graphics;
  private layers: Phaser.GameObjects.Graphics[];

  constructor(scene: Phaser.Scene, private readonly biome: Biome, seed: number, depth: number) {
    const sky = scene.add.graphics().setDepth(depth);
    const far = scene.add.graphics().setDepth(depth + 0.1);
    const mid = scene.add.graphics().setDepth(depth + 0.2);
    this.fg = scene.add.graphics().setDepth(depth + 0.3);
    this.fade = scene.add.graphics().setDepth(depth + 0.4);
    this.layers = [sky, far, mid, this.fg, this.fade];
    this.backdrop = new Backdrop(sky, far, mid, biome, seed);
  }

  get done(): boolean { return this.t >= HANGAR.takeoffTime; }
  /** 0..1 engine intensity for the audio. */
  get thrust(): number { return Math.min(1, 0.4 + this.t * 0.5); }

  update(dt: number): void { this.t += dt; }

  destroy(): void { for (const g of this.layers) g.destroy(); }

  render(time: number): void {
    const t = this.t;
    const x = START_X + 0.5 * ROLL_ACCEL * t * t;
    const vx = ROLL_ACCEL * t;
    const air = Math.max(0, t - LIFTOFF_T);
    const climb = 0.5 * CLIMB_ACCEL * air * air;
    const vy = CLIMB_ACCEL * air;
    const pitch = Math.min(MAX_PITCH, Math.atan2(vy, Math.max(vx, 1)) + (air > 0 ? 0.12 : 0));
    const camX = Math.max(0, x - 520);

    this.backdrop.draw(camX, time);
    const g = this.fg;
    g.clear();
    this.drawGround(g, camX);
    this.drawHangar(g, -camX);

    // The jet: wheels down on the runway, tucked away shortly after liftoff.
    const k = JET_SCALE, jx = x - camX, jy = GROUND_Y - 22 * k - climb;
    if (air < 0.35) {
      g.lineStyle(3 * k, 0x1a1a1a, 1);
      g.lineBetween(jx - 18 * k, jy + 6 * k, jx - 18 * k, jy + 15 * k); g.lineBetween(jx + 20 * k, jy + 6 * k, jx + 20 * k, jy + 15 * k);
      g.fillStyle(0x111111, 1); g.fillCircle(jx - 18 * k, jy + 17 * k, 5 * k); g.fillCircle(jx + 20 * k, jy + 17 * k, 4 * k);
    }
    if (air === 0 && t > 0.2) {
      // Jet wash kicking up dust behind the plane.
      for (let k = 0; k < 4; k++) {
        g.fillStyle(this.biome.ground.surface, 0.18 - k * 0.035);
        g.fillEllipse(jx - 60 - k * 34, GROUND_Y - 4 - k * 3, 50 + k * 26, 12 + k * 5);
      }
    }
    drawJet(g, jx, jy, PLAYER_JET, { facing: 1, rot: -pitch, thrust: 1, time, scale: k });

    // Fade in from the top-down hangar, fade out into the attack run.
    this.fade.clear();
    const a = t < FADE_IN ? 1 - t / FADE_IN
      : t > HANGAR.takeoffTime - FADE_OUT ? (t - (HANGAR.takeoffTime - FADE_OUT)) / FADE_OUT : 0;
    if (a > 0) { this.fade.fillStyle(0x000000, Math.min(1, a)); this.fade.fillRect(0, 0, W, H); }
  }

  private drawGround(g: Phaser.GameObjects.Graphics, camX: number): void {
    const gr = this.biome.ground;
    g.fillStyle(gr.fill, 1); g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    g.fillStyle(gr.band, 1); g.fillRect(0, GROUND_Y + 34, W, 8);
    // Runway strip with centre dashes and edge lights.
    g.fillStyle(0x2a2c2e, 1); g.fillRect(0, GROUND_Y - 2, W, 26);
    g.fillStyle(0xf2f2f2, 0.85);
    const off = camX % 80;
    for (let sx = -off; sx < W; sx += 80) g.fillRect(sx, GROUND_Y + 9, 40, 4);
    const loff = camX % 160;
    for (let sx = -loff; sx < W; sx += 160) {
      g.fillStyle(0xffe08a, 0.9); g.fillCircle(sx + 20, GROUND_Y - 2, 2.5);
      g.fillStyle(0xffe08a, 0.2); g.fillCircle(sx + 20, GROUND_Y - 2, 7);
    }
    g.fillStyle(gr.surface, 1); g.fillRect(0, GROUND_Y + 24, W, 3);
  }

  /** Arched hangar with the bay door open, lit inside. ox = screen x of the hangar's left. */
  private drawHangar(g: Phaser.GameObjects.Graphics, ox: number): void {
    if (ox < -520) return;
    const hp = this.biome.hangar;
    const left = ox + 30, right = ox + 470, top = 400, mid = (left + right) / 2;
    g.fillStyle(hp.wall, 1);
    g.fillRect(left, top, right - left, GROUND_Y - top);
    g.fillEllipse(mid, top, right - left, 150);
    // Corrugated ribs.
    g.lineStyle(3, hp.wallRib, 1);
    for (let x = left + 20; x < right; x += 28) {
      const dy = 75 * Math.sqrt(Math.max(0, 1 - ((x - mid) / ((right - left) / 2)) ** 2));
      g.lineBetween(x, top - dy + 4, x, GROUND_Y);
    }
    // Open door: lit interior with floor and lamps.
    const dl = left + 70, dr = right - 70, dt = 460;
    g.fillStyle(0x0b0d10, 1); g.fillRect(dl, dt, dr - dl, GROUND_Y - dt);
    g.fillStyle(hp.floor, 1); g.fillRect(dl, GROUND_Y - 30, dr - dl, 30);
    for (let k = 0; k < 3; k++) {
      const lx = dl + (dr - dl) * (k + 0.5) / 3;
      g.fillStyle(hp.lamp, 0.12); g.fillTriangle(lx, dt + 6, lx - 60, GROUND_Y - 30, lx + 60, GROUND_Y - 30);
      g.fillStyle(hp.lamp, 1); g.fillRect(lx - 8, dt + 4, 16, 4);
    }
    // Door panels slid aside, hazard trim, light spilling onto the apron.
    g.fillStyle(hp.wallRib, 1); g.fillRect(dl - 40, dt, 40, GROUND_Y - dt); g.fillRect(dr, dt, 40, GROUND_Y - dt);
    for (let y = dt; y < GROUND_Y; y += 16) {
      g.fillStyle((y / 16) % 2 === 0 ? 0xf2c218 : 0x1a1a1a, 1);
      g.fillRect(dl - 6, y, 6, 16); g.fillRect(dr, y, 6, 16);
    }
    g.fillStyle(hp.lamp, 0.1); g.fillEllipse(mid, GROUND_Y + 6, dr - dl + 120, 26);
    // Sign + roof beacon + a couple of sandbag piles outside.
    g.fillStyle(0xf2c218, 1); g.fillRect(mid - 30, dt - 30, 60, 16);
    g.fillStyle(0xd8322a, 0.9); g.fillCircle(mid, top - 75, 4);
    for (let k = 0; k < 4; k++) {
      const sx = right + 20 + k * 22, sy = GROUND_Y - 8 - (k % 2) * 2;
      g.fillStyle(0x7a6c48, 1); g.fillEllipse(sx + 1, sy + 2, 26, 13);
      g.fillStyle(0x9a8a62, 1); g.fillEllipse(sx, sy, 24, 12);
    }
    // Windsock pole.
    const wx = ox + 640 + hash01(3) * 40;
    g.lineStyle(3, 0x55595e, 1); g.lineBetween(wx, GROUND_Y - 2, wx, GROUND_Y - 90);
    g.fillStyle(0xff6a1a, 1); g.fillTriangle(wx, GROUND_Y - 90, wx, GROUND_Y - 76, wx + 40, GROUND_Y - 80);
  }
}
