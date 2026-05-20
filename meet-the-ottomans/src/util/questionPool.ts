export type QuestionEntry = {
    question: string;
    answer: string;
};

type IndexedQuestionEntry = {
    0: string;
    1: string;
};

type LegacyQuestionEntry =
    | string
    | QuestionEntry
    | IndexedQuestionEntry;

export type MultipleChoiceQuestion = {
    timePeriod: number;
    questionId: number;
    question: string;
    correctAnswer: string;
    choices: string[];
};

export class questionPool{

    // map: timePeriod -> (questionId -> questionText)
    // time periods are:
        // 0: N/A
        // 1: 1200-1300
        // 2: 1400-1500
        // 3: 1500-1650
        // 4: 1750-1900
        // 5: 1900-1945
        // 6: 1945-2026
    private questions: Record<number, Record<number, LegacyQuestionEntry>> = {
        0: {
            // N/A
            0: { question: "How are you here?", answer: "Begone" }, // questions should be formatted like this
            1: { question: "You shouldn't see this", answer: "My bad man" },
            2: { question: "Your end is nigh.", answer: "GET OUT" }
        },

    };

    constructor(initial?: Record<number, Record<number, LegacyQuestionEntry>>){
        if (initial) this.questions = initial;
        // Keep backward compatibility with legacy string-only question maps.
        this.normalizeQuestions();
    }

    private normalizeQuestions(): void {
        for (const [timePeriodStr, period] of Object.entries(this.questions)) {
            const timePeriod = Number(timePeriodStr);
            for (const [questionIdStr, questionOrEntry] of Object.entries(period)) {
                const questionId = Number(questionIdStr);
                if (typeof questionOrEntry === "string") {
                    // Promote legacy string entries into indexed records: 0=question, 1=answer.
                    period[questionId] = {
                        0: questionOrEntry,
                        1: this.buildDefaultAnswer(timePeriod, questionId, questionOrEntry)
                    };
                    continue;
                }

                if ("question" in questionOrEntry && "answer" in questionOrEntry) {
                    // Migrate object records into indexed records.
                    period[questionId] = {
                        0: questionOrEntry.question,
                        1: questionOrEntry.answer
                    };
                }
            }
        }
    }

    private buildDefaultAnswer(timePeriod: number, questionId: number, questionText: string): string {
        return `A historically grounded explanation for period ${timePeriod}, question ${questionId}: ${questionText}`;
    }

    private getQuestionEntry(timePeriod: number, questionId: number): QuestionEntry | null {
        const period = this.questions[timePeriod];
        if (!period) return null;

        const entry = period[questionId];
        if (!entry) return null;

        if (typeof entry === "string") {
            const normalizedEntry: IndexedQuestionEntry = {
                0: entry,
                1: this.buildDefaultAnswer(timePeriod, questionId, entry)
            };
            period[questionId] = normalizedEntry;
            return { question: normalizedEntry[0], answer: normalizedEntry[1] };
        }

        if ("question" in entry && "answer" in entry) {
            return { question: entry.question, answer: entry.answer };
        }

        return { question: entry[0], answer: entry[1] };
    }

    private shuffle<T>(items: T[]): T[] {
        const arr = [...items];
        // Fisher-Yates shuffle for unbiased randomized answer order.
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    public getTimePeriods(): number[] {
        return Object.keys(this.questions).map(Number);
    }

    public getQuestion(timePeriod: number, questionId: number): string {
        const entry = this.getQuestionEntry(timePeriod, questionId);
        return entry?.question ?? "";
    }

    public getAnswer(timePeriod: number, questionId: number): string {
        const entry = this.getQuestionEntry(timePeriod, questionId);
        return entry?.answer ?? "";
    }

    public getQuestionIds(timePeriod: number): number[] {
        const period = this.questions[timePeriod];
        if (!period) return [];
        return Object.keys(period).map(Number);
    }

    public setQuestion(timePeriod: number, questionId: number, text: string): void {
        if (!this.questions[timePeriod]) this.questions[timePeriod] = {};
        this.questions[timePeriod][questionId] = {
            0: text,
            1: this.buildDefaultAnswer(timePeriod, questionId, text)
        };
    }

    public setQuestionWithAnswer(timePeriod: number, questionId: number, question: string, answer: string): void {
        if (!this.questions[timePeriod]) this.questions[timePeriod] = {};
        this.questions[timePeriod][questionId] = { 0: question, 1: answer };
    }

    public getQuestionWithChoices(timePeriod: number = -1): MultipleChoiceQuestion | null {
        const timePeriods = this.getTimePeriods();
        if (timePeriods.length === 0) return null;

        const chosenTimePeriod = timePeriod === -1
            ? timePeriods[Math.floor(Math.random() * timePeriods.length)]
            : timePeriod;

        const questionIds = this.getQuestionIds(chosenTimePeriod);
        if (questionIds.length === 0) return null;

        const questionId = questionIds[Math.floor(Math.random() * questionIds.length)];
        const entry = this.getQuestionEntry(chosenTimePeriod, questionId);
        if (!entry) return null;

        // Build distractors from the same time period as the selected question.
        const distractorPool: string[] = [];
        for (const candidateId of this.getQuestionIds(chosenTimePeriod)) {
            if (candidateId === questionId) continue;
            const candidateEntry = this.getQuestionEntry(chosenTimePeriod, candidateId);
            if (candidateEntry) {
                distractorPool.push(candidateEntry.answer);
            }
        }

        const distractors = this.shuffle(distractorPool).slice(0, 3);
        const choices = this.shuffle([entry.answer, ...distractors]);

        return {
            timePeriod: chosenTimePeriod,
            questionId,
            question: entry.question,
            correctAnswer: entry.answer,
            choices
        };
    }

    public deleteQuestion(timePeriod: number, questionId: number): boolean {
        const period = this.questions[timePeriod];
        if (!period || !(questionId in period)) return false;
        delete period[questionId];
        if (Object.keys(period).length === 0) delete this.questions[timePeriod];
        return true;
    }
}