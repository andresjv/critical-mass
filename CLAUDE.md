# Critical Mass — project rules for Claude Code

Browser arcade game, one codebase for phone, tablet and desktop. Modern remake of the
*structure* of a 1984 multi-stage arcade game, with original name, art, music and setting.

## Source of truth
- `docs/PRD.md` — what we build and why (requirement IDs F-xx, T-xx, S-xx).
- `docs/DESIGN.md` — how each stage plays, controls, tuning numbers, architecture, ticket list (T1–T14).
- Read both before every ticket. If a number is missing, add it to `src/state/tuning.ts` and say so; never hard-code it in stage code.

## Stack (do not change without asking)
- Vite + React + TypeScript (strict) + Phaser 4 (pin the exact 4.2.x version in package.json).
- Phaser 4 APIs only. Most examples online are Phaser 3: check the v4 docs before copying one.
- Vitest for unit tests, Playwright for smoke tests.
- Deploy: Vercel via GitHub integration. Push to a branch = preview URL; merge to `main` = production. Never ask for or store Vercel tokens.

## Architecture rules
- Internal canvas **1280 × 720**, Phaser scale mode FIT, letterboxed. `pixelArt: false`, `antialias: true`. Rendered at `devicePixelRatio` via Phaser's default DPI handling.
- All px-based constants (speeds, sizes, distances) are pre-multiplied by `WORLD_SCALE = 10/3` from `tuning.ts`. Never hard-code raw pixel values.
- All text in-game lives in the **React `<GameOverlay />`** component (Space Grotesk for labels, JetBrains Mono for numbers). Never call `scene.add.text()` in stage code; write to `missionState.hudCue` or `gameUi` and let React display it. Exception: temporary full-screen overlays (game over, loading) may use canvas text.
- Game logic steps at a fixed 60 Hz; rendering is decoupled.
- Stage code reads only `InputRouter` output `{moveX, moveY, fire, action, pause}`; never raw keys, pointers or gamepads. `InputScene` (persistent parallel scene) owns keyboard + gamepad → InputRouter.
- `MissionState` and `gameUi` are plain TypeScript (no Phaser imports). `MissionState` is unit-tested.
- Never call `Math.random` in game code; use `src/state/rng.ts` (seeded). Same seed must give the same mission.
- No theme names, colours or asset paths in stage code; read them from the active `ThemePack`.
- React never touches Phaser objects; it reads `missionState`, `debugInfo`, and `gameUi` (all plain TS) via `useHudState` (rAF polling).
- Action key: Shift, K, or X on keyboard; B on gamepad; ◉ on touch. `gameUi.device` tracks last active device for label rendering.
- Placeholder art = coloured rectangles until the art pass (T12).

## Definition of done for every ticket
1. `npm run typecheck`, `npm test` and `npm run build` pass.
2. Works at 375 x 667 landscape (touch) and 1920 x 1080 (keyboard).
3. Pauses on tab switch / app background.
4. Commit on a branch named `t<N>-<short-name>`, push, and report the Vercel preview URL.
5. End with: what was built, what to test on the phone, and any open questions.

## Working style
- One ticket per session. Plan first in 5–10 bullets, then build.
- Small commits with clear messages.
- If something in the docs conflicts or is unclear, stop and ask instead of guessing.
