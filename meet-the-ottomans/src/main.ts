import './style.css'
import { setupApp } from './App'
import { Question } from './util/question';
import type { Battle } from './world/Battle';
import { BODYMASK_NOT_STATIC_KINEMATIC } from 'playcanvas';

let count = 0;


document.querySelector<HTMLDivElement>('#root')!.innerHTML = `
  <div>
    <canvas id="application-canvas"></canvas>
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
            <button id="period1-btn" class="btn">Period 1</button>
            <button id="period2-btn" class="btn">Period 2</button>
            <button id="period3-btn" class="btn">Period 3</button>
          </div>
        </div>
      </div>
      <p class="read-the-docs">
        Click on the PlayCanvas and TypeScript logos to learn more
      </p>
    </div>
  </div>
`

const counterElement = document.getElementById('counter')!;

// const increment = () => {
//   count++;
//   counterElement.textContent = `Click Count: ${count}`;
// };


const yesBtn = document.getElementById('yes-btn') as HTMLButtonElement | null;
const questionTextEl = document.getElementById('question-text') as HTMLElement | null;
const timePeriodButtons = [
  document.getElementById('period1-btn') as HTMLButtonElement | null,
  document.getElementById('period2-btn') as HTMLButtonElement | null,
  document.getElementById('period3-btn') as HTMLButtonElement | null,
];
const timePeriodText = document.getElementById('time-period') as HTMLElement | null;

let selectedTimePeriod = -1;



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
      timePeriodText.textContent = `Selected Time Period: ${period}`;
      selectedTimePeriod = period;
      renderBattlesForPeriod(selectedTimePeriod);
    });
  });
}

const onClickStuff = () => {
  count++;
  counterElement.textContent = `Click Count: ${count}`;
}

const renderBattlesForPeriod = await setupApp(document.getElementById('application-canvas') as HTMLCanvasElement, onClickStuff, () => selectedTimePeriod);
