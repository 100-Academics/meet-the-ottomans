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
} from "playcanvas";

import { unloadAll } from '../../util/unloadall';
import { loadModel } from '../../util/loadModel';
import { createBattleHUD, removeBattleHUD, updateBattleHUD } from '../../util/battleHUD';
import { isDeathScreenVisible } from './deathScreen';

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { Player } from '../../player/player';
import type { Battle } from "../Battle";
import { bindNpcCombatLoop, spawnSceneNpcs, type NpcSpawnPoint } from "../npc/sceneNpcSystem";
import { CONSTANTINOPLE_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS } from "../npc/sceneNpcPresets";
import { changeScene } from "../../App";
import { Smoke } from "../doSmoke";

const groundModelPath = '/world/battlefields/Constantinople.glb';

function createNightSkyTexture(device: AppBase['graphicsDevice'], width = 2048, height = 1024): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return new Texture(device!, { mipmaps: true, name: 'constantinople-night-sky-fallback' });
	}

	const baseGradient = ctx.createLinearGradient(0, 0, 0, height);
	baseGradient.addColorStop(0, '#02030a');
	baseGradient.addColorStop(0.45, '#070d1f');
	baseGradient.addColorStop(1, '#090a12');
	ctx.fillStyle = baseGradient;
	ctx.fillRect(0, 0, width, height);

	const haze = ctx.createLinearGradient(0, height * 0.45, 0, height);
	haze.addColorStop(0, 'rgba(20, 34, 58, 0)');
	haze.addColorStop(1, 'rgba(28, 24, 22, 0.52)');
	ctx.fillStyle = haze;
	ctx.fillRect(0, 0, width, height);

	for (let i = 0; i < 1600; i += 1) {
		const x = Math.random() * width;
		const y = Math.random() * height * 0.92;
		const size = Math.random() < 0.92 ? 1 : 2;
		const alpha = 0.35 + Math.random() * 0.65;
		const tint = Math.random();
		const r = Math.floor(200 + tint * 55);
		const g = Math.floor(210 + tint * 40);
		const b = Math.floor(230 + tint * 25);
		ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
		ctx.fillRect(x, y, size, size);
	}

	const moonX = width * 0.79;
	const moonY = height * 0.21;
	const moonRadius = height * 0.09;
	const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 2.4);
	moonGlow.addColorStop(0, 'rgba(255, 245, 212, 0.52)');
	moonGlow.addColorStop(0.4, 'rgba(203, 222, 255, 0.26)');
	moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = moonGlow;
	ctx.beginPath();
	ctx.arc(moonX, moonY, moonRadius * 2.4, 0, Math.PI * 2);
	ctx.fill();

	const moonBody = ctx.createRadialGradient(moonX - moonRadius * 0.18, moonY - moonRadius * 0.22, moonRadius * 0.2, moonX, moonY, moonRadius);
	moonBody.addColorStop(0, 'rgba(255, 252, 236, 0.96)');
	moonBody.addColorStop(1, 'rgba(208, 214, 226, 0.96)');
	ctx.fillStyle = moonBody;
	ctx.beginPath();
	ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = 'rgba(175, 183, 198, 0.38)';
	for (let craterIndex = 0; craterIndex < 14; craterIndex += 1) {
		const craterAngle = Math.random() * Math.PI * 2;
		const craterDistance = Math.random() * moonRadius * 0.74;
		const craterX = moonX + Math.cos(craterAngle) * craterDistance;
		const craterY = moonY + Math.sin(craterAngle) * craterDistance;
		const craterRadius = moonRadius * (0.04 + Math.random() * 0.08);
		ctx.beginPath();
		ctx.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
		ctx.fill();
	}

	const texture = new Texture(device!, { mipmaps: true, name: 'constantinople-night-sky' });
	texture.setSource(canvas);
	return texture;
}

function addNightSkyDome(app: AppBase, cameraEntity: Entity): void {
	const skyMaterial = new StandardMaterial();
	skyMaterial.useLighting = false;
	skyMaterial.emissive.set(1, 1, 1);
	skyMaterial.emissiveMap = createNightSkyTexture(app.graphicsDevice);
	skyMaterial.cull = CULLFACE_FRONT;
	skyMaterial.update();

	const skyDome = new Entity('constantinople-night-sky-dome');
	const skyMesh = createSphere(app.graphicsDevice, {
		radius: 260,
		latitudeBands: 64,
		longitudeBands: 64
	});
	skyDome.addComponent('render', {
		meshInstances: [new MeshInstance(skyMesh, skyMaterial)]
	});
	skyDome.setPosition(cameraEntity.getPosition());
	app.root.addChild(skyDome);

	const keyedApp = app as AppBase & Record<string, unknown>;
	const skyFollowKey = '__constantinopleSkyFollowUpdate';
	const existingSkyFollow = keyedApp[skyFollowKey];
	if (typeof existingSkyFollow === 'function') {
		app.off('update', existingSkyFollow as (deltaTime: number) => void);
	}

	const followSky = () => {
		const cameraPos = cameraEntity.getPosition();
		skyDome.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
	};

	keyedApp[skyFollowKey] = followSky;
	app.on('update', followSky);
}

function addBattleSmokePlumes(
	app: AppBase,
	groundEntity: Entity | undefined,
	bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number } | undefined,
	groundY: number
): void {
	const smokeAnchors: Vec3[] = [];
	if (groundEntity) {
		const candidates: Array<{ x: number; y: number; z: number; score: number }> = [];
		const visit = (node: Entity) => {
			const meshInstances = node.render?.meshInstances;
			if (meshInstances && meshInstances.length > 0) {
				for (const meshInstance of meshInstances) {
					const aabb = meshInstance.aabb;
					if (!aabb) {
						continue;
					}

					const min = aabb.getMin();
					const max = aabb.getMax();
					if (
						!Number.isFinite(min.x) ||
						!Number.isFinite(min.y) ||
						!Number.isFinite(min.z) ||
						!Number.isFinite(max.x) ||
						!Number.isFinite(max.y) ||
						!Number.isFinite(max.z)
					) {
						continue;
					}

					const width = max.x - min.x;
					const depth = max.z - min.z;
					const height = max.y - min.y;
					const footprint = width * depth;

					// Prefer taller, wider structures so smoke appears to come out of building roofs.
					if (height < 6 || footprint < 20 || max.y < groundY + 4) {
						continue;
					}

					const centerX = (min.x + max.x) * 0.5;
					const centerZ = (min.z + max.z) * 0.5;
					candidates.push({
						x: centerX,
						y: max.y + 0.8,
						z: centerZ,
						score: height + Math.min(35, footprint * 0.15)
					});
				}
			}

			for (const child of node.children) {
				visit(child as Entity);
			}
		};

		visit(groundEntity);
		candidates.sort((a, b) => b.score - a.score);

		const minSpacing = 14;
		for (const candidate of candidates) {
			const tooClose = smokeAnchors.some((anchor) => {
				const dx = anchor.x - candidate.x;
				const dz = anchor.z - candidate.z;
				return Math.sqrt((dx * dx) + (dz * dz)) < minSpacing;
			});
			if (tooClose) {
				continue;
			}

			smokeAnchors.push(new Vec3(candidate.x, candidate.y, candidate.z));
			if (smokeAnchors.length >= 8) {
				break;
			}
		}
	}

	if (smokeAnchors.length === 0) {
		const centerX = bounds ? (bounds.minX + bounds.maxX) * 0.5 : 0;
		const centerZ = bounds ? (bounds.minZ + bounds.maxZ) * 0.5 : 0;
		const spanX = bounds ? Math.max(40, bounds.maxX - bounds.minX) : 120;
		const spanZ = bounds ? Math.max(40, bounds.maxZ - bounds.minZ) : 120;
		smokeAnchors.push(
			new Vec3(centerX - spanX * 0.25, groundY + 6, centerZ - spanZ * 0.12),
			new Vec3(centerX + spanX * 0.22, groundY + 6.5, centerZ + spanZ * 0.15),
			new Vec3(centerX, groundY + 7.2, centerZ)
		);
	}

	const smokeMaterial = new StandardMaterial();
	smokeMaterial.useLighting = false;
	smokeMaterial.emissive = new Color(0.2, 0.2, 0.2);
	smokeMaterial.diffuse = new Color(0.24, 0.24, 0.24);
	smokeMaterial.opacity = 0.22;
	smokeMaterial.depthWrite = false;
	smokeMaterial.update();

	const smokeRoot = new Entity('constantinople-smoke-root');
	const smokePuffs: Array<{
		entity: Entity;
		baseX: number;
		baseY: number;
		baseZ: number;
		riseSpeed: number;
		driftX: number;
		driftZ: number;
		maxRise: number;
	}> = [];
	for (const anchor of smokeAnchors) {
		for (let puffIndex = 0; puffIndex < 8; puffIndex += 1) {
			const puff = new Entity(`smoke-puff-${puffIndex}`);
			puff.addComponent('render', {
				type: 'sphere',
				material: smokeMaterial,
				castShadows: false,
				receiveShadows: false
			});

			const rise = puffIndex * 1.85;
			const offsetX = (Math.random() - 0.5) * (2.8 + puffIndex * 0.65);
			const offsetZ = (Math.random() - 0.5) * (2.8 + puffIndex * 0.65);
			const scale = 3.2 + puffIndex * 1.18;
			const startX = anchor.x + offsetX;
			const startY = anchor.y + rise;
			const startZ = anchor.z + offsetZ;

			puff.setPosition(startX, startY, startZ);
			puff.setLocalScale(scale, scale * 1.1, scale);
			smokeRoot.addChild(puff);
			smokePuffs.push({
				entity: puff,
				baseX: startX,
				baseY: anchor.y,
				baseZ: startZ,
				riseSpeed: 0.65 + Math.random() * 0.45,
				driftX: (Math.random() - 0.5) * 0.22,
				driftZ: (Math.random() - 0.5) * 0.22,
				maxRise: 14 + Math.random() * 8
			});
		}
	}

	app.root.addChild(smokeRoot);

	const keyedApp = app as AppBase & Record<string, unknown>;
	const smokeUpdateKey = '__constantinopleSmokeUpdate';
	const existingSmokeUpdate = keyedApp[smokeUpdateKey];
	if (typeof existingSmokeUpdate === 'function') {
		app.off('update', existingSmokeUpdate as (deltaTime: number) => void);
	}

	const smokeUpdate = (deltaTime: number) => {
		const dt = Math.max(0, Math.min(deltaTime, 0.05));
		for (const puff of smokePuffs) {
			const pos = puff.entity.getPosition();
			let nextY = pos.y + (puff.riseSpeed * dt);
			let nextX = pos.x + (puff.driftX * dt);
			let nextZ = pos.z + (puff.driftZ * dt);

			if ((nextY - puff.baseY) > puff.maxRise) {
				nextY = puff.baseY + Math.random() * 1.2;
				nextX = puff.baseX + (Math.random() - 0.5) * 1.4;
				nextZ = puff.baseZ + (Math.random() - 0.5) * 1.4;
			}

			puff.entity.setPosition(nextX, nextY, nextZ);
		}
	};

	keyedApp[smokeUpdateKey] = smokeUpdate;
	app.on('update', smokeUpdate);
}

/**
 * Checks if an entity or any of its parents in the hierarchy has the specified tag.
 * Walks up the parent chain from the given entity to see if the tag exists anywhere.
*
* USAGE: Called during raycasting to verify that a raycast hit an entity that has the desired tag
* (e.g., "ground"). This ensures we only consider valid hits and ignore collisions with other objects.
 */
function hasTagInHierarchy(entity: Entity | null, tag: string): boolean {
	// Start from the current entity and traverse upward
	let current: Entity | null = entity;
	while (current) {
		// If this entity has the tag, we found it
		if (current.tags?.has(tag)) {
			return true;
		}
		// Move to the parent and repeat
		current = (current.parent as Entity | null) ?? null;
	}
	// We've reached the root and didn't find the tag
	return false;
}

/**
 * Uses a physics raycast to find the highest point of ground-tagged objects at a given x,z position.
 * Shoots a ray downward from high up and returns the Y coordinate of the first ground it hits,
 * prioritizing the closest hit but falling back to the highest Y value if needed.
*
* USAGE: Called during scene initialization to determine the terrain height at specific positions,
* so we can spawn the player camera at the correct elevation (standing on top of the ground, not inside it).
 */
function getHighestGroundHitY(app: AppBase, x: number, z: number, groundTag: string): number | undefined {
	// Get the physics/rigidbody system from the app so we can do raycasts
	const rigidbodySystem = (app.systems as any).rigidbody as
		| {
				raycastAll?: (start: Vec3, end: Vec3) => Array<{ entity?: Entity | null; point?: Vec3; hitFraction?: number }> | undefined;
				raycastFirst?: (start: Vec3, end: Vec3) => { entity?: Entity | null; point?: Vec3 } | null;
			}
		| undefined;

	// If the physics system isn't available, we can't raycast
	if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== 'function') {
		console.log('[Raycast] rigidbody system or raycast function not available');
		return undefined;
	}

	// Define the ray: starting from high above and going downward to find ground
	const start = new Vec3(x, 300, z);
	const end = new Vec3(x, -300, z);

	// Try to get all collision hits along the ray (more reliable than just the first hit)
	if (typeof rigidbodySystem.raycastAll === 'function') {
		const hits = rigidbodySystem.raycastAll(start, end);
		if (hits && hits.length > 0) {
			// Track the closest hit (by hitFraction) and the highest Y coordinate
			let bestFraction = Number.POSITIVE_INFINITY;
			let bestFractionY: number | undefined;
			let highestY: number | undefined;
      
			for (const hit of hits) {
				// Skip if the hit point is invalid
				if (!hit?.point) {
					continue;
				}
				// Skip if the Y coordinate isn't a real number
				if (!Number.isFinite(hit.point.y)) {
					continue;
				}
        
				// Check if this hit is on an entity tagged as ground
				const hitEntity = hit.entity ?? null;
				if (!hasTagInHierarchy(hitEntity, groundTag)) {
					continue;
				}
        
				// If this is a closer hit than what we've seen, remember it
				const hitFraction = hit.hitFraction;
				if (typeof hitFraction === 'number' && Number.isFinite(hitFraction) && hitFraction < bestFraction) {
					bestFraction = hitFraction;
					bestFractionY = hit.point.y;
				}
        
				// Also track the overall highest Y coordinate we've seen
				if (highestY === undefined || hit.point.y > highestY) {
					highestY = hit.point.y;
				}
			}
      
			// Return the closest hit if we found one, otherwise fall back to the highest point
			if (bestFractionY !== undefined) {
				return bestFractionY;
			}
			if (highestY !== undefined) {
				return highestY;
			}
		}
	}

	// Fallback: if raycastAll didn't work or returned nothing, try the simpler raycastFirst
	const firstHit = rigidbodySystem.raycastFirst(start, end);
	if (!firstHit?.point) {
		return undefined;
	}

	// Make sure the hit is on a ground-tagged entity
	const firstEntity = firstHit.entity ?? null;
	if (!hasTagInHierarchy(firstEntity, groundTag)) {
		return undefined;
	}

	// Return the Y coordinate if it's a valid number
	return Number.isFinite(firstHit.point.y) ? firstHit.point.y : undefined;
}

/**
 * Recursively scans an entity and all its children to find the bounding box of all
 * renderable mesh instances. Returns the min/max X,Z coordinates and maximum Y.
 * Returns undefined if no renderable meshes were found.
*
* USAGE: Called during scene initialization to determine where the ground model is located,
* so we can calculate a good spawn point at the center of the visible terrain.
 */
function getRenderableBounds(entity: Entity): { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number } | undefined {
	// Initialize bounds to extreme values (will be updated as we find meshes)
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minZ = Number.POSITIVE_INFINITY;
	let maxZ = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let found = false;

	// Recursive function to walk through the entity hierarchy
	const visit = (node: Entity) => {
		// Get mesh instances (the actual renderable parts) from this entity
		const meshInstances = node.render?.meshInstances;
		if (meshInstances && meshInstances.length > 0) {
			// Check each mesh instance to update our bounds
			for (const meshInstance of meshInstances) {
				// Get the axis-aligned bounding box for this mesh
				const aabb = meshInstance.aabb;
				if (!aabb) {
					continue;
				}

				// Get the minimum and maximum corners of the bounding box
				const min = aabb.getMin();
				const max = aabb.getMax();
        
				// Skip if any coordinate is invalid (NaN, Infinity, etc.)
				if (
					!Number.isFinite(min.x) ||
					!Number.isFinite(min.z) ||
					!Number.isFinite(max.x) ||
					!Number.isFinite(max.y) ||
					!Number.isFinite(max.z)
				) {
					continue;
				}

				// Update our overall bounds to encompass this mesh
				minX = Math.min(minX, min.x);
				maxX = Math.max(maxX, max.x);
				minZ = Math.min(minZ, min.z);
				maxZ = Math.max(maxZ, max.z);
				maxY = Math.max(maxY, max.y);
				found = true;
			}
		}

		// Recursively visit all child entities
		for (const child of node.children) {
			visit(child as Entity);
		}
	};

	// Start the recursive traversal from the root entity
	visit(entity);

	// If we never found any meshes, return nothing
	if (!found) {
		return undefined;
	}

	// Return the calculated bounding box
	return { minX, maxX, minZ, maxZ, maxY };
}

/**
 * Main scene initialization for the Siege of Constantinople.
 * Sets up the 3D environment, camera, ground physics, lighting, and handles player spawning.
*
* USAGE: Called whenever the user enters the Siege of Constantinople scene (clicks on it from the main map view).
* This function replaces the globe view with a first-person 3D environment where the user can walk around
* the historical battlefield. The scene persists until the user exits back to the main view.
 */
export async function siegeOfConstantinopleScene(
	canvas: HTMLCanvasElement,
	app: AppBase,
	_onClick: (battle: Battle) => void,
	_sceneNum: number
) {
	// Clean up any previous scene assets and input listeners
	unloadAll(app);
	app.mouse?.off();
	app.keyboard?.off();

	if (!canvas) {
		throw new Error('Canvas not found');
	}

	// Hide the page overlay (UI text/info pills) while we're in the 3D scene
	const overlay = document.querySelector('.overlay') as HTMLElement | null;
	const hiddenMap = new Map<HTMLElement, string | null>();
	if (overlay) {
		// Save the original display style of each overlay element so we can restore it later
		const children = Array.from(overlay.children) as HTMLElement[];
		for (const child of children) {
			hiddenMap.set(child, child.style.display || null);
			child.style.display = 'none';
		}
	}

	// Hide the hover label that appears when you mouse over battlefields on the default globe
	const hoverLabel = document.getElementById('battle-hover-label');
	if (hoverLabel) {
		hoverLabel.style.display = 'none';
	}

	// Initialize the graphics device and app if this is the first time
	if (!app.graphicsDevice) {
		const device = await createGraphicsDevice(canvas);
		const createOptions = new AppOptions();
		createOptions.graphicsDevice = device;
		// Set up input handling (mouse, keyboard, touch)
		createOptions.mouse = new Mouse(document.body);
		createOptions.keyboard = new Keyboard(window);
		createOptions.touch = new TouchDevice(document.body);
		// Enable the component systems needed for rendering, physics, scripts, etc.
		createOptions.componentSystems = [
			RenderComponentSystem,
			CameraComponentSystem,
			ScriptComponentSystem,
			LightComponentSystem,
			CollisionComponentSystem,
			RigidBodyComponentSystem
		];
		// Set up asset handlers for textures and container models
		createOptions.resourceHandlers = [TextureHandler, ContainerHandler];

		// Initialize the app with all these settings
		app.init(createOptions);

		// Make sure we have keyboard input available
		if (!app.keyboard) {
				app.keyboard = new Keyboard(window);
		}

		// Configure the canvas to fill the window and auto-scale
		app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
		app.setCanvasResolution(RESOLUTION_AUTO);

		// Handle window resizing by updating the canvas
		const resize = () => app.resizeCanvas();
		window.addEventListener('resize', resize);
    
		// When the app is destroyed, clean up the resize listener and restore overlay
		app.once('destroy', () => {
			window.removeEventListener('resize', resize);
			// Restore overlay display values to what they were before
			for (const [el, prev] of hiddenMap.entries()) {
				if (prev === null) el.style.removeProperty('display');
				else el.style.display = prev;
			}
		});

		// Start the main game loop
		app.start();
	}

	// Ensure keyboard input is available
	if (!app.keyboard) {
		app.keyboard = new Keyboard(window);
	}

	// Load or find the environment map texture used for reflections and lighting
	const envAtlasAsset = app.assets.find('battle-env-atlas') ?? new Asset(
		'battle-env-atlas',
		'texture',
		{ url: '/environment-map.png' },
		{
			type: TEXTURETYPE_RGBP,  // RGBP = RGB + Parallax (for cubemap)
			mipmaps: false
		}
	);

	// Add the environment atlas to the asset registry if it's not already there
	if (!app.assets.find('battle-env-atlas')) {
		app.assets.add(envAtlasAsset);
	}

	// Wait for the environment map to load before proceeding
	await new Promise<void>((resolve) => {
		if (envAtlasAsset.loaded) {
			resolve();
			return;
		}
		new AssetListLoader([envAtlasAsset], app.assets).load(() => resolve());
	});

	// Apply the loaded environment map to the scene for reflections
	app.scene.envAtlas = envAtlasAsset.resource as Texture;

	// Create the player with camera and first-person controls
	const playerSpawn = new Vec3(0, 8, 8);
	const player = new Player(app, playerSpawn);
	let respawnPosition = playerSpawn.clone();
	let respawnGroundY = 0;
	let battlefieldBounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number } | undefined;
	player.setDeathQuizContext(2, () => {
		player.revive(respawnPosition);
		if (cameraController) {
			cameraController.groundHeight = respawnGroundY;
		}
		createBattleHUD();
		updateBattleHUD(player);
	});
	// Show the battle HUD immediately so it remains visible even if NPC loading is delayed.
	createBattleHUD();
	updateBattleHUD(player);
	const cameraController = player.getCameraController();
	const cameraEntity = player.getCameraEntity();
	app.scene.skyboxIntensity = 0.08;
	const skyboxLayer = app.scene.layers.getLayerByName('Skybox');
	if (skyboxLayer) {
		skyboxLayer.enabled = false;
	}
	addNightSkyDome(app, cameraEntity);
	if (cameraEntity.camera) {
		cameraEntity.camera.clearColor = new Color(0.01, 0.015, 0.03);
		cameraEntity.camera.clearColorBuffer = true;
	}

	// Load and set up the battlefield ground model
	try {

		const ground = await loadModel(groundModelPath, app, {
			rigidbodyType: 'static',  // Ground doesn't move, it's static
			includeDescendants: true, // Load child entities too
			position: new Vec3(0, 0, 0),
			rotation: new Vec3(0, 0, 0),
			scale: new Vec3(1, 1, 1)
		});
    
		// Name the ground and tag it so we can find it later with raycasts
		ground.modelEntity.name = 'ground';
		ground.modelEntity.tags.add('ground');

		// Debug logging to verify the collision system is working
		const groundRb = ground.modelEntity.rigidbody;
		const groundCol = ground.modelEntity.collision;
		const childColliders = (ground.modelEntity.children as Entity[]).filter(
			(c) => c.collision
		);
		console.log('[Ground] loaded', {
			path: groundModelPath,
			name: ground.modelName,
			hasRigidbody: !!groundRb,
			rigidbodyType: groundRb?.type,
			hasCollision: !!groundCol,
			collisionType: groundCol?.type,
			childColliderCount: childColliders.length,
			childColliderTypes: childColliders.map((c) => c.collision?.type),
			ammoRuntime: (globalThis as any).__ammoRuntime
		});

		// Warn if collision wasn't set up properly (raycasting won't work then)
		if (!groundRb && !groundCol && childColliders.length === 0) {
			console.error('[Ground] NO collision/rigidbody detected — raycasting will fail!');
		}

		// Try to spawn the player on top of the ground
		let spawnResolved = false;
		const spawnSurfaceOffset = (cameraController?.playerHeight ?? 2) + 0.05;  // Slightly above ground
		const bounds = getRenderableBounds(ground.modelEntity);
		battlefieldBounds = bounds;
    
		// If we got the bounds, spawn at the center of the ground surface
		if (bounds) {
			cameraController?.setMovementBounds(bounds, 2.5);
			const spawnX = (bounds.minX + bounds.maxX) * 0.5;
			const spawnZ = (bounds.minZ + bounds.maxZ) * 0.5;
			const seededGroundY = getHighestGroundHitY(app, spawnX, spawnZ, 'ground');
			const surfaceY = seededGroundY ?? bounds.maxY;  // Fall back to bounds if raycast fails
			const spawnY = surfaceY + spawnSurfaceOffset;
			player.setPosition(new Vec3(spawnX, spawnY, spawnZ));
			respawnPosition = player.getPosition().clone();
			respawnGroundY = surfaceY;

			// Tell the camera controller where the ground is for gravity calculations
			if (cameraController) {
				cameraController.groundHeight = surfaceY;
			}
			spawnResolved = true;
			console.log(
				`[Spawn] camera placed on terrain surface at (${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)}), surfaceY ${surfaceY.toFixed(2)}, seededRayY ${seededGroundY?.toFixed(2) ?? "n/a"}`
			);
		}

		// If center spawn didn't work, search nearby positions for a valid ground hit
		if (!spawnResolved) {
			const spawnCandidates: Vec3[] = [];
			const spawnSearchRadius = 24;
			const spawnSearchStep = 8;
			// Create a grid of candidate positions around the center
			for (let x = -spawnSearchRadius; x <= spawnSearchRadius; x += spawnSearchStep) {
				for (let z = -spawnSearchRadius; z <= spawnSearchRadius; z += spawnSearchStep) {
					spawnCandidates.push(new Vec3(x, 0, z));
				}
			}

			let bestSpawnCandidate: Vec3 | undefined;
			let bestSpawnGroundY: number | undefined;

			// Find the candidate position with the highest ground surface
			for (const candidate of spawnCandidates) {
				const hitY = getHighestGroundHitY(app, candidate.x, candidate.z, 'ground');
				if (hitY === undefined) {
					continue;
				}

				// Keep track of the highest valid ground position we found
				if (bestSpawnGroundY === undefined || hitY > bestSpawnGroundY) {
					bestSpawnGroundY = hitY;
					bestSpawnCandidate = candidate;
				}
			}

			// If we found a valid spawn position, use it
			if (bestSpawnCandidate && bestSpawnGroundY !== undefined) {
				const spawnY = bestSpawnGroundY + spawnSurfaceOffset;
				player.setPosition(new Vec3(bestSpawnCandidate.x, spawnY, bestSpawnCandidate.z));
				respawnPosition = player.getPosition().clone();
				respawnGroundY = bestSpawnGroundY;
				if (cameraController) {
					cameraController.groundHeight = bestSpawnGroundY;
				}
				spawnResolved = true;
				console.log(
					`[Spawn] camera placed at (${bestSpawnCandidate.x.toFixed(2)}, ${spawnY.toFixed(2)}, ${bestSpawnCandidate.z.toFixed(2)}) from ground Y ${bestSpawnGroundY.toFixed(2)}`
				);
			}
		}

		// If nothing worked, just log a warning and keep the default position
		if (!spawnResolved) {
			console.warn('[Spawn] No valid ground-tagged spawn hit found; keeping default camera position');
		}

		addBattleSmokePlumes(app, ground.modelEntity, battlefieldBounds, respawnGroundY);

	} catch (error) {
		console.error('[Ground] model load failed', error);
		addBattleSmokePlumes(app, undefined, battlefieldBounds, respawnGroundY);
	}


	// Set up physics collision logging to debug collisions
	const rigidbodySystem = (app.systems as any).rigidbody;
	if (rigidbodySystem && typeof rigidbodySystem.on === 'function') {
		// Listen for collision contacts and log them
		rigidbodySystem.on('contact', (contactResult: any) => {
			const posA = contactResult?.entityA?.getPosition?.();
			const posB = contactResult?.entityB?.getPosition?.();
			const nameA = contactResult?.entityA?.name ?? '?';
			const nameB = contactResult?.entityB?.name ?? '?';
			const contactPos = posA ?? posB;
			console.log(`[Collision Contact] "${nameA}" <-> "${nameB}" at (${contactPos?.x?.toFixed(2) ?? '?'}, ${contactPos?.y?.toFixed(2) ?? '?'}, ${contactPos?.z?.toFixed(2) ?? '?'})`);
		});
	} else {
		console.warn('[Collision] rigidbody system not available — contact logging disabled');
	}


	// Build a smoky, low-contrast battlefield atmosphere.
	app.scene.fog.type = 'none';

	// Set up basic scene lighting
	// Ambient light provides a baseline light level everywhere
	app.scene.ambientLight = new Color(0.055, 0.06, 0.085);

	// Create a directional light (like the sun) to cast shadows
	if (app.systems.light) {
		const light = new Entity('directional-light');
		light.addComponent('light', {
			type: 'directional',
			color: new Color(0.57, 0.63, 0.8),
			intensity: 0.36,
			castShadows: true  // This light casts shadows for realism
		});
		light.setLocalEulerAngles(26, -46, 0);  // Cooler moonlight direction.
		app.root.addChild(light);
	}

	const npcSpawnOptions = {
		...DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
		modelScale: new Vec3(2.2, 2.2, 2.2),
		hitboxRadius: 1.3,
		groundYFallback: respawnGroundY
	};
	const waveSize = 15;
	const targetWaveCount = 3;
	const waveSpawnPoints: NpcSpawnPoint[][] = [];
	const maxWaveCount = Math.min(
		targetWaveCount,
		Math.floor(CONSTANTINOPLE_NPC_SPAWN_POINTS.length / waveSize)
	);

	if (maxWaveCount < targetWaveCount) {
		console.warn(`[NPC] Constantinople only has spawn data for ${maxWaveCount} wave(s); requested ${targetWaveCount}.`);
	}

	for (let waveIndex = 0; waveIndex < maxWaveCount; waveIndex++) {
		const start = waveIndex * waveSize;
		const wavePoints = CONSTANTINOPLE_NPC_SPAWN_POINTS.slice(start, start + waveSize);
		if (wavePoints.length > 0) {
			waveSpawnPoints.push(wavePoints);
		}
	}

	if (waveSpawnPoints.length === 0) {
		console.warn('[NPC] Constantinople wave list is empty; spawning all available NPCs at once.');
		waveSpawnPoints.push(CONSTANTINOPLE_NPC_SPAWN_POINTS);
	}

	const totalWaveFoes = waveSpawnPoints.reduce((sum, wave) => sum + wave.length, 0);
	type SpawnedNpc = Awaited<ReturnType<typeof spawnSceneNpcs>>[number];
	let npcs: SpawnedNpc[] = [];
	let spawnedWaveFoes = 0;
	let currentWaveIndex = 0;
	let waveSpawnInProgress = false;

	const spawnWave = async (waveIndex: number): Promise<SpawnedNpc[]> => {
		const wavePoints = waveSpawnPoints[waveIndex] ?? [];
		if (wavePoints.length === 0) {
			return [];
		}

		let waveNpcs = await spawnSceneNpcs(app, rigidbodySystem, wavePoints, npcSpawnOptions);
		if (waveNpcs.length === 0) {
			console.warn(`[NPC] Constantinople wave ${waveIndex + 1} returned no soldiers on the first pass, retrying once`);
			waveNpcs = await spawnSceneNpcs(app, rigidbodySystem, wavePoints, npcSpawnOptions);
		}

		npcs.push(...waveNpcs);
		spawnedWaveFoes += wavePoints.length;
		return waveNpcs;
	};

	await spawnWave(currentWaveIndex);

	app.keyboard?.on('keydown', (event: { key: number | null }) => {
		if (isDeathScreenVisible()) {
			return;
		}

		if (event.key === KEY_1) {
			player.equipWeapon(1);
			updateBattleHUD(player);
		} else if (event.key === KEY_2) { 
			player.equipWeapon(3);
			updateBattleHUD(player);
		// } else if (event.key === KEY_3) { // unecessary weapon slot for this scene.
		// 	player.equipWeapon(3);
		// 	updateBattleHUD(player);
		}
	});

	app.mouse?.on('mousedown', (event: { x: number; y: number; button: number }) => {
		if (isDeathScreenVisible()) {
			return;
		}

		if (event.button !== 0) {
			return;
		}

		const isRangedEquipped = player.getEquippedWeaponName() === 'Gun' || player.getEquippedWeaponName() === 'Bow';
		const targetX = isRangedEquipped ? app.graphicsDevice.width * 0.5 : event.x;
		const targetY = isRangedEquipped ? app.graphicsDevice.height * 0.5 : event.y;
		const hitNpc = cameraController?.getClickedNpcInRange(targetX, targetY, npcs, player.getAttackRange());
		player.attack(hitNpc ?? null);
		updateBattleHUD(player);
		if (hitNpc) {
			console.log(`Hit NPC`);
		}
	});

	new Smoke(new Vec3 (215, 46.49, -304), new Vec3 (2, 2, 2), app);

	bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
		updateKey: '__constantinopleNpcUpdate',
		obstacleCollisionEnabled: true,
		obstacleIgnoreTags: ['ground'],
		disableMongolHordeSpawn: true,
		battleStatus: {
			getCameraEntity: () => player.getCameraEntity(),
			initialTotal: totalWaveFoes,
			alwaysOutline: true,
			outlineTargets: 'all',
			outlineColor: new Color(1, 0.9, 0.2),
			onRemainingCountChange: (remaining) => {
				const pendingFoes = Math.max(0, totalWaveFoes - spawnedWaveFoes);
				updateBattleHUD(player, remaining + pendingFoes);
			}
		},
		onNpcAttack: (attacker, target, damage) => {
			target.takeDamage(damage);
			console.log(`NPC ${attacker.getId()} (${attacker.getTeam()}) hit NPC ${target.getId()} for ${damage}.`);
		},
		onPlayerAttack: (attacker, damage) => {
			updateBattleHUD(player);
			player.takeDamage(damage);
			console.log(`Player hit by NPC ${attacker.getId()} for ${damage}, health now ${player.getHealth()}`);
		}
	});

	let victoryHandled = false;
	const spawnNextWave = () => {
		if (waveSpawnInProgress) {
			return;
		}

		const nextWaveIndex = currentWaveIndex + 1;
		if (nextWaveIndex >= waveSpawnPoints.length) {
			return;
		}

		waveSpawnInProgress = true;
		spawnWave(nextWaveIndex)
			.then(() => {
				currentWaveIndex = nextWaveIndex;
			})
			.catch((error) => {
				console.error(`[NPC] Failed to spawn Constantinople wave ${nextWaveIndex + 1}`, error);
			})
			.finally(() => {
				waveSpawnInProgress = false;
			});
	};

	const victoryCheck = () => {
		if (isDeathScreenVisible()) {
			return;
		}

		if (victoryHandled) {
			return;
		}

		const remainingFoes = npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive());
		if (remainingFoes.length === 0) {
			if (currentWaveIndex + 1 < waveSpawnPoints.length) {
				spawnNextWave();
				return;
			}

			victoryHandled = true;
			removeBattleHUD();
			changeScene(canvas, app, 777);
		}
	};

	app.on('update', victoryCheck);
}
