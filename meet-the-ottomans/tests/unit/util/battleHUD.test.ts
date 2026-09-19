// Battle HUD: DOM construction, update values, status classes, teardown.
import { describe, it, expect } from 'vitest';
import { createBattleHUD, updateBattleHUD, removeBattleHUD } from '@/util/battleHUD';

function makeFakePlayer(health = 100) {
  return {
    getEquippedWeaponName: () => 'Sword',
    getHealth: () => health,
    getDebugState: () => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: -1 },
      velocity: { x: 0, y: 0, z: 0 },
      groundHeight: 0,
      playerHeight: 2,
      health,
      maxHealth: 100,
      weapon: 'Sword',
    }),
  } as any;
}

describe('battleHUD construction', () => {
  it('creates the HUD root, content rows, and crosshair', () => {
    createBattleHUD();
    expect(document.getElementById('battle-hud')).not.toBeNull();
    expect(document.getElementById('hud-weapon')).not.toBeNull();
    expect(document.getElementById('hud-health')).not.toBeNull();
    expect(document.getElementById('hud-npcs')).not.toBeNull();
    expect(document.getElementById('battle-crosshair')).not.toBeNull();
  });

  it('is idempotent — a second call does not duplicate the HUD', () => {
    createBattleHUD();
    createBattleHUD();
    expect(document.querySelectorAll('#battle-hud')).toHaveLength(1);
    expect(document.querySelectorAll('#battle-crosshair')).toHaveLength(1);
  });
});

describe('battleHUD update', () => {
  it('writes weapon, health and NPC counts', () => {
    createBattleHUD();
    updateBattleHUD(makeFakePlayer(70), 5);
    expect(document.getElementById('hud-weapon')!.textContent).toBe('Sword');
    expect(document.getElementById('hud-health')!.textContent).toBe('70/100');
    expect(document.getElementById('hud-npcs')!.textContent).toBe('5');
  });

  it('applies warning class at <= 50 health and critical at <= 25', () => {
    createBattleHUD();
    const healthEl = document.getElementById('hud-health')!;

    updateBattleHUD(makeFakePlayer(50));
    expect(healthEl.classList.contains('warning')).toBe(true);
    expect(healthEl.classList.contains('critical')).toBe(false);

    updateBattleHUD(makeFakePlayer(25));
    expect(healthEl.classList.contains('critical')).toBe(true);
    expect(healthEl.classList.contains('warning')).toBe(false);

    updateBattleHUD(makeFakePlayer(100));
    expect(healthEl.classList.contains('warning')).toBe(false);
    expect(healthEl.classList.contains('critical')).toBe(false);
  });

  it('floors and clamps negative NPC counts', () => {
    createBattleHUD();
    updateBattleHUD(makeFakePlayer(), -3);
    expect(document.getElementById('hud-npcs')!.textContent).toBe('0');
  });
});

describe('battleHUD teardown', () => {
  it('removeBattleHUD removes HUD and crosshair from the DOM', () => {
    createBattleHUD();
    removeBattleHUD();
    expect(document.getElementById('battle-hud')).toBeNull();
    expect(document.getElementById('battle-crosshair')).toBeNull();
  });

  it('removeBattleHUD on an empty DOM does not throw', () => {
    expect(() => removeBattleHUD()).not.toThrow();
  });
});
