# Critical Mass — PRD

Nov 25, 2026 · Andres Jimenez

## Summary

We are building **Critical Mass**: a browser game that plays in under 15 minutes on a phone or a laptop. It is a modern remake of the structure of *Raid Over Moscow* (Access Software, 1984), with an original name, art, music and setting. *Critical Mass* is a working title.

The original was six short arcade stages chained into one mission: a strategic map, a zero-gravity hangar launch, a low-altitude attack run, a silo strike, a frontal assault with a mortar, and a reactor fight with bouncing discs. Each stage used a different skill. That variety is what we keep.

### Goals

1. **One codebase, every device.** One web codebase (TypeScript, React + Phaser) runs in any modern browser on phone, tablet and desktop, and installs as a PWA. No native apps.
2. **Faithful structure, modern feel.** Keep the six-stage mission, the impact countdown and the lives economy. Add checkpoints, readable feedback and short sessions.
3. **Pick your world.** Before each mission the player chooses a theme. v1 ships an Earth theme and an Alien theme: same rules, different art, names and music.
4. **Play with friends, no accounts.** Share a score card, or send a challenge link that replays the exact same mission.
5. **Ship v1 in 6 weeks.** Built by Andrés directing Claude Code, deployed on Vercel.
6. **Legally clean.** No original name, code, graphics, sound or real-world target.

### Non-goals for v1

- Real-time online multiplayer (v2 candidate)
- Native iOS or Android builds; an app-store wrapper (Capacitor) is a later option that reuses the same code
- Monetization (ads, in-app purchases)
- 3D rendering; v1 is 2D canvas with pseudo-3D projection where a stage needs it

## The original game: what we found

*Raid Over Moscow* was designed, programmed and scored by Bruce Carver at Access Software. It came out on the Commodore 64 in 1984 (U.S. Gold published it in Europe), with Atari 8-bit, Apple II, Amstrad CPC, ZX Spectrum and BBC Micro ports in 1985–86. It was Access's second best-selling C64 title after *Beach-Head*, and *Crash* gave the Spectrum version 92%. ([Wikipedia](https://en.wikipedia.org/wiki/Raid_over_Moscow), [Crash review](https://crashonline.org.uk/15/rmoscow.htm))

**Premise.** Soviet missiles launch at North American cities. Under a fictional arms treaty the US has no missiles, only a squadron of stealth spaceplanes docked at an orbiting space station. The player flies them to stop each launch, then leads commandos into Moscow to destroy the reactor beneath the defence centre.

### Stage by stage

| # | Stage | What the player does | Controls | Win | Lose |
| --- | --- | --- | --- | --- | --- |
| 1 | SAC world map | Watch a northern-hemisphere map; a launch site turns white and shows target city and time to impact | Space to go to the hangar | Respond to the launch | Impact countdown reaches 0 |
| 2 | Space station hangar | Fly a spaceplane out of the hangar in near-zero gravity; open the bay doors (they stay open briefly); launch extra planes as spares | Left/right rotate, forward = thrust, no brake (turn around and thrust to slow) | Clear the doors | Crash into walls; lose a plane |
| 3 | Attack run | Side-scrolling flight low over enemy terrain; use your shadow to judge height | Left/right bank, forward dive, back climb, fire | Reach the silos | Hit by missiles or tanks; ground contact on Advanced and Suicidal |
| 4 | Missile silos | One central control silo, four side silos; fire through each small window when your plane changes colour to show it is lined up | Move in 2D, fire | Destroy the central silo | Missile reaches its target first |
| 5 | Defence centre | A commando in a trench fires a mortar at a building facade: snipers on the walls respawn, tanks exit side doors, towers are bonus targets; one of 5 doors, random each game, leads to the reactor | Left/right move, forward/back aim elevation, fire | Clear soldiers and tanks, open the marked door | Run out of men |
| 6 | Reactor | Throw discs that bounce off the back wall to hit a maintenance robot from behind (it is armoured in front); catch returning discs | Left/right move, forward/back moves an aiming dot on the back wall, fire | Destroy all robots, then escape before the reactor goes critical | ETCM timer reaches 0, or out of men |
| 7 | Ending | Flight home and a results screen showing how many men survived | — | Escape bonus | — |

