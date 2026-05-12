import { questionPool } from "./questionPool";

const pool = new questionPool();

export class Question { // set it to undefined when it finishes
    private questionTimePeriod: number;
    private gameTimePeriod: number;
    private questionId: number;
    private questionContent: string;

    constructor(questionTimePeriod: number = 0, questionId: number = 0, gameTimePeriod: number = 0) {
        this.questionTimePeriod = questionTimePeriod;
        this.questionId = questionId;
        this.gameTimePeriod = gameTimePeriod;
        this.compareTimePeriod()
        this.questionContent = this.getQuestion(this.questionId);
    }

    getQuestionContent(): string {
        return this.questionContent;
    }

    getQuestionTimePeriod(): number {
        return this.questionTimePeriod;
    }

    compareTimePeriod(): boolean {
        if (this.questionTimePeriod === this.gameTimePeriod) {
            return true;
        } else {
            return false;
        }
    }

    getQuestion(questionId: number): string {
        return pool.getQuestion(this.questionTimePeriod, questionId);
    }

    static getRandomTimePeriod(): number {
        const timePeriods = Object.keys(pool['questions']).map(Number);
        if (timePeriods.length === 0) return -1;
        const randomIndex = Math.floor(Math.random() * timePeriods.length);
        return timePeriods[randomIndex];
    }

    static getRandomQuestionId(timePeriod: number): number {
        const questionIds = pool.getQuestionIds(timePeriod);
        if (questionIds.length === 0) return -1;
        const randomIndex = Math.floor(Math.random() * questionIds.length);
        return questionIds[randomIndex];
    }
    
    static getRandomQuestion(): string {
        const timePeriods = pool.getTimePeriods();
        if (timePeriods.length === 0) return "";

        const randomTimePeriod = timePeriods[Math.floor(Math.random() * timePeriods.length)];
        const questionIds = pool.getQuestionIds(randomTimePeriod);
        if (questionIds.length === 0) return "";

        const randomQuestionId = questionIds[Math.floor(Math.random() * questionIds.length)];
        return pool.getQuestion(randomTimePeriod, randomQuestionId);
    }
}