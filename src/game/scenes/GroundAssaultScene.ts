// Ground Assault — after the attack run the pilot ejects and parachutes in as a soldier.
// 2D side-scroller: fight through enemy troops and machine-gun nests, over crates and sandbag
// walls, to the launch-control bunker and hit the big red button to abort the launch.
// The soldier can take GROUND.playerHits hits; going down costs a life (like a lost plane).
// Hold the wheel input (H / pad Y / touch GUNS) to pick one of the 4 carried guns.
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { PauseController } from '../PauseController';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { GROUND, SCORE, TUNING, type GunStats } from '../../state/tuning';
import { createRng, type Rng } from '../../state/rng';
import { armory, addCredits, gunDef, gunStats, SLOT_COUNT, type GunId } from '../../state/armory';
import { settings, haptic } from '../../state/settings';
import { showStageIntro } from '../../state/stageIntros';
import { getBiome, type Biome } from '../theme/biomes';
import { GROUND_FX as C } from '../theme/groundAssault';
import { Backdrop, hash01 } from '../effects/Backdrop';
import { Effects } from '../effects/Effects';
import { Xform } from '../models/shapes';
import { trooperHead, trooperPack, trooperTorso } from '../models/Trooper';
import { drawGun, MUZZLE } from '../models/Guns';
import { MusicTrack } from '../audio/MusicTrack';
import { playExplosion } from '../audio/ExplosionSound';
import { playReload, playShot } from '../audio/GunSound';
import { captureFrame, fadeFromCapture } from '../crossfade';
import { drawJet } from '../models/Vehicles';
import { playerJet } from '../theme/loadoutTheme';
import type { SoldierPalette } from '../theme/factions';

const W = 1280, H = 720;
const FIXED_DT = 1 / 60;
const GROUND_BASE = 610;
const SEG = 160;
/** Level runs from x = 0 to the bunker; a little extra world after it. */
const START_X = 230;

interface SceneData { launchIndex: number }

type BoxKind = 'crate' | 'sandbag' | 'barrel';
interface Box { x: number; w: number; top: number; bottom: number; kind: BoxKind; seed: number }

interface Enemy {
  kind: 'soldier' | 'nest';
  x: number; y: number; home: number;
  hp: number; maxHp: number;
  face: 1 | -1;
  alert: boolean;
  fireT: number;
  burstLeft: number;
  aim: number;
  flash: number;
  phase: number;
  walkDir: 1 | -1;
  deadT: number;
  hitT: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number; life: number;
  dmg: number; enemy: boolean; gun: GunId | null;
  pierce: boolean; splash: number; hit: Set<Enemy>;
}

interface GunState { id: GunId; ammo: number; reloadT: number }

export class GroundAssaultScene extends Phaser.Scene {
  private launchIndex = 0;
  private biome!: Biome;
  private rng!: Rng;
  private backdrop!: Backdrop;
  private fx!: Effects;
  private worldGfx!: Phaser.GameObjects.Graphics;
  private actorGfx!: Phaser.GameObjects.Graphics;
  private bulletGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private touchControls!: TouchControls;
  private pauseCtl!: PauseController;
  private visibilityHandler!: () => void;
  private music = new MusicTrack();

  private heights: number[] = [];
  private boxes: Box[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private bunkerX = 0;
  private camX = 0;
  private accumulator = 0;
  private time0 = 0;

  // Player.
  private px = START_X;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private face: 1 | -1 = 1;
  private onGround = false;
  private coyote = 0;
  private crouch = false;
  private state: 'chute' | 'live' | 'down' | 'won' = 'chute';
  private hits: number = GROUND.playerHits;
  private maxHits: number = GROUND.playerHits;
  private prevInteract = false;
  private invuln = 0;
  private phase = 0;
  private aim = 0;
  private flash = 0;
  private endT = 0;

  // Guns.
  private guns: (GunState | null)[] = [];
  private cur = 0;
  private fireT = 0;
  private burstLeft = 0;
  private burstT = 0;
  private wheelHi = -1;

  private prevFire = false;
  private prevAction = false;
  private prevUp = false;
  private prevWheel = false;

  constructor() { super({ key: 'GroundAssaultScene' }); }

  init(data: Partial<SceneData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.bullets = [];
    this.accumulator = 0;
    this.state = 'chute';
    this.maxHits = missionState.endless ? GROUND.endlessHits : GROUND.playerHits;
    this.hits = this.maxHits;
    this.invuln = 0;
    this.prevInteract = true;
    this.vx = 0; this.vy = 0; this.face = 1; this.crouch = false;
    this.fireT = 0; this.burstLeft = 0; this.wheelHi = -1; this.endT = 0;
    this.prevFire = true; this.prevAction = true; this.prevUp = true; this.prevWheel = false;
    gameUi.hull = this.hits; gameUi.hullMax = this.maxHits; gameUi.hullLabel = 'Health';
    gameUi.interactPrompt = null;
    gameUi.wheel = null;
    gameUi.stageResult = null;
    gameUi.showComingSoon = false;
  }

  create(): void {
    this.biome = getBiome(missionState.level);
    this.rng = createRng(missionState.seed + this.launchIndex * 977 + 5150);
    this.buildLevel();

    this.backdrop = new Backdrop(
      this.add.graphics().setDepth(0), this.add.graphics().setDepth(0.1), this.add.graphics().setDepth(0.5),
      this.biome, (missionState.seed % 1000) + this.launchIndex * 7 + 3,
    );
    this.worldGfx  = this.add.graphics().setDepth(1);
    this.actorGfx  = this.add.graphics().setDepth(2);
    this.bulletGfx = this.add.graphics().setDepth(3);
    this.fxGfx     = this.add.graphics().setDepth(4);
    this.fx = new Effects(this.fxGfx, (wx) => this.groundY(wx), createRng(missionState.seed + 77), () => undefined, this.biome.enemyJet);

    // Carried guns, each with a full magazine.
    this.guns = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const id = armory.slots[i];
      return id ? { id, ammo: gunStats(id).mag, reloadT: 0 } : null;
    });
    if (!this.guns.some(g => g)) this.guns[0] = { id: 'pistol', ammo: gunStats('pistol').mag, reloadT: 0 };
    this.cur = this.guns.findIndex(g => g !== null);

