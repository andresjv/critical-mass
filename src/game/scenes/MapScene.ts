import Phaser from 'phaser';
import { missionState } from '../../state/MissionState';
import { debugInfo } from '../../state/debugInfo';
import { TUNING, LIMITS, SCORE } from '../../state/tuning';
import { InputRouter } from '../../input/InputRouter';
import { TouchControls } from '../../input/TouchControls';

const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
const W = 384;
const H = 216;

// Cold Front placeholder names (ThemePack in T12).
const SITES = ['Varna Ridge', 'Kessel', 'Ostrow', 'Tal Mir'];
const CITIES = ['Harlan Bay', 'Port Cressa', 'New Allis', 'Veldor'];

// Map positions (canvas coords).
const SITE_POSITIONS: [number, number][] = [
  [288, 60], [310, 90], [295, 120], [280, 150],
];
const CITY_POSITIONS: [number, number][] = [
  [80, 65], [70, 95], [85, 125], [95, 155],
];

interface MapData {
  launchIndex: number;
}

export class MapScene extends Phaser.Scene {
  private launchIndex = 0;
  private autoTimer = 0;
  private readonly AUTO_SCRAMBLE = LIMITS.autoScrambleDelay;
  private scrambled = false;

  private touchControls!: TouchControls;
  private siteDots: Phaser.GameObjects.Arc[] = [];
  private arcGfx!: Phaser.GameObjects.Graphics;
  private promptText!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private siteTween?: Phaser.Tweens.Tween;

  private visibilityHandler!: () => void;
  private prevFire = false;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: Partial<MapData>): void {
    this.launchIndex = data.launchIndex ?? 0;
    this.autoTimer = 0;
    this.scrambled = false;
    this.prevFire = false;
  }

  create(): void {
    // Ensure mission is started (first run).
    if (missionState.planes === 0) {
      missionState.startMission({ theme: 'coldfront', difficulty: 'pilot', seed: Date.now() });
    }

    missionState.hudCue = 'PRESS FIRE TO SCRAMBLE';
    debugInfo.speed = 0;
    debugInfo.angle = 0;
    debugInfo.doorTimer = 0;
    debugInfo.doorState = '—';

    // Launch/stop HUD.
    if (!this.scene.isActive('HudScene')) this.scene.launch('HudScene');
    this.scene.bringToTop('HudScene');

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b2a);

    // Divider.
    this.add.rectangle(W / 2, H / 2, 2, H, 0x334455);

    // Labels.
    const ls = { fontSize: '7px', color: '#6688aa', resolution: DPR };
    this.add.text(W / 4, 8, 'COASTAL UNION', ls).setOrigin(0.5, 0);
    this.add.text((W * 3) / 4, 8, 'IRON DIRECTORATE', ls).setOrigin(0.5, 0);

    // ── City dots (left) ────────────────────────────────────────────────────
    const cityStyle = { fontSize: '6px', color: '#88ccff', resolution: DPR };
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = CITY_POSITIONS[i];
      const destroyed = i < missionState.citiesLost;
      this.add.arc(cx, cy, 5, 0, 360, false, destroyed ? 0x442222 : 0x2244aa, 1);
      this.add.text(cx + 8, cy - 3, CITIES[i], cityStyle);
    }

    // ── Launch site dots (right) ─────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = SITE_POSITIONS[i];
      const destroyed = i < this.launchIndex;
      const dot = this.add.arc(sx, sy, 5, 0, 360, false,
        destroyed ? 0x224422 : 0xcc3322, 1);
      this.siteDots.push(dot);
      const siteStyle = { fontSize: '6px', color: destroyed ? '#446644' : '#cc8866', resolution: DPR };
      this.add.text(sx - 8, sy - 3, SITES[i], siteStyle).setOrigin(1, 0);
    }

    // All 4 sites already destroyed → Stage 5 placeholder.
    if (this.launchIndex >= LIMITS.launchSiteCount) {
      this.showAllSitesDown();
      return;
    }

    // ── Active site arc ─────────────────────────────────────────────────────
    this.arcGfx = this.add.graphics();
    this.drawArc();

    // Flash active site.
    this.siteTween = this.tweens.add({
      targets: this.siteDots[this.launchIndex],
      alpha: 0.2,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // ── Info panel ──────────────────────────────────────────────────────────
    const site = SITES[this.launchIndex];
    const city = CITIES[this.launchIndex % CITIES.length];
    const secs = TUNING[missionState.difficulty].timeToImpact;

    this.add.text(W / 2, H - 40, [
      `LAUNCH DETECTED`,
      `${site} → ${city}`,
      `TIME TO IMPACT: ${secs}s`,
    ], { fontSize: '8px', color: '#ffcc44', resolution: DPR, align: 'center' }).setOrigin(0.5, 0);

    this.promptText = this.add
      .text(W / 2, H - 14, `AUTO-SCRAMBLE IN ${Math.ceil(this.AUTO_SCRAMBLE)}s`, {
        fontSize: '7px', color: '#aaaaaa', resolution: DPR,
      })
      .setOrigin(0.5, 0);

    // Space key for scramble.
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Touch controls (fire = scramble).
    this.touchControls = new TouchControls(this);

    // Pause on visibility change.
    this.visibilityHandler = () => {
      if (document.hidden) this.scene.pause(); else this.scene.resume();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private drawArc(): void {
    const [sx, sy] = SITE_POSITIONS[this.launchIndex];
    const [cx, cy] = CITY_POSITIONS[this.launchIndex % CITY_POSITIONS.length];
    // Control point sits above the midpoint to form a gentle arc.
    const cpx = (sx + cx) / 2;
    const cpy = Math.min(sy, cy) - 40;

    this.arcGfx.clear();
    this.arcGfx.lineStyle(1, 0xff4422, 0.7);
    this.arcGfx.beginPath();

    // Manual quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const bx = mt * mt * sx + 2 * mt * t * cpx + t * t * cx;
      const by = mt * mt * sy + 2 * mt * t * cpy + t * t * cy;
      if (i === 0) this.arcGfx.moveTo(bx, by);
      else this.arcGfx.lineTo(bx, by);
    }
    this.arcGfx.strokePath();
  }

  update(_time: number, delta: number): void {
    if (this.scrambled) return;

    // Keyboard / gamepad input.
    const input = InputRouter.read();
    this.touchControls.update();
    const fireJustPressed = input.fire && !this.prevFire;
    this.prevFire = input.fire;

    if (fireJustPressed || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.scramble();
      return;
    }

    // Auto-scramble timer.
    this.autoTimer += delta / 1000;
    if (this.autoTimer >= this.AUTO_SCRAMBLE) {
      this.scramble();
      return;
    }

    const remaining = Math.ceil(this.AUTO_SCRAMBLE - this.autoTimer);
    this.promptText?.setText(`AUTO-SCRAMBLE IN ${remaining}s`);

    debugInfo.fps = Math.round(this.game.loop.actualFps);
  }

  private scramble(): void {
    this.scrambled = true;
    this.siteTween?.stop();

    // Start impact clock.
    missionState.startImpactClock(TUNING[missionState.difficulty].timeToImpact);

    this.scene.start('HangarScene', { launchIndex: this.launchIndex });
  }

  private showAllSitesDown(): void {
    missionState.hudCue = 'ALL SITES DESTROYED';
    this.add.text(W / 2, H / 2 - 20, 'ALL SITES DESTROYED', {
      fontSize: '12px', color: '#ffff44', resolution: DPR,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 8, 'ADVANCING TO VOSTGRAD', {
      fontSize: '8px', color: '#aaaaaa', resolution: DPR,
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      missionState.addScore(SCORE.impactClockSecond * Math.ceil(missionState.impactClock));
      this.scene.start('PlaceholderAssaultScene');
    });
  }

  shutdown(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.touchControls?.destroy();
    this.siteTween?.stop();
  }
}
