import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Keyboard,
} from "playcanvas";

import { createBattleHUD, removeBattleHUD, updateBattleHUD } from "../../util/battleHUD";
import { isDeathScreenVisible } from "./deathScreen";
import {
  ensureBattleApp,
  enterBattleScene,
  loadBattleEnvAtlas,
  loadBattleGround,
  addStarField,
  attachCollisionContactLogger,
  getRigidbodySystem,
  wireBattleInput,
  createBossSpawnState,
  spawnSceneBoss,
} from "../../util/battleSceneSetup";
import { bindVictoryCheck } from "../../util/victoryCheck";

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from "playcanvas/scripts/esm/grid.mjs";
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { spawnSceneNpcs } from "../npc/sceneNpcSystem";

import {
  DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
  DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS,
  YORKTOWN_BOSS_SPAWN_POINT,
  YORKTOWN_NPC_SPAWN_POINTS,
} from "../npc/sceneNpcPresets";

import { triggerVictory } from "../../App";

const groundModelPath = "/world/battlefields/Yorktown.glb";

const bossState = createBossSpawnState();

function resetYorktownBattleState(): void {
  bossState.reset();
}

export async function battleOfYorktownScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number],
) {
  resetYorktownBattleState();
  const hiddenMap = enterBattleScene(app);
  if (!canvas) throw new Error("Canvas not found");
  await ensureBattleApp(canvas, app, hiddenMap);
  if (!app.keyboard) app.keyboard = new Keyboard(window);
  await loadBattleEnvAtlas(app);

  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
  const player = new Player(app, playerSpawn);
  let respawnPosition = playerSpawn.clone();
  let respawnGroundY = 0;
  player.setDeathQuizContext(4, () => {
    player.revive(respawnPosition);
    if (cameraController) cameraController.groundHeight = respawnGroundY;
    createBattleHUD();
    updateBattleHUD(player);
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0, 0, 0);

  addStarField(app, cameraEntity, "yorktown-star-dome");

  const groundResult = await loadBattleGround(app, groundModelPath, player);
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  app.scene.ambientLight = new Color(0.2, 0.2, 0.2);
  if (app.systems.light) {
    const light = new Entity("directional-light");
    light.addComponent("light", {
      type: "directional",
      color: new Color(1, 1, 1),
      intensity: 1,
      castShadows: true,
    });
    light.setLocalEulerAngles(45, 30, 0);
    app.root.addChild(light);
  }

  const npcSpawnOptions = {
    ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
    groundYFallback: respawnGroundY,
  };
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, YORKTOWN_NPC_SPAWN_POINTS, npcSpawnOptions);

  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    key2Weapon: 2,
    updateKey: "__yorktownNpcUpdate",
    initialTotal: YORKTOWN_NPC_SPAWN_POINTS.length + YORKTOWN_BOSS_SPAWN_POINT.length,
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((n) => n.getTeam() === "foe" && n.isAlive()).length,
    isBossSpawned: () => bossState.isSpawned(),
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Battle of Yorktown', canvas, app);
    },
    spawnBoss: () => {
      bossState.runBossSpawn(() =>
        spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: YORKTOWN_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_GEORGE_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        }),
      ).catch((err) => console.error(err));
    },
  });
}
