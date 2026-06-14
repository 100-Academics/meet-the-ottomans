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
 StandardMaterial,
 MeshInstance,
 FILLMODE_FILL_WINDOW,
 RESOLUTION_AUTO,
 Mesh,
 BoxGeometry,
 SphereGeometry,
 CULLFACE_FRONT,
 KEY_1,
 KEY_2,
 Texture,
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
import { Secret } from "../secrets";
import {
 AIR_LADIN_BOSS_SPAWN_OVERRIDES,
 TOWER_BOSS_SPAWN_OVERRIDES,
 NORTHWOOD_HIGH_AIR_LADIN_SPAWN_POINT,
 NORTHWOOD_HIGH_TOWER_SPAWN_POINT,
} from "../npc/sceneNpcPresets";
import { changeScene } from "../../App";

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
color?: Color,
): Entity {
const floor = new Entity("white-floor");

// Gray plane geometry for the floor
const material = new StandardMaterial();
const floorColor = color ?? new Color(0.4, 0.4, 0.45);
material.diffuse.set(floorColor.r, floorColor.g, floorColor.b);
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
 // No environment map / IBL for this scene — avoids "spotlight/city" reflections on the large white floor.

 // Spawn player
 const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8]));
 const player = new Player(app, playerSpawn);
 let respawnPosition = playerSpawn.clone();
 let respawnGroundY = 0;
 player.setDeathQuizContext(7, () => {
  player.revive(respawnPosition);
  if (cameraController) cameraController.groundHeight = respawnGroundY;
  createBattleHUD();
  player.equipWeapon(2); // Re-equip Gun after revival
  updateBattleHUD(player);
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
 // Sprite dome — enclosing the arena
 const starDome = new Entity("northwood-star-dome");
 const starMesh = Mesh.fromGeometry(app.graphicsDevice, new SphereGeometry({
 radius: 500,
 latitudeBands: 64,
 longitudeBands: 64,
 }));
 starDome.addComponent("render", {
 meshInstances: [new MeshInstance(starMesh, starMaterial)],
 });
 starDome.setPosition(cameraEntity.getPosition());
 app.root.addChild(starDome);
 app.on("update", () => starDome.setPosition(cameraEntity.getPosition()));

 // White flat floor — 10x bigger arena for the boss fight
 const PHASE1_FLOOR_SIZE = 400;
 const PHASE2_FLOOR_SIZE = 800;
 let groundY = 0;
 let whiteFloor: Entity | null = null;
 let floorCollision: any = null;
 try {
 whiteFloor = createWhiteFloor(app, new Vec3(0, 0, 0), new Vec3(PHASE1_FLOOR_SIZE, 1, PHASE1_FLOOR_SIZE), new Color(0.4, 0.4, 0.45));
 app.root.addChild(whiteFloor);
 floorCollision = whiteFloor.collision;

 // Use the floor as spawn reference
 groundY = 0.15; // slightly above the white floor surface
 const spawnY = groundY + (cameraController?.playerHeight ?? 2) + 0.05;
 player.setPosition(new Vec3(0, spawnY, PHASE1_FLOOR_SIZE * 0.4));
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
 let towerSpawnInProgress = false;

 // Phase 1: Spawn Air Ladin
 const airLadinSpawnOptions = {
 ...AIR_LADIN_BOSS_SPAWN_OVERRIDES,
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
 if (towerSpawned || towerSpawnInProgress) return;
 towerSpawnInProgress = true;
 towerSpawned = true;
 phase = "tower";

 console.log("[NorthwoodHigh] Air Ladin defeated — spawning Tower...");

 const towerSpawnOptions = {
 ...TOWER_BOSS_SPAWN_OVERRIDES,
 groundYFallback: respawnGroundY,
 };

 try {
 console.log("[NorthwoodHigh] Tower spawn options:", towerSpawnOptions);
 const spawned = await spawnSceneNpcs(
 app,
 (app.systems as any).rigidbody,
 NORTHWOOD_HIGH_TOWER_SPAWN_POINT,
 towerSpawnOptions,
 );
 console.log("[NorthwoodHigh] Tower spawn result count:", spawned.length);
 for (const s of spawned) {
 npcs.push(s);
 if (s instanceof Boss) {
 console.log("[NorthwoodHigh] Tower boss instance created, drawing health bar...");
 s.drawHealthBar();
 Boss.setActiveBoss(s);
 s.showStatusText("??????????", 3000);
 console.log("[NorthwoodHigh] Tower health bar should be visible now");
 }
 }
 console.log("[NorthwoodHigh] Phase 2: Tower spawned");
 towerSpawnInProgress = false;

 // Expand the floor for the Tower phase
 if (whiteFloor) {
 const scaleRatio = PHASE2_FLOOR_SIZE / PHASE1_FLOOR_SIZE;
 whiteFloor.setLocalScale(scaleRatio, 1, scaleRatio);
 if (floorCollision) {
 floorCollision.halfExtents = new Vec3(PHASE2_FLOOR_SIZE / 2, 0.05, PHASE2_FLOOR_SIZE / 2);
 }
 console.log(`[NorthwoodHigh] Floor expanded to ${PHASE2_FLOOR_SIZE}x${PHASE2_FLOOR_SIZE}`);
 }
 } catch (err) {
 console.error("[NorthwoodHigh] Failed to spawn Tower:", err);
 }
 }

 // HUD
 createBattleHUD();
 player.equipWeapon(2); // Start with Gun (slot 2), not oldGun
 updateBattleHUD(player);

 // Weapon switching
 app.keyboard?.on("keydown", (event: { key: number | null }) => {
 if (isDeathScreenVisible()) return;
 if (event.key === KEY_1) {
 player.equipWeapon(1);
 updateBattleHUD(player);
 } else if (event.key === KEY_2) {
 player.equipWeapon(2);
 updateBattleHUD(player);
 }
 });

 // Combat loop
 app.mouse?.on(
 "mousedown",
 (event: { x: number; y: number; button: number }) => {
 if (isDeathScreenVisible()) return;
 if (event.button !== 0) return;
 const isGunEquipped = player.getEquippedWeaponName() === "Gun";
 const targetX = isGunEquipped ? app.graphicsDevice.width * 0.5 : event.x;
 const targetY = isGunEquipped ? app.graphicsDevice.height * 0.5 : event.y;
 const hitNpc = cameraController?.getClickedNpcInRange(
 targetX,
 targetY,
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
 // Must wait for tower spawn to complete before checking victory
 if (remainingFoes.length === 0 && towerSpawned && !towerSpawnInProgress) {
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

   // Ground-snap the secret so its base sits on the actual battlefield surface;
   // the player spawn lands around y≈8 in this scene, so a hardcoded y=1 would
   // bury the model. We use the same raycast helper the player spawn uses
   // (`getHighestGroundHitY` against the 'ground'-tagged entity) and fall back
   // to the player's surface Y if the raycast at this X/Z misses.
   const secretGroundY = getHighestGroundHitY(app, 3, -5, 'ground') ?? respawnGroundY;
   // The loader applies a default rotation of (0, 90, 90) when none is given
   // (see src/util/loadModel.ts), which tips jar.glb on its side. Setting
   // (0, 0, 0) tells the loader to use the model's raw .glb orientation so it
   // stands upright. Tweak these three angles if the model still looks wrong.
   const secretRotation = new Vec3(0, 0, 0);
   const secret = new Secret({
     app,
     cameraEntity: player.getCameraEntity(),
     modelPath: "models/jar.glb",
     position: new Vec3(3, secretGroundY + 1, -5),
     scale: new Vec3(0.5, 0.5, 0.5),
     rotation: secretRotation
   });
   await secret.spawn();
}
