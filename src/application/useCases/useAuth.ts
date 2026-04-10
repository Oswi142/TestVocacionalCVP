import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, User } from '@/presentation/components/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  const navigate = useNavigate();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, loading, setUser } = context;

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('login_timestamp', Date.now().toString());
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('login_timestamp');
    setUser(null);
    navigate('/');
  }, [navigate, setUser]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
  };
};

export type { User };
