import { supabase } from '@/infrastructure/config/supabaseClient';
import { Question, AnswerOption, TestAnswer } from '@/domain/entities/test';

export const testService = {
    async getQuestions(test_id: number, options: { datType?: string | null; minquestion_id?: number | null } = {}) {
        const cacheKey = `cache_questions_${test_id}_${options.datType || 'all'}`;

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) return JSON.parse(cached) as Question[];
                throw new Error('Offline and no cache');
            }

            let query = supabase.from('questions').select('*').eq('test_id', test_id);

            if (options.datType) query = query.eq('dat_type', options.datType);
            if (options.minquestion_id) query = query.gte('id', options.minquestion_id);

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

    async getanswer_options(question_ids: number[]) {
        if (question_ids.length === 0) return [];

        // Normalize question_ids to strings for robust comparison
        const targetIds = question_ids.map(id => String(id));

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem('cache_all_options');
                if (cached) {
                    const allCached = JSON.parse(cached) as AnswerOption[];
                    return allCached.filter(opt => targetIds.includes(String(opt.question_id)));
                }
            }

            const CHUNK = 200;
            const allOpts: AnswerOption[] = [];

            for (let i = 0; i < question_ids.length; i += CHUNK) {
                const slice = question_ids.slice(i, i + CHUNK);
                const { data, error } = await supabase
                    .from('answer_options')
                    .select('*')
                    .in('question_id', slice)
                    .order('id');

                if (error) throw error;
                allOpts.push(...(data || []));
            }

            // Update cache incrementally
            const existingRaw = localStorage.getItem('cache_all_options');
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            
            // Remove old versions of these specific question options and add new ones
            const updated = [
                ...existing.filter((opt: any) => !targetIds.includes(String(opt.question_id))),
                ...allOpts
            ];
            
            try {
                localStorage.setItem('cache_all_options', JSON.stringify(updated));
            } catch (e) {
                console.warn('LocalStorage quota exceeded, could not update options cache', e);
            }

            return allOpts;
        } catch (error) {
            console.error('Error fetching/caching answer options:', error);
            const cached = localStorage.getItem('cache_all_options');
            if (cached) {
                const allCached = JSON.parse(cached) as AnswerOption[];
                return allCached.filter(opt => targetIds.includes(String(opt.question_id)));
            }
            throw error;
        }
    },

    async submitAnswers(answers: TestAnswer[]) {
        const { error } = await supabase.from('test_answers').insert(answers);
        if (error) throw error;
    },

    async getCompletedtest_ids(client_id: number) {
        const { data, error } = await supabase
            .from('test_answers')
            .select('test_id')
            .eq('client_id', client_id);

        if (error) throw error;
        return [...new Set((data || []).map(r => r.test_id))];
    },

    async getDetailedProgress(client_id: number) {
        const cacheKey = `cache_progress_${client_id}`;

        let hasCompletedIntro = false;
        let completedMaintest_ids: number[] = [];
        let completedDatTypes: string[] = [];
        const answeredquestion_ids = new Set<number>();

        try {
            if (!navigator.onLine) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    hasCompletedIntro = parsed.hasCompletedIntro;
                    completedMaintest_ids = parsed.completedMaintest_ids || [];
                    completedDatTypes = parsed.completedDatTypes || [];
                } else {
                    throw new Error('Offline and no progress cache');
                }
            } else {
                const { data: dbRaw, error } = await supabase
                    .from('test_answers')
                    .select('test_id, question_id, details')
                    .eq('client_id', client_id);

                if (error) throw error;

                const dbData = (dbRaw || []).filter(r => !r.details || !r.details.startsWith('[HIST_'));

                const { data: clientInfo, error: infoError } = await supabase
                    .from('clients_info')
                    .select('user_id')
                    .eq('user_id', client_id)
                    .single();

                hasCompletedIntro = !infoError && !!clientInfo;

                if (dbData) {
                    dbData.forEach(r => {
                        completedMaintest_ids.push(r.test_id);
                        answeredquestion_ids.add(r.question_id);
                    });
                }

                if (answeredquestion_ids.size > 0) {
                    const datquestion_ids = Array.from(answeredquestion_ids);
                    const { data: qData, error: qError } = await supabase
                        .from('questions')
                        .select('dat_type')
                        .in('id', datquestion_ids)
                        .eq('test_id', 5);

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
                completedMaintest_ids = parsed.completedMaintest_ids || [];
                completedDatTypes = parsed.completedDatTypes || [];
            } else {
                throw error;
            }
        }

        const pendingInfo = JSON.parse(localStorage.getItem('pending_clients_info') || '[]');
        if (pendingInfo.some((p: any) => p.user_id === client_id)) {
            hasCompletedIntro = true;
        }

        const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        pending.forEach((item: any) => {
            const payload = item.payload || [];
            if (payload.length > 0 && payload[0].client_id === client_id) {
                completedMaintest_ids.push(payload[0].test_id);
                // Also parse DAT strings if dat subtests were completed offline!
                // pending_submissions saves payload. In DAT, test_id is 5 and dat_type is not directly in test_answers, but we saved dat_type in local variables?
                // Actually to keep it simple, `progressCacheKey` mutations are much safer and already happening elsewhere, but this ensures `test_answers` offline acts correctly.
            }
        });

        completedMaintest_ids = [...new Set(completedMaintest_ids)];

        const result = {
            hasCompletedIntro,
            completedMaintest_ids,
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
                // Only cache options for questions WITHOUT images
                const questionsWithoutImages = qs.filter(q => !q.image_path);
                if (questionsWithoutImages.length > 0) {
                    await this.getanswer_options(questionsWithoutImages.map(q => q.id));
                }
                completedSteps++;
                if (onProgress) onProgress(Math.round((completedSteps / totalSteps) * 100));
            }

            for (const type of datSubtests) {
                const qs = await this.getQuestions(5, { datType: type });
                // Only cache options for questions WITHOUT images
                const questionsWithoutImages = qs.filter(q => !q.image_path);
                if (questionsWithoutImages.length > 0) {
                    await this.getanswer_options(questionsWithoutImages.map(q => q.id));
                }
                completedSteps++;
                if (onProgress) onProgress(Math.round((completedSteps / totalSteps) * 100));
            }

            console.log('Pre-descarga completada. El sistema solo ha guardado preguntas sin imágenes.');
        } catch (error) {
            console.error('Error durante la pre-descarga de tests:', error);
            throw error;
        }
    },

};
