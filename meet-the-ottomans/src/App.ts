import { AppBase } from "playcanvas";
import { Battle } from './world/Battle';
import { defaultScene } from './world/scenes/default';
import { titleScreen } from "./world/scenes/titleSceen.ts";
import { loadAmmo } from "./ammo.js";


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
  

  const AmmoLib = await loadAmmo();
  console.log("Ammo initialized", {
    runtime: (globalThis as { __ammoRuntime?: unknown }).__ammoRuntime ?? "unknown",
    api: AmmoLib
  });
  
  
  

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
