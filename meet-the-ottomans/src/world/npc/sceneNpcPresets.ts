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
    joanofarc: "models/npc/boss/JoanOfArc.glb",
    willieconquer: "models/npc/WillieConquer.glb",
    koreansldier: "models/npc/KoreanSoldier.glb",
    mamlukIthink: "models/npc/Mamluk.glb",
    modernishsoldier: "models/npc/VietnamSoldier.glb",
    genghisKhan: "models/npc/boss/genghis_khan.glb",
    kingGeser: "models/npc/boss/KingGeser.glb",
    christ: "models/npc/boss/Jesus10K.glb"
    ,georgeWashington: "models/npc/boss/GeorgeWashington.glb"
    ,americanRevolutionist: "models/npc/americanRevolutionist.glb"
 ,baybars: "models/npc/boss/Baybars.glb"
 ,caesar: "models/npc/boss/Caesar.glb"
 ,napoleon: "models/npc/boss/Napoleon.glb"
 ,uncleSam: "models/npc/boss/UncleSam.glb"
 ,vietnamDragonKing: "models/npc/boss/VietnamDragonKing.glb"
 ,cainAndAbel: "models/npc/boss/CainAndAbel.glb"
 ,kingGeorgeIII: "models/npc/boss/KingGeorgeIII.glb"
 ,lenin: "models/npc/boss/Lenin.glb"
 ,stalin: "models/npc/boss/Stalin.glb"
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

const GEORGE_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelPath: NPC_MODEL_PATHS.georgeWashington,
    modelRotation: new Vec3(0, 0, 0),
    modelScale: new Vec3(4, 4, 4),
    modelHeightOffset: 11,
    facingYawOffsetDegrees: 0,
    hitboxRadius: 2.4
};
const BAYBARS_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.baybars,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const CAESAR_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.caesar,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const NAPOLEON_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.napoleon,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const UNCLE_SAM_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.uncleSam,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.vietnamDragonKing,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.cainAndAbel,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const KING_GEORGE_III_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.kingGeorgeIII,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const LENIN_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.lenin,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
const STALIN_BOSS_SPAWN_OVERRIDES: NpcSpawnOverrides = {
  modelPath: NPC_MODEL_PATHS.stalin,
  modelRotation: new Vec3(0, 0, 0),
  modelScale: new Vec3(4, 4, 4),
  modelHeightOffset: 11,
  facingYawOffsetDegrees: 0,
  hitboxRadius: 2.4
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  vietnamDragonKing: VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  cainAndAbel: CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  kingGeorgeIII: KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  lenin: LENIN_BOSS_SPAWN_OVERRIDES,
  stalin: STALIN_BOSS_SPAWN_OVERRIDES,
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

export const DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
    ...GEORGE_BOSS_SPAWN_OVERRIDES,
    typeModelPaths: NPC_TYPE_MODEL_PATHS,
    typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...BAYBARS_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAESAR_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_NAPOLEON_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...NAPOLEON_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_UNCLE_SAM_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...UNCLE_SAM_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_VIETNAM_DRAGON_KING_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...VIETNAM_DRAGON_KING_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...CAIN_AND_ABEL_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_KING_GEORGE_III_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...KING_GEORGE_III_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_LENIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...LENIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
export const DEFAULT_STALIN_BOSS_SPAWN_OPTIONS: NpcSceneSpawnOptions = {
  ...STALIN_BOSS_SPAWN_OVERRIDES,
  typeModelPaths: NPC_TYPE_MODEL_PATHS,
  typeSpawnOverrides: NPC_TYPE_SPAWN_OVERRIDES
};
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const JOAN_OF_ARC_SPAWN_OVERRIDES: NpcSpawnOverrides = {
    modelRotation: new Vec3(0, 0, 0),
    facingYawOffsetDegrees: 0
};

const AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES: NpcSpawnOverrides = {
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
    joanofarc: NPC_MODEL_PATHS.joanofarc,
    willieconquer: NPC_MODEL_PATHS.willieconquer,
    koreansldier: NPC_MODEL_PATHS.koreansldier,
    mamlukIthink: NPC_MODEL_PATHS.mamlukIthink,
    modernishsoldier: NPC_MODEL_PATHS.modernishsoldier,
    genghisKhan: NPC_MODEL_PATHS.genghisKhan,
    kingGeser: NPC_MODEL_PATHS.kingGeser,
    christ: NPC_MODEL_PATHS.christ,
    williamTheConquerer: NPC_MODEL_PATHS.willieconquer
    ,georgeWashington: NPC_MODEL_PATHS.georgeWashington
    ,americanRevolutionist: NPC_MODEL_PATHS.americanRevolutionist
 ,baybars: NPC_MODEL_PATHS.baybars
 ,caesar: NPC_MODEL_PATHS.caesar
 ,napoleon: NPC_MODEL_PATHS.napoleon
 ,uncleSam: NPC_MODEL_PATHS.uncleSam
 ,vietnamDragonKing: NPC_MODEL_PATHS.vietnamDragonKing
 ,cainAndAbel: NPC_MODEL_PATHS.cainAndAbel
 ,kingGeorgeIII: NPC_MODEL_PATHS.kingGeorgeIII
 ,lenin: NPC_MODEL_PATHS.lenin
 ,stalin: NPC_MODEL_PATHS.stalin

export const NPC_TYPE_SPAWN_OVERRIDES: Record<string, NpcSpawnOverrides> = {
    templar: TEMPLAR_SPAWN_OVERRIDES,
    french: FRENCH_SPAWN_OVERRIDES,
    joanofarc: JOAN_OF_ARC_SPAWN_OVERRIDES,
  americanRevolutionist: AMERICAN_REVOLUTIONIST_SPAWN_OVERRIDES,
  baybars: BAYBARS_BOSS_SPAWN_OVERRIDES,
  caesar: CAESAR_BOSS_SPAWN_OVERRIDES,
  napoleon: NAPOLEON_BOSS_SPAWN_OVERRIDES,
  uncleSam: UNCLE_S