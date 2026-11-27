import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { gameUi } from '../../state/gameUi';
import { TUNING, LIMITS, SCORE } from '../../state/tuning';
import { InputRouter } from '../../input/InputRouter';
import { PauseController } from '../PauseController';
import { TouchControls } from '../../input/TouchControls';
import { parseChallengeFromURL, getPlayerName } from '../../state/challengeLink';
import { showStageIntro } from '../../state/stageIntros';

// Module-level flag: show briefing only on first visit per page load.
let briefingShown = false;

const W = 1280;
const H = 720;

// Cold Front placeholder names (ThemePack in T12).
const SITES  = ['Varna Ridge', 'Kessel', 'Ostrow', 'Tal Mir'];
const CITIES = ['Harlan Bay', 'Port Cressa', 'New Allis', 'Veldor'];

// Map positions scaled to 1280×720 (original 384×216 × WORLD_SCALE 10/3).
const SITE_POSITIONS: [number, number][] = [
  [960, 200], [1033, 300], [983, 400], [933, 500],
];
const CITY_POSITIONS: [number, number][] = [
  [267, 217], [233, 317], [283, 417], [317, 517],
];

interface MapData {
  launchIndex: number;
}

export class MapScene extends Phaser.Scene {
  private launchIndex = 0;
  private autoTimer   = 0;
  private readonly AUTO_SCRAMBLE = LIMITS.autoScrambleDelay;
  private scrambled = false;

  // Contextual hint timer (seconds of no input).
  private hintTimer = 0;

  private touchControls!: TouchControls;
  private pauseCtl!: PauseController;
  private siteDots: Phaser.GameObjects.Arc[] = [];
  private arcGfx!:     Phaser.GameObjects.Graphics;
  private spaceKey!:   Phaser.Input.Keyboard.Key;
  private siteTween?:  Phaser.Tweens.Tween;

