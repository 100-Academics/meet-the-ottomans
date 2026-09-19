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
import { Secret, pickSecretPosition } from "../secrets";
import {
  DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
  DEFAULT_KING_GESER_BOSS_SPAWN_OPTIONS,
  AIN_JALUT_BOSS_SPAWN_POINT,
  AIN_JALUT_NPC_SPAWN_POINTS,
} from "../npc/sceneNpcPresets";
import { triggerVictory } from "../../App";

const groundModelPath = "/world/battlefields/AinJalut.glb";

const bossState = createBossSpawnState();

function resetAinJalutBattleState(): void {
  bossState.reset();
}

export async function battleOfAinJalutScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number],
) {
  resetAinJalutBattleState();
  const hiddenMap = enterBattleScene(app);
  if (!canvas) throw new Error("Canvas not found");
  await ensureBattleApp(canvas, app, hiddenMap);
  if (!app.keyboard) app.keyboard = new Keyboard(window);
  await loadBattleEnvAtlas(app);
  app.scene.skyboxIntensity = 0.2;
  const skyboxLayer = app.scene.layers.getLayerByName('Skybox');
  if (skyboxLayer) skyboxLayer.enabled = false;

  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
  const player = new Player(app, playerSpawn);
  let respawnPosition = playerSpawn.clone();
  let respawnGroundY = 0;
  player.setDeathQuizContext(1, () => {
    player.revive(respawnPosition);
    if (cameraController) cameraController.groundHeight = respawnGroundY;
    createBattleHUD();
    updateBattleHUD(player);
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0.44, 0.72, 0.98);

  addStarField(app, cameraEntity, "ainjalut-star-dome");

  const groundResult = await loadBattleGround(app, groundModelPath, player,
    { awaitAmmo: true, movementBounds: true, centerFail: "range75", fallbackCenter: () => respawnPosition });
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  app.scene.ambientLight = new Color(0.38, 0.46, 0.58);
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


  // Pick the secret's position INSIDE the map's bounds and ground-snap it.
  const secretPosition = pickSecretPosition(app, groundResult.bounds, respawnGroundY);
  const secret = new Secret({
    app,
    cameraEntity: player.getCameraEntity(),
    modelPath: "models/jar.glb",
    position: secretPosition,
    scale: new Vec3(0.5, 0.5, 0.5),
    rotation: new Vec3(0, 0, 0),
  });
  await secret.spawn();

  const npcSpawnOptions = {
    ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
    groundYFallback: respawnGroundY,
  };
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, AIN_JALUT_NPC_SPAWN_POINTS, npcSpawnOptions);

  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    key2Weapon: 4,
    updateKey: "__ainJalutNpcUpdate",
    initialTotal: AIN_JALUT_NPC_SPAWN_POINTS.length + AIN_JALUT_BOSS_SPAWN_POINT.length,
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((n) => n.getTeam() === "foe" && n.isAlive()).length,
    isBossSpawned: () => bossState.isSpawned(),
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Battle of Ain Jalut', canvas, app);
    },
    spawnBoss: () => {
      bossState.runBossSpawn(() =>
        spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: AIN_JALUT_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_KING_GESER_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        }),
      ).catch((err) => console.error(err));
    },
  });
}
