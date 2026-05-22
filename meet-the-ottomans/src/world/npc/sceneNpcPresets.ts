import { Vec3 } from "playcanvas";
import type { NpcSceneSpawnOptions, NpcSpawnPoint } from "./sceneNpcSystem";

export const DEFAULT_BATTLE_NPC_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    modelPath: "test/armored_king.glb",
    modelRotation: new Vec3(-90, 0, 0),
    modelScale: new Vec3(2, 2, 2),
    modelHeightOffset: 2,
    facingYawOffsetDegrees: 180,
    hitboxRadius: 1.2
};

export const DEFAULT_KHAN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    modelPath: "models/npc/boss/genghis_khan.glb",
    modelRotation: new Vec3(-90, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

export const LEGNICA_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
    { id: 2, team: "foe", x: 4, z: -2, type: "mongol" },
    { id: 3, team: "foe", x: 9, z: 2, type: "mongol" },
    { id: 4, team: "foe", x: 5, z: 4, type: "mongol" },
    { id: 5, team: "foe", x: 11, z: -1, type: "mongol" },
    { id: 6, team: "foe", x: 3, z: 0, type: "mongol" },
    { id: 7, team: "foe", x: 8, z: -3, type: "mongol" },
    { id: 8, team: "foe", x: 13, z: 3, type: "mongol" },
    { id: 9, team: "foe", x: 7, z: 5, type: "mongol" },
    { id: 10, team: "foe", x: 14, z: -4, type: "mongol" },
    { id: 11, team: "foe", x: 10, z: 1, type: "mongol" },
    { id: 12, team: "foe", x: 16, z: -2, type: "mongol" },
    { id: 13, team: "foe", x: 12, z: 4, type: "mongol" },
    { id: 14, team: "foe", x: 18, z: 0, type: "mongol" },
    { id: 15, team: "foe", x: 15, z: -3, type: "mongol" },
    { id: 16, team: "foe", x: 20, z: 2, type: "mongol" },
    { id: 17, team: "foe", x: 17, z: 5, type: "mongol" },
    { id: 18, team: "foe", x: 22, z: -1, type: "mongol" },
    { id: 19, team: "foe", x: 19, z: 3, type: "mongol" },
    { id: 20, team: "foe", x: 24, z: -4, type: "mongol" }
];

export const LEGNICA_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

export const CONSTANTINOPLE_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 0 },
    // { id: 2, team: "friend", x: -5, z: 0 },
    { id: 3, team: "foe", x: 5, z: 0 },
    // { id: 4, team: "friend", x: -7, z: 0 },
    { id: 5, team: "foe", x: 7, z: 0 },
    // { id: 6, team: "friend", x: -4, z: 0 },
    { id: 7, team: "foe", x: 4, z: 0 },
    // { id: 8, team: "friend", x: -6, z: 0 },
    { id: 9, team: "foe", x: 8, z: 0 },
    // { id: 10, team: "friend", x: -8, z: 0 },
    { id: 11, team: "foe", x: 9, z: 0 },
    // { id: 12, team: "friend", x: -9, z: 0 }
];

export const AIN_JALUT_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 0, z: 0 },
    // { id: 2, team: "friend", x: -8, z: 2 },
    { id: 3, team: "foe", x: 0, z: 0 },
    // { id: 4, team: "friend", x: -10, z: -2 },
    { id: 5, team: "foe", x: 0, z: 0 },
    // { id: 6, team: "friend", x: -6, z: -4 }
];
