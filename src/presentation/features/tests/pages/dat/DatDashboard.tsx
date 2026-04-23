import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme, IconButton, CircularProgress, Dialog, DialogContent, DialogActions, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { testService } from '@/infrastructure/services/testService';
import logo from '@/assets/logo-cvp.png';

const DatDashboard: React.FC = () => {
  const [name, setName] = useState('');
  const [user_id, setuser_id] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [completedDatTypes, setCompletedDatTypes] = useState<string[]>([]);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Listen to connection changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setName(user.name);
      setuser_id(user.id);
    } else {
      navigate('/');
    }

    const handlePopState = () => {
      navigate('/client', { replace: true });
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (user_id) {
        try {
          const data = await testService.getDetailedProgress(user_id);
          setCompletedDatTypes(data.completedDatTypes);
        } catch (error) {
          console.error('Error fetching DAT progress:', error);
        } finally {
          setLoadingProgress(false);
        }
      }
    };
    fetchProgress();
  }, [user_id]);

  const sizes = useMemo(() => {
    if (isMobile) {
      return {
        maxWidth: 420,
        logoH: 70,
        outerPad: 12,
        cardPad: 18,
        btnPy: 1.55,
        btnFont: '0.95rem',
        gap: 12,
        titleVariant: 'body1' as const,
        subtitleVariant: 'body2' as const,
        cardRadius: 18,
      };
    }
    return {
      maxWidth: 650,
      logoH: 90,
      outerPad: 16,
      cardPad: 26,
      btnPy: 1.75,
      btnFont: '1rem',
      gap: 14,
      titleVariant: 'h6' as const,
      subtitleVariant: 'body1' as const,
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

  const handleTestClick = async (path: string) => {
    setLoadingProgress(true); // Reutilizamos el spinner para dar feedback
    
    // Verificación de "Fuego": Intento de fetch ultra rápido
    let realOnline = navigator.onLine;
    if (realOnline) {
      try {
        // Hacemos un fetch a un recurso muy pequeño (o simplemente un ping)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos máximo
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        realOnline = true;
      } catch (e) {
        realOnline = false;
      }
    }

    setLoadingProgress(false);

    if (!realOnline) {
      setIsOnline(false);
      setShowOfflineAlert(true);
      return;
    }

    setIsOnline(true);
    navigate(path);
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: `${sizes.outerPad}px`,
      }}
    >
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
        {/* Logo */}
        <Box
          component="img"
          src={logo}
          alt="Club Vida Plena"
          draggable={false}
          sx={{
            height: sizes.logoH,
            maxWidth: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            pointerEvents: 'none',
            caretColor: 'transparent',
          }}
        />

        {/* Card */}
        <Box
          sx={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.08)',
            position: 'relative',
            borderRadius: `${sizes.cardRadius}px`,
            p: `${sizes.cardPad}px`,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
            maxHeight: `calc(100dvh - ${sizes.logoH}px - 56px)`,
          }}
        >
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <IconButton
              onClick={() => navigate('/client', { replace: true })}
              sx={{
                position: 'absolute',
                left: -8,
                color: '#64748b',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  transform: 'scale(1.05)',
                  color: '#1e293b'
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography
              variant={sizes.titleVariant}
              fontWeight={800}
              color="#1e293b"
              sx={{ px: 5, textAlign: 'center' }}
            >
              DAT — Selecciona un apartado
            </Typography>
          </Box>

          <Typography
            variant={sizes.subtitleVariant}
            color="text.secondary"
            gutterBottom
            sx={{ mb: isMobile ? 1.5 : 2 }}
          >
            {name ? `Hola, ${name}. ` : ''}
            Elige una sección para empezar.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${sizes.gap}px`,
              width: '100%',
              mt: isMobile ? 1 : 1.5,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: loadingProgress ? 200 : 'auto',
            }}
          >
            {loadingProgress ? (
              <CircularProgress color="primary" />
            ) : (
              <>
                {(() => {
                  const subtests = [
                    { type: 'razonamiento_verbal', label: 'Razonamiento Verbal', path: '/dat/verbal', gradient: 'linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)', shadow: 'rgba(127, 127, 213, 0.3)' },
                    { type: 'razonamiento_numerico', label: 'Razonamiento Numérico', path: '/dat/numerico', gradient: 'linear-gradient(90deg, #ff758c, #ff7eb3)', shadow: 'rgba(255, 117, 140, 0.3)' },
                    { type: 'razonamiento_abstracto', label: 'Razonamiento Abstracto', path: '/dat/abstracto', gradient: 'linear-gradient(90deg, #ff6a00, #ee0979)', shadow: 'rgba(255, 106, 0, 0.3)' },
                    { type: 'razonamiento_mecanico', label: 'Razonamiento Mecánico', path: '/dat/mecanico', gradient: 'linear-gradient(90deg, #43cea2, #185a9d)', shadow: 'rgba(67, 206, 162, 0.3)' },
                    { type: 'razonamiento_espacial', label: 'Relaciones Espaciales', path: '/dat/espaciales', gradient: 'linear-gradient(90deg, #00c6ff, #0072ff)', shadow: 'rgba(0, 198, 255, 0.3)' },
                    { type: 'ortografia', label: 'Ortografía', path: '/dat/ortografia', gradient: 'linear-gradient(90deg, #f7971e, #ffd200)', shadow: 'rgba(247, 151, 30, 0.3)' },
                  ];

                  return subtests.map((s, idx) => {
                    const isCompleted = completedDatTypes.includes(s.type);

                    let isEnabled = false;
                    if (idx === 0) {
                      isEnabled = !isCompleted;
                    } else {
                      const prevCompleted = completedDatTypes.includes(subtests[idx - 1].type);
                      isEnabled = prevCompleted && !isCompleted;
                    }

                    const status = isCompleted ? 'completed' : (isEnabled ? 'active' : 'locked');

                    return (
                      <Button
                        key={s.type}
                        fullWidth
                        onClick={() => handleTestClick(s.path)}
                        sx={buttonStyle(s.gradient, s.shadow, status)}
                      >
                        {status === 'locked' && <LockIcon sx={{ fontSize: '1.1rem' }} />}
                        {s.label}
                        {status === 'completed' && <CheckCircleIcon sx={{ fontSize: '1.1rem' }} />}
                      </Button>
                    );
                  });
                })()}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Alerta de Conexión Estilo Card Premium (Reducido) */}
      <Dialog
        open={showOfflineAlert}
        onClose={() => setShowOfflineAlert(false)}
        PaperProps={{
          sx: {
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxWidth: 320,
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <WifiOffIcon sx={{ fontSize: 32, color: '#FF6F00' }} />
          </Box>
          <Typography variant="h6" fontWeight={900} color="#1e293b" gutterBottom>
            Conexión necesaria
          </Typography>
          <Typography variant="body2" color="#475569" fontWeight={500} sx={{ px: 1 }}>
            Se necesita internet para continuar con este test.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4, px: 4 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowOfflineAlert(false)}
            sx={{
              borderRadius: 3,
              py: 1.5,
              fontWeight: 800,
              backgroundColor: '#FF6F00',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#E65100',
              }
            }}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatDashboard;
