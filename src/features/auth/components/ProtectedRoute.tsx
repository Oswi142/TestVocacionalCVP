import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

interface Props {
  children: React.ReactElement;
  requiredRole?: 'admin' | 'client';
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // O un componente de carga
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Si el usuario no tiene el rol necesario, lo mandamos a su dashboard correspondiente
    const redirectPath = user.role === 'admin' ? '/admin' : '/client';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
