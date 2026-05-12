export class Question {
    private questionTimePeriod: number;
    public gameTimePeriod: number; // SET IT PRIVATE
    public questionId: number;
    public isCorrectTimePeriod: boolean;

    constructor(questionTimePeriod: number = 0, questionId: number = 0, gameTimePeriod: number = 0) {
        this.questionTimePeriod = questionTimePeriod;
        this.questionId = questionId;
        this.gameTimePeriod = gameTimePeriod;
        this.isCorrectTimePeriod = false;
        this.compareTimePeriod()
    }

    getQuestionContent(): string {
        return ""; //TODO set up
    }

    getQuestionTimePeriod(): number {
        return this.questionTimePeriod;
    }

    compareTimePeriod(): boolean {
        if (this.questionTimePeriod === this.gameTimePeriod) {
            this.isCorrectTimePeriod = true;
            return true;
        } else {
            this.isCorrectTimePeriod = false;
            return false;
        }
    }
}