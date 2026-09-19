// Gun: damage/range getters, tracer spawn, and the tracer's 150ms lifetime.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Entity, Vec3 } from 'playcanvas';
import { Gun } from '@/player/weapon/gun';

// Gun.shoot adds a 'render' component to the tracer, which requires a real
// PlayCanvas application. Stub addComponent so tests can run headless — we
// only care about entity hierarchy/lifetime.
vi.spyOn(Entity.prototype, 'addComponent').mockImplementation(function (this: any) {
  return undefined as any;
} as any);

function makeFakeApp() {
  return { root: new Entity('root'), systems: {} } as any;
}

describe('Gun getters', () => {
  it('exposes damage/range through the Weapon base getters', () => {
    const gun = new Gun(34, 900, 0);
    expect(gun.getDamage()).toBe(34);
    expect(gun.getRange()).toBe(900);
    expect(gun.getName()).toBe('Gun');
  });

  it('ammo is effectively infinite (no round tracking)', () => {
    const gun = new Gun(10, 100, 30);
    expect(gun.getAmmo()).toBe(Infinity);
  });
});

describe('Gun tracer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('spawn a tracer on shoot and destroys it after 150ms', () => {
    const app = makeFakeApp();
    const gun = new Gun(10, 500, 0);
    expect(gun.shoot(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1))).toBe(true);
    expect(app.root.children.length).toBe(1);

    vi.advanceTimersByTime(149);
    expect(app.root.children.length).toBe(1);
    vi.advanceTimersByTime(2);
    expect(app.root.children.length).toBe(0);
  });

  it('returns false when no app root is available', () => {
    const gun = new Gun(10, 100, 0);
    expect(gun.shoot(undefined)).toBe(false);
  });

  it('caps tracer length at 12 regardless of weapon range', () => {
    const app = makeFakeApp();
    const gun = new Gun(10, 5000, 0);
    gun.shoot(app);
    const shot = app.root.children[0] as Entity;
    const tracer = shot.children.find((c: Entity) => c.name.includes('tracer'))!;
    expect(Math.abs(tracer.getLocalScale().z - 12)).toBeLessThan(1e-9);
  });

  it('normalizes degenerate directions to straight ahead', () => {
    const app = makeFakeApp();
    const gun = new Gun(10, 100, 0);
    expect(gun.shoot(app, new Vec3(0, 0, 0), new Vec3(0, 0, 0))).toBe(true);
    expect(app.root.children.length).toBe(1);
  });
});
