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
import { bindSceneListener } from "../../util/sceneCleanup";
import { Boss } from "../npc/bosses/boss";

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from "playcanvas/scripts/esm/grid.mjs";
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { spawnSceneNpcs } from "../npc/sceneNpcSystem";
import { Secret, pickSecretPosition } from "../secrets";
import {
  DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
  DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS,
  RIDANIYA_BOSS_SPAWN_POINT,
  RIDANIYA_NPC_SPAWN_POINTS,
} from "../npc/sceneNpcPresets";
import { triggerVictory } from "../../App";

const groundModelPath = "/world/battlefields/Ridaniya.glb";

const bossState = createBossSpawnState();

let baybarsSpawnFrame = -1;
let victoryHandled = false;

function resetRidaniyaBattleState(): void {
  bossState.reset();
  baybarsSpawnFrame = -1;
  victoryHandled = false;
}

export async function battleOfRidaniyaScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number],
) {
  resetRidaniyaBattleState();
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
  player.setDeathQuizContext(3, () => {
    player.revive(respawnPosition);
    if (cameraController) cameraController.groundHeight = respawnGroundY;
    createBattleHUD();
    updateBattleHUD(player);
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0.44, 0.72, 0.98);

  addStarField(app, cameraEntity, "ridaniya-star-dome");

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
  let npcs = await spawnSceneNpcs(app, rigidbodySystem, RIDANIYA_NPC_SPAWN_POINTS, npcSpawnOptions);
  if (npcs.length === 0) {
    console.warn('[NPC] Ridaniya spawn returned no soldiers on the first pass, retrying once');
    npcs = await spawnSceneNpcs(app, rigidbodySystem, RIDANIYA_NPC_SPAWN_POINTS, npcSpawnOptions);
  }

  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    key2Weapon: 4,
    updateKey: "__ridaniyaNpcUpdate",
    // Baybars is not counted in the HUD total until he spawns (original behavior).
    initialTotal: RIDANIYA_NPC_SPAWN_POINTS.length,
    noPlayerHealth: true,
    combatLoopExtras: {
      battleStatus: {
        alwaysOutline: true,
        outlineTargets: "foe",
        outlineColor: new Color(1, 0.9, 0.2),
      },
    },
  });


  // Ridaniya's win condition is custom: Baybars arrives once all Mamluks fall,
  // and victory requires a short grace period after his spawn so he can enter
  // the fight (the async spawn can resolve on the kill frame).
  bindSceneListener(app, 'update', () => {
    if (isDeathScreenVisible()) return;
    if (victoryHandled) return;

    const remainingFoes = npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive());

    // All Mamluks down — Baybars arrives as reinforcement.
    if (!bossState.isSpawned() && !bossState.isSpawning() && !remainingFoes.some((f) => !(f instanceof Boss))) {
      bossState.runBossSpawn(async () => {
        const bossNpcs = await spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: RIDANIYA_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_BAYBARS_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        });
        if (bossNpcs.length > 0) {
          baybarsSpawnFrame = 0; // require grace period before victory can trigger
          console.log('[NPC] Baybars has entered the battle!');
        }
        return bossNpcs;
      }).catch((err) => console.error(err));
    }

    if (baybarsSpawnFrame >= 0) {
      baybarsSpawnFrame += 1;
    }

    if (remainingFoes.length === 0 && bossState.isSpawned() && baybarsSpawnFrame > 2) {
      victoryHandled = true;
      removeBattleHUD();
      triggerVictory('Battle of Ridaniya', canvas, app);
    }
  });
}
