// Unit tests for the victory screen lifecycle.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showVictoryScreen,
  hideVictoryScreen,
} from '../../../src/world/scenes/victoryScreen';

const STORAGE_KEYS = ['meetTheOttomans.battleProgress', 'meetTheOttomans.secretsFound'];

function persistFixture() {
  const saved: Record<string, string | null> = {};
  for (const k of STORAGE_KEYS) saved[k] = window.localStorage.getItem(k);
  window.localStorage.clear();
  return saved;
}
function restoreFixture(saved: Record<string, string | null>) {
  window.localStorage.clear();
  for (const [k, v] of Object.entries(saved)) {
    if (v !== null) window.localStorage.setItem(k, v);
  }
}

describe('victory screen', () => {
  let saved: Record<string, string | null>;

  beforeEach(() => {
    saved = persistFixture();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hideVictoryScreen();
    restoreFixture(saved);
  });

  it('showVictoryScreen inserts #victory-screen', () => {
    showVictoryScreen();
    expect(document.getElementById('victory-screen')).not.toBeNull();
  });

  it('hideVictoryScreen removes it', () => {
    showVictoryScreen();
    hideVictoryScreen();
    expect(document.getElementById('victory-screen')).toBeNull();
  });

  it('is idempotent when shown twice', () => {
    showVictoryScreen();
    showVictoryScreen();
    expect(document.querySelectorAll('#victory-screen').length).toBe(1);
  });

  it('renders the custom message', () => {
    showVictoryScreen({ message: 'Boss taunt here' });
    expect(document.getElementById('victory-screen')?.textContent).toContain('Boss taunt here');
  });

  it('Main Menu button calls onMainMenu when provided', () => {
    const onMainMenu = vi.fn();
    showVictoryScreen({ onMainMenu });
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('#victory-screen button'))
      .find((b) => b.textContent === 'Main Menu');
    expect(btn).toBeTruthy();
    btn!.click();
    expect(onMainMenu).toHaveBeenCalledTimes(1);
  });

  it('removes competing overlays when shown', () => {
    const stray = document.createElement('div');
    stray.className = 'overlay';
    stray.id = 'stray-overlay';
    document.body.appendChild(stray);
    showVictoryScreen();
    expect(document.getElementById('stray-overlay')).toBeNull();
  });
});
