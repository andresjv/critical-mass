# Critical Mass — Design Document

Nov 25, 2026 · Andres Jimenez

## Design pillars and game loop

1. **Six games in one.** Each stage tests a different skill: inertia, altitude, aim, arcs, bank shots. A player who struggles in one gets a fresh start in the next.
2. **The clock is the villain.** The impact countdown and the meltdown timer drive every decision, such as whether to spend 20 s on a side silo for an extra plane.
3. **Thumbs first.** If a mechanic can't be played well with two thumbs on a 375 px phone, we change the mechanic, not just the button layout.
4. **Read in one glance.** Every threat has a warning shape, colour and sound before it can hurt you.

Mission loop:

```
Command map -> Hangar launch -> Attack run -> Silo strike
   ^                                              |
   |            clock runs out: city lost         |
   |<--- (planes in flight lost; 2 cities lost = game over)
   |                                              |
   |                                   central silo destroyed
   |                                              v
   |<---------- no: next launch ------- All 4 sites down?
                                                  | yes
                                                  v
          Escape + results <- Reactor <- Capital assault
```

Stages 2–4 run once per launch site, four times in all. A missed clock costs a city and the planes in flight but not the run; the same site launches again.

## Stage-by-stage specs

Every stage renders to a 384 × 216 canvas and reads four abstract inputs: **move X**, **move Y**, **fire**, **action**. Numbers below are v1 starting values for the Pilot difficulty; the tuning section scales them. Names shown are from the Cold Front theme; each theme renames them (see Themes).

### Stage 1 — Command map

- **View:** flat stylised hemisphere map, Coastal Union at left, Iron Directorate at right, 4 launch sites as dots.
- **Flow:** one site flashes and an arc draws toward a named Union city. The panel shows the city and *time to impact*: 150 s.
- **Input:** tap or press fire to scramble. Auto-scramble after 5 s so the clock is never wasted.
- **Between runs:** destroyed sites show as craters; lost cities as dark markers. All 4 sites down → the map zooms to Vostgrad and Stage 5 starts.

### Stage 2 — Hangar launch

- **View:** top-down interior of the orbital station. Plane starts parked at the bottom; bay doors at the top.
- **Physics:** rotate 210°/s; thrust 70 px/s²; max speed 95 px/s; drag 0.5%/s (near-zero gravity). No brake: turn 180° and thrust.
- **Doors:** action opens them for 3.0 s, then a 2.0 s cooldown. A door closing on the plane = crash.
- **Collision:** wall hit under 30 px/s bounces at 50% speed; above it is a crash and costs a plane.
- **Spares:** for 6 s after exit, a *Launch spare* button sends another plane out on autopilot. Spares wait at the attack run start and replace the active plane if it dies. Max 3 in flight.
- **Example:** a careful player exits in about 8 s; an expert in about 4 s.

### Stage 3 — Attack run

- **View:** side-scrolling, right to left terrain, 45 s long at 80 px/s. The plane's shadow on the ground shows altitude.
- **Movement:** Y = altitude (8 px to 150 px), X = position on screen (left third to centre). Auto-fire is off; fire shoots forward.
- **Enemies:** tanks (ground flak every 2.5 s), SAM sites (one homing-lite missile, turn rate 60°/s), interceptors (enter from right, 2-shot burst).
- **Heat-seeker:** warned 1.5 s ahead with an arrow at the left edge and a rising tone. It locks your altitude; below 20 px it overshoots. Shooting it after it passes = bonus.
- **Ground:** contact is harmless on Cadet, a crash on Pilot and Suicidal. Buildings and pylons crash on every difficulty.
- **Bombs:** action key drops a bomb on a parabolic arc (1.4 s to impact). A crosshair on the ground shows the landing point ~600 world-px ahead of the drop. Max 2 in air; 1.2 s reload after each drop. Blast radius destroys tanks (150 pts) and SAM sites (200 pts) within range.

### Stage 4 — Silo strike

- **View:** pseudo-3D from behind the plane, flying into the screen toward a row of 5 silos: central control silo flanked by 2 on each side.
- **Aim:** each silo has a small window at a set height. A reticle shows where a shot lands; when within 4 px of a window it changes from a hollow circle (blue) to a filled diamond (amber).
- **Shots:** 1 rocket on screen at a time, 0.8 s travel. A window takes 1 hit.
- **Threats:** silo guns fire at your current altitude every 1.8 s (move up or down to dodge); interceptors enter from the left every 6 s.
- **Rules:** side silo = 2,000 pts + 1 plane (max 9). Central silo ends the stage and stops the launch. All 5 = 5,000 bonus. The impact clock keeps running.

