/**
 * Shared boilerplate for the battle scenes in src/world/scenes/.
 *
 * Every battle scene used to inline the same five blocks (~300 lines each):
 *   1. Defensive graphics-device/app init (`if (!app.graphicsDevice) { ... }`)
 *   2. Scene-entry teardown (unloadAll, detaching mouse/keyboard, hiding the
 *      overlay + hover label)
 *   3. battle-env-atlas load and `app.scene.envAtlas` assignment
 *   4. Ground model load + `ground` tagging + player surface spawn resolution
 *   5. Canvas star dome that follows the camera
 *   6. KEY_1/KEY_2 weapon switch + mousedown hit-test + NPC combat loop
 *   7. spawnBoss wrapper around spawnSceneNpcs with UI wiring
 *
 * Those live here now. Scene-specific content (secrets, custom skies,
 * lighting, wave logic, fallback terrain spawn resolution, multi-phase bosses)
 * stays in the scene files.
 *
 * IMPORTANT lifecycle rule preserved from the inlined code: the
 * graphics-device init block restores hidden overlay children on app destroy —
 * do not drop that, and keep `bindSceneListener` for update-loop follow
 * handlers so they detach on scene change.
 */
import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Mouse,
  Keyboard,
  TouchDevice,
  createGraphicsDevice,
  AppOptions,
  RenderComponentSystem,
  CameraComponentSystem,
  ScriptComponentSystem,
  LightComponentSystem,
  CollisionComponentSystem,
  RigidBodyComponentSystem,
  TextureHandler,
  ContainerHandler,
  Asset,
  AssetListLoader,
  TEXTURETYPE_RGBP,
  Texture,
  StandardMaterial,
  MeshInstance,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO,
  KEY_1,
  KEY_2,
  Mesh,
  SphereGeometry,
  CULLFACE_FRONT,
} from "playcanvas";

import { unloadAll } from "./unloadall";
import { loadModel } from "./loadModel";
import { createBattleHUD, updateBattleHUD } from "./battleHUD";
import { bindSceneListener } from "./sceneCleanup";
import { bossActuallySpawned } from "./victoryCheck";
import { isDeathScreenVisible } from "../world/scenes/deathScreen";
import { Boss } from "../world/npc/bosses/boss";
import type { npc as NpcType } from "../world/npc/npc";
import { spawnSceneNpcs, bindNpcCombatLoop, type NpcSpawnPoint } from "../world/npc/sceneNpcSystem";
import { getHighestGroundHitY, getRenderableBounds, createStarfieldTexture, getScreenCenter, type RenderableBounds } from "./battleSceneHelpers";

/** Minimal structural type for the player (avoids a util → player import cycle). */
export interface BattlePlayerLike {
  setPosition(pos: Vec3): void;
  getPosition(): Vec3;
  getCameraController(): any;
  getCameraEntity(): Entity;
  getAttackRange(): number;
  attack(target: unknown | null): void;
  equipWeapon(slot: number): void;
}

/**
 * #1 — Initialize the graphics device and app on first boot. Every battle
 * scene must be able to act as the entry point (the app may not exist yet).
 * Returns true when this call performed the initialization.
 *
 * `hiddenMap` is the overlay-element display map captured by
 * `enterBattleScene()` so the destroy hook can restore it.
 */
export async function ensureBattleApp(
  canvas: HTMLCanvasElement,
  app: AppBase,
  hiddenMap: Map<HTMLElement, string | null>,
): Promise<boolean> {
  if (!app.graphicsDevice) {
    const device = await createGraphicsDevice(canvas);
    const createOptions = new AppOptions();
    createOptions.graphicsDevice = device;
    // Input handling (mouse, keyboard, touch)
    createOptions.mouse = new Mouse(document.body);
    createOptions.keyboard = new Keyboard(window);
    createOptions.touch = new TouchDevice(document.body);
    // Component systems needed for rendering, physics, scripts, etc.
    createOptions.componentSystems = [
      RenderComponentSystem,
      CameraComponentSystem,
      ScriptComponentSystem,
      LightComponentSystem,
      CollisionComponentSystem,
      RigidBodyComponentSystem,
    ];
    // Asset handlers for textures and container models
    createOptions.resourceHandlers = [TextureHandler, ContainerHandler];

    app.init(createOptions);

    if (!app.keyboard) {
      app.keyboard = new Keyboard(window);
    }

    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);

    // Handle window resizing by updating the canvas
    const resize = () => app.resizeCanvas();
    window.addEventListener("resize", resize);

    // When the app is destroyed, clean up the resize listener and restore overlay
    app.once("destroy", () => {
      window.removeEventListener("resize", resize);
      for (const [el, prev] of hiddenMap.entries()) {
        if (prev === null) el.style.removeProperty("display");
        else el.style.display = prev;
      }
    });

    app.start();
    return true;
  }
  return false;
}

