// spawnHelpers: surface estimation and player spawn position computation.
// waitForAmmoReady is exercised with a stubbed rigidbody system.
import { describe, it, expect, vi } from 'vitest';
import { Entity } from 'playcanvas';
import {
  estimateSurfaceYFromBounds,
  computePlayerSpawnPosition,
  waitForAmmoReady,
} from '@/util/spawnHelpers';

const BOUNDS = { minX: -10, maxX: 10, minZ: -20, maxZ: 20, minY: 0, maxY: 40 };

describe('estimateSurfaceYFromBounds', () => {
  it('returns 75% of the way up from minY to avoid mountain peaks', () => {
    expect(estimateSurfaceYFromBounds(BOUNDS)).toBe(30);
    expect(estimateSurfaceYFromBounds({ ...BOUNDS, minY: 10, maxY: 50 })).toBe(40);
  });
});

describe('computePlayerSpawnPosition', () => {
  it('centers the player on the bounds at seeded ground Y plus the offset', () => {
    const { position, surfaceY, spawnResolved } = computePlayerSpawnPosition(BOUNDS, 12, 1.5);
    expect(position.x).toBe(0);
    expect(position.z).toBe(0);
    expect(position.y).toBe(13.5);
    expect(surfaceY).toBe(12);
    expect(spawnResolved).toBe(true);
  });

  it('estimates the surface when no seeded ground Y is provided', () => {
    const { surfaceY, spawnResolved } = computePlayerSpawnPosition(BOUNDS, undefined, 0);
    expect(surfaceY).toBe(30);
    expect(spawnResolved).toBe(true);
  });

  it('returns the emergency fallback when bounds are missing', () => {
    const { position, surfaceY, spawnResolved } = computePlayerSpawnPosition(undefined, undefined, 1);
    expect(position.x).toBe(0);
    expect(position.y).toBe(8);
    expect(position.z).toBe(8);
    expect(surfaceY).toBe(0);
    expect(spawnResolved).toBe(false);
  });
});

describe('waitForAmmoReady', () => {
  it('resolves immediately when raycastFirst is unavailable', async () => {
    const app: any = { systems: {} };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await waitForAmmoReady(app, 'ground');
    expect(result).toEqual({ frame: 0, entityName: null, hitY: undefined });
    vi.restoreAllMocks();
  });

  it('resolves with hit info when a ground-tagged entity is hit', async () => {
    const ground = new Entity('terrain');
    ground.tags.add('ground');
    const app: any = {
      systems: {
        rigidbody: {
          raycastFirst: () => ({ entity: ground, point: { x: 0, y: 7.25, z: 0 } }),
        },
      },
    };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await waitForAmmoReady(app, 'ground');
    expect(result.entityName).toBe('terrain');
    expect(result.hitY).toBe(7.25);
    vi.restoreAllMocks();
  });
});
