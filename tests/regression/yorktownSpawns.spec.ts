import { describe, it, expect } from 'vitest';
import { YORKTOWN_NPC_SPAWN_POINTS } from '../../src/world/npc/sceneNpcPresets';

// Player spawn for Battle of Yorktown resolves to the battlefield model center
// (getRenderableBounds center), conventionally near world (0, ?, 0). Troop
// spawns must keep a sane standoff distance so soldiers don't spawn on top of
// the player.
describe('YORKTOWN_NPC_SPAWN_POINTS', () => {
  it('every troop spawn is at least 10 units from the player spawn area (0,0)', () => {
    expect(YORKTOWN_NPC_SPAWN_POINTS.length).toBeGreaterThan(0);
    for (const point of YORKTOWN_NPC_SPAWN_POINTS) {
      const dist = Math.sqrt(point.x * point.x + point.z * point.z);
      expect(dist).toBeGreaterThanOrEqual(10);
    }
  });

  it('spawns form a spread-out formation, not a single point', () => {
    const xs = new Set(YORKTOWN_NPC_SPAWN_POINTS.map((p) => `${p.x},${p.z}`));
    expect(xs.size).toBe(YORKTOWN_NPC_SPAWN_POINTS.length);
  });
});