/**
 * #2 — Battle-scene entry preamble: destroy the previous scene's entities,
 * detach input, hide the DOM overlay + globe hover label. Returns the map of
 * hidden overlay elements so `ensureBattleApp` can restore them on destroy.
 *
 * Call AFTER the per-scene resetXxxState() — that part stays in the scenes.
 */
export function enterBattleScene(app: AppBase): Map<HTMLElement, string | null> {
  unloadAll(app);
  app.mouse?.off();
  app.keyboard?.off();

  // Hide the page overlay (UI text/info pills) while we're in the 3D scene
  const overlay = document.querySelector(".overlay") as HTMLElement | null;
  const hiddenMap = new Map<HTMLElement, string | null>();
  if (overlay) {
    const children = Array.from(overlay.children) as HTMLElement[];
    for (const child of children) {
      hiddenMap.set(child, child.style.display || null);
      child.style.display = "none";
    }
  }

  // Hide the hover label that appears when you mouse over battlefields on the globe
  const hoverLabel = document.getElementById("battle-hover-label");
  if (hoverLabel) {
    hoverLabel.style.display = "none";
  }
  return hiddenMap;
}

/**
 * #3 — Load (or find) the shared battle environment atlas and apply it to the
 * scene for reflections/lighting.
 */
export async function loadBattleEnvAtlas(app: AppBase): Promise<void> {
  const envAtlasAsset =
    app.assets.find("battle-env-atlas") ??
    new Asset(
      "battle-env-atlas",
      "texture",
      { url: "/environment-map.png" },
      { type: TEXTURETYPE_RGBP, mipmaps: false }, // RGBP = RGB + Parallax (cubemap)
    );

  if (!app.assets.find("battle-env-atlas")) {
    app.assets.add(envAtlasAsset);
  }

  await new Promise<void>((resolve) => {
    if (envAtlasAsset.loaded) {
      resolve();
      return;
    }
    new AssetListLoader([envAtlasAsset], app.assets).load(() => resolve());
  });

  app.scene.envAtlas = envAtlasAsset.resource as Texture;
}

/**
 * #5 — Canvas star dome that follows the camera. Wired through
 * bindSceneListener so it detaches on scene change (several older scenes used
 * a raw app.on('update') and leaked; those are migrated by this adoption).
 */
export function addStarField(app: AppBase, cameraEntity: Entity, name = "star-dome", radius = 220): Entity {
  const starMaterial = new StandardMaterial();
  starMaterial.useLighting = false;
  starMaterial.emissive.set(1, 1, 1);
  starMaterial.emissiveMap = createStarfieldTexture(app.graphicsDevice);
  starMaterial.cull = CULLFACE_FRONT;
  starMaterial.update();

  const starDome = new Entity(name);
  const starMesh = Mesh.fromGeometry(app.graphicsDevice, new SphereGeometry({
    radius,
    latitudeBands: 64,
    longitudeBands: 64,
  }));
  starDome.addComponent("render", {
    meshInstances: [new MeshInstance(starMesh, starMaterial)],
  });
  starDome.setPosition(cameraEntity.getPosition());
  app.root.addChild(starDome);

  bindSceneListener(app, "update", () => {
    starDome.setPosition(cameraEntity.getPosition());
  });
  return starDome;
}

