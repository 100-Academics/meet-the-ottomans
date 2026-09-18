# Meet the Ottomans

An AP World History game built with **PlayCanvas + TypeScript + Vite**. You play Bob
Jefferson, last descendant of Sultan Suleiman the Magnificent, traveling back through
21 historical battles across 7 time periods to bring glory back to the Ottoman Empire.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Prerequisites: **Node.js ^20.19.0 or ≥ 22.12.0** (enforced by a predev hook).

| Command           | What it does                                                  |
|-------------------|---------------------------------------------------------------|
| `npm run dev`     | Vite dev server with HMR (extracts the Tower boss model first) |
| `npm run build`   | Type-check (`tsc --noEmit`) + production bundle to `dist/`     |
| `npm run preview` | Serve the production build locally                             |

`npm run build` is the project's only automated verification — it must pass before
any change is considered done. There is no lint or test suite.

## How the game works (60-second tour)

1. **`src/main.ts`** injects a canvas + overlay div and calls `setupApp()`.
2. **`src/App.ts`** routes between scenes by number:
   `-2` title screen → `0` the rotating globe map → battle scenes; special scenes
   `666` death / `777` victory / `888` end-of-game are handled by `changeScene`.
3. **`src/world/scenes/default.ts`** is the globe map: pick a time period, click a
   glowing beam, read the briefing, then it dispatches to that battle's scene file
   in `src/world/scenes/`.
4. Each battle scene (e.g. `battleOfLegnica.ts`) loads its battlefield GLB, spawns
   the player (`src/player/player.ts`, WASD + first-person camera), NPC troops and a
   boss (`src/world/npc/`), then runs a per-frame combat loop until the boss dies
   (victory) or the player dies (death quiz for a second chance).
5. Wins and collected secrets persist in `localStorage`. Collecting all 12 secrets
   unlocks time period 8 (the secret Northwood High School battle).

## Project layout

```
src/
├── App.ts                # scene router + changeScene teardown
├── main.ts               # bootstrap
├── ammo.js / ammo.d.ts   # Ammo (Bullet) physics loader: wasm → asm fallback
├── player/               # Player, FirstPersonCamera, weapons (sword, gun, bow)
├── world/
│   ├── Battle.ts         # battle metadata (name, period, lat/lon)
│   ├── secrets.ts        # collectible secrets (gate for period 8)
│   ├── scenes/           # one file per battle + title/death/victory/end screens
│   └── npc/
│       ├── npc.ts              # base NPC: teams, wander/chase/attack AI
│       ├── sceneNpcSystem.ts   # per-scene combat loop wiring
│       ├── sceneNpcPresets.ts  # spawn positions/configs per battle
│       ├── troops/             # per-era soldier classes
│       └── bosses/             # Boss base + ~20 historical bosses
└── util/                 # loadModel, applyCollision, battleHUD, battleProgress,
                          # battleSceneHelpers, devConsole, questions, sceneCleanup…
scripts/                  # node version check, 7z extractor, globe JS helpers
```

**Working on this repo as an agent?** Read `../AGENTS.md` first — it documents
the scene lifecycle contracts, cleanup rules, and the pitfalls that have bitten
people before.

## Tech notes

- TypeScript ~6, strict, no-emit; Vite 8 (rolldown). `npm run build` = `tsc && vite build`.
- Physics: Ammo.js (Bullet), loaded at startup with wasm→asm fallback (`src/ammo.js`).
- Models: GLBs under `src/assets/`, resolved by an `import.meta.glob` index
  (`src/util/loadModel.ts`).
- Dev console: press **Tab** in `npm run dev` (or add `?dev` to the URL).

## Deployment

`npm run build` → static bundle in `dist/`, deployable to any static host.
