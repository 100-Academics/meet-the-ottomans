import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { npc } from '../../../src/world/npc/npc';

// Subclass that exposes the protected hostile-scan so we can test it directly.
class TestNpc extends npc {
  public scan(npcs: npc[], range: number) {
    return this.findNearestHostileNpc(npcs, range);
  }
  public distanceTo(other: Entity) {
    return this.getDistanceToEntity(other);
  }
}

function makeNpc(id: number, team: 'friend' | 'foe', health = 100, pos = { x: 0, z: 0 }) {
  const entity = new Entity(`npc-${id}`);
  entity.setPosition(pos.x, 0, pos.z);
  return new TestNpc(id, team, health, entity);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
});

describe('npc.takeDamage / kill / isAlive', () => {
  it('takeDamage reduces health by the damage amount', () => {
    const n = makeNpc(1, 'foe', 100);
    n.takeDamage(30);
    expect(n.getHealth()).toBe(70);
  });

  it('takeDamage clamps health at zero', () => {
    const n = makeNpc(1, 'foe', 50);
    n.takeDamage(999);
    expect(n.getHealth()).toBe(0);
  });

  it('takeDamage returns false while npc survives, true on the killing blow', () => {
    const n = makeNpc(1, 'foe', 50);
    expect(n.takeDamage(10)).toBe(false);
    expect(n.takeDamage(40)).toBe(true);
  });

  it('kill() latches aiState to "dead" exactly once; later calls return false', () => {
    const n = makeNpc(1, 'foe', 50);
    n.takeDamage(50);
    expect(n.getAiState()).toBe('dead');
    expect(n.kill()).toBe(false);
    expect(n.kill()).toBe(false);
    expect(n.getAiState()).toBe('dead');
  });

  it('kill() on a healthy npc does nothing', () => {
    const n = makeNpc(1, 'foe', 50);
    expect(n.kill()).toBe(false);
    expect(n.isAlive()).toBe(true);
  });

  it('isAlive is false when health hits zero and true before', () => {
    const n = makeNpc(1, 'foe', 10);
    expect(n.isAlive()).toBe(true);
    n.takeDamage(10);
    expect(n.isAlive()).toBe(false);
  });

  it('isAlive reflects aiState === "dead" even if health were restored conceptually', () => {
    const n = makeNpc(1, 'foe', 10);
    n.takeDamage(10);
    expect(n.getAiState()).toBe('dead');
    expect(n.isAlive()).toBe(false);
  });
});

describe('npc team validation and identity', () => {
  it('rejects invalid team strings', () => {
    // @ts-expect-error intentional invalid team
    expect(() => new TestNpc(1, 'neither', 100)).toThrow(/Team must be/);
  });

  it('getId/getTeam return constructor values', () => {
    const n = makeNpc(7, 'friend', 80);
    expect(n.getId()).toBe(7);
    expect(n.getTeam()).toBe('friend');
  });

  it('friend and foe combat profiles have different damage', () => {
    const friend = makeNpc(1, 'friend');
    const foe = makeNpc(2, 'foe');
    expect(friend.getAttackDamage()).toBe(8);
    expect(foe.getAttackDamage()).toBe(12);
  });
});

describe('npc hitbox radius', () => {
  it('defaults to 1.1', () => {
    expect(makeNpc(1, 'foe').getHitboxRadius()).toBeCloseTo(1.1);
  });

  it('setHitboxRadius allows a positive override', () => {
    const n = makeNpc(1, 'foe');
    n.setHitboxRadius(2.4);
    expect(n.getHitboxRadius()).toBe(2.4);
  });

  it('setHitboxRadius ignores zero, negative and non-finite values', () => {
    const n = makeNpc(1, 'foe');
    n.setHitboxRadius(0);
    expect(n.getHitboxRadius()).toBeCloseTo(1.1);
    n.setHitboxRadius(-3);
    expect(n.getHitboxRadius()).toBeCloseTo(1.1);
    n.setHitboxRadius(Number.NaN);
    expect(n.getHitboxRadius()).toBeCloseTo(1.1);
  });
});

describe('npc state machine transitions', () => {
  const profile = {
    attackDamage: 10,
    attackRange: 2,
    attackCooldown: 1,
    detectionRange: 14
  };

  it('idle when no target entity is provided', () => {
    const n = makeNpc(1, 'foe');
    n.updateAI(0.016, null, 0, undefined, profile);
    expect(n.getAiState()).toBe('idle');
  });

  it('idle (wander) when target is beyond detection range', () => {
    const n = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const target = new Entity('t');
    target.setPosition(50, 0, 0);
    n.updateAI(0.016, target, 0, undefined, profile);
    expect(n.getAiState()).toBe('idle');
  });

  it('chases when within detection range but outside attack range', () => {
    const n = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const target = new Entity('t');
    target.setPosition(6, 0, 0);
    n.updateAI(0.016, target, 0, undefined, profile);
    expect(n.getAiState()).toBe('chase');
    // Should have moved toward the target.
    expect(n.getEntity().getPosition().x).toBeGreaterThan(0);
  });

  it('attacks when within attack range and fires the callback', () => {
    const n = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const target = new Entity('t');
    target.setPosition(1, 0, 0);
    const onAttack = vi.fn();
    n.updateAI(0.016, target, 0, onAttack, profile);
    expect(n.getAiState()).toBe('attack');
    expect(onAttack).toHaveBeenCalledTimes(1);
    expect(onAttack.mock.calls[0][0]).toBe(n);
  });

  it('respects the attack cooldown between callbacks', () => {
    const n = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const target = new Entity('t');
    target.setPosition(1, 0, 0);
    const onAttack = vi.fn();
    n.updateAI(0.016, target, 0, onAttack, profile);
    n.updateAI(0.016, target, 0.5, onAttack, profile); // within 1s cooldown
    expect(onAttack).toHaveBeenCalledTimes(1);
    n.updateAI(0.016, target, 1.1, onAttack, profile); // cooldown elapsed
    expect(onAttack).toHaveBeenCalledTimes(2);
  });

  it('does nothing once dead', () => {
    const n = makeNpc(1, 'foe', 10, { x: 0, z: 0 });
    const target = new Entity('t');
    target.setPosition(1, 0, 0);
    n.takeDamage(10);
    const onAttack = vi.fn();
    n.updateAI(0.016, target, 0, onAttack, profile);
    expect(onAttack).not.toHaveBeenCalled();
  });
});

describe('npc spawnCenter sync', () => {
  it('resyncs wander center to the entity position on the first update', () => {
    const n = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    // Scene moves the NPC after construction, before the first frame.
    n.getEntity().setPosition(100, 0, 100);
    n.updateAI(0.016, null, 0); // wander path calls syncSpawnCenter
    const pos = n.getEntity().getPosition();
    // Wander keeps the npc near its new spawn center, not world origin:
    // after enough frames it must stay near (100, 100), never drift to 0.
    for (let i = 0; i < 60; i++) {
      n.updateAI(0.016, null, i * 0.016);
    }
    const d = Math.hypot(pos.x - 100, pos.z - 100);
    expect(d).toBeLessThan(15); // wanderRadius is 8, allow slop
  });
});

describe('findNearestHostileNpc', () => {
  it('skips same-team candidates', () => {
    const me = makeNpc(1, 'foe');
    const teammate = makeNpc(2, 'foe', 100, { x: 1, z: 0 });
    expect(me.scan([me, teammate], 50)).toBeNull();
  });

  it('skips dead candidates', () => {
    const me = makeNpc(1, 'foe');
    const dead = makeNpc(2, 'friend', 10, { x: 1, z: 0 });
    dead.takeDamage(10);
    expect(me.scan([me, dead], 50)).toBeNull();
  });

  it('returns the nearest living enemy within range', () => {
    const me = makeNpc(1, 'foe');
    const near = makeNpc(2, 'friend', 100, { x: 3, z: 0 });
    const far = makeNpc(3, 'friend', 100, { x: 10, z: 0 });
    expect(me.scan([far, near], 50)).toBe(near);
  });

  it('ignores enemies outside maxRange', () => {
    const me = makeNpc(1, 'foe');
    const enemy = makeNpc(2, 'friend', 100, { x: 30, z: 0 });
    expect(me.scan([enemy], 10)).toBeNull();
  });

  it('never returns itself', () => {
    const me = makeNpc(1, 'foe');
    expect(me.scan([me], 100)).toBeNull();
  });
});

describe('hitbox distance math', () => {
  it('getDistanceToEntity measures flat XZ distance (ignores Y)', () => {
    const a = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const b = new Entity('b');
    b.setPosition(3, 1000, 4);
    expect(a.distanceTo(b)).toBeCloseTo(5);
  });

  it('resolveHitboxCollisions pushes overlapping npcs apart', () => {
    const a = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const b = makeNpc(2, 'foe', 100, { x: 1, z: 0 });
    npc.resolveHitboxCollisions([a, b]);
    const dist = a.distanceTo(b.getEntity());
    expect(dist).toBeGreaterThanOrEqual(a.getHitboxRadius() + b.getHitboxRadius() - 0.001);
  });

  it('resolveHitboxCollisions leaves separated npcs untouched', () => {
    const a = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const b = makeNpc(2, 'foe', 100, { x: 10, z: 0 });
    npc.resolveHitboxCollisions([a, b]);
    expect(a.getEntity().getPosition().x).toBe(0);
    expect(b.getEntity().getPosition().x).toBe(10);
  });

  it('resolveHitboxCollisions skips dead npcs', () => {
    const a = makeNpc(1, 'foe', 100, { x: 0, z: 0 });
    const b = makeNpc(2, 'foe', 10, { x: 0.5, z: 0 });
    b.takeDamage(10);
    npc.resolveHitboxCollisions([a, b]);
    expect(b.getEntity().getPosition().x).toBe(0.5);
  });
});
