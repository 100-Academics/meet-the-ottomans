import { AppBase, Keyboard, Mouse, TouchDevice } from "playcanvas";

/**
 * Shared scene-cleanup registry and scene-generation guard.
 *
 * Two cooperating mechanisms keep per-scene listeners from leaking:
 *
 * 1. Cleanup handlers: any scene can push a teardown callback via
 *    `registerSceneCleanup(app, fn)`. They run on `changeScene` and at the
 *    start of every battle scene (the map→battle path previously bypassed
 *    `changeScene`, so those handlers never fired).
 * 2. Scene generation: a monotonically increasing counter bumped on every
 *    scene switch. Long-lived app-level listeners (NPC combat loops, victory
 *    checks) snapshot the generation when they register and immediately
 *    unsubscribe themselves when it drifts — so even if a cleanup handler is
 *    forgotten somewhere, the leaked loop dies on the next scene change
 *    instead of running forever over destroyed entities.
 */

export const SCENE_CLEANUP_HANDLERS_KEY = "__sceneCleanupHandlers";

export function registerSceneCleanup(app: AppBase, cleanup: () => void): void {
  const keyedApp = app as AppBase & Record<string, unknown>;
  const handlers = (keyedApp[SCENE_CLEANUP_HANDLERS_KEY] as Array<() => void> | undefined) ?? [];
  handlers.push(cleanup);
  keyedApp[SCENE_CLEANUP_HANDLERS_KEY] = handlers;
}

export function runSceneCleanupHandlers(app: AppBase): void {
  const keyedApp = app as AppBase & Record<string, unknown>;
  const handlers = keyedApp[SCENE_CLEANUP_HANDLERS_KEY];
  if (Array.isArray(handlers)) {
    while (handlers.length > 0) {
      const handler = handlers.pop();
      if (typeof handler === "function") {
        try {
          handler();
        } catch (error) {
          console.warn("[Scene] cleanup handler failed", error);
        }
      }
    }
  }
  keyedApp[SCENE_CLEANUP_HANDLERS_KEY] = [];
}

const sceneGlobal = globalThis as { __sceneGeneration?: number };

export function getSceneGeneration(): number {
  return sceneGlobal.__sceneGeneration ?? 0;
}

export function bumpSceneGeneration(): number {
  sceneGlobal.__sceneGeneration = (sceneGlobal.__sceneGeneration ?? 0) + 1;
  return sceneGlobal.__sceneGeneration;
}

/**
 * Detach an app-level event listener once the scene it belongs to is gone.
 * Returns a cleanup function that detaches immediately. The listener wrapper
 * also no-ops after detachment, so a single stale tick can't fire.
 */
export function bindSceneListener(
  app: AppBase,
  eventName: string,
  handler: (dt: number) => void,
): () => void {
  const generation = getSceneGeneration();
  let detached = false;

  const wrapped = (dt: number) => {
    if (detached) return;
    if (getSceneGeneration() !== generation) {
      detach();
      return;
    }
    handler(dt);
  };

  const detach = () => {
    if (detached) return;
    detached = true;
    app.off(eventName, wrapped);
  };

  app.on(eventName, wrapped);
  registerSceneCleanup(app, detach);
  return detach;
}

/**
 * Make sure the app has mouse/keyboard/touch devices regardless of which
 * scene initialized it first. Anything scenes used to set up lazily
 * ("if (!app.keyboard) app.keyboard = ...") just always holds after this.
 */
export function setupAppInput(app: AppBase): void {
  if (!app.mouse) {
    app.mouse = new Mouse(document.body);
  }
  if (!app.keyboard) {
    app.keyboard = new Keyboard(window);
  }
  if (!app.touch) {
    app.touch = new TouchDevice(document.body);
  }
}