export interface BattleGroundOpts {
  /** Re-probe a small grid around the center for the highest ground hit. */
  centerSearch?: boolean;
  /** Constrain the center raycasts to the terrain's Y range. */
  useTerrainBounds?: boolean;
  /** Clamp the player inside the terrain (cameraController.setMovementBounds). */
  movementBounds?: boolean;
  /** pass `tagCollisionMeshes` through to loadModel (Arnon/Kyiv need it). */
  tagCollisionMeshes?: string;
  /** Wait for Ammo to register ground collision before spawning. */
  awaitAmmo?: boolean;
  /** Fallback Y estimate when the center raycast fails: "boundsMax" (default)
   *  uses bounds.maxY, "range75" uses minY + 75% of the terrain height range,
   *  "ammoHit" prefers waitForAmmoReady's hit Y (requires awaitAmmo). */
  centerFail?: "boundsMax" | "range75" | "ammoHit";
  /**
   * Some scenes race NPC spawns against ground registration and place their
   * fallback grid around the player spawn instead of world origin.
   * (Ain Jalut / Orleans / Ridaniya) — center the fallback search there.
   */
  fallbackCenter?: () => Vec3;
}

export interface BattleGroundResult {
  entity: Entity | undefined;
  bounds: RenderableBounds | undefined;
  /** Ground Y the player will respawn at (0 when unresolved — matches old code). */
  respawnGroundY: number;
}

/**
 * #4 — Load the battlefield ground model, tag it `ground`, and place the
 * player on the terrain surface (center probe, then a fallback grid search).
 */
