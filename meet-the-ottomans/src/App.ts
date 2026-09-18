/**
 * App.ts — the scene router and top-level lifecycle owner.
 *
 * Scene numbers (module-level `sceneNum`):
 *   -2  title screen          (world/scenes/titleSceen.ts — yes, the file name is misspelled, imports match it)
 *    0  globe map             (world/scenes/default.ts)
 *  666  death screen          (shown by Player.die via showDeathScreen; changeScene(666) exists for direct routing)
 *  777  victory screen        (triggerVictory routes here after marking progress)
 *  888  end-game screen       (all non-secret battles complete)
 *
 * Battle scenes are NOT routed through changeScene — the map (default.ts) calls
 * each battle scene function directly after the briefing screen. Because of that,
 * battle scenes must do their own teardown (unloadAll + input detach) at entry.
 *
 * changeScene() performs the full teardown for routed scenes:
 *   hide screens → remove HUD → clear active boss → run scene-cleanup handlers →
 *   clear overlay DOM → detach input/app listeners → destroy all root entities →
 *   bump the scene generation (stale bindSceneListener loops self-detach).
 *
 * triggerVictory(battleName) records completion in localStorage
 * (util/battleProgress.ts, key "meetTheOttomans.battleProgress") and routes to the
 * victory or end-game screen. 'Northwood High School' (period 8) never counts
 * toward the end-game condition.
 */
import { AppBase } from "playcanvas";
import { Battle } from './world/Battle';
import { defaultScene } from './world/scenes/default';
import { titleScreen } from "./world/scenes/titleSceen.ts";
import { loadAmmo } from "./ammo.js";
import { hideDeathScreen, showDeathScreen } from "./world/scenes/deathScreen.ts";
import { hideVictoryScreen, showVictoryScreen } from "./world/scenes/victoryScreen.ts";
import { hideEndGameScreen, showEndGameScreen } from "./world/scenes/endGameScreen.ts";
import { Boss } from "./world/npc/bosses/boss.ts";
import { unloadAll } from "./util/unloadall.ts";
import { removeBattleHUD } from "./util/battleHUD";
import { DevConsole } from "./util/devConsole";
import { markBattleComplete, isAllNonSecretComplete } from "./util/battleProgress";
import {
  runSceneCleanupHandlers,
  bumpSceneGeneration,
  setupAppInput,
} from "./util/sceneCleanup";

const DEV_MODE =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev'));

// The dev console is only reachable in builds opened with `?dev` (or during
// local `vite dev`). Production builds skip the console UI and its Tab
// listener entirely — no god mode, no killall for players.
if (DEV_MODE) {
  DevConsole.init();
}

/**
 * Setup the PlayCanvas app
 * @param canvas - The canvas element
 * @param onClick - The function to call when the user clicks on the sphere
 */

// App.ts
var sceneNum = -2;
function ensureOverlayRoot(): HTMLElement {
  let overlay = document.querySelector('.absolute.overlay') as HTMLElement | null;
  if (!overlay) {
    const host = document.querySelector('#root > div') as HTMLElement | null ?? document.body;
    overlay = document.createElement('div');
    overlay.className = 'absolute overlay';
    host.appendChild(overlay);
  }

  overlay.style.display = '';
  return overlay;
}

const AmmoLib = await loadAmmo();
console.log("Ammo initialized", {
  runtime: (globalThis as { __ammoRuntime?: unknown }).__ammoRuntime ?? "unknown",
  api: AmmoLib
});

async function setupApp(
  canvas: HTMLCanvasElement,
  onClick: (battle: Battle) => void,
  getSelectedTimePeriod: () => number //yucky
) {
  const app = new AppBase(canvas);
  DevConsole.setApp(app);
  getSelectedTimePeriod(); // call this once to initialize the time period

  // Pre-register input devices regardless of which scene ends up calling
  // app.init() — scenes used to fall back to `if (!app.keyboard) ...`, which
  // default.ts never triggered (it's the only scene that never set keyboard).
  setupAppInput(app);

  // If we're starting on the title screen, show it and wait for the user to start
  if (sceneNum === -2) {
    const renderFn = await titleScreen(canvas, app, onClick, getSelectedTimePeriod, sceneNum);
    // ^^^ scene functions should always be defined as HTMLCanvasElement, AppBase, onClick callback, getSelectedTimePeriod callback (if necessary), sceneNum
    return renderFn;
  }

  if (sceneNum === 0) {
    const renderFn = await defaultScene(canvas, app, onClick, getSelectedTimePeriod, sceneNum);
    return renderFn;
  }
  return undefined;
}

export { setupApp };

export async function changeScene(
 canvas: HTMLCanvasElement,
 app: AppBase,
 sceneNum: number,): Promise<unknown> {
 // Clear transient UI and runtime listeners so a scene switch starts clean.
  hideDeathScreen();
  hideVictoryScreen();
  hideEndGameScreen();
  removeBattleHUD();
  Boss.setActiveBoss(null);
  DevConsole.setPlayer(null);
  DevConsole.setNpcs([]);
  DevConsole.setApp(app);
  (globalThis as any).__devConsolePlayer = null;
  runSceneCleanupHandlers(app);
  const overlay = ensureOverlayRoot();
  overlay.replaceChildren();
  app.mouse?.off();
  app.keyboard?.off();
  app.touch?.off();
  app.off('update');
  unloadAll(app);
  bumpSceneGeneration();
  if (sceneNum === -2) {
    return await titleScreen(canvas, app, () => {}, () => 0, sceneNum);
  } else if (sceneNum === 0) {
    return await defaultScene(canvas, app, () => {}, () => 0, sceneNum);
  } else if (sceneNum === 666) {
    return await showDeathScreen({
      app,
      onMainMenu: () => changeScene(canvas, app, 0),
      message: "You have failed to bring glory to the Ottoman Empire. Game Over."
    });
  } else if (sceneNum === 777) {
    const victoryMessage = Boss.consumeLastBossDeathTaunt() ?? "Victory! All enemies defeated.";
    return await showVictoryScreen({
      app,
      onMainMenu: () => changeScene(canvas, app, 0),
      message: victoryMessage
    });
  } else if (sceneNum === 888) {
    return await showEndGameScreen({
      app,
      onProceed: () => changeScene(canvas, app, 0),
      onReturnToMap: () => changeScene(canvas, app, 0),
      onMainMenu: () => changeScene(canvas, app, -2),
    });
  }

  return undefined;
}

export function triggerVictory(battleName: string, canvas: HTMLCanvasElement, app: AppBase): void {
  markBattleComplete(battleName);
  if (battleName !== 'Northwood High School' && isAllNonSecretComplete()) {
    changeScene(canvas, app, 888);
  } else {
    changeScene(canvas, app, 777);
  }
}