### Rules worth keeping

- **Four launches.** Leningrad, Kiev, Minsk and Saratov. Stage 5 unlocks only after the outer sites fall. Stages 2–4 repeat per launch.
- **The clock never stops.** Time to impact shows on every flight screen. A missile that lands before you kill the central silo costs you the planes in flight.
- **Risk for reward.** Each side silo gives high points and an extra plane, up to a cap of 9. Destroying all five silos gives a bonus.
- **Heat-seekers come from behind.** Fly low to let one pass, then shoot it from behind for bonus points.
- **Robots escalate.** Each robot takes 4 rear hits, and every hit makes it faster and more aggressive. Destroying one gives an extra disc. A disc in flight is saved if you die. With no discs left, you go back to the defence centre.
- **Final robot.** It ignores the reactor and hunts you; the reactor goes critical, and you have about 2 minutes to kill it and reach your plane.
- **Difficulty.** Beginner: no ground crashes, 2 robots. Advanced: ground crashes, 4 robots. Suicidal: ground crashes, 5 robots.
- **Quality of life.** Pause key; demo mode after about 1 minute idle; a hidden stage-select for practice.

### What reviewers criticised

- The first sequences felt trivial and sometimes irritating, then difficulty spiked.
- Each stage was a simple shoot-'em-up with little strategy.
- The theme drew protests. Finland's parliament debated a ban in 1985 after a Soviet petition, and West Germany put it on its harmful-media index the same year.

The manuals never published point values, starting lives, starting discs or exact timer lengths. We set those ourselves in the design doc.

## Players, platforms, success metrics

### Players

| Player | Context | What they need |
| --- | --- | --- |
| Retro player, 40–60 | Played C64/Spectrum games; shares links on forums and social media | Recognisable structure, fair difficulty, no download |
| Casual mobile player | Plays in 5–10 minute gaps, portrait or landscape, one thumb or two | One-screen tutorial per stage, checkpoints, pause on app switch |
| Desktop arcade player | Keyboard or gamepad, wants mastery | High scores, Suicidal difficulty, tight controls |

### Supported platforms

| Platform | Minimum | Input |
| --- | --- | --- |
| iOS Safari | iOS 16, iPhone SE (375 × 667) | Touch |
| Android Chrome | Android 10, mid-range phone | Touch |
| Desktop Chrome, Edge, Firefox, Safari | Last 2 versions | Keyboard, mouse, gamepad |
| Tablet | iPad 9th gen | Touch or gamepad |

Landscape is the primary orientation. Portrait shows a rotate prompt on phones; v1.1 may add portrait layouts.

### Success metrics (first 60 days)

| Metric | Target | How measured |
| --- | --- | --- |
| Load to playable | < 3 s on 4G | Lighthouse, field data |
| Frame rate | 60 fps desktop, ≥ 50 fps on a mid-range Android | In-game FPS sampling |
| Stage 2 completion (first try or after one retry) | ≥ 70% | Privacy-friendly analytics events |
| Full mission completion on Beginner | ≥ 25% of players who start | Analytics |
| Sessions on mobile | ≥ 50% | Analytics |
| Crash-free sessions | ≥ 99.5% | Error logging |

## Scope and functional requirements

v1 ships all six stages plus the ending. P0 blocks launch; P1 ships in v1 if time allows; P2 is v1.1.

### Mission flow

| ID | Requirement | Priority |
| --- | --- | --- |
| F-01 | Title screen: Play, Difficulty (Cadet / Pilot / Suicidal), How to play, Settings, High scores | P0 |
| F-02 | Strategic map shows 4 enemy launch sites; one launches at a time, showing target city and impact countdown | P0 |
| F-03 | Stages 2 → 3 → 4 repeat once per launch site; Stage 5 unlocks after all 4 sites fall | P0 |
| F-04 | Global impact countdown runs during Stages 2–4 and shows on the HUD | P0 |
| F-05 | A missile that lands destroys all planes in flight and costs the target city; losing 2 cities ends the game | P0 |
| F-06 | Stage 5 → 6 → escape → ending; results screen with score, survivors, cities saved | P0 |
| F-07 | Checkpoint at the start of each launch run and at Stage 5; Continue resumes there | P0 |
| F-08 | Practice mode: play any stage you have reached once | P1 |
| F-09 | Attract/demo mode after 60 s idle on the title screen | P2 |

