// Bow: draw state machine — only one draw at a time, cooldown ~ drawTimeMs.
// Uses vi.useFakeTimers to drive the window.setTimeout-driven draw.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Entity, Vec3 } from 'playcanvas';
import { Bow } from '@/player/weapon/bow';

// Bow spawns an arrow entity with a 'render' component — stub headlessly.
const addComponentStub = () =>
  vi.spyOn(Entity.prototype, 'addComponent').mockImplementation(function () {
    return undefined as any;
  });
addComponentStub();

function makeFakeApp() {
  return { root: new Entity('root'), systems: {} } as any;
}

describe('Bow draw state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    addComponentStub(); // restoreAllMocks in afterEach removes it
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('draw() starts a draw and a second draw during the draw time is rejected', () => {
    const app = makeFakeApp();
    const bow = new Bow(25, 60, 0, 800);
    expect(bow.draw(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1))).toBe(true);
    expect(bow.draw(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1))).toBe(false);
  });

  it('after drawTimeMs the arrow spawns and the bow can be drawn again', () => {
    const app = makeFakeApp();
    const bow = new Bow(25, 60, 0, 800);
    bow.draw(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1));
    vi.advanceTimersByTime(800);
    // Arrow entity should now be under app.root.
    expect(app.root.children.some((c: Entity) => c.name.includes('arrow'))).toBe(true);
    // Ready to draw again.
    expect(bow.draw(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1))).toBe(true);
  });

  it('arrow despawns once it has travelled past bow range', () => {
    const app = makeFakeApp();
    const bow = new Bow(25, 5, 0, 100); // short range → quick despawn
    bow.draw(app, new Vec3(0, 0, 0), new Vec3(0, 0, -1));
    vi.advanceTimersByTime(100); // fire
    // Arrow speed 35 u/s; range 5 → ~0.15s to clear, plus cleanup margin.
    vi.advanceTimersByTime(2000);
    expect(app.root.children.length).toBe(0);
  });

  it('shares the Gun ammo contract (arrows == Infinity)', () => {
    const bow = new Bow(25, 60, 30);
    expect(bow.getArrows()).toBe(Infinity);
  });
});
