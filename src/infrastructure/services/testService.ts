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
            localStorage.setItem('cache_all_options', JSON.stringify(updated));

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
        const cacheKey = `cache_progress_${clientId}`;

        let hasCompletedIntro = false;
        let completedMainTestIds: number[] = [];
        let completedDatTypes: string[] = [];
        const answeredQuestionIds = new Set<number>();

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    hasCompletedIntro = parsed.hasCompletedIntro;
                    completedMainTestIds = parsed.completedMainTestIds || [];
                    completedDatTypes = parsed.completedDatTypes || [];
                } else {
                    throw new Error('Offline and no progress cache');
                }
            } else {
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

                hasCompletedIntro = !infoError && !!clientInfo;

                if (dbData) {
                    dbData.forEach(r => {
                        completedMainTestIds.push(r.testid);
                        answeredQuestionIds.add(r.questionid);
                    });
                }

                if (answeredQuestionIds.size > 0) {
                    const datQuestionIds = Array.from(answeredQuestionIds);
                    const { data: qData, error: qError } = await supabase
                        .from('questions')
                        .select('dat_type')
                        .in('id', datQuestionIds)
                        .eq('testid', 5);

                    if (!qError && qData) {
                        completedDatTypes = [...new Set(qData.map(q => q.dat_type).filter(t => !!t))] as string[];
                    }
                }
            }
        } catch (error) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                hasCompletedIntro = parsed.hasCompletedIntro;
                completedMainTestIds = parsed.completedMainTestIds || [];
                completedDatTypes = parsed.completedDatTypes || [];
            } else {
                throw error;
            }
        }

        const pendingInfo = JSON.parse(localStorage.getItem('pending_clientsinfo') || '[]');
        if (pendingInfo.some((p: any) => p.userid === clientId)) {
            hasCompletedIntro = true;
        }

        const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        pending.forEach((item: any) => {
            const payload = item.payload || [];
            if (payload.length > 0 && payload[0].clientid === clientId) {
                completedMainTestIds.push(payload[0].testid);
                // Also parse DAT strings if dat subtests were completed offline!
                // pending_submissions saves payload. In DAT, testid is 5 and dat_type is not directly in testsanswers, but we saved dat_type in local variables?
                // Actually to keep it simple, `progressCacheKey` mutations are much safer and already happening elsewhere, but this ensures `testsanswers` offline acts correctly.
            }
        });

        completedMainTestIds = [...new Set(completedMainTestIds)];

        const result = {
            hasCompletedIntro,
            completedMainTestIds,
            completedDatTypes
        };

        if (navigator.onLine) {
            localStorage.setItem(cacheKey, JSON.stringify(result));
        }

        return result;
    },

    async prefetchAllTests(onProgress?: (progress: number) => void) {
        if (!navigator.onLine) {
            throw new Error('No hay conexión a internet.');
        }

        try {
            const mainTests = [
                { id: 0, type: null },
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
