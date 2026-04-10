import { supabase } from '@/infrastructure/config/supabaseClient';
import { Question, AnswerOption, TestAnswer } from '@/domain/entities/test';

export const testService = {
    async getQuestions(testId: number, options: { datType?: string | null; minQuestionId?: number | null } = {}) {
        const cacheKey = `cache_questions_${testId}_${options.datType || 'all'}`;

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) return JSON.parse(cached) as Question[];
                throw new Error('Offline and no cache');
            }

            let query = supabase.from('questions').select('*').eq('testid', testId);

            if (options.datType) query = query.eq('dat_type', options.datType);
            if (options.minQuestionId) query = query.gte('id', options.minQuestionId);

            const { data, error } = await query.order('id');
            if (error) throw error;

            const questions = (data || []) as Question[];
            localStorage.setItem(cacheKey, JSON.stringify(questions));
            return questions;
        } catch (error) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) return JSON.parse(cached) as Question[];
            throw error;
        }
    },

    async getAnswerOptions(questionIds: number[]) {
        if (questionIds.length === 0) return [];

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem('cache_all_options');
                if (cached) {
                    const allCached = JSON.parse(cached) as AnswerOption[];
                    return allCached.filter(opt => questionIds.includes(opt.questionid));
                }
            }

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

            const existing = JSON.parse(localStorage.getItem('cache_all_options') || '[]');
            const updated = [...existing.filter((opt: any) => !questionIds.includes(opt.questionid)), ...allOpts];
            localStorage.setItem('cache_all_options', JSON.stringify(updated.slice(-2000)));

            return allOpts;
        } catch (error) {
            const cached = localStorage.getItem('cache_all_options');
            if (cached) {
                const allCached = JSON.parse(cached) as AnswerOption[];
                return allCached.filter(opt => questionIds.includes(opt.questionid));
            }
            throw error;
        }
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
    },

    async getDetailedProgress(clientId: number) {
        const { data: dbRaw, error } = await supabase
            .from('testsanswers')
            .select('testid, questionid, details')
            .eq('clientid', clientId);

        if (error) throw error;

        const dbData = (dbRaw || []).filter(r => !r.details || !r.details.startsWith('[HIST_'));

        const { data: clientInfo, error: infoError } = await supabase
            .from('clientsinfo')
            .select('userid')
            .eq('userid', clientId)
            .single();

        const hasCompletedIntro = !infoError && !!clientInfo;

        let completedMainTestIds: number[] = [];
        let completedDatTypes: string[] = [];
        const answeredQuestionIds = new Set<number>();

        if (dbData) {
            dbData.forEach(r => {
                completedMainTestIds.push(r.testid);
                answeredQuestionIds.add(r.questionid);
            });
        }

        const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        pending.forEach((item: any) => {
            const payload = item.payload || [];
            if (payload.length > 0 && payload[0].clientid === clientId) {
                completedMainTestIds.push(payload[0].testid);
                payload.forEach((ans: any) => answeredQuestionIds.add(ans.questionid));
            }
        });

        completedMainTestIds = [...new Set(completedMainTestIds)];

        const datQuestionIds = Array.from(answeredQuestionIds);

        if (datQuestionIds.length > 0) {
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select('dat_type')
                .in('id', datQuestionIds)
                .eq('testid', 5);

            if (!qError && qData) {
                completedDatTypes = [...new Set(qData.map(q => q.dat_type).filter(t => !!t))] as string[];
            }
        }

        return {
            hasCompletedIntro,
            completedMainTestIds,
            completedDatTypes
        };
    },

    async prefetchAllTests(onProgress?: (progress: number) => void) {
        if (!navigator.onLine) {
            throw new Error('No hay conexión a internet.');
        }

        try {
            const mainTests = [
                { id: 1, type: null },
                { id: 2, type: null },
                { id: 3, type: null },
                { id: 4, type: null },
            ];

            const datSubtests = [
                'razonamiento_verbal',
                'razonamiento_numerico',
                'razonamiento_abstracto',
                'razonamiento_mecanico',
                'razonamiento_espacial',
                'ortografia'
            ];

            console.log('Iniciando pre-descarga de tests para uso offline...');
            
            const totalSteps = mainTests.length + datSubtests.length;
            let completedSteps = 0;

            for (const test of mainTests) {
                const qs = await this.getQuestions(test.id);
                if (qs.length > 0) {
                    await this.getAnswerOptions(qs.map(q => q.id));
                }
                completedSteps++;
                if (onProgress) onProgress(Math.round((completedSteps / totalSteps) * 100));
            }

            for (const type of datSubtests) {
                const qs = await this.getQuestions(5, { datType: type });
                if (qs.length > 0) {
                    await this.getAnswerOptions(qs.map(q => q.id));
                }
                completedSteps++;
                if (onProgress) onProgress(Math.round((completedSteps / totalSteps) * 100));
            }

            console.log('Pre-descarga completada. El sistema está listo para uso offline.');
        } catch (error) {
            console.error('Error durante la pre-descarga de tests:', error);
            throw error;
        }
    },

};