    // Parachute in from above the landing zone.
    this.px = START_X;
    this.py = this.groundY(this.px) - GROUND.chuteStartHeight;
    this.camX = 0;

    this.touchControls = new TouchControls(this, { move: 'MOVE', fire: 'SHOOT', action: 'JUMP', inventory: 'GUNS' });
    this.pauseCtl = new PauseController(this);

    gameUi.mapActive = false;
    gameUi.progressStep = 'ground';
    gameUi.launchNumber = this.launchIndex + 1;
    gameUi.objective = missionState.endless ? 'Fight through to the hangar and board your plane' : 'Fight to the launch bunker and hit the button';
    gameUi.contextualHint = null;
    missionState.hudCue = missionState.endless ? 'EJECTED! FIGHT TO THE HANGAR' : 'EJECTED! FIGHT TO THE LAUNCH BUTTON';
    showStageIntro(missionState.endless ? 'ground_endless' : 'ground');
    this.syncWeaponUi();

    this.visibilityHandler = () => { if (document.hidden) this.scene.pause(); else this.scene.resume(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once('shutdown', this.shutdown, this);

    fadeFromCapture(this, 1000, 500);
    this.music.start();
  }

  // ── Level ────────────────────────────────────────────────────────────────

  private buildLevel(): void {
    const len = GROUND.levelLength;
    this.bunkerX = len;
    const segs = Math.ceil((len + W) / SEG) + 2;
    this.heights = Array.from({ length: segs }, (_, i) => {
      const flat = i * SEG < 600 || Math.abs(i * SEG - len) < 500; // flat landing zone and bunker yard
      return GROUND_BASE + (flat ? 0 : (this.rng.next() - 0.5) * 70);
    });

    // Cover and platforms: crates, sandbag walls and barrels, spaced along the way.
    this.boxes = [];
    let x = 700;
    while (x < len - 450) {
      const r = this.rng.next();
      const kind: BoxKind = r < 0.5 ? 'crate' : r < 0.8 ? 'sandbag' : 'barrel';
      const w = kind === 'crate' ? 90 + this.rng.nextInt(3) * 40 : kind === 'sandbag' ? 130 + this.rng.nextInt(60) : 56;
      const h = kind === 'crate' ? 70 + this.rng.nextInt(3) * 35 : kind === 'sandbag' ? 52 : 74;
      const bottom = Math.max(this.groundY(x), this.groundY(x + w)) + 6;
      this.boxes.push({ x, w, top: bottom - h - 6, bottom, kind, seed: this.rng.nextInt(1000) });
      // Sometimes stack a second crate on the right end of a wide one for a high perch; the
      // exposed left part of the lower crate is the step up (a full stack is too tall to jump).
      if (kind === 'crate' && w >= 130 && this.rng.chance(0.4)) {
        const w2 = 80, x2 = x + w - w2, top = bottom - h - 6;
        this.boxes.push({ x: x2, w: w2, top: top - 80, bottom: top, kind: 'crate', seed: this.rng.nextInt(1000) });
      }
      x += w + 260 + this.rng.next() * 380;
    }

    // Enemy soldiers on the ground and on top of cover; machine-gun nests near the bunker.
    this.enemies = [];
    const harder = missionState.endless
      ? Math.min(GROUND.endlessMaxScale, 0.8 + missionState.endlessStage * GROUND.endlessStageScale)
      : 0.8 + this.launchIndex * 0.15;
    const count = Math.round((len / 1000) * GROUND.enemiesPer1000 * harder);
    for (let i = 0; i < count; i++) {
      const ex = 1000 + (i + this.rng.next() * 0.7) * ((len - 1300) / count);
      const perch = this.boxes.find(b => ex > b.x + 10 && ex < b.x + b.w - 10);
      const ey = perch ? Math.min(...this.boxes.filter(b => ex > b.x && ex < b.x + b.w).map(b => b.top)) : this.groundY(ex);
      this.enemies.push(this.newEnemy('soldier', ex, ey));
    }
    for (let n = 0; n < GROUND.nests; n++) {
      const nx = len - 1500 + n * 800 + this.rng.next() * 200;
      this.boxes = this.boxes.filter(b => b.x + b.w < nx - 90 || b.x > nx + 90);
      this.enemies.push(this.newEnemy('nest', nx, this.groundY(nx)));
    }
  }

  private newEnemy(kind: Enemy['kind'], x: number, y: number): Enemy {
    const hp = kind === 'nest' ? GROUND.nestHp : GROUND.enemyHp;
    return {
      kind, x, y, home: x, hp, maxHp: hp, face: -1, alert: false,
      fireT: 0.8 + this.rng.next() * GROUND.enemyFireInterval, burstLeft: 0,
      aim: Math.PI, flash: 0, phase: this.rng.next() * 6, walkDir: this.rng.chance(0.5) ? 1 : -1, deadT: 0, hitT: 0,
    };
  }

  /** Ground surface height at world x. */
  private groundY(wx: number): number {
    const f = Math.max(0, wx) / SEG;
    const i = Math.floor(f), t = f - i;
    const a = this.heights[Math.min(i, this.heights.length - 1)] ?? GROUND_BASE;
    const b = this.heights[Math.min(i + 1, this.heights.length - 1)] ?? GROUND_BASE;
    return a + (b - a) * t;
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.touchControls.update();
    const input = InputRouter.read();
    if (this.pauseCtl.update(input.pause)) { this.music.fadeOut(0.3); return; }
    this.music.start();

    // Weapon wheel: slows the game while held; the stick picks a slot, releasing equips it.
    const wheel = input.inventory && this.state !== 'down' && this.state !== 'won';
    if (wheel) {
      const m = Math.hypot(input.moveX, input.moveY);
      if (m > 0.5) {
        const a = Math.atan2(input.moveY, input.moveX); // 0 = right
        const slot = Math.abs(a) < Math.PI / 4 ? 1 : a >= Math.PI / 4 && a < (3 * Math.PI) / 4 ? 2 : Math.abs(a) >= (3 * Math.PI) / 4 ? 3 : 0;
        if (this.guns[slot]) this.wheelHi = slot;
      }
    } else if (this.prevWheel && this.wheelHi >= 0) {
      this.equip(this.wheelHi);
    }
    if (wheel && !this.prevWheel) this.wheelHi = this.cur;
    this.prevWheel = wheel;
    if (input.slot >= 1 && input.slot <= SLOT_COUNT) this.equip(input.slot - 1);

    const scale = wheel ? GROUND.wheelTimeScale : 1;
    this.accumulator += delta * 0.001 * scale;
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT, wheel ? 0 : input.moveX, wheel ? 0 : input.moveY, input.fire && !wheel, input.action && !wheel, input.interact && !wheel);
      this.fx.update(FIXED_DT, this.camX);
      this.accumulator -= FIXED_DT;
    }
    this.time0 = time;
    this.syncWeaponUi(wheel);
    this.render(time);
    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private step(dt: number, mx: number, my: number, fire: boolean, action: boolean, interact = false): void {
    const fireJust = fire && !this.prevFire, actionJust = action && !this.prevAction;
    const interactJust = interact && !this.prevInteract;
    this.prevInteract = interact;
    const up = my < -0.6, upJust = up && !this.prevUp;
    this.prevFire = fire; this.prevAction = action; this.prevUp = up;

    if (this.state === 'down' || this.state === 'won') {
      this.endT += dt;
      this.vy += GROUND.gravity * dt; this.py = Math.min(this.py + this.vy * dt, this.supportY(this.px, this.py));
      this.stepEnemies(dt); this.stepBullets(dt);
      return;
    }

    if (missionState.tickImpactClock(dt)) { this.finish(false); return; }
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);

