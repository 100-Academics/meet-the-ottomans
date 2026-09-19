// battleSceneHelpers: pure math/hierarchy helpers with stubbed physics.
import { describe, it, expect } from 'vitest';
import { Entity } from 'playcanvas';
import {
  hasTagInHierarchy,
  getHighestGroundHitY,
  getRenderableBounds,
  getScreenCenter,
} from '@/util/battleSceneHelpers';

describe('hasTagInHierarchy', () => {
  it('finds a tag on the entity itself', () => {
    const e = new Entity('e');
    e.tags.add('ground');
    expect(hasTagInHierarchy(e, 'ground')).toBe(true);
  });

  it('finds a tag on an ancestor', () => {
    const parent = new Entity('parent');
    parent.tags.add('ground');
    const child = new Entity('child');
    parent.addChild(child);
    expect(hasTagInHierarchy(child, 'ground')).toBe(true);
  });

  it('returns false when no tag exists in the chain, and for null', () => {
    const e = new Entity('e');
    expect(hasTagInHierarchy(e, 'ground')).toBe(false);
    expect(hasTagInHierarchy(null, 'ground')).toBe(false);
  });
});

describe('getHighestGroundHitY', () => {
  it('returns undefined when the rigidbody system is missing', () => {
    const app: any = { systems: {} };
    expect(getHighestGroundHitY(app, 0, 0, 'ground')).toBeUndefined();
  });

  it('returns the hit Y when raycastFirst hits a ground-tagged entity', () => {
    const ground = new Entity('ground');
    ground.tags.add('ground');
    const app: any = {
      systems: {
        rigidbody: {
          raycastFirst: () => ({ point: { x: 0, y: 3.5, z: 0 }, entity: ground }),
          // no raycastAll → forces the fallback path
        },
      },
    };
    expect(getHighestGroundHitY(app, 0, 0, 'ground')).toBe(3.5);
  });

  it('rejects hits on entities without the ground tag', () => {
    const wall = new Entity('wall');
    const app: any = {
      systems: {
        rigidbody: {
          raycastFirst: () => ({ point: { x: 0, y: 9, z: 0 }, entity: wall }),
        },
      },
    };
    expect(getHighestGroundHitY(app, 0, 0, 'ground')).toBeUndefined();
  });

  it('uses raycastAll when available and walks tagged parents', () => {
    const parentGround = new Entity('terrain');
    parentGround.tags.add('ground');
    const child = new Entity('mesh');
    parentGround.addChild(child);

    const app: any = {
      systems: {
        rigidbody: {
          raycastAll: () => [
            { point: { x: 0, y: 1, z: 0 }, entity: child, hitFraction: 0.2 },
            { point: { x: 0, y: 2, z: 0 }, entity: parentGround, hitFraction: 0.6 },
          ],
          // raycastFirst must exist for the guard check; raycastAll path wins.
          raycastFirst: () => null,
        },
      },
    };
    // Lowest hitFraction wins (closest to the ray origin).
    expect(getHighestGroundHitY(app, 0, 0, 'ground')).toBe(1);
  });
});

describe('getRenderableBounds', () => {
  it('returns undefined when no renderables exist', () => {
    expect(getRenderableBounds(new Entity('empty'))).toBeUndefined();
  });

  it('computes the AABB over mesh instances in a hierarchy', () => {
    const root = new Entity('root');
    (root as any).render = {
      meshInstances: [
        { aabb: { getMin: () => ({ x: -5, y: 0, z: -5 }), getMax: () => ({ x: 5, y: 2, z: 5 }) } },
      ],
    };
    const child = new Entity('child');
    (child as any).render = {
      meshInstances: [
        { aabb: { getMin: () => ({ x: 10, y: 1, z: 0 }), getMax: () => ({ x: 20, y: 3, z: 4 }) } },
      ],
    };
    root.addChild(child);

    const bounds = getRenderableBounds(root);
    expect(bounds).toEqual({ minX: -5, maxX: 20, minY: 0, maxY: 3, minZ: -5, maxZ: 5 });
  });

  it('skips non-finite AABBs', () => {
    const e = new Entity('broken');
    (e as any).render = {
      meshInstances: [
        { aabb: { getMin: () => ({ x: NaN, y: 0, z: 0 }), getMax: () => ({ x: 1, y: 1, z: 1 }) } },
      ],
    };
    expect(getRenderableBounds(e)).toBeUndefined();
  });
});

describe('getScreenCenter', () => {
  it('prefers clientRect when it has a valid size', () => {
    const app: any = { graphicsDevice: { clientRect: { width: 800, height: 600 }, canvas: {} } };
    expect(getScreenCenter(app)).toEqual({ x: 400, y: 300 });
  });

  it('falls back to canvas clientWidth/Height', () => {
    const app: any = {
      graphicsDevice: { clientRect: { width: 0, height: 0 }, canvas: { clientWidth: 1024, clientHeight: 768 } },
    };
    expect(getScreenCenter(app)).toEqual({ x: 512, y: 384 });
  });
});
