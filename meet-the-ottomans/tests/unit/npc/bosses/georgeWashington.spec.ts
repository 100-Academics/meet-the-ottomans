import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { GeorgeWashington } from '../../../../src/world/npc/bosses/georgeWashington';

// Shared rAF capture: every callback scheduled by the boss ends up here, and
// tests drain the queue manually (pump). Each tick may schedule the next one.
const scheduled: FrameRequestCallback[] = [];
function pump(): void {
  const batch = scheduled.splice(0);
  for (const cb of batch) cb(0);
}

function makeWashington(health = 1500): any {
  const entity = new Entity('gw-entity');
  entity.setPosition(0, 0, 0);
  return new GeorgeWashington(99, health, entity);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
  // Headless: no live Application, so stub away render components on VFX entities.
  vi.spyOn(Entity.prototype, 'addComponent').mockImplementation(function (this: any) {
    return this;
  });
  scheduled.length = 0;
  // vi.stubGlobal on requestAnimationFrame is unreliable under fake timers in
  // happy-dom — patch the global binding directly instead.
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    scheduled.push(cb);
    return 0;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.getElementById('boss-health-bar')?.remove();
});

describe('GeorgeWashington damage values', () => {
  it('monument (orb eruptions) damage is meaningful', () => {
    const boss = makeWashington();
    expect((boss as any).monumentDamage).toBeGreaterThanOrEqual(25);
    expect((boss as any).monumentHitRadius).toBeGreaterThanOrEqual(5);
  });

  it('cannon barrage damage is meaningful', () => {
    const boss = makeWashington();
    expect((boss as any).cannonDamage).toBeGreaterThanOrEqual(25);
    expect((boss as any).cannonHitRadius).toBeGreaterThanOrEqual(5);
  });

  it('liberty strike damage is meaningful', () => {
    const boss = makeWashington();
    expect((boss as any).libertyStrikeDamage).toBeGreaterThanOrEqual(25);
  });
});

