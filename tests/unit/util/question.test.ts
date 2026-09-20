// Question facade: random selection across time periods, multiple-choice
// assembly (4 choices, one correct, distractors from the same period).
import { describe, it, expect } from 'vitest';
import { Question } from '@/util/question';
import { questionPool } from '@/util/questionPool';

describe('Question.getRandomQuestionWithChoices', () => {
  it('returns a well-formed multiple-choice question for a specific period', () => {
    const mc = Question.getRandomQuestionWithChoices(3);
    expect(mc).not.toBeNull();
    expect(mc!.timePeriod).toBe(3);
    expect(mc!.question.length).toBeGreaterThan(0);
    expect(mc!.correctAnswer.length).toBeGreaterThan(0);
    expect(mc!.choices).toHaveLength(4);
    expect(mc!.choices).toContain(mc!.correctAnswer);
    // Choices must be unique (no duplicate answers shown).
    expect(new Set(mc!.choices).size).toBe(4);
  });

  it('picks questions from every servable period without error', () => {
    const pool = new questionPool();
    for (const tp of pool.getTimePeriods()) {
      const mc = Question.getRandomQuestionWithChoices(tp);
      expect(mc).not.toBeNull();
      expect(mc!.timePeriod).toBe(tp);
    }
  });

  it('distractors come from the same time period as the question', () => {
    const mc = Question.getRandomQuestionWithChoices(6);
    expect(mc).not.toBeNull();
    const pool = new questionPool();
    const periodAnswers = new Set(
      pool.getQuestionIds(mc!.timePeriod).map((id) => pool.getAnswer(mc!.timePeriod, id)),
    );
    for (const choice of mc!.choices) {
      expect(periodAnswers.has(choice)).toBe(true);
    }
  });
});

describe('Question statics', () => {
  it('getRandomTimePeriod returns a servable period', () => {
    const pool = new questionPool();
    const tp = Question.getRandomTimePeriod();
    expect(pool.getTimePeriods()).toContain(tp);
  });

  it('getRandomQuestionId returns an id that exists for the period', () => {
    const pool = new questionPool();
    const id = Question.getRandomQuestionId(5);
    expect(pool.getQuestionIds(5)).toContain(id);
  });

  it('getRandomQuestion returns non-empty text for a valid period', () => {
    expect(Question.getRandomQuestion(1).length).toBeGreaterThan(0);
  });
});

describe('Question instance', () => {
  it('compareTimePeriod reflects the construction-time period match', () => {
    const match = new Question(3, 0, 3);
    expect(match.compareTimePeriod()).toBe(true);
    const mismatch = new Question(3, 0, 4);
    expect(mismatch.compareTimePeriod()).toBe(false);
  });

  it('getQuestionContent mirrors the pool content for the given period/id', () => {
    const q = new Question(2, 4, 2);
    expect(q.getQuestionContent()).toBe('Zheng He\'s voyages');
  });
});
