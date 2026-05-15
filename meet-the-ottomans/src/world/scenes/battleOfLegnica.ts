import {
  AppBase,
  Entity,
  Color,
  Vec3,
  Mouse,
  TouchDevice,
  createGraphicsDevice,
  AppOptions,
  RenderComponentSystem,
  CameraComponentSystem,
  ScriptComponentSystem,
  TextureHandler,
  ContainerHandler,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO
} from "playcanvas";

import { unloadAll } from '../../util/unloadall';

// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import type { Battle } from "../Battle";

export async function battleOfLegnicaScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  sceneNum: number,
  onClick: (battle: Battle) => void,
) {
  unloadAll(app);

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  if (!app.graphicsDevice) {
    const device = await createGraphicsDevice(canvas);

    const createOptions = new AppOptions();
    createOptions.graphicsDevice = device;
    createOptions.mouse = new Mouse(document.body);
    createOptions.touch = new TouchDevice(document.body);
    createOptions.componentSystems = [
      RenderComponentSystem,
      CameraComponentSystem,
      ScriptComponentSystem
    ];
    createOptions.resourceHandlers = [TextureHandler, ContainerHandler];

    app.init(createOptions);

    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);

    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);
    app.once('destroy', () => {
      window.removeEventListener('resize', resize);
    });

    app.start();
  }

  // Create Camera
  const camera = new Entity('camera');
  camera.addComponent('camera', {
    clearColor: new Color(0.1, 0.1, 0.1)
  });
  camera.setPosition(10, 10, 10);
  camera.lookAt(Vec3.ZERO);

  // Add Camera Controls
  camera.addComponent('script');
  camera.script?.create(CameraControls);

  app.root.addChild(camera);

  // Create Grid
  const grid = new Entity('grid');
  grid.addComponent('script');
  grid.script?.create(Grid);
  grid.setLocalScale(100, 100, 100);
  app.root.addChild(grid);

  // Lighting
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