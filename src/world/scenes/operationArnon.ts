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
  DEFAULT_MOSES_BOSS_SPAWN_OPTIONS,
  ARNON_BOSS_SPAWN_POINT,
  ARNON_NPC_SPAWN_POINTS,
} from "../npc/sceneNpcPresets";
import { Mongol } from "../npc/troops/mongol";
import { triggerVictory } from "../../App";

const groundModelPath = "/world/battlefields/Arnon.glb";

const bossState = createBossSpawnState();

function resetArnonBattleState(): void {
  bossState.reset();
  Mongol.resetBattleState();
}

export async function operationArnonScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number,
  spawnPoint?: [number, number, number],
) {
  resetArnonBattleState();
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
    createBattleHUD();
    updateBattleHUD(player);
  });
  const cameraController = player.getCameraController();
  const cameraEntity = player.getCameraEntity();
  if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0, 0, 0);

  addStarField(app, cameraEntity, "arnon-star-dome");

  const groundResult = await loadBattleGround(app, groundModelPath, player,
    { tagCollisionMeshes: "ground" });
  respawnPosition = player.getPosition().clone();
  respawnGroundY = groundResult.respawnGroundY;

  // Arnon.glb keeps its render mesh on a child of the loaded root, so the root
  // itself may get no collider. Ground raycasts look for the "ground" tag by
  // walking UP from the entity they hit — if the only tagged node is a meshless
  // root, nothing is ever found and the player falls forever. Guarantee a
  // tagged, collidable floor when no descendant picked up a collision mesh.
  {
    let anyCollider = false;
    const stack: Entity[] = groundResult.entity ? [groundResult.entity] : [];
    while (stack.length > 0) {
      const node = stack.pop() as Entity;
      if (node.collision) { anyCollider = true; break; }
      stack.push(...(node.children as Entity[]));
    }
    if (!anyCollider) {
      console.warn("[Ground] Arnon.glb produced NO colliders — adding a tagged box floor so ground raycasts still work");
      const anyBounds = groundResult.bounds;
      const halfX = anyBounds ? Math.max(20, (anyBounds.maxX - anyBounds.minX) * 0.5) : 250;
      const halfZ = anyBounds ? Math.max(20, (anyBounds.maxZ - anyBounds.minZ) * 0.5) : 250;
      const centerX = anyBounds ? (anyBounds.minX + anyBounds.maxX) * 0.5 : 0;
      const centerZ = anyBounds ? (anyBounds.minZ + anyBounds.maxZ) * 0.5 : 0;
      const floorY = anyBounds ? anyBounds.minY - 0.5 : -0.5;
      const floor = new Entity("arnon-floor-fallback");
      floor.addComponent("collision", { type: "box", halfExtents: new Vec3(halfX, 0.5, halfZ) });
      floor.addComponent("rigidbody", { type: "static" });
      floor.setPosition(centerX, floorY, centerZ);
      floor.tags.add("ground");
      app.root.addChild(floor);
    }
  }

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
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, ARNON_NPC_SPAWN_POINTS, npcSpawnOptions);

  createBattleHUD();
  updateBattleHUD(player);

  wireBattleInput(app, player, npcs, {
    key2Weapon: 2,
    updateKey: "__arnonNpcUpdate",
    initialTotal: ARNON_NPC_SPAWN_POINTS.length + ARNON_BOSS_SPAWN_POINT.length,
  });

  bindVictoryCheck(app, {
    isDeathScreenVisible,
    getRemainingFoes: () =>
      npcs.filter((n) => n.getTeam() === "foe" && n.isAlive()).length,
    isBossSpawned: () => bossState.isSpawned(),
    onVictory: () => {
      removeBattleHUD();
      triggerVictory('Operation Arnon', canvas, app);
    },
    spawnBoss: () => {
      bossState.runBossSpawn(() =>
        spawnSceneBoss({
          app,
          rigidbodySystem,
          npcs,
          spawnPoint: ARNON_BOSS_SPAWN_POINT,
          bossOptions: DEFAULT_MOSES_BOSS_SPAWN_OPTIONS,
          groundYFallback: respawnGroundY,
        }),
      ).catch((err) => console.error(err));
    },
  });
}
