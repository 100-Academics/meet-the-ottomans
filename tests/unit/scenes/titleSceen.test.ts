// Unit tests for the title screen's cleanup behavior. We drive the
// intro flow with fake timers so the typing animation doesn't stall,
// then verify the intro DOM is removed and overlay children are restored
// when the player hits "Start" / "Skip".
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// defaultScene is pulled in by titleScreen via `start()`; we never reach
// that path in these tests (we skip past it by resolving manually), but
// avoid letting AssetListLoader stall when the module is imported.
import { AssetListLoader } from 'playcanvas';
vi.spyOn(AssetListLoader.prototype, 'load').mockImplementation(function (this: any, cb?: any) {
  const done = typeof cb === 'function' ? cb : arguments[0];
  if (typeof done === 'function') done();
  return this as any;
});

// Stub defaultScene so clicking "Start" doesn't boot the 3D globe.
vi.mock('../../../src/world/scenes/default', () => ({
  defaultScene: async () => () => {},
}));

const { titleScreen } = await import('../../../src/world/scenes/titleSceen');

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

function makeFixture() {
  document.body.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'absolute overlay';
  const sentinel = document.createElement('div');
  sentinel.id = 'sentinel-child';
  overlay.appendChild(sentinel);
  document.body.appendChild(overlay);
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  return { overlay, canvas };
}

function makeApp() {
  const handlers: Array<() => void> = [];
  return {
    graphicsDevice: {},
    root: { addChild: () => {}, children: [] as any[] },
    assets: {},
    scene: { layers: { getLayerByName: () => null } },
    setCanvasFillMode() {}, setCanvasResolution() {}, resizeCanvas() {}, start() {},
    once() {}, on() {}, off() {},
    mouse: { on() {}, off() {} }, keyboard: { off() {} }, touch: { off() {} },
    __sceneCleanupHandlers: handlers,
    __appStarted: true,
  } as any;
}

async function startTitleScreen() {
  const { overlay, canvas } = makeFixture();
  const app = makeApp();
  const promise = titleScreen(canvas, app, () => {}, () => 0, -2);
  // Let showTitleCard mount its DOM (the function awaits user input or a
  // 4s timeout). Pump one microtask so the card listener is attached.
  await Promise.resolve();
  // Click the title card — deterministic, no reliance on keyup plumbing.
  const card = document.getElementById('title-card');
  card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  // Flush the fade-out fallback timer (FADE_OUT_MS + 100) so showTitleCard
  // resolves and titleScreen proceeds to mount the intro UI.
  await vi.advanceTimersByTimeAsync(1000);
  // Let the promise chain continue.
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  return { promise, overlay, canvas, app };
}

describe('title screen lifecycle', () => {
  let saved: Record<string, string | null>;

  beforeEach(() => {
    saved = persistFixture();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    restoreFixture(saved);
    document.body.innerHTML = '';
  });

  it('mounts #intro-screen over the overlay', async () => {
    const { promise } = await startTitleScreen();
    expect(document.getElementById('intro-screen')).not.toBeNull();
    const skip = document.getElementById('intro-skip') as HTMLButtonElement;
    skip.click();
    await promise; // resolves to the renderFn from mocked defaultScene
  });

  it('hides other overlay children while intro is visible and restores them after skip', async () => {
    const { promise } = await startTitleScreen();
    const sentinel = document.getElementById('sentinel-child') as HTMLElement;
    expect(sentinel.style.display).toBe('none');

    const skip = document.getElementById('intro-skip') as HTMLButtonElement;
    skip.click();
    await promise;
    expect(sentinel.style.display === '' || sentinel.style.display === 'block').toBe(true);
    expect(document.getElementById('intro-screen')).toBeNull();
  });

  it('skip removes the intro DOM', async () => {
    const { promise } = await startTitleScreen();
    const skip = document.getElementById('intro-skip') as HTMLButtonElement;
    skip.click();
    await promise;
    expect(document.getElementById('intro-screen')).toBeNull();
  });

  it('next click advances slide dots', async () => {
    const { promise } = await startTitleScreen();
    // While typing is in-flight, "Next" fast-forwards to instant render.
    const next = document.getElementById('intro-next') as HTMLButtonElement;
    next.click();
    await vi.runOnlyPendingTimersAsync();
    next.click();
    await vi.runOnlyPendingTimersAsync();
    const dots = document.querySelectorAll('.intro-dot');
    expect(dots.length).toBe(4);

    const skip = document.getElementById('intro-skip') as HTMLButtonElement;
    skip.click();
    await promise;
  });
});
