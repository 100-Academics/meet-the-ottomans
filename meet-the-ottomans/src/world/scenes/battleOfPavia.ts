import {
  AppBase,
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
  spawnSceneBoss,
} from "../../util/battleSceneSetup";
import { getScreenCenter } from "../../util/battleSceneHelpers";
import { bindSceneListener } from "../../util/sceneCleanup";
import { bossActuallySpawned } from "../../util/victoryCheck";
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { bindNpcCombatLoop, spawnSceneNpcs, type NpcSpawnPoint } from "../npc/sceneNpcSystem";
import { PAVIA_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS, PAVIA_BOSS_SPAWN_POINT } from "../npc/sceneNpcPresets";
import { Boss } from "../npc/bosses/boss";
import { Secret, pickSecretPosition } from "../secrets";
import { triggerVictory } from "../../App";

const groundModelPath = '/world/battlefields/Pavia.glb';

/**
 * Pavia's preset spawn points historically all collapsed to one coordinate;
 * when that happens, scatter fallback soldiers around the player spawn anchor.
 */
function resolvePaviaSpawnPoints(anchor: Vec3): NpcSpawnPoint[] {
  const basePoints = PAVIA_NPC_SPAWN_POINTS;
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
    type: "italian"
  }));
}

export async function battleOfPaviaScene(
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
  player.setDeathQuizContext(3, () => {
    player.revive(respawnPosition);
    if (cameraController) {
      cameraController.groundHeight = respawnGroundY;
    }
    createBattleHUD();
    updateBattleHUD(player);
  });
  createBattleHUD();
  updateBattleHUD(player);
  player.equipWeapon(4);
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
  });
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  attachCollisionContactLogger(app);
  const rigidbodySystem = getRigidbodySystem(app);

  app.scene.skyboxIntensity = 0.2;
  app.scene.ambientLight = new Color(0.55, 0.58, 0.65);

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

  const paviaSpawnPoints = resolvePaviaSpawnPoints(respawnPosition);
  const npcSpawnOptions = {
    ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
    groundYFallback: respawnGroundY
  };
  let npcs = await spawnSceneNpcs(app, rigidbodySystem, paviaSpawnPoints, npcSpawnOptions);
  if (npcs.length === 0) {
    console.warn('[NPC] Pavia spawn returned no soldiers on the first pass, retrying once');
    npcs = await spawnSceneNpcs(app, rigidbodySystem, paviaSpawnPoints, npcSpawnOptions);
  }

  // Pavia accepts numpad 1/2 as well as the digit keys (some laptops map them differently).
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
    updateBattleHUD(player);
    if (hitNpc) {
      console.log(`Hit NPC`);
      if (hitNpc instanceof Boss) {
        (hitNpc as unknown as Boss).updateHealthBar();
      }
    }
  });

  bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
    updateKey: '__paviaNpcUpdate',
    battleStatus: {
      getCameraEntity: () => player.getCameraEntity(),
      initialTotal: PAVIA_NPC_SPAWN_POINTS.length,
      onRemainingCountChange: (remaining) => updateBattleHUD(player, remaining)
    },
    onNpcAttack: (attacker, target, damage) => {
      target.takeDamage(damage);
      try {
        if ((target as any) instanceof Boss) {
          (target as unknown as Boss).updateHealthBar();
        }
      } catch (e) {
        // ignore
      }
      console.log(`NPC ${attacker.getId()} (${attacker.getTeam()}) hit NPC ${target.getId()} for ${damage}.`);
    },
    onPlayerAttack: (attacker, damage) => {
      player.takeDamage(damage);
      updateBattleHUD(player);
      console.log(`Player hit by NPC ${attacker.getId()} for ${damage}, health now ${player.getHealth()}`);
    }
  });

  // Pavia's win condition is custom: Caesar arrives once all Italian soldiers
  // fall, and victory requires a short grace period after his spawn.
  let victoryHandled = false;
  let caesarSpawned = false;
  let caesarSpawnFrame: number | null = null;
  bindSceneListener(app, 'update', async () => {
    if (isDeathScreenVisible()) {
      return;
    }

    if (victoryHandled) {
      return;
    }

    const remainingFoes = npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive());

    // All Italian soldiers down — Caesar arrives as reinforcement.
    if (!caesarSpawned && !remainingFoes.some((f) => !(f instanceof Boss))) {
      caesarSpawned = true;
      const bossNpcs = await spawnSceneBoss({
        app,
        rigidbodySystem,
        npcs,
        spawnPoint: PAVIA_BOSS_SPAWN_POINT,
        bossOptions: DEFAULT_CAESAR_BOSS_SPAWN_OPTIONS,
        groundYFallback: respawnGroundY,
      });
      for (const boss of bossNpcs) {
        if (boss instanceof Boss) {
          boss.drawHealthBar();
          Boss.setActiveBoss(boss);
        }
      }
      // The spawn can be skipped entirely (playerSafeRadius, load failure) —
      // unlock the victory gate only when Caesar actually entered the field.
      if (!bossActuallySpawned(bossNpcs)) {
        caesarSpawned = false;
        return;
      }
      caesarSpawnFrame = 0;
      console.log('[NPC] Caesar has entered the battle!');
      return;
    }

    if (caesarSpawnFrame !== null) {
      caesarSpawnFrame += 1;
    }

    if (remainingFoes.length === 0 && caesarSpawned && (caesarSpawnFrame ?? 0) > 2) {
      removeBattleHUD();
      victoryHandled = true;
      triggerVictory('Battle of Pavia (Italian Wars)', canvas, app);
    }
  });
}
