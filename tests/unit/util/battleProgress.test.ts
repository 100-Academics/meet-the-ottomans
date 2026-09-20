// Battle progress persistence: localStorage round-trip, alias handling,
// and aggregate count helpers. The module caches state at import time, so
// each test file relying on "fresh" state starts from resetBattleProgress().
import { describe, it, expect, beforeEach } from 'vitest';
import {
  markBattleComplete,
  isBattleComplete,
  isAllNonSecretComplete,
  getCompletedCount,
  getTotalNonSecretCount,
  resetBattleProgress,
  markAllNonSecretComplete,
  NON_SECRET_BATTLES,
} from '@/util/battleProgress';

const STORAGE_KEY = 'meetTheOttomans.battleProgress';

beforeEach(() => {
  window.localStorage.clear();
  resetBattleProgress();
  window.localStorage.clear();
});

describe('battleProgress localStorage round-trip', () => {
  it('persists a completed battle to localStorage immediately', () => {
    markBattleComplete('Battle of Gettysburg');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toContain('Battle of Gettysburg');
  });

  it('round-trips: value written to storage survives a "fresh" import-equivalent read', () => {
    markBattleComplete('Battle of Verdun');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(['Battle of Verdun']);
    expect(isBattleComplete('Battle of Verdun')).toBe(true);
  });

  it('resetBattleProgress clears both memory and storage', () => {
    markBattleComplete('Battle of Pavia (Italian Wars)');
    expect(getCompletedCount()).toBe(1);
    resetBattleProgress();
    expect(getCompletedCount()).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });
});

describe('battleProgress aliases', () => {
  it('marking Siege of Constantinople also marks Fall of Constantinople', () => {
    markBattleComplete('Siege of Constantinople');
    expect(isBattleComplete('Fall of Constantinople')).toBe(true);
  });

  it('marking Fall of Constantinople also marks Siege of Constantinople', () => {
    markBattleComplete('Fall of Constantinople');
    expect(isBattleComplete('Siege of Constantinople')).toBe(true);
  });

  it('unknown battles are treated as plain single names', () => {
    markBattleComplete('Battle of Agincourt');
    expect(isBattleComplete('Battle of Agincourt')).toBe(true);
    expect(isBattleComplete('Battle of Legnica')).toBe(false);
  });
});

describe('battleProgress aggregates', () => {
  it('counts only non-secret battles in getCompletedCount', () => {
    markBattleComplete('Battle of Legnica');
    markBattleComplete('Battle of Yorktown');
    // Fall of Constantinople marks Siege too, so alias adds 2 toward the
    // NON_SECRET_BATTLES list (both names are in the list).
    markBattleComplete('Fall of Constantinople');
    expect(getCompletedCount()).toBe(4);
  });

  it('total non-secret count matches the constant list', () => {
    expect(getTotalNonSecretCount()).toBe(NON_SECRET_BATTLES.length);
    expect(NON_SECRET_BATTLES.length).toBe(21);
  });

  it('isAllNonSecretComplete is false until every non-secret battle is done', () => {
    expect(isAllNonSecretComplete()).toBe(false);
    markAllNonSecretComplete();
    expect(isAllNonSecretComplete()).toBe(true);
    expect(getCompletedCount()).toBe(NON_SECRET_BATTLES.length);
  });
});
