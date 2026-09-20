// Regression test for the "player still moving behind the death screen"
// bug. `FirstPersonCamera.update` must early-out when the death screen
// is visible. We exercise it via the globalThis.__isDeathScreenVisible
// hook (set by `world/scenes/deathScreen.ts`) — that indirection exists
// deliberately so the camera script doesn't need to import DOM code and
// trigger a circular dependency chain through player.ts.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Entity, Vec3 } from 'playcanvas';
import { FirstPersonCamera } from '../../src/player/FirstPersonCamera';

function makeCamera() {
  const app: any = {
    systems: {},
    keyboard: { isPressed: () => false },
    mouse: { isPressed: () => false },
  };

  const entity = new Entity('camera');
  entity.setPosition(0, 2, 0);

  const camera = Object.create(FirstPersonCamera.prototype) as any;
  camera.app = app;
  camera.entity = entity;
  camera.groundHeight = 0;
  camera.keys = { KeyW: true, Space: true };
  camera.movementLocked = false;
  camera.wasJumpHeld = false;
  camera.wasDashHeld = false;
  camera.velocity = new Vec3(0, 0, 0);
  camera.getGroundHeightAt = () => 0;
  camera.isFiniteNumber = (n: number) => Number.isFinite(n);
  camera.clampToMovementBounds = (v: any) => v;
  camera.basePosition = new Vec3(0, 2, 0);
  camera.basePositionReady = true;
  camera.eulers = new Vec3(0, 0, 0);
  camera.devFlyMode = false;
  camera.playerHeight = 2;
  camera.groundedEpsilon = 0.02;
  camera.moveSpeed = 5;
  camera.slideCameraBlend = 0;
  camera.slideActive = false;
  camera.wallRunActive = false;
  camera.airJumpsRemaining = 0;
  camera.maxAirJumps = 0;

  return { camera, entity };
}

describe('FirstPersonCamera freezes while death screen is up', () => {
  afterEach(() => {
    delete (globalThis as any).__isDeathScreenVisible;
    vi.restoreAllMocks();
  });

  it('keeps the entity in place while __isDeathScreenVisible() is true', () => {
    (globalThis as any).__isDeathScreenVisible = () => true;

    const { camera, entity } = makeCamera();
    const velocitySetSpy = vi.spyOn(camera.velocity, 'set');

    const start = entity.getPosition().clone();
    for (let i = 0; i < 30; i += 1) camera.update(1 / 60);
    const end = entity.getPosition();

    expect(end.x).toBe(start.x);
    expect(end.y).toBe(start.y);
    expect(end.z).toBe(start.z);

    // Velocity is force-cleared so held WASD momentum doesn't carry through
    // into the game world after revive.
    expect(velocitySetSpy).toHaveBeenCalledWith(0, 0, 0);
  });

  it('key-state latches are reset so held keys do not re-trigger after revive', () => {
    (globalThis as any).__isDeathScreenVisible = () => true;
    const { camera } = makeCamera();

    camera.wasJumpHeld = false;
    camera.wasDashHeld = false;
    camera.update(1 / 60);

    expect(camera.wasJumpHeld).toBe(true);
    expect(camera.wasDashHeld).toBe(true);
  });

  it('without the visibility hook set, does NOT enter the pause branch', () => {
    delete (globalThis as any).__isDeathScreenVisible;
    const { camera } = makeCamera();
    const velocitySetSpy = vi.spyOn(camera.velocity, 'set');

    // Stub out everything below the early-out so we can confirm update()
    // PAST the gate runs without invoking the velocity-reset side-effect.
    camera.getGroundHeightAt = () => undefined;
    camera.getWallHit = () => null;
    camera.stopWallRun = vi.fn();
    camera.startWallRun = vi.fn();
    camera.resolveMovementAxis = (pos: Vec3) => pos;
    camera.isBlocked = () => false;
    camera.updateSlide = vi.fn();
    camera.applyLateralBob = vi.fn();
    camera.updateCamera = vi.fn();
    camera.updateWallRun = vi.fn();
    camera.updateFov = vi.fn();
    camera.handleJump = vi.fn();
    camera.handleDash = vi.fn();
    camera.handleSlide = vi.fn();
    camera.handleWallRun = vi.fn();
    camera.handleGravity = vi.fn();

    try {
      camera.update(1 / 60);
    } catch {
      // The full movement path requires a real PlayCanvas application; we
      // only care that velocity.set was not called, so swallowing the
      // PlayCanvas internals error is safe here.
    }

    // Pause-specific side effect must not fire.
    expect(velocitySetSpy).not.toHaveBeenCalled();
  });
});
