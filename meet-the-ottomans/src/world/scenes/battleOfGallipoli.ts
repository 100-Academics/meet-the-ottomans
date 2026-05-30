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
  createSphere,
  CULLFACE_FRONT,
} from 'playcanvas';

import { unloadAll } from '../../util/unloadall';
import { loadModel } from '../../util/loadModel';
import { createBattleHUD, removeBattleHUD, updateBattleHUD } from '../../util/battleHUD';
import { isDeathScreenVisible } from './deathScreen';
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { Player } from '../../player/player';
import type { Battle } from '../Battle';
import { bindNpcCombatLoop, spawnSceneNpcs } from '../npc/sceneNpcSystem';
import { Boss } from '../npc/bosses/boss';
import { DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, DEFAULT_KHAN_BOSS_SPAWN_OPTIONS, LEGNICA_BOSS_SPAWN_POINT, LEGNICA_NPC_SPAWN_POINTS } from '../npc/sceneNpcPresets';
import { Mongol } from '../npc/troops/mongol';
import { npc } from '../npc/npc';
import { changeScene } from '../../App';

const groundModelPath = '/world/battlefields/gallipoli.glb';

var isBossSpawned = false;
var isBossSpawning = false;

function resetGallipoliBattleState(): void {
  isBossSpawned = false;
  isBossSpawning = false;
  Mongol.resetBattleState();
}

function hasTagInHierarchy(entity: Entity | null, tag: string): boolean {
  let current: Entity | null = entity;
  while (current) {
    if (current.tags?.has(tag)) return true;
    current = (current.parent as Entity | null) ?? null;
  }
  return false;
}

function getHighestGroundHitY(app: AppBase, x: number, z: number, groundTag: string): number | undefined {
  const rigidbodySystem = (app.systems as any).rigidbody as any;
  if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== 'function') return undefined;
  const start = new Vec3(x, 300, z);
  const end = new Vec3(x, -300, z);
  if (typeof rigidbodySystem.raycastAll === 'function') {
    const hits = rigidbodySystem.raycastAll(start, end);
    if (hits && hits.length > 0) {
      let bestFraction = Number.POSITIVE_INFINITY;
      let bestFractionY: number | undefined;
      let highestY: number | undefined;
      for (const hit of hits) {
        if (!hit?.point) continue;
        if (!Number.isFinite(hit.point.y)) continue;
        const hitEntity = hit.entity ?? null;
        if (!hasTagInHierarchy(hitEntity, groundTag)) continue;
        const hitFraction = hit.hitFraction;
        if (typeof hitFraction === 'number' && Number.isFinite(hitFraction) && hitFraction < bestFraction) {
          bestFraction = hitFraction;
          bestFractionY = hit.point.y;
        }
        if (highestY === undefined || hit.point.y > highestY) highestY = hit.point.y;
      }
      if (bestFractionY !== undefined) return bestFractionY;
      if (highestY !== undefined) return highestY;
    }
  }
  const firstHit = rigidbodySystem.raycastFirst(start, end);
  if (!firstHit?.point) return undefined;
  const firstEntity = firstHit.entity ?? null;
  if (!hasTagInHierarchy(firstEntity, groundTag)) return undefined;
  return Number.isFinite(firstHit.point.y) ? firstHit.point.y : undefined;
}

function getRenderableBounds(entity: Entity): { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number } | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;
  const visit = (node: Entity) => {
    const meshInstances = node.render?.meshInstances;
    if (meshInstances && meshInstances.length > 0) {
      for (const meshInstance of meshInstances) {
        const aabb = meshInstance.aabb;
        if (!aabb) continue;
        const min = aabb.getMin();
        const max = aabb.getMax();
        if (!Number.isFinite(min.x) || !Number.isFinite(min.z) || !Number.isFinite(max.x) || !Number.isFinite(max.y) || !Number.isFinite(max.z)) continue;
        minX = Math.min(minX, min.x);
        maxX = Math.max(maxX, max.x);
        minZ = Math.min(minZ, min.z);
        maxZ = Math.max(maxZ, max.z);
        maxY = Math.max(maxY, max.y);
        found = true;
      }
    }
    for (const child of node.children) visit(child as Entity);
  };
  visit(entity);
  if (!found) return undefined;
  return { minX, maxX, minZ, maxZ, maxY };
}

