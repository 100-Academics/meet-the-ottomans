import { AppBase, Entity, Vec3 } from "playcanvas";
import { loadModel } from "../../util/loadModel";
import { npc } from "./npc";
import { Mongol } from "./troops/mongol";

export type NpcSceneTeam = "friend" | "foe";

interface RigidbodyRaycastHit {
    entity?: Entity | null;
    point?: Vec3;
    hitFraction?: number;
}

interface RigidbodyRaycastSystem {
    raycastAll?: (start: Vec3, end: Vec3) => RigidbodyRaycastHit[] | undefined;
    raycastFirst?: (start: Vec3, end: Vec3) => RigidbodyRaycastHit | null;
}

export interface NpcSpawnPoint {
    id: number;
    team: NpcSceneTeam;
    x: number;
    z: number;
    maxHealth?: number;
    type?: string; // Optional type field for different NPC classes (e.g., "mongol")
}

export interface NpcSceneSpawnOptions {
    modelPath?: string;
    modelRotation?: Vec3;
    modelScale?: Vec3;
    modelHeightOffset?: number;
    facingYawOffsetDegrees?: number;
    hitboxRadius?: number;
}

export interface NpcCombatLoopOptions {
    updateKey?: string;
    onNpcAttack?: (attacker: npc, target: npc, damage: number) => void;
    onPlayerAttack?: (attacker: npc, damage: number) => void;
    rigidbodySystem?: RigidbodyRaycastSystem;
    groundCollisionEnabled?: boolean;
    groundTag?: string;
    groundProbeHeight?: number;
    groundProbeDepth?: number;
    defaultGroundClearance?: number;
}

function hasTagInHierarchy(entity: Entity | null, tag: string): boolean {
    let current: Entity | null = entity;
    while (current) {
        if (current.tags?.has(tag)) {
            return true;
        }
        current = (current.parent as Entity | null) ?? null;
    }
    return false;
}

function getGroundYAt(
    rigidbodySystem: RigidbodyRaycastSystem | undefined,
    x: number,
    z: number,
    groundTag: string,
    probeHeight: number,
    probeDepth: number
): number | undefined {
    if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== "function") {
        return undefined;
    }

    const rayStart = new Vec3(x, probeHeight, z);
    const rayEnd = new Vec3(x, -probeDepth, z);

    if (typeof rigidbodySystem.raycastAll === "function") {
        const hits = rigidbodySystem.raycastAll(rayStart, rayEnd);
        if (hits && hits.length > 0) {
            let bestFraction = Number.POSITIVE_INFINITY;
            let bestY: number | undefined;

            for (const hit of hits) {
                if (!hit?.point || !Number.isFinite(hit.point.y)) {
                    continue;
                }

                if (!hasTagInHierarchy(hit.entity ?? null, groundTag)) {
                    continue;
                }

                const hitFraction = hit.hitFraction;
                if (typeof hitFraction === "number" && Number.isFinite(hitFraction) && hitFraction < bestFraction) {
                    bestFraction = hitFraction;
                    bestY = hit.point.y;
                }
            }

            if (bestY !== undefined) {
                return bestY;
            }
        }
    }

    const firstHit = rigidbodySystem.raycastFirst(rayStart, rayEnd);
    if (!firstHit?.point || !Number.isFinite(firstHit.point.y)) {
        return undefined;
    }

    if (!hasTagInHierarchy(firstHit.entity ?? null, groundTag)) {
        return undefined;
    }

    return firstHit.point.y;
}

function getSpawnY(
    rigidbodySystem: RigidbodyRaycastSystem | undefined,
    x: number,
    z: number,
    groundTag: string,
    probeHeight: number,
    probeDepth: number,
    defaultGroundClearance: number
): number {
    const groundY = getGroundYAt(rigidbodySystem, x, z, groundTag, probeHeight, probeDepth);
    if (groundY === undefined) {
        return 0;
    }

    return groundY + defaultGroundClearance;
}

