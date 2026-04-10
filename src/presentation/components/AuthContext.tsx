import React, { createContext, useState, useEffect, ReactNode } from 'react';

export interface User {
    id: number;
    name: string;
    username: string;
    role: 'admin' | 'client';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const loginTimestamp = localStorage.getItem('login_timestamp');

        if (storedUser) {
            const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
            const isExpired = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) > ONE_WEEK_MS;

            if (isExpired) {
                localStorage.removeItem('user');
                localStorage.removeItem('login_timestamp');
                setUser(null);
            } else {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error('Error parsing stored user:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('login_timestamp');
                }
            }
        }
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
