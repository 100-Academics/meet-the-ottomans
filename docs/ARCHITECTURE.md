# Architecture Reference

Companion to the root agent guide (`../PENDING-DOCS.md`, intended `AGENTS.md`).
This file documents each subsystem in enough detail to make targeted fixes without
reading every file end-to-end. Paths are relative to `meet-the-ottomans/`.

## 1. Boot flow

`index.html` → `src/main.ts` → `setupApp()` in `src/App.ts` (top-level awaits
`loadAmmo()` first, so physics is ready before any scene runs) → title screen
(`scene -2`) → globe map (`scene 0`, `world/scenes/default.ts`).

## 2. Scene contract

Two shapes exist:

```ts
// Map-style (title screen, globe map)
scene(canvas, app, onClick, getSelectedTimePeriod, sceneNum): Promise<RenderFn>
// Battle-style (everything under world/scenes/battleOf*)
scene(canvas, app, onClick, sceneNum, spawnPoint?): Promise<unknown>
```

Rules every scene must follow:

1. Call `unloadAll(app)` at entry (destroys prior scene's entities).
2. Call `resetXState()` for its module-level flags (e.g. `isBossSpawned`) — module
   state survives scene switches.
3. Register teardown via `registerSceneCleanup(app, fn)` for anything that survives
   the scene: DOM nodes, `setInterval`s, window listeners.
4. Use `bindSceneListener(app, 'update', fn)` for update loops — never raw
   `app.on('update', ...)` (it leaks across battle restarts).
5. The globe map calls battle scenes directly, bypassing `App.changeScene` — so
   battle scenes cannot rely on changeScene's teardown having run; that's why
   rules 1–4 exist.

## 3. The globe map (world/scenes/default.ts)

- Battles are declared as a hardcoded `new Battle(period, [lat, lon], name, entity)`
  list at the top of `defaultScene`. Adding a battle = add to this list + a
  briefing in `battleSummaries.ts` + a scene file + a dispatch branch in the big
  if/else chain + (optionally) add the name to `NON_SECRET_BATTLES` in
  `util/battleProgress.ts`.
- Markers are cylinder "beams" placed by lat/lon (`latLonToSpherical`,
  `pointOnSphere`). Location units are **degrees** throughout.
- Picking is done with a `Picker` at 0.5× canvas resolution, throttled to 100 ms.
- The question/test pill in the corner uses `util/question.ts` +
  `util/questionPool.ts` (period-scoped AP history questions; also used by the
  death-quiz revive flow).

## 4. Player (src/player/)

- `Player` wraps a camera entity + `FirstPersonCamera` script
  (`FirstPersonCamera.ts`: WASD, sprint, jump, gravity via down-raycast onto
  `"ground"`-tagged rigidbodies).
- Weapons (`weapon/weapon.ts` base): `Sword` (melee raycast), `Gun` (raycast with
  magazine/reload), `Bow` (projectile arcs via per-frame physics sim).
  `Player.attack()` routes by equipped weapon class.
- Damage intake respects god-mode and the 3-second post-revive grace period; death
  latches once (`hasDied`) and shows the death screen, which offers a quiz revive
  (`setDeathQuizContext` wires period + restart callback per scene).

## 5. NPC system (src/world/npc/)

- `npc.ts`: base class — team, health, wander/chase/attack state machine.
  `updateCombatAI(dt, timeSec, allNpcs, onNpcAttack, playerEntity, onPlayerAttack)`
  is called once per frame per NPC by the scene loop.
- `sceneNpcSystem.ts`:
  - `spawnSceneNpcs(app, rigidbodySystem, spawnPoints, options)` loads troop/boss
    models (via `util/loadModel.ts`), applies collision, waits for Ammo ground
    (`util/spawnHelpers.ts#waitForAmmoReady`) so nothing spawns mid-air.
  - `bindNpcCombatLoop(...)` installs the per-frame loop via `bindSceneListener`.
- `sceneNpcPresets.ts`: per-battle spawn coordinates and option bags
  (`*_NPC_SPAWN_POINTS`, `*_BOSS_SPAWN_POINT`, `DEFAULT_*_SPAWN_OPTIONS`).
- `bosses/boss.ts`: Boss extends npc; adds DOM health bar, taunt engine (phase-based
  pools: healthy/low-boss/low-player/both-low/death), and the static registry:
  `Boss.setActiveBoss(b)`, `Boss.consumeLastBossDeathTaunt()` (used by the victory
  screen), `Boss.getActivePlayerDeathTaunt()` (used by the death screen).
- Troop/boss subclasses mostly override `getCombatProfile()`, model path, and taunts.

## 6. Physics & models

- `src/ammo.js` + `src/ammo.d.ts`: loads Ammo with fallback chain
  ammojs3-wasm → ammojs3 asm.js → legacy ammo.js. Runtime name lands on
  `globalThis.__ammoRuntime`; `applyCollision.ts` branches on it.
- `util/loadModel.ts`: `loadModel(path, app, {rigidbodyType, position, rotation,
  scale, includeDescendants})`. Path resolution goes through an eager
  `import.meta.glob` index; `assets/`, `models/`, `world/` prefixes all work.
- `util/applyCollision.ts`: `applyMeshCollision` builds convex-hull / mesh
  colliders; battlefield GLBs are tagged `"ground"` and get static rigidbodies.
- Ground queries: `getHighestGroundHitY(app, x, z, 'ground', {terrainBounds?})`
  in `util/battleSceneHelpers.ts`.

## 7. UI & persistence

- All battle UI is plain DOM inside/over the canvas: `util/battleHUD.ts`
  (health/ammo), boss health bar (in `boss.ts`), secrets popup (`world/secrets.ts`),
  screens (`deathScreen`, `victoryScreen`, `endGameScreen`), briefing overlay
  (in `default.ts`).
- Persistence (localStorage):
  - `meetTheOttomans.battleProgress` — completed battle names (`battleProgress.ts`).
  - `meetTheOttomans.secretsFound` — secret count (`secrets.ts`); all 12 unlock
    period 8.
- Styles live in `src/style.css` (`.pill`, `.btn`, screen overlays, console).

## 8. Dev console (util/devConsole.ts)

Replaced by nothing — it's a custom in-page command line. Toggle with **Tab**,
only in `npm run dev` or `?dev` URLs (`App.ts` gates `DevConsole.init()`).
Register commands:
`DevConsole.register('cmd', 'description', async (args) => {...}, hint?)`.
Built-ins include god mode, killall, teleport-ish helpers; read the bottom of the
file for the authoritative list.

## 9. Build system

- `scripts/ensure-node-version.cjs` (predev) enforces the pinned Node range.
- `scripts/extract-tower.cjs` (predev/prebuild/preview) unpacks
  `src/assets/models/Tower_00001_.7z` via 7zip-bin, cached by sha256 marker.
- `scripts/world/sphereHeightmap.js`, `sphereTexture.js` — plain-JS globe
  displacement/texture helpers with no type declarations; imported in `default.ts`
  behind `@ts-expect-error`. Keep those comments in place.
- `npm run build` = `tsc && vite build`. There is no test suite and no linter;
  the type check is the whole gate.