### Stages

| ID | Requirement | Priority |
| --- | --- | --- |
| F-10 | Hangar: inertial flight (rotate + thrust, no brake), timed bay doors, launch spare planes | P0 |
| F-11 | Attack run: auto-scrolling terrain, altitude with a ground shadow, tanks, SAMs, enemy planes, heat-seekers from behind | P0 |
| F-12 | Silos: 1 central + 4 side silos with small windows; lined-up indicator; enemy fire at your altitude | P0 |
| F-13 | Side silo kill = bonus + 1 plane (cap 9); all 5 silos = clear bonus | P0 |
| F-14 | Assault: trench commando with an arcing mortar; respawning snipers, tanks, towers; 1 of 5 doors is the reactor door, random per run | P0 |
| F-15 | Reactor: bouncing discs, aiming dot, catchable returns, robots armoured in front, 4 hits each, faster after every hit | P0 |
| F-16 | Final robot triggers a 120 s meltdown timer; escape run to the plane | P0 |
| F-17 | One-screen "how to play" card before each stage's first appearance, skippable | P0 |

### Input, settings, persistence

| ID | Requirement | Priority |
| --- | --- | --- |
| F-20 | Touch controls per stage (layouts in the design doc), shown only on touch devices | P0 |
| F-21 | Keyboard and mouse on desktop; Gamepad API support | P0 / P1 |
| F-22 | Pause on button, Esc, and when the tab or app goes to the background | P0 |
| F-23 | Settings: music volume, SFX volume, haptics on/off, left-handed layout, reduced flashing | P0 |
| F-24 | Local high-score table (top 10) and checkpoint in localStorage | P0 |
| F-25 | Installable PWA; plays offline after first load | P1 |
| F-26 | Online leaderboard (now S-03) | P2 |

### Themes

| ID | Requirement | Priority |
| --- | --- | --- |
| T-01 | Theme picker next to difficulty select: preview art, one-line premise | P0 |
| T-02 | A theme changes art, names, music, SFX and story text only. Rules, timing and scoring stay identical, so scores compare across themes | P0 |
| T-03 | v1 themes: **Cold Front** (Earth-like, 1980s, fictional nations) and **Xenoworld** (alien planet, organic hive enemy) | P0 |
| T-04 | Third theme in v1.1; candidates: Deep Ocean, Neon Grid, Desert Empire | P2 |
| T-05 | Last theme remembered; high scores tagged by theme | P1 |

### Sharing and playing with friends

| ID | Requirement | Priority |
| --- | --- | --- |
| S-01 | Score card: results screen renders a 1200 × 630 image (score, theme, difficulty, cities saved) and shares it through the Web Share API; fallback = download + copy link | P0 |
| S-02 | Challenge link: the URL carries mission seed, theme, difficulty and the sender's score. The friend plays the same launch order, enemy waves and reactor door, then sees both scores side by side | P0 |
| S-03 | Online leaderboard per theme × difficulty, daily and all-time, nickname only | P1 |
| S-04 | Daily mission: one seed per day for everyone, with its own board | P1 |
| S-05 | Pass-and-play: 2 players alternate launch runs on one device, as 1980s games did | P1 |
| S-06 | Real-time online co-op (one pilots, one defends) | P2, v2 |

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | 60 fps target; fixed 60 Hz simulation step, decoupled from render; ≤ 150 draw calls per frame |
| Load size | Initial JS ≤ 250 KB gzipped; total assets ≤ 8 MB; stage assets lazy-loaded |
| Resolution | Internal 1280 × 720 canvas, rendered at `devicePixelRatio`, letterboxed to any aspect ratio via Phaser Scale FIT (`pixelArt: false`, `antialias: true`). Text rendered in React HTML overlay. |
| Touch | Hit targets ≥ 48 × 48 CSS px; no double-tap zoom; no scroll or pull-to-refresh during play; safe-area insets respected |
| Audio | Web Audio unlocked on first tap; music and SFX on separate buses; mute respected |
| Accessibility | Reduced-flashing mode (no full-screen flashes above 3 per second); colour-blind-safe "lined up" cues (shape + colour); remappable keys; captions for spoken warnings |
| Privacy | No accounts; leaderboard entries carry a nickname only; no third-party trackers; cookieless analytics only |
| Reliability | Survives tab switch, orientation change and audio interruption (phone call) without losing state |
| Hosting | Static build on Vercel; HTTPS; cache-busted assets. Supabase only for leaderboards and the daily seed |