### Stage 5 — Vostgrad assault

- **View:** pseudo-3D facade of the Directorate citadel: a long wall with 5 doors, windows for snipers, 2 towers. The commando stands in a trench in the foreground.
- **Mortar:** X moves the commando; Y raises or lowers elevation (shown as a dotted arc preview on Cadet only). Fire lobs a shell; its shadow tracks the landing point.
- **Snipers:** up to 4 visible from 8 windows; each respawns 4 s after a kill until the pool (12) is empty.
- **Tanks:** 3 per wave, exit side gates, drive across, shell the trench.
- **Doors:** each takes 2 hits. Normal doors go dark; the reactor door (random 1 of 5) glows white. Towers = bonus; their debris hits the trench below for 1.5 s.
- **Exit:** snipers, tanks cleared and reactor door open → the squad runs in.

### Stage 6 — Reactor

- **View:** top-down room. Back wall at top, reactor core behind it, robot patrolling the middle lane, commando at the bottom.
- **Discs:** fire throws a disc at the aiming dot on the back wall; Y moves the dot left/right. The disc bounces back down along the mirrored angle. Hitting the robot's front = deflect, no damage. Hitting its back on the return = 1 hit.
- **Robot:** 4 hits to destroy. Speed 40 px/s, +15 px/s per hit; fire interval 2.0 s, −0.3 s per hit. It tracks your X.
- **Catching:** a returning disc that reaches your lane is caught if you are under it. Missed discs are lost. A disc in flight when you die is kept.
- **Supply:** start with 5 discs; +1 per robot destroyed. Out of discs with men left → back to Stage 5 with doors still open.
- **Meltdown:** after the second-to-last robot falls, the last robot ignores the reactor and hunts you; a 120 s ETCM timer starts. Kill it, then the exit door opens.

### Stage 7 — Escape and results

- A 10 s non-interactive flight home. Remaining ETCM seconds × 100 = bonus.
- Results: score, cities saved of 4 targeted, planes and men left, difficulty, a *share score* button (Web Share API, copy-link fallback).

## Controls

All devices map to the same four inputs, so stage code never checks what device is in use. Touch is the hardest case, so we design for it first and add keys after.

### Global mapping

| Input | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move X / Y | Arrows or WASD | Left stick or D-pad | Virtual stick, bottom-left (appears where the thumb lands) |
| Fire | Space or J | A / Cross | Big button, bottom-right (72 px) |
| Action | Shift or K | B / Circle | Smaller button above Fire (56 px) |
| Pause | Esc or P | Start | Pause icon, top-right |

### Per stage

| Stage | Move X | Move Y | Fire | Action | Touch note |
| --- | --- | --- | --- | --- | --- |
| 1 Map | — | — | Scramble | — | Tap anywhere |
| 2 Hangar | Rotate | Up = thrust | — | Open doors / launch spare | Stick X rotates; push stick up to thrust, or hold a Thrust button (setting) |
| 3 Attack run | Screen position | Altitude | Gun | Drop bomb | Stick is relative: drag = move, so the thumb never covers the plane |
| 4 Silos | Left/right | Altitude | Rocket | — | Reticle sits 24 px above the plane so it stays visible |
| 5 Assault | Walk the trench | Elevation | Mortar | — | Elevation also on a vertical slider at the right edge |
| 6 Reactor | Walk | Aim dot left/right | Throw disc | — | Aim dot on a horizontal slider above Fire; tap the back wall to place it directly |

### Touch rules

- Controls fade to 35% opacity after 3 s without contact; full opacity on touch.
- Left-handed setting mirrors the layout.
- Haptic tick on fire, short buzz on hit, long buzz on losing a plane (`navigator.vibrate`; iOS Safari ignores it).
- `touch-action: none` on the canvas; block pinch zoom, long-press menus and text selection.
- Multi-touch: stick and buttons track separate pointer IDs, so steering and firing work together.

## Tuning and difficulty

All values live in one `tuning.ts` file so we can rebalance without touching stage code.

### Difficulty

| Parameter | Cadet | Pilot | Suicidal |
| --- | --- | --- | --- |
| Time to impact per launch | 180 s | 150 s | 120 s |
| Starting planes | 5 | 4 | 3 |
| Ground contact in attack run | Harmless | Crash | Crash |
| Enemy fire rate | ×0.7 | ×1.0 | ×1.3 |
| Sniper pool, Stage 5 | 8 | 12 | 16 |
| Robots, Stage 6 | 2 | 4 | 5 |
| Meltdown timer | 150 s | 120 s | 90 s |
| Mortar arc preview | On | Off | Off |
| Score multiplier | ×1 | ×1.5 | ×2 |

### Lives

One pool, as in the original: surviving planes become the commando squad at Stage 5 (1 plane = 1 man). Side silos are the only way to earn planes, so they are worth the time risk. Plane cap 9.

### Scoring

| Event | Points |
| --- | --- |
| Tank or SAM site (attack run, gun) | 150 |
| SAM site (attack run, bomb) | 200 |
| Interceptor | 250 |
| Heat-seeker shot from behind | 500 |
| Side silo | 2,000 + 1 plane |
| Central silo | 3,000 |
| All 5 silos in one run | 5,000 bonus |
| Seconds left on impact clock | ×10 each |
| Sniper | 100 |
| Tank (assault) | 300 |
| Tower | 1,000 |
| Reactor door opened | 1,500 |
| Robot hit / robot destroyed | 200 / 2,500 |
| Escape bonus | ETCM seconds left × 100 |
| Each surviving man | 5,000 |

### Pacing target

A full Pilot run takes 12–18 minutes: about 2.5 minutes per launch run × 4, then 3–5 minutes for assault and reactor. This fixes the original's flat first half by making each launch harder: run 1 has 50% of the enemies, run 4 has 120%.

## Art, audio and UI

### Visual direction

Oregon Trail 2021 style: pixel-art sprites at whole-number scale over smooth painted parallax backgrounds. Sprites use nearest-neighbour filtering; backgrounds use linear filtering and 3–5 depth layers that scroll at different rates. Phaser 4 `PointLight` for engine glow, explosions and warning lights; sprites cast soft elliptical shadows on the ground plane. Text lives in a React HTML overlay so fonts scale cleanly to any screen.

Sprites load from an atlas (`assets/sprites.png` / `assets/sprites.json`) via `BootScene.preload()`; until real art lands, `BootScene.create()` generates coloured placeholder textures with `Graphics.generateTexture()`. Stage code references sprite keys only, so swapping the atlas requires no stage changes.

| Spec | Value |
| --- | --- |
| Internal resolution | 1280 × 720 (16:9), Phaser Scale FIT, letterboxed, `pixelArt: false`, `antialias: true`, rendered at `devicePixelRatio` |
| Sprite rendering | Individual sprite objects call `setTexture(key)`; backgrounds use `LINEAR` filter, sprites use `NEAREST` filter |
| All px constants | Pre-multiplied by `WORLD_SCALE = 10/3` in `tuning.ts` relative to the original 384 × 216 values |
| Faction colours | Union = cyan and white; Directorate = rust red and olive |
| Effects | Phaser 4 `PointLight` for glow; particle explosions; screen shake (off in reduced-motion) |
| Fonts | **Space Grotesk** (UI labels, cues), **JetBrains Mono** (numbers/score/clock) — self-hosted via `@fontsource` npm packages; min 14 CSS px rendered on phones |
| In-canvas text | Forbidden in stage code. Write to `missionState.hudCue` or `gameUi`; React `<GameOverlay />` displays everything. Exception: full-screen transient overlays (game over). |
| Atlas pipeline | `BootScene` runs first; `preload()` loads atlas (commented-out until real art); `create()` generates placeholder textures via `generateTexture(key, w, h)`, then routes to `MapScene` or `DebugScene` |

### HUD

- Top bar: score (left), impact clock or ETCM (centre, red under 20 s), planes or men + discs (right).
- Stage-specific cue at the centre-bottom: "DOORS OPEN 2.1s", "HEAT-SEEKER ←", "LOCKED".
- HUD sits outside the touch zones: nothing important in the bottom 30% corners.

### Audio

