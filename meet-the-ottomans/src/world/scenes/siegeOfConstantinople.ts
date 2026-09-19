import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Keyboard,
  Texture,
  StandardMaterial,
  MeshInstance,
  Mesh,
  SphereGeometry,
  CULLFACE_FRONT,
  KEY_1,
  KEY_2,
} from "playcanvas";

import { createBattleHUD, removeBattleHUD, updateBattleHUD } from "../../util/battleHUD";
import { isDeathScreenVisible } from "./deathScreen";

import { Player } from "../../player/player";
import type { Battle } from "../Battle";
import { Boss } from "../npc/bosses/boss";
import { bindNpcCombatLoop, spawnSceneNpcs, type NpcSpawnPoint } from "../npc/sceneNpcSystem";
import { CONSTANTINOPLE_BOSS_SPAWN_POINT, CONSTANTINOPLE_NPC_SPAWN_POINTS, DEFAULT_BATTLE_NPC_SPAWN_OPTIONS, DEFAULT_CHRIST_BOSS_SPAWN_OPTIONS } from "../npc/sceneNpcPresets";
import { triggerVictory } from "../../App";
import { Smoke } from "../doSmoke";
import { getScreenCenter } from "../../util/battleSceneHelpers";
import { bindSceneListener } from "../../util/sceneCleanup";
import { bossActuallySpawned } from "../../util/victoryCheck";
import {
  ensureBattleApp,
  enterBattleScene,
  loadBattleEnvAtlas,
  loadBattleGround,
  attachCollisionContactLogger,
  getRigidbodySystem,
} from "../../util/battleSceneSetup";

const groundModelPath = '/world/battlefields/Constantinople.glb';

var isBossSpawned = false;
var isBossSpawning = false;

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
	const moonY = height * 0.28;
	const moonRadius = height * 0.07;
	const moonAspect = 1.35;
	const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 2.4);
	moonGlow.addColorStop(0, 'rgba(255, 245, 212, 0.52)');
	moonGlow.addColorStop(0.4, 'rgba(203, 222, 255, 0.26)');
	moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = moonGlow;
	ctx.beginPath();
	ctx.ellipse(moonX, moonY, moonRadius * 2.4 * moonAspect, moonRadius * 2.4, 0, 0, Math.PI * 2);
	ctx.fill();

	const moonBody = ctx.createRadialGradient(moonX - moonRadius * 0.18, moonY - moonRadius * 0.22, moonRadius * 0.2, moonX, moonY, moonRadius);
	moonBody.addColorStop(0, 'rgba(255, 252, 236, 0.96)');
	moonBody.addColorStop(1, 'rgba(208, 214, 226, 0.96)');
	ctx.fillStyle = moonBody;
	ctx.beginPath();
	ctx.ellipse(moonX, moonY, moonRadius * moonAspect, moonRadius, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = 'rgba(175, 183, 198, 0.38)';
	for (let craterIndex = 0; craterIndex < 14; craterIndex += 1) {
		const craterAngle = Math.random() * Math.PI * 2;
		const craterDistance = Math.random() * moonRadius * 0.74;
		const craterX = moonX + Math.cos(craterAngle) * craterDistance;
		const craterY = moonY + Math.sin(craterAngle) * craterDistance;
		const craterRadius = moonRadius * (0.04 + Math.random() * 0.08);
		ctx.beginPath();
		ctx.ellipse(craterX, craterY, craterRadius * moonAspect, craterRadius, 0, 0, Math.PI * 2);
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
	const skyMesh = Mesh.fromGeometry(app.graphicsDevice, new SphereGeometry({
		radius: 260,
		latitudeBands: 64,
		longitudeBands: 64
	}));
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
	bindSceneListener(app, 'update', followSky);
}

function addBattleSmokePlumes(
	app: AppBase,
	groundEntity: Entity | undefined,
	bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number } | undefined,
	groundY: number
): void {
	const smokeAnchors: Vec3[] = [];
	if (groundEntity) {
		const candidates: Array<{ x: number; y: number; z: number; width: number; depth: number; score: number }> = [];
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
						width,
						depth,
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

		const minSpacing = 10;
		const maxAnchors = 24;
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
			if (smokeAnchors.length >= maxAnchors) {
				break;
			}

			const rooftopOffsets = [
				[-0.22, -0.18],
				[0.24, -0.12],
				[-0.18, 0.2],
				[0.18, 0.16]
			];

			for (const [offsetXFactor, offsetZFactor] of rooftopOffsets) {
				if (smokeAnchors.length >= maxAnchors) {
					break;
				}

				const offsetCandidate = new Vec3(
					candidate.x + (candidate.width * offsetXFactor),
					candidate.y,
					candidate.z + (candidate.depth * offsetZFactor)
				);
				const offsetTooClose = smokeAnchors.some((anchor) => {
					const dx = anchor.x - offsetCandidate.x;
					const dz = anchor.z - offsetCandidate.z;
					return Math.sqrt((dx * dx) + (dz * dz)) < minSpacing;
				});
				if (!offsetTooClose) {
					smokeAnchors.push(offsetCandidate);
				}
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
		for (let puffIndex = 0; puffIndex < 10; puffIndex += 1) {
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
	bindSceneListener(app, 'update', smokeUpdate);
}

function resetConstantinopleBattleState(): void {
	isBossSpawned = false;
	isBossSpawning = false;
}

export async function siegeOfConstantinopleScene(
	canvas: HTMLCanvasElement,
	app: AppBase,
	_onClick: (battle: Battle) => void,
	_sceneNum: number,
	spawnPoint?: [number, number, number]
) {
	resetConstantinopleBattleState();

	const hiddenMap = enterBattleScene(app);

	if (!canvas) {
		throw new Error('Canvas not found');
	}

	await ensureBattleApp(canvas, app, hiddenMap);

	if (!app.keyboard) {
		app.keyboard = new Keyboard(window);
	}

	await loadBattleEnvAtlas(app);

	// Create the player with camera and first-person controls
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
	const groundResult = await loadBattleGround(app, groundModelPath, player, { movementBounds: true });
	respawnPosition = player.getPosition().clone();
	respawnGroundY = groundResult.respawnGroundY;
	const battlefieldBounds = groundResult.bounds;
	addBattleSmokePlumes(app, groundResult.entity, battlefieldBounds, respawnGroundY);

	attachCollisionContactLogger(app);
	const rigidbodySystem = getRigidbodySystem(app);

	// Build a smoky, low-contrast battlefield atmosphere.
	app.scene.fog.type = 'none';

	// Set up basic scene lighting — moonlit night.
	app.scene.ambientLight = new Color(0.055, 0.06, 0.085);

	if (app.systems.light) {
		const light = new Entity('directional-light');
		light.addComponent('light', {
			type: 'directional',
			color: new Color(0.57, 0.63, 0.8),
			intensity: 0.36,
			castShadows: true
		});
		light.setLocalEulerAngles(26, -46, 0); // Cooler moonlight direction.
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

	const totalWaveFoes = waveSpawnPoints.reduce((sum, wave) => sum + wave.length, 0) + CONSTANTINOPLE_BOSS_SPAWN_POINT.length;
	type SpawnedNpc = Awaited<ReturnType<typeof spawnSceneNpcs>>[number];
	let npcs: SpawnedNpc[] = [];
	let spawnedWaveFoes = 0;
	let currentWaveIndex = 0;
	let waveSpawnInProgress = false;

	const spawnBoss = async (): Promise<void> => {
		if (isBossSpawned || isBossSpawning) {
			return;
		}

		isBossSpawning = true;

		try {
			const bossSpawnOptions = {
				...DEFAULT_CHRIST_BOSS_SPAWN_OPTIONS,
				groundYFallback: respawnGroundY
			};
			const spawned = await spawnSceneNpcs(app, rigidbodySystem, CONSTANTINOPLE_BOSS_SPAWN_POINT, bossSpawnOptions);
			for (const spawnedNpc of spawned) {
				npcs.push(spawnedNpc);
				if (spawnedNpc instanceof Boss) {
					spawnedNpc.drawHealthBar();
					Boss.setActiveBoss(spawnedNpc);
				}
			}
			spawnedWaveFoes += spawned.length;
			isBossSpawned = bossActuallySpawned(spawned);
		} catch (error) {
			console.error('[NPC] Failed to spawn Constantinople boss', error);
		} finally {
			isBossSpawning = false;
		}
	};

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

	new Smoke(new Vec3 (215, 46.49, -304), new Vec3 (2, 2, 2), app);
	new Smoke(new Vec3 (-184, 47, -314), new Vec3 (2, 2, 2), app);

	bindNpcCombatLoop(app, npcs, () => player.getCameraEntity(), {
		updateKey: '__constantinopleNpcUpdate',
		getPlayerHealth: () => ({ current: player.getHealth(), max: player.getDebugState().maxHealth }),
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
			if (target instanceof Boss) {
				target.updateHealthBar();
			}
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

			if (isBossSpawning) {
				// Boss spawn in flight — wait for it; never auto-win while it resolves.
				return;
			}

			if (!isBossSpawned) {
				spawnBoss().catch((error) => console.error(error));
				return;
			}

		victoryHandled = true;
		removeBattleHUD();
		// Siege of Constantinople is the canonical entry for both "Siege of
		// Constantinople" and "Fall of Constantinople" in the campaign map, so
		// marking the one battle completes them both. triggerVictory() is
		// called with the canonical name so the battleProgress aliasing handles
		// the dual-mark.
		triggerVictory('Siege of Constantinople', canvas, app);
		}
	};

	bindSceneListener(app, 'update', victoryCheck);
}
