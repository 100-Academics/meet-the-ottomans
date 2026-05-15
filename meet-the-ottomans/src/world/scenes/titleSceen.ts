import { AppBase } from "playcanvas";
import { Battle } from '../Battle';
import { defaultScene } from './default';

async function titleScreen(
  canvas: HTMLCanvasElement,
  app: AppBase,
  sceneNum: number,
  onClick: (battle: Battle) => void,
  getSelectedTimePeriod: () => number
) {
  // Create a simple DOM title overlay
  const overlay = document.querySelector('.overlay') as HTMLElement | null;

  const titleWrap = document.createElement('div');
  titleWrap.id = 'title-screen';
  titleWrap.className = 'pill';
  titleWrap.innerHTML = `
    <h1>Meet The Ottomans</h1>
    <p>You WILL of man Daniel this instant. </p>
    <p>I am a sexy, horny beast that will hunt Daniel down and fuck him.</p>
    <div class="btn-row">
      <button id="start-btn" class="btn">Start</button>
    </div>
  `;

  // Hide other overlay children so title screen is the only visible overlay
  const hiddenMap = new Map<HTMLElement, string | null>();
  if (overlay) {
    overlay.prepend(titleWrap);
    const children = Array.from(overlay.children) as HTMLElement[];
    for (const child of children) {
      if (child === titleWrap) continue;
      hiddenMap.set(child, child.style.display || null);
      child.style.display = 'none';
    }
  }

  const startBtn = document.getElementById('start-btn');

  return await new Promise<any>((resolve) => {
    const restoreOverlay = () => {
      // restore previous display values
      for (const [el, prev] of hiddenMap.entries()) {
        if (prev === null) el.style.removeProperty('display');
        else el.style.display = prev;
      }
    };

    const start = async () => {
      titleWrap.remove();
      restoreOverlay();
      // Hand off to default scene and return its render function
      const renderFn = await defaultScene(canvas, app, onClick, getSelectedTimePeriod, 0);
      resolve(renderFn);
    };

    startBtn?.addEventListener('click', start, { once: true });
  });
}

export { titleScreen };