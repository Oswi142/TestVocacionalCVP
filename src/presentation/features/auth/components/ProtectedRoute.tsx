import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/application/useCases/useAuth';
import { Fade, Box } from '@mui/material';

interface Props {
  children: React.ReactElement;
  requiredRole?: 'admin' | 'client';
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const redirectPath = user.role === 'admin' ? '/admin' : '/client';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <Fade in timeout={600} key={location.pathname}>
      <Box sx={{ width: '100%', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Fade>
  );
};

export default ProtectedRoute;
