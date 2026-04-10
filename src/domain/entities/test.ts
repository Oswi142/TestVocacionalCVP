export interface Question {
    id: number;
    question: string | null;
    section: number;
    testid: number;
    dat_type?: string | null;
    image_path?: string | null;
}

export interface AnswerOption {
    id: number;
    questionid: number;
    answer: string;
}

export interface Test {
    id: number;
    testname: string;
}

export interface TestAnswer {
    id?: number;
    clientid: number;
    testid: number;
    questionid: number;
    answerid: number | null;
    details?: string | null;
    created_at?: string;
}
