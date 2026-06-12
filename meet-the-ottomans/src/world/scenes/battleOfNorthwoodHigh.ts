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
 Mesh,
 BoxGeometry,
 SphereGeometry,
 CULLFACE_FRONT,
} from "playcanvas";

import { unloadAll } from "../../util/unloadall";
import {
 createBattleHUD,
 removeBattleHUD,
 updateBattleHUD,
} from "../../util/battleHUD";
import { isDeathScreenVisible } from "./deathScreen";
import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { bindNpcCombatLoop, spawnSceneNpcs } from "../npc/sceneNpcSystem";
import { Boss } from "../npc/bosses/boss";
import {
 AIR_LADIN_BOSS_SPAWN_OVERRIDES,
 TOWER_BOSS_SPAWN_OVERRIDES,
 NORTHWOOD_HIGH_AIR_LADIN_SPAWN_POINT,
 NORTHWOOD_HIGH_TOWER_SPAWN_POINT,
} from "../npc/sceneNpcPresets";
import { changeScene } from "../../App";
import { DevConsole } from "../../util/devConsole";

/**
 * Battle of Northwood High School — a white, featureless room.
 * Phase 1: Air Ladin boss fight.
 * Phase 2: After Air Ladin is defeated, Tower spawns.
 */

function createStarfieldTexture(
 device: AppBase["graphicsDevice"],
 width = 1024,
 height = 512,
): Texture {
 const canvas = document.createElement("canvas");
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext("2d");
 if (!ctx)
 return new Texture(device!, {
 mipmaps: true,
 name: "northwood-starfield-fallback",
 });
 
 // Cold, sterile white-grey gradient — nothing like the other starfields.
 const baseGradient = ctx.createLinearGradient(0, 0, width, height);
 baseGradient.addColorStop(0, "#1a1a1e");
 baseGradient.addColorStop(0.5, "#222228");
 baseGradient.addColorStop(1, "#1a1a1e");
 ctx.fillStyle = baseGradient;
 ctx.fillRect(0, 0, width, height);

 const starCount = 600;
 for (let i = 0; i < starCount; i += 1) {
 const x = Math.random() * width;
 const y = Math.random() * height;
 const size = Math.random() < 0.9 ? 1 : 2;
 const alpha = 0.3 + Math.random() * 0.5;
 ctx.fillStyle = `rgba(${180 + Math.floor(Math.random() * 40)}, ${180 + Math.floor(Math.random() * 40)}, ${190 + Math.floor(Math.random() * 30)}, ${alpha})`;
 ctx.fillRect(x, y, size, size);
 }

 const texture = new Texture(device!, {
 mipmaps: true,
 name: "northwood-starfield",
 });
 texture.setSource(canvas);
 return texture;
}

function createWhiteFloor(
 app: AppBase,
 position: Vec3,
 scale: Vec3,
): Entity {
 const floor = new Entity("white-floor");

 // White plane geometry for the floor
 const material = new StandardMaterial();
 material.diffuse.set(1, 1, 1);
 material.useLighting = true;
 material.update();

 const mesh = Mesh.fromGeometry(app.graphicsDevice, new BoxGeometry({
 halfExtents: new Vec3(scale.x / 2, 0.05, scale.z / 2),
 }));
 floor.addComponent("render", {
 meshInstances: [new MeshInstance(mesh, material)],
 });

 // Add collision for ground probing
 floor.addComponent("collision", {
 type: "box",
 halfExtents: new Vec3(scale.x / 2, 0.05, scale.z / 2),
 });
 floor.addComponent("rigidbody", {
 type: "static",
 });
 floor.tags.add("ground");

 floor.setPosition(position);
 return floor;
}

