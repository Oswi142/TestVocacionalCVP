import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import logo from '../assets/logo-cvp.png';

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

  const buttonStyle = (gradient: string) => ({
    background: gradient,
    color: '#fff',
    fontWeight: 700,
    py: sizes.btnPy,
    borderRadius: 2,
    textTransform: 'none',
    fontSize: sizes.btnFont,
    lineHeight: 1.1,
    '&:hover': { opacity: 0.92 },
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
            backgroundColor: '#ffffff',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
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
          <Typography
            variant={sizes.titleVariant}
            fontWeight={800}
            color="green"
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
              sx={buttonStyle('linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)')}
            >
              Razonamiento Verbal
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/numerico')}
              sx={buttonStyle('linear-gradient(90deg, #ff758c, #ff7eb3)')}
            >
              Razonamiento Numérico
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/abstracto')}
              sx={buttonStyle('linear-gradient(90deg, #ff6a00, #ee0979)')}
            >
              Razonamiento Abstracto
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/mecanico')}
              sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)')}
            >
              Razonamiento Mecánico
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/espaciales')}
              sx={buttonStyle('linear-gradient(90deg, #00c6ff, #0072ff)')}
            >
              Relaciones Espaciales
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/dat/ortografia')}
              sx={buttonStyle('linear-gradient(90deg, #f7971e, #ffd200)')}
            >
              Ortografía
            </Button>
            <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate('/client')}
            sx={{
                fontWeight: 800,
                py: isMobile ? 0.9 : 1.05,
                textTransform: 'none',
                fontSize: sizes.btnFont,
                borderColor: '#2e7d32',
                color: '#2e7d32',
                '&:hover': { backgroundColor: '#e8f5e9' },
            }}
            >
            Volver
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DatDashboard;
