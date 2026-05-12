import { questionPool } from "./questionPool";

const pool = new questionPool({
    1: {
        0: "Who founded the Ottoman Empire?",
        1: "In which century did the Ottomans rise to power?"
    },
    2: {
        0: "In which year did the Ottomans conquer Constantinople?",
        1: "Which Ottoman sultan was known as Suleiman the Magnificent?"
    }
});

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

    static createRandom(gameTimePeriod: number, allowedTimePeriods: number[] = [1, 2]): Question {
        const availablePeriods = allowedTimePeriods.filter((period) => pool.getQuestionIds(period).length > 0);
        const selectedPeriods = availablePeriods.length > 0 ? availablePeriods : [1, 2];
        const randomPeriod = selectedPeriods[Math.floor(Math.random() * selectedPeriods.length)];
        const questionIds = pool.getQuestionIds(randomPeriod);
        const randomQuestionId = questionIds[Math.floor(Math.random() * questionIds.length)] ?? 0;
        return new Question(randomPeriod, randomQuestionId, gameTimePeriod);
    }
}