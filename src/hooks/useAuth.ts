import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, User } from '../components/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  const navigate = useNavigate();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, loading, setUser } = context;

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('user');
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
