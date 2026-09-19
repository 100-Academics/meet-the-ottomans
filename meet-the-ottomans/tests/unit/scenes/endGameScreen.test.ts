// Unit tests for the end-game screen lifecycle.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showEndGameScreen,
  hideEndGameScreen,
  isEndGameScreenVisible,
} from '../../../src/world/scenes/endGameScreen';

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

describe('end game screen', () => {
  let saved: Record<string, string | null>;

  beforeEach(() => {
    saved = persistFixture();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hideEndGameScreen();
    restoreFixture(saved);
  });

  it('showEndGameScreen inserts #end-game-screen', () => {
    showEndGameScreen();
    expect(document.getElementById('end-game-screen')).not.toBeNull();
  });

  it('hideEndGameScreen removes the DOM', () => {
    showEndGameScreen();
    hideEndGameScreen();
    expect(document.getElementById('end-game-screen')).toBeNull();
  });

  it('isEndGameScreenVisible tracks DOM presence', () => {
    expect(isEndGameScreenVisible()).toBe(false);
    showEndGameScreen();
    expect(isEndGameScreenVisible()).toBe(true);
    hideEndGameScreen();
    expect(isEndGameScreenVisible()).toBe(false);
  });

  it('is idempotent when shown twice', () => {
    showEndGameScreen();
    showEndGameScreen();
    expect(document.querySelectorAll('#end-game-screen').length).toBe(1);
  });

  it('"Proceed to Secret Boss" calls onProceed when provided', () => {
    const onProceed = vi.fn();
    showEndGameScreen({ onProceed });
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('#end-game-screen button'))
      .find((b) => b.textContent === 'Proceed to Secret Boss');
    btn!.click();
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('"Return to Map" prefers onReturnToMap over onMainMenu', () => {
    const onReturnToMap = vi.fn();
    const onMainMenu = vi.fn();
    showEndGameScreen({ onReturnToMap, onMainMenu });
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('#end-game-screen button'))
      .find((b) => b.textContent === 'Return to Map');
    btn!.click();
    expect(onReturnToMap).toHaveBeenCalledTimes(1);
    expect(onMainMenu).not.toHaveBeenCalled();
  });

  it('renders the "All Battles Won" title', () => {
    showEndGameScreen();
    expect(document.querySelector('.end-title')?.textContent).toBe('All Battles Won');
  });

  it('shows completion progress in X/Y format', () => {
    showEndGameScreen();
    expect(document.querySelector('.end-progress')?.textContent).toMatch(/Battles completed: \d+\/\d+/);
  });
});
