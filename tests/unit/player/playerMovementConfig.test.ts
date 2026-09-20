// Player movement tuning constants — these numbers encode game feel and
// cross-module consistency (e.g. slide/wallrun derived from base move speed).
import { describe, it, expect } from 'vitest';
import * as C from '@/player/playerMovementConfig';

describe('playerMovementConfig constants', () => {
  it('core movement values match the tuned gameplay constants', () => {
    expect(C.PLAYER_MOVE_SPEED).toBe(45);
    expect(C.PLAYER_GRAVITY).toBe(170);
    expect(C.PLAYER_JUMP_POWER).toBe(65);
    expect(C.PLAYER_MAX_STEP_HEIGHT).toBeCloseTo(0.9);
  });

  it('air mobility caps', () => {
    expect(C.PLAYER_MAX_AIR_JUMPS).toBe(1);
    expect(C.PLAYER_MAX_DASHES).toBe(2);
  });

  it('dash tuning', () => {
    expect(C.PLAYER_DASH_SPEED).toBe(700);
    expect(C.PLAYER_DASH_DURATION).toBeCloseTo(0.05);
    expect(C.PLAYER_DASH_RECHARGE_TIME).toBeCloseTo(0.6);
  });

  it('derived wallrun/slide speeds stay proportionate to base move speed', () => {
    expect(C.PLAYER_WALLRUN_SPEED).toBeCloseTo(C.PLAYER_MOVE_SPEED * 1.25);
    expect(C.PLAYER_SLIDE_SPEED).toBeCloseTo(C.PLAYER_MOVE_SPEED * 1.6);
  });

  it('wall run angle window is a sane range around vertical walls', () => {
    expect(C.PLAYER_WALLRUN_MIN_WALL_ANGLE_DEG).toBeLessThan(C.PLAYER_WALLRUN_MAX_WALL_ANGLE_DEG);
    expect(C.PLAYER_WALLRUN_MIN_WALL_ANGLE_DEG).toBe(65);
    expect(C.PLAYER_WALLRUN_MAX_WALL_ANGLE_DEG).toBe(105);
  });
});
