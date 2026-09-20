import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { UncleSam } from '../../../../src/world/npc/bosses/uncleSam';

function makeSam(health = 1000): any {
  const entity = new Entity('sam-entity');
  entity.setPosition(0, 0, 0);
  return new UncleSam(99, health, entity);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById('boss-health-bar')?.remove();
});

describe('UncleSam ground slam (giant circle) does damage', () => {
  it('applies damage when the player is inside the circle once the delay elapses', () => {
    const boss = makeSam();
    const onPlayerAttack = vi.fn();
    (boss as any).onPlayerAttack = onPlayerAttack;
    (boss as any).resolveSceneApp = () => undefined;

    const player = new Entity('player');
    player.setPosition(10, 0, 0);

    // Glow is cast centered on the player's current position.
    (boss as any).startGroundSlam(player, 0);
    expect((boss as any).groundSlamState).not.toBeNull();

    const delay = (boss as any).groundSlamDamageDelaySeconds;
    (boss as any).updateGroundSlam(0.016, player, delay + 0.01, undefined);
    expect(onPlayerAttack).toHaveBeenCalledWith(boss, (boss as any).groundSlamDamage);
  });

  it('damage is re-checked across the damage window, not a single instant', () => {
    const boss = makeSam();
    const onPlayerAttack = vi.fn();
    (boss as any).onPlayerAttack = onPlayerAttack;
    (boss as any).resolveSceneApp = () => undefined;

    // Slam is cast at the player's current position (0,0,0)…
    const player = new Entity('player');
    player.setPosition(0, 0, 0);
    (boss as any).startGroundSlam(player, 0);
    const delay = (boss as any).groundSlamDamageDelaySeconds;

    // …but the player is outside the circle when the first check runs.
    player.setPosition(100, 0, 0);
    (boss as any).updateGroundSlam(0.016, player, delay + 0.01, undefined);
    expect(onPlayerAttack).not.toHaveBeenCalled();
    // Crucially the check must NOT have latched — the window is still open.
    expect((boss as any).groundSlamState.hasDealtDamage).toBe(false);

    // Stepping back into the circle within the window still deals damage.
    player.setPosition(5, 0, 0);
    (boss as any).updateGroundSlam(0.016, player, delay + 0.5, undefined);
    expect(onPlayerAttack).toHaveBeenCalledWith(boss, (boss as any).groundSlamDamage);
  });

  it('does not damage a player who stays outside the circle through the window', () => {
    const boss = makeSam();
    const onPlayerAttack = vi.fn();
    (boss as any).onPlayerAttack = onPlayerAttack;
    (boss as any).resolveSceneApp = () => undefined;

    // Glow is cast at origin.
    const caster = new Entity('cast-point');
    caster.setPosition(0, 0, 0);
    (boss as any).startGroundSlam(caster, 0);

    const farPlayer = new Entity('far-player');
    farPlayer.setPosition(200, 0, 0);

    const delay = (boss as any).groundSlamDamageDelaySeconds;
    const window = (boss as any).groundSlamDamageWindowSeconds;
    (boss as any).updateGroundSlam(0.016, farPlayer, delay + 0.2, undefined);
    (boss as any).updateGroundSlam(0.016, farPlayer, delay + window + 0.01, undefined);
    expect(onPlayerAttack).not.toHaveBeenCalled();
    expect((boss as any).groundSlamState.hasDealtDamage).toBe(true);
  });

  it('ground slam damage value is meaningful (> 0)', () => {
    expect((makeSam() as any).groundSlamDamage).toBeGreaterThan(0);
  });
});
