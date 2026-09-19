// unloadAll must destroy every direct child of app.root.
import { describe, it, expect } from 'vitest';
import { Entity } from 'playcanvas';
import { unloadAll } from '@/util/unloadall';

describe('unloadAll', () => {
  it('destroys every child of app.root', () => {
    const root = new Entity('root');
    const app: any = { root, systems: {} };
    root.addChild(new Entity('a'));
    root.addChild(new Entity('b'));
    root.addChild(new Entity('c'));
    expect(root.children.length).toBe(3);
    unloadAll(app);
    expect(root.children.length).toBe(0);
  });

  it('is a no-op on an already empty root', () => {
    const root = new Entity('root');
    const app: any = { root };
    expect(() => unloadAll(app)).not.toThrow();
    expect(root.children.length).toBe(0);
  });

  it('destroys nested subtrees along with their parents', () => {
    const root = new Entity('root');
    const app: any = { root };
    const parent = new Entity('parent');
    parent.addChild(new Entity('grandchild'));
    root.addChild(parent);
    unloadAll(app);
    expect(root.children.length).toBe(0);
  });
});