export async function battleOfNorthwoodHighScene(
 canvas: HTMLCanvasElement,
 app: AppBase,
 _onClick: (battle: Battle) => void,
 _sceneNum: number,
 spawnPoint?: [number, number, number],
) {
 unloadAll(app);
 app.mouse?.off();
 app.keyboard?.off();
 if (!canvas) throw new Error("Canvas not found");

 const overlay = document.querySelector(".overlay") as HTMLElement | null;
 const hiddenMap = new Map<HTMLElement, string | null>();
 if (overlay) {
 const children = Array.from(overlay.children) as HTMLElement[];
 for (const child of children) {
 hiddenMap.set(child, child.style.display || null);
 child.style.display = "none";
 }
 }

 const hoverLabel = document.getElementById("battle-hover-label");
 if (hoverLabel) hoverLabel.style.display = "none";

 if (!app.graphicsDevice) {
 const device = await createGraphicsDevice(canvas);
 const createOptions = new AppOptions();
 createOptions.graphicsDevice = device;
 createOptions.mouse = new Mouse(document.body);
 createOptions.keyboard = new Keyboard(window);
 createOptions.touch = new TouchDevice(document.body);
 createOptions.componentSystems = [
 RenderComponentSystem,
 CameraComponentSystem,
 ScriptComponentSystem,
 LightComponentSystem,
 CollisionComponentSystem,
 RigidBodyComponentSystem,
 ];
 createOptions.resourceHandlers = [TextureHandler, ContainerHandler];
 app.init(createOptions);
 if (!app.keyboard) app.keyboard = new Keyboard(window);
 app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
 app.setCanvasResolution(RESOLUTION_AUTO);
 const resize = () => app.resizeCanvas();
 window.addEventListener("resize", resize);
 app.once("destroy", () => {
 window.removeEventListener("resize", resize);
 for (const [el, prev] of hiddenMap.entries()) {
 if (prev === null) el.style.removeProperty("display");
 else el.style.display = prev;
 }
 });
 app.start();
 }
 if (!app.keyboard) app.keyboard = new Keyboard(window);

 // Load environment map for IBL lighting
 const envAtlasAsset =
 app.assets.find("battle-env-atlas") ??
 new Asset(
 "battle-env-atlas",
 "texture",
 { url: "/environment-map.png" },
 { type: TEXTURETYPE_RGBP, mipmaps: false },
 );
 if (!app.assets.find("battle-env-atlas")) app.assets.add(envAtlasAsset);
 await new Promise<void>((resolve) => {
 if (envAtlasAsset.loaded) {
 resolve();
 return;
 }
 new AssetListLoader([envAtlasAsset], app.assets).load(() => resolve());
 });
 app.scene.envAtlas = envAtlasAsset.resource as Texture;

 // Spawn player
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
 if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0.05, 0.05, 0.06);

 // Starfield dome — cold and distant
 const starMaterial = new StandardMaterial();
 starMaterial.useLighting = false;
 starMaterial.emissive.set(1, 1, 1);
 starMaterial.emissiveMap = createStarfieldTexture(app.graphicsDevice);
 starMaterial.cull = CULLFACE_FRONT;
 starMaterial.update();
 const starDome = new Entity("northwood-star-dome");
 const starMesh = Mesh.fromGeometry(app.graphicsDevice, new SphereGeometry({
 radius: 660,
 latitudeBands: 64,
 longitudeBands: 64,
 }));
 starDome.addComponent("render", {
 meshInstances: [new MeshInstance(starMesh, starMaterial)],
 });
 starDome.setPosition(cameraEntity.getPosition());
 app.root.addChild(starDome);
 app.on("update", () => starDome.setPosition(cameraEntity.getPosition()));

 // White flat floor — very small, placeholder-like
 const FLOOR_SIZE = 120;
 let groundY = 0;
 try {
 const whiteFloor = createWhiteFloor(app, new Vec3(0, 0, 0), new Vec3(FLOOR_SIZE, 1, FLOOR_SIZE));
 app.root.addChild(whiteFloor);

 // Use the floor as spawn reference
 groundY = 0.15; // slightly above the white floor surface
 const spawnY = groundY + (cameraController?.playerHeight ?? 2) + 0.05;
 player.setPosition(new Vec3(0, spawnY, FLOOR_SIZE * 0.4));
 respawnPosition = player.getPosition().clone();
 respawnGroundY = groundY;
 if (cameraController) cameraController.groundHeight = groundY;

 console.log(`[NorthwoodHigh] Spawn at (${player.getPosition().x.toFixed(2)}, ${spawnY.toFixed(2)}, ${player.getPosition().z.toFixed(2)})`);
 } catch (error) {
 console.error("[NorthwoodHigh] Floor creation failed", error);
 }

 // ── Two-phase boss fight ──
 const npcs: any[] = [];
 let phase: "airLadin" | "tower" = "airLadin";
 let towerSpawned = false;

 // Phase 1: Spawn Air Ladin (high in the air)
 const airLadinSpawnOptions = {
 ...AIR_LADIN_BOSS_SPAWN_OVERRIDES,
 modelHeightOffset: 20,
 groundYFallback: respawnGroundY,
 };

 try {
 const spawned = await spawnSceneNpcs(
 app,
 (app.systems as any).rigidbody,
 NORTHWOOD_HIGH_AIR_LADIN_SPAWN_POINT,
 airLadinSpawnOptions,
 );
 for (const s of spawned) {
 npcs.push(s);
 if (s instanceof Boss) {
 s.drawHealthBar();
 Boss.setActiveBoss(s);
 }
 }
 console.log("[NorthwoodHigh] Phase 1: Air Ladin spawned");
 } catch (err) {
 console.error("[NorthwoodHigh] Failed to spawn Air Ladin:", err);
 }

 // Spawn Tower when Air Ladin is defeated
 async function spawnTowerBoss(): Promise<void> {
 if (towerSpawned) return;
 towerSpawned = true;
 phase = "tower";

 console.log("[NorthwoodHigh] Air Ladin defeated — spawning Tower...");

 const towerSpawnOptions = {
 ...TOWER_BOSS_SPAWN_OVERRIDES,
 groundYFallback: respawnGroundY,
 };

  // Victory check
  let victoryHandled = false;
  app.on("update", () => {
    if (isDeathScreenVisible()) return;
    if (victoryHandled) return;
    const remainingFoes = npcs.filter(
      (currentNpc: any) =>
        currentNpc.getTeam() === "foe" && currentNpc.isAlive(),
    );
    if (remainingFoes.length === 0 && !DevConsole._roundLock) {
    	victoryHandled = true;
    	removeBattleHUD();
    	changeScene(canvas, app, 777);
    }
  });
 try {
 const spawned = await spawnSceneNpcs(
 app,
 (app.systems as any).rigidbody,
 NORTHWOOD_HIGH_TOWER_SPAWN_POINT,
 towerSpawnOptions,
 );
 for (const s of spawned) {
 npcs.push(s);
 if (s instanceof Boss) {
 s.drawHealthBar();
 Boss.setActiveBoss(s);
 s.showStatusText("??????????", 3000);
 }
 }
 console.log("[NorthwoodHigh] Phase 2: Tower spawned");
 } catch (err) {
 console.error("[NorthwoodHigh] Failed to spawn Tower:", err);
 }
 }

 // HUD
 createBattleHUD();
 updateBattleHUD(player);

 // Combat loop
 app.mouse?.on(
 "mousedown",
 (event: { x: number; y: number; button: number }) => {
 if (isDeathScreenVisible()) return;
 if (event.button !== 0) return;
 const hitNpc = cameraController?.getClickedNpcInRange(
 event.x,
 event.y,
 npcs,
 player.getAttackRange(),
 );
 player.attack(hitNpc ?? null);
 updateBattleHUD(player);
 if (hitNpc) {
 try {
 if ((hitNpc as unknown as Boss) instanceof Boss) {
 (hitNpc as unknown as Boss).updateHealthBar();
 }
 } catch (e) {}
 }
 },
 );

 bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
 updateKey: "__northwoodHighNpcUpdate",
 getPlayerHealth: () => ({
 current: player.getHealth(),
 max: player.getDebugState().maxHealth,
 }),
 battleStatus: {
 getCameraEntity: () => player.getCameraEntity(),
 initialTotal: 2, // Two bosses total
 onRemainingCountChange: (remaining) =>
 updateBattleHUD(player, remaining),
 },
 onNpcAttack: (_attacker, target, damage) => {
 target.takeDamage(damage);
 try {
 if ((target as unknown as Boss) instanceof Boss) {
 (target as unknown as Boss).updateHealthBar();
 }
 } catch (e) {}
 },
 onPlayerAttack: (_attacker, damage) => {
 player.takeDamage(damage);
 updateBattleHUD(player);
 },
 });

 // Victory + phase transition check
 let victoryHandled = false;
 app.on("update", () => {
 if (isDeathScreenVisible()) return;
 if (victoryHandled) return;

 const remainingFoes = npcs.filter(
 (currentNpc: any) =>
 currentNpc.getTeam() === "foe" && currentNpc.isAlive(),
 );

 // Phase transition: when Air Ladin dies and Tower hasn't spawned yet
 if (phase === "airLadin" && !towerSpawned) {
 const airLadinAlive = npcs.some(
 (currentNpc: any) =>
 currentNpc.getTeam() === "foe" &&
 currentNpc.isAlive() &&
 currentNpc instanceof Boss &&
 (currentNpc as Boss).getTitle() === "Air Ladin",
 );
 if (!airLadinAlive) {
 spawnTowerBoss();
 }
 }

 // Victory: all foes defeated (only after Tower phase has started)
 if (remainingFoes.length === 0 && (towerSpawned || phase === "tower")) {
 victoryHandled = true;
 removeBattleHUD();
 changeScene(canvas, app, 777);
 }
 });

 // Ambient lighting — cold and flat
 app.scene.ambientLight = new Color(0.15, 0.15, 0.15);
 if (app.systems.light) {
 const light = new Entity("directional-light");
 light.addComponent("light", {
 type: "directional",
 color: new Color(0.9, 0.9, 0.92),
 intensity: 1,
 castShadows: true,
 });
 light.setLocalEulerAngles(45, 30, 0);
 app.root.addChild(light);
 }
}
