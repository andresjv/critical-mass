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
- Internal canvas 384 x 216, Phaser scale mode FIT, letterboxed.
- Game logic steps at a fixed 60 Hz; rendering is decoupled.
- Stage code reads only `InputRouter` output `{moveX, moveY, fire, action, pause}`; never raw keys, pointers or gamepads.
- `MissionState` is plain TypeScript (no Phaser imports) and is unit-tested.
- Never call `Math.random` in game code; use `src/state/rng.ts` (seeded). Same seed must give the same mission.
- No theme names, colours or asset paths in stage code; read them from the active `ThemePack`.
- React never touches Phaser objects; it talks to the game only through `GameBridge`.
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