describe('GeorgeWashington monument damage timing', () => {
  it('monument damage is evaluated at eruption time, not at attack spawn time', () => {
    vi.useFakeTimers();
    scheduled.length = 0;
    // Fake timers replace rAF with a fake that drops callbacks — re-patch.
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      scheduled.push(cb);
      return 0;
    };
    try {
      vi.setSystemTime(10_000);
      scheduled.length = 0;
      // Fake timers replace rAF with a fake that drops callbacks — re-patch.
      (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        scheduled.push(cb);
        return 0;
      };
      const boss = makeWashington();
      boss.getEntity().setPosition(0, 0, 0);

      const onPlayerAttack = vi.fn();
      (boss as any).onPlayerAttack = onPlayerAttack;

      // Direct +x aim: block 0 with lateral offset sits at (3, 0, -3.5).
      const player = new Entity('player');
      player.setPosition(3, 0, -3.5);

      (boss as any).startMonumentRise(player, 0);
      (boss as any).updateMonumentRise(0.016, player, 0.001, undefined);
      expect(scheduled.length).toBeGreaterThan(0);

      // No damage before the column erupts (riseMs = 60ms of setup time).
      expect(onPlayerAttack).not.toHaveBeenCalled();

      // Advance past the eruption moment and run the scheduled ticks.
      vi.setSystemTime(10_000 + 70);
      pump();
      expect(onPlayerAttack).toHaveBeenCalledWith(boss, (boss as any).monumentDamage);

      // Regression guard: a player who steps away before the eruption tick
      // must NOT be hit — damage is re-evaluated live at eruption time.
      onPlayerAttack.mockClear();
      const boss2 = makeWashington();
      (boss2 as any).onPlayerAttack = onPlayerAttack;
      vi.setSystemTime(20_000);
      const runner = new Entity('runner');
      runner.setPosition(3, 0, -3.5);
      (boss2 as any).startMonumentRise(runner, 0);
      (boss2 as any).updateMonumentRise(0.016, runner, 0.001, undefined);
      runner.setPosition(500, 0, 500);
      vi.setSystemTime(20_000 + 70);
      pump();
      expect(onPlayerAttack).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('GeorgeWashington cannon barrage damage', () => {
  it('cannon damage is applied on detonation, not at launch', () => {
    vi.useFakeTimers();
    scheduled.length = 0;
    // Fake timers replace rAF with a fake that drops callbacks — re-patch.
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      scheduled.push(cb);
      return 0;
    };
    try {
      vi.setSystemTime(50_000);
      scheduled.length = 0;
      // Fake timers replace rAF with a fake that drops callbacks — re-patch.
      (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        scheduled.push(cb);
        return 0;
      };
      const boss = makeWashington();
      boss.getEntity().setPosition(0, 0, 0);
      const onPlayerAttack = vi.fn();
      (boss as any).onPlayerAttack = onPlayerAttack;

      const player = new Entity('player');
      const range = (boss as any).cannonRange as number;

      // Last shell of a 6-gun spread has spreadAngle = +90°, and the launcher's
      // rotation convention maps +90° to (-1, 0, 0) → lands at (−range, 0, 0).
      (boss as any).cannonBarrageState = {
        endTimeSeconds: 999,
        nextCannonAtSeconds: 0,
        cannonsFired: 5,
      };

      // Shells are aimed at the player's position at launch. With firing order
      // cannonsFired→6, the last shell has spreadAngle = +90°, which the
      // launcher's rotation maps to (0, 0, +1). To land the shell exactly on
      // the player, aim +x first (player at (range,0,0)), then step the player
      // to the shell's true impact point before it lands.
      player.setPosition(range, 0, 0);
      (boss as any).updateCannonBarrage(0.016, player, 5.0, undefined);
      expect(scheduled.length).toBeGreaterThan(0);

      // Shell is mid-flight: no damage yet even though the player will be at
      // the impact point (pre-fix the check ran once at launch).
      expect(onPlayerAttack).not.toHaveBeenCalled();

      // Player reaches the impact point (0,0,+range) before detonation.
      player.setPosition(0, 0, range);
      // Detonation moment. The shell detonation tick first schedules the
      // explosion two-stage tick (explosion schedules its own follow-up via
      // rAF before the damage line runs), so it takes an extra drain pass:
      // shell tick → explosion tick → explosion teardown tick.
      vi.setSystemTime(50_000 + 1300);
      pump();
      pump();
      pump();
      expect(onPlayerAttack).toHaveBeenCalledWith(boss, (boss as any).cannonDamage);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a player who dodges away before impact takes no cannon damage', () => {
    vi.useFakeTimers();
    scheduled.length = 0;
    // Fake timers replace rAF with a fake that drops callbacks — re-patch.
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      scheduled.push(cb);
      return 0;
    };
    try {
      vi.setSystemTime(60_000);
      scheduled.length = 0;
      // Fake timers replace rAF with a fake that drops callbacks — re-patch.
      (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        scheduled.push(cb);
        return 0;
      };
      const boss = makeWashington();
      boss.getEntity().setPosition(0, 0, 0);
      const onPlayerAttack = vi.fn();
      (boss as any).onPlayerAttack = onPlayerAttack;

      const range = (boss as any).cannonRange as number;
      (boss as any).cannonBarrageState = {
        endTimeSeconds: 999,
        nextCannonAtSeconds: 0,
        cannonsFired: 5,
      };

      const player = new Entity('player');
      player.setPosition(range, 0, 0);
      (boss as any).updateCannonBarrage(0.016, player, 5.0, undefined);
      // Dodge far away before the shell lands.
      player.setPosition(-300, 0, -300);
      vi.setSystemTime(60_000 + 1300);
      pump();
      pump(); // shell tick + explosion tick
      expect(onPlayerAttack).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
