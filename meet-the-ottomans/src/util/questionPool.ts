export class questionPool{

    // map: timePeriod -> (questionId -> questionText)
    private questions: Record<number, Record<number, string>> = {
        0:
            { // N/A
            0: "How do you see this?",
            1: "You shouldn't be here",
            2: "Your end is nigh."
            },
        1:
            { // starts at 1 bc of button stuff
                 // question indicies can and should start at 0
                //1200-1300 -- mongols? idk
                0: "What was the name of the Ottoman Empire's founder?",
                1: "In which year did the Ottoman Empire conquer Constantinople?",
                2: "Who was the longest-reigning Sultan of the Ottoman Empire?"
            },
        2:
            { // 1400-1500 -- idk
                0: "temp",
                1: "temp2",
                2: "temp3"
            },
        3: // 1500-1650 -- idk | might extend 1683 to do Battle of Vienna
            {
                0: "of man",
                1: "daniel",
                2: "this instant"
            },
        4: // 1750-1900 -- good question
            {
                0: "test"
            },
        5: // 1900-1945 -- WWI/II
            {
                0: "than",
            },
        6: // 1945-Present Day
            {
                0: "than",
            }
    };

    constructor(initial?: Record<number, Record<number, string>>){
        if (initial) this.questions = initial;
    }

    public getTimePeriods(): number[] {
        return Object.keys(this.questions).map(Number);
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