| Cue | Treatment |
| --- | --- |
| Title and map | Original chiptune theme, 60–90 s loop |
| Flight stages | Driving bass loop; tempo rises 10% under 30 s on the clock |
| Reactor | Low drone + heartbeat that speeds up with the ETCM |
| SFX | Thrust, door hiss, gun, rocket, explosion small/large, disc throw/bounce/catch, robot hit, warning tone |
| Missile proximity beep | Web Audio beep; interval 900 ms→120 ms, volume 15%→90%, pitch 880→1 100 Hz as distance shrinks; solid 1 200 Hz tone under 1 s to impact; stereo pan tracks missile X; nearest 2 missiles only. Visual pulsing ring around the plane mirrors the beep rate for sound-off players. |
| Voice-style alerts | Synth "LAUNCH DETECTED", "CRITICAL MASS"; captioned |

SFX are generated with jsfxr; music composed in a tracker (e.g., Furnace) and exported to OGG + M4A for Safari.

### Screens

Title → difficulty select → command map → stages → results. Plus pause, settings, how-to-play cards and high scores. Every menu works with tap, mouse, keys and gamepad focus.

## Themes

A theme is a skin, not a new game: it swaps art, names, music and text, and never touches rules or numbers. That keeps one set of stage code and makes every score comparable.

| Stage | Cold Front (Earth-like) | Xenoworld (alien) |
| --- | --- | --- |
| 1 Map | Hemisphere map: Coastal Union vs Iron Directorate | Orbital scan of planet Kethra: colony domes vs the Hive |
| 2 Hangar | Orbital station bay, stealth spaceplanes | Colony carrier bay, dropships |
| 3 Attack run | Pine forests, radar pylons, tanks, SAM sites | Crystal canyons, crawler beasts, spore turrets, homing spores |
| 4 Silos | Concrete silos around a control silo | Spore spires around the brood spire |
| 5 Assault | Citadel facade in Vostgrad, snipers, tanks | Hive wall with membrane doors, drone sentries, armoured crawlers |
| 6 Reactor | Reactor core, maintenance robots | Hive heart, guardian drones that feed it |
| Palette | Cyan and white vs rust and olive | Teal and violet vs acid green |
| Music | Synth march, about 120 bpm | Eerie arpeggios, about 100 bpm |

Each theme is one data file plus an asset folder. Adding a third theme (Deep Ocean, Neon Grid) is art and data work only:

```ts
interface ThemePack {
  id: 'coldfront' | 'xenoworld';
  name: string;            // "Xenoworld"
  premise: string;         // one line for the picker
  names: { player: string; enemy: string; capital: string;
           sites: [string, string, string, string]; cities: string[] };
  palette: string[];       // 24 colours
  assets: Record<StageId, AssetManifest>;  // same sprite keys in every theme
  music: Record<'title' | 'flight' | 'reactor', string>;
  strings: Record<string, string>;         // "LAUNCH DETECTED" etc.
}
```

Rule: sprites keep the same keys, sizes and hitboxes in every theme (a crawler is a 24 × 12 "tank"), so collision never changes.

## Technical architecture