export async function spawnSceneNpcs(
    app: AppBase,
    rigidbodySystem: RigidbodyRaycastSystem | undefined,
    spawnPoints: NpcSpawnPoint[],
    options: NpcSceneSpawnOptions = {}
): Promise<npc[]> {
    const modelPath = options.modelPath ?? "test/armored_king.glb";
    const modelRotation = options.modelRotation ?? new Vec3(-90, 0, 0);
    const modelScale = options.modelScale ?? new Vec3(2, 2, 2);
    const modelHeightOffset = options.modelHeightOffset ?? 2;
    const facingYawOffsetDegrees = options.facingYawOffsetDegrees ?? 180;
    const hitboxRadius = options.hitboxRadius ?? 1.2;
    const groundTag = "ground";
    const groundProbeHeight = 300;
    const groundProbeDepth = 300;
    const defaultGroundClearance = 0.1;

    const npcs: npc[] = [];

    for (const spawn of spawnPoints) {
        const npcSpawnY = getSpawnY(
            rigidbodySystem,
            spawn.x,
            spawn.z,
            groundTag,
            groundProbeHeight,
            groundProbeDepth,
            defaultGroundClearance
        );

        const npcModel = await loadModel(modelPath, app, {
            rigidbodyType: "kinematic",
            includeDescendants: true,
            position: new Vec3(spawn.x, npcSpawnY + modelHeightOffset, spawn.z),
            rotation: modelRotation,
            scale: modelScale
        });
        if (spawn.type === "mongol") {
            console.log(`Spawning Mongol NPC with ID ${spawn.id} at (${spawn.x}, ${spawn.z})`);
            const mongol = new Mongol(spawn.id, npcModel.modelEntity);
            mongol.setFacingYawOffsetDegrees(facingYawOffsetDegrees);
            mongol.setHitboxRadius(hitboxRadius);
            npcs.push(mongol);
        } else {
            const spawnedNpc = new npc(spawn.id, spawn.team, spawn.maxHealth ?? 100, npcModel.modelEntity);
            spawnedNpc.setFacingYawOffsetDegrees(facingYawOffsetDegrees);
            spawnedNpc.setHitboxRadius(hitboxRadius);
            npcs.push(spawnedNpc);
        }
    }

    return npcs;
}

export function bindNpcCombatLoop(
    app: AppBase,
    npcs: npc[],
    getPlayerEntity: () => Entity,
    options: NpcCombatLoopOptions = {}
): () => void {
    const updateKey = options.updateKey ?? "__sceneNpcUpdate";
    const keyedApp = app as AppBase & Record<string, unknown>;

    const existingHandler = keyedApp[updateKey];
    if (typeof existingHandler === "function") {
        app.off("update", existingHandler as (deltaTime: number) => void);
    }

    const rigidbodySystem = options.rigidbodySystem ?? (app.systems as { rigidbody?: RigidbodyRaycastSystem }).rigidbody;
    const groundCollisionEnabled = options.groundCollisionEnabled ?? true;
    const groundTag = options.groundTag ?? "ground";
    const groundProbeHeight = options.groundProbeHeight ?? 300;
    const groundProbeDepth = options.groundProbeDepth ?? 300;
    const defaultGroundClearance = options.defaultGroundClearance ?? 0.1;
    const npcGroundOffsets = new Map<npc, number>();

    if (groundCollisionEnabled && rigidbodySystem) {
        for (const currentNpc of npcs) {
            const position = currentNpc.getEntity().getPosition();
            const groundY = getGroundYAt(rigidbodySystem, position.x, position.z, groundTag, groundProbeHeight, groundProbeDepth);
            if (groundY === undefined) {
                npcGroundOffsets.set(currentNpc, defaultGroundClearance);
                continue;
            }

            npcGroundOffsets.set(currentNpc, Math.max(defaultGroundClearance, position.y - groundY));
        }
    }

    const updateHandler = (deltaTime: number) => {
        const nowSeconds = Date.now() / 1000;
        const playerEntity = getPlayerEntity();

        for (const currentNpc of npcs) {
            currentNpc.updateCombatAI(
                deltaTime,
                nowSeconds,
                npcs,
                options.onNpcAttack,
                playerEntity,
                options.onPlayerAttack
            );
        }

        npc.resolveHitboxCollisions(npcs);

        if (groundCollisionEnabled && rigidbodySystem) {
            for (const currentNpc of npcs) {
                if (!currentNpc.isAlive()) {
                    continue;
                }

                const position = currentNpc.getEntity().getPosition();
                const groundY = getGroundYAt(rigidbodySystem, position.x, position.z, groundTag, groundProbeHeight, groundProbeDepth);
                if (groundY === undefined) {
                    continue;
                }

                const groundOffset = npcGroundOffsets.get(currentNpc) ?? defaultGroundClearance;
                currentNpc.getEntity().setPosition(position.x, groundY + groundOffset, position.z);
            }
        }
    };

    keyedApp[updateKey] = updateHandler;
    app.on("update", updateHandler);

    return () => {
        app.off("update", updateHandler);
        if (keyedApp[updateKey] === updateHandler) {
            delete keyedApp[updateKey];
        }
    };
}
