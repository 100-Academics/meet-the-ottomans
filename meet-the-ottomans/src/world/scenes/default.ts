import {
  createGraphicsDevice,
  AppBase,
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
  Asset,
  AssetListLoader,
  TEXTURETYPE_RGBP,
  createSphere,
  EVENT_MOUSEDOWN,
} from "playcanvas";
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';

import { throttle } from '../../utils';
import textureUrl from '../../assets/world/earth_texture.jpg'
import { Battle } from '../Battle';
import { Question } from '../../util/question';

// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereHeightmap } from '../../../scripts/world/sphereHeightmap.js';
// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereTexture } from '../../../scripts/world/sphereTexture.js';
import { unloadAll } from '../../util/unloadall';
import { battleOfLegnicaScene } from "./battleOfLegnica.js";

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

function pointOnSphere(radius: number, phi: number, theta: number): Vec3 {
  return new Vec3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function normalOnSphere(point: Vec3): Vec3 {
  return point.clone().normalize();
}

function latLonToSpherical(lat: number, lon: number): { phi: number; theta: number } {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  return {
    phi: Math.PI / 2 - latRad,
    theta: Math.PI / 2 - lonRad
  };
}

async function defaultScene(
  canvas: HTMLCanvasElement,
  app: AppBase,
  onClick: (battle: Battle) => void,
  getSelectedTimePeriod: () => number,
  sceneNum: number
) {

unloadAll(app);
  // precision on location here is very arbitrary. Four decimals should be enough.
  const battles = [new Battle(1, [51.145278, 16.222778], "Battle of Legnica", new Entity()),
                   new Battle(1, [32.5486, 35.4161], "Battle of Ain Jalut", new Entity()),
                   new Battle(1, [41.0151, 28.9793], "Siege of Constantinople", new Entity()),
                   new Battle(2, [50.4637, 2.1389], "Battle of Agincourt", new Entity()),
                   new Battle(2, [47.9025, 1.9090], "Siege of Orléans", new Entity()),
                   new Battle(2, [41.0151, 28.9793], "Fall of Constantinople", new Entity()),
                   new Battle(3, [38.25, 21.25], "Battle of Lepanto", new Entity()),
                   new Battle(3, [45.183, 9.150], "Battle of Pavia (Italian Wars)", new Entity()),
                   new Battle(3, [48.2017, 16.3350], "Siege of Vienna", new Entity()), // winged hussars my goat
                   new Battle(4, [37.2388, -76.5098], "Battle of Yorktown", new Entity()),
                   new Battle(4, [49.128, 16.763], "Battle of Three Emperors", new Entity()),
                   new Battle(4, [39.8309, -77.2333], "Battle of Gettysburg", new Entity()),
                   new Battle(5, [49.20806, 5.42194], "Battle of Verdun", new Entity()),
                   new Battle(5, [40.23923, 26.27684], "Battle of Gallipoli", new Entity()),
                   new Battle(5, [48.8024, 44.6053], "Battle of Stalingrad", new Entity()),
                   new Battle(6, [40.4833, 127.2000], "Battle of Chosin Reservoir", new Entity()),
                   new Battle(6, [10.82310, 106.62966], "Fall of Saigon", new Entity()),
                   new Battle(6, [30.56, 32.32], " Operation Abirey-Halev", new Entity())
                   
                  ];
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
    ScriptComponentSystem,
    LightComponentSystem,
    CollisionComponentSystem,
    RigidBodyComponentSystem
  ];
  createOptions.resourceHandlers = [TextureHandler, ContainerHandler];

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

  // Create overlay UI
  const overlay = document.querySelector('.absolute.overlay') as HTMLElement;
  let count = 0;
  let selectedTimePeriod = -1;
  const overlayHTML = `
    <div class="absolute overlay">
      <div class="grow">
        <header>
        </header>
      </div>
      <div>
        <span id="counter" class="pill">
          Click Count: ${count}
        </span>
        <p>
          Edit <code>src/App.ts</code> and save to test HMR
        </p>
        <div class="pill" id="question-wrap">
          <div id="question-text">(no question loaded)</div>
          <div class="btn-row">
            <button id="yes-btn" class="btn">Load question (test)</button>
          </div>
        </div>
        <div class="pill" id="time-periods">
          <div id="Selection">(Select thet time period you want!)</div>
          <div id="time-period">(no time period selected)</div>
          <div class="btn-row">
            <button id="period1-btn" class="btn">1200-1300</button>
            <button id="period2-btn" class="btn">1400-1500</button>
            <button id="period3-btn" class="btn">1500-1650</button>
            <button id="period4-btn" class="btn">1750-1900</button>
            <button id="period5-btn" class="btn">1900-1945</button>
            <button id="period6-btn" class="btn">1945-2026</button>
          </div>
        </div>
      </div>
      <p class="read-the-docs">
        Click on the PlayCanvas and TypeScript logos to learn more
      </p>
    </div>
  `;

  // Insert overlay into overlay element
  const overlayContainer = document.createElement('div');
  overlayContainer.innerHTML = overlayHTML;
  overlay.appendChild(overlayContainer.firstElementChild as HTMLElement);

  // Set up overlay event listeners
  const counterElement = document.getElementById('counter')!;
  const yesBtn = document.getElementById('yes-btn') as HTMLButtonElement | null;
  const questionTextEl = document.getElementById('question-text') as HTMLElement | null;
  const timePeriodButtons = [
    document.getElementById('period1-btn') as HTMLButtonElement | null,
    document.getElementById('period2-btn') as HTMLButtonElement | null,
    document.getElementById('period3-btn') as HTMLButtonElement | null,
    document.getElementById('period4-btn') as HTMLButtonElement | null,
    document.getElementById('period5-btn') as HTMLButtonElement | null,
    document.getElementById('period6-btn') as HTMLButtonElement | null,
  ];
  const timePeriodText = document.getElementById('time-period') as HTMLElement | null;

  if (yesBtn && questionTextEl) {
    yesBtn.addEventListener('click', () => {
      const content = Question.getRandomQuestion(selectedTimePeriod) || '(no question loaded)';
      questionTextEl.textContent = content;
    });
  }

  if (timePeriodButtons.every(btn => btn !== null) && timePeriodText) {
    timePeriodButtons.forEach((btn, index) => {
      btn!.addEventListener('click', () => {
        const period = index + 1;
        selectedTimePeriod = period;
        timePeriodText.textContent = `Selected Time Period: ${period}`;
        renderBattlesForPeriod(period);
      });
    });
  }

  // Set up event listener to increment counter
  const onClickWithCounter = (battle: Battle) => {
    count++;
    counterElement.textContent = `Click Count: ${count}`;
    onClick(battle);
  };

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
    clearColor: new Color(0.14117647, 0.14117647, 0.14117647)
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

  // Create hover label for battle names
  const hoverLabel = document.createElement('div');
  hoverLabel.id = 'battle-hover-label';
  hoverLabel.style.position = 'absolute';
  hoverLabel.style.display = 'none';
  hoverLabel.style.pointerEvents = 'none';
  document.body.appendChild(hoverLabel);
  app.once('destroy', () => {
    try { hoverLabel.remove(); } catch(e) { /* ignore */ }
    try { 
      overlay.innerHTML = '';
    } catch(e) { /* ignore */ }
  });

  let isDragging = false;
  let currentBattle: Battle | null = null;

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

  // Track battle entities for cleanup
  let battleEntities: Entity[] = [];
  let battleMaterials: Map<Entity, StandardMaterial> = new Map();
  let entityToBattle: Map<Entity, Battle> = new Map();
  let hoveredBattle: Entity | null = null;

  // Helper function to check if mouse intersects a battle entity
  const checkBattleIntersection = async (x: number, y: number): Promise<Entity | null> => {
    if (!worldLayer || !camera.camera) return null;

    const pickerScale = 0.5;
    picker.resize(canvas.clientWidth * pickerScale, canvas.clientHeight * pickerScale);
    picker.prepare(camera.camera, app.scene, [worldLayer]);

    const meshInstances = await picker.getSelectionAsync(x * pickerScale, y * pickerScale, 1, 1);
    const selectedMesh = meshInstances.find((instance): instance is MeshInstance => instance instanceof MeshInstance);
    
    if (!selectedMesh) return null;

    // Find which battle entity was clicked
    for (const entity of battleEntities) {
      const renderComponent = entity.render;
      if (renderComponent?.meshInstances[0] === selectedMesh) {
        return entity;
      }
    }
    
    return null;
  };

  // On mouse move, check hovering over any battle and update colors
  app.mouse?.on(EVENT_MOUSEMOVE, throttle((event) => {
    if (isDragging) {
      hoverLabel.style.display = 'none';
      return;
    }
    
    checkBattleIntersection(event.x, event.y).then((intersectedEntity) => {
      // Reset previously hovered entity color
      if (hoveredBattle && hoveredBattle !== intersectedEntity) {
        const material = battleMaterials.get(hoveredBattle);
        if (material) {
          material.diffuse.copy(DEFAULT_COLOR);
          material.update();
        }
      }

      // Update hovered entity
      if (intersectedEntity) {
        hoveredBattle = intersectedEntity;
        const material = battleMaterials.get(intersectedEntity);
        if (material) {
          material.diffuse.copy(HOVER_COLOR);
          material.update();
        }
        document.body.style.cursor = 'pointer';
        const battle = entityToBattle.get(intersectedEntity);
        if (battle) {
          hoverLabel.textContent = battle.getName();
          hoverLabel.style.left = (event.x + 12) + 'px';
          hoverLabel.style.top = (event.y + 12) + 'px';
          hoverLabel.style.display = 'block';
        }
      } else {
        hoveredBattle = null;
        document.body.style.cursor = 'default';
        hoverLabel.style.display = 'none';
      }
    });
  }, 100));

  // On mouse up, check if clicked on battle and call onClick
  app.mouse?.on(EVENT_MOUSEUP, (event) => {
    if (isDragging || !onClickWithCounter) return;
    
    checkBattleIntersection(event.x, event.y).then((intersectedEntity) => {
      if (!intersectedEntity) return;

      const battle = entityToBattle.get(intersectedEntity);
      if (!battle) return;

      // @ChaosMaster8673: implement scene switching here
      console.log('Clicked on battle:', battle.getName());
      if (battle.getName() === 'Battle of Legnica') {
        battleOfLegnicaScene(canvas, app, onClickWithCounter, sceneNum);
        // ^^^ scene functions should always be defined as HTMLCanvasElement, AppBase, onClick callback, sceneNum
      }

      onClickWithCounter(battle);
    });
  });
  await applySphereTexture(sphere, textureUrl, device);

  // Function to render battles for selected time period
  const renderBattlesForPeriod = (timePeriod: number) => {
    // Clear previous battle entities
    battleEntities.forEach(entity => entity.destroy());
    battleEntities = [];
    battleMaterials.clear();
    entityToBattle.clear();
    hoveredBattle = null;
    currentBattle = null;
  
    // Create battle markers for the selected period
    battles.forEach((battle) => {
      if (battle.getTimePeriod() === timePeriod) {
        const [lat, lon] = battle.getLocation();
        const { phi, theta } = latLonToSpherical(lat, lon);

        const battlePoint = pointOnSphere(1, phi, theta);
        const battleNormal = normalOnSphere(battlePoint);

        // Create a unique material for this battle
        const battleMaterial = new StandardMaterial();
        battleMaterial.diffuse.copy(DEFAULT_COLOR);
        battleMaterial.update();

        const battleEntity = new Entity(battle.getName());
        battleEntity.addComponent('render', {
          type: 'capsule',
          material: battleMaterial
        });
        battleEntity.setLocalPosition(battlePoint);
        battleEntity.setLocalScale(0.04, 0.08, 0.04);

        // Align the entity's up-axis (Y) with the normal vector
        const upAxis = new Vec3(0, 1, 0);
        const axis = new Vec3().cross(upAxis, battleNormal).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, upAxis.dot(battleNormal))));
        if (axis.length() > 0.001) {
          const halfSin = Math.sin(angle * 0.5);
          battleEntity.setLocalRotation(axis.x * halfSin, axis.y * halfSin, axis.z * halfSin, Math.cos(angle * 0.5));
        }

        sphere.addChild(battleEntity);
        battleEntities.push(battleEntity);
        battleMaterials.set(battleEntity, battleMaterial);
        entityToBattle.set(battleEntity, battle);

        // Set the first battle as current
        if (!currentBattle) {
          currentBattle = battle;
        }
      }
    });

    console.log(`Rendered ${battleEntities.length} battles for period ${timePeriod}`);
  };

  // Initial render with selected time period
  let lastTimePeriod = selectedTimePeriod;
  if (selectedTimePeriod > 0) {
    renderBattlesForPeriod(selectedTimePeriod);
  }

  // Monitor for time period changes and re-render
  const timePeriodCheckInterval = setInterval(() => {
    if (selectedTimePeriod !== lastTimePeriod && selectedTimePeriod > 0) {
      lastTimePeriod = selectedTimePeriod;
      renderBattlesForPeriod(selectedTimePeriod);
    }
  }, 100);

  app.once('destroy', () => {
    clearInterval(timePeriodCheckInterval);
  });

  return renderBattlesForPeriod;
}

export { defaultScene };
