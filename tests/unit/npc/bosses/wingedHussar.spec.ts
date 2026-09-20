import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { WingedHussarBoss } from '../../../../src/world/npc/bosses/wingedHussarBoss';

vi.mock('../../../../src/util/loadModel', () => ({
  loadModel: vi.fn(async () => ({ modelEntity: new Entity('stub-hussar') })),
}));

function makeHussar(health = 800): any {
  const entity = new Entity('hussar-entity');
  entity.setPosition(0, 0, 0);
  return new WingedHussarBoss(99, health, entity);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
  // Headless: no live Application, so stub away render components on VFX entities.
  vi.spyOn(Entity.prototype, 'addComponent').mockImplementation(function (this: any) {
    return this;
  });
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById('boss-health-bar')?.remove();
});

describe('WingedHussarBoss ranges are mounted-boss scale', () => {
  it('base melee attack range is at least 5 (mounted reach)', () => {
    const boss = makeHussar();
    expect(boss.aiConfig.attackRange).toBeGreaterThanOrEqual(5);
  });

  it('ray-storm hit radius is generous (not the old 3.0)', () => {
    const boss = makeHussar();
    expect((boss as any).rayStormHitRadius).toBeGreaterThanOrEqual(5);
  });

  it('ray storm can hit a player at 8 units flat distance who is 4 units elevated', () => {
    const boss = makeHussar();
    const onPlayerAttack = vi.fn();
    (boss as any).onPlayerAttack = onPlayerAttack;
    // Fake a minimal scene app so the VFX path runs (addComponent is stubbed below).
    (boss as any).resolveSceneApp = () => ({ root: new Entity('root') });

    // Boss at origin; pins the Math.random scatter to zero so the beam lands at the boss position.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const player = new Entity('player');
    player.setPosition(8, 4, 0);
    // Pre-fix this was distance <= 3.0 with no vertical tolerance; now radius 8 + |dy|<=6.
    (boss as any).spawnRayBeam(player, undefined);
    expect(onPlayerAttack).toHaveBeenCalledWith(boss, (boss as any).rayStormDamage);
  });

  it('ray storm does NOT hit a player far off the ray axis', () => {
    const boss = makeHussar();
    const onPlayerAttack = vi.fn();
    (boss as any).onPlayerAttack = onPlayerAttack;
    (boss as any).resolveSceneApp = () => ({ root: new Entity('root') });

    const player = new Entity('player');
    player.setPosition(60, 0, 0);
    (boss as any).spawnRayBeam(player, undefined);
    expect(onPlayerAttack).not.toHaveBeenCalled();
  });
});
