// Question pool data shape: every served question needs a non-empty question
// and answer, no duplicate question text within a time period, and period 0
// (debug jokes) must never be served as a real question.
import { describe, it, expect } from 'vitest';
import { questionPool } from '@/util/questionPool';

describe('questionPool data shape', () => {
  it('serves known time periods 1-8 and excludes the debug period 0', () => {
    const pool = new questionPool();
    const periods = pool.getTimePeriods();
    expect(periods).not.toContain(0);
    for (const p of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(periods).toContain(p);
    }
  });

  it('every served period has >= 4 questions so all answer buttons can be filled', () => {
    const pool = new questionPool();
    for (const tp of pool.getTimePeriods()) {
      expect(pool.getQuestionIds(tp).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('every question has non-empty question text and answer', () => {
    const pool = new questionPool();
    for (const tp of pool.getTimePeriods()) {
      for (const id of pool.getQuestionIds(tp)) {
        expect(pool.getQuestion(tp, id).trim().length).toBeGreaterThan(0);
        expect(pool.getAnswer(tp, id).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has no duplicate question text within a time period', () => {
    const pool = new questionPool();
    for (const tp of pool.getTimePeriods()) {
      const texts = pool.getQuestionIds(tp).map((id) => pool.getQuestion(tp, id).trim());
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('getQuestion returns empty string for unknown period/id instead of throwing', () => {
    const pool = new questionPool();
    expect(pool.getQuestion(999, 0)).toBe('');
    expect(pool.getQuestion(1, 9999)).toBe('');
  });

  it('setQuestionWithAnswer adds an entry retrievable via getters', () => {
    const pool = new questionPool();
    pool.setQuestionWithAnswer(42, 1, 'Q?', 'A!');
    expect(pool.getQuestion(42, 1)).toBe('Q?');
    expect(pool.getAnswer(42, 1)).toBe('A!');
  });
});
