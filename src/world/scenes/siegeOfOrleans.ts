import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Keyboard,
  KEY_1,
  KEY_2,
  KEY_NUMPAD_1,
  KEY_NUMPAD_2,
} from "playcanvas";

import { createBattleHUD, removeBattleHUD, updateBattleHUD } from "../../util/battleHUD";
import { isDeathScreenVisible } from "./deathScreen";
import {
  ensureBattleApp,
  enterBattleScene,
  loadBattleEnvAtlas,
  loadBattleGround,
  attachCollisionContactLogger,
  getRigidbodySystem,
} from "../../util/battleSceneSetup";
import { getScreenCenter } from "../../util/battleSceneHelpers";
import { bindVictoryCheck, bossActuallySpawned } from "../../util/victoryCheck";
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { Boss } from "../npc/bosses/boss";
import { bindNpcCombatLoop, spawnSceneNpcs, type NpcSpawnPoint } from "../npc/sceneNpcSystem";
import { ORLEANS_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS } from "../npc/sceneNpcPresets";
import { triggerVictory } from "../../App";

const groundModelPath = '/world/battlefields/Orleans.glb';

/**
 * Orleans' preset spawn points historically all collapsed to one coordinate;
 * when that happens, scatter fallback soldiers around the player spawn anchor.
 */
function resolveOrleansSpawnPoints(anchor: Vec3): NpcSpawnPoint[] {
  const basePoints = ORLEANS_NPC_SPAWN_POINTS;
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.z)) {
    return basePoints;
  }

  if (basePoints.length > 0) {
    const first = basePoints[0];
    const allSame = basePoints.every((spawn) =>
      Math.abs(spawn.x - first.x) < 0.01 && Math.abs(spawn.z - first.z) < 0.01
    );
    if (!allSame) {
      return basePoints;
    }
  }

  const fallbackOffsets = [
    { x: 12, z: 6 },
    { x: -14, z: 4 },
    { x: 8, z: -10 },
    { x: -10, z: -8 },
    { x: 16, z: -2 },
    { x: -6, z: 12 }
  ];

  const spawnCount = Math.max(3, basePoints.length || 0);
  return fallbackOffsets.slice(0, spawnCount).map((offset, index) => ({
    id: 100 + index,
    team: "foe",
    x: anchor.x + offset.x,
    z: anchor.z + offset.z,
    type: "french"
  }));
}

