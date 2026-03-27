import { supabase } from '../supabaseClient';
import { Test } from '../types/test';

export const adminService = {
    async getUsers(role?: string) {
        let query = supabase.from('users').select('id, name, username, role, firstlastname, secondlastname').range(0, 9999);
        if (role) {
            query = query.eq('role', role);
        }

        const [clientsRes, usersRes] = await Promise.all([
            supabase.from('clientsinfo').select('*').range(0, 9999),
            query,
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (usersRes.error) throw usersRes.error;

        const clientsInfo = clientsRes.data || [];
        const users = usersRes.data || [];

        const usersDedup = Array.from(new Map(users.map((u: any) => [u.id, u])).values());
        const ciMap = new Map<number, any>(clientsInfo.map((c: any) => [c.userid, c]));

        return usersDedup.map((u: any) => {
            const ci = ciMap.get(u.id);
            return {
                id: u.id,
                userid: u.id,
                name: u.name,
                firstlastname: u.firstlastname,
                secondlastname: u.secondlastname,
                username: u.username,
                role: u.role,
                birthday: ci?.birthday ?? null,
                address: ci?.address ?? null,
                birthplace: ci?.birthplace ?? null,
                school: ci?.school ?? null,
                gender: ci?.gender ?? null,
                grade: ci?.grade ?? null,
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
    },

    async checkUserDependencies(userId: number) {
        const [answersRes, infoRes] = await Promise.all([
            supabase.from('testsanswers').select('testid').eq('clientid', userId).limit(1),
            supabase.from('clientsinfo').select('userid').eq('userid', userId).limit(1),
        ]);
        return (answersRes.data?.length || 0) > 0 || (infoRes.data?.length || 0) > 0;
    },

    async deleteUser(userId: number) {
        // 1. Borrar respuestas de tests
        const { error: errAnswers } = await supabase.from('testsanswers').delete().eq('clientid', userId);
        if (errAnswers) throw errAnswers;

        // 2. Borrar info de cliente
        const { error: errInfo } = await supabase.from('clientsinfo').delete().eq('userid', userId);
        if (errInfo) throw errInfo;

        // 3. Borrar usuario
        const { error: errUser } = await supabase.from('users').delete().eq('id', userId);
        if (errUser) throw errUser;

        return true;
    }
};
