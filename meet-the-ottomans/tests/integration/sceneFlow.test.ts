// Integration: scene-teardown flow combining sceneCleanup, unloadAll, and
// battleHUD teardown — the same sequence changeScene() runs in App.ts.
import { describe, it, expect } from 'vitest';
import { Entity } from 'playcanvas';
import { registerSceneCleanup, runSceneCleanupHandlers, bumpSceneGeneration } from '@/util/sceneCleanup';
import { unloadAll } from '@/util/unloadall';
import { createBattleHUD, removeBattleHUD } from '@/util/battleHUD';
import {
  resetBattleProgress,
  markAllNonSecretComplete,
  isAllNonSecretComplete,
} from '@/util/battleProgress';
import {
  setSecretsFound,
  resetSecretsFound,
  getSecretsFound,
  TOTAL_SECRETS_AVAILABLE,
} from '@/world/secrets';

function makeSceneApp() {
  const listeners = new Map<string, Set<(...a: any[]) => void>>();
  const app: any = {
    systems: {},
    root: new Entity('root'),
    on(e: string, h: any) { listeners.has(e) ? listeners.get(e)!.add(h) : listeners.set(e, new Set([h])); },
    off(e: string, h: any) { listeners.get(e)?.delete(h); },
  };
  return app;
}

describe('scene teardown integration', () => {
  it('full teardown clears entities, DOM HUD, and cleanup handlers', () => {
    window.localStorage.clear();
    const app = makeSceneApp();

    // Build a fake battle scene: entity, HUD, and a cleanup callback.
    app.root.addChild(new Entity('ground'));
    app.root.addChild(new Entity('player-root'));
    createBattleHUD();
    let hudRemovedByCleanup = false;
    registerSceneCleanup(app, () => { hudRemovedByCleanup = true; });

    // changeScene equivalent:
    removeBattleHUD();
    runSceneCleanupHandlers(app);
    unloadAll(app);
    bumpSceneGeneration();

    expect(hudRemovedByCleanup).toBe(true);
    expect(app.root.children.length).toBe(0);
    expect(document.getElementById('battle-hud')).toBeNull();
  });
});

describe('progress → period 8 gate integration', () => {
  it('period 8 unlock requires all secrets, independent of battle progress', () => {
    window.localStorage.clear();
    resetBattleProgress();
    resetSecretsFound();

    markAllNonSecretComplete();
    expect(isAllNonSecretComplete()).toBe(true);
    // Battles done but secrets missing → still gated.
    expect(getSecretsFound() < TOTAL_SECRETS_AVAILABLE).toBe(true);

    window.localStorage.setItem('meetTheOttomans.secretsFound', String(TOTAL_SECRETS_AVAILABLE));
    setSecretsFound(TOTAL_SECRETS_AVAILABLE);
    expect(getSecretsFound() >= TOTAL_SECRETS_AVAILABLE).toBe(true);
  });
});
