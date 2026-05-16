import { Vec3, type AppBase, type Asset, type BoundingBox, type Entity, type MeshInstance } from "playcanvas";

export class Model {
  modelEntity: Entity;
  modelName?: string;
  modelPosition?: Vec3;
  modelRotation?: Vec3;
  modelScale?: Vec3;

  constructor(modelEntity: Entity) {
    this.modelEntity = modelEntity;
    this.modelName = modelEntity?.name;
  }
}

export interface LoadModelOptions {
  rigidbodyType?: 'static' | 'dynamic' | 'kinematic';
  mass?: number;
}

function collectMeshInstances(entity: Entity, out: MeshInstance[] = []): MeshInstance[] {
  const meshInstances = entity.render?.meshInstances;
  if (meshInstances && meshInstances.length > 0) {
    out.push(...meshInstances);
  }

  for (const child of entity.children) {
    collectMeshInstances(child as Entity, out);
  }

  return out;
}

function getCombinedWorldBounds(entity: Entity): BoundingBox | null {
  const meshInstances = collectMeshInstances(entity);
  let bounds: BoundingBox | null = null;

  for (const meshInstance of meshInstances) {
    const aabb = meshInstance.aabb;
    if (!aabb) continue;

    if (!bounds) {
      bounds = aabb.clone();
    } else {
      bounds.add(aabb);
    }
  }

  return bounds;
}

export function loadModel(url: string, appArg?: AppBase, options: LoadModelOptions = {}): Promise<Model> {
  const app = appArg ?? ((globalThis as any).app as AppBase | undefined);
  if (!app || !app.assets) {
    return Promise.reject(new Error("PlayCanvas `app` not found on globalThis and no appArg provided"));
  }

  return new Promise((resolve, reject) => {
    try {
      app.assets.loadFromUrl(url, "container", (err: any, asset: Asset) => {
        if (err) {
          console.error("Failed to load model:", err);
          return reject(err);
        }

        if (!asset || !(asset as any).resource) {
          const msg = "Asset loaded but no resource found";
          console.error(msg);
          return reject(new Error(msg));
        }

        const res: any = (asset as any).resource;

        const instantiateFns = [
          "instantiateRenderEntity",
          "instantiateModel",
          "instantiate",
        ];

        let modelEntity: any = null;
        for (const fn of instantiateFns) {
          if (typeof res[fn] === "function") {
            try {
              modelEntity = res[fn]();
              if (modelEntity) break;
            } catch (e) {
              // continue trying other methods
            }
          }
        }

        if (!modelEntity) {
          const msg = "Unable to instantiate model entity from resource";
          console.error(msg);
          return reject(new Error(msg));
        }

        modelEntity.name = modelEntity.name || "ImportedModel";

        if (typeof modelEntity.setLocalPosition === "function") {
          modelEntity.setLocalPosition(0, 0, -5);
        }
        if (typeof modelEntity.setLocalEulerAngles === "function") {
          modelEntity.setLocalEulerAngles(0, 90, 90);
        }
        if (typeof modelEntity.setLocalScale === "function") {
          modelEntity.setLocalScale(0.05, 0.05, 0.05);
        }

        try {
          if (app.root && typeof app.root.addChild === "function") {
            app.root.addChild(modelEntity);
          }
        } catch (e) {
          console.warn("Failed to add model entity to app.root:", e);
        }

        // Add coarse collision + rigidbody so scene scripts can raycast and collide against models.
        try {
          const rigidbodyType = options.rigidbodyType ?? 'dynamic';

          if (typeof modelEntity.addComponent === 'function' && app.systems?.collision && app.systems?.rigidbody) {
            if (!modelEntity.collision) {
              const combinedBounds = getCombinedWorldBounds(modelEntity);
              const collisionData: {
                type: 'box';
                halfExtents?: Vec3;
                linearOffset?: Vec3;
              } = { type: 'box' };

              if (combinedBounds) {
                const localCenter = modelEntity.getWorldTransform().clone().invert().transformPoint(combinedBounds.center.clone());
                const halfExtents = combinedBounds.halfExtents.clone();
                halfExtents.x = Math.max(halfExtents.x, 0.05);
                halfExtents.y = Math.max(halfExtents.y, 0.05);
                halfExtents.z = Math.max(halfExtents.z, 0.05);
                collisionData.halfExtents = halfExtents;
                collisionData.linearOffset = localCenter;
              }

              modelEntity.addComponent('collision', collisionData);
            }

            if (!modelEntity.rigidbody) {
              const rigidbodyData: {
                type: 'static' | 'dynamic' | 'kinematic';
                mass?: number;
              } = { type: rigidbodyType };

              if (rigidbodyType === 'dynamic') {
                rigidbodyData.mass = options.mass ?? 10;
              }

              modelEntity.addComponent('rigidbody', rigidbodyData);
            }
          }
        } catch (e) {
          console.warn('Failed to add collision/rigidbody to model entity:', e);
        }

        const m = new Model(modelEntity);
        m.modelName = modelEntity.name;

        resolve(m);
      });
    } catch (e) {
      reject(e);
    }
  });
}