export async function loadBattleGround(
  app: AppBase,
  path: string,
  player: BattlePlayerLike,
  opts: BattleGroundOpts = {},
): Promise<BattleGroundResult> {
  let respawnGroundY = 0;
  try {
    const ground = await loadModel(path, app, {
      rigidbodyType: "static", // Ground doesn't move
      includeDescendants: true, // Load child entities too
      position: new Vec3(0, 0, 0),
      rotation: new Vec3(0, 0, 0),
      scale: new Vec3(1, 1, 1),
      ...(opts.tagCollisionMeshes ? { tagCollisionMeshes: opts.tagCollisionMeshes } : {}),
    });

    ground.modelEntity.name = "ground";
    ground.modelEntity.tags.add("ground");

    let ammoHitY: number | undefined;
    if (opts.awaitAmmo) {
      const { waitForAmmoReady } = await import("./spawnHelpers");
      const ammoReady = await waitForAmmoReady(app, "ground");
      ammoHitY = ammoReady.hitY;
    }

    // Debug logging to verify the collision system is working
    const groundRb = ground.modelEntity.rigidbody;
    const groundCol = ground.modelEntity.collision;
    const childColliders = (ground.modelEntity.children as Entity[]).filter(
      (c) => c.collision,
    );
    console.log("[Ground] loaded", {
      path,
      name: ground.modelName,
      hasRigidbody: !!groundRb,
      rigidbodyType: groundRb?.type,
      hasCollision: !!groundCol,
      collisionType: groundCol?.type,
      childColliderCount: childColliders.length,
      childColliderTypes: childColliders.map((c) => c.collision?.type),
      ammoRuntime: (globalThis as any).__ammoRuntime,
    });

    if (!groundRb && !groundCol && childColliders.length === 0) {
      console.error("[Ground] NO collision/rigidbody detected — raycasting will fail!");
    }

    const cameraController = player.getCameraController();
    const spawnSurfaceOffset = (cameraController?.playerHeight ?? 2) + 0.05; // Slightly above ground
    const bounds = getRenderableBounds(ground.modelEntity);

    let spawnResolved = false;
    if (bounds) {
      if (opts.movementBounds) {
        cameraController?.setMovementBounds(bounds, 2.5);
      }
      const spawnX = (bounds.minX + bounds.maxX) * 0.5;
      const spawnZ = (bounds.minZ + bounds.maxZ) * 0.5;
      let seededGroundY: number | undefined;
      if (opts.centerSearch) {
        // Re-probe a small grid around the center and take the highest hit
        const searchRadius = 16;
        const searchStep = 8;
        const RayOpts = opts.useTerrainBounds
          ? { terrainBounds: { minY: bounds.minY, maxY: bounds.maxY } }
          : undefined;
        for (let ox = -searchRadius; ox <= searchRadius; ox += searchStep) {
          for (let oz = -searchRadius; oz <= searchRadius; oz += searchStep) {
            const hitY = getHighestGroundHitY(app, spawnX + ox, spawnZ + oz, "ground", RayOpts);
            if (hitY !== undefined && (seededGroundY === undefined || hitY > seededGroundY)) {
              seededGroundY = hitY;
            }
          }
        }
      } else {
        seededGroundY = getHighestGroundHitY(app, spawnX, spawnZ, "ground");
      }
      // Fall back to an estimate when the center raycast fails.
      let surfaceY: number;
      if (seededGroundY !== undefined) {
        surfaceY = seededGroundY;
      } else if (opts.centerFail === "ammoHit" && ammoHitY !== undefined) {
        surfaceY = ammoHitY;
      } else if (opts.centerFail === "range75" || opts.centerFail === "ammoHit") {
        surfaceY = bounds.minY + (bounds.maxY - bounds.minY) * 0.75;
      } else {
        surfaceY = bounds.maxY;
      }
      const spawnY = surfaceY + spawnSurfaceOffset;
      player.setPosition(new Vec3(spawnX, spawnY, spawnZ));
      respawnGroundY = surfaceY;

      // Tell the camera controller where the ground is for gravity calculations
      if (cameraController) {
        cameraController.groundHeight = surfaceY;
      }
      spawnResolved = true;
      console.log(
        `[Spawn] camera placed on terrain surface at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)}), surfaceY ${surfaceY.toFixed(2)}, seededRayY ${seededGroundY?.toFixed(2) ?? "n/a"}`,
      );
    }

    // If center spawn didn't work, search nearby positions for a valid ground hit
    if (!spawnResolved) {
      const fallbackCenter = opts.fallbackCenter ? opts.fallbackCenter() : new Vec3(0, 0, 0);
      const spawnCandidates: Vec3[] = [];
      const spawnSearchRadius = 24;
      const spawnSearchStep = 8;
      for (let x = -spawnSearchRadius; x <= spawnSearchRadius; x += spawnSearchStep) {
        for (let z = -spawnSearchRadius; z <= spawnSearchRadius; z += spawnSearchStep) {
          spawnCandidates.push(new Vec3(fallbackCenter.x + x, 0, fallbackCenter.z + z));
        }
      }

      let bestSpawnCandidate: Vec3 | undefined;
      let bestSpawnGroundY: number | undefined;
      for (const candidate of spawnCandidates) {
        const hitY = getHighestGroundHitY(app, candidate.x, candidate.z, "ground");
        if (hitY === undefined) continue;
        if (bestSpawnGroundY === undefined || hitY > bestSpawnGroundY) {
          bestSpawnGroundY = hitY;
          bestSpawnCandidate = candidate;
        }
      }

      if (bestSpawnCandidate && bestSpawnGroundY !== undefined) {
        const spawnY = bestSpawnGroundY + spawnSurfaceOffset;
        player.setPosition(new Vec3(bestSpawnCandidate.x, spawnY, bestSpawnCandidate.z));
        respawnGroundY = bestSpawnGroundY;
        if (cameraController) {
          cameraController.groundHeight = bestSpawnGroundY;
        }
        spawnResolved = true;
        console.log(
          `[Spawn] camera placed at (${bestSpawnCandidate.x.toFixed(2)}, ${spawnY.toFixed(2)}, ${bestSpawnCandidate.z.toFixed(2)}) from ground Y ${bestSpawnGroundY.toFixed(2)}`,
        );
      }
    }

    if (!spawnResolved) {
      console.warn("[Spawn] No valid ground-tagged spawn hit found; keeping default camera position");
    }

    return { entity: ground.modelEntity, bounds, respawnGroundY };
  } catch (error) {
    console.error("[Ground] model load failed", error);
    return { entity: undefined, bounds: undefined, respawnGroundY };
  }
}

