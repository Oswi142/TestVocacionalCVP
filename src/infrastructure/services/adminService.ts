import { supabase } from '@/infrastructure/config/supabaseClient';
import { Test } from '@/domain/entities/test';

export const adminService = {
    async getUsers(role?: string) {
        let query = supabase.from('users').select('id, name, username, role, first_last_name, second_last_name, created_by, created_at').range(0, 9999);
        if (role) {
            query = query.eq('role', role);
        }

        const [clientsRes, usersRes] = await Promise.all([
            supabase.from('clients_info').select('*').range(0, 9999),
            query,
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (usersRes.error) throw usersRes.error;

        // Necesitamos todos los nombres de usuarios para mapear el creador, 
        // pero si el filtro de rol está activo, usersRes no tendrá a todos.
        // Sin embargo, en la vista admin usualmente queremos ver a todos.
        
        const clients_info = clientsRes.data || [];
        const users = usersRes.data || [];

        const usersDedup = Array.from(new Map(users.map((u: any) => [u.id, u])).values());
        const ciMap = new Map<number, any>(clients_info.map((c: any) => [c.user_id, c]));
        const usersMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

        return usersDedup.map((u: any) => {
            const ci = ciMap.get(u.id);
            const creator = u.created_by ? usersMap.get(u.created_by) : null;
            return {
                id: u.id,
                user_id: u.id,
                name: u.name,
                first_last_name: u.first_last_name,
                second_last_name: u.second_last_name,
                username: u.username,
                role: u.role,
                created_by: u.created_by,
                created_by_name: creator?.name ?? null,
                created_at: u.created_at,
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
        const { data, error } = await supabase.from('tests').select('id, test_name').range(0, 9999);
        if (error) throw error;
        return (data || []) as Test[];
    },

    async getClientAnswers(client_id: number, test_id: number) {
        const { data, error } = await supabase
            .from('test_answers')
            .select('*')
            .eq('client_id', client_id)
            .eq('test_id', test_id)
            .order('question_id', { ascending: true })
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
        const { data, error } = await supabase.from('answer_options').select('id, answer').in('id', ids);
        if (error) throw error;
        return data || [];
    },

    async checkUserDependencies(user_id: number) {
        const [answersRes, infoRes] = await Promise.all([
            supabase.from('test_answers').select('test_id').eq('client_id', user_id).limit(1),
            supabase.from('clients_info').select('user_id').eq('user_id', user_id).limit(1),
        ]);
        return (answersRes.data?.length || 0) > 0 || (infoRes.data?.length || 0) > 0;
    },

    async deleteUser(user_id: number) {
        // 1. Borrar respuestas de tests
        const { error: errAnswers } = await supabase.from('test_answers').delete().eq('client_id', user_id);
        if (errAnswers) throw errAnswers;

        // 2. Borrar info de cliente
        const { error: errInfo } = await supabase.from('clients_info').delete().eq('user_id', user_id);
        if (errInfo) throw errInfo;

        // 3. Borrar usuario
        const { error: errUser } = await supabase.from('users').delete().eq('id', user_id);
        if (errUser) throw errUser;

        return true;
    }
};
