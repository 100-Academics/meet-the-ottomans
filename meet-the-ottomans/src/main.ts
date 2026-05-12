import './style.css'
import typescriptLogo from './assets/typescript.svg'
import playcanvasLogo from './assets/playcanvas.png'
import { setupApp } from './App'
import { Question } from './util/question';

let count = 0;


document.querySelector<HTMLDivElement>('#root')!.innerHTML = `
  <div>
    <canvas id="application-canvas"></canvas>
    <div class="absolute overlay">
      <div class="grow">
        <header>
          <h1>PlayCanvas + TypeScript</h1>
          <a href="https://developer.playcanvas.com" target="_blank">
            <img src="${playcanvasLogo}" class="playcanvas-logo logo" alt="PlayCanvas logo" />
          </a>
          <a href="https://www.typescriptlang.org/" target="_blank">
            <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
          </a>
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
            <button id="yes-btn" class="btn">Yes</button>
            <button id="no-btn" class="btn">No</button>
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

const increment = () => {
  count++;
  counterElement.textContent = `Click Count: ${count}`;
};


const yesBtn = document.getElementById('yes-btn') as HTMLButtonElement | null;
const questionTextEl = document.getElementById('question-text') as HTMLElement | null;

let currentQuestion: Question | undefined;

if (yesBtn && questionTextEl) {
  yesBtn.addEventListener('click', () => {
    const gameTimePeriod = 0;

    currentQuestion = undefined;

    currentQuestion = Question.createRandom(gameTimePeriod, [1, 2]);
    questionTextEl.textContent = currentQuestion.getQuestionContent();
  });
}


setupApp(document.getElementById('application-canvas') as HTMLCanvasElement, increment);