function createStarfieldTexture(device: AppBase['graphicsDevice'], width = 1024, height = 512): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Texture(device!, { mipmaps: true, name: 'gallipoli-starfield-fallback' });
  const baseGradient = ctx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, '#000000'); baseGradient.addColorStop(0.5, '#04040b'); baseGradient.addColorStop(1, '#000000'); ctx.fillStyle = baseGradient; ctx.fillRect(0,0,width,height);
  const nebulae = [ { x: width * 0.2, y: height * 0.3, r: width * 0.18, color: 'rgba(70, 120, 255, 0.16)' }, { x: width * 0.7, y: height * 0.22, r: width * 0.14, color: 'rgba(160, 110, 255, 0.12)' }, { x: width * 0.75, y: height * 0.7, r: width * 0.22, color: 'rgba(60, 190, 255, 0.14)' } ];
  nebulae.forEach((nebula) => { const glow = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r); glow.addColorStop(0, nebula.color); glow.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(nebula.x, nebula.y, nebula.r, 0, Math.PI * 2); ctx.fill(); });
  const starCount = 1200; for (let i = 0; i < starCount; i += 1) { const x = Math.random() * width; const y = Math.random() * height; const size = Math.random() < 0.9 ? 1 : 2; const alpha = 0.45 + Math.random() * 0.55; const tint = Math.random(); const r = Math.floor(190 + tint * 60); const g = Math.floor(200 + tint * 45); const b = Math.floor(230 + tint * 25); ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`; ctx.fillRect(x, y, size, size); }
  for (let i = 0; i < 70; i += 1) { const x = Math.random() * width; const y = Math.random() * height; const glow = ctx.createRadialGradient(x, y, 0, x, y, 6); glow.addColorStop(0, 'rgba(230, 245, 255, 0.85)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
  const texture = new Texture(device!, { mipmaps: true, name: 'gallipoli-starfield' }); texture.setSource(canvas); return texture;
}

export async function battleOfGallipoliScene(canvas: HTMLCanvasElement, app: AppBase, _onClick: (battle: Battle) => void, _sceneNum: number, spawnPoint?: [number, number, number]) {
  resetGallipoliBattleState(); unloadAll(app); app.mouse?.off(); app.keyboard?.off(); if (!canvas) throw new Error('Canvas not found'); const overlay = document.querySelector('.overlay') as HTMLElement | null; const hiddenMap = new Map<HTMLElement, string | null>(); if (overlay) { const children = Array.from(overlay.children) as HTMLElement[]; for (const child of children) { hiddenMap.set(child, child.style.display || null); child.style.display = 'none'; } } const hoverLabel = document.getElementById('battle-hover-label'); if (hoverLabel) hoverLabel.style.display = 'none'; if (!app.graphicsDevice) { const device = await createGraphicsDevice(canvas); const createOptions = new AppOptions(); createOptions.graphicsDevice = device; createOptions.mouse = new Mouse(document.body); createOptions.keyboard = new Keyboard(window); createOptions.touch = new TouchDevice(document.body); createOptions.componentSystems = [RenderComponentSystem, CameraComponentSystem, ScriptComponentSystem, LightComponentSystem, CollisionComponentSystem, RigidBodyComponentSystem]; createOptions.resourceHandlers = [TextureHandler, ContainerHandler]; app.init(createOptions); if (!app.keyboard) app.keyboard = new Keyboard(window); app.setCanvasFillMode(FILLMODE_FILL_WINDOW); app.setCanvasResolution(RESOLUTION_AUTO); const resize = () => app.resizeCanvas(); window.addEventListener('resize', resize); app.once('destroy', () => { window.removeEventListener('resize', resize); for (const [el, prev] of hiddenMap.entries()) { if (prev === null) el.style.removeProperty('display'); else el.style.display = prev; } }); app.start(); }
  if (!app.keyboard) app.keyboard = new Keyboard(window);
  const envAtlasAsset = app.assets.find('battle-env-atlas') ?? new Asset('battle-env-atlas', 'texture', { url: '/environment-map.png' }, { type: TEXTURETYPE_RGBP, mipmaps: false }); if (!app.assets.find('battle-env-atlas')) app.assets.add(envAtlasAsset); await new Promise<void>((resolve) => { if (envAtlasAsset.loaded) { resolve(); return; } new AssetListLoader([envAtlasAsset], app.assets).load(() => resolve()); }); app.scene.envAtlas = envAtlasAsset.resource as Texture;
  const playerSpawn = new Vec3(...(spawnPoint ?? [0, 8, 8])); const player = new Player(app, playerSpawn); let respawnPosition = playerSpawn.clone(); let respawnGroundY = 0; player.setDeathQuizContext(1, () => { player.revive(respawnPosition); if (cameraController) cameraController.groundHeight = respawnGroundY; createBattleHUD(); updateBattleHUD(player); }); const cameraController = player.getCameraController(); const cameraEntity = player.getCameraEntity(); if (cameraEntity.camera) cameraEntity.camera.clearColor = new Color(0,0,0);
  const starMaterial = new StandardMaterial(); starMaterial.useLighting = false; starMaterial.emissive.set(1,1,1); starMaterial.emissiveMap = createStarfieldTexture(app.graphicsDevice); starMaterial.cull = CULLFACE_FRONT; starMaterial.update(); const starDome = new Entity('gallipoli-star-dome'); const starMesh = createSphere(app.graphicsDevice, { radius: 220, latitudeBands: 64, longitudeBands: 64 }); starDome.addComponent('render', { meshInstances: [new MeshInstance(starMesh, starMaterial)] }); starDome.setPosition(cameraEntity.getPosition()); app.root.addChild(starDome); app.on('update', () => starDome.setPosition(cameraEntity.getPosition()));
  try { const ground = await loadModel(groundModelPath, app, { rigidbodyType: 'static', includeDescendants: true, position: new Vec3(0,0,0), rotation: new Vec3(0,0,0), scale: new Vec3(1,1,1) }); ground.modelEntity.name = 'ground'; ground.modelEntity.tags.add('ground'); const groundRb = ground.modelEntity.rigidbody; const groundCol = ground.modelEntity.collision; const childColliders = (ground.modelEntity.children as Entity[]).filter((c) => c.collision); console.log('[Ground] loaded', { path: groundModelPath, name: ground.modelName, hasRigidbody: !!groundRb, rigidbodyType: groundRb?.type, hasCollision: !!groundCol, collisionType: groundCol?.type, childColliderCount: childColliders.length, childColliderTypes: childColliders.map((c) => c.collision?.type), ammoRuntime: (globalThis as any).__ammoRuntime }); if (!groundRb && !groundCol && childColliders.length === 0) { console.error('[Ground] NO collision/rigidbody detected — raycasting will fail!'); } let spawnResolved = false; const spawnSurfaceOffset = (cameraController?.playerHeight ?? 2) + 0.05; const bounds = getRenderableBounds(ground.modelEntity); if (bounds) { const spawnX = (bounds.minX + bounds.maxX) * 0.5; const spawnZ = (bounds.minZ + bounds.maxZ) * 0.5; const seededGroundY = getHighestGroundHitY(app, spawnX, spawnZ, 'ground'); const surfaceY = seededGroundY ?? bounds.maxY; const spawnY = surfaceY + spawnSurfaceOffset; player.setPosition(new Vec3(spawnX, spawnY, spawnZ)); respawnPosition = player.getPosition().clone(); respawnGroundY = surfaceY; if (cameraController) cameraController.groundHeight = surfaceY; spawnResolved = true; console.log(`[Spawn] camera placed on terrain surface at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)}), surfaceY ${surfaceY.toFixed(2)}, seededRayY ${seededGroundY?.toFixed(2) ?? "n/a"}`); } if (!spawnResolved) { const spawnCandidates: Vec3[] = []; const spawnSearchRadius = 24; const spawnSearchStep = 8; for (let x = -spawnSearchRadius; x <= spawnSearchRadius; x += spawnSearchStep) { for (let z = -spawnSearchRadius; z <= spawnSearchRadius; z += spawnSearchStep) { spawnCandidates.push(new Vec3(x, 0, z)); } } let bestSpawnCandidate: Vec3 | undefined; let bestSpawnGroundY: number | undefined; for (const candidate of spawnCandidates) { const hitY = getHighestGroundHitY(app, candidate.x, candidate.z, 'ground'); if (hitY === undefined) continue; if (bestSpawnGroundY === undefined || hitY > bestSpawnGroundY) { bestSpawnGroundY = hitY; bestSpawnCandidate = candidate; } } if (bestSpawnCandidate && bestSpawnGroundY !== undefined) { const spawnY = bestSpawnGroundY + spawnSurfaceOffset; player.setPosition(new Vec3(bestSpawnCandidate.x, spawnY, bestSpawnCandidate.z)); respawnPosition = player.getPosition().clone(); respawnGroundY = bestSpawnGroundY; if (cameraController) cameraController.groundHeight = bestSpawnGroundY; spawnResolved = true; console.log(`[Spawn] camera placed at (${bestSpawnCandidate.x.toFixed(2)}, ${spawnY.toFixed(2)}, ${bestSpawnCandidate.z.toFixed(2)}) from ground Y ${bestSpawnGroundY.toFixed(2)}`); } } if (!spawnResolved) { console.warn('[Spawn] No valid ground-tagged spawn hit found; keeping default camera position'); } } catch (error) { console.error('[Ground] model load failed', error); }
  const rigidbodySystem = (app.systems as any).rigidbody; if (rigidbodySystem && typeof rigidbodySystem.on === 'function') { rigidbodySystem.on('contact', (contactResult: any) => { const posA = contactResult?.entityA?.getPosition?.(); const posB = contactResult?.entityB?.getPosition?.(); const nameA = contactResult?.entityA?.name ?? '?'; const nameB = contactResult?.entityB?.name ?? '?'; const contactPos = posA ?? posB; console.log(`[Collision Contact] "${nameA}" <-> "${nameB}" at (${contactPos?.x?.toFixed(2) ?? '?'}, ${contactPos?.y?.toFixed(2) ?? '?'}, ${contactPos?.z?.toFixed(2) ?? '?'})`); }); } else { console.warn('[Collision] rigidbody system not available — contact logging disabled'); }
  app.scene.ambientLight = new Color(0.2, 0.2, 0.2); if (app.systems.light) { const light = new Entity('directional-light'); light.addComponent('light', { type: 'directional', color: new Color(1,1,1), intensity: 1, castShadows: true }); light.setLocalEulerAngles(45,30,0); app.root.addChild(light); }
  const npcSpawnOptions = { ...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, groundYFallback: respawnGroundY };
  const npcs = await spawnSceneNpcs(app, rigidbodySystem, LEGNICA_NPC_SPAWN_POINTS, npcSpawnOptions);
  createBattleHUD(); updateBattleHUD(player);
  app.keyboard?.on('keydown', (event: { key: number | null }) => { if (isDeathScreenVisible()) return; if (event.key === KEY_1) { player.equipWeapon(1); updateBattleHUD(player); } else if (event.key === KEY_2) { player.equipWeapon(3); updateBattleHUD(player); } });
  app.mouse?.on('mousedown', (event: { x: number; y: number; button: number }) => { if (isDeathScreenVisible()) return; if (event.button !== 0) return; const isGunEquipped = (player.getEquippedWeaponName() === 'Gun' || player.getEquippedWeaponName() === 'Bow'); const targetX = isGunEquipped ? app.graphicsDevice.width * 0.5 : event.x; const targetY = isGunEquipped ? app.graphicsDevice.height * 0.5 : event.y; const hitNpc = cameraController?.getClickedNpcInRange(targetX, targetY, npcs, player.getAttackRange()); player.attack(hitNpc ?? null); updateBattleHUD(player); if (hitNpc) { console.log(`Hit NPC`); try { if ((hitNpc as any) instanceof Boss) { (hitNpc as unknown as Boss).updateHealthBar(); } } catch (e) {} } });
  bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), { updateKey: '__gallipoliNpcUpdate', getPlayerHealth: () => ({ current: player.getHealth(), max: player.getDebugState().maxHealth }), battleStatus: { getCameraEntity: () => player.getCameraEntity(), initialTotal: LEGNICA_NPC_SPAWN_POINTS.length + LEGNICA_BOSS_SPAWN_POINT.length, onRemainingCountChange: (remaining) => updateBattleHUD(player, remaining) }, onNpcAttack: (attacker, target, damage) => { target.takeDamage(damage); try { if ((target as any) instanceof Boss) { (target as unknown as Boss).updateHealthBar(); } } catch (e) {} console.log(`NPC ${attacker.getId()} (${attacker.getTeam()}) hit NPC ${target.getId()} for ${damage}.`); }, onPlayerAttack: (attacker, damage) => { player.takeDamage(damage); updateBattleHUD(player); console.log(`Player hit by NPC ${attacker.getId()} for ${damage}, health now ${player.getHealth()}`); } });
  let victoryHandled = false; const victoryCheck = () => { if (isDeathScreenVisible()) return; if (victoryHandled) return; const remainingFoes = npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive()); if (remainingFoes.length === 0 && isBossSpawned) { victoryHandled = true; removeBattleHUD(); changeScene(canvas, app, 777); } else if (remainingFoes.length === 0 && !isBossSpawned) { spawnBoss(app, rigidbodySystem, npcs, respawnGroundY).catch((err) => console.error(err)); } };
  app.on('update', victoryCheck);
}

async function spawnBoss(app: AppBase, rigidbodySystem: any, npcs: npc[], groundYFallback: number): Promise<void> { if (isBossSpawned || isBossSpawning) return; isBossSpawning = true; try { const bossSpawnOptions = { ...DEFAULT_KHAN_BOSS_SPAWN_OPTIONS, groundYFallback }; const spawned = await spawnSceneNpcs(app, rigidbodySystem, LEGNICA_BOSS_SPAWN_POINT, bossSpawnOptions); for (const s of spawned) { npcs.push(s); if (s instanceof Boss) s.drawHealthBar(); } isBossSpawned = true; } catch (err) { console.error('Failed to spawn boss:', err); } finally { isBossSpawning = false; } }
