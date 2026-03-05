export type UserRole = 'admin' | 'client';

export interface User {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    password?: string;
}

export interface ClientInfo {
    userid: number;
    birthday: string | null;
    address: string | null;
    birthplace: string | null;
    school?: string | null;
}

export interface UnifiedClient extends ClientInfo {
    name: string;
    username: string;
}
