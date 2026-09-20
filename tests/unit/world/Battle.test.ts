// Battle data class: accessors return exactly what the constructor took.
import { describe, it, expect } from 'vitest';
import { Entity } from 'playcanvas';
import { Battle } from '@/world/Battle';

describe('Battle data class', () => {
  it('exposes timePeriod, location, name and the entity it wraps', () => {
    const entity = new Entity('battle-marker');
    const b = new Battle(3, [41.0053, 28.977], 'Fall of Constantinople', entity);
    expect(b.getTimePeriod()).toBe(3);
    expect(b.getLocation()).toEqual([41.0053, 28.977]);
    expect(b.getName()).toBe('Fall of Constantinople');
    expect(b.getObj()).toBe(entity);
  });

  it('getLocation returns degrees, not radians', () => {
    const b = new Battle(1, [90, 180], 'edge', new Entity('e'));
    expect(b.getLocation()).toEqual([90, 180]);
  });

  it('spawnPoint is optional and undefined by default', () => {
    const b = new Battle(5, [0, 0], 'no spawn', new Entity('e'));
    expect(b.getSpawnPoint()).toBeUndefined();
  });

  it('returns the spawn point when provided', () => {
    const b = new Battle(6, [38, -77], 'with spawn', new Entity('e'), [1, 2, 3]);
    expect(b.getSpawnPoint()).toEqual([1, 2, 3]);
  });
});
