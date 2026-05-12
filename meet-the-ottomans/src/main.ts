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
        <span id="question" class="pill">
        </p>
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


const yesBtn = document.getElementById('yes-btn') as HTMLButtonElement;
const questionTextEl = document.getElementById('question-text') as HTMLElement;

let currentQuestion: Question | undefined;

yesBtn.addEventListener('click', () => {
  // choose these from your game state (example values shown)
  const timePeriod = 0;
  const questionId = 0;
  const gameTimePeriod = 0;

  // drop previous reference so it can be collected
  currentQuestion = undefined;

  // create new question and display it
  currentQuestion = new Question(timePeriod, questionId, gameTimePeriod);
  questionTextEl.textContent = currentQuestion.getQuestionContent();
});


setupApp(document.getElementById('application-canvas') as HTMLCanvasElement, increment);
