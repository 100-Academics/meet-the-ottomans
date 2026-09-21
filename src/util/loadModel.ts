import { Vec3, type AppBase, type Asset, type Entity } from "playcanvas";
import { applyMeshCollision } from "./applyCollision";
import { getSceneGeneration } from "./sceneCleanup";

const modelAssetUrls = import.meta.glob("../assets/**/*.{glb,gltf}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const MODEL_ASSET_PREFIX = "../assets/";

function normalizeRequestedModelPath(url: string): string {
  const normalizedPath = url.replace(/\\/g, "/").split("?")[0].replace(/^\/+/, "");
  return normalizedPath.startsWith("assets/")
    ? normalizedPath.slice("assets/".length)
    : normalizedPath;
}

function buildModelPathIndex(): Map<string, string> {
  const index = new Map<string, string>();

  for (const [sourcePath, resolvedUrl] of Object.entries(modelAssetUrls)) {
    if (!sourcePath.startsWith(MODEL_ASSET_PREFIX)) {
      continue;
    }

    const assetRelativePath = sourcePath.slice(MODEL_ASSET_PREFIX.length);
    const aliases = new Set<string>([
      assetRelativePath,
      `assets/${assetRelativePath}`,
    ]);

    if (assetRelativePath.startsWith("models/")) {
      aliases.add(assetRelativePath.slice("models/".length));
    }

    if (assetRelativePath.startsWith("world/")) {
      aliases.add(assetRelativePath.slice("world/".length));
    }

    for (const alias of aliases) {
      if (!index.has(alias)) {
        index.set(alias, resolvedUrl);
      }
    }
  }

  return index;
}

const modelPathIndex = buildModelPathIndex();

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

  get position(): Vec3 | undefined {
    if (this.modelEntity && typeof this.modelEntity.getLocalPosition === "function") {
      return this.modelEntity.getLocalPosition();
    }
  }

  get rotation(): Vec3 | undefined {
    if (this.modelEntity && typeof this.modelEntity.getLocalEulerAngles === "function") {
      return this.modelEntity.getLocalEulerAngles();
    }
  }

  get scale(): Vec3 | undefined {
    if (this.modelEntity && typeof this.modelEntity.getLocalScale === "function") {
      return this.modelEntity.getLocalScale();
    }
  }
}

export interface LoadModelOptions {
  rigidbodyType?: 'static' | 'dynamic' | 'kinematic';
  mass?: number;
  autoCollision?: boolean;
  convexHull?: boolean;
  includeDescendants?: boolean;
  position?: Vec3 | [number, number, number];
  rotation?: Vec3 | [number, number, number];
  scale?: Vec3 | [number, number, number];
  /**
   * Tag every entity that produced a collision mesh (e.g. "ground").
   * Loading a terrain .glb only seizes the ROOT with a tag in battle
   * scenes — ground raycasts (getHighestGroundHitY, sampleGroundHeight)
   * check the tag through the hierarchy of the entity they hit, which is
   * the auto-generated mesh CHILD of a compound collider, so parents
   * don't help. When a battlefield's root ends up with no mesh of its
   * own (observed with Arnon.glb: the mesh sits on a child node) the
   * child is what the raycast hits, and it must carry the tag itself or
   * the player falls through the floor.
   */
  tagCollisionMeshes?: string;
}

function toVec3(value?: Vec3 | [number, number, number]): Vec3 | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Vec3) {
    return value;
  }

  return new Vec3(value[0], value[1], value[2]);
}