/** Attach the shared "[Collision Contact]" debug logger to the rigidbody system. */
export function attachCollisionContactLogger(app: AppBase): void {
  const rigidbodySystem = (app.systems as any).rigidbody;
  if (rigidbodySystem && typeof rigidbodySystem.on === "function") {
    rigidbodySystem.on("contact", (contactResult: any) => {
      const posA = contactResult?.entityA?.getPosition?.();
      const posB = contactResult?.entityB?.getPosition?.();
      const nameA = contactResult?.entityA?.name ?? "?";
      const nameB = contactResult?.entityB?.name ?? "?";
      const contactPos = posA ?? posB;
      console.log(`[Collision Contact] "${nameA}" <-> "${nameB}" at (${contactPos?.x?.toFixed(2) ?? "?"}, ${contactPos?.y?.toFixed(2) ?? "?"}, ${contactPos?.z?.toFixed(2) ?? "?"})`);
    });
  } else {
    console.warn("[Collision] rigidbody system not available — contact logging disabled");
  }
}

export interface BattleLightingOpts {
  ambient?: [number, number, number];
  lightColor?: [number, number, number];
  intensity?: number;
  euler?: [number, number, number];
}

/**
 * Shared lighting rig: ambient + one shadow-casting directional light.
 * Defaults match the classic daytime battles (grey ambient, white sun at 45/30/0).
 */
export function addBattleLighting(app: AppBase, opts: BattleLightingOpts = {}): void {
  const [ar, ag, ab] = opts.ambient ?? [0.2, 0.2, 0.2];
  app.scene.ambientLight = new Color(ar, ag, ab);

  if (app.systems.light) {
    const light = new Entity("directional-light");
    const [lr, lg, lb] = opts.lightColor ?? [1, 1, 1];
    light.addComponent("light", {
      type: "directional",
      color: new Color(lr, lg, lb),
      intensity: opts.intensity ?? 1,
      castShadows: true,
    });
    const [ex, ey, ez] = opts.euler ?? [45, 30, 0];
    light.setLocalEulerAngles(ex, ey, ez);
    app.root.addChild(light);
  }
}

/** Get the app's rigidbody component system (used for NPC/boss spawning). */
export function getRigidbodySystem(app: AppBase): any {
  return (app.systems as any).rigidbody;
}

export interface WireBattleInputOpts {
  /** Weapon slot bound to KEY_2 (2 = era firearm, 4 = bow). */
  key2Weapon: number;
  /** Key for the scene's NPC update loop (e.g. "__legnicaNpcUpdate"). */
  updateKey: string;
  /** Total foes the HUD counts down from (NPC points + boss points). */
  initialTotal: number;
  /** Extra options spread into bindNpcCombatLoop (probes, obstacle flags, outline styling, ...). */
  combatLoopExtras?: Record<string, unknown>;
  /** Omit getPlayerHealth (scenes like Ridaniya never provided it; bosses then skip player-health combat context). */
  noPlayerHealth?: boolean;
  /** Skip the KEY_1/KEY_2 weapon-switch handler (scenes that never had one). */
  noWeaponKeys?: boolean;
}

/**
 * #6 — Wire keyboard weapon switching, the mousedown hit-test, and the NPC
 * combat loop for the standard single-wave battles. Multi-wave scenes
 * (Constantinople, Northwood) keep their own richer wiring.
 */
