import { AppBase } from "playcanvas";
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';


import { Battle } from './world/Battle';

// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereHeightmap } from '../scripts/world/sphereHeightmap.js';
// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereTexture } from '../scripts/world/sphereTexture.js';
import { defaultScene } from './world/scenes/default';


/**
 * Setup the PlayCanvas app
 * @param canvas - The canvas element
 * @param onClick - The function to call when the user clicks on the sphere
 */

// App.ts
async function setupApp(
  canvas: HTMLCanvasElement,
  onClick: (battle: Battle) => void,
  getSelectedTimePeriod: () => number //yucky
) {
  const app = new AppBase(canvas);
  defaultScene(canvas, app, onClick, getSelectedTimePeriod);
}

export { setupApp };
