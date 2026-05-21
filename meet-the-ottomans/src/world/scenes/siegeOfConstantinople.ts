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
	FILLMODE_FILL_WINDOW,
	RESOLUTION_AUTO,
	KEY_1,
	KEY_2,
	KEY_R,
} from "playcanvas";

import { unloadAll } from '../../util/unloadall';
import { loadModel } from '../../util/loadModel';
import { createBattleHUD, removeBattleHUD, updateBattleHUD } from '../../util/battleHUD';

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { Player } from '../../player/player';
import type { Battle } from "../Battle";
import { bindNpcCombatLoop, spawnSceneNpcs } from "../npc/sceneNpcSystem";
import { CONSTANTINOPLE_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS } from "../npc/sceneNpcPresets";
import { changeScene } from "../../App";

const groundModelPath = '/world/battlefields/Constantinople.glb';

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
	const player = new Player(app, new Vec3(0, 8, 8));
	player.setDeathQuizContext(2, () => {
		void siegeOfConstantinopleScene(canvas, app, _onClick, _sceneNum);
	});
	const cameraController = player.getCameraController();

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
    
		// If we got the bounds, spawn at the center of the ground surface
		if (bounds) {
			const spawnX = (bounds.minX + bounds.maxX) * 0.5;
			const spawnZ = (bounds.minZ + bounds.maxZ) * 0.5;
			const seededGroundY = getHighestGroundHitY(app, spawnX, spawnZ, 'ground');
			const surfaceY = seededGroundY ?? bounds.maxY;  // Fall back to bounds if raycast fails
			const spawnY = surfaceY + spawnSurfaceOffset;
			player.setPosition(new Vec3(spawnX, spawnY, spawnZ));

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

	} catch (error) {
		console.error('[Ground] model load failed', error);
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


	// Set up basic scene lighting
	// Ambient light provides a baseline light level everywhere
	app.scene.ambientLight = new Color(0.2, 0.2, 0.2);

	// Create a directional light (like the sun) to cast shadows
	if (app.systems.light) {
		const light = new Entity('directional-light');
		light.addComponent('light', {
			type: 'directional',
			color: new Color(1, 1, 1),  // White light
			intensity: 1,
			castShadows: true  // This light casts shadows for realism
		});
		light.setLocalEulerAngles(45, 30, 0);  // Light coming from above and at an angle
		app.root.addChild(light);
	}

	const npcs = await spawnSceneNpcs(app, rigidbodySystem, CONSTANTINOPLE_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS);

	// Create battle HUD to display weapon, health, and ammo
	createBattleHUD();
	updateBattleHUD(player);

	app.keyboard?.on('keydown', (event: { key: number | null }) => {
		if (event.key === KEY_1) {
			player.equipWeapon(1);
			updateBattleHUD(player);
		} else if (event.key === KEY_2) { 
			player.equipWeapon(3); // wrong time period for a gun
			updateBattleHUD(player);
		// } else if (event.key === KEY_3) { // unecessary weapon slot for this scene.
		// 	player.equipWeapon(3);
		// 	updateBattleHUD(player);
		} else if (event.key === KEY_R) {
			player.reloadEquippedWeapon();
			updateBattleHUD(player);
		}
	});

	app.mouse?.on('mousedown', (event: { x: number; y: number; button: number }) => {
		if (event.button !== 0) {
			return;
		}

		const hitNpc = cameraController?.getClickedNpcInRange(event.x, event.y, npcs, player.getAttackRange());
		player.attack(hitNpc ?? null);
		updateBattleHUD(player);
		if (hitNpc) {
			console.log(`Hit NPC`);
		}
	});

	bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
		updateKey: '__constantinopleNpcUpdate',
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
	const victoryCheck = () => {
		if (victoryHandled) {
			return;
		}

		const remainingFoes = npcs.filter((currentNpc) => currentNpc.getTeam() === 'foe' && currentNpc.isAlive());
		if (remainingFoes.length === 0) {
			victoryHandled = true;
			removeBattleHUD();
			changeScene(canvas, app, 777);
		}
	};

	app.on('update', victoryCheck);
}
