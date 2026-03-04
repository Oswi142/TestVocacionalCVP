import { supabase } from '../supabaseClient';
import { Test } from '../types/test';

export const adminService = {
    async getClients() {
        const [clientsRes, usersRes] = await Promise.all([
            supabase.from('clientsinfo').select('*').range(0, 9999),
            supabase.from('users').select('*').eq('role', 'client').range(0, 9999),
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (usersRes.error) throw usersRes.error;

        const clientsInfo = clientsRes.data || [];
        const users = usersRes.data || [];

        // Deduplicate and unify
        const usersDedup = Array.from(new Map(users.map((u: any) => [u.id, u])).values());
        const ciMap = new Map<number, any>(clientsInfo.map((c: any) => [c.userid, c]));

        return usersDedup.map((u: any) => {
            const ci = ciMap.get(u.id);
            return {
                userid: u.id,
                name: u.name,
                username: u.username,
                birthday: ci?.birthday ?? null,
                address: ci?.address ?? null,
                birthplace: ci?.birthplace ?? null,
            };
        });
    },

    async getTests() {
        const { data, error } = await supabase.from('tests').select('id, testname').range(0, 9999);
        if (error) throw error;
        return (data || []) as Test[];
    },

    async getClientAnswers(clientId: number, testId: number) {
        const { data, error } = await supabase
            .from('testsanswers')
            .select('*')
            .eq('clientid', clientId)
            .eq('testid', testId)
            .order('questionid', { ascending: true })
            .range(0, 99999);

        if (error) throw error;
        return data || [];
    },

    async getQuestionsByIds(ids: number[]) {
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from('questions').select('id, question, dat_type').in('id', ids);
        if (error) throw error;
        return data || [];
    },

    async getOptionsByIds(ids: number[]) {
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from('answeroptions').select('id, answer').in('id', ids);
        if (error) throw error;
        return data || [];
    }
};
