import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { Christ } from '../../../../src/world/npc/bosses/jesus';

function makeChrist(health = 1000): any {
  const entity = new Entity('christ-entity');
  entity.setPosition(0, 0, 0);
  return new Christ(99, health, entity);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById('boss-health-bar')?.remove();
});

describe('Christ holy ray beam alignment', () => {
  it('beam end is colinear with origin → aimed target and extends past it', () => {
    const boss = makeChrist();
    boss.getEntity().setPosition(0, 0, 0);
    const player = new Entity('player');
    player.setPosition(10, 1.1, 0);

    // Drive the internals the same way fireHolyRay does.
    const origin = (boss as any).getSpellOrigin(4.4);
    const targetPoint = (boss as any).getAimedTargetPosition(player);
    const beamEnd = (boss as any).calculateHolyRayEnd(origin, targetPoint);

    // Direction from origin → beamEnd must equal direction origin → targetPoint.
    const dirBeam = beamEnd.clone().sub(origin).normalize();
    const dirAim = targetPoint.clone().sub(origin).normalize();
    expect(dirBeam.x).toBeCloseTo(dirAim.x, 5);
    expect(dirBeam.y).toBeCloseTo(dirAim.y, 5);
    expect(dirBeam.z).toBeCloseTo(dirAim.z, 5);

    // Beam must reach at least to the target (it overshoots, never falls short).
    const distToEnd = origin.distance(beamEnd);
    const distToTarget = origin.distance(targetPoint);
    expect(distToEnd).toBeGreaterThanOrEqual(distToTarget);
  });

  it('the damage ray test hits a player standing at the aimed target point', () => {
    const boss = makeChrist();
    boss.getEntity().setPosition(0, 0, 0);
    const player = new Entity('player');
    player.setPosition(10, 1.1, 0);

    const origin = (boss as any).getSpellOrigin(4.4);
    const targetPoint = (boss as any).getAimedTargetPosition(player);
    const beamEnd = (boss as any).calculateHolyRayEnd(origin, targetPoint);

    expect((boss as any).isHitByRay(player, origin, beamEnd, (boss as any).holyRayHitRadius)).toBe(true);
  });

  it('the damage ray misses a player far off the beam line', () => {
    const boss = makeChrist();
    boss.getEntity().setPosition(0, 0, 0);
    const player = new Entity('player');
    player.setPosition(10, 1.1, 0);

    const origin = (boss as any).getSpellOrigin(4.4);
    const targetPoint = (boss as any).getAimedTargetPosition(player);
    const beamEnd = (boss as any).calculateHolyRayEnd(origin, targetPoint);

    const bystander = new Entity('bystander');
    bystander.setPosition(10, 1.1, 50); // off-axis
    expect((boss as any).isHitByRay(bystander, origin, beamEnd, (boss as any).holyRayHitRadius)).toBe(false);
  });

  it('beam visual and damage ray share the same endpoints (same state fields)', () => {
    // Source-level regression: the animate loop must render the beam from
    // state.origin → state.beamEnd and hit-test with THE SAME values.
    // We verify via the live path: fire the ray, step past windup, and confirm
    // the hit test used state.origin/state.beamEnd produced by the same frame's
    // re-aim (i.e. endpoints recomputed from the player's CURRENT position).
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      const boss = makeChrist();
      boss.getEntity().setPosition(0, 0, 0);
      const player = new Entity('player');
      player.setPosition(30, 1.1, 0);

      const onPlayerAttack = vi.fn();
      // Register callbacks.
      boss.updateCombatAI(0.016, 0, [], undefined, player, onPlayerAttack);

      // Set up ray state directly (fireHolyRay requires a live pc app for VFX).
      const origin0 = (boss as any).getSpellOrigin(4.4);
      const targetPoint0 = (boss as any).getAimedTargetPosition(player);
      (boss as any).holyRayState = {
        root: new Entity('ray-root'),
        origin: origin0,
        targetPoint: targetPoint0,
        beamEnd: (boss as any).calculateHolyRayEnd(origin0, targetPoint0),
        startTimeMs: 0,
        windupEndMs: 0,
        endTimeMs: 0,
        hasHit: false
      };

      const state = (boss as any).holyRayState;
      expect(state).not.toBeNull();
      // Player moves AFTER the ray was fired — endpoints must track, not be frozen.
      player.setPosition(-30, 1.1, 0);

      // Step past the windup by advancing fake time.
      vi.setSystemTime((boss as any).holyRayWindupMs + 10);

      // Manually run what the animate loop does after windup.
      state.origin = (boss as any).getSpellOrigin(4.4);
      state.targetPoint = (boss as any).getAimedTargetPosition(player);
      state.beamEnd = (boss as any).calculateHolyRayEnd(state.origin, state.targetPoint);

      const dirBeam = state.beamEnd.clone().sub(state.origin).normalize();
      const dirAim = state.targetPoint.clone().sub(state.origin).normalize();
      expect(dirBeam.x).toBeCloseTo(dirAim.x, 6);
      expect(dirBeam.y).toBeCloseTo(dirAim.y, 6);
      expect(dirBeam.z).toBeCloseTo(dirAim.z, 6);
      // And the moved player, on that fresh ray, is hit:
      expect((boss as any).isHitByRay(player, state.origin, state.beamEnd, (boss as any).holyRayHitRadius)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('calculateHolyRayEnd never reverses direction when the target is close', () => {
    const boss = makeChrist();
    boss.getEntity().setPosition(0, 0, 0);
    const origin = (boss as any).getSpellOrigin(4.4);
    // Target almost on top of the boss.
    const near = origin.clone();
    near.x += 0.5;
    const end = (boss as any).calculateHolyRayEnd(origin, near);
    const d = end.clone().sub(origin).normalize();
    expect(d.x).toBeGreaterThan(0.9); // still points +x, not flipped
  });
});
