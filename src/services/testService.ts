import { supabase } from '../supabaseClient';
import { Question, AnswerOption, TestAnswer } from '../types/test';

export const testService = {
    async getQuestions(testId: number, options: { datType?: string | null; minQuestionId?: number | null } = {}) {
        let query = supabase.from('questions').select('*').eq('testid', testId);

        if (options.datType) query = query.eq('dat_type', options.datType);
        if (options.minQuestionId) query = query.gte('id', options.minQuestionId);

        const { data, error } = await query.order('id');
        if (error) throw error;
        return (data || []) as Question[];
    },

    async getAnswerOptions(questionIds: number[]) {
        if (questionIds.length === 0) return [];

        const CHUNK = 200;
        const allOpts: AnswerOption[] = [];

        for (let i = 0; i < questionIds.length; i += CHUNK) {
            const slice = questionIds.slice(i, i + CHUNK);
            const { data, error } = await supabase
                .from('answeroptions')
                .select('*')
                .in('questionid', slice)
                .order('id');

            if (error) throw error;
            allOpts.push(...(data || []));
        }

        return allOpts;
    },

    async submitAnswers(answers: TestAnswer[]) {
        const { error } = await supabase.from('testsanswers').insert(answers);
        if (error) throw error;
    },

    async getCompletedTestIds(clientId: number) {
        const { data, error } = await supabase
            .from('testsanswers')
            .select('testid')
            .eq('clientid', clientId);

        if (error) throw error;
        return [...new Set((data || []).map(r => r.testid))];
    }
};
