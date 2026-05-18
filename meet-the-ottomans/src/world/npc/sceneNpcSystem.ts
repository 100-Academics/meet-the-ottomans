import { AppBase, Entity, Vec3 } from "playcanvas";
import { loadModel } from "../../util/loadModel";
import { npc } from "./npc";

export type NpcSceneTeam = "friend" | "foe";

export interface NpcSpawnPoint {
    id: number;
    team: NpcSceneTeam;
    x: number;
    z: number;
    maxHealth?: number;
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
}

function getSpawnY(
    rigidbodySystem: { raycastFirst?: (start: Vec3, end: Vec3) => { point?: Vec3 } | null } | undefined,
    x: number,
    z: number
): number {
    if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== "function") {
        return 0;
    }

    const rayStart = new Vec3(x, 300, z);
    const rayEnd = new Vec3(x, -300, z);
    const hit = rigidbodySystem.raycastFirst(rayStart, rayEnd);
    if (hit?.point) {
        return hit.point.y + 0.1;
    }
    return 0;
}

export async function spawnSceneNpcs(
    app: AppBase,
    rigidbodySystem: { raycastFirst?: (start: Vec3, end: Vec3) => { point?: Vec3 } | null } | undefined,
    spawnPoints: NpcSpawnPoint[],
    options: NpcSceneSpawnOptions = {}
): Promise<npc[]> {
    const modelPath = options.modelPath ?? "test/armored_king.glb";
    const modelRotation = options.modelRotation ?? new Vec3(-90, 0, 0);
    const modelScale = options.modelScale ?? new Vec3(2, 2, 2);
    const modelHeightOffset = options.modelHeightOffset ?? 2;
    const facingYawOffsetDegrees = options.facingYawOffsetDegrees ?? 180;
    const hitboxRadius = options.hitboxRadius ?? 1.2;

    const npcs: npc[] = [];

    for (const spawn of spawnPoints) {
        const npcSpawnY = getSpawnY(rigidbodySystem, spawn.x, spawn.z);

        const npcModel = await loadModel(modelPath, app, {
            rigidbodyType: "kinematic",
            includeDescendants: true,
            position: new Vec3(spawn.x, npcSpawnY + modelHeightOffset, spawn.z),
            rotation: modelRotation,
            scale: modelScale
        });

        const spawnedNpc = new npc(spawn.id, spawn.team, spawn.maxHealth ?? 100, npcModel.modelEntity);
        spawnedNpc.setFacingYawOffsetDegrees(facingYawOffsetDegrees);
        spawnedNpc.setHitboxRadius(hitboxRadius);
        npcs.push(spawnedNpc);
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