## Legal, IP and theme decisions

We copy the structure and rules, not the expression. Game mechanics are generally not protected by copyright; the name, code, graphics, music, text and characters are. I'm not a lawyer, so get a quick IP review before any commercial launch.

| Item | Decision |
| --- | --- |
| Title | Original name (working: *Critical Mass*). Never use "Raid Over Moscow" or "Raid" in the title, store listing or metadata |
| Code | Written from scratch; no disassembly or ported routines |
| Graphics and music | Original pixel art and an original chiptune score; no traced sprites, no Bruce Carver melodies |
| Setting | Every theme uses invented factions, places and names; no USSR, Moscow or Kremlin |
| Marketing copy | "Inspired by 1980s multi-stage arcade games" is fine; avoid implying an official remake |

### Why a fictional setting

- The original's real-world target caused bans and protests in 1985; a game today about attacking a real capital carries the same risk, plus store and ad-platform review problems.
- An invented setting frees the art: our own skyline, our own fortress facade, our own reactor.
- Example (Cold Front theme): the player defends the **Coastal Union** from the **Iron Directorate**, whose four launch sites are Varna Ridge, Kessel, Ostrow and Tal Mir, and whose capital is **Vostgrad**.

**Decision needed:** keep the fictional setting, or go historical (real Cold War names) and accept the review risk.

## Milestones and open questions

| Milestone | Dates |
| --- | --- |
| Engine + hangar stage | Nov 30 – Dec 6, 2026 |
| Phone slice gate | Dec 6 |
| Attack run + silos | Dec 7 – Dec 13 |
| Assault + reactor | Dec 14 – Dec 20 |
| Mission loop, HUD, saves | Dec 21 – Dec 27 |
| Art + audio pass | Dec 28 – Jan 3, 2027 |
| Device QA + tuning | Jan 4 – Jan 10 |
| Public launch | Jan 11, 2027 |

The phone slice gate on Dec 6 is the go/no-go: the hangar stage must run at ≥ 50 fps on a mid-range Android with touch controls that feel right. If it fails, we fix input before building more stages. The Dec 21–Jan 3 holiday weeks may slip; launch moves with them. Two themes double the week-5 art and music load; if it runs long, Xenoworld ships in v1.1. Sharing (S-01, S-02) lands in week 4 with the mission loop.

### Open questions

- [ ] Fictional setting or historical names? (see Legal)
- [ ] Final title: *Critical Mass*, or another?
- [ ] Lives model: one shared pool of planes and men (original), or separate pools?
- [ ] Free and ad-free forever, or a paid "director's cut" later?
- [ ] Who makes the art and music: Andrés, a freelancer, or AI-assisted with hand cleanup?

## Sources

- [Raid over Moscow — Wikipedia](https://en.wikipedia.org/wiki/Raid_over_Moscow)
- [Raid over Moscow — C64-Wiki](https://c64-wiki.com/wiki/Raid_over_Moscow)
- [Atari manual text, Brian Hendricks](https://ctrl-alt-rees.com/archive/www.cyou.com-~richard/RAID.TXT)
- [Crash issue 15 review](https://crashonline.org.uk/15/rmoscow.htm)
- [Personal Computer Games review](https://everygamegoing.com/larticle/Raid-Over-Moscow-000/31512)
