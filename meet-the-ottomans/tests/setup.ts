// Shared test bootstrap. Must run before any game module import touching
// `document` (the scene-destruction logic tolerates a missing document, but
// the HUD / quiz / death-screen code paths test better with one).
import { beforeEach } from 'vitest';

beforeEach(() => {
  // Clear the DOM so DOM-creating helpers (death screen, HUD, etc.) don't
  // leak state across tests.
  document.body.innerHTML = '';
  // Reset timer mocks per spec; some tests override vitest.useFakeTimers.
  // (No-op when fake timers aren't in use.)
});
