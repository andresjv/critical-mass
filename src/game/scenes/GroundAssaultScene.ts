// Ground Assault — after the attack run the pilot ejects and parachutes in as a soldier.
// 2D side-scroller: fight through enemy troops and machine-gun nests, past crates and sandbag
// walls, to the launch-control bunker and press the big red button (T) to abort the launch.
//
// Enemies come in types (FOES in tuning): riflemen who take cover beside crates and peek,
// SMG and shotgun rushers, machine gunners who hold ground, and pistol grenadiers who lob
// grenades. Unaware they patrol and glance around; on spotting you they show "!", then fight,
// duck, reload, flinch, run from grenades and fall when killed. Enemies stay on open ground.
//
// The player crouches beside cover to hide; holding fire pops up over it. J throws the side
// item (frag, firebomb, medkit), Q switches it. Everyone uses the animated SoldierRig.
import Phaser from 'phaser';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';
import { PauseController } from '../PauseController';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import {
  FOE_AI, FOES, GROUND, ITEMS, SCORE, SOLDIER_ANIM, TUNING, type FoeKind, type FoeStats, type GunStats,
} from '../../state/tuning';
import { createRng, type Rng } from '../../state/rng';
import { armory, gunDef, gunStats, syncUnlocks, SLOT_COUNT, type GunId } from '../../state/armory';
import { earnLevelAchievement, progress } from '../../state/progress';
import { foeRoster, foeTier } from '../../state/foes';
import { settings, haptic } from '../../state/settings';
import { showStageIntro } from '../../state/stageIntros';
import { getBiome, type Biome } from '../theme/biomes';
import { GROUND_FX as C } from '../theme/groundAssault';
import { soldierLook, type SoldierLook } from '../theme/troops';
import { Backdrop, hash01 } from '../effects/Backdrop';
import { Effects } from '../effects/Effects';
import { Xform } from '../models/shapes';
import { trooperHead, trooperTorso } from '../models/Trooper';
import { drawGun } from '../models/Guns';
import { basePose, drawSoldierRig, rigHand, rigHead, rigMuzzle, type SoldierPose } from '../models/SoldierRig';
import { MusicTrack } from '../audio/MusicTrack';
import { playExplosion } from '../audio/ExplosionSound';
import { playReload, playShot } from '../audio/GunSound';
import { captureFrame, fadeFromCapture } from '../crossfade';

const W = 1280, H = 720;
const FIXED_DT = 1 / 60;
const GROUND_BASE = 610;
const SEG = 160;
const START_X = 230;
const FOE_HALF_W = 18;
const FOE_GUN = { body: C.foeGun, accent: C.foeGunAccent };

interface SceneData { launchIndex: number }

type BoxKind = 'crate' | 'sandbag' | 'barrel';
interface Box { x: number; w: number; top: number; bottom: number; kind: BoxKind; seed: number }

type FoeState = 'idle' | 'patrol' | 'alert' | 'move' | 'cover' | 'peek' | 'fight' | 'reload' | 'throw' | 'flee' | 'dead';

interface Enemy {
  kind: FoeKind | 'nest';
  st: FoeStats;
  look: SoldierLook;
  x: number; y: number; vx: number; home: number;
  /** Patrol limits: open ground between the nearest boxes. */
  lo: number; hi: number;
  hp: number; maxHp: number;
  face: 1 | -1;
  aware: boolean;
  state: FoeState;
  stateT: number;
  /** "!" mark timer after spotting the player. */
  alertT: number;
  goal: number;
  coverBox: Box | null;
  fireT: number; burstLeft: number; burstT: number; bursts: number;
  throwCd: number; throwT: number; thrown: boolean;
  aim: number; flash: number;
  walk: number; move: number; crouch: number; kneel: boolean;
  hitT: number; flinchT: number; recoilT: number; lookT: number;
  deadT: number; deadDir: 1 | -1;
  walkDir: 1 | -1;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number; life: number;
  dmg: number; enemy: boolean; gun: GunId | null;
  pierce: boolean; splash: number; hit: Set<Enemy>;
}

type ItemKind = 'frag' | 'molotov' | 'medkit';
const ITEM_ORDER: readonly ItemKind[] = ['frag', 'molotov', 'medkit'];
const ITEM_NAME: Record<ItemKind, string> = { frag: 'Frag grenade', molotov: 'Firebomb', medkit: 'Medkit' };

interface Throwable {
  kind: 'frag' | 'molotov'; enemy: boolean;
  x: number; y: number; vx: number; vy: number; rot: number; fuse: number; resting: boolean;
}
interface Fire { x: number; w: number; t: number; tick: number }
interface Drop { x: number; y: number; vx: number; vy: number; rot: number; vr: number; gun: GunId; face: 1 | -1; t: number; rest: boolean }

interface GunState { id: GunId; ammo: number; reloadT: number }

export class GroundAssaultScene extends Phaser.Scene {
  private launchIndex = 0;
  private biome!: Biome;
  private rng!: Rng;
  private backdrop!: Backdrop;
  private fx!: Effects;
  private worldGfx!: Phaser.GameObjects.Graphics;
  private actorGfx!: Phaser.GameObjects.Graphics;
  /** Crates and sandbags draw over soldiers, so anyone beside cover is behind it. */
  private coverGfx!: Phaser.GameObjects.Graphics;
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
  private throwables: Throwable[] = [];
  private fires: Fire[] = [];
  private drops: Drop[] = [];
  private bunkerX = 0;
  private camX = 0;
  private accumulator = 0;
  private time0 = 0;
  private simT = 0;

  // Player.
  private px = START_X;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private face: 1 | -1 = 1;
  private onGround = false;
  private coyote = 0;
  private crouch = false;
  private crouchV = 0;
  private peekT = 0;
  private cover: Box | null = null;
  private state: 'chute' | 'live' | 'down' | 'won' = 'chute';
  private hits: number = GROUND.playerHits;
  private maxHits: number = GROUND.playerHits;
  private prevInteract = false;
  private invuln = 0;
  private phase = 0;
  private aim = 0;
  private flash = 0;
  private endT = 0;
  private landT = 0;
  private recoilT = 0;
  private flinchT = 0;
  private throwT: number | null = null;
  private thrown = false;

  // Guns and items.
  private guns: (GunState | null)[] = [];
  private cur = 0;
  private fireT = 0;
  private burstLeft = 0;
  private burstT = 0;
  private wheelHi = -1;
  private items: Record<ItemKind, number> = { ...ITEMS.start };
  private itemSel: ItemKind = 'frag';
  private itemCd = 0;

  private prevFire = false;
  private prevAction = false;
  private prevUp = false;
  private prevWheel = false;
  private prevItem = false;

  constructor() { super({ key: 'GroundAssaultScene' }); }

