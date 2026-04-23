export interface Question {
    id: number;
    question: string | null;
    section: number;
    test_id: number;
    dat_type?: string | null;
    image_path?: string | null;
}

export interface AnswerOption {
    id: number;
    question_id: number;
    answer: string;
}

export interface Test {
    id: number;
    test_name: string;
}

export interface TestAnswer {
    id?: number;
    client_id: number;
    test_id: number;
    question_id: number;
    answer_id: number | null;
    details?: string | null;
    created_at?: string;
}
