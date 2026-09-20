// doSmoke: mounts a smoke-root entity, spawns an initial burst of puffs, and
// binds its update loop through the scene-generation guard so it dies with
// its scene.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Entity, Mesh, Vec3, BoundingBox } from 'playcanvas';
import { Smoke } from '@/world/doSmoke';
import { bumpSceneGeneration } from '@/util/sceneCleanup';

vi.spyOn(Mesh, 'fromGeometry').mockReturnValue({
  incRefCount: () => undefined,
  decRefCount: () => undefined,
  aabb: new BoundingBox(),
  morph: null,
} as unknown as Mesh);
vi.spyOn(Entity.prototype, 'addComponent').mockImplementation(function () {
  return undefined as never;
});

function makeFakeApp() {
  const root = new Entity('root');
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const app: any = {
    root,
    systems: {},
    graphicsDevice: {},
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

function smokeRootOf(app: any): Entity | undefined {
  return app.root.children.find((c: Entity) => c.name === 'smoke-root');
}

describe('doSmoke', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('mounts a smoke-root entity under app.root at the given position', () => {
    const app = makeFakeApp();
    new Smoke(new Vec3(1, 2, 3), 5, app);
    const root = smokeRootOf(app);
    expect(root).toBeDefined();
    expect(root!.getPosition().x).toBe(1);
    expect(root!.getPosition().y).toBe(2);
    expect(root!.getPosition().z).toBe(3);
  });

  it('spawns the initial burst of 4 puffs', () => {
    const app = makeFakeApp();
    new Smoke(new Vec3(0, 0, 0), new Vec3(2, 2, 2), app);
    expect(smokeRootOf(app)!.children.length).toBe(4);
  });

  it('accepts a scalar radius (uses it for all axes)', () => {
    const app = makeFakeApp();
    expect(() => new Smoke(new Vec3(0, 0, 0), 1.5, app)).not.toThrow();
    expect(smokeRootOf(app)).toBeDefined();
  });

  it('binds its update loop to the scene so the loop detaches on generation bump', () => {
    const app = makeFakeApp();
    new Smoke(new Vec3(0, 0, 0), 2, app);
    expect(app.listenerCount('update')).toBe(1);

    bumpSceneGeneration();
    app.fire('update', 0.016); // wrapped handler self-detaches
    expect(app.listenerCount('update')).toBe(0);
  });
});
