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

export const DEFAULT_KING_GESER_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    modelPath: "models/npc/boss/KingGeser.glb",
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

export const DEFAULT_CHRIST_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    modelPath: "models/npc/boss/Jesus10K.glb",
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

export const LEGNICA_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
    // { id: 2, team: "foe", x: 4, z: -2, type: "mongol" },
    // { id: 3, team: "foe", x: 9, z: 2, type: "mongol" },
    // { id: 4, team: "foe", x: 5, z: 4, type: "mongol" },
    // { id: 5, team: "foe", x: 11, z: -1, type: "mongol" },
    // { id: 6, team: "foe", x: 3, z: 0, type: "mongol" },
    // { id: 7, team: "foe", x: 8, z: -3, type: "mongol" },
    // { id: 8, team: "foe", x: 13, z: 3, type: "mongol" },
    // { id: 9, team: "foe", x: 7, z: 5, type: "mongol" },
    // { id: 10, team: "foe", x: 14, z: -4, type: "mongol" },
    // { id: 11, team: "foe", x: 10, z: 1, type: "mongol" },
    // { id: 12, team: "foe", x: 16, z: -2, type: "mongol" },
    // { id: 13, team: "foe", x: 12, z: 4, type: "mongol" },
    // { id: 14, team: "foe", x: 18, z: 0, type: "mongol" },
    // { id: 15, team: "foe", x: 15, z: -3, type: "mongol" },
    // { id: 16, team: "foe", x: 20, z: 2, type: "mongol" },
    // { id: 17, team: "foe", x: 17, z: 5, type: "mongol" },
    // { id: 18, team: "foe", x: 22, z: -1, type: "mongol" },
    // { id: 19, team: "foe", x: 19, z: 3, type: "mongol" },
    // { id: 20, team: "foe", x: 24, z: -4, type: "mongol" }
];

export const LEGNICA_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

export const AIN_JALUT_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "kingGeser" }];

export const CONSTANTINOPLE_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: -12, type: "templar" },
    // { id: 2, team: "foe", x: 9, z: -12, type: "templar" },
    // { id: 3, team: "foe", x: 12, z: -12, type: "templar" },
    // { id: 4, team: "foe", x: 15, z: -12, type: "templar" },
    // { id: 5, team: "foe", x: 18, z: -12, type: "templar" },
    // { id: 6, team: "foe", x: 6, z: -9, type: "templar" },
    // { id: 7, team: "foe", x: 9, z: -9, type: "templar" },
    // { id: 8, team: "foe", x: 12, z: -9, type: "templar" },
    // { id: 9, team: "foe", x: 15, z: -9, type: "templar" },
    // { id: 10, team: "foe", x: 18, z: -9, type: "templar" },
    // { id: 11, team: "foe", x: 6, z: -6, type: "templar" },
    // { id: 12, team: "foe", x: 9, z: -6, type: "templar" },
    // { id: 13, team: "foe", x: 12, z: -6, type: "templar" },
    // { id: 14, team: "foe", x: 15, z: -6, type: "templar" },
    // { id: 15, team: "foe", x: 18, z: -6, type: "templar" },
    // { id: 16, team: "foe", x: 6, z: -3, type: "templar" },
    // { id: 17, team: "foe", x: 9, z: -3, type: "templar" },
    // { id: 18, team: "foe", x: 12, z: -3, type: "templar" },
    // { id: 19, team: "foe", x: 15, z: -3, type: "templar" },
    // { id: 20, team: "foe", x: 18, z: -3, type: "templar" },
    // { id: 21, team: "foe", x: 6, z: 0, type: "templar" },
    // { id: 22, team: "foe", x: 9, z: 0, type: "templar" },
    // { id: 23, team: "foe", x: 12, z: 0, type: "templar" },
    // { id: 24, team: "foe", x: 15, z: 0, type: "templar" },
    // { id: 25, team: "foe", x: 18, z: 0, type: "templar" },
    // { id: 26, team: "foe", x: 6, z: 3, type: "templar" },
    // { id: 27, team: "foe", x: 9, z: 3, type: "templar" },
    // { id: 28, team: "foe", x: 12, z: 3, type: "templar" },
    // { id: 29, team: "foe", x: 15, z: 3, type: "templar" },
    // { id: 30, team: "foe", x: 18, z: 3, type: "templar" },
    // { id: 31, team: "foe", x: 6, z: 6, type: "templar" },
    // { id: 32, team: "foe", x: 9, z: 6, type: "templar" },
    // { id: 33, team: "foe", x: 12, z: 6, type: "templar" },
    // { id: 34, team: "foe", x: 15, z: 6, type: "templar" },
    // { id: 35, team: "foe", x: 18, z: 6, type: "templar" },
    // { id: 36, team: "foe", x: 6, z: 9, type: "templar" },
    // { id: 37, team: "foe", x: 9, z: 9, type: "templar" },
    // { id: 38, team: "foe", x: 12, z: 9, type: "templar" },
    // { id: 39, team: "foe", x: 15, z: 9, type: "templar" },
    // { id: 40, team: "foe", x: 18, z: 9, type: "templar" },
    // { id: 41, team: "foe", x: 6, z: 12, type: "templar" },
    // { id: 42, team: "foe", x: 9, z: 12, type: "templar" },
    // { id: 43, team: "foe", x: 12, z: 12, type: "templar" },
    // { id: 44, team: "foe", x: 15, z: 12, type: "templar" },
    // { id: 45, team: "foe", x: 18, z: 12, type: "templar" },
    // { id: 46, team: "foe", x: 6, z: 15, type: "templar" },
    // { id: 47, team: "foe", x: 9, z: 15, type: "templar" },
    // { id: 48, team: "foe", x: 12, z: 15, type: "templar" },
    // { id: 49, team: "foe", x: 15, z: 15, type: "templar" },
    // { id: 50, team: "foe", x: 18, z: 15, type: "templar" }
];

export const AIN_JALUT_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 2, team: "friend", x: -8, z: 2 },
    { id: 3, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 4, team: "friend", x: -10, z: -2 },
    { id: 5, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 6, team: "friend", x: -6, z: -4 }
];

export const CONSTANTINOPLE_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 12, z: 0, maxHealth: 500, type: "christ" }];