export function wireBattleInput(
  app: AppBase,
  player: any,
  npcs: NpcType[],
  opts: WireBattleInputOpts,
): void {
  const extras: Record<string, unknown> = { ...(opts.combatLoopExtras ?? {}) };
  if (!opts.noWeaponKeys) {
    app.keyboard?.on("keydown", (event: { key: number | null }) => {
      if (isDeathScreenVisible()) {
        return;
      }
      if (event.key === KEY_1) {
        player.equipWeapon(1);
        updateBattleHUD(player);
      } else if (event.key === KEY_2) {
        player.equipWeapon(opts.key2Weapon);
        updateBattleHUD(player);
      }
    });
  }

  const cameraController = player.getCameraController();

  app.mouse?.on("mousedown", (event: { x: number; y: number; button: number }) => {
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
      try {
        if ((hitNpc as any) instanceof Boss) {
          (hitNpc as unknown as Boss).updateHealthBar();
        }
      } catch (e) {
        // ignore
      }
    }
  });

  const extraBattleStatus = (extras.battleStatus as Record<string, unknown> | undefined) ?? {};
  delete extras.battleStatus;
  bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
    updateKey: opts.updateKey,
    ...(opts.noPlayerHealth ? {} : { getPlayerHealth: () => ({ current: player.getHealth(), max: player.getDebugState().maxHealth }) }),
    ...extras,
    battleStatus: {
      getCameraEntity: () => player.getCameraEntity(),
      initialTotal: opts.initialTotal,
      ...extraBattleStatus,
      onRemainingCountChange: (remaining: number) => updateBattleHUD(player, remaining),
    },
    onNpcAttack: (attacker: any, target: any, damage: number) => {
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
    onPlayerAttack: (attacker: any, damage: number) => {
      player.takeDamage(damage);
      updateBattleHUD(player);
      console.log(`Player hit by NPC ${attacker.getId()} for ${damage}, health now ${player.getHealth()}`);
    },
  } as any);
}

export interface BossSpawnStateMachine {
  /** True once a boss actually entered the world (drives the victory gate). */
  isSpawned(): boolean;
  /** True while an async spawn attempt is in flight. */
  isSpawning(): boolean;
  /** Reset both flags — call from the scene's resetXxxState(). */
  reset(): void;
  /**
   * Run a boss spawn through the shared wrapper: guards re-entry, merges
   * options with the ground fallback, pushes results into `npcs`, wires boss
   * health bars, and only marks the boss spawned when foes actually entered
   * (the noInstaWin rule — never set isBossSpawned on an empty spawn).
   */
  runBossSpawn(spawn: () => Promise<Array<unknown>>): Promise<void>;
}

/** Create the isBossSpawned/isBossSpawning state machine shared by all scenes. */
export function createBossSpawnState(): BossSpawnStateMachine {
  let spawned = false;
  let spawning = false;
  return {
    isSpawned: () => spawned,
    isSpawning: () => spawning,
    reset: () => {
      spawned = false;
      spawning = false;
    },
    runBossSpawn: async (spawn) => {
      if (spawned || spawning) return;
      spawning = true;
      try {
        const result = await spawn();
        for (const s of result) {
          if (s instanceof Boss) {
            s.drawHealthBar();
            Boss.setActiveBoss(s);
          }
        }
        spawned = bossActuallySpawned(result as any[]);
      } catch (err) {
        console.error("Failed to spawn boss:", err);
      } finally {
        spawning = false;
      }
    },
  };
}

export interface SpawnSceneBossOpts {
  app: AppBase;
  rigidbodySystem: any;
  npcs: Array<unknown>;
  spawnPoint: NpcSpawnPoint[];
  bossOptions: object;
  groundYFallback: number;
  /** Extra overrides merged after bossOptions + groundYFallback (e.g. probe depths). */
  extraOptions?: Record<string, unknown>;
}

/**
 * #7 — Standard single-call boss spawn: options + forced
 * `playerSafeRadius: 0` (bosses must always spawn even if the player stands
 * on the point), spawn, push into `npcs`. Returns the spawned list so the
 * caller hands it to `state.runBossSpawn` / `bossActuallySpawned`.
 */
export async function spawnSceneBoss(opts: SpawnSceneBossOpts): Promise<Array<unknown>> {
  const spawned = await spawnSceneNpcs(
    opts.app,
    opts.rigidbodySystem,
    opts.spawnPoint,
    {
      ...opts.bossOptions,
      groundYFallback: opts.groundYFallback,
      playerSafeRadius: 0,
      ...(opts.extraOptions ?? {}),
    } as any,
  );
  for (const s of spawned) {
    opts.npcs.push(s);
  }
  return spawned;
}

/** Recreate the HUD (used by the death-quiz revive callback). */
export function reviveHUD(player: any): void {
  createBattleHUD();
  updateBattleHUD(player);
}
