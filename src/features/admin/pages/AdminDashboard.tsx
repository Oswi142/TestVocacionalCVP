import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import PageBackground from '../../../components/PageBackground';
import LogoHeader from '../../../components/LogoHeader';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'acciones' | 'cuenta'>('acciones');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const name = user?.name || '';
  const username = user?.username || '';



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
    <PageBackground>
      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <LogoHeader sx={{ mb: 3 }} />

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

              {/* Botones siempre en columna */}
              <Box
                display="flex"
                flexDirection="column"
                gap={2}
                mt={4}
                width="100%"
              >
                <Button
                  fullWidth
                  onClick={() => navigate('/gestion-usuarios')}
                  sx={buttonStyle('linear-gradient(90deg, #667eea, #764ba2)')}
                >
                  Gestión de Usuarios
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/reportes-clientes')}
                  sx={buttonStyle('linear-gradient(90deg, #e04545ff,#e3a656ff)')}
                >
                  Ver Resultados
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/respuestas-clientes')}
                  sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)')}
                >
                  Descargar Respuestas
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
                Cuenta
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={1}>
                <strong>Nombre:</strong> {name}
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                <strong>Usuario:</strong> {username}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={logout}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Cerrar sesión
              </Button>
            </>
          )}
        </Box>
      </Box>
    </PageBackground>
  );
};

export default AdminDashboard;
