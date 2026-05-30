import { AppBase } from 'playcanvas';
import { removeBattleHUD } from '../../util/battleHUD';
import { Question } from '../../util/question';

/**
 * Simple "You Died" overlay utilities.
 * - `showDeathScreen` adds a full-screen overlay with Restart/Main Menu buttons.
 * - `hideDeathScreen` removes the overlay.
 */

export function showDeathScreen(options?: {
  app?: AppBase;
  onMainMenu?: () => void;
  onRestart?: () => void;
  timePeriod?: number;
  message?: string;
}) {

  if (typeof document === 'undefined') return;
  removeBattleHUD();
  document.querySelectorAll('.overlay').forEach((el) => {
    if ((el as HTMLElement).id !== 'death-screen') {
      el.remove();
    }
  });
  const hoverLabel = document.getElementById('battle-hover-label');
  if (hoverLabel) {
    hoverLabel.remove();
  }
  if (document.getElementById('death-screen')) return; // already shown

  const { onMainMenu, onRestart, timePeriod = -1, message = 'You have died' } = options ?? {};

  const overlay = document.createElement('div');
  overlay.id = 'death-screen';
  overlay.className = 'overlay absolute';
  overlay.style.pointerEvents = 'auto';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '9999';
  overlay.style.background = '#050505';

  const card = document.createElement('div');
  card.style.width = 'min(700px, 90vw)';
  card.style.margin = '2rem auto';
  card.style.pointerEvents = 'auto';
  card.style.textAlign = 'center';
  card.style.backdropFilter = 'blur(4px)';
  card.style.background = 'rgba(0, 0, 0, 0.35)';
  card.style.padding = '1.25rem 1.5rem';
  card.style.borderRadius = '12px';

  const title = document.createElement('h1');
  title.textContent = 'You Died!';
  title.style.fontSize = '3rem';
  title.style.margin = '0.2rem 0 0.4rem 0';

  const desc = document.createElement('p');
  desc.textContent = message;
  desc.style.color = '#ccc';
  desc.style.margin = '0 0 1rem 0';

  const quizIntro = document.createElement('p');
  quizIntro.textContent = 'Answer 3 questions correctly to continue.';
  quizIntro.style.color = '#f3d59b';
  quizIntro.style.margin = '0 0 0.5rem 0';

  const periodLabel = document.createElement('p');
  periodLabel.textContent = timePeriod >= 0
    ? `Questions pulled from time period ${timePeriod}.`
    : 'Questions pulled from the full pool.';
  periodLabel.style.color = '#9aa7b3';
  periodLabel.style.margin = '0 0 0.75rem 0';

  const progress = document.createElement('p');
  progress.textContent = 'Question 0 of 3';
  progress.style.color = '#fff';
  progress.style.margin = '0 0 1rem 0';

  const questionText = document.createElement('p');
  questionText.style.fontSize = '1.15rem';
  questionText.style.lineHeight = '1.5';
  questionText.style.margin = '0 0 1rem 0';

  const choiceRow = document.createElement('div');
  choiceRow.className = 'btn-row';
  choiceRow.style.justifyContent = 'center';
  choiceRow.style.flexWrap = 'wrap';
  choiceRow.style.gap = '0.5rem';

  const feedback = document.createElement('p');
  feedback.style.minHeight = '1.5rem';
  feedback.style.margin = '1rem 0 0 0';
  feedback.style.color = '#f3d59b';

  const actionRow = document.createElement('div');
  actionRow.className = 'btn-row';
  actionRow.style.justifyContent = 'center';
  actionRow.style.display = 'none';

  const restartButton = document.createElement('button');
  restartButton.className = 'btn';
  restartButton.textContent = 'Restart Battle';
  restartButton.addEventListener('click', () => {
    if (onRestart) {
      onRestart();
      return;
    }
    if (onMainMenu) {
      onMainMenu();
      return;
    }
    window.location.href = '/';
  });

  const menuButton = document.createElement('button');
  menuButton.className = 'btn';
  menuButton.textContent = 'Main Menu';
  menuButton.addEventListener('click', () => {
    if (onMainMenu) return onMainMenu();
    window.location.href = '/';
  });

  actionRow.appendChild(restartButton);
  actionRow.appendChild(menuButton);

  let correctAnswers = 0;

  const showActions = () => {
    choiceRow.replaceChildren();
    feedback.textContent = 'You survived the quiz gate.';
    progress.textContent = 'Unlocked';
    actionRow.style.display = 'flex';
  };

  const loadQuestion = () => {
    if (correctAnswers >= 3) {
      showActions();
      return;
    }

    const nextQuestion = Question.getRandomQuestionWithChoices(timePeriod);
    if (!nextQuestion) {
      correctAnswers = 3;
      showActions();
      return;
    }

    progress.textContent = `Question ${correctAnswers + 1} of 3`;
    feedback.textContent = '';
    questionText.textContent = nextQuestion.question;
    choiceRow.replaceChildren();

    for (const choice of nextQuestion.choices) {
      const choiceButton = document.createElement('button');
      choiceButton.className = 'btn';
      choiceButton.textContent = choice;
      choiceButton.addEventListener('click', () => {
        if (choice === nextQuestion.correctAnswer) {
          correctAnswers += 1;
          if (correctAnswers >= 3) {
            showActions();
            return;
          }
          feedback.textContent = 'Correct. Next question...';
          loadQuestion();
        } else {
          feedback.textContent = 'Incorrect. Try again.';
        }
      });
      choiceRow.appendChild(choiceButton);
    }
  };

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(quizIntro);
  card.appendChild(periodLabel);
  card.appendChild(progress);
  card.appendChild(questionText);
  card.appendChild(choiceRow);
  card.appendChild(feedback);
  card.appendChild(actionRow);

  // center vertically
  const topGap = document.createElement('div');
  topGap.className = 'grow';
  const botGap = document.createElement('div');
  botGap.className = 'grow';

  overlay.appendChild(topGap);
  overlay.appendChild(card);
  overlay.appendChild(botGap);

  document.body.appendChild(overlay);

  loadQuestion();
}

export function hideDeathScreen() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('death-screen');
  if (el) el.remove();
  const canvas = document.querySelector('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    canvas.style.display = '';
  }
}

export function isDeathScreenVisible(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.getElementById('death-screen') !== null;
}

export default { showDeathScreen, hideDeathScreen };
