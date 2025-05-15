import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import logo from '../assets/logo-cvp.png';

const AdminDashboard: React.FC = () => {
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'acciones' | 'cuenta'>('acciones');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setName(user.name);
    } else {
      navigate('/');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const tabButtonStyle = (selected: boolean) => ({
    flex: 1,
    borderRadius: 0,
    fontWeight: 600,
    color: selected ? '#2e7d32' : '#888',
    backgroundColor: '#ffffff',
    borderBottom: selected ? '3px solid #2e7d32' : '1px solid #ccc',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  });

  const buttonStyle = (gradient: string) => ({
    background: gradient,
    color: '#fff',
    fontWeight: 600,
    paddingY: 2,
    borderRadius: 2,
    textTransform: 'none',
    fontSize: '1rem',
    '&:hover': {
      opacity: 0.9,
    },
  });

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(to right, rgb(249, 201, 164), rgb(202, 250, 204))',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Club Vida Plena"
          sx={{ height: 120, maxWidth: '100%', objectFit: 'contain', mb: 3 }}
        />

        {/* Tabs */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
            boxShadow: 2,
            backgroundColor: '#fff',
          }}
        >
          <Button onClick={() => setActiveTab('acciones')} sx={tabButtonStyle(activeTab === 'acciones')}>
            Acciones
          </Button>
          <Button onClick={() => setActiveTab('cuenta')} sx={tabButtonStyle(activeTab === 'cuenta')}>
            Cuenta
          </Button>
        </Box>

        <Box
          sx={{
            width: '100%',
            padding: 4,
            borderRadius: 4,
            backgroundColor: '#ffffff',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {activeTab === 'acciones' ? (
            <>
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                fontWeight={700}
                color="green"
                gutterBottom
              >
                Bienvenido, {name} 👋
              </Typography>
              <Typography variant="body1" gutterBottom>
                Este es el panel de administración. Aquí puedes gestionar usuarios y ver resultados.
              </Typography>

              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} mt={4} width="100%">
                <Button
                  fullWidth
                  onClick={() => navigate('/crear-usuario')}
                  sx={buttonStyle('linear-gradient(90deg, #667eea, #764ba2)')}
                >
                  Crear Usuario
                </Button>
                <Button
                  fullWidth
                  onClick={() => navigate('/ver-resultados')}
                  sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)')}
                >
                  Ver Resultados
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
                Cuenta
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                <strong>Nombre:</strong> {name}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleLogout}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Cerrar sesión
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
