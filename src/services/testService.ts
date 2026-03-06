import { supabase } from '../supabaseClient';
import { Question, AnswerOption, TestAnswer } from '../types/test';

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

            // Guardar en un cache global de opciones para simplificar offline
            const existing = JSON.parse(localStorage.getItem('cache_all_options') || '[]');
            const updated = [...existing.filter((opt: any) => !questionIds.includes(opt.questionid)), ...allOpts];
            localStorage.setItem('cache_all_options', JSON.stringify(updated.slice(-2000))); // Limitar tamaño

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
        // 1. Obtener progreso de la base de datos (Supabase)
        const { data: dbRaw, error } = await supabase
            .from('testsanswers')
            .select('testid, questionid, details')
            .eq('clientid', clientId);

        if (error) throw error;

        // Filtrar localmente para incluir NULLs y excluir históricos
        const dbData = (dbRaw || []).filter(r => !r.details || !r.details.startsWith('[HIST_'));

        // Verificar si completó la introducción (tiene registro en clientsinfo)
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

        // 2. Obtener progreso de la cola offline (para que la interfaz avance sin señal)
        const pending = JSON.parse(localStorage.getItem('pending_submissions') || '[]');
        pending.forEach((item: any) => {
            const payload = item.payload || [];
            if (payload.length > 0 && payload[0].clientid === clientId) {
                completedMainTestIds.push(payload[0].testid);
                payload.forEach((ans: any) => answeredQuestionIds.add(ans.questionid));
            }
        });

        // Limpiar duplicados de IDs de test
        completedMainTestIds = [...new Set(completedMainTestIds)];

        // 3. Resolver dat_types para el test 5 (DAT)
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

    async prefetchAllTests() {
        if (!navigator.onLine) return;

        try {
            // Lista de tests principales
            const mainTests = [
                { id: 1, type: null }, // Entrevista
                { id: 2, type: null }, // IPPR
                { id: 3, type: null }, // CHASIDE
                { id: 4, type: null }, // MACI
            ];

            // Subtests del DAT (5)
            const datSubtests = [
                'razonamiento_verbal',
                'razonamiento_numerico',
                'razonamiento_abstracto',
                'razonamiento_mecanico',
                'razonamiento_espacial',
                'ortografia'
            ];

            console.log('Iniciando pre-descarga de tests para uso offline...');

            // 1. Descargar tests principales
            for (const test of mainTests) {
                const qs = await this.getQuestions(test.id);
                if (qs.length > 0) {
                    await this.getAnswerOptions(qs.map(q => q.id));
                }
            }

            // 2. Descargar subtests del DAT
            for (const type of datSubtests) {
                const qs = await this.getQuestions(5, { datType: type });
                if (qs.length > 0) {
                    await this.getAnswerOptions(qs.map(q => q.id));
                }
            }

            console.log('Pre-descarga completada. El sistema está listo para uso offline.');
        } catch (error) {
            console.error('Error durante la pre-descarga de tests:', error);
        }
    },

};
