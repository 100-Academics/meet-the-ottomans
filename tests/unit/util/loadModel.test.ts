// loadModel path aliasing and failure modes. The module's asset index is
// built from import.meta.glob over src/assets at import time, so we can test
// alias resolution end-to-end with a stubbed app.assets.loadFromUrl.
import { describe, it, expect } from 'vitest';
import { Entity } from 'playcanvas';
import { loadModel, Model } from '@/util/loadModel';

function makeFakeApp(onLoadUrl?: (url: string) => void) {
  const root = new Entity('root');
  return {
    root,
    systems: {},
    assets: {
      loadFromUrl(url: string, _type: string, cb: (err: any, asset?: any) => void) {
        onLoadUrl?.(url);
        const modelEntity = new Entity('stubbed-model');
        cb(null, { resource: { instantiateRenderEntity: () => modelEntity } });
      },
    },
  } as any;
}

describe('loadModel path aliasing', () => {
  const aliases = [
    'assets/models/npc/MongolHorseman.glb',
    'models/npc/MongolHorseman.glb',
    'npc/MongolHorseman.glb',
    'world/battlefields/Agincourt.glb',
    'battlefields/Agincourt.glb',
  ];

  for (const alias of aliases) {
    it(`resolves "${alias}"`, async () => {
      const app = makeFakeApp();
      const model = await loadModel(alias, app, { autoCollision: false });
      expect(model).toBeInstanceOf(Model);
      expect(model.modelEntity).toBeDefined();
    });
  }

  it('strips query strings and backslashes before resolving', async () => {
    const app = makeFakeApp();
    const model = await loadModel('models\\npc\\MongolHorseman.glb?v=123', app, { autoCollision: false });
    expect(model).toBeInstanceOf(Model);
  });

  it('rejects with a clear error for unknown model paths', async () => {
    const app = makeFakeApp();
    await expect(loadModel('models/nope/does-not-exist.glb', app)).rejects.toThrow(/not found/);
  });

  it('rejects when no app is provided and globalThis.app is unset', async () => {
    const prev = (globalThis as any).app;
    delete (globalThis as any).app;
    await expect(loadModel('models/npc/MongolHorseman.glb')).rejects.toThrow(/app.*not found/i);
    (globalThis as any).app = prev;
  });

  it('applies position/scale/rotation options to the entity', async () => {
    const app = makeFakeApp();
    const model = await loadModel('models/npc/MongolHorseman.glb', app, {
      position: [1, 2, 3],
      scale: [2, 2, 2],
      autoCollision: false,
    });
    const pos = model.modelEntity.getLocalPosition();
    expect(pos.x).toBe(1);
    expect(pos.y).toBe(2);
    expect(pos.z).toBe(3);
    expect(model.modelEntity.getLocalScale().x).toBe(2);
  });
});
