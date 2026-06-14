import { AppBase, Entity, Vec3 } from "playcanvas";
import { loadModel, type Model } from "../util/loadModel";

// ── Global counter ──
//
// Module-level so it survives scene changes. Bumped every time the player
// collects any Secret anywhere in the world.
//
// Read it from anywhere with `getSecretsFound()`. Reset with `resetSecretsFound()`.
let secretsFound = 0;

export function getSecretsFound(): number {
    return secretsFound;
}

export function resetSecretsFound(): void {
    secretsFound = 0;
}

// ── SecretOptions ──
//
// Pass these when constructing a Secret. The model is loaded from
// src/assets/<modelPath> by the loader in util/loadModel.
export interface SecretOptions {
    app: AppBase;
    cameraEntity: Entity;
    modelPath: string;
    position: Vec3;
    scale?: Vec3;
    rotation?: Vec3;
    // Forgiving click radius around the secret's center (world units).
    hitboxRadius?: number;
    // Player must be within this distance to collect on click.
    maxClickRange?: number;
}

// ── Secret ──
//
// A clickable collectible. Place a static 3D model in the scene; when the player
// left-clicks it (or near it, within the hitbox radius), it disappears and the
// global counter ticks up.
//
// Usage:
//
//     const secret = new Secret({
//         app,
//         cameraEntity: player.getCameraEntity(),
//         modelPath: "models/secret/coin.glb",
//         position: new Vec3(3, 1, -5),
//         scale: new Vec3(0.5, 0.5, 0.5)
//     });
//     await secret.spawn();
//
// That's it — listeners auto-clean when the scene unloads, and `getSecretsFound()`
// updates the moment the player clicks. Call `dispose()` if you want to remove
// a secret early without it being collected.
export class Secret {
    private readonly app: AppBase;
    private readonly cameraEntity: Entity;
    private readonly modelPath: string;
    private readonly position: Vec3;
    private readonly scale: Vec3 | undefined;
    private readonly rotation: Vec3 | undefined;
    private readonly hitboxRadius: number;
    private readonly maxClickRange: number;

    private model: Model | null = null;
    private collected = false;
    private onMouseDown: ((event: { x: number; y: number; button: number }) => void) | null = null;

    constructor(options: SecretOptions) {
        this.app = options.app;
        this.cameraEntity = options.cameraEntity;
        this.modelPath = options.modelPath;
        this.position = options.position.clone();
        this.scale = options.scale?.clone();
        this.rotation = options.rotation?.clone();
        this.hitboxRadius = options.hitboxRadius ?? 1.5;
        this.maxClickRange = options.maxClickRange ?? 12;
    }

    // Load the .glb model into the scene and start listening for clicks.
    // Defaults match loadModel.ts so undecorated models still appear at a
    // usable size and orientation.
    public async spawn(): Promise<void> {
        if (this.model) return;

        this.model = await loadModel(this.modelPath, this.app, {
            position: this.position,
            scale: this.scale,
            rotation: this.rotation,
            // We hit-test via ray-distance, so collision geometry is not needed.
            // Skip rigidbody/collision setup to save physics cost.
            autoCollision: false
        });

        this.attachClickListener();
    }

    public isCollected(): boolean {
        return this.collected;
    }

    // Manually tear down a secret without counting it (e.g. scene editor
    // removed it). Idempotent — safe to call more than once.
    public dispose(): void {
        this.detachClickListener();
        if (this.model?.modelEntity) {
            this.model.modelEntity.destroy();
        }
        this.model = null;
    }

    private attachClickListener(): void {
        this.onMouseDown = (event) => {
            if (this.collected) return;
            // Only respond to primary (left) clicks.
            if (event.button !== 0) return;
            if (this.isPointerHit(event.x, event.y)) {
                this.collect();
            }
        };
        this.app.mouse?.on('mousedown', this.onMouseDown);
    }

    private detachClickListener(): void {
        if (this.onMouseDown) {
            this.app.mouse?.off('mousedown', this.onMouseDown);
            this.onMouseDown = null;
        }
    }

    // Cast a ray from the camera through the clicked screen pixel. The secret
    // is "hit" if it sits within hitboxRadius of the ray AND the player is
    // within maxClickRange of the secret. No collision geometry required,
    // which mirrors how `Weapon.getClickedNpcInRange` falls back when physics
    // raycasts miss visible models.
    private isPointerHit(screenX: number, screenY: number): boolean {
        const camera = this.cameraEntity.camera;
        if (!camera) return false;

        const rayStart = camera.screenToWorld(screenX, screenY, camera.nearClip);
        const rayEnd = camera.screenToWorld(screenX, screenY, camera.farClip);
        const rayDir = rayEnd.clone().sub(rayStart);
        const rayLength = rayDir.length();
        if (rayLength <= 0.0001) return false;
        rayDir.mulScalar(1 / rayLength);

        const cameraPos = this.cameraEntity.getPosition();
        const toSecret = this.position.clone().sub(cameraPos);

        // Reject anything behind the camera or past the max click range.
        const projectedDistance = toSecret.dot(rayDir);
        if (projectedDistance < 0 || projectedDistance > this.maxClickRange) return false;

        // Closest point on the ray to the secret; if that's within hitboxRadius,
        // the click visually landed on it.
        const closestPointOnRay = cameraPos.clone().add(rayDir.clone().mulScalar(projectedDistance));
        const distanceFromRay = this.position.distance(closestPointOnRay);
        return distanceFromRay <= this.hitboxRadius;
    }

    private collect(): void {
        if (this.collected) return;
        this.collected = true;
        secretsFound++;
        console.log(
            `[Secret] collected at (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)}) — total: ${secretsFound}`
        );
        this.dispose();
    }
}

// ── spawnSecret ──
//
// One-call helper that creates a Secret, spawns it, and returns it. Use this
// when you just want a quick collectible without manually wiring the class.
export async function spawnSecret(options: SecretOptions): Promise<Secret> {
    const secret = new Secret(options);
    await secret.spawn();
    return secret;
}
