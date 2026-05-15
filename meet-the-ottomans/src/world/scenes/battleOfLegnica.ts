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
  TextureHandler,
  ContainerHandler,
  StandardMaterial,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO
} from "playcanvas";

import { unloadAll } from '../../util/unloadall';

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
import { FirstPersonCamera } from '../../util/FirstPersonCamera';
import type { Battle } from "../Battle";

export async function battleOfLegnicaScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  onClick: (battle: Battle) => void,
  sceneNum: number
) {
  unloadAll(app);

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
      LightComponentSystem
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
  const material = new StandardMaterial();
  material.diffuse = new Color(0.1, 0.4, 0.1);
  material.update();

  const ground = new Entity('ground');
  ground.addComponent('render', {
      type: 'box',
      material: material
  });
  ground.setLocalScale(100, 1, 100);
  ground.setLocalPosition(0, -0.6, 0);
  app.root.addChild(ground);

  // Create Grid
  const grid = new Entity('grid');
  grid.addComponent('script');
  grid.script?.create(Grid);
  grid.setLocalScale(100, 100, 100);
  app.root.addChild(grid);

  // Lighting
  app.scene.ambientLight = new Color(0.2, 0.2, 0.2);

  const light = new Entity('directional-light');
  light.addComponent('light', {
    type: 'directional',
    color: new Color(1, 1, 1),
    intensity: 1,
    castShadows: true
  });
  light.setLocalEulerAngles(45, 30, 0);
  app.root.addChild(light);

    // Example battle entity - replace with actual battle data and models
app.assets.loadFromUrl('/stanford_dragon_pbr.glb', 'container', function (err, asset) {
  if (err) {
    console.error('Failed to load model:', err);
    return;
  }
  
  if (!asset || !asset.resource) {
    console.error('Asset loaded but no resource found');
    return;
  }

  // FIX: Use the specific engine method to spawn the GLB entity hierarchy
  const modelEntity = asset.resource.instantiateRenderEntity();
  
  modelEntity.name = 'Battle of Legnica';
  modelEntity.setLocalPosition(0, 0, -5);
  modelEntity.setLocalEulerAngles(0, 90, 90);
  modelEntity.setLocalScale(0.05, 0.05, 0.05); // Keeping scale small because 1 is huge apparently
  
  app.root.addChild(modelEntity);
  console.log('Model loaded and added to scene');
});

}