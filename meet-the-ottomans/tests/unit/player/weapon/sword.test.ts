// Sword: defaults and custom values through the Weapon base.
import { describe, it, expect } from 'vitest';
import { Sword } from '@/player/weapon/sword';

describe('Sword', () => {
  it('defaults to 25 damage and 1.5 range', () => {
    const s = new Sword();
    expect(s.getName()).toBe('Sword');
    expect(s.getDamage()).toBe(25);
    expect(s.getRange()).toBe(1.5);
  });

  it('accepts overridden range and damage', () => {
    const s = new Sword(2.5, 60);
    expect(s.getRange()).toBe(2.5);
    expect(s.getDamage()).toBe(60);
    expect(s.getName()).toBe('Sword');
  });
});