export async function siegeOfOrleansScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number]
) {
  const hiddenMap = enterBattleScene(app);
  if (!canvas) {
    throw new Error('Canvas not found');
  }
  await ensureBattleApp(canvas, app, hiddenMap);
  if (!app.keyboard) {
    app.keyboard = new Keyboard(window);
  }
  await loadBattleEnvAtlas(app);
  app.scene.skyboxIntensity = 0.2;
  const skyboxLayer = app.scene.layers.getLayerByName('Skybox');
  if (skyboxLayer) {
    skyboxLayer.enabled = false;
  }

  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
  const player = new Player(app, playerSpawn);
  let respawnPosition = playerSpawn.clone();
  let respawnGroundY = 0;
  player.setDeathQuizContext(2, () => {
    player.revive(respawnPosition);
    if (cameraController) {
      cameraController.groundHeight = respawnGroundY;
    }
    createBattleHUD();
    updateBattleHUD(player);
  });
  createBattleHUD();
  updateBattleHUD(player);
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) {
    cameraEntity.camera.clearColor = new Color(0.44, 0.72, 0.98);
    cameraEntity.camera.clearColorBuffer = true;
  }

  const groundResult = await loadBattleGround(app, groundModelPath, player, {
    awaitAmmo: true,
    movementBounds: true,
    centerFail: "range75",
    fallbackCenter: () => respawnPosition,
  });
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  app.scene.fog.type = 'linear';
  app.scene.fog.color = new Color(0.72, 0.84, 0.98);
  app.scene.fog.start = 120;
  app.scene.fog.end = 520;

  app.scene.ambientLight = new Color(0.38, 0.46, 0.58);

  if (app.systems.light) {
    const light = new Entity('sun-light');
    light.addComponent('light', { type: 'directional', color: new Color(1, 0.96, 0.82), intensity: 1.45, castShadows: true });
    light.setLocalEulerAngles(52, 35, 0);
    app.root.addChild(light);
  }

  const orleansSpawnPoints = resolveOrleansSpawnPoints(respawnPosition);
  const npcSpawnOptions = { ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, groundYFallback: respawnGroundY };
  let npcs = await spawnSceneNpcs(app, rigidbodySystem, orleansSpawnPoints, npcSpawnOptions);
  if (npcs.length === 0) {
    console.warn('[NPC] Orleans spawn returned no soldiers on the first pass, retrying once');
    npcs = await spawnSceneNpcs(app, rigidbodySystem, orleansSpawnPoints, npcSpawnOptions);
  }

  let joanSpawned = false;
  let joanSpawning = false;
  const spawnJoanOfArc = async (): Promise<void> => {
    if (joanSpawned || joanSpawning) {
      return;
    }

    joanSpawning = true;
    try {
      const playerPosition = player.getPosition();
      const spawnOffset = new Vec3(6, 0, -8);
      const joanSpawnPoints: NpcSpawnPoint[] = [
        {
          id: 901,
          team: 'foe',
          x: playerPosition.x + spawnOffset.x,
          z: playerPosition.z + spawnOffset.z,
          maxHealth: 240,
          type: 'joanofarc'
        }
      ];

      const spawnedJoan = await spawnSceneNpcs(app, rigidbodySystem, joanSpawnPoints, npcSpawnOptions);
      npcs.push(...spawnedJoan);
      // Zero spawned foes means the boss isn't on the field — leave the
      // flag false so the victory check keeps retrying instead of
      // auto-winning with no Joan present.
      joanSpawned = bossActuallySpawned(spawnedJoan);
      if (!joanSpawned) {
        console.warn('[NPC] Joan of Arc spawn returned no NPCs.');
      }
      for (const spawned of spawnedJoan) {
        if (spawned instanceof Boss) {
          spawned.drawHealthBar();
          Boss.setActiveBoss(spawned);
        }
      }
    } catch (error) {
      console.error('[NPC] Failed to spawn Joan of Arc', error);
      joanSpawned = true;
    } finally {
      joanSpawning = false;
    }
  };

  // Orleans accepts numpad 1/2 as well as the digit keys.
  app.keyboard?.on('keydown', (event: { key: number | string | null; event?: globalThis.KeyboardEvent | null }) => {
    if (isDeathScreenVisible()) {
      return;
    }

    const keyCode = typeof event.key === 'number' ? event.key : null;
    const rawEvent = event.event ?? null;
    const keyValue = rawEvent?.key ?? (typeof event.key === 'string' ? event.key : null);
    const keyCodeValue = rawEvent?.code ?? null;

    const isKey1 = keyCode === KEY_1 || keyCode === KEY_NUMPAD_1 || keyValue === '1' || keyCodeValue === 'Digit1' || keyCodeValue === 'Numpad1';
    const isKey2 = keyCode === KEY_2 || keyCode === KEY_NUMPAD_2 || keyValue === '2' || keyCodeValue === 'Digit2' || keyCodeValue === 'Numpad2';
    if (isKey1) {
      player.equipWeapon(1);
      updateBattleHUD(player);
    } else if (isKey2) {
      player.equipWeapon(4);
      updateBattleHUD(player);
    }
  });

  app.mouse?.on('mousedown', (event: { x: number; y: number; button: number }) => {
    if (isDeathScreenVisible()) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const { x: targetX, y: targetY } = getScreenCenter(app);
    const hitNpc = cameraController?.getClickedNpcInRange(targetX, targetY, npcs, player.getAttackRange());
    player.attack(hitNpc ?? null);
    if (hitNpc instanceof Boss) {
      hitNpc.updateHealthBar();
    }
    updateBattleHUD(player);
    if (hitNpc) {
      console.log(`Hit NPC`);
    }
  });

  bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
    updateKey: '__orleansNpcUpdate',
    getPlayerHealth: () => ({ current: player.getHealth(), max: player.getDebugState().maxHealth }),
    battleStatus: {
      getCameraEntity: () => player.getCameraEntity(),
      initialTotal: orleansSpawnPoints.length,
      alwaysOutline: true,
      outlineTargets: 'all',
      outlineColor: new Color(1, 0.9, 0.2),
      onRemainingCountChange: (remaining) => updateBattleHUD(player, remaining)
    },
    onNpcAttack: (attacker, target, damage) => {
      target.takeDamage(damage);
      if (target instanceof Boss) {
        target.updateHealthBar();
      }
      console.log(`NPC ${attacker.getId()} (${attacker.getTeam()}) hit NPC ${target.getId()} for ${damage}.`);
    },
    onPlayerAttack: (attacker, damage) => {
      player.takeDamage(damage);
      updateBattleHUD(player);
      console.log(`Player hit by NPC ${attacker.getId()} for ${damage}, health now ${player.getHealth()}`);
    }
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive()).length,
    isBossSpawned: () => joanSpawned,
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Siege of Orléans', canvas, app);
    },
    spawnBoss: () => {
      spawnJoanOfArc().catch((error) => console.error(error));
    },
  });
}
