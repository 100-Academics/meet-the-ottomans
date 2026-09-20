// Scene cleanup registry + generation guard. Fake app style matches
// tests/regression/playerFrozenWhenDead.test.ts (plain object with on/off).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerSceneCleanup,
  runSceneCleanupHandlers,
  getSceneGeneration,
  bumpSceneGeneration,
  bindSceneListener,
  SCENE_CLEANUP_HANDLERS_KEY,
} from '@/util/sceneCleanup';

function makeFakeApp() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const app: any = {
    systems: {},
    on(event: string, handler: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },
    off(event: string, handler: (...args: any[]) => void) {
      listeners.get(event)?.delete(handler);
    },
    fire(event: string, ...args: any[]) {
      for (const h of [...(listeners.get(event) ?? [])]) h(...args);
    },
    listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0;
    },
  };
  return app;
}

describe('sceneCleanup registry', () => {
  it('runs registered handlers in LIFO order and clears the registry', () => {
    const app = makeFakeApp();
    const calls: string[] = [];
    registerSceneCleanup(app, () => calls.push('first'));
    registerSceneCleanup(app, () => calls.push('second'));
    runSceneCleanupHandlers(app);
    expect(calls).toEqual(['second', 'first']);
    expect(app[SCENE_CLEANUP_HANDLERS_KEY]).toEqual([]);
  });

  it('a throwing handler does not prevent later handlers from running', () => {
    const app = makeFakeApp();
    const spy = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerSceneCleanup(app, spy);
    registerSceneCleanup(app, () => { throw new Error('boom'); });
    runSceneCleanupHandlers(app);
    expect(spy).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('runSceneCleanupHandlers with no handlers is a no-op', () => {
    const app = makeFakeApp();
    expect(() => runSceneCleanupHandlers(app)).not.toThrow();
  });
});

describe('scene generation counter', () => {
  it('bump increments and get reads back', () => {
    const before = getSceneGeneration();
    const after = bumpSceneGeneration();
    expect(after).toBe(before + 1);
    expect(getSceneGeneration()).toBe(after);
  });
});

describe('bindSceneListener', () => {
  it('runs the handler while the generation is unchanged', () => {
    const app = makeFakeApp();
    const handler = vi.fn();
    const generationBefore = getSceneGeneration();
    bindSceneListener(app, 'update', handler);
    app.fire('update', 16);
    expect(handler).toHaveBeenCalledWith(16);
    expect(getSceneGeneration()).toBe(generationBefore);
  });

  it('auto-detaches after the scene generation bumps', () => {
    const app = makeFakeApp();
    const handler = vi.fn();
    bindSceneListener(app, 'update', handler);
    bumpSceneGeneration();
    app.fire('update', 16);
    expect(handler).not.toHaveBeenCalled();
    expect(app.listenerCount('update')).toBe(0);
  });

  it('returned detach function unsubscribes immediately and is idempotent', () => {
    const app = makeFakeApp();
    const handler = vi.fn();
    const detach = bindSceneListener(app, 'update', handler);
    detach();
    detach();
    app.fire('update', 16);
    expect(handler).not.toHaveBeenCalled();
    expect(app.listenerCount('update')).toBe(0);
  });

  it('registers its detach with the scene cleanup registry', () => {
    const app = makeFakeApp();
    const handler = vi.fn();
    bindSceneListener(app, 'update', handler);
    runSceneCleanupHandlers(app);
    app.fire('update', 16);
    expect(handler).not.toHaveBeenCalled();
  });
});
