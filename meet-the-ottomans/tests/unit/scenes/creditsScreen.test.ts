// Unit tests for the credits screen lifecycle.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showCreditsScreen,
  hideCreditsScreen,
} from '../../../src/world/scenes/creditsScreen';

describe('credits screen', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hideCreditsScreen();
    document.body.innerHTML = '';
  });

  it('showCreditsScreen inserts #credits-screen', () => {
    showCreditsScreen();
    expect(document.getElementById('credits-screen')).not.toBeNull();
  });

  it('hideCreditsScreen removes it', () => {
    showCreditsScreen();
    hideCreditsScreen();
    expect(document.getElementById('credits-screen')).toBeNull();
  });

  it('is idempotent when shown twice', () => {
    showCreditsScreen();
    showCreditsScreen();
    expect(document.querySelectorAll('#credits-screen').length).toBe(1);
  });

  it('renders all required sections with placeholder content', () => {
    showCreditsScreen();
    const el = document.getElementById('credits-screen') as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('Special Thanks');
    expect(text).toContain('Maps & Geography Data');
    expect(text).toContain('Google Maps');
    expect(text).toContain('Developers');
    expect(text).toContain('Bonus Thanks for continuing to work on the game');
    expect(text).toContain('Jacen Cheskin');
    expect(text).toContain('Daniel Miranda');
    expect(text).toContain('Ms. Bond Lamberty');
    expect(text).toContain('Kelvin Zimmerman');
    expect(text).toContain('Kidus Getachew');
    // 1 special-thanks entry + 4 developer entries + 2 bonus-thanks entries = 7 TBDs
    expect(el.querySelectorAll('.credits-entry').length).toBe(8);
    expect(el.querySelectorAll('h2').length).toBe(4);
  });

  it('Back button removes the screen and calls onClose', () => {
    const onClose = vi.fn();
    showCreditsScreen({ onClose });
    (document.getElementById('credits-back-btn') as HTMLButtonElement).click();
    expect(document.getElementById('credits-screen')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
