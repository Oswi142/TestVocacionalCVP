export type UserRole = 'admin' | 'client';

export interface User {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    password?: string;
    created_by?: number;
    created_by_name?: string | null;
    created_at?: string;
}

export interface ClientInfo {
    user_id: number;
    birthday: string | null;
    address: string | null;
    birthplace: string | null;
    school?: string | null;
    gender?: string | null;
    grade?: string | null;
}

export interface UnifiedClient extends ClientInfo {
    name: string;
    username: string;
}