function resolveModelUrl(url: string): string | undefined {
  const pathWithoutAssetsPrefix = normalizeRequestedModelPath(url);
  const pathWithoutModelsPrefix = pathWithoutAssetsPrefix.startsWith("models/")
    ? pathWithoutAssetsPrefix.slice("models/".length)
    : pathWithoutAssetsPrefix;
  const pathWithoutWorldPrefix = pathWithoutAssetsPrefix.startsWith("world/")
    ? pathWithoutAssetsPrefix.slice("world/".length)
    : pathWithoutAssetsPrefix;

  const candidates = [
    pathWithoutAssetsPrefix,
    pathWithoutModelsPrefix,
    pathWithoutWorldPrefix,
    `models/${pathWithoutModelsPrefix}`,
    `world/${pathWithoutWorldPrefix}`,
  ];

  for (const candidate of candidates) {
    const resolved = modelPathIndex.get(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

export function loadModel(url: string, appArg?: AppBase, options: LoadModelOptions = {}): Promise<Model> {
  const app = appArg ?? ((globalThis as any).app as AppBase | undefined);
  if (!app || !app.assets) {
    return Promise.reject(new Error("PlayCanvas `app` not found on globalThis and no appArg provided"));
  }

  // Snapshot the scene generation: the load is async and the player can
  // change scenes (Home button, victory/death screen) while it is in
  // flight. Attaching the model to a torn-down scene afterwards corrupts
  // the next scene — bail before the attach instead.
  const loadGeneration = getSceneGeneration();

  const resolvedUrl = resolveModelUrl(url);
  if (!resolvedUrl) {
    return Promise.reject(
      new Error(`Model "${url}" was not found in src/assets and cannot be loaded`)
    );
  }

  return new Promise((resolve, reject) => {
    try {
      app.assets.loadFromUrl(resolvedUrl, "container", (err: any, asset?: Asset) => {
        if (err) {
          const withContext = new Error(`Failed to load model from "${url}" (resolved: "${resolvedUrl}")`);
          console.error(withContext.message, err);
          return reject(withContext);
        }

        if (!asset || !(asset as any).resource) {
          const msg = "Asset loaded but no resource found";
          console.error(msg);
          return reject(new Error(msg));
        }

        if (getSceneGeneration() !== loadGeneration) {
          // The scene changed while this model was loading (player went
          // Home, died, or won). Do not attach it to the new scene.
          return reject(new Error(`Model "${url}" finished loading after a scene change; discarded`));
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

        const position = toVec3(options.position) ?? new Vec3(0, 0, -5);
        const rotation = toVec3(options.rotation) ?? new Vec3(0, 90, 90);
        const scale = toVec3(options.scale) ?? new Vec3(0.05, 0.05, 0.05);

        if (typeof modelEntity.setLocalPosition === "function") {
          modelEntity.setLocalPosition(position);
        }
        if (typeof modelEntity.setLocalEulerAngles === "function") {
          modelEntity.setLocalEulerAngles(rotation);
        }
        if (typeof modelEntity.setLocalScale === "function") {
          modelEntity.setLocalScale(scale);
        }

        try {
          if (app.root && typeof app.root.addChild === "function") {
            app.root.addChild(modelEntity);
          }
        } catch (e) {
          console.warn("Failed to add model entity to app.root:", e);
        }

        if (options.autoCollision ?? true) {
          const rigidbodyType = options.rigidbodyType ?? 'dynamic';
          try {
            applyMeshCollision(modelEntity, {
              rigidbodyType,
              mass: options.mass,
              convexHull: options.convexHull,
              includeDescendants: options.includeDescendants
            });
          } catch (error) {
            console.warn(`Collision setup failed for "${modelEntity.name}"`, error);
          }
        }

        // Tag mesh-bearing descendants after collision was applied so
        // exactly the entities the physics raycast can hit also report
        // the tag (see LoadModelOptions.tagCollisionMeshes).
        if (options.tagCollisionMeshes) {
          const tag = options.tagCollisionMeshes;
          modelEntity.tags.add(tag);
          const stack: any[] = [...(modelEntity.children ?? [])];
          while (stack.length > 0) {
            const node = stack.pop();
            if (node?.tags && node?.collision) {
              node.tags.add(tag);
            }
            if (node?.children) {
              stack.push(...node.children);
            }
          }
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
