export class questionPool{

    // map: timePeriod -> (questionId -> questionText)
    private questions: Record<number, Record<number, string>> = {
        0: {
            0: "What was the name of the Ottoman Empire's founder?",
            1: "In which year did the Ottoman Empire conquer Constantinople?",
            2: "Who was the longest-reigning Sultan of the Ottoman Empire?"
        }
    };

    constructor(initial?: Record<number, Record<number, string>>){
        if (initial) this.questions = initial;
    }

    public getQuestion(timePeriod: number, questionId: number): string {
        const period = this.questions[timePeriod];
        if (!period) return "";
        return period[questionId] ?? "";
    }

    public getQuestionIds(timePeriod: number): number[] {
        const period = this.questions[timePeriod];
        if (!period) return [];
        return Object.keys(period).map(Number);
    }

    public setQuestion(timePeriod: number, questionId: number, text: string): void {
        if (!this.questions[timePeriod]) this.questions[timePeriod] = {};
        this.questions[timePeriod][questionId] = text;
    }

    public deleteQuestion(timePeriod: number, questionId: number): boolean {
        const period = this.questions[timePeriod];
        if (!period || !(questionId in period)) return false;
        delete period[questionId];
        if (Object.keys(period).length === 0) delete this.questions[timePeriod];
        return true;
    }
}