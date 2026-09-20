import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Keyboard,
} from "playcanvas";

import { createBattleHUD, removeBattleHUD, updateBattleHUD } from '../../util/battleHUD';
import { bindVictoryCheck } from "../../util/victoryCheck";
import { isDeathScreenVisible } from './deathScreen';
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

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { Player } from '../../player/player';
import type { Battle } from "../Battle";
import { spawnSceneNpcs } from "../npc/sceneNpcSystem";
import { DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, DEFAULT_KHAN_BOSS_SPAWN_OPTIONS, LEGNICA_BOSS_SPAWN_POINT, LEGNICA_NPC_SPAWN_POINTS } from "../npc/sceneNpcPresets";
import { Mongol } from "../npc/troops/mongol";
import { triggerVictory } from "../../App";
import { Secret, pickSecretPosition } from "../secrets";

const groundModelPath = '/world/battlefields/legnica.glb';

const bossState = createBossSpawnState();

function resetLegnicaBattleState(): void {
  bossState.reset();
  Mongol.resetBattleState();
}

export async function battleOfLegnicaScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number]
) {
  resetLegnicaBattleState();
  const hiddenMap = enterBattleScene(app);

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  await ensureBattleApp(canvas, app, hiddenMap);

  // Ensure keyboard input is available
  if (!app.keyboard) {
    app.keyboard = new Keyboard(window);
  }

  await loadBattleEnvAtlas(app);

  // Create the player with camera and first-person controls
  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
  const player = new Player(app, playerSpawn);
  let respawnPosition = playerSpawn.clone();
  let respawnGroundY = 0;
  player.setDeathQuizContext(3, () => {
    player.revive(respawnPosition);
    if (cameraController) {
      cameraController.groundHeight = respawnGroundY;
    }
    createBattleHUD();
    updateBattleHUD(player);
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) {
    cameraEntity.camera.clearColor = new Color(0, 0, 0);
  }

  addStarField(app, cameraEntity, 'legnica-star-dome');

  // Load and set up the battlefield ground model
  const groundResult = await loadBattleGround(app, groundModelPath, player);
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  // Set up basic scene lighting
  // Ambient light provides a baseline light level everywhere
  app.scene.ambientLight = new Color(0.2, 0.2, 0.2);

  // Create a directional light (like the sun) to cast shadows
  if (app.systems.light) {
    const light = new Entity('directional-light');
    light.addComponent('light', {
      type: 'directional',
      color: new Color(1, 1, 1),
      intensity: 1,
      castShadows: true
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
    rotation: new Vec3(0, 0, 0)
  });
  await secret.spawn();

  const npcSpawnOptions = {
    ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
    groundYFallback: respawnGroundY
  };
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, LEGNICA_NPC_SPAWN_POINTS, npcSpawnOptions);

  // Create battle HUD to display weapon and health
  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    key2Weapon: 4, // bow — too early a time period for the gun
    updateKey: '__legnicaNpcUpdate',
    initialTotal: LEGNICA_NPC_SPAWN_POINTS.length + LEGNICA_BOSS_SPAWN_POINT.length,
    combatLoopExtras: {
      groundProbeHeight: 500,
      groundProbeDepth: 500,
      obstacleCollisionEnabled: true,
    },
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive()).length,
    isBossSpawned: () => bossState.isSpawned(),
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Battle of Legnica', canvas, app);
    },
    spawnBoss: () => {
      bossState.runBossSpawn(() =>
        spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: LEGNICA_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_KHAN_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        }),
      ).catch((err) => console.error(err));
    },
  });
}
