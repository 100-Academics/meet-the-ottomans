import type { Vec3 } from "playcanvas";
import type { Asset } from "playcanvas";

export class Model {
  modelEntity: any;
  modelName?: string;
  modelPosition?: Vec3;
  modelRotation?: Vec3;
  modelScale?: Vec3;

  constructor(modelEntity: any) {
    this.modelEntity = modelEntity;
    this.modelName = modelEntity?.name;
  }
}

export function loadModel(url: string, appArg?: any): Promise<Model> {
  const app = appArg ?? (globalThis as any).app;
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

        // Add a simple collision + static rigidbody so the model can participate
        // in basic physics/collision checks (coarse box collision).
        try {
          if (typeof modelEntity.addComponent === 'function') {
            // Only add if not already present
            if (!modelEntity.collision) {
              modelEntity.addComponent('collision', {
                type: 'box'
              });
            }
            if (!modelEntity.rigidbody) {
              modelEntity.addComponent('rigidbody', {
                type: 'static'
              });
            }
          }
        } catch (e) {
          // Non-fatal: if collision components aren't available, keep going
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