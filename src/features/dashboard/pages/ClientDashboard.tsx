import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme, CircularProgress, Fade } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PartyModeIcon from '@mui/icons-material/Celebration';
import { useAuth } from '../../../hooks/useAuth';
import { testService } from '../../../services/testService';
import LogoHeader from '../../../components/LogoHeader';
import LogoutDialog from '../../../components/LogoutDialog';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

const ClientDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tests' | 'account'>('tests');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progress, setProgress] = useState<{ hasCompletedIntro: boolean, completedMainTestIds: number[], completedDatTypes: string[] }>({
    hasCompletedIntro: false,
    completedMainTestIds: [],
    completedDatTypes: []
  });

  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      // Bloquear navegación y mostrar diálogo de cerrar sesión
      window.history.pushState(null, '', window.location.pathname);
      setShowLogoutDialog(true);
    };

    // Añadir una entrada inicial al historial para que el "atrás" sea capturable en el dashboard
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    const fetchProgress = async () => {
      if (user?.id) {
        try {
          const data = await testService.getDetailedProgress(user.id);
          setProgress(data);
        } catch (error) {
          console.error('Error fetching progress:', error);
        } finally {
          setLoadingProgress(false);
        }
      }
    };

    fetchProgress();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user?.id]);

  useEffect(() => {
    // Verificar si venimos de terminar un test y debemos mostrar confeti
    if (location.state?.showConfetti) {
      setShowConfetti(true);
      // Limpiamos el estado para que si recarga no vuelva a salir
      navigate(location.pathname, { replace: true, state: {} });

      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // 5 segundos de fiesta

      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    // Pre-descargar todos los tests para uso offline al entrar al dashboard
    if (navigator.onLine) {
      testService.prefetchAllTests();
    }
  }, []);

  const name = user?.name || '';
  const username = user?.username || '';

  // Ajustes para que entre en 1 pantalla (sin scroll) y se vea como tu screenshot
  const sizes = useMemo(() => {
    if (isMobile) {
      return {
        maxWidth: 420,
        logoH: 70,
        outerPad: 12,
        tabsH: 42,
        cardPad: 18,
        titleVariant: 'h6' as const,
        subtitleVariant: 'body2' as const,
        btnPy: 1.55,
        btnFont: '0.95rem',
        btnGap: 12,
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

  const buttonStyle = (gradient: string, shadowColor: string, status: 'locked' | 'active' | 'completed') => ({
    background: status === 'locked' ? '#e2e8f0' : (status === 'completed' ? '#f0fdf4' : gradient),
    color: status === 'locked' ? '#94a3b8' : (status === 'completed' ? '#166534' : '#fff'),
    fontWeight: 800,
    py: sizes.btnPy,
    borderRadius: 4,
    textTransform: 'none',
    fontSize: sizes.btnFont,
    lineHeight: 1.1,
    boxShadow: status === 'active' ? `0 4px 15px ${shadowColor}` : 'none',
    border: status === 'completed' ? '2px solid #bbf7d0' : 'none',
    cursor: status === 'active' ? 'pointer' : 'default',
    transition: 'all 0.3s ease-in-out',
    pointerEvents: status === 'active' ? 'auto' : 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1.5,
    '&:hover': status === 'active' ? {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 25px ${shadowColor}`,
    } : {},
    '&:active': status === 'active' ? { transform: 'translateY(1px)' } : {}
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
    <Box sx={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', px: `${sizes.outerPad}px` }}>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={600}
          gravity={0.12}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
        />
      )}
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: loadingProgress ? 200 : 'auto',
                }}
              >
                {loadingProgress ? (
                  <CircularProgress color="primary" />
                ) : !progress.hasCompletedIntro ? (
                  <>
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
                      Pero antes de comenzar, necesitamos conocerte mejor
                    </Typography>
                    <Button
                      fullWidth
                      onClick={() => navigate('/introduccion')}
                      sx={buttonStyle('linear-gradient(90deg, #91e257ff, #ff823aff)', 'rgba(144, 142, 75, 0.79)', 'active')}
                    >
                      👋 INTRODUCCIÓN
                    </Button>
                  </>
                ) : (
                  <>
                    {(() => {
                      const tests = [
                        { id: 1, label: '📄 ENTREVISTA', path: '/entrevista', gradient: 'linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)', shadow: 'rgba(127, 127, 213, 0.3)' },
                        { id: 2, label: '🧠 IPPR', path: '/ippr', gradient: 'linear-gradient(90deg, #ff758c, #ff7eb3)', shadow: 'rgba(255, 117, 140, 0.3)' },
                        { id: 3, label: '🍥 CHASIDE', path: '/chaside', gradient: 'linear-gradient(90deg, #ff6a00, #ee0979)', shadow: 'rgba(255, 106, 0, 0.3)' },
                        { id: 4, label: '🛠️ MACI', path: '/maci', gradient: 'linear-gradient(90deg, #43cea2, #185a9d)', shadow: 'rgba(67, 206, 162, 0.3)' },
                        { id: 5, label: '🧩 DAT', path: '/dat', gradient: 'linear-gradient(90deg, #11998e, #38ef7d)', shadow: 'rgba(17, 153, 142, 0.3)' },
                      ];

                      // Un test DAT se considera completado si tiene los 6 subtests
                      const isDatCompleted = progress.completedDatTypes.length >= 6;
                      const allFinished = progress.completedMainTestIds.length >= 4 && isDatCompleted;

                      if (allFinished) {
                        const whatsappMsg = `¡Hola! Soy ${name}. He completado satisfactoriamente todos los tests vocacionales.`;
                        const whatsappUrl = `https://wa.me/59162733929?text=${encodeURIComponent(whatsappMsg)}`;

                        return (
                          <Fade in timeout={800}>
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <Box sx={{
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                p: 3,
                                borderRadius: 6,
                                border: '2px dashed #4caf50',
                                position: 'relative',
                                width: '100%'
                              }}>
                                <PartyModeIcon sx={{ fontSize: '3.5rem', color: '#4caf50', mb: 1.5 }} />
                                <Typography variant="h5" fontWeight={900} color="#2e7d32" gutterBottom>
                                  ¡Muchas Felicidades! 🎉
                                </Typography>
                                <Typography variant="body1" color="#1b5e20" sx={{ mb: 1, fontWeight: 500 }}>
                                  Has completado todos los tests de manera exitosa.
                                </Typography>
                                <Typography variant="body2" color="#388e3c">
                                  Ahora el siguiente paso es comunicarte con la clínica para que podamos procesar tus resultados.
                                </Typography>
                              </Box>

                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<WhatsAppIcon />}
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  background: 'linear-gradient(90deg, #25D366, #128C7E)',
                                  color: '#fff',
                                  fontWeight: 800,
                                  py: 2.2,
                                  borderRadius: 4,
                                  fontSize: '1.05rem',
                                  textTransform: 'none',
                                  boxShadow: '0 8px 25px rgba(37, 211, 102, 0.3)',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 12px 30px rgba(37, 211, 102, 0.4)',
                                    background: 'linear-gradient(90deg, #128C7E, #25D366)',
                                  }
                                }}
                              >
                                Notificar a la Clínica
                              </Button>
                            </Box>
                          </Fade>
                        );
                      }

                      return tests.map((t, idx) => {
                        const isCompleted = t.id === 5 ? isDatCompleted : progress.completedMainTestIds.includes(t.id);

                        // Habilitado si es el primero o si el anterior está completado
                        let isEnabled = false;
                        if (idx === 0) {
                          isEnabled = !isCompleted;
                        } else {
                          const prevTest = tests[idx - 1];
                          const prevCompleted = prevTest.id === 5 ? isDatCompleted : progress.completedMainTestIds.includes(prevTest.id);
                          isEnabled = prevCompleted && !isCompleted;
                        }

                        // Caso especial: si ya está completado, no está "enabled" para entrar (se bloquea)
                        const status = isCompleted ? 'completed' : (isEnabled ? 'active' : 'locked');

                        return (
                          <Button
                            key={t.id}
                            fullWidth
                            onClick={() => navigate(t.path)}
                            sx={buttonStyle(t.gradient, t.shadow, status)}
                          >
                            {status === 'locked' && <LockIcon sx={{ fontSize: '1.1rem' }} />}
                            {t.id === 5 && isDatCompleted ? '🧩 DAT (CONTINUAR)' : t.label}
                            {status === 'completed' && <CheckCircleIcon sx={{ fontSize: '1.1rem' }} />}
                          </Button>
                        );
                      });
                    })()}
                  </>
                )}
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

      <LogoutDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
      />
    </Box>
  );
};

export default ClientDashboard;
