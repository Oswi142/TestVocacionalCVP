import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import logo from '../../../../assets/logo-cvp.png';

const DatDashboard: React.FC = () => {
  const [name, setName] = useState('');
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

    const handlePopState = () => {
      navigate('/client', { replace: true });
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const sizes = useMemo(() => {
    if (isMobile) {
      return {
        maxWidth: 420,
        logoH: 70,
        outerPad: 12,    // px
        cardPad: 18,     // px
        btnPy: 1.55,     // 🔥 gorditos
        btnFont: '0.95rem',
        gap: 12,         // px
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
      btnPy: 1.75,      // 🔥 gorditos
      btnFont: '1rem',
      gap: 14,
      titleVariant: 'h6' as const,
      subtitleVariant: 'body1' as const,
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

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100dvh',   // ✅ mejor para móvil
        overflow: 'hidden', // ✅ sin scroll
        background: 'linear-gradient(to right, rgb(249, 201, 164), rgb(202, 250, 204))',
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
        {/* LOGO */}
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
            position: 'relative', // Para el botón volver absoluto
            borderRadius: `${sizes.cardRadius}px`,
            p: `${sizes.cardPad}px`,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden', // ✅ evita scroll interno
            // ✅ el card siempre entra en pantalla (no se pasa)
            maxHeight: `calc(100dvh - ${sizes.logoH}px - 56px)`,
          }}
        >
          <IconButton
            onClick={() => navigate('/client', { replace: true })}
            sx={{
              position: 'absolute',
              top: isMobile ? 12 : 20,
              left: isMobile ? 12 : 20,
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
            gutterBottom
            sx={{ mb: 0.5 }}
          >
            DAT — Selecciona un apartado
          </Typography>

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
            }}
          >
            <Button
              fullWidth
              onClick={() => navigate('/dat/verbal')}
              sx={buttonStyle('linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)', 'rgba(127, 127, 213, 0.3)')}
            >
              Razonamiento Verbal
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/numerico')}
              sx={buttonStyle('linear-gradient(90deg, #ff758c, #ff7eb3)', 'rgba(255, 117, 140, 0.3)')}
            >
              Razonamiento Numérico
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/abstracto')}
              sx={buttonStyle('linear-gradient(90deg, #ff6a00, #ee0979)', 'rgba(255, 106, 0, 0.3)')}
            >
              Razonamiento Abstracto
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/mecanico')}
              sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)', 'rgba(67, 206, 162, 0.3)')}
            >
              Razonamiento Mecánico
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/espaciales')}
              sx={buttonStyle('linear-gradient(90deg, #00c6ff, #0072ff)', 'rgba(0, 198, 255, 0.3)')}
            >
              Relaciones Espaciales
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/ortografia')}
              sx={buttonStyle('linear-gradient(90deg, #f7971e, #ffd200)', 'rgba(247, 151, 30, 0.3)')}
            >
              Ortografía
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DatDashboard;
