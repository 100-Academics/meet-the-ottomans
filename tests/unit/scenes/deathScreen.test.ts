// Unit tests for the death screen DOM + quiz flow.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showDeathScreen,
  hideDeathScreen,
  isDeathScreenVisible,
} from '../../../src/world/scenes/deathScreen';
import { Question } from '../../../src/util/question';

const STORAGE_KEYS = ['meetTheOttomans.battleProgress', 'meetTheOttomans.secretsFound'];

function persistFixture() {
  const saved: Record<string, string | null> = {};
  for (const k of STORAGE_KEYS) saved[k] = window.localStorage.getItem(k);
  window.localStorage.clear();
  return saved;
}

function restoreFixture(saved: Record<string, string | null>) {
  window.localStorage.clear();
  for (const [k, v] of Object.entries(saved)) {
    if (v !== null) window.localStorage.setItem(k, v);
  }
}

function getChoiceButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.death-choices .death-btn'));
}

function clickCorrectAnswer() {
  // The correct answer is whatever Question.getRandomQuestionWithChoices
  // returned; the death screen highlights nothing, so we spy the pool.
  // Instead: click every choice until progress advances — we read the
  // question text and spy on the mock we injected.
  const buttons = getChoiceButtons();
  const target = (window as any).__lastCorrectAnswer as string;
  const btn = buttons.find((b) => b.textContent === target);
  expect(btn, 'correct choice button should exist').toBeTruthy();
  btn!.click();
}

function clickWrongAnswer() {
  const buttons = getChoiceButtons();
  const target = (window as any).__lastCorrectAnswer as string;
  const btn = buttons.find((b) => b.textContent !== target);
  expect(btn).toBeTruthy();
  btn!.click();
}

describe('death screen', () => {
  let saved: Record<string, string | null>;
  let questionSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saved = persistFixture();
    document.body.innerHTML = '';
    let counter = 0;
    questionSpy = vi.spyOn(Question, 'getRandomQuestionWithChoices').mockImplementation(() => {
      counter += 1;
      const correct = `correct-${counter}`;
      (window as any).__lastCorrectAnswer = correct;
      return {
        timePeriod: 1,
        questionId: counter,
        question: `Question ${counter}?`,
        correctAnswer: correct,
        choices: [correct, `wrong-a-${counter}`, `wrong-b-${counter}`, `wrong-c-${counter}`],
      };
    });
  });

  afterEach(() => {
    questionSpy.mockRestore();
    hideDeathScreen();
    restoreFixture(saved);
    delete (window as any).__lastCorrectAnswer;
  });

  it('showDeathScreen inserts #death-screen into the DOM', () => {
    showDeathScreen();
    expect(document.getElementById('death-screen')).not.toBeNull();
  });

  it('calling showDeathScreen twice is idempotent (single element)', () => {
    showDeathScreen();
    showDeathScreen();
    expect(document.querySelectorAll('#death-screen').length).toBe(1);
  });

  it('double-show keeps the quiz functional (still wired up)', () => {
    showDeathScreen();
    showDeathScreen();
    clickCorrectAnswer();
    expect(document.querySelector('.death-progress')?.textContent).toContain('Question 2 of 3');
  });

  it('hideDeathScreen removes the DOM', () => {
    showDeathScreen();
    hideDeathScreen();
    expect(document.getElementById('death-screen')).toBeNull();
  });

  it('isDeathScreenVisible tracks DOM presence', () => {
    expect(isDeathScreenVisible()).toBe(false);
    showDeathScreen();
    expect(isDeathScreenVisible()).toBe(true);
    hideDeathScreen();
    expect(isDeathScreenVisible()).toBe(false);
  });

  it('starts at "Question 1 of 3" with the Revive button hidden', () => {
    showDeathScreen();
    expect(document.querySelector('.death-progress')?.textContent).toContain('Question 1 of 3');
    const actions = document.querySelector('.death-actions') as HTMLElement;
    expect(actions.style.display).toBe('none');
  });

  it('a correct answer advances the quiz to question 2', () => {
    showDeathScreen();
    clickCorrectAnswer();
    expect(document.querySelector('.death-progress')?.textContent).toContain('Question 2 of 3');
  });

  it('a wrong answer does NOT advance progress', () => {
    showDeathScreen();
    clickWrongAnswer();
    expect(document.querySelector('.death-progress')?.textContent).toContain('Question 1 of 3');
    expect(document.querySelector('.death-feedback')?.textContent).toContain('Incorrect');
  });

  it('3 correct answers reveal the Revive button', () => {
    showDeathScreen();
    clickCorrectAnswer();
    clickCorrectAnswer();
    clickCorrectAnswer();
    const actions = document.querySelector('.death-actions') as HTMLElement;
    expect(actions.style.display).toBe('flex');
    const revive = actions.querySelector('button');
    expect(revive?.textContent).toBe('Revive');
  });

  it('clicking Revive calls onRestart when provided', () => {
    const onRestart = vi.fn();
    showDeathScreen({ onRestart });
    clickCorrectAnswer();
    clickCorrectAnswer();
    clickCorrectAnswer();
    (document.querySelector('.death-actions button') as HTMLButtonElement).click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('clicking Revive falls back to onMainMenu when onRestart is absent', () => {
    const onMainMenu = vi.fn();
    showDeathScreen({ onMainMenu });
    clickCorrectAnswer();
    clickCorrectAnswer();
    clickCorrectAnswer();
    (document.querySelector('.death-actions button') as HTMLButtonElement).click();
    expect(onMainMenu).toHaveBeenCalledTimes(1);
  });

  it('renders the custom death message', () => {
    showDeathScreen({ message: 'Custom doom text' });
    expect(document.querySelector('.death-message')?.textContent).toBe('Custom doom text');
  });

  it('Return to Map button calls onMainMenu after surviving the quiz', () => {
    const onMainMenu = vi.fn();
    showDeathScreen({ onMainMenu });
    clickCorrectAnswer();
    clickCorrectAnswer();
    clickCorrectAnswer();
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.death-actions .death-btn'),
    );
    const mapBtn = buttons.find((b) => b.textContent === 'Return to Map');
    expect(mapBtn, '"Return to Map" button should be rendered').toBeTruthy();
    mapBtn!.click();
    expect(onMainMenu).toHaveBeenCalledTimes(1);
  });

  it('falls back to the full quiz pool when no period matches', () => {
    questionSpy.mockReturnValueOnce(null as any);
    showDeathScreen({ timePeriod: 999 });
    // No question → treated as survived; actions visible immediately.
    const actions = document.querySelector('.death-actions') as HTMLElement;
    expect(actions.style.display).toBe('flex');
  });
});
