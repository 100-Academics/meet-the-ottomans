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
  camera.script?.create(FirstPersonCamera);

  app.root.addChild(camera);

  // Create Ground
  try {
    const ground = await loadModel('/world/battlefields/huashan.glb', app, {
      rigidbodyType: 'static',
      includeDescendants: true,
      position: new Vec3(0, 0, 0),
      rotation: new Vec3(0, 0, 0),
      scale: new Vec3(0.001, 0.001, 0.001)
    });
    ground.modelEntity.name = 'ground';
    ground.modelEntity.tags.add('ground');
    console.log('Ground model loaded and added to scene', ground.modelName);

  } catch (error) {
    console.warn('Ground collision setup failed', error);
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

    // Example battle entity - replace with actual battle data and models
try {
  const model = await loadModel('/stanford_dragon_pbr.glb', app, { rigidbodyType: 'static' });
  const model2 = await loadModel('/stanford_dragon_pbr.glb', app, { rigidbodyType: 'static' });
  model.modelEntity.tags.add('model-obstacle');
  model2.modelEntity.tags.add('model-obstacle');
  console.log('Model loaded and added to scene', model.modelName);
  console.log('Model loaded and added to scene', model2.modelName);
  model2.modelEntity.setLocalPosition(5, 0, 0);  
  } catch (e) {
    console.error('Failed to load model:', e);
  }
  
}
