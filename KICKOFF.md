# Critical Mass — prototype kickoff

Goal: a playable prototype in 3 sessions that you can test on your phone and laptop.
Prototype = one full launch run (map -> hangar -> attack run -> silo strike -> back to map)
with placeholder art, touch + keyboard controls, the impact clock, and a challenge link.
Assault, reactor, themes and leaderboards come after we test this.

## One-time setup (about 10 minutes, done by you)
1. Create an empty GitHub repo, e.g. `andresjv/critical-mass` (private is fine).
2. Clone it, then put these in it:
   - `CLAUDE.md` (this pack)
   - `docs/PRD.md` and `docs/DESIGN.md`: open each doc in Claude, use the doc's Export menu -> Markdown, save with these names.
3. Start Claude Code in the repo folder and paste the Session 1 prompt below.
4. After Session 1 pushes its first commit: in Vercel, Add New -> Project -> Import the repo.
   Framework preset: Vite. Build: `npm run build`. Output: `dist`. Deploy.
   From then on every push gets a preview URL; `main` is production.

## Session 1 prompt — foundation (T1 + T2 + T3)
```
Read CLAUDE.md, docs/PRD.md and docs/DESIGN.md.
Do tickets T1, T2 and T3 from the design doc's build plan, in order.
- T1: Vite + React + TypeScript + Phaser 4 (pin 4.2.x). React page mounts the game canvas
  at 384x216 FIT. Add scripts: dev, build, typecheck, test. Add vercel.json only if needed.
- T2: InputRouter + TouchControls + a debug scene that shows live input values.
  Touch: floating stick bottom-left, Fire + Action bottom-right, multi-touch.
- T3: MissionState, tuning.ts (Pilot values from the design doc, all 3 difficulties),
  seeded rng.ts, with Vitest tests.
Plan first, then build. Commit per ticket on branch t1-t3-foundation, push,
and tell me exactly what to test on my phone.
```

## Session 2 prompt — first playable stages (T4 + T5)
```
Read CLAUDE.md and the design doc sections "Stage 1 — Command map", "Stage 2 — Hangar launch",
"Controls" and "Tuning and difficulty".
Do T4 (Hangar) and T5 (Map + HUD + loop) with placeholder stages for attack run and silos.
Add an F1 debug overlay (fps, speed, angle, door timer, impact clock).
Branch t4-t5-hangar-loop. Push and give me the preview URL and a test checklist.
```

## Session 3 prompt — complete one launch run + sharing (T6 + T7 + part of T11)
```
Read CLAUDE.md and the design doc sections for Stage 3, Stage 4 and "Sharing and playing with friends".
Do T6 (Attack run) and T7 (Silo strike + pseudo3d.ts), replacing the placeholders.
Then add the challenge link from T11: encode seed, theme, difficulty, name and score in the URL;
opening it starts the same mission and shows both scores at the end.
Branch t6-t7-prototype. Push, give me the preview URL, and list what to test.
```

## Test checklist after each session
- [ ] iPhone Safari, landscape: controls respond, two thumbs at once, no page scroll or zoom.
- [ ] Android Chrome: same, and smooth (F1 overlay shows 50+ fps).
- [ ] Laptop: keyboard works; gamepad if you have one.
- [ ] Switch apps mid-game: it pauses and resumes.
- [ ] Note anything that feels wrong and paste it into the next session.
