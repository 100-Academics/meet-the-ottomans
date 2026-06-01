import { Vec3 } from "playcanvas";
import type { NpcSceneSpawnOptions, NpcSpawnOverrides, NpcSpawnPoint } from "./sceneNpcSystem";

// Central list of model asset paths used by NPC types.
// How to add a new model:
// 1) Put the .glb under src/assets (the loader resolves relative to that).
// 2) Add the path here.
// 3) Map your NPC type to it in NPC_TYPE_MODEL_PATHS below.
const NPC_MODEL_PATHS = {
    mongolTroop: "test/armored_king.glb",
    templarTroop: "models/npc/Crusader.glb",
    frenchSoldierOld: "models/npc/FrenchSoldierWWI.glb",
    huntingrifledude: "models/npc/WWISoldier.glb",
    americanRevolutionist: "models/npc/americanRevolutionist.glb",
    germanLookingSoldier: "models/npc/GermanLookingSoldier.glb",
    horseWomen: "models/npc/horseWomen.glb",
    joanofarc: "models/npc/boss/JoanOfArc.glb",
    willieconquer: "models/npc/WillieConquer.glb",
    koreansldier: "models/npc/KoreanSoldier.glb",
    mamlukIthink: "models/npc/Mamluk.glb",
    modernishsoldier: "models/npc/VietnamSoldier.glb",
    genghisKhan: "models/npc/boss/genghis_khan.glb",
    kingGeser: "models/npc/boss/KingGeser.glb",
    christ: "models/npc/boss/Jesus10K.glb",
    anotherOldDude: "models/npc/boss/AnotherOldDude.glb",
    caeser: "models/npc/boss/caeser.glb",
    abel: "models/npc/boss/Abel.glb",
    probablyASultan: "models/npc/boss/probablyASultan.glb",
    sickMamlukBoss: "models/npc/boss/SickMamlukBoss.glb"
} as const;

// Boss-specific defaults. These override size/rotation/offset for each boss model.
const KHAN_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelPath: NPC_MODEL_PATHS.genghisKhan,
    modelRotation: new Vec3(-90, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

const KING_GESER_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelPath: NPC_MODEL_PATHS.kingGeser,
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

const CHRIST_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelPath: NPC_MODEL_PATHS.christ,
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

const WILLIAM_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelPath: NPC_MODEL_PATHS.willieconquer,
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};

// Non-boss per-type overrides (used in typeSpawnOverrides below).
const TEMPLAR_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const FRENCH_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

// NPC type -> model path. The spawn system picks the model from this map
// based on the `type` field in each spawn point.
export const NPC_TYPE_MODEL_PATHS: Record<string, string> = {
    mongol: NPC_MODEL_PATHS.mongolTroop,
    templar: NPC_MODEL_PATHS.templarTroop,
    french: NPC_MODEL_PATHS.frenchSoldierOld,
    huntingrifledude: NPC_MODEL_PATHS.huntingrifledude,
    americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist,
    germanLookingSoldier: NPC_MODEL_PATHS.germanLookingSoldier,
    horseWomen: NPC_MODEL_PATHS.horseWomen,
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer,
    anotherOldDude: NPC_MODEL_PATHS.anotherOldDude,
    caeser: NPC_MODEL_PATHS.caeser,
    abel: NPC_MODEL_PATHS.abel,
    probablyASultan: NPC_MODEL_PATHS.probablyASultan,
    sickMamlukBoss: NPC_MODEL_PATHS.sickMamlukBoss
};

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES
};

// Shared battle options applied in scenes. Intentionally no generic troop defaults.
// How to customize per type: add type-specific overrides in scene code or extend
// the spawn system to accept a type->overrides map.
export const DEFAULT_BATTLE_NPC_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};

// Boss spawn options used by scenes that include the named boss.
export const DEFAULT_KHAN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...KHAN_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};

export const DEFAULT_KING_GESER_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...KING_GESER_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};

export const DEFAULT_CHRIST_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...CHRIST_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};

export const DEFAULT_WILLIAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...WILLIAM_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};

// Spawn points for each scene. Set `type` to pick a model and NPC class.
// How to add a new spawn: add a new entry with id/team/x/z/type.
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

// Boss spawn point for Legnica.
export const LEGNICA_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// Boss spawn point for Ain Jalut.
export const AIN_JALUT_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "kingGeser" }];

// Constantinople battle NPC spawns (Templars).
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