Stack: **React + Phaser 4 + TypeScript, built with Vite.** One web codebase for every device, deployed as a PWA on Vercel. React draws menus and overlays (title, theme picker, settings, results, leaderboards) as normal HTML, which is easier to make responsive and accessible. Phaser draws the gameplay canvas and handles scaling, multi-touch, gamepad and Web Audio. Stable is 4.2.x ([Phaser releases](https://www.phaser.io/download/phaser4)); pin it, because most online examples are still Phaser 3.

Nothing here is native. Phaser is a browser library, so the same build runs in Safari, Chrome and Firefox. React alone would mean hand-writing a 60 fps loop, sprite batching and audio; React Native is mobile-only and would split the code. If app stores matter later, Capacitor wraps this same build for iOS and Android without a rewrite.

### Modules

| Module | Responsibility |
| --- | --- |
| `ui/` (React) | Title, theme and difficulty picker, settings, how-to cards, results, challenge screen, leaderboard |
| `GameBridge` | Small typed event bus between React and Phaser: start mission, pause, resume, mission ended |
| `BootScene` | Load shared assets and the chosen theme pack, unlock audio on first tap |
| `MissionState` | Single source of truth: theme, difficulty, seed, sites left, cities, planes, men, discs, score, impact clock. Plain TS, no Phaser, unit-tested |
| `rng.ts` | Seeded PRNG (mulberry32); the only source of randomness in game code |
| `InputRouter` | Merges keyboard, pointer and gamepad into `{moveX, moveY, fire, action, pause}` each frame |
| `TouchControls` | Virtual stick, buttons, sliders; per-stage layout config; hidden on non-touch devices |
| `StageScene` (base) | Fixed 60 Hz update, pause handling, HUD hookup, win/lose events to `MissionState` |
| One scene per stage | `MapScene`, `HangarScene`, `AttackRunScene`, `SiloScene`, `AssaultScene`, `ReactorScene`, `EscapeScene` |
| `HudScene` | Runs on top of every stage; reads `MissionState` |
| `themes/` | One `ThemePack` per theme |
| `tuning.ts` | Every number from the tuning section, keyed by difficulty |
| `share/` | Score-card image renderer; challenge URL encode and decode |
| `api/` | Supabase client: submit score, read leaderboards, fetch daily seed |
| `Save` | localStorage: settings, last theme, checkpoint, top-10 scores; versioned schema |

### Folder layout

```
src/
  main.tsx           # React root; mounts <GameCanvas/> and menus
  ui/                # Title, ThemePicker, Settings, Results, Challenge, Leaderboard
  game/
    config.ts        # Phaser config, scale mode FIT, 384x216
    GameBridge.ts
    scenes/          # Boot, Map, Hangar, AttackRun, Silo, Assault, Reactor, Escape, Hud
    systems/         # pseudo3d.ts, collision.ts
  state/             # MissionState.ts, tuning.ts, rng.ts, save.ts
  input/             # InputRouter.ts, TouchControls.ts
  themes/            # coldfront.ts, xenoworld.ts
  share/             # scoreCard.ts, challengeLink.ts
  api/               # supabase.ts
public/assets/<theme>/<stage>/
tests/               # Vitest: MissionState, rng determinism, challenge links
```

### Key technical decisions

- **Pseudo-3D, not 3D.** Silo and Assault project (x, y, z) to screen with `screenX = cx + x * f / z`, sprites scaled by `f / z`. No WebGL 3D, no extra library.
- **Fixed timestep.** Physics steps at 1/60 s with an accumulator, so a 30 fps phone plays the same game, just less smoothly.
- **Mission logic outside Phaser.** `MissionState` is pure TypeScript, so rules (cities lost, plane cap, unlocks) are testable without a browser.
- **Lifecycle.** `visibilitychange` and `blur` pause the game and suspend audio; `resize` and orientation change re-fit the canvas without restarting the scene.
- **Testing.** Vitest for state; Playwright smoke test that boots each stage at phone and desktop viewports and checks for console errors.

## Sharing and playing with friends

The trick that makes friend play cheap: **every mission comes from a seed.** All randomness (launch order, enemy waves, reactor door, robot paths) goes through `rng.ts`, and physics runs at a fixed step. Same seed = same mission, so two people can compete without a server or a live connection.

| Feature | How it works | Needs a server? |
| --- | --- | --- |
| Score card (v1) | Results screen draws a 1200 × 630 image on an offscreen canvas; `navigator.share` sends it with a link. Desktop fallback: download + copy link | No |
| Challenge link (v1) | URL holds seed, theme, difficulty, sender name and score. The friend plays the same mission; results show both scores side by side, plus a "challenge back" button | No |
| Pass-and-play (P1) | 2 players on one device take turns per launch run, each with their own planes and score, same seed. Ground stages alternate each life | No |
| Leaderboards (P1) | Supabase table per theme × difficulty, daily and all-time. An edge function rate-limits and rejects impossible scores (points per second above the cap) | Yes |
| Daily mission (P1) | Seed = hash of the UTC date; everyone plays the same mission, with its own board | Yes, read-only |
| Online co-op (v2) | One player flies, the other runs a turret; Supabase Realtime or WebRTC | Yes |

**Example.** Andrés scores 48,210 on Xenoworld, Pilot. He taps *Challenge a friend* and sends via WhatsApp:

```
https://criticalmass.app/c?s=7f3a9c&t=xenoworld&d=pilot&n=Andres&p=48210&v=1
```

His friend opens it on any phone or laptop, sees "Beat Andrés: 48,210", plays the identical mission, and gets a results screen with both scores.

A challenge link's score can be edited by hand. That is acceptable for friends; leaderboard scores are checked by the server, and in v2 can be verified by replaying the stored input log against the seed.

## Player guidance

New players often do not know what each stage requires. Seven layers of always-on and just-in-time orientation live in the React overlay.

### 1. Mission briefing
Full-screen card at game start: three context lines, mission goal, "START MISSION" button. Shows once per page load.

### 2. Progress breadcrumb
Row below the top HUD: `MAP > HANGAR > ATTACK RUN > SILOS`, current step highlighted amber. Below that: "Launch N of 4 — <site name>".

### 3. Stage intro card
On first visit per session: stage name, one-line goal, control diagram (keyboard vs touch). Dismissed by tap, Space, or Fire; auto-closes after 6 s.

### 4. Objective line
Single imperative below the progress bar ("Destroy the central silo"). Max 6 words. Scenes write to `gameUi.objective`.

### 5. Labelled HUD numbers
Every number has a small label: SCORE, MISSILE IMPACT (m:ss format), PLANES.

### 6. Contextual hints
If no relevant input for 5 s, a hint appears centre-screen ("Hold ↑ to thrust"). Cleared on input.

### 7. Event callouts
1.5 s centred banners for notable events: "+1 PLANE", "LAUNCH STOPPED", "CITY LOST: Harlan Bay".

### 8. Stage result card
2 s card at each stage transition: headline, 1–3 detail lines, "Next:" hint.

### 9. Placeholder "coming soon"
Stages not yet implemented show "COMING SOON — Press SPACE to skip" in the React overlay.

## Build plan for Claude Code

One ticket per Claude Code session. Each ends with a deploy preview you test on your phone before the next starts. Art starts as coloured rectangles; the art pass swaps sprites in week 5.

- [ ] **T1 Scaffold.** Vite + React + TS + Phaser 4: a React page that mounts the game canvas at 384 × 216 FIT, Vercel deploy, CLAUDE.md with these docs' rules. *Done when:* a preview URL shows a letterboxed canvas on iPhone and desktop.
- [ ] **T2 Input.** `InputRouter` + `TouchControls` with a debug scene showing live input values. *Done when:* stick + fire work with two thumbs at once on a phone, and keys and a gamepad drive the same values.
- [ ] **T3 MissionState, tuning, seeded RNG.** Vitest tests for city loss, plane cap 9, Stage 5 unlock, and same seed = same sequence. *Done when:* tests pass.
- [ ] **T4 Hangar.** Full Stage 2 spec. *Done when:* the Dec 6 phone slice gate passes.
- [ ] **T5 Map + HUD + loop.** Map → hangar → placeholder stages → map, impact clock, pause. *Done when:* 4 launches cycle and a missed clock costs a city.
- [ ] **T6 Attack run.**
- [ ] **T7 Silo strike** + `pseudo3d.ts`.
- [ ] **T8 Assault.**
- [ ] **T9 Reactor + escape.**
- [ ] **T10 React shell.** Title, theme and difficulty picker, settings, how-to cards, results, PWA install.
- [ ] **T11 Sharing.** Score card + challenge links. *Done when:* a link sent from an iPhone opens the same mission on a desktop and shows both scores.
- [ ] **T12 Theme packs.** Cold Front and Xenoworld art, music and strings.
- [ ] **T13 Leaderboard + daily mission** (Supabase). P1: ships in v1 only if time allows.
- [ ] **T14 Device QA, tuning, Playwright smoke tests, launch.**

### Rules for CLAUDE.md

- Read the PRD and this design doc before each ticket; never invent numbers, add them to `tuning.ts`.
- No stage code reads raw keys or pointers; only `InputRouter` output.
- Never call `Math.random` in game code; use `rng.ts`.
- No theme names, colours or asset paths in stage code; read them from the active `ThemePack`.
- React never touches game objects; it talks to Phaser only through `GameBridge`.
- Every new stage must run at 375 × 667 landscape and 1920 × 1080.
- Use Phaser 4 APIs; check the v4 docs before using any Phaser 3 example.

### Example ticket prompt

```
Implement T4 Hangar per the design doc, section "Stage 2 — Hangar launch".
Use InputRouter (moveX = rotate, moveY up = thrust, action = doors/spare).
All numbers from tuning.ts. Placeholder art: rectangles.
Add a debug overlay toggled with F1 showing speed, angle, door timer.
Finish by running tests and opening a Vercel preview.
```