    if (this.state === 'chute') {
      this.vx = mx * GROUND.chuteDrift;
      this.px = Math.max(60, this.px + this.vx * dt);
      this.py += GROUND.chuteSinkSpeed * dt;
      if (Math.abs(mx) > 0.2) this.face = mx > 0 ? 1 : -1;
      const sy = this.supportY(this.px, this.py - 10);
      if (this.py >= sy) { this.py = sy; this.state = 'live'; this.onGround = true; this.vy = 0; haptic(40); }
    } else {
      this.stepPlayer(dt, mx, my, actionJust || upJust);
    }
    this.stepGun(dt, fire, fireJust);
    this.stepEnemies(dt);
    this.stepBullets(dt);

    // Camera follows with a lead to the right.
    const want = Phaser.Math.Clamp(this.px - W * GROUND.cameraLead, 0, this.bunkerX + 380 - W);
    this.camX += (want - this.camX) * (1 - Math.exp(-6 * dt));

    // At the button (or, in Endless, the hangar)? Show the "Press T" pop-up; T presses it.
    const near = this.state === 'live' && this.onGround && Math.abs(this.px - this.buttonX()) < GROUND.buttonReach;
    gameUi.interactPrompt = near ? (missionState.endless ? 'Board your plane' : 'Press the launch abort button') : null;
    if (near && interactJust) this.win();
  }

  private stepPlayer(dt: number, mx: number, my: number, jump: boolean): void {
    this.crouch = this.onGround && my > 0.6;
    const speed = GROUND.walkSpeed * (this.crouch ? 0.35 : 1);
    this.vx += (mx * speed - this.vx) * (1 - Math.exp(-GROUND.walkResponse * dt));
    if (Math.abs(mx) > 0.15) this.face = mx > 0 ? 1 : -1;
    if (this.onGround && Math.abs(this.vx) > 20) this.phase += dt * Math.abs(this.vx) * 0.035;

    // Horizontal move with crate sides blocking.
    let nx = this.px + this.vx * dt;
    const head = this.py - this.height();
    for (const b of this.boxes) {
      if (this.py <= b.top + 2 || head >= b.bottom) continue;
      if (nx + GROUND.playerHalfW > b.x && nx - GROUND.playerHalfW < b.x + b.w) {
        nx = this.px <= b.x + b.w / 2 ? b.x - GROUND.playerHalfW : b.x + b.w + GROUND.playerHalfW;
        this.vx = 0;
      }
    }
    this.px = Phaser.Math.Clamp(nx, 40, this.bunkerX + 300);

    // Jump (with a little coyote time after stepping off a ledge).
    this.coyote = this.onGround ? GROUND.coyoteTime : Math.max(0, this.coyote - dt);
    if (jump && this.coyote > 0) { this.vy = -GROUND.jumpSpeed; this.onGround = false; this.coyote = 0; this.crouch = false; }

    // Gravity and landing on the ground or a crate top.
    this.vy += GROUND.gravity * dt;
    const ny = this.py + this.vy * dt;
    const sy = this.supportY(this.px, this.py);
    if (this.vy >= 0 && ny >= sy) { this.py = sy; this.vy = 0; this.onGround = true; }
    else { this.py = ny; this.onGround = false; }
  }

  /** Highest surface under x that the feet at `fromY` can stand on. */
  private supportY(x: number, fromY: number): number {
    let y = this.groundY(x);
    for (const b of this.boxes) {
      if (x + GROUND.playerHalfW * 0.6 < b.x || x - GROUND.playerHalfW * 0.6 > b.x + b.w) continue;
      if (b.top >= fromY - 4 && b.top < y) y = b.top;
    }
    return y;
  }

  private height(): number { return this.crouch ? GROUND.playerH * 0.62 : GROUND.playerH; }

  // ── Guns ─────────────────────────────────────────────────────────────────

  private gun(): GunState { return this.guns[this.cur] ?? this.guns.find(g => g)!; }

  private equip(slot: number): void {
    const g = this.guns[slot];
    if (!g || slot === this.cur) return;
    const old = this.gun();
    if (old.reloadT > 0) old.reloadT = 0; // reload interrupted: still empty
    this.cur = slot;
    this.burstLeft = 0;
    this.fireT = Math.max(this.fireT, 0.2);
    if (g.ammo === 0) this.startReload(g);
  }

  private startReload(g: GunState): void { g.reloadT = gunStats(g.id).reload; playReload(); }

  private stepGun(dt: number, fire: boolean, fireJust: boolean): void {
    const g = this.gun(), st = gunStats(g.id);
    this.fireT -= dt;
    if (g.reloadT > 0) {
      g.reloadT -= dt;
      if (g.reloadT <= 0) { g.reloadT = 0; g.ammo = st.mag; }
      return;
    }
    // Aim straight ahead, or at the nearest enemy in front within a small angle.
    this.aim = this.autoAim();
    if (this.burstLeft > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this.shoot(g, st); this.burstLeft--; this.burstT = 0.065; }
      return;
    }
    const trigger = st.auto ? fire : fireJust;
    if (trigger && this.fireT <= 0 && g.ammo > 0) {
      this.fireT = st.fireInterval;
      this.shoot(g, st);
      this.burstLeft = st.burst - 1; this.burstT = 0.065;
    }
  }

  private autoAim(): number {
    const base = this.face === 1 ? 0 : Math.PI;
    const m = this.muzzle(base);
    let best = Infinity, ang = base;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - m.x;
      if (Math.sign(dx) !== this.face || Math.abs(dx) > GROUND.enemySight) continue;
      const ty = e.y - (e.kind === 'nest' ? 34 : 44);
      const a = Math.atan2(ty - m.y, Math.abs(dx));
      if (Math.abs(a) > GROUND.autoAimAngle) continue;
      if (Math.abs(dx) < best) { best = Math.abs(dx); ang = this.face === 1 ? a : Math.PI - a; }
    }
    return ang;
  }

  /** Hand position (world) and the muzzle for the current gun at angle `a`. */
  private muzzle(a: number): { x: number; y: number; hx: number; hy: number } {
    const k = GROUND.soldierScale;
    const hx = this.px + this.face * 2 * k, hy = this.py - (this.crouch ? 7 : 11) * k;
    const len = MUZZLE[this.gun().id] * k * 0.8;
    return { x: hx + Math.cos(a) * len, y: hy + Math.sin(a) * len, hx, hy };
  }

  private shoot(g: GunState, st: GunStats): void {
    if (g.ammo <= 0) return;
    g.ammo--;
    const m = this.muzzle(this.aim);
    for (let p = 0; p < st.pellets; p++) {
      const a = this.aim + (this.rng.next() - 0.5) * 2 * st.spread;
      this.bullets.push({
        x: m.x, y: m.y, vx: Math.cos(a) * st.bulletSpeed, vy: Math.sin(a) * st.bulletSpeed, life: st.life,
        dmg: st.damage, enemy: false, gun: g.id, pierce: st.pierce, splash: st.splash, hit: new Set(),
      });
    }
    this.flash = 0.06;
    this.fx.muzzleFlash(m.x, m.y, this.aim);
    playShot(g.id);
    if (g.ammo === 0) this.startReload(g);
  }

  // ── Enemies ──────────────────────────────────────────────────────────────

  private stepEnemies(dt: number): void {
    const rate = TUNING[missionState.difficulty].enemyFireRate;
    const playerCy = this.py - this.height() * 0.55;
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      if (e.hp <= 0) { e.deadT += dt; continue; }
      const dx = this.px - e.x;
      const inSight = Math.abs(dx) < GROUND.enemySight && this.state !== 'won' && this.state !== 'down';
      if (inSight) e.alert = true;
      if (e.alert && e.kind === 'soldier') e.face = dx > 0 ? 1 : -1;

      // Patrol on the ground until alerted.
      if (e.kind === 'soldier' && !e.alert && Math.abs(e.y - this.groundY(e.x)) < 2) {
        e.x += e.walkDir * GROUND.enemyWalk * dt;
        e.face = e.walkDir;
        e.phase += dt * 6;
        if (Math.abs(e.x - e.home) > 70) e.walkDir = e.x > e.home ? -1 : 1;
        e.y = this.groundY(e.x);
      }
      if (!inSight) continue;

      const gy = e.y - (e.kind === 'nest' ? 30 : 46);
      const gx = e.x + (e.kind === 'nest' ? -40 : e.face * 26);
      e.aim = Math.atan2(playerCy - gy, this.px - gx);
      if (e.kind === 'nest') e.aim = Phaser.Math.Clamp(e.aim, Math.PI - 0.5, Math.PI + 0.5) * (this.px < e.x ? 1 : 1);
      e.fireT -= dt * rate;
      if (e.kind === 'nest') {
        if (this.px > e.x) continue; // only covers the approach
        if (e.burstLeft > 0) {
          if (e.fireT <= 0) { this.enemyShot(e, gx, gy, 0.08, 'nest'); e.burstLeft--; e.fireT = GROUND.nestShotGap; }
        } else if (e.fireT <= 0) { e.burstLeft = GROUND.nestBurst; e.fireT = GROUND.nestBurstGap; }
      } else if (e.fireT <= 0) {
        e.fireT = GROUND.enemyFireInterval * (0.8 + this.rng.next() * 0.5);
        this.enemyShot(e, gx, gy, 0.05, 'enemy');
      }
    }
  }

  private enemyShot(e: Enemy, x: number, y: number, spread: number, sound: 'enemy' | 'nest'): void {
    const a = e.aim + (this.rng.next() - 0.5) * 2 * spread;
    this.bullets.push({
      x, y, vx: Math.cos(a) * GROUND.enemyBulletSpeed, vy: Math.sin(a) * GROUND.enemyBulletSpeed, life: 2.2,
      dmg: 1, enemy: true, gun: null, pierce: false, splash: 0, hit: new Set(),
    });
    e.flash = 0.07;
    if (Math.abs(x - this.px) < W) playShot(sound);
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    if (e.hp <= 0) return;
    e.hp -= dmg; e.hitT = 0.12; e.alert = true;
    if (e.hp > 0) return;
    e.deadT = 0;
    const nest = e.kind === 'nest';
    missionState.addScore(nest ? GROUND.scoreNest : GROUND.scoreKill);
    const pts = nest ? GROUND.scoreNest : GROUND.scoreKill;
    if (missionState.endless) {
      // Credits are only earned in Endless.
      const cr = nest ? GROUND.creditsPerNest : GROUND.creditsPerKill;
      addCredits(cr);
      gameUi.creditsEarned += cr;
      missionState.hudCue = `+${pts}  ·  +${cr} CREDITS`;
    } else {
      missionState.hudCue = `+${pts}`;
    }
    if (nest) { this.fx.explosion(e.x, e.y - 30, 50, 10, false, true); playExplosion(45); }
  }

  // ── Bullets ──────────────────────────────────────────────────────────────

  private stepBullets(dt: number): void {
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.gun === 'rocket') b.vy += 120 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0) continue;
      // Cover and ground stop bullets (rockets explode).
      const box = this.boxes.find(bx => b.x > bx.x && b.x < bx.x + bx.w && b.y > bx.top && b.y < bx.bottom);
      if (box || b.y > this.groundY(b.x)) { this.impact(b); continue; }
      if (b.enemy) {
        if (this.state !== 'live' && this.state !== 'chute') continue;
        const top = this.py - this.height();
        if (Math.abs(b.x - this.px) < GROUND.playerHalfW && b.y > top && b.y < this.py) { b.life = 0; this.hitPlayer(); }
      } else {
        for (const e of this.enemies) {
          if (e.hp <= 0 || b.hit.has(e)) continue;
          const hw = e.kind === 'nest' ? 52 : 18, hh = e.kind === 'nest' ? 56 : 74;
          if (Math.abs(b.x - e.x) < hw && b.y > e.y - hh && b.y < e.y) {
            if (b.splash > 0) { this.impact(b); break; }
            this.damageEnemy(e, b.dmg);
            this.fx.smokePuff(b.x, b.y, 4);
            if (b.pierce) b.hit.add(e); else { b.life = 0; break; }
          }
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0 && b.x > this.camX - 200 && b.x < this.camX + W + 400);
  }

  private impact(b: Bullet): void {
    b.life = 0;
    if (b.splash > 0) {
      this.fx.explosion(b.x, b.y, 60, 10, false, true);
      playExplosion(50);
      for (const e of this.enemies) {
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - 30 - b.y) < b.splash) this.damageEnemy(e, b.dmg);
      }
      if (!settings.reducedFlashing) this.cameras.main.shake(120, 0.004);
    } else {
      this.fx.smokePuff(b.x, b.y, 3);
    }
  }

  private hitPlayer(): void {
    if (this.invuln > 0) return;
    this.hits--;
    gameUi.hull = this.hits;
    haptic(90);
    if (!settings.reducedFlashing) this.cameras.main.shake(140, 0.005);
    if (this.hits <= 0) { this.goDown(); return; }
    this.invuln = GROUND.hitInvuln;
    missionState.hudCue = this.hits === 1 ? 'ONE HIT LEFT!' : 'HIT!';
  }

  // ── Endings ──────────────────────────────────────────────────────────────

  private goDown(): void {
    this.state = 'down';
    this.endT = 0;
    this.vy = -300;
    missionState.hudCue = 'SOLDIER DOWN';
    this.music.fadeOut(0.8);
    this.time.delayedCall(1600, () => {
      missionState.losePlane();
      if (missionState.planes > 0) this.scene.restart({ launchIndex: this.launchIndex });
      else this.scene.start('GameOverScene');
    });
  }

  private buttonX(): number { return this.bunkerX + 150; }

  private win(): void {
    this.state = 'won';
    this.endT = 0;
    this.vx = 0;
    gameUi.interactPrompt = null;
    missionState.addScore(GROUND.scoreButton);
    if (missionState.endless) { this.boardPlane(); return; }
    missionState.siteDestroyed();
    missionState.hudCue = '';
    gameUi.callout = 'LAUNCH ABORTED';
    gameUi.calloutExpiry = Date.now() + 1800;
    haptic(150);
    this.time.delayedCall(2200, () => this.finish(true));
  }

  /** Endless: stage cleared at the hangar. Credits, then on to the next random biome's hangar. */
  private boardPlane(): void {
    addCredits(GROUND.creditsStage);
    gameUi.creditsEarned += GROUND.creditsStage;
    const cleared = missionState.endlessStage + 1;
    missionState.hudCue = '';
    gameUi.callout = `STAGE ${cleared} CLEARED  ·  +${GROUND.creditsStage} CREDITS`;
    gameUi.calloutExpiry = Date.now() + 1800;
    haptic(150);
    this.music.fadeOut(1);
    this.time.delayedCall(1600, () => {
      missionState.nextEndlessStage();
      gameUi.endlessStage = missionState.endlessStage + 1;
      captureFrame(this, () => this.scene.start('HangarScene', { launchIndex: missionState.endlessStage }));
    });
  }

  /** End of the stage: launch aborted (button pressed) or the clock ran out (city lost). */
  private finish(aborted: boolean): void {
    if (this.endT < 0) return;
    this.endT = -1;
    if (aborted && missionState.impactClock > 0) {
      missionState.addScore(Math.floor(missionState.impactClock) * SCORE.impactClockSecond);
    }
    if (!aborted) {
      missionState.cityLost();
      gameUi.callout = 'LAUNCH SUCCEEDED: CITY LOST';
      gameUi.calloutExpiry = Date.now() + 1800;
    }
    this.music.fadeOut(1);
    if (missionState.isGameOver) { this.scene.start('GameOverScene'); return; }
    gameUi.stageResult = {
      headline: aborted ? 'LAUNCH ABORTED' : 'LAUNCH SUCCEEDED',
      details: [aborted ? 'You hit the button in time' : 'The clock ran out'],
      next: 'Mission results',
    };
    this.time.delayedCall(2000, () => {
      gameUi.stageResult = null;
      this.scene.start('PlaceholderAssaultScene', { launchIndex: this.launchIndex });
    });
  }

  // ── HUD state ────────────────────────────────────────────────────────────

  private syncWeaponUi(wheel = false): void {
    const g = this.gun(), st = gunStats(g.id), d = gunDef(g.id);
    gameUi.weapon = {
      name: d.name, rarity: d.rarity, ammo: g.ammo, mag: st.mag,
      reload: g.reloadT > 0 ? 1 - g.reloadT / st.reload : -1, slot: this.cur,
    };
    gameUi.wheel = wheel ? {
      slots: this.guns.map(s => s ? { name: gunDef(s.id).name, rarity: gunDef(s.id).rarity, ammo: s.ammo, mag: gunStats(s.id).mag } : { name: '', rarity: '', ammo: 0, mag: 0 }),
      highlight: this.wheelHi, equipped: this.cur,
    } : null;
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private render(time: number): void {
    const cx = this.camX;
    this.backdrop.draw(cx, time);
    const g = this.worldGfx;
    g.clear();
    this.drawGround(g, cx);
    if (missionState.endless) this.drawHangar(g, this.bunkerX - cx, time);
    else this.drawBunker(g, this.bunkerX - cx, time);
    for (const b of this.boxes) if (b.x + b.w > cx - 20 && b.x < cx + W + 20) this.drawBox(g, b, cx);

    const a = this.actorGfx;
    a.clear();
    for (const e of this.enemies) if (e.x > cx - 120 && e.x < cx + W + 120) this.drawEnemy(a, e, cx, time);
    this.drawPlayer(a, cx, time);

    const bg = this.bulletGfx;
    bg.clear();
    for (const b of this.bullets) this.drawBullet(bg, b, cx);
    this.fx.render(cx, time);
  }

  private drawGround(g: Phaser.GameObjects.Graphics, cx: number): void {
    const gr = this.biome.ground;
    const pts: { x: number; y: number }[] = [];
    for (let sx = -SEG; sx <= W + SEG; sx += 20) pts.push({ x: sx, y: this.groundY(sx + cx) });
    g.fillStyle(gr.fill, 1);
    g.beginPath(); g.moveTo(-SEG, H);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.lineTo(W + SEG, H); g.closePath(); g.fillPath();
    g.lineStyle(6, gr.surface, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
    g.fillStyle(gr.band, 1);
    for (const p of pts) g.fillRect(p.x, p.y + 30, 20, 6);
    // Tufts / stones.
    for (let wx = Math.floor(cx / 70) * 70; wx < cx + W + 70; wx += 70) {
      const h = hash01(wx * 0.13);
      if (h < 0.45) continue;
      const sx = wx - cx + h * 30, sy = this.groundY(wx + h * 30);
      g.fillStyle(gr.decorColor, 1);
      g.fillTriangle(sx - 5, sy, sx, sy - 8 - h * 8, sx + 5, sy);
    }
  }

  private drawBox(g: Phaser.GameObjects.Graphics, b: Box, cx: number): void {
    const kit = this.biome.hangar.local.kit;
    const x = b.x - cx, w = b.w, top = b.top, h = b.bottom - b.top;
    if (b.kind === 'crate') {
      g.fillStyle(kit.crateDark, 1); g.fillRect(x, top, w, h);
      g.fillStyle(kit.crate, 1); g.fillRect(x + 4, top + 4, w - 8, h - 8);
      g.lineStyle(4, kit.crateDark, 1);
      g.lineBetween(x + 4, top + 4, x + w - 4, top + h - 4); g.lineBetween(x + w - 4, top + 4, x + 4, top + h - 4);
      g.fillStyle(kit.strap, 1); g.fillRect(x + w * 0.2, top, 6, h); g.fillRect(x + w * 0.8 - 6, top, 6, h);
    } else if (b.kind === 'sandbag') {
      const rows = Math.max(2, Math.round(h / 18));
      for (let r = 0; r < rows; r++) {
        const y = top + h - (r + 1) * (h / rows) + 2, off = r % 2 ? 14 : 0;
        for (let bx = x - off; bx < x + w; bx += 28) {
          const l = Math.max(x, bx), rr = Math.min(x + w, bx + 28);
          if (rr - l < 6) continue;
          g.fillStyle(kit.sandbagDark, 1); g.fillRoundedRect(l, y, rr - l, h / rows + 2, 6);
          g.fillStyle(kit.sandbag, 1); g.fillRoundedRect(l + 2, y + 1, rr - l - 4, h / rows - 3, 5);
        }
      }
    } else {
      g.fillStyle(kit.barrel, 1); g.fillRect(x, top, w, h);
      g.fillStyle(kit.barrelTop, 1); g.fillRect(x, top, w, 6);
      g.fillStyle(kit.barrelRed, 1); g.fillRect(x, top + h * 0.3, w, 7); g.fillRect(x, top + h * 0.7, w, 7);
    }
  }

  /** Endless goal: an open hangar with your plane waiting inside. */
  private drawHangar(g: Phaser.GameObjects.Graphics, x: number, time: number): void {
    if (x > W + 50 || x < -500) return;
    const gy = this.groundY(this.bunkerX + 150), top = gy - 220;
    g.fillStyle(C.concreteDark, 1); g.fillRect(x - 10, top + 40, 420, gy - top - 40);
    g.fillStyle(C.concreteLight, 1);
    g.beginPath(); g.arc(x + 200, top + 120, 215, Math.PI * 1.12, Math.PI * 1.88, false); g.closePath(); g.fillPath();
    g.fillStyle(C.concrete, 1); g.fillRect(x, top + 50, 400, gy - top - 50);
    // Open door and the lit bay inside.
    const dx = x + 40, dw = 300, dt = gy - 150;
    g.fillStyle(C.doorDark, 1); g.fillRect(dx, dt, dw, gy - dt);
    g.fillStyle(C.lamp, 0.12); g.fillTriangle(dx + dw / 2, dt + 6, dx, gy, dx + dw, gy);
    for (let i = 0; i < 3; i++) { g.fillStyle(C.lamp, 1); g.fillRect(dx + 40 + i * 100, dt + 4, 24, 5); }
    drawJet(g, dx + dw / 2 + 30, gy - 62, playerJet(), { facing: -1, rot: 0, thrust: 0, time, scale: 1.7 });
    for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? C.hazard : C.hazardDark, 1); g.fillRect(x + i * 33, top + 52, 33, 10); }
    if (this.state !== 'won') {
      const ay = dt - 40 + Math.sin(time * 0.006) * 6;
      g.fillStyle(C.hazard, 1);
      g.fillTriangle(this.buttonX() - this.camX - 16, ay, this.buttonX() - this.camX + 16, ay, this.buttonX() - this.camX, ay + 22);
    }
  }

  private drawBunker(g: Phaser.GameObjects.Graphics, x: number, time: number): void {
    if (x > W + 50 || x < -500) return;
    const gy = this.groundY(this.bunkerX + 150);
    const top = gy - 230;
    // Concrete bunker with a sloped roof, hazard band and open doorway.
    g.fillStyle(C.concreteDark, 1); g.fillRect(x - 10, top + 20, 400, gy - top - 20);
    g.fillStyle(C.concrete, 1); g.fillRect(x, top + 26, 380, gy - top - 26);
    g.fillStyle(C.concreteLight, 1);
    g.fillTriangle(x - 20, top + 30, x + 190, top - 30, x + 400, top + 30);
    for (let i = 0; i < 12; i++) {
      g.fillStyle(i % 2 ? C.hazard : C.hazardDark, 1);
      g.fillRect(x + i * 32, top + 34, 32, 12);
    }
    // Doorway with the console and the big red button inside.
    const dx = x + 90, dw = 140, dt = gy - 150;
    g.fillStyle(C.doorDark, 1); g.fillRect(dx, dt, dw, gy - dt);
    g.fillStyle(C.lamp, 0.15); g.fillTriangle(dx + dw / 2, dt + 6, dx, gy, dx + dw, gy);
    g.fillStyle(C.lamp, 1); g.fillRect(dx + dw / 2 - 10, dt + 4, 20, 5);
    const bx = this.buttonX() - this.camX;
    g.fillStyle(C.console, 1); g.fillRect(bx - 34, gy - 62, 68, 62);
    g.fillStyle(C.consoleLight, 1); g.fillRect(bx - 38, gy - 66, 76, 8);
    g.fillStyle(C.screen, 0.8); g.fillRect(bx - 24, gy - 50, 48, 18);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
    g.fillStyle(C.buttonGlow, 0.25 + 0.3 * pulse); g.fillCircle(bx, gy - 74, 26);
    g.fillStyle(C.buttonRim, 1); g.fillEllipse(bx, gy - 70, 34, 12);
    const pressed = this.state === 'won' ? 4 : 0;
    g.fillStyle(C.button, 1); g.fillEllipse(bx, gy - 76 + pressed, 26, 12);
    g.fillRect(bx - 13, gy - 76 + pressed, 26, 6 - pressed);
    // Arrow sign pointing at the door until the button is pressed.
    if (this.state !== 'won') {
      const ay = dt - 40 + Math.sin(time * 0.006) * 6;
      g.fillStyle(C.hazard, 1);
      g.fillTriangle(dx + dw / 2 - 16, ay, dx + dw / 2 + 16, ay, dx + dw / 2, ay + 22);
    }
  }

  private drawSoldier(
    a: Phaser.GameObjects.Graphics, x: number, y: number, face: 1 | -1, pal: SoldierPalette,
    o: { gun: GunId; aim: number; phase: number; moving: boolean; crouch?: boolean; air?: boolean; flash?: number; alpha?: number; time: number },
  ): void {
    const k = GROUND.soldierScale, al = o.alpha ?? 1;
    a.fillStyle(C.shadow, 0.22 * al); a.fillEllipse(x, this.groundY(x + this.camX) > y + 2 ? y : y, 12 * k, 2.6 * k);
    const t = new Xform(a, x, y, 0, face, k);
    const lift = o.crouch ? 4 : 0;
    const sw = o.moving ? Math.sin(o.phase) * 3 : 0;
    // Legs.
    if (o.air) {
      t.line(pal.dark, 2.4, 0, -7, 2.5, -3, al); t.line(pal.dark, 2.4, 2.5, -3, 1, 0, al);
      t.line(pal.dark, 2.4, 0, -7, -2.5, -2, al);
    } else if (o.crouch) {
      t.line(pal.dark, 2.4, 0, -3, 3, -1.5, al); t.line(pal.dark, 2.4, 3, -1.5, 3, 0, al);
      t.line(pal.dark, 2.4, 0, -3, -3, 0, al);
    } else {
      t.line(pal.dark, 2.4, 0, -7, sw, 0, al); t.line(pal.dark, 2.4, 0, -7, -sw, 0, al);
    }
    trooperPack(t, pal, -4, -13.5 + lift, 2, 5, al);
    trooperTorso(t, pal, -2.5, -14 + lift, 5, 8, al);
    trooperHead(t, pal, 0.5, -15.8 + lift, 2, al);
    // Gun in both hands along the aim (aim is in screen space; convert to the facing frame).
    const la = face === 1 ? o.aim : Math.PI - o.aim;
    const hx = 2, hy = -11 + lift;
    const gt = new Xform(a, 0, 0, 0, 1, 1);
    void gt;
    const p = t.p(hx, hy);
    const gunX = new Xform(a, p.x, p.y, face === 1 ? la : -la, face, k * 0.8);
    t.line(pal.uniform, 1.8, 0, -12.5 + lift, hx + Math.cos(la) * 1.5, hy + Math.sin(la) * 1.5, al);
    drawGun(gunX, o.gun, o.time);
    if (o.flash && o.flash > 0) gunX.circle(C.muzzle, MUZZLE[o.gun] + 1.5, -1.2, 2.2);
  }

  private drawEnemy(a: Phaser.GameObjects.Graphics, e: Enemy, cx: number, time: number): void {
    const x = e.x - cx, pal = this.biome.troops.red;
    if (e.kind === 'nest') {
      // Sandbag horseshoe with a heavy MG and the gunner's head and shoulders.
      const kit = this.biome.hangar.local.kit, gy = e.y;
      if (e.hp > 0) {
        const k = GROUND.soldierScale;
        const t = new Xform(a, x + 6, gy - 22, 0, -1, k);
        trooperTorso(t, pal, -2.5, -8, 5, 8);
        trooperHead(t, pal, 0.5, -9.8, 2);
        const gx = x - 40, gyy = gy - 30;
        a.lineStyle(7, C.gunMetal, 1); a.lineBetween(gx + 30, gyy, gx + 30 + Math.cos(e.aim) * 56, gyy + Math.sin(e.aim) * 56);
        if (e.flash > 0) { a.fillStyle(C.muzzle, 1); a.fillCircle(gx + 30 + Math.cos(e.aim) * 60, gyy + Math.sin(e.aim) * 60, 9); }
      }
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) {
        const bx = x - 56 + i * 24 + r * 12, by = gy - 14 - r * 14;
        a.fillStyle(kit.sandbagDark, 1); a.fillEllipse(bx, by + 2, 28, 16);
        a.fillStyle(e.hitT > 0 ? 0xffffff : kit.sandbag, 1); a.fillEllipse(bx, by, 26, 14);
      }
      if (e.hp > 0 && e.hp < e.maxHp) this.hpBar(a, x, gy - 96, e.hp / e.maxHp);
      return;
    }
    if (e.hp <= 0) {
      // Topples over and fades.
      const fade = e.deadT > 3 ? Math.max(0, 1 - (e.deadT - 3)) : 1;
      if (fade <= 0) return;
      const t = new Xform(a, x, e.y, Math.min(1, e.deadT / 0.35) * (Math.PI / 2) * -e.face, e.face, GROUND.soldierScale);
      trooperTorso(t, pal, -2.5, -14, 5, 8, fade); trooperHead(t, pal, 0.5, -15.8, 2, fade);
      t.line(pal.dark, 2.4, 0, -7, 1, 0, fade);
      return;
    }
    const moving = !e.alert && Math.abs(e.y - this.groundY(e.x)) < 2;
    this.drawSoldier(a, x, e.y, e.face, pal, { gun: 'rifle', aim: e.alert ? e.aim : (e.face === 1 ? 0 : Math.PI), phase: e.phase, moving, flash: e.flash, alpha: e.hitT > 0 ? 0.55 : 1, time });
    if (e.hp < e.maxHp) this.hpBar(a, x, e.y - 92, e.hp / e.maxHp);
  }

  private hpBar(a: Phaser.GameObjects.Graphics, x: number, y: number, f: number): void {
    a.fillStyle(0x000000, 0.5); a.fillRect(x - 22, y, 44, 6);
    a.fillStyle(f > 0.5 ? 0x5fd17a : f > 0.25 ? 0xffc23d : 0xff4b3e, 1); a.fillRect(x - 21, y + 1, 42 * f, 4);
  }

  private drawPlayer(a: Phaser.GameObjects.Graphics, cx: number, time: number): void {
    if (this.invuln > 0 && Math.floor(time / 80) % 2 === 0) return;
    const x = this.px - cx, y = this.py, pal = this.biome.troops.blue;
    if (this.state === 'chute') {
      // Canopy and lines.
      const k = GROUND.soldierScale, sway = Math.sin(time * 0.003) * 6;
      const top = y - 23 * k;
      a.lineStyle(2.5, C.chuteLine, 0.9);
      a.lineBetween(x - 2.5 * k, y - 13 * k, x - 16 * k + sway, top);
      a.lineBetween(x + 2.5 * k, y - 13 * k, x + 16 * k + sway, top);
      a.fillStyle(C.chute, 1); a.slice(x + sway, top + 4, 17 * k, Math.PI, 0, false); a.fillPath();
      a.fillStyle(C.chuteStripe, 1);
      a.beginPath(); a.slice(x + sway, top + 4, 17 * k, Math.PI * 1.4, Math.PI * 1.6, false); a.closePath(); a.fillPath();
    }
    if (this.state === 'down') {
      const t = new Xform(a, x, y, Math.min(1, this.endT / 0.4) * (Math.PI / 2) * -this.face, this.face, GROUND.soldierScale);
      trooperTorso(t, pal, -2.5, -14, 5, 8); trooperHead(t, pal, 0.5, -15.8, 2);
      return;
    }
    this.drawSoldier(a, x, y, this.face, pal, {
      gun: this.gun().id, aim: this.state === 'won' ? (this.face === 1 ? 0.5 : Math.PI - 0.5) : this.aim,
      phase: this.phase, moving: this.onGround && Math.abs(this.vx) > 20, crouch: this.crouch,
      air: this.state === 'chute' || !this.onGround, flash: this.flash, time,
    });
  }

  private drawBullet(g: Phaser.GameObjects.Graphics, b: Bullet, cx: number): void {
    const x = b.x - cx, sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
    if (b.gun === 'rocket') {
      g.lineStyle(8, C.rocket, 1); g.lineBetween(x - ux * 16, b.y - uy * 16, x, b.y);
      g.fillStyle(C.rocketFlame, 0.9); g.fillCircle(x - ux * 20, b.y - uy * 20, 5 + Math.sin(this.time0 * 0.05) * 2);
      return;
    }
    const laser = b.gun === 'laser';
    const len = laser ? 60 : b.enemy ? 18 : 24;
    const col = laser ? C.laser : b.enemy ? C.enemyBullet : C.playerBullet;
    g.lineStyle(laser ? 7 : 5, col, 0.3); g.lineBetween(x - ux * len, b.y - uy * len, x, b.y);
    g.lineStyle(laser ? 3 : 2.4, col, 1); g.lineBetween(x - ux * len, b.y - uy * len, x, b.y);
  }

  shutdown(): void {
    this.music.stop();
    gameUi.hullMax = 0;
    gameUi.hullLabel = 'Hull';
    gameUi.weapon = null;
    gameUi.wheel = null;
    gameUi.interactPrompt = null;
    gameUi.contextualHint = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }
}
