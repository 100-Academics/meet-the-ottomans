export class Question {
    public questionTimePeriod: number;
    public questionContent: string;
    public gameTimePeriod: number;
    public questionId: number;

    constructor(questionTimePeriod: number = 0, questionContent: string = "", gameTimePeriod: number = 0, questionId: number = 0) {
        this.questionTimePeriod = questionTimePeriod;
        this.questionContent = questionContent;
        this.gameTimePeriod = gameTimePeriod;
        this.questionId = questionId;
    }
}