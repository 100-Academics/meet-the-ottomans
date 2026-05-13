import {
  createGraphicsDevice,
  AppBase,
  AppOptions,
  RenderComponentSystem,
  CameraComponentSystem,
  ScriptComponentSystem,
  TextureHandler,
  ContainerHandler,
  FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO,
  Entity,
  Color,
  Vec3,
  Picker,
  EVENT_MOUSEMOVE,
  EVENT_MOUSEUP,
  TouchDevice,
  Mouse,
  MeshInstance,
  Texture,
  StandardMaterial,
  Layer,
  Asset,
  AssetListLoader,
  TEXTURETYPE_RGBP,
  createSphere,
  EVENT_MOUSEDOWN,
} from 'playcanvas';
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';

import { throttle } from './utils';
import textureUrl from './assets/world/earth_texture.jpg'

// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereHeightmap } from '../scripts/world/sphereHeightmap.js';
// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereTexture } from '../scripts/world/sphereTexture.js';

const HOVER_COLOR = new Color(1, 0.647, 0);
const DEFAULT_COLOR = new Color(1, 1, 1);
const SPHERE_SEGMENTS = 256;

// Assets to load
const assets = {
  envAtlas: new Asset('env-atlas', 'texture', { url: '/environment-map.png' }, {
    type: TEXTURETYPE_RGBP,
    mipmaps: false
  })
};

/**
 * Setup the PlayCanvas app
 * @param canvas - The canvas element
 * @param onClick - The function to call when the user clicks on the sphere
 */
async function setupApp(canvas: HTMLCanvasElement, onClick: () => void) {

  if (!canvas) {
    throw new Error('Canvas not found');
  }

  // Create graphics device
  const device = await createGraphicsDevice(canvas);

  // Create app options
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

  // Create app
  const app = new AppBase(canvas);
  app.init(createOptions);

  // Set the canvas to fill the window
  app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(RESOLUTION_AUTO);

  // Ensure canvas is resized when window changes size
  const resize = () => app.resizeCanvas();
  window.addEventListener('resize', resize);

  app.once('destroy', () => {
    window.removeEventListener('resize', resize);
  });

  // Load assets
  await new Promise<void>((resolve) => {
    new AssetListLoader(Object.values(assets), app.assets).load(() => resolve());
  });

  app.start();

  // Set up environment lighting (no skybox, just IBL)
  app.scene.envAtlas = assets.envAtlas.resource as Texture;
  const skyboxLayer = app.scene.layers.getLayerByName('Skybox');
  if (skyboxLayer) {
    skyboxLayer.enabled = false;
  }

  // Create a new material
  const material = new StandardMaterial();
  material.diffuse.copy(DEFAULT_COLOR);
  (material as any).vertexColors = true;
  material.update();

  // Create sphere entity (heightmap-ready sphere)
  const sphere = new Entity('heightmap-sphere');
  sphere.setPosition(new Vec3(0, 0.5, 0));
  const sphereMesh = createSphere(app.graphicsDevice, {
    radius: 1,
    latitudeBands: SPHERE_SEGMENTS,
    longitudeBands: SPHERE_SEGMENTS
  });
  sphere.addComponent('render', {
    meshInstances: [new MeshInstance(sphereMesh, material)]
  });
  app.root.addChild(sphere);

  // Create camera entity
  const camera = new Entity('camera');
  camera.addComponent('camera', {
    clearColor: new Color(0.09, 0.09, 0.09)
  });
  camera.setPosition(new Vec3(4, 1, 4));
  app.root.addChild(camera);
  camera.lookAt(sphere.getPosition());

  // Create grid entity
  const grid = new Entity('grid');
  grid.addComponent('script');
  grid.script?.create(Grid);
  grid.setLocalScale(1000, 1000, 1000);
  app.root.addChild(grid);

  // Create a picker for mouse interaction
  const picker = new Picker(app, 1, 1);
  const worldLayer = app.scene.layers.getLayerByName('World');

  const intersectsSphere = (x: number, y: number, layer: Layer): Promise<boolean> => {
    if (!camera.camera) {
      return Promise.resolve(false);
    }

    const pickerScale = 0.5;
    picker.resize(canvas.clientWidth * pickerScale, canvas.clientHeight * pickerScale);

    if (!layer) {
      return Promise.resolve(false);
    }

    picker.prepare(camera.camera, app.scene, [layer]);

    return picker.getSelectionAsync(x * pickerScale, y * pickerScale, 1, 1).then((meshInstances): boolean => {
      const selectedMesh = meshInstances.find((instance): instance is MeshInstance => instance instanceof MeshInstance);
      if (!selectedMesh) return false;
      return selectedMesh === sphere.render?.meshInstances[0];
    });
  };

  let isDragging = false;

  app.mouse?.on(EVENT_MOUSEDOWN, (event) => {
    isDragging = event.button === 0;
  });

  app.mouse?.on(EVENT_MOUSEUP, () => {
    isDragging = false;
  });

  app.mouse?.on(EVENT_MOUSEMOVE, (event) => {
    if (isDragging) {
      sphere.rotateLocal(0, event.dx * 0.2, 0);
    }
  });

  // On mouse move, check if hovering over sphere and update cursor/color
  app.mouse?.on(EVENT_MOUSEMOVE, throttle((event) => {
    if (!worldLayer) return;
    intersectsSphere(event.x, event.y, worldLayer).then((intersects) => {
      material.diffuse.copy(intersects ? HOVER_COLOR : DEFAULT_COLOR);
      document.body.style.cursor = intersects ? 'pointer' : 'default';
      material.update();
    });
  }, 100));

  // On mouse up, check if clicked on sphere and call onClick
  app.mouse?.on(EVENT_MOUSEUP, (event) => {
    if (!worldLayer || !onClick) return;
    intersectsSphere(event.x, event.y, worldLayer).then((intersects) => {
      if (intersects) {
        onClick();
      }
    });
  });
  await applySphereTexture(sphere, textureUrl, device);
}

export { setupApp };
