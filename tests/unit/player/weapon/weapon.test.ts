// Weapon base class: getters and the click-picking raycast helper.
import { describe, it, expect } from 'vitest';
import { Entity, Vec3 } from 'playcanvas';
import { Weapon } from '@/player/weapon/weapon';

function makeNpc(team: 'friend' | 'foe', entity: Entity, alive = true) {
  return {
    getEntity: () => entity,
    getTeam: () => team,
    isAlive: () => alive,
  } as any;
}

function makeCameraEntity() {
  const entity = new Entity('camera');
  entity.setPosition(0, 0, 0);
  (entity as any).camera = {
    nearClip: 0.1,
    farClip: 1000,
    screenToWorld(x: number, y: number, z: number) {
      return new Vec3(x, y, z);
    },
  };
  return entity;
}

describe('Weapon getters', () => {
  it('exposes constructor values', () => {
    const w = new Weapon('TestBlade', 40, 2.5);
    expect(w.getName()).toBe('TestBlade');
    expect(w.getDamage()).toBe(40);
    expect(w.getRange()).toBe(2.5);
  });
});

describe('Weapon.getClickedNpcInRange', () => {
  it('returns null when maxRange is invalid', () => {
    const app: any = { systems: {} };
    const cam = makeCameraEntity();
    expect(Weapon.getClickedNpcInRange(app, cam, 0, 0, [], 0)).toBeNull();
    expect(Weapon.getClickedNpcInRange(app, cam, 0, 0, [], -1)).toBeNull();
    expect(Weapon.getClickedNpcInRange(app, cam, 0, 0, [], Number.NaN)).toBeNull();
  });

  it('returns null without a camera or rigidbody system', () => {
    const app: any = { systems: {} };
    const noCam = new Entity('no-cam');
    expect(Weapon.getClickedNpcInRange(app, noCam, 0, 0, [], 10)).toBeNull();
    expect(Weapon.getClickedNpcInRange(app, undefined, 0, 0, [], 10)).toBeNull();
    const cam = makeCameraEntity();
    expect(Weapon.getClickedNpcInRange(app, cam, 0, 0, [], 10)).toBeNull();
  });

  it('returns null when the raycast hits nothing (occlusion/miss)', () => {
    const cam = makeCameraEntity();
    const app: any = {
      systems: { rigidbody: { raycastFirst: () => null } },
    };
    expect(Weapon.getClickedNpcInRange(app, cam, 0, 0, [], 10)).toBeNull();
  });

  it('returns null when the first hit is terrain/wall (occlusion blocks the shot)', () => {
    const cam = makeCameraEntity();
    const wall = new Entity('wall');
    const npcEntity = new Entity('npc');
    const npcs = [makeNpc('foe', npcEntity)];
    const app: any = {
      systems: { rigidbody: { raycastFirst: () => ({ entity: wall, point: new Vec3(0, 0, -5) }) } },
    };
    expect(Weapon.getClickedNpcInRange(app, cam, 640, 360, npcs, 50)).toBeNull();
  });

  it('returns null when the hit NPC is dead', () => {
    const cam = makeCameraEntity();
    const npcEntity = new Entity('dead-npc');
    const npcs = [makeNpc('foe', npcEntity, false)];
    const app: any = {
      systems: { rigidbody: { raycastFirst: () => ({ entity: npcEntity, point: new Vec3(0, 0, -5) }) } },
    };
    expect(Weapon.getClickedNpcInRange(app, cam, 640, 360, npcs, 50)).toBeNull();
  });

  it('returns null when the hit is beyond maxRange', () => {
    const cam = makeCameraEntity();
    const npcEntity = new Entity('far-npc');
    const npcs = [makeNpc('foe', npcEntity)];
    const app: any = {
      systems: { rigidbody: { raycastFirst: () => ({ entity: npcEntity, point: new Vec3(0, 0, -200) }) } },
    };
    expect(Weapon.getClickedNpcInRange(app, cam, 640, 360, npcs, 50)).toBeNull();
  });

  it('hits a descendant of the NPC entity within range', () => {
    const cam = makeCameraEntity();
    const npcRoot = new Entity('npc-root');
    const hitbox = new Entity('hitbox');
    npcRoot.addChild(hitbox);
    const npcs = [makeNpc('foe', npcRoot)];
    const app: any = {
      systems: {
        rigidbody: { raycastFirst: () => ({ entity: hitbox, point: new Vec3(0, 0, -8) }) },
      },
    };
    expect(Weapon.getClickedNpcInRange(app, cam, 640, 360, npcs, 50)).toBe(npcs[0]);
  });

  it('friendly-team NPCs registered as candidates are still hit-picked (team filtering is the caller\u2019s job)', () => {
    const cam = makeCameraEntity();
    const friendlyEntity = new Entity('friendly');
    const friend = makeNpc('friend', friendlyEntity);
    const app: any = {
      systems: {
        rigidbody: { raycastFirst: () => ({ entity: friendlyEntity, point: new Vec3(0, 0, -4) }) },
      },
    };
    // Weapon.getClickedNpcInRange itself does not filter by team — callers
    // pass only foe lists. A friendly NPC in the candidate list is returned
    // like any other, which is why callers filter friendlies before calling.
    expect(Weapon.getClickedNpcInRange(app, cam, 640, 360, [friend], 50)).toBe(friend);
  });
});