  init(data: Partial<SceneData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.bullets = []; this.throwables = []; this.fires = []; this.drops = [];
    this.accumulator = 0; this.simT = 0;
    this.state = 'chute';
    this.maxHits = missionState.endless ? GROUND.endlessHits : GROUND.playerHits;
    this.hits = this.maxHits;
    this.invuln = 0;
    this.prevInteract = true;
    this.vx = 0; this.vy = 0; this.face = 1; this.crouch = false; this.crouchV = 0; this.peekT = 0; this.cover = null;
    this.fireT = 0; this.burstLeft = 0; this.wheelHi = -1; this.endT = 0;
    this.landT = 0; this.recoilT = 0; this.flinchT = 0; this.throwT = null;
    this.items = { ...ITEMS.start }; this.itemSel = 'frag'; this.itemCd = 0;
    this.prevFire = true; this.prevAction = true; this.prevUp = true; this.prevWheel = false; this.prevItem = true;
    gameUi.hull = this.hits; gameUi.hullMax = this.maxHits; gameUi.hullLabel = 'Health';
    gameUi.interactPrompt = null;
    gameUi.wheel = null;
    gameUi.stageResult = null;
    gameUi.inCover = false;
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
    this.coverGfx  = this.add.graphics().setDepth(2.5);
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

    this.touchControls = new TouchControls(this, { move: 'MOVE', fire: 'SHOOT', action: 'JUMP', inventory: 'GUNS', item: 'ITEM' });
    this.pauseCtl = new PauseController(this);

    gameUi.mapActive = false;
    gameUi.progressStep = 'ground';
    gameUi.launchNumber = this.launchIndex + 1;
    gameUi.objective = missionState.endless ? 'Fight through to the hangar and board your plane' : 'Fight to the launch bunker and hit the button';
    gameUi.contextualHint = null;
    missionState.hudCue = missionState.endless ? 'EJECTED! FIGHT TO THE HANGAR' : 'EJECTED! FIGHT TO THE LAUNCH BUTTON';
    showStageIntro(missionState.endless ? 'ground_endless' : 'ground');
    this.syncUi();

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
      return GROUND_BASE + (flat ? 0 : (this.rng.next() - 0.5) * GROUND.hillHeight);
    });

    // Machine-gun nests near the bunker first, so cover and troops keep clear of them.
    const nestXs = Array.from({ length: GROUND.nests }, (_, n) => len - 1500 + n * 800 + this.rng.next() * 200);

    // Cover and platforms: crates, sandbag walls and barrels, spaced along the way.
    this.boxes = [];
    let x = 700;
    while (x < len - 450) {
      const r = this.rng.next();
      const kind: BoxKind = r < 0.5 ? 'crate' : r < 0.8 ? 'sandbag' : 'barrel';
      const w = kind === 'crate' ? 90 + this.rng.nextInt(3) * 40 : kind === 'sandbag' ? 130 + this.rng.nextInt(60) : 56;
      const h = kind === 'crate' ? 70 + this.rng.nextInt(3) * 35 : kind === 'sandbag' ? 52 : 74;
      const seed = this.rng.nextInt(1000);
      const stack = this.rng.chance(0.4);
      if (!nestXs.some(nx => x + w > nx - 140 && x < nx + 140)) {
        // Sits on the lowest ground under its whole width, so it never floats over a dip.
        const bottom = this.lowestGround(x, x + w) + 6;
        this.boxes.push({ x, w, top: bottom - h - 6, bottom, kind, seed });
        // Sometimes stack a second crate on the right end of a wide one for a high perch; the
        // exposed left part of the lower crate is the step up (a full stack is too tall to jump).
        if (kind === 'crate' && w >= 130 && stack) {
          const w2 = 80, x2 = x + w - w2, top = bottom - h - 6;
          this.boxes.push({ x: x2, w: w2, top: top - 80, bottom: top, kind: 'crate', seed: seed + 1 });
        }
      }
      x += w + 260 + this.rng.next() * 380;
    }

    // Enemy troops: only on open ground, never on or in front of cover or a nest.
    this.enemies = [];
    const harder = missionState.endless
      ? Math.min(GROUND.endlessMaxScale, 0.8 + missionState.endlessStage * GROUND.endlessStageScale)
      : 0.8 + this.launchIndex * 0.15;
    const count = Math.round((len / 1000) * GROUND.enemiesPer1000 * harder);
    const roster = foeRoster(this.rng, count, foeTier(this.launchIndex, missionState.endless, missionState.endlessStage));
    const clear = (ex: number) =>
      ex < len - 200 &&
      !this.boxes.some(b => ex + FOE_HALF_W + 30 > b.x && ex - FOE_HALF_W - 30 < b.x + b.w) &&
      !nestXs.some(nx => Math.abs(ex - nx) < 140) &&
      !this.enemies.some(o => Math.abs(o.x - ex) < 220);
    roster.forEach((kind, i) => {
      const want = 1000 + (i + this.rng.next() * 0.7) * ((len - 1300) / count);
      let ex = want;
      for (let d = 0; d < 400 && !clear(ex); d += 20) {
        if (clear(want + d)) { ex = want + d; break; }
        if (clear(want - d)) { ex = want - d; break; }
      }
      if (clear(ex)) this.enemies.push(this.newEnemy(kind, ex));
    });
    for (const nx of nestXs) this.enemies.push(this.newEnemy('nest', nx));
    // Patrol stretches never reach a neighbour's.
    const troops = this.enemies.filter(e => e.kind !== 'nest').sort((a, b) => a.x - b.x);
    troops.forEach((e, i) => {
      const prev = troops[i - 1], next = troops[i + 1];
      if (prev) e.lo = Math.max(e.lo, (prev.x + e.x) / 2 + FOE_AI.personalSpace / 2);
      if (next) e.hi = Math.min(e.hi, (e.x + next.x) / 2 - FOE_AI.personalSpace / 2);
    });
  }

  private newEnemy(kind: FoeKind | 'nest', x: number): Enemy {
    const st = FOES[kind === 'nest' ? 'gunner' : kind];
    const hp = kind === 'nest' ? GROUND.nestHp : st.hp;
    // Patrol only over the open ground between the nearest cover on each side.
    let lo = x - 90, hi = x + 90;
    for (const b of this.boxes) {
      if (b.x + b.w <= x) lo = Math.max(lo, b.x + b.w + FOE_HALF_W + 8);
      if (b.x >= x) hi = Math.min(hi, b.x - FOE_HALF_W - 8);
    }
    return {
      kind, st, look: soldierLook(this.biome.troops.red, Math.floor(x * 7.31) + this.launchIndex * 101),
      x, y: kind === 'nest' ? this.lowestGround(x - 70, x + 70) : this.groundY(x), vx: 0, home: x, lo, hi,
      hp, maxHp: hp, face: -1, aware: false, state: 'idle', stateT: 0.5 + this.rng.next() * 2, alertT: 0,
      goal: x, coverBox: null,
      fireT: 0.6 + this.rng.next() * st.fireInterval, burstLeft: 0, burstT: 0, bursts: 0,
      throwCd: st.throwInterval * (0.4 + this.rng.next() * 0.5), throwT: 0, thrown: false,
      aim: Math.PI, flash: 0, walk: this.rng.next() * 6, move: 0, crouch: 0, kneel: false,
      hitT: 0, flinchT: 0, recoilT: 0, lookT: FOE_AI.lookMin + this.rng.next() * 2,
      deadT: 0, deadDir: -1, walkDir: this.rng.chance(0.5) ? 1 : -1,
    };
  }

  /** Ground surface height at world x: smooth rolling hills (no sharp kinks). */
  private groundY(wx: number): number {
    const f = Math.max(0, wx) / SEG;
    const i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t);
    const a = this.heights[Math.min(i, this.heights.length - 1)] ?? GROUND_BASE;
    const b = this.heights[Math.min(i + 1, this.heights.length - 1)] ?? GROUND_BASE;
    return a + (b - a) * s;
  }

  /** Lowest ground (largest y) between x0 and x1. */
  private lowestGround(x0: number, x1: number): number {
    let y = -Infinity;
    for (let x = x0; x <= x1; x += 8) y = Math.max(y, this.groundY(x));
    return Math.max(y, this.groundY(x1));
  }

  private slopeAt(x: number): number { return (this.groundY(x + 8) - this.groundY(x - 8)) / 16; }

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
    if (input.itemNext) this.nextItem();

    const scale = wheel ? GROUND.wheelTimeScale : 1;
    this.accumulator += delta * 0.001 * scale;
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT, wheel ? 0 : input.moveX, wheel ? 0 : input.moveY, input.fire && !wheel, input.action && !wheel, input.interact && !wheel, input.item && !wheel);
      this.fx.update(FIXED_DT, this.camX);
      this.accumulator -= FIXED_DT;
    }
    this.time0 = time;
    this.syncUi(wheel);
    this.render(time);
    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private step(dt: number, mx: number, my: number, fire: boolean, action: boolean, interact = false, item = false): void {
    this.simT += dt;
    const fireJust = fire && !this.prevFire, actionJust = action && !this.prevAction;
    const interactJust = interact && !this.prevInteract, itemJust = item && !this.prevItem;
    this.prevInteract = interact; this.prevItem = item;
    const up = my < -0.6, upJust = up && !this.prevUp;
    this.prevFire = fire; this.prevAction = action; this.prevUp = up;
    this.landT = Math.max(0, this.landT - dt);
    this.recoilT = Math.max(0, this.recoilT - dt);
    this.flinchT = Math.max(0, this.flinchT - dt);

    if (this.state === 'down' || this.state === 'won') {
      this.endT += dt;
      this.vy += GROUND.gravity * dt; this.py = Math.min(this.py + this.vy * dt, this.supportY(this.px, this.py));
      this.stepEnemies(dt); this.stepBullets(dt); this.stepThrowables(dt); this.stepDrops(dt);
      return;
    }

    if (missionState.tickImpactClock(dt)) { this.finish(false); return; }
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.itemCd = Math.max(0, this.itemCd - dt);

    if (this.state === 'chute') {
      this.vx = mx * GROUND.chuteDrift;
      this.px = Math.max(60, this.px + this.vx * dt);
      this.py += GROUND.chuteSinkSpeed * dt;
      if (Math.abs(mx) > 0.2) this.face = mx > 0 ? 1 : -1;
      const sy = this.supportY(this.px, this.py - 10);
      if (this.py >= sy) { this.py = sy; this.state = 'live'; this.onGround = true; this.vy = 0; this.landT = SOLDIER_ANIM.landTime; haptic(40); }
    } else {
      this.stepPlayer(dt, mx, my, actionJust || upJust);
    }

    // Cover: crouched right beside a crate, sandbags or a barrel you face. Holding fire pops
    // you up over it for a moment.
    this.cover = this.findPlayerCover();
    if (this.cover && fire) this.peekT = SOLDIER_ANIM.peekHold;
    else this.peekT = Math.max(0, this.peekT - dt);
    const low = this.crouch && !(this.cover && this.peekT > 0);
    this.crouchV += ((low ? 1 : 0) - this.crouchV) * (1 - Math.exp(-14 * dt));

    this.stepGun(dt, fire, fireJust);
    this.stepItem(dt, itemJust);
    this.stepEnemies(dt);
    this.stepBullets(dt);
    this.stepThrowables(dt);
    this.stepDrops(dt);

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
    if (this.vy >= 0 && ny >= sy) {
      if (!this.onGround && this.vy > 400) this.landT = SOLDIER_ANIM.landTime;
      this.py = sy; this.vy = 0; this.onGround = true;
    } else { this.py = ny; this.onGround = false; }
  }

  /** Highest surface under x that feet at `fromY` can stand on. */
  private supportY(x: number, fromY: number): number {
    let y = this.groundY(x);
    for (const b of this.boxes) {
      if (x + GROUND.playerHalfW * 0.6 < b.x || x - GROUND.playerHalfW * 0.6 > b.x + b.w) continue;
      if (b.top >= fromY - 4 && b.top < y) y = b.top;
    }
    return y;
  }

  /** Standing on the ground (not a crate top): feet follow the slope. */
  private onSlope(x: number, y: number): boolean { return Math.abs(y - this.groundY(x)) < 2; }

  private height(): number { return this.crouchV > 0.5 ? GROUND.playerH * 0.62 : GROUND.playerH; }

  private findPlayerCover(): Box | null {
    if (this.state !== 'live' || !this.onGround || !this.crouch) return null;
    const crouchTop = this.py - GROUND.playerH * 0.62;
    for (const b of this.boxes) {
      if (b.top > crouchTop + 8 || b.bottom < this.py - 4) continue; // too low, or up on a stack
      const gap = this.face === 1 ? b.x - (this.px + GROUND.playerHalfW) : this.px - GROUND.playerHalfW - (b.x + b.w);
      if (gap >= -3 && gap < FOE_AI.coverGap) return b;
    }
    return null;
  }

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
    if (this.throwT !== null) return;
    // Aim straight ahead, or at the nearest enemy in front within a small angle.
    this.aim = this.autoAim();
    if (this.burstLeft > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this.shoot(g, st); this.burstLeft--; this.burstT = 0.065; }
      return;
    }
    // In cover, the first moment of holding fire is spent popping up.
    if (this.cover && this.crouchV > 0.5) return;
    const trigger = st.auto ? fire : fireJust;
    if (trigger && this.fireT <= 0 && g.ammo > 0) {
      this.fireT = st.fireInterval;
      this.shoot(g, st);
      this.burstLeft = st.burst - 1; this.burstT = 0.065;
    }
  }

  private autoAim(): number {
    const base = this.face === 1 ? 0 : Math.PI;
    const m = this.playerMuzzle(base);
    let best = Infinity, ang = base;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - m.x;
      if (Math.sign(dx) !== this.face || Math.abs(dx) > GROUND.enemySight) continue;
      const ty = e.y - (e.kind === 'nest' ? 34 : 44 - e.crouch * 14);
      const a = Math.atan2(ty - m.y, Math.abs(dx));
      if (Math.abs(a) > GROUND.autoAimAngle) continue;
      if (Math.abs(dx) < best) { best = Math.abs(dx); ang = this.face === 1 ? a : Math.PI - a; }
    }
    return ang;
  }

  private playerMuzzle(a: number): { x: number; y: number } {
    const p = this.playerPose(this.simT);
    p.aim = a; p.recoil = 0;
    return rigMuzzle(this.px, this.py, this.face, GROUND.soldierScale, p);
  }

  private shoot(g: GunState, st: GunStats): void {
    if (g.ammo <= 0) return;
    g.ammo--;
    const m = this.playerMuzzle(this.aim);
    for (let p = 0; p < st.pellets; p++) {
      const a = this.aim + (this.rng.next() - 0.5) * 2 * st.spread;
      this.bullets.push({
        x: m.x, y: m.y, vx: Math.cos(a) * st.bulletSpeed, vy: Math.sin(a) * st.bulletSpeed, life: st.life,
        dmg: st.damage, enemy: false, gun: g.id, pierce: st.pierce, splash: st.splash, hit: new Set(),
      });
    }
    this.flash = 0.06;
    this.recoilT = SOLDIER_ANIM.recoilTime;
    this.fx.muzzleFlash(m.x, m.y, this.aim);
    playShot(g.id);
    if (g.ammo === 0) this.startReload(g);
  }

  // ── Side items (J) ───────────────────────────────────────────────────────

  private nextItem(): void {
    const i = ITEM_ORDER.indexOf(this.itemSel);
    for (let k = 1; k <= ITEM_ORDER.length; k++) {
      const n = ITEM_ORDER[(i + k) % ITEM_ORDER.length];
      if (this.items[n] > 0 || k === ITEM_ORDER.length) { this.itemSel = n; return; }
    }
  }

  private stepItem(dt: number, use: boolean): void {
    if (this.throwT !== null) {
      this.throwT += dt / SOLDIER_ANIM.throwTime;
      if (!this.thrown && this.throwT >= 0.55) {
        this.thrown = true;
        const h = rigHand(this.px, this.py, this.face, GROUND.soldierScale, this.playerPose(this.simT));
        this.throwables.push({
          kind: this.itemSel === 'molotov' ? 'molotov' : 'frag', enemy: false,
          x: h.x, y: h.y, vx: this.face * ITEMS.throwSpeed + this.vx * 0.3, vy: -ITEMS.throwLift,
          rot: 0, fuse: ITEMS.fragFuse, resting: false,
        });
        if (this.items[this.itemSel] === 0) this.nextItem();
      }
      if (this.throwT >= 1) this.throwT = null;
      return;
    }
    if (!use || this.itemCd > 0 || this.state !== 'live') return;
    const kind = this.itemSel;
    if (this.items[kind] <= 0) { missionState.hudCue = 'NO ITEMS LEFT'; return; }
    this.itemCd = ITEMS.cooldown;
    if (kind === 'medkit') {
      if (this.hits >= this.maxHits) { missionState.hudCue = 'HEALTH FULL'; return; }
      this.items.medkit--;
      this.hits = Math.min(this.maxHits, this.hits + ITEMS.medkitHeal);
      gameUi.hull = this.hits;
      missionState.hudCue = '+HEALTH';
      playReload();
      if (this.items.medkit === 0) this.nextItem();
    } else {
      this.items[kind]--;
      this.throwT = 0; this.thrown = false;
    }
  }

  private stepThrowables(dt: number): void {
    for (const t of this.throwables) {
      if (!t.resting) {
        t.vy += ITEMS.gravity * dt;
        t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vx * dt * 0.03;
        const box = this.boxes.find(b => t.x > b.x && t.x < b.x + b.w && t.y > b.top && t.y < b.bottom);
        if (box) {
          if (t.kind === 'molotov') { this.burst(t, box.top); continue; }
          const fromSide = t.y - t.vy * dt > box.top + 4;
          if (fromSide) { t.vx *= -0.4; t.x = t.vx > 0 ? box.x + box.w + 2 : box.x - 2; }
          else { t.y = box.top; t.vy *= -0.35; t.vx *= 0.6; if (Math.abs(t.vy) < 60) { t.resting = true; t.vy = 0; } }
        }
        const gy = this.groundY(t.x);
        if (!t.resting && t.y >= gy) {
          t.y = gy;
          if (t.kind === 'molotov') { this.burst(t, gy); continue; }
          t.vy *= -0.35; t.vx *= 0.6;
          if (Math.abs(t.vy) < 60) { t.resting = true; t.vy = 0; }
        }
      }
      if (t.kind === 'frag') {
        t.fuse -= dt;
        if (t.fuse <= 0) {
          t.fuse = -99;
          this.blast(t.x, t.y - 10, ITEMS.fragRadius, t.enemy ? 0 : ITEMS.fragDamage, ITEMS.fragPlayerHits);
        }
      }
    }
    this.throwables = this.throwables.filter(t => t.fuse > -50 && t.y < H + 200);

    // Fire patches burn enemies standing in them (who run out of them).
    for (const f of this.fires) {
      f.t -= dt; f.tick -= dt;
      const tick = f.tick <= 0;
      if (tick) f.tick = ITEMS.burnTick;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.kind === 'nest' || Math.abs(e.x - f.x) > f.w / 2) continue;
        if (tick) this.damageEnemy(e, ITEMS.burnDamage, f.x, false);
        if (e.hp > 0 && e.state !== 'flee') this.flee(e, f.x);
      }
      if (tick && this.rng.chance(0.5)) this.fx.smokePuff(f.x + (this.rng.next() - 0.5) * f.w, this.groundY(f.x) - 30, 10);
    }
    this.fires = this.fires.filter(f => f.t > 0);
  }

  /** A firebomb shatters into a fire patch on the ground. */
  private burst(t: Throwable, _y: number): void {
    t.fuse = -99;
    this.fires.push({ x: t.x, w: ITEMS.burnWidth, t: ITEMS.burnSecs, tick: 0 });
    playExplosion(25);
  }

  /** Grenade blast: damages enemies (player grenades only) and the player inside it. */
  private blast(x: number, y: number, r: number, enemyDmg: number, playerHits: number): void {
    this.fx.explosion(x, y, r * 0.45, 10, false, true);
    playExplosion(50);
    if (!settings.reducedFlashing) this.cameras.main.shake(140, 0.005);
    if (enemyDmg > 0) for (const e of this.enemies) {
      if (e.hp > 0 && Math.hypot(e.x - x, e.y - 35 - y) < r) this.damageEnemy(e, enemyDmg, x, true);
    }
    if (this.state === 'live' && Math.hypot(this.px - x, this.py - this.height() / 2 - y) < r * 0.75) this.hitPlayer(playerHits);
  }

  private stepDrops(dt: number): void {
    for (const d of this.drops) {
      d.t += dt;
      if (d.rest) continue;
      d.vy += ITEMS.gravity * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      const gy = this.groundY(d.x) - 4;
      if (d.y >= gy) {
        d.y = gy; d.vy *= -0.3; d.vx *= 0.5; d.vr *= 0.4;
        if (Math.abs(d.vy) < 50) { d.rest = true; d.rot = Math.atan(this.slopeAt(d.x)) + (d.face === 1 ? 0 : Math.PI); }
      }
    }
    this.drops = this.drops.filter(d => d.t < 7);
  }

  // ── Enemies ──────────────────────────────────────────────────────────────

  private stepEnemies(dt: number): void {
    const rate = TUNING[missionState.difficulty].enemyFireRate;
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      if (e.hp <= 0) { e.deadT += dt; continue; }
      if (e.kind === 'nest') this.stepNest(e, dt, rate);
      else this.stepFoe(e, dt, rate);
    }
  }

  private playerOk(): boolean { return this.state === 'live' || this.state === 'chute'; }

  private playerCenterY(): number { return this.py - this.height() * 0.55; }

  private stepNest(e: Enemy, dt: number, rate: number): void {
    const dx = this.px - e.x;
    if (Math.abs(dx) > GROUND.enemySight || !this.playerOk() || this.px > e.x) return;
    const gx = e.x - 10, gy = e.y - 34;
    e.aim = Phaser.Math.Clamp(Math.atan2(this.playerCenterY() - gy, this.px - gx), Math.PI - 0.5, Math.PI + 0.5);
    e.fireT -= dt * rate;
    if (e.burstLeft > 0) {
      if (e.fireT <= 0) {
        this.foeBullet(e, gx + Math.cos(e.aim) * 60, gy + Math.sin(e.aim) * 60, 0.08, GROUND.enemyBulletSpeed, 1);
        playShot('nest');
        e.burstLeft--; e.fireT = GROUND.nestShotGap;
      }
    } else if (e.fireT <= 0) { e.burstLeft = GROUND.nestBurst; e.fireT = GROUND.nestBurstGap; }
  }

  private alertFoe(e: Enemy, delay: number = FOE_AI.alertTime): void {
    if (e.aware || e.hp <= 0 || e.kind === 'nest') return;
    e.aware = true;
    e.alertT = delay;
    e.state = 'alert';
    e.vx = 0;
  }

  private flee(e: Enemy, fromX: number): void {
    if (!e.aware) this.alertFoe(e, 0.15);
    e.state = 'flee';
    e.walkDir = e.x >= fromX ? 1 : -1;
    e.stateT = 0.9;
    e.burstLeft = 0;
    e.coverBox = null;
  }

  /** Cover for a foe: the far side of a crate / sandbag wall from the player, close by. */
  private pickCover(e: Enemy): Box | null {
    const side = this.px < e.x ? -1 : 1;
    let best: Box | null = null, bd = 380;
    for (const b of this.boxes) {
      if (b.bottom - b.top < 48 || b.bottom < this.groundY(b.x + b.w / 2) - 8) continue; // short or stacked
      if (side < 0 ? this.px > b.x : this.px < b.x + b.w) continue; // must be between us
      const gx = this.coverSpot(b, side);
      if (this.boxes.some(o => o !== b && gx + FOE_HALF_W > o.x && gx - FOE_HALF_W < o.x + o.w)) continue;
      if (this.enemies.some(o => o !== e && o.hp > 0 && (o.coverBox === b || Math.abs(o.x - gx) < FOE_AI.personalSpace))) continue; // taken
      const d = Math.abs(gx - e.x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private coverSpot(b: Box, playerSide: number): number {
    return playerSide < 0 ? b.x + b.w + FOE_HALF_W + 6 : b.x - FOE_HALF_W - 6;
  }

  private stepFoe(e: Enemy, dt: number, rate: number): void {
    const st = e.st;
    e.flinchT = Math.max(0, e.flinchT - dt);
    e.recoilT = Math.max(0, e.recoilT - dt);
    e.alertT = Math.max(0, e.alertT - dt);
    const dx = this.px - e.x, adx = Math.abs(dx);
    let want = 0, crouch = 0;

    // Run from a live grenade nearby.
    if (e.state !== 'flee') {
      const nade = this.throwables.find(t => t.kind === 'frag' && !t.enemy && Math.abs(t.x - e.x) < FOE_AI.fleeRadius);
      if (nade) this.flee(e, nade.x);
    }

    if (!e.aware) {
      // Spot the player (harder to notice someone hiding behind cover).
      const hidden = this.cover !== null && adx > 260;
      if (this.playerOk() && adx < Math.max(st.range, GROUND.enemySight) && !hidden) {
        this.alertFoe(e);
        for (const o of this.enemies) if (o !== e && Math.abs(o.x - e.x) < 320) this.alertFoe(o, FOE_AI.alertTime + 0.25);
      }
    }

    if (!e.aware) {
      // Patrol a short stretch of open ground, stop, glance around.
      e.stateT -= dt;
      if (e.state === 'patrol') {
        want = e.walkDir * GROUND.enemyWalk;
        e.face = e.walkDir;
        if ((e.walkDir > 0 && e.x >= e.hi) || (e.walkDir < 0 && e.x <= e.lo) || e.stateT <= 0) {
          e.state = 'idle'; e.stateT = 1 + this.rng.next() * 1.8;
        }
      } else {
        e.lookT -= dt;
        if (e.lookT <= 0) { e.face = e.face === 1 ? -1 : 1; e.lookT = FOE_AI.lookMin + this.rng.next() * (FOE_AI.lookMax - FOE_AI.lookMin); }
        if (e.stateT <= 0 && e.hi - e.lo > 30) {
          e.state = 'patrol'; e.stateT = 2.5;
          e.walkDir = e.x > (e.lo + e.hi) / 2 ? -1 : 1;
        }
      }
    } else {
      const face: 1 | -1 = dx > 0 ? 1 : -1;
      switch (e.state) {
        case 'alert':
          e.face = face;
          if (e.alertT <= 0) this.decide(e);
          break;
        case 'move':
          want = Math.sign(e.goal - e.x) * st.moveSpeed;
          e.face = want > 0 ? 1 : -1;
          if (Math.abs(e.goal - e.x) < 8) { e.vx = 0; e.state = e.coverBox ? 'cover' : 'fight'; e.stateT = this.duckTime(); }
          break;
        case 'cover':
          e.face = face; crouch = 1;
          e.stateT -= dt;
          if (e.stateT <= 0) { e.state = 'peek'; e.stateT = FOE_AI.peekTime; }
          break;
        case 'peek':
          e.face = face;
          e.stateT -= dt;
          if (e.stateT <= 0 && e.burstLeft === 0) { e.state = 'cover'; e.stateT = this.duckTime(); }
          break;
        case 'fight':
          e.face = face;
          crouch = e.kneel ? 1 : 0;
          e.stateT -= dt;
          if (e.stateT <= 0) { e.kneel = st.style !== 'rush' && this.rng.chance(0.5); e.stateT = 1.5 + this.rng.next() * 2; }
          if (st.style === 'rush' && adx > FOE_AI.rushStop + 30) want = face * st.moveSpeed;
          break;
        case 'reload':
          e.face = face;
          crouch = e.coverBox || e.kneel ? 1 : 0;
          e.stateT -= dt;
          if (e.stateT <= 0) { e.bursts = 0; e.state = e.coverBox ? 'cover' : 'fight'; e.stateT = 0.3; }
          break;
        case 'throw':
          e.face = face;
          e.throwT += dt / 0.55;
          if (!e.thrown && e.throwT >= 0.55) { e.thrown = true; this.foeThrow(e); }
          if (e.throwT >= 1) { e.state = e.coverBox ? 'cover' : 'fight'; e.stateT = 0.6; }
          break;
        case 'flee':
          want = e.walkDir * st.moveSpeed * 1.3;
          e.face = e.walkDir;
          e.stateT -= dt;
          if (e.stateT <= 0) this.decide(e);
          break;
        default:
          this.decide(e);
      }

      // Shooting: only standing up out of cover, or in the open.
      const canShoot = (e.state === 'peek' || e.state === 'fight') && e.flinchT <= 0 && this.playerOk() && adx < st.range;
      if (canShoot) {
        if (e.burstLeft > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) {
            this.foeShoot(e);
            e.burstLeft--; e.burstT = st.burstGap;
            if (e.burstLeft === 0 && ++e.bursts >= FOE_AI.burstsPerReload) { e.state = 'reload'; e.stateT = FOE_AI.reloadTime; playReload(); }
          }
        } else {
          e.fireT -= dt * rate;
          e.throwCd -= dt * rate;
          if (st.throwInterval > 0 && e.throwCd <= 0 && adx > 160) {
            e.throwCd = st.throwInterval * (0.85 + this.rng.next() * 0.3);
            e.state = 'throw'; e.throwT = 0; e.thrown = false;
          } else if (e.fireT <= 0) {
            e.fireT = st.fireInterval * (0.85 + this.rng.next() * 0.3);
            e.burstLeft = st.burst; e.burstT = 0;
          }
        }
      } else if (e.state !== 'peek' && e.state !== 'fight') {
        e.burstLeft = 0;
      }
    }

    // Movement on open ground only: cover stops them (they never climb on it).
    e.vx += (want - e.vx) * (1 - Math.exp(-10 * dt));
    let nx = e.x + e.vx * dt;
    for (const b of this.boxes) {
      if (nx + FOE_HALF_W > b.x && nx - FOE_HALF_W < b.x + b.w) {
        nx = e.x <= b.x + b.w / 2 ? b.x - FOE_HALF_W : b.x + b.w + FOE_HALF_W;
        e.vx = 0;
        if (e.state === 'move' || e.state === 'flee') { e.state = 'fight'; e.coverBox = null; e.stateT = 1; }
        else if (e.state === 'patrol') { e.state = 'idle'; e.stateT = 1; }
      }
    }
    // Never overlap: keep at least personalSpace from other troops and from the player. Moving
    // toward someone stops at that distance; if already too close, step apart.
    for (const o of this.enemies) {
      if (o === e || o.hp <= 0 || o.kind === 'nest') continue;
      const space = FOE_AI.personalSpace;
      const d = nx - o.x;
      if (Math.abs(d) >= space) continue;
      const side = Math.sign(d || (e.home - o.home) || 1);
      const was = Math.abs(e.x - o.x);
      nx = was >= space ? o.x + side * space : e.x + side * Math.min(120 * dt, space - was);
      if (e.state === 'move' && Math.abs(e.goal - o.x) < space) { e.state = 'fight'; e.coverBox = null; e.stateT = 1; }
    }
    for (const o of this.enemies) {
      if (o.kind === 'nest' && o.hp > 0 && Math.abs(nx - o.x) < FOE_AI.nestSpace) nx = e.x;
    }
    if (this.playerOk() && Math.abs(nx - this.px) < FOE_AI.personalSpace && Math.abs(this.py - e.y) < 40) {
      nx = this.px + Math.sign(nx - this.px || -this.face) * FOE_AI.personalSpace;
    }
    for (const b of this.boxes) if (nx + FOE_HALF_W > b.x && nx - FOE_HALF_W < b.x + b.w) nx = e.x;
    e.x = Phaser.Math.Clamp(nx, 40, this.bunkerX - 40);
    e.y = this.groundY(e.x);
    e.walk += dt * Math.abs(e.vx) * 0.04;
    e.move += (Math.min(1, Math.abs(e.vx) / 200) - e.move) * (1 - Math.exp(-10 * dt));
    e.crouch += (crouch - e.crouch) * (1 - Math.exp(-10 * dt));
  }

  private duckTime(): number { return FOE_AI.coverDuckMin + this.rng.next() * (FOE_AI.coverDuckMax - FOE_AI.coverDuckMin); }

  /** Next move after spotting the player or finishing a run. */
  private decide(e: Enemy): void {
    e.coverBox = null;
    if (e.st.style === 'cover') {
      const b = this.pickCover(e);
      if (b) {
        e.coverBox = b;
        e.goal = this.coverSpot(b, this.px < e.x ? -1 : 1);
        e.state = 'move';
        return;
      }
    }
    e.state = 'fight';
    e.kneel = e.st.style !== 'rush' && this.rng.chance(0.5);
    e.stateT = 1 + this.rng.next() * 2;
  }

  private foePose(e: Enemy, time: number): SoldierPose {
    const p = basePose(e.st.gun, e.aware ? e.aim : (e.face === 1 ? 0.15 : Math.PI - 0.15), time);
    p.walk = e.walk; p.move = e.move; p.crouch = e.crouch;
    p.recoil = e.recoilT / SOLDIER_ANIM.recoilTime;
    p.flinch = e.flinchT / FOE_AI.flinchTime;
    p.relaxed = !e.aware || e.state === 'alert' || e.state === 'flee' || e.state === 'move';
    p.reload = e.state === 'reload' ? 1 - e.stateT / FOE_AI.reloadTime : null;
    p.throwT = e.state === 'throw' ? Math.min(1, e.throwT) : null;
    p.flash = e.flash > 0;
    p.slope = this.slopeAt(e.x);
    p.pack = e.look.pack;
    p.gunTint = FOE_GUN;
    if (e.hp <= 0) {
      p.dead = e.deadT / 0.4; p.deadDir = e.deadDir; p.move = 0; p.relaxed = true; p.flinch = 0;
      p.alpha = e.deadT > 3 ? Math.max(0, 1 - (e.deadT - 3)) : 1;
    }
    return p;
  }

  private foeShoot(e: Enemy): void {
    const st = e.st, k = GROUND.soldierScale * e.look.scale;
    const pose = this.foePose(e, this.simT);
    pose.recoil = 0;
    pose.aim = Math.atan2(this.playerCenterY() - (e.y - 46), this.px - e.x);
    const m0 = rigMuzzle(e.x, e.y, e.face, k, pose);
    e.aim = Math.atan2(this.playerCenterY() - m0.y, this.px - m0.x);
    pose.aim = e.aim;
    const m = rigMuzzle(e.x, e.y, e.face, k, pose);
    for (let i = 0; i < st.pellets; i++) this.foeBullet(e, m.x, m.y, st.spread, st.bulletSpeed, st.damage);
    e.recoilT = SOLDIER_ANIM.recoilTime;
    if (Math.abs(m.x - this.px) < W) playShot(st.gun);
  }

  private foeBullet(e: Enemy, x: number, y: number, spread: number, speed: number, dmg: number): void {
    const a = e.aim + (this.rng.next() - 0.5) * 2 * spread;
    this.bullets.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 2.2,
      dmg, enemy: true, gun: null, pierce: false, splash: 0, hit: new Set(),
    });
    e.flash = 0.07;
  }

  /** Grenadier lob: a ballistic arc landing at the player's feet. */
  private foeThrow(e: Enemy): void {
    const h = rigHand(e.x, e.y, e.face, GROUND.soldierScale * e.look.scale, this.foePose(e, this.simT));
    const T = ITEMS.foeThrowTime, g = ITEMS.gravity;
    const tx = this.px + this.vx * 0.4, ty = this.py - 6;
    this.throwables.push({
      kind: 'frag', enemy: true, x: h.x, y: h.y,
      vx: (tx - h.x) / T, vy: (ty - h.y - 0.5 * g * T * T) / T,
      rot: 0, fuse: T + 0.6, resting: false,
    });
  }

  private damageEnemy(e: Enemy, dmg: number, fromX: number, knock = true): void {
    if (e.hp <= 0) return;
    e.hp -= dmg; e.hitT = 0.12;
    if (e.kind === 'nest') {
      if (e.hp <= 0) {
        const pts = missionState.addKill(GROUND.scoreNest);
        missionState.hudCue = `+${pts}`;
        this.fx.explosion(e.x, e.y - 30, 50, 10, false, true); playExplosion(45);
      }
      return;
    }
    e.flinchT = FOE_AI.flinchTime;
    const push = e.x >= fromX ? 1 : -1;
    if (knock) e.vx += push * FOE_AI.knockback;
    if (!e.aware) this.alertFoe(e, 0.2);
    if (e.hp > 0) return;
    e.state = 'dead';
    e.deadT = 0;
    e.vx = 0;
    e.deadDir = push === e.face ? 1 : -1; // falls away from the shot
    const pts = missionState.addKill(GROUND.scoreKill);
    missionState.hudCue = `+${pts}`;
    // The gun drops and clatters to the ground.
    const m = rigMuzzle(e.x, e.y, e.face, GROUND.soldierScale * e.look.scale, this.foePose(e, this.simT));
    this.drops.push({
      x: (m.x + e.x) / 2, y: m.y, vx: push * (80 + this.rng.next() * 80), vy: -260 - this.rng.next() * 120,
      rot: e.face === 1 ? 0 : Math.PI, vr: push * (6 + this.rng.next() * 6), gun: e.st.gun, face: e.face, t: 0, rest: false,
    });
    for (const o of this.enemies) if (o !== e && Math.abs(o.x - e.x) < 350) this.alertFoe(o, 0.3);
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
        if (!this.playerOk()) continue;
        const top = this.py - this.height();
        if (Math.abs(b.x - this.px) < GROUND.playerHalfW && b.y > top && b.y < this.py) { b.life = 0; this.hitPlayer(b.dmg); }
      } else {
        for (const e of this.enemies) {
          if (e.hp <= 0 || b.hit.has(e)) continue;
          const nest = e.kind === 'nest';
          const hw = nest ? 52 : FOE_HALF_W, hh = nest ? 56 : 74 * e.look.scale * (1 - e.crouch * 0.33);
          if (Math.abs(b.x - e.x) < hw && b.y > e.y - hh && b.y < e.y) {
            if (b.splash > 0) { this.impact(b); break; }
            this.damageEnemy(e, b.dmg, b.x - b.vx * 0.05);
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
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - 30 - b.y) < b.splash) this.damageEnemy(e, b.dmg, b.x);
      }
      if (!settings.reducedFlashing) this.cameras.main.shake(120, 0.004);
    } else {
      this.fx.smokePuff(b.x, b.y, 3);
    }
  }

  private hitPlayer(n = 1): void {
    if (this.invuln > 0 || !this.playerOk()) return;
    this.hits -= n;
    gameUi.hull = Math.max(0, this.hits);
    this.flinchT = FOE_AI.flinchTime;
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
    this.throwT = null;
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
    haptic(150);
    // Beating the level earns its achievement (and unlocks a gun) the first time.
    const earned = earnLevelAchievement(missionState.level);
    const newGuns = syncUnlocks(progress.achieved);
    if (earned) {
      gameUi.callout = `ACHIEVEMENT UNLOCKED: ${earned.name.toUpperCase()}${newGuns.length ? ` · NEW GUN: ${gunDef(newGuns[0]).name.toUpperCase()}` : ''}`;
      gameUi.calloutExpiry = Date.now() + 4000;
    }
    this.time.delayedCall(900, () => this.finish(true));
  }

  /** Endless: stage cleared at the hangar. Credits, then on to the next random biome's hangar. */
  private boardPlane(): void {
    const cleared = missionState.endlessStage + 1;
    missionState.hudCue = '';
    gameUi.callout = `STAGE ${cleared} CLEARED`;
    gameUi.calloutExpiry = Date.now() + 1800;
    haptic(150);
    this.music.fadeOut(1);
    this.time.delayedCall(1600, () => {
      missionState.nextEndlessStage();
      gameUi.endlessStage = missionState.endlessStage + 1;
      captureFrame(this, () => this.scene.start('HangarScene', { launchIndex: missionState.endlessStage }));
    });
  }

  /** End of the level: launch aborted (button pressed) or the clock ran out (city lost).
   *  A short result card, then back to the menu. */
  private finish(aborted: boolean): void {
    if (this.endT < 0) return;
    this.endT = -1;
    if (this.state !== 'won') this.state = 'down';
    gameUi.interactPrompt = null;
    if (aborted && missionState.impactClock > 0) {
      missionState.addScore(Math.floor(missionState.impactClock) * SCORE.impactClockSecond);
    }
    if (!aborted) missionState.cityLost();
    this.music.fadeOut(1);
    if (missionState.isGameOver) { this.scene.start('GameOverScene'); return; }
    const left = this.hits / this.maxHits;
    const medal = !aborted ? null : left >= 1 ? 'Gold medal' : left >= 0.5 ? 'Silver medal' : 'Bronze medal';
    gameUi.stageResult = {
      headline: aborted ? 'LAUNCH ABORTED' : 'LAUNCH SUCCEEDED: CITY LOST',
      details: [
        aborted ? 'You hit the button in time' : 'The clock ran out',
        `Score ${missionState.score.toLocaleString('en-US')}`,
        ...(medal ? [medal] : []),
      ],
      next: 'Back to menu',
    };
    this.time.delayedCall(3200, () => {
      gameUi.stageResult = null;
      missionState.endMission();
      this.scene.start('MenuScene');
    });
  }

  // ── HUD state ────────────────────────────────────────────────────────────

  private syncUi(wheel = false): void {
    const g = this.gun(), st = gunStats(g.id), d = gunDef(g.id);
    gameUi.weapon = {
      name: d.name, rarity: d.rarity, ammo: g.ammo, mag: st.mag,
      reload: g.reloadT > 0 ? 1 - g.reloadT / st.reload : -1, slot: this.cur,
    };
    gameUi.wheel = wheel ? {
      slots: this.guns.map(s => s ? { name: gunDef(s.id).name, rarity: gunDef(s.id).rarity, ammo: s.ammo, mag: gunStats(s.id).mag } : { name: '', rarity: '', ammo: 0, mag: 0 }),
      highlight: this.wheelHi, equipped: this.cur,
    } : null;
    const it = gameUi.item;
    const count = this.items[this.itemSel];
    if (!it || it.kind !== this.itemSel || it.count !== count || it.all.some(a => a.count !== this.items[a.kind as ItemKind])) {
      gameUi.item = {
        kind: this.itemSel, name: ITEM_NAME[this.itemSel], count,
        all: ITEM_ORDER.map(k => ({ kind: k, count: this.items[k] })),
      };
    }
    gameUi.inCover = this.cover !== null && this.crouchV > 0.5;
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
    for (const f of this.fires) this.drawScorch(g, f, cx);
    const cg = this.coverGfx;
    cg.clear();
    for (const b of this.boxes) if (b.x + b.w > cx - 20 && b.x < cx + W + 20) this.drawBox(cg, b, cx);

    const a = this.actorGfx;
    a.clear();
    const t = time / 1000;
    for (const d of this.drops) this.drawDrop(a, d, cx);
    for (const e of this.enemies) if (e.x > cx - 120 && e.x < cx + W + 120) this.drawEnemy(a, e, cx, t);
    this.drawPlayer(a, cx, time);

    const bg = this.bulletGfx;
    bg.clear();
    for (const f of this.fires) this.drawFire(bg, f, cx, time);
    for (const th of this.throwables) this.drawThrowable(bg, th, cx, time);
    for (const b of this.bullets) this.drawBullet(bg, b, cx);
    this.fx.render(cx, time);
  }

  private drawGround(g: Phaser.GameObjects.Graphics, cx: number): void {
    const gr = this.biome.ground;
    // Sample on a world-fixed grid so the drawn surface matches groundY exactly.
    const pts: { x: number; y: number }[] = [];
    for (let wx = Math.floor((cx - SEG) / 10) * 10; wx <= cx + W + SEG; wx += 10) pts.push({ x: wx - cx, y: this.groundY(wx) });
    g.fillStyle(gr.fill, 1);
    g.beginPath(); g.moveTo(pts[0].x, H);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.lineTo(pts[pts.length - 1].x, H); g.closePath(); g.fillPath();
    g.lineStyle(6, gr.surface, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y + 2);
    for (const p of pts) g.lineTo(p.x, p.y + 2);
    g.strokePath();
    g.fillStyle(gr.band, 1);
    for (let i = 0; i < pts.length; i += 2) g.fillRect(pts[i].x, pts[i].y + 30, 20, 6);
    // Tufts / stones.
    for (let wx = Math.floor(cx / 70) * 70; wx < cx + W + 70; wx += 70) {
      const h = hash01(wx * 0.13);
      if (h < 0.45) continue;
      const sx = wx - cx + h * 30, sy = this.groundY(wx + h * 30) + 1;
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

  /** Endless goal: an open, lit hangar. */
  private drawHangar(g: Phaser.GameObjects.Graphics, x: number, time: number): void {
    if (x > W + 50 || x < -500) return;
    const gy = this.lowestGround(this.bunkerX - 10, this.bunkerX + 410) + 4, top = gy - 220;
    g.fillStyle(C.concreteDark, 1); g.fillRect(x - 10, top + 40, 420, gy - top - 40);
    g.fillStyle(C.concreteLight, 1);
    g.beginPath(); g.arc(x + 200, top + 120, 215, Math.PI * 1.12, Math.PI * 1.88, false); g.closePath(); g.fillPath();
    g.fillStyle(C.concrete, 1); g.fillRect(x, top + 50, 400, gy - top - 50);
    // Open door and the lit bay inside.
    const dx = x + 40, dw = 300, dt = gy - 150;
    g.fillStyle(C.doorDark, 1); g.fillRect(dx, dt, dw, gy - dt);
    g.fillStyle(C.lamp, 0.12); g.fillTriangle(dx + dw / 2, dt + 6, dx, gy, dx + dw, gy);
    for (let i = 0; i < 3; i++) { g.fillStyle(C.lamp, 1); g.fillRect(dx + 40 + i * 100, dt + 4, 24, 5); }
    for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? C.hazard : C.hazardDark, 1); g.fillRect(x + i * 33, top + 52, 33, 10); }
    if (this.state !== 'won') {
      const ay = dt - 40 + Math.sin(time * 0.006) * 6;
      g.fillStyle(C.hazard, 1);
      g.fillTriangle(this.buttonX() - this.camX - 16, ay, this.buttonX() - this.camX + 16, ay, this.buttonX() - this.camX, ay + 22);
    }
  }

  private drawBunker(g: Phaser.GameObjects.Graphics, x: number, time: number): void {
    if (x > W + 50 || x < -500) return;
    const gy = this.lowestGround(this.bunkerX - 20, this.bunkerX + 400) + 4;
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
    const bx = this.buttonX() - this.camX, fy = this.groundY(this.buttonX());
    g.fillStyle(C.console, 1); g.fillRect(bx - 34, fy - 62, 68, 62 + (gy - fy));
    g.fillStyle(C.consoleLight, 1); g.fillRect(bx - 38, fy - 66, 76, 8);
    g.fillStyle(C.screen, 0.8); g.fillRect(bx - 24, fy - 50, 48, 18);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
    g.fillStyle(C.buttonGlow, 0.25 + 0.3 * pulse); g.fillCircle(bx, fy - 74, 26);
    g.fillStyle(C.buttonRim, 1); g.fillEllipse(bx, fy - 70, 34, 12);
    const pressed = this.state === 'won' ? 4 : 0;
    g.fillStyle(C.button, 1); g.fillEllipse(bx, fy - 76 + pressed, 26, 12);
    g.fillRect(bx - 13, fy - 76 + pressed, 26, 6 - pressed);
    // Arrow sign pointing at the door until the button is pressed.
    if (this.state !== 'won') {
      const ay = dt - 40 + Math.sin(time * 0.006) * 6;
      g.fillStyle(C.hazard, 1);
      g.fillTriangle(dx + dw / 2 - 16, ay, dx + dw / 2 + 16, ay, dx + dw / 2, ay + 22);
    }
  }

  private shadow(a: Phaser.GameObjects.Graphics, sx: number, wx: number, y: number, w: number): void {
    const gy = this.supportY(wx, y);
    const fade = Math.max(0, 1 - (gy - y) / 400);
    a.fillStyle(C.shadow, 0.24 * fade); a.fillEllipse(sx, gy + 1, w * (0.6 + 0.4 * fade), w * 0.22);
  }

  private drawEnemy(a: Phaser.GameObjects.Graphics, e: Enemy, cx: number, t: number): void {
    const x = e.x - cx;
    if (e.kind === 'nest') {
      // Sandbag horseshoe with a heavy MG and the gunner's head and shoulders.
      const kit = this.biome.hangar.local.kit, gy = e.y + 4, pal = e.look.pal;
      if (e.hp > 0) {
        const k = GROUND.soldierScale;
        const tx = new Xform(a, x + 6, gy - 22, 0, -1, k);
        trooperTorso(tx, pal, -2.5, -8, 5, 8);
        trooperHead(tx, pal, 0.5, -9.8, 2);
        const gx = x - 10, gyy = gy - 38;
        a.lineStyle(7, C.foeGun, 1); a.lineBetween(gx, gyy, gx + Math.cos(e.aim) * 60, gyy + Math.sin(e.aim) * 60);
        a.fillStyle(C.foeGunAccent, 1); a.fillRect(gx - 8, gyy - 5, 16, 10);
        if (e.flash > 0) { a.fillStyle(C.muzzle, 1); a.fillCircle(gx + Math.cos(e.aim) * 64, gyy + Math.sin(e.aim) * 64, 9); }
      }
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) {
        const bx = x - 56 + i * 24 + r * 12, by = gy - 8 - r * 14;
        a.fillStyle(kit.sandbagDark, 1); a.fillEllipse(bx, by + 2, 28, 16);
        a.fillStyle(e.hitT > 0 ? 0xffffff : kit.sandbag, 1); a.fillEllipse(bx, by, 26, 14);
      }
      if (e.hp > 0 && e.hp < e.maxHp) this.hpBar(a, x, gy - 100, e.hp / e.maxHp);
      return;
    }
    const pose = this.foePose(e, t);
    if (pose.alpha <= 0) return;
    const k = GROUND.soldierScale * e.look.scale;
    if (e.hp > 0) this.shadow(a, x, e.x, e.y, 12 * k);
    if (e.hitT > 0) pose.alpha *= 0.6;
    drawSoldierRig(a, x, e.y, e.face, k, e.look.pal, pose);
    if (e.hp <= 0) return;
    const head = rigHead(x, e.y, e.face, k, pose);
    if (e.alertT > 0) this.alertMark(a, head.x, head.y - 34, e.alertT);
    if (e.hp < e.maxHp) this.hpBar(a, x, head.y - 26, e.hp / e.maxHp);
  }

  /** Yellow "!" over a soldier who just spotted you (drawn with shapes, not text). */
  private alertMark(a: Phaser.GameObjects.Graphics, x: number, y: number, t: number): void {
    const pop = Math.min(1, Math.max(0.4, (FOE_AI.alertTime - t) * 8 + 0.4));
    const s = 1.5 * pop;
    a.fillStyle(C.alertEdge, 0.9); a.fillRoundedRect(x - 6 * s, y - 13 * s, 12 * s, 27 * s, 3 * s);
    a.fillStyle(C.alertMark, 1);
    a.fillRect(x - 2.5 * s, y - 11 * s, 5 * s, 14 * s);
    a.fillCircle(x, y + 8 * s, 2.8 * s);
  }

  private hpBar(a: Phaser.GameObjects.Graphics, x: number, y: number, f: number): void {
    a.fillStyle(0x000000, 0.5); a.fillRect(x - 22, y, 44, 6);
    a.fillStyle(f > 0.5 ? 0x5fd17a : f > 0.25 ? 0xffc23d : 0xff4b3e, 1); a.fillRect(x - 21, y + 1, 42 * f, 4);
  }

  private playerPose(time: number): SoldierPose {
    const g = this.gun(), st = gunStats(g.id);
    const p = basePose(g.id, this.state === 'won' ? (this.face === 1 ? 0.5 : Math.PI - 0.5) : this.aim, time);
    p.walk = this.phase;
    p.move = this.onGround ? Math.min(1, Math.abs(this.vx) / GROUND.walkSpeed) : 0;
    p.crouch = this.crouchV;
    p.air = this.state === 'chute' ? 0.4 : this.onGround || this.state === 'down' ? null : Phaser.Math.Clamp(this.vy / 900, -1, 1);
    p.recoil = this.recoilT / SOLDIER_ANIM.recoilTime;
    p.flinch = this.flinchT / FOE_AI.flinchTime;
    p.land = this.landT / SOLDIER_ANIM.landTime;
    p.throwT = this.throwT;
    p.reload = g.reloadT > 0 ? 1 - g.reloadT / st.reload : null;
    p.relaxed = this.state === 'won';
    p.dead = this.state === 'down' ? this.endT / 0.4 : null;
    p.deadDir = -1;
    p.flash = this.flash > 0;
    p.slope = this.onGround && this.onSlope(this.px, this.py) ? this.slopeAt(this.px) : 0;
    return p;
  }

  private drawPlayer(a: Phaser.GameObjects.Graphics, cx: number, time: number): void {
    if (this.invuln > 0 && this.state === 'live' && Math.floor(time / 80) % 2 === 0) return;
    const x = this.px - cx, y = this.py, pal = this.biome.troops.blue, k = GROUND.soldierScale;
    if (this.state !== 'down') this.shadow(a, x, this.px, y, 12 * k);
    if (this.state === 'chute') {
      // Canopy and lines.
      const sway = Math.sin(time * 0.003) * 6;
      const top = y - 23 * k;
      a.lineStyle(2.5, C.chuteLine, 0.9);
      a.lineBetween(x - 2.5 * k, y - 13 * k, x - 16 * k + sway, top);
      a.lineBetween(x + 2.5 * k, y - 13 * k, x + 16 * k + sway, top);
      a.fillStyle(C.chute, 1); a.slice(x + sway, top + 4, 17 * k, Math.PI, 0, false); a.fillPath();
      a.fillStyle(C.chuteStripe, 1);
      a.beginPath(); a.slice(x + sway, top + 4, 17 * k, Math.PI * 1.4, Math.PI * 1.6, false); a.closePath(); a.fillPath();
    }
    drawSoldierRig(a, x, y, this.face, k, pal, this.playerPose(time / 1000));
  }

  private drawDrop(a: Phaser.GameObjects.Graphics, d: Drop, cx: number): void {
    if (d.t > 7) return;
    const t = new Xform(a, d.x - cx, d.y, d.rot, 1, GROUND.soldierScale * 0.8);
    drawGun(t, d.gun, 0, FOE_GUN);
  }

  private drawThrowable(g: Phaser.GameObjects.Graphics, t: Throwable, cx: number, time: number): void {
    const x = t.x - cx;
    if (t.kind === 'frag') {
      g.fillStyle(C.grenade, 1); g.fillEllipse(x, t.y - 7, 13, 16);
      g.fillStyle(C.grenadeBand, 1); g.fillRect(x - 6, t.y - 8, 12, 3);
      // Blinks faster as the fuse runs down.
      if (Math.sin(time * 0.001 * (8 + (2 - Math.max(0, t.fuse)) * 14)) > 0.3) { g.fillStyle(C.fuseLight, 1); g.fillCircle(x, t.y - 16, 2.5); }
    } else {
      const c = Math.cos(t.rot), s = Math.sin(t.rot);
      g.lineStyle(7, C.bottle, 1); g.lineBetween(x - c * 9, t.y - s * 9, x + c * 9, t.y + s * 9);
      g.fillStyle(C.bottleRag, 1); g.fillCircle(x + c * 10, t.y + s * 10, 2.5);
      g.fillStyle(C.fireMid, 0.9); g.fillCircle(x + c * 13, t.y + s * 13, 4 + Math.sin(time * 0.05) * 1.5);
    }
  }

  private drawScorch(g: Phaser.GameObjects.Graphics, f: Fire, cx: number): void {
    g.fillStyle(C.scorch, 0.35); g.fillEllipse(f.x - cx, this.groundY(f.x) + 2, f.w, 12);
  }

  private drawFire(g: Phaser.GameObjects.Graphics, f: Fire, cx: number, time: number): void {
    const fade = Math.min(1, f.t / 0.8);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const wx = f.x - f.w / 2 + (i + 0.5) * (f.w / n);
      const gy = this.groundY(wx) + 2, sx = wx - cx;
      const fl = Math.sin(time * 0.012 + i * 1.7) * 0.5 + 0.5;
      const h = (30 + fl * 26) * fade * (1 - Math.abs(i - (n - 1) / 2) / n);
      g.fillStyle(C.fireOuter, 0.85); g.fillTriangle(sx - 12, gy, sx + 12, gy, sx + (fl - 0.5) * 8, gy - h);
      g.fillStyle(C.fireMid, 0.9); g.fillTriangle(sx - 8, gy, sx + 8, gy, sx + (fl - 0.5) * 6, gy - h * 0.7);
      g.fillStyle(C.fireCore, 0.9); g.fillTriangle(sx - 4, gy, sx + 4, gy, sx, gy - h * 0.4);
      if (fl > 0.85) { g.fillStyle(C.ember, 0.9); g.fillCircle(sx + (fl - 0.9) * 40, gy - h - 8, 1.8); }
    }
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
    gameUi.item = null;
    gameUi.inCover = false;
    gameUi.interactPrompt = null;
    gameUi.contextualHint = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
  }
}