  private visibilityHandler!: () => void;
  private prevFire = false;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: Partial<MapData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.autoTimer   = 0;
    this.scrambled   = false;
    this.prevFire    = false;
    this.hintTimer   = 0;
  }

  create(): void {
    if (!missionState.started) {
      // On first load, check for a challenge URL and apply it.
      const challenge = parseChallengeFromURL();
      if (challenge) {
        gameUi.challengerData = challenge;
        gameUi.playerName = getPlayerName();
        missionState.startMission({
          theme:      challenge.theme,
          difficulty: challenge.difficulty,
          seed:       challenge.seed,
        });
      } else {
        missionState.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: Date.now(), level: 'coldfront' });
      }
    }

    // Mission briefing before the first launch of the session.
    if (!briefingShown && this.launchIndex === 0) {
      briefingShown = true;
      gameUi.showBriefing = true;
    }

    // Write to gameUi so the React overlay can render the map panel.
    gameUi.mapActive          = true;
    gameUi.launchIndex        = this.launchIndex;
    gameUi.launchSite         = SITES[this.launchIndex] ?? '';
    gameUi.targetCity         = CITIES[this.launchIndex % CITIES.length] ?? '';
    gameUi.timeToImpactSecs   = TUNING[missionState.difficulty].timeToImpact;

    // Progress breadcrumb.
    gameUi.progressStep  = 'map';
    gameUi.launchNumber  = this.launchIndex + 1;
    gameUi.objective     = 'Scramble to intercept the launch';
    gameUi.contextualHint = null;

    missionState.hudCue = 'PRESS FIRE TO SCRAMBLE';

    // Stage intro card (first visit this session).
    showStageIntro('map');
    debugInfo.speed      = 0;
    debugInfo.angle      = 0;
    debugInfo.doorTimer  = 0;
    debugInfo.doorState  = '—';

    if (!this.scene.isActive('HudScene')) this.scene.launch('HudScene');
    this.scene.bringToTop('HudScene');

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b2a);

    // Divider line at centre.
    this.add.rectangle(W / 2, H / 2, 2, H, 0x334455);

    // All 4 sites already destroyed → Stage 5 placeholder.
    if (this.launchIndex >= LIMITS.launchSiteCount) {
      this.showAllSitesDown();
      return;
    }

    // ── City dots (left half) ────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = CITY_POSITIONS[i];
      const destroyed = i < missionState.citiesLost;
      this.add.arc(cx, cy, 17, 0, 360, false, destroyed ? 0x442222 : 0x2244aa, 1);
    }

    // ── Launch site dots (right half) ────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = SITE_POSITIONS[i];
      const destroyed = i < this.launchIndex;
      const dot = this.add.arc(sx, sy, 17, 0, 360, false,
        destroyed ? 0x224422 : 0xcc3322, 1);
      this.siteDots.push(dot);
    }

    // ── Active site arc (Bezier) ─────────────────────────────────────────────
    this.arcGfx = this.add.graphics();
    this.drawArc();

    // Flash active site dot.
    this.siteTween = this.tweens.add({
      targets: this.siteDots[this.launchIndex],
      alpha: 0.2,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.touchControls = new TouchControls(this, { move: 'MOVE', fire: 'GO', action: '' });
    this.pauseCtl = new PauseController(this);

    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once('shutdown', this.shutdown, this);
  }

  private drawArc(): void {
    const [sx, sy] = SITE_POSITIONS[this.launchIndex];
    const [cx, cy] = CITY_POSITIONS[this.launchIndex % CITY_POSITIONS.length];
    const cpx = (sx + cx) / 2;
    const cpy = Math.min(sy, cy) - 133; // 40 × WORLD_SCALE

    this.arcGfx.clear();
    this.arcGfx.lineStyle(2, 0xff4422, 0.7);
    this.arcGfx.beginPath();

    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const mt = 1 - t;
      const bx = mt * mt * sx + 2 * mt * t * cpx + t * t * cx;
      const by = mt * mt * sy + 2 * mt * t * cpy + t * t * cy;
      if (i === 0) this.arcGfx.moveTo(bx, by);
      else         this.arcGfx.lineTo(bx, by);
    }
    this.arcGfx.strokePath();
  }

  update(_time: number, delta: number): void {
    if (this.scrambled) return;

    const input = InputRouter.read();
    if (this.pauseCtl.update(input.pause)) return;
    this.touchControls.update();
    const fireJustPressed = input.fire && !this.prevFire;
    this.prevFire = input.fire;

    if (fireJustPressed || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.scramble();
      return;
    }

    this.autoTimer += delta / 1000;
    if (this.autoTimer >= this.AUTO_SCRAMBLE) {
      this.scramble();
      return;
    }

    const remaining = Math.ceil(this.AUTO_SCRAMBLE - this.autoTimer);
    gameUi.autoScrambleRemaining = remaining;
    missionState.hudCue = `AUTO-SCRAMBLE IN ${remaining}s`;

    // Contextual hint after 5s without input.
    const hasInput = input.fire;
    if (hasInput) {
      this.hintTimer = 0;
      gameUi.contextualHint = null;
    } else {
      this.hintTimer += delta / 1000;
      if (this.hintTimer >= 5) {
        gameUi.contextualHint = 'Press FIRE or tap to scramble';
      }
    }

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private scramble(): void {
    this.scrambled    = true;
    gameUi.mapActive  = false;
    gameUi.contextualHint = null;
    this.siteTween?.stop();

    missionState.startImpactClock(TUNING[missionState.difficulty].timeToImpact);
    this.scene.start('HangarScene', { launchIndex: this.launchIndex });
  }

  private showAllSitesDown(): void {
    missionState.hudCue = 'ALL SITES DESTROYED';
    gameUi.mapActive    = false;

    // Simple block panels — no text in canvas.
    this.add.rectangle(W / 2, H / 2 - 60, 600, 60, 0x332200, 0.9);
    this.add.rectangle(W / 2, H / 2 + 20, 500, 40, 0x222222, 0.9);

    this.time.delayedCall(3000, () => {
      missionState.addScore(SCORE.impactClockSecond * Math.ceil(missionState.impactClock));
      this.scene.start('PlaceholderAssaultScene');
    });
  }

  shutdown(): void {
    gameUi.mapActive = false;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
    this.siteTween?.stop();
  }
}
