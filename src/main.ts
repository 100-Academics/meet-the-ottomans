import './style.css'
import { setupApp } from './App'

document.querySelector<HTMLDivElement>('#root')!.innerHTML = `
  <div>
    <canvas id="application-canvas"></canvas>
    <div class="absolute overlay">
    </div>
  </div>
`

// Battle clicks are handled entirely inside the map scene (default.ts), so the
// bootstrap passes no-op callbacks to setupApp.
const onClickStuff = () => {};
const getSelectedTimePeriod = () => -1;

void await setupApp(document.getElementById('application-canvas') as HTMLCanvasElement, onClickStuff, getSelectedTimePeriod);
