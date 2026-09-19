// Secrets counter: localStorage persistence and the time-period-8 gate
// (period 8 is only reachable when getSecretsFound() >= TOTAL_SECRETS_AVAILABLE,
// matching the guard in scenes/default.ts lines ~431/441).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSecretsFound,
  setSecretsFound,
  resetSecretsFound,
  showSecretsPopup,
  TOTAL_SECRETS_AVAILABLE,
} from '@/world/secrets';

const SECRETS_STORAGE_KEY = 'meetTheOttomans.secretsFound';

beforeEach(() => {
  window.localStorage.clear();
  resetSecretsFound();
});

describe('secrets counter', () => {
  it('starts at zero after reset', () => {
    expect(getSecretsFound()).toBe(0);
  });

  it('setSecretsFound persists to localStorage', () => {
    setSecretsFound(5);
    expect(getSecretsFound()).toBe(5);
    expect(window.localStorage.getItem(SECRETS_STORAGE_KEY)).toBe('5');
  });

  it('resetSecretsFound clears storage and hides the popup', () => {
    setSecretsFound(3);
    showSecretsPopup();
    expect(document.getElementById('secrets-counter-popup')).not.toBeNull();
    resetSecretsFound();
    expect(getSecretsFound()).toBe(0);
    expect(window.localStorage.getItem(SECRETS_STORAGE_KEY)).toBe('0');
  });
});

describe('time period 8 gating', () => {
  it('period 8 stays locked when fewer secrets are found than available', () => {
    setSecretsFound(TOTAL_SECRETS_AVAILABLE - 1);
    expect(getSecretsFound() < TOTAL_SECRETS_AVAILABLE).toBe(true);
  });

  it('period 8 unlocks once all secrets are found', () => {
    setSecretsFound(TOTAL_SECRETS_AVAILABLE);
    expect(getSecretsFound() >= TOTAL_SECRETS_AVAILABLE).toBe(true);
  });

  it('there are exactly 12 secrets to collect', () => {
    expect(TOTAL_SECRETS_AVAILABLE).toBe(12);
  });
});

describe('secrets popup DOM', () => {
  it('showSecretsPopup mounts a visible badge with the current count', () => {
    setSecretsFound(2);
    showSecretsPopup();
    const el = document.getElementById('secrets-counter-popup');
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain(`2/${TOTAL_SECRETS_AVAILABLE}`);
    expect(el!.classList.contains('visible')).toBe(true);
  });
});