// Orléans battle NPC spawns (French soldiers).
export const ORLEANS_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: -6, type: "french" },
    { id: 2, team: "foe", x: 9, z: -6, type: "french" },
    { id: 3, team: "foe", x: 12, z: -6, type: "french" },
    { id: 4, team: "foe", x: 15, z: -6, type: "french" },
    { id: 5, team: "foe", x: 18, z: -6, type: "french" }
];

// Ain Jalut battle NPC spawns (Mongols).
export const AIN_JALUT_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 2, team: "friend", x: -8, z: 2 },
    { id: 3, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 4, team: "friend", x: -10, z: -2 },
    { id: 5, team: "foe", x: 0, z: 0, type: "mongol" },
    // { id: 6, team: "friend", x: -6, z: -4 }
];

// Boss spawn point for Constantinople.
export const CONSTANTINOPLE_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 12, z: 0, maxHealth: 500, type: "christ" }];

// ── Chosin Reservoir ──
export const CHOSIN_RESERVOIR_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const CHOSIN_RESERVOIR_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Gallipoli ──
export const GALLIPOLI_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const GALLIPOLI_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Gettysburg ──
export const GETTYSBURG_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const GETTYSBURG_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Kyiv ──
export const KYIV_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const KYIV_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Stalingrad ──
export const STALINGRAD_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const STALINGRAD_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Three Emperors ──
export const THREE_EMPERORS_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const THREE_EMPERORS_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Verdun ──
export const VERDUN_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const VERDUN_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Yorktown ──
export const YORKTOWN_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const YORKTOWN_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Saigon ──
export const SAIGON_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const SAIGON_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Abirey Halev ──
export const ABIREY_HALEV_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
    { id: 2, team: "foe", x: 10, z: -2, type: "americanRevolutionist" },
    { id: 3, team: "foe", x: 8, z: 6, type: "germanLookingSoldier" },
    { id: 4, team: "foe", x: -6, z: 4, type: "horseWomen" },
    { id: 5, team: "foe", x: -8, z: -3, type: "anotherOldDude" },
    { id: 6, team: "foe", x: 2, z: -8, type: "caeser" },
    { id: 7, team: "foe", x: -2, z: 9, type: "abel" },
    { id: 8, team: "foe", x: 12, z: 4, type: "probablyASultan" },
    { id: 9, team: "foe", x: -12, z: 0, type: "sickMamlukBoss" }
];
export const ABIREY_HALEV_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Anaconda ──
export const ANACONDA_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const ANACONDA_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Arnon ──
export const ARNON_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 6, z: 1, type: "mongol" },
];
export const ARNON_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "genghisKhan" }];

// ── Agincourt ──
export const AGINCOURT_NPC_SPAWN_POINTS: NpcSpawnPoint[] = [
    { id: 1, team: "foe", x: 8, z: 3, type: "french" },
    // { id: 2, team: "foe", x: -6, z: 5, type: "french" },
    // { id: 3, team: "foe", x: 4, z: -7, type: "french" },
    // { id: 4, team: "foe", x: -3, z: -4, type: "french" },
    // { id: 5, team: "foe", x: 10, z: -2, type: "french" },
    // { id: 6, team: "foe", x: -9, z: 1, type: "french" },
    // { id: 7, team: "foe", x: 2, z: 9, type: "french" },
    // { id: 8, team: "foe", x: -5, z: -9, type: "french" },
    // { id: 9, team: "foe", x: 7, z: 7, type: "french" },
    // { id: 10, team: "foe", x: -8, z: -6, type: "french" },
    // { id: 11, team: "foe", x: 12, z: 4, type: "french" },
    // { id: 12, team: "foe", x: -11, z: -3, type: "french" },
    // { id: 13, team: "foe", x: 5, z: -12, type: "french" },
    // { id: 14, team: "foe", x: -4, z: 11, type: "french" },
    // { id: 15, team: "foe", x: 14, z: -1, type: "french" },
    // { id: 16, team: "foe", x: -13, z: 8, type: "french" },
    // { id: 17, team: "foe", x: 1, z: -14, type: "french" },
    // { id: 18, team: "foe", x: -7, z: 13, type: "french" },
    // { id: 19, team: "foe", x: 9, z: -10, type: "french" },
    // { id: 20, team: "foe", x: -10, z: 6, type: "french" },
];

export const AGINCOURT_BOSS_SPAWN_POINT: NpcSpawnPoint[] = [{ id: 99, team: "foe", x: 0, z: 0, maxHealth: 500, type: "williamTheConquerer" }];
