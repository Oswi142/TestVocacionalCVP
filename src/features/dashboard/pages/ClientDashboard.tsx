import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import PageBackground from '../../../components/PageBackground';
import LogoHeader from '../../../components/LogoHeader';
import LogoutDialog from '../../../components/LogoutDialog';

const ClientDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tests' | 'account'>('tests');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const handlePopState = () => {
      // Bloquear navegación y mostrar diálogo de cerrar sesión
      window.history.pushState(null, '', window.location.pathname);
      setShowLogoutDialog(true);
    };

    // Añadir una entrada inicial al historial para que el "atrás" sea capturable en el dashboard
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const name = user?.name || '';
  const username = user?.username || '';

  // Ajustes para que entre en 1 pantalla (sin scroll) y se vea como tu screenshot
  const sizes = useMemo(() => {
    if (isMobile) {
      return {
        maxWidth: 420,
        logoH: 70,
        outerPad: 12,     // px
        tabsH: 42,        // px
        cardPad: 18,      // px
        titleVariant: 'h6' as const,
        subtitleVariant: 'body2' as const,
        btnPy: 1.55,      // 🔥 más gorditos
        btnFont: '0.95rem',
        btnGap: 12,       // px
        cardRadius: 18,
      };
    }
    return {
      maxWidth: 620,
      logoH: 92,
      outerPad: 16,
      tabsH: 46,
      cardPad: 26,
      titleVariant: 'h5' as const,
      subtitleVariant: 'body1' as const,
      btnPy: 1.75,
      btnFont: '1rem',
      btnGap: 14,
      cardRadius: 22,
    };
  }, [isMobile]);

  const buttonStyle = (gradient: string, shadowColor: string) => ({
    background: gradient,
    color: '#fff',
    fontWeight: 800,
    py: sizes.btnPy,
    borderRadius: 4,
    textTransform: 'none',
    fontSize: sizes.btnFont,
    lineHeight: 1.1,
    boxShadow: `0 4px 15px ${shadowColor}`,
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 25px ${shadowColor}`,
    },
    '&:active': { transform: 'translateY(1px)' }
  });

  const tabButtonStyle = (selected: boolean) => ({
    flex: 1,
    borderRadius: 3,
    fontWeight: selected ? 800 : 700,
    color: selected ? '#1e293b' : '#64748b',
    backgroundColor: selected ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
    textTransform: 'none',
    height: sizes.tabsH,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: selected ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)',
    },
  });

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
  };

  return (
    <PageBackground sx={{ height: '100dvh', px: `${sizes.outerPad}px` }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: sizes.maxWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? 1.2 : 1.6,
        }}
      >
        <LogoHeader height={sizes.logoH} />

        {/* Tabs */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            borderRadius: 4,
            p: 0.5,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <Button onClick={() => setActiveTab('tests')} sx={tabButtonStyle(activeTab === 'tests')}>
            Tests
          </Button>
          <Button onClick={() => setActiveTab('account')} sx={tabButtonStyle(activeTab === 'account')}>
            Cuenta
          </Button>
        </Box>

        <Box
          sx={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.08)',
            borderRadius: `${sizes.cardRadius}px`,
            padding: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 400,
            overflow: 'hidden', // evita scroll interno
            // limita el alto del card para que SIEMPRE entre en pantalla
            maxHeight: `calc(100dvh - ${sizes.logoH}px - ${sizes.tabsH}px - 64px)`,
          }}
        >
          {activeTab === 'tests' ? (
            <>
              <Typography variant={sizes.titleVariant} fontWeight={800} color="#1e293b" gutterBottom>
                Bienvenido, {name} 👋
              </Typography>

              <Typography variant={sizes.subtitleVariant} gutterBottom sx={{ mb: isMobile ? 1.2 : 2 }}>
                Es hora de iniciar a realizar los tests! 😄
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${sizes.btnGap}px`,
                  width: '100%',
                  mt: isMobile ? 1 : 2,
                }}
              >
                <Button
                  fullWidth
                  onClick={() => navigate('/entrevista')}
                  sx={buttonStyle('linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)', 'rgba(127, 127, 213, 0.3)')}
                >
                  📄 ENTREVISTA
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/ippr')}
                  sx={buttonStyle('linear-gradient(90deg, #ff758c, #ff7eb3)', 'rgba(255, 117, 140, 0.3)')}
                >
                  🧠 IPPR
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/chaside')}
                  sx={buttonStyle('linear-gradient(90deg, #ff6a00, #ee0979)', 'rgba(255, 106, 0, 0.3)')}
                >
                  🍥 CHASIDE
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/maci')}
                  sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)', 'rgba(67, 206, 162, 0.3)')}
                >
                  🛠️ MACI
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/dat')}
                  sx={buttonStyle('linear-gradient(90deg, #11998e, #38ef7d)', 'rgba(17, 153, 142, 0.3)')}
                >
                  🧩 DAT
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
                variant="contained"
                color="error"
                fullWidth
                onClick={handleLogout}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 3,
                  py: sizes.btnPy,
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

              <Button
                variant="contained"
                fullWidth
                href="https://wa.me/59162733929?text=Hola%2C%20quisiera%20hacer%20una%20consulta%20sobre%20el%20test%20vocacional"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 3,
                  py: sizes.btnPy,
                  backgroundColor: '#2e7d32',
                  color: '#ffffff',
                  boxShadow: '0 4px 15px rgba(46, 125, 50, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(46, 125, 50, 0.4)'
                  },
                }}
              >
                Contáctanos por WhatsApp
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Modular Logout Confirmation Dialog */}
      <LogoutDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
      />
    </PageBackground>
  );
};

export default ClientDashboard;
