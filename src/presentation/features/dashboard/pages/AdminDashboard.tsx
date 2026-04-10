import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
  Fade,
} from '@mui/material';
import { useAuth } from '@/application/useCases/useAuth';
import PageBackground from '@/presentation/components/PageBackground';
import LogoHeader from '@/presentation/components/LogoHeader';
import LogoutDialog from '@/presentation/components/LogoutDialog';
import { useEffect } from 'react';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'acciones' | 'cuenta'>('acciones');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const name = user?.name || '';
  const username = user?.username || '';

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      setShowLogoutDialog(true);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  const tabButtonStyle = (selected: boolean) => ({
    flex: 1,
    borderRadius: 3,
    fontWeight: selected ? 800 : 600,
    color: selected ? '#1e293b' : '#64748b',
    backgroundColor: selected ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
    textTransform: 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: selected ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)',
    },
  });

  const buttonStyle = (gradient: string, shadowColor: string) => ({
    background: gradient,
    color: '#fff',
    fontWeight: 800,
    paddingY: 2,
    borderRadius: 4,
    textTransform: 'none',
    fontSize: '1.05rem',
    boxShadow: `0 4px 15px ${shadowColor}`,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 25px ${shadowColor}`,
    },
    '&:active': { transform: 'translateY(1px)' }
  });

  const handleLogoutClick = () => setShowLogoutDialog(true);
  const confirmLogout = () => logout();

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
            borderRadius: 4,
            p: 0.5,
            mb: 2,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
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
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.08)',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {activeTab === 'acciones' ? (
            <Fade in timeout={600} key="admin-acciones">
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography
                variant={isMobile ? 'h6' : 'h5'}
                fontWeight={800}
                color="#1e293b"
                gutterBottom
              >
                Bienvenido, {name} 👋
              </Typography>
              <Typography variant="body1" gutterBottom>
                Este es el panel de administración. Aquí puedes gestionar usuarios y ver resultados.
              </Typography>

              {/* Botones en columna */}
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
                  sx={buttonStyle('linear-gradient(90deg, #667eea, #764ba2)', 'rgba(118, 75, 162, 0.3)')}
                >
                  Gestión de Usuarios
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/reportes-clientes')}
                  sx={buttonStyle('linear-gradient(90deg, #e04545ff,#e3a656ff)', 'rgba(224, 69, 69, 0.3)')}
                >
                  Ver Resultados
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/respuestas-clientes')}
                  sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)', 'rgba(24, 90, 157, 0.3)')}
                >
                  Descargar Respuestas
                </Button>
              </Box>
              </Box>
            </Fade>
          ) : (
            <Fade in timeout={600} key="admin-cuenta">
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                variant="contained"
                color="error"
                fullWidth
                onClick={handleLogoutClick}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 3,
                  py: 1.5,
                  boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(211, 47, 47, 0.4)'
                  }
                }}
              >
                Cerrar sesión
              </Button>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {/* Dialogo Modular de Confirmación de Cierre de Sesión */}
      <LogoutDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
      />
    </PageBackground>
  );
};

export default AdminDashboard;
