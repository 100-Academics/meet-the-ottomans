import { AppBase, Entity, Vec3 } from "playcanvas";
import { loadModel, type LoadModelOptions, type Model } from "../../util/loadModel";
import { npc } from "./npc";
import { Mongol } from "./troops/mongol";
import { GenghisKhan } from "./bosses/genghisKhan";
import { isDeathScreenVisible } from "../scenes/deathScreen";

export type NpcSceneTeam = "friend" | "foe";

const DEFAULT_FALLBACK_NPC_MODEL = "test/armored_king.glb";

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

function getEntityMinY(entity: Entity): number | undefined {
    if (typeof (entity as { syncHierarchy?: () => void }).syncHierarchy === "function") {
        (entity as { syncHierarchy: () => void }).syncHierarchy();
    }

    let minY = Number.POSITIVE_INFINITY;
    let found = false;

    const visit = (node: Entity) => {
        const meshInstances = node.render?.meshInstances ?? (node as { model?: { meshInstances?: any[] } }).model?.meshInstances;
        if (meshInstances && meshInstances.length > 0) {
            for (const meshInstance of meshInstances) {
                const aabb = meshInstance.aabb;
                if (!aabb) {
                    continue;
                }

                const min = aabb.getMin();
                if (!Number.isFinite(min.y)) {
                    continue;
                }

                minY = Math.min(minY, min.y);
                found = true;
            }
        }

        for (const child of node.children) {
            visit(child as Entity);
        }
    };

    visit(entity);

    if (!found) {
        return undefined;
    }

    return minY;
}

async function loadNpcModelWithFallback(
    app: AppBase,
    primaryPath: string,
    options: LoadModelOptions
): Promise<Model> {
    try {
        return await loadModel(primaryPath, app, options);
    } catch (error) {
        console.warn(`[NPC] Failed to load model "${primaryPath}". Falling back to "${DEFAULT_FALLBACK_NPC_MODEL}".`, error);
    }

    if (primaryPath !== DEFAULT_FALLBACK_NPC_MODEL) {
        try {
            return await loadModel(DEFAULT_FALLBACK_NPC_MODEL, app, options);
        } catch (fallbackError) {
            console.error(`[NPC] Fallback model "${DEFAULT_FALLBACK_NPC_MODEL}" failed to load.`, fallbackError);
            throw fallbackError;
        }
    }

    throw new Error(`Failed to load NPC model: ${primaryPath}`);
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
        
        const npcModel = await loadNpcModelWithFallback(app, modelPath, {
            rigidbodyType: "kinematic",
            includeDescendants: true,
            position: new Vec3(spawn.x, npcSpawnY + modelHeightOffset, spawn.z),
            rotation: modelRotation,
            scale: modelScale
        });
        const modelMinY = getEntityMinY(npcModel.modelEntity);
        if (modelMinY !== undefined) {
            const targetMinY = npcSpawnY + defaultGroundClearance;
            const deltaY = targetMinY - modelMinY;
            if (Math.abs(deltaY) > 0.001) {
                const currentPos = npcModel.modelEntity.getPosition();
                npcModel.modelEntity.setPosition(currentPos.x, currentPos.y + deltaY, currentPos.z);
            }
        }
        if (spawn.type === "mongol") {
            console.log(`Spawning Mongol NPC with ID ${spawn.id} at (${spawn.x}, ${spawn.z})`);
            const mongol = new Mongol(spawn.id, npcModel.modelEntity);
            mongol.setFacingYawOffsetDegrees(facingYawOffsetDegrees);
            mongol.setHitboxRadius(hitboxRadius);
            npcs.push(mongol);
        }else if (spawn.type === "genghisKhan") {
            console.log(`Spawning Genghis Khan Boss NPC with ID ${spawn.id} at (${spawn.x}, ${spawn.z})`);
            const boss = new GenghisKhan(spawn.id, spawn.maxHealth ?? 500, npcModel.modelEntity);
            boss.setFacingYawOffsetDegrees(facingYawOffsetDegrees);
            boss.setHitboxRadius(hitboxRadius);
            boss.drawHealthBar();
            npcs.push(boss);
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
        if (isDeathScreenVisible()) {
            return;
        }

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

        if (Mongol.hasRetreatedOnce && !Mongol.hordeSpawned && Mongol.retreatPoint) {
            Mongol.hordeSpawned = true;
            const newPoints: NpcSpawnPoint[] = [];
            for (let i = 0; i < 6; i++) {
                newPoints.push({
                    id: 200 + i + Math.floor(Math.random() * 1000),
                    team: "foe",
                    x: Mongol.retreatPoint.x + (Math.random() * 12 - 6),
                    z: Mongol.retreatPoint.z + (Math.random() * 12 - 6),
                    type: "mongol",
                    maxHealth: 250 // Stronger horde
                });
            }
            console.log("Spawning stronger Mongol horde for false retreat!");
            spawnSceneNpcs(app, rigidbodySystem, newPoints).then(newNpcs => {
                for (const newNpc of newNpcs) {
                    if (groundCollisionEnabled && rigidbodySystem) {
                        const position = newNpc.getEntity().getPosition();
                        const groundY = getGroundYAt(rigidbodySystem, position.x, position.z, groundTag, groundProbeHeight, groundProbeDepth);
                        npcGroundOffsets.set(newNpc, groundY !== undefined ? Math.max(defaultGroundClearance, position.y - groundY) : defaultGroundClearance);
                    }
                    npcs.push(newNpc);
                }
            }).catch(err => {
                console.error("Failed to spawn Mongol horde:", err);
            });
        }

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

                if (!npcGroundOffsets.has(currentNpc)) {
                    npcGroundOffsets.set(
                        currentNpc,
                        Math.max(defaultGroundClearance, position.y - groundY)
                    );
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
