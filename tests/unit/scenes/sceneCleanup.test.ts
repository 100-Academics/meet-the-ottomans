// Smoke test for the scene-cleanup registry: register handlers, run them,
// verify they're popped in order and never fire twice. Also exercises
// bindSceneListener so a leaked update-loop unsubscribes itself when the
// scene generation changes.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerSceneCleanup,
  runSceneCleanupHandlers,
  bindSceneListener,
  bumpSceneGeneration,
  getSceneGeneration,
} from '../../../src/util/sceneCleanup';

const STORAGE_KEYS = ['meetTheOttomans.battleProgress', 'meetTheOttomans.secretsFound'];

function persistFixture() {
  const saved: Record<string, string | null> = {};
  for (const k of STORAGE_KEYS) saved[k] = window.localStorage.getItem(k);
  window.localStorage.clear();
  return saved;
}
function restoreFixture(saved: Record<string, string | null>) {
  window.localStorage.clear();
  for (const [k, v] of Object.entries(saved)) {
    if (v !== null) window.localStorage.setItem(k, v);
  }
}

type FakeApp = {
  __sceneCleanupHandlers?: Array<() => void>;
  listeners: Map<string, Set<(dt: number) => void>>;
  on: (name: string, fn: (dt: number) => void) => void;
  off: (name: string, fn?: (dt: number) => void) => void;
  fire: (name: string, dt?: number) => void;
};

function makeFakeApp(): FakeApp {
  const listeners = new Map<string, Set<(dt: number) => void>>();
  return {
    listeners,
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    off(name, fn?) {
      if (!fn) { listeners.delete(name); return; }
      listeners.get(name)?.delete(fn);
    },
    fire(name, dt = 0) {
      for (const fn of Array.from(listeners.get(name) ?? [])) fn(dt);
    },
  };
}

describe('scene cleanup registry', () => {
  let saved: Record<string, string | null>;

  beforeEach(() => {
    saved = persistFixture();
  });
  afterEach(() => {
    restoreFixture(saved);
  });

  it('registerSceneCleanup pushes handlers onto the app keyed slot', () => {
    const app = makeFakeApp();
    registerSceneCleanup(app as any, () => {});
    registerSceneCleanup(app as any, () => {});
    expect((app as any).__sceneCleanupHandlers.length).toBe(2);
  });

  it('runSceneCleanupHandlers pops and invokes each exactly once, LIFO', () => {
    const app = makeFakeApp();
    const calls: number[] = [];
    registerSceneCleanup(app as any, () => { calls.push(1); });
    registerSceneCleanup(app as any, () => { calls.push(2); });
    registerSceneCleanup(app as any, () => { calls.push(3); });
    runSceneCleanupHandlers(app as any);
    expect(calls).toEqual([3, 2, 1]);
    expect((app as any).__sceneCleanupHandlers).toEqual([]);
  });

  it('running cleanup twice is a no-op second time', () => {
    const app = makeFakeApp();
    const fn = vi.fn();
    registerSceneCleanup(app as any, fn);
    runSceneCleanupHandlers(app as any);
    runSceneCleanupHandlers(app as any);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a throwing handler does not block later handlers', () => {
    const app = makeFakeApp();
    const after = vi.fn();
    registerSceneCleanup(app as any, after);
    registerSceneCleanup(app as any, () => { throw new Error('boom'); });
    runSceneCleanupHandlers(app as any);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('bindSceneListener routes update ticks to the handler', () => {
    const app = makeFakeApp();
    const spy = vi.fn();
    bindSceneListener(app as any, 'update', spy);
    app.fire('update', 0.016);
    expect(spy).toHaveBeenCalledWith(0.016);
  });

  it('after bumpSceneGeneration, a bound listener self-detaches on next fire', () => {
    const app = makeFakeApp();
    const spy = vi.fn();
    bindSceneListener(app as any, 'update', spy);
    bumpSceneGeneration();
    app.fire('update', 0.016);
    app.fire('update', 0.016);
    expect(spy).not.toHaveBeenCalled();
    expect(app.listeners.get('update')?.size ?? 0).toBe(0);
  });

  it('the detach function returned by bindSceneListener unregisters immediately', () => {
    const app = makeFakeApp();
    const spy = vi.fn();
    const detach = bindSceneListener(app as any, 'update', spy);
    detach();
    app.fire('update', 0.016);
    expect(spy).not.toHaveBeenCalled();
  });

  it('bindSceneListener registers itself as a scene cleanup handler too', () => {
    const previous = getSceneGeneration();
    const app = makeFakeApp();
    bindSceneListener(app as any, 'update', () => {});
    expect((app as any).__sceneCleanupHandlers.length).toBe(1);
    // Sanity: generation was not bumped merely by binding.
    expect(getSceneGeneration()).toBe(previous);
  });
});
