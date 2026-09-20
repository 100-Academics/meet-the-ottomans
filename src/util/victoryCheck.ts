import type { AppBase } from "playcanvas";
import { bindSceneListener } from "./sceneCleanup";

/**
 * Shared "have the foes lain down their arms?" checker for battle scenes.
 *
 * Every battle scene used to copy-paste the same update-loop body:
 * count living foes, fire victory when the boss is down, otherwise spawn
 * the boss. Two bugs kept recurring in the copied bodies, so they now
 * live here exactly once:
 *
 * 1. The check was bound with a RAW `app.on("update", victoryCheck)`,
 *    which survived scene switches on the map→battle path (that path
 *    bypasses changeScene and its `app.off('update')`). A stale checker
 *    kept reading the old module-level `isBossSpawned` flag — still true
 *    from the previous visit of the scene — on the new scene's fresh,
 *    empty npc array, saw zero living foes, and fired triggerVictory the
 *    very first frame: the "instant victory" bug. `bindSceneListener`
 *    auto-detaches when the scene generation drifts.
 * 2. Spawn functions set `isBossSpawned = true` even when
 *    `spawnSceneNpcs` produced zero foes (empty spawn-point arrays,
 *    playerSafeRadius skips at x:0/z:0, per-spawn load failures that get
 *    caught inside the spawner). With zero foes in the world, the same
 *    update loop then saw `remainingFoes.length === 0 && isBossSpawned`
 *    and auto-victored. Callers must now use `bossActuallySpawned()`,
 *    which only lets the flag be set when at least one foe actually
 *    entered the world.
 */

export interface VictoryCheckOptions {
  /** Refuse victory while the death/quiz screen is up. */
  isDeathScreenVisible: () => boolean;
  /** Living foes in THIS scene's npc list. */
  getRemainingFoes: () => number;
  /** Whether a boss has actually been placed in the world. */
  isBossSpawned: () => boolean;
  /** Called once when the level is cleared. */
  onVictory: () => void;
  /** Kick off the boss spawn; the shared checker won't re-request it. */
  spawnBoss: () => void;
}

/**
 * Bind a victory check to the scene's update loop. Detaches itself on
 * scene change (via bindSceneListener) and fires victory at most once.
 */
export function bindVictoryCheck(app: AppBase, opts: VictoryCheckOptions): () => void {
  let victoryHandled = false;
  let spawnRequested = false;

  const victoryCheck = () => {
    if (opts.isDeathScreenVisible()) return;
    if (victoryHandled) return;
    const remainingFoes = opts.getRemainingFoes();
    if (remainingFoes === 0 && opts.isBossSpawned()) {
      victoryHandled = true;
      opts.onVictory();
    } else if (remainingFoes === 0 && !opts.isBossSpawned() && !spawnRequested) {
      spawnRequested = true;
      opts.spawnBoss();
    }
  };

  return bindSceneListener(app, "update", victoryCheck);
}

/**
 * Gate for a scene's module-level `isBossSpawned` flag. Boss spawn
 * routines must set the flag ONLY when this returns true — a spawn that
 * produced zero foes (all skipped, load failed, empty spawn list) must
 * leave the flag false so the victory check keeps trying instead of
 * auto-declaring victory with no boss on the field.
 */
export function bossActuallySpawned(spawned: readonly unknown[]): boolean {
  return spawned.length > 0;
}
