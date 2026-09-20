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
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { spawnSceneNpcs } from "../npc/sceneNpcSystem";
import {
  DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
  DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS,
  ABIREY_HALEV_BOSS_SPAWN_POINT,
  ABIREY_HALEV_NPC_SPAWN_POINTS,
} from "../npc/sceneNpcPresets";
import { triggerVictory } from "../../App";

const groundModelPath = "/world/battlefields/Suez.glb";

const bossState = createBossSpawnState();

export async function operationAbireyHalevScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number],
) {
  bossState.reset();
  const hiddenMap = enterBattleScene(app);
  if (!canvas) throw new Error("Canvas not found");
  await ensureBattleApp(canvas, app, hiddenMap);
  if (!app.keyboard) app.keyboard = new Keyboard(window);
  await loadBattleEnvAtlas(app);

  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
  const player = new Player(app, playerSpawn);
  let respawnPosition = playerSpawn.clone();
  let respawnGroundY = 0;
  player.setDeathQuizContext(7, () => {
    player.revive(respawnPosition);
    if (cameraController) cameraController.groundHeight = respawnGroundY;
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0, 0, 0);

  addStarField(app, cameraEntity, "abirey-star-dome");

  const groundResult = await loadBattleGround(app, groundModelPath, player);
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  const npcSpawnOptions = {
    ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
    groundYFallback: respawnGroundY,
  };
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, ABIREY_HALEV_NPC_SPAWN_POINTS, npcSpawnOptions);

  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    // This scene never had a weapon-switch key handler — KEY_1/KEY_2 stay unbound.
    noWeaponKeys: true,
    key2Weapon: 2,
    updateKey: "__abireyHalevNpcUpdate",
    initialTotal: ABIREY_HALEV_NPC_SPAWN_POINTS.length + ABIREY_HALEV_BOSS_SPAWN_POINT.length,
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((currentNpc) => currentNpc.getTeam() === "foe" && currentNpc.isAlive()).length,
    isBossSpawned: () => bossState.isSpawned(),
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Operation Abirey-Halev', canvas, app);
    },
    spawnBoss: () => {
      bossState.runBossSpawn(() =>
        spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: ABIREY_HALEV_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_CAIN_AND_ABEL_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        }),
      ).catch((err) => console.error(err));
    },
  });

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
}
