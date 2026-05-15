import { AppBase } from "playcanvas";
// @ts-expect-error - PlayCanvas ESM scripts don't have type declarations
import { Grid } from 'playcanvas/scripts/esm/grid.mjs';


import { Battle } from './world/Battle';

// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereHeightmap } from '../scripts/world/sphereHeightmap.js';
// @ts-expect-error - local JS utility has no .d.ts declarations
import { applySphereTexture } from '../scripts/world/sphereTexture.js';
import { defaultScene } from './world/scenes/default';
import { titleScreen } from "./world/scenes/titleSceen.ts";


/**
 * Setup the PlayCanvas app
 * @param canvas - The canvas element
 * @param onClick - The function to call when the user clicks on the sphere
 */

// App.ts
var sceneNum = -2;
async function setupApp(
  canvas: HTMLCanvasElement,
  onClick: (battle: Battle) => void,
  getSelectedTimePeriod: () => number //yucky
) {
  const app = new AppBase(canvas);
  getSelectedTimePeriod(); // call this once to initialize the time period

  // If we're starting on the title screen, show it and wait for the user to start
  if (sceneNum === -2) {
    const renderFn = await titleScreen(canvas, app, onClick, getSelectedTimePeriod, sceneNum); 
    // ^^^ scene functions should always be defined as HTMLCanvasElement, AppBase, onClick callback, getSelectedTimePeriod callback (if necessary), sceneNum
    return renderFn;
  }

  if (sceneNum === 0) {
    const renderFn = await defaultScene(canvas, app, onClick, getSelectedTimePeriod, sceneNum);
    return renderFn;
  }
  return undefined;
}

export { setupApp };
