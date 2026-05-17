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
} from "playcanvas";

import { unloadAll } from '../../util/unloadall';
import { loadModel } from '../../util/loadModel';

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { FirstPersonCamera } from '../../util/FirstPersonCamera';
import type { Battle } from "../Battle";

export async function battleOfLegnicaScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  _onClick: (battle: Battle) => void,
  _sceneNum: number
) {
  unloadAll(app);
  app.mouse?.off();
  app.keyboard?.off();

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  // Hide page overlay (UI text/pills) while in this scene
  const overlay = document.querySelector('.overlay') as HTMLElement | null;
  const hiddenMap = new Map<HTMLElement, string | null>();
  if (overlay) {
    const children = Array.from(overlay.children) as HTMLElement[];
    for (const child of children) {
      hiddenMap.set(child, child.style.display || null);
      child.style.display = 'none';
    }
  }

  // Remove the hover label from the default scene globe
  const hoverLabel = document.getElementById('battle-hover-label');
  if (hoverLabel) {
    hoverLabel.style.display = 'none';
  }

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
      RigidBodyComponentSystem
    ];
    createOptions.resourceHandlers = [TextureHandler, ContainerHandler];

    app.init(createOptions);

    if (!app.keyboard) {
        app.keyboard = new Keyboard(window);
    }

    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);

    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);
    app.once('destroy', () => {
      window.removeEventListener('resize', resize);
      // restore overlay display values
      for (const [el, prev] of hiddenMap.entries()) {
        if (prev === null) el.style.removeProperty('display');
        else el.style.display = prev;
      }
    });



    app.start();
  }

  if (!app.keyboard) {
    app.keyboard = new Keyboard(window);
  }

  const envAtlasAsset = app.assets.find('battle-env-atlas') ?? new Asset(
    'battle-env-atlas',
    'texture',
    { url: '/environment-map.png' },
    {
      type: TEXTURETYPE_RGBP,
      mipmaps: false
    }
  );

  if (!app.assets.find('battle-env-atlas')) {
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

  // Create Camera
  const camera = new Entity('camera');
  camera.addComponent('camera', {
    clearColor: new Color(0.14117647, 0.14117647, 0.14117647),
    fov: 90
  });
  camera.setPosition(10, 10, 10);
  camera.lookAt(Vec3.ZERO);

  // Add Camera Controls
  camera.addComponent('script');
  const cameraController = camera.script?.create(FirstPersonCamera) as FirstPersonCamera | undefined;
  if (cameraController) {
    cameraController.groundTag = 'ground';
  }

  app.root.addChild(camera);

  // Create Ground
  try {
    const groundModelPath = '/world/battlefields/Huashan.glb';
    const ground = await loadModel(groundModelPath, app, {
      rigidbodyType: 'static',
      includeDescendants: true,
      position: new Vec3(0, 0, 0),
      rotation: new Vec3(0, 0, 0),
      scale: new Vec3(0.1, 0.1, 0.1)
    });
    ground.modelEntity.name = 'ground';
    ground.modelEntity.tags.add('ground');

    // Verify collision was applied
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

    if (!groundRb && !groundCol && childColliders.length === 0) {
      console.error('[Ground] NO collision/rigidbody detected — raycasting will fail!');
    }

  } catch (error) {
    console.error('[Ground] model load failed', error);
  }


  // Log all physics collision contacts to the console
  const rigidbodySystem = (app.systems as any).rigidbody;
  if (rigidbodySystem && typeof rigidbodySystem.on === 'function') {
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


  // Lighting
  app.scene.ambientLight = new Color(0.2, 0.2, 0.2);

  if (app.systems.light) {
    const light = new Entity('directional-light');
    light.addComponent('light', {
      type: 'directional',
      color: new Color(1, 1, 1),
      intensity: 1,
      castShadows: true
    });
    light.setLocalEulerAngles(45, 30, 0);
    app.root.addChild(light);
  }

}
