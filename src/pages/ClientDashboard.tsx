import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import logo from '../assets/logo-cvp.png';

const ClientDashboard: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState<'tests' | 'account'>('tests');

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setName(user.name);
      setUsername(user.username);
    } else {
      navigate('/');
    }
  }, [navigate]);

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
      btnPy: 1.75,       // 🔥 más gorditos
      btnFont: '1rem',
      btnGap: 14,
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

  const tabButtonStyle = (selected: boolean) => ({
    flex: 1,
    borderRadius: 0,
    fontWeight: 700,
    color: selected ? '#2e7d32' : '#888',
    backgroundColor: '#ffffff',
    borderBottom: selected ? '3px solid #2e7d32' : '1px solid #ccc',
    textTransform: 'none',
    height: sizes.tabsH,
    '&:hover': { backgroundColor: '#f5f5f5' },
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100dvh',     // ✅ ocupa exactamente la pantalla
        overflow: 'hidden',   // ✅ NO scroll dentro del componente
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

        {/* Tabs */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 2,
            backgroundColor: '#fff',
          }}
        >
          <Button onClick={() => setActiveTab('tests')} sx={tabButtonStyle(activeTab === 'tests')}>
            Tests
          </Button>
          <Button onClick={() => setActiveTab('account')} sx={tabButtonStyle(activeTab === 'account')}>
            Cuenta
          </Button>
        </Box>

        {/* Card */}
        <Box
          sx={{
            width: '100%',
            backgroundColor: '#fff',
            boxShadow: '0px 8px 30px rgba(0,0,0,0.10)',
            borderRadius: `${sizes.cardRadius}px`,
            p: `${sizes.cardPad}px`,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden', // ✅ evita scroll interno

            // ✅ limita el alto del card para que SIEMPRE entre en pantalla
            maxHeight: `calc(100dvh - ${sizes.logoH}px - ${sizes.tabsH}px - 64px)`,
          }}
        >
          {activeTab === 'tests' ? (
            <>
              <Typography variant={sizes.titleVariant} fontWeight={800} color="green" gutterBottom>
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
                  sx={buttonStyle('linear-gradient(90deg, #7F7FD5, #86A8E7, #91EAE4)')}
                >
                  📄 ENTREVISTA
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/ippr')}
                  sx={buttonStyle('linear-gradient(90deg, #ff758c, #ff7eb3)')}
                >
                  🧠 IPPR
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/chaside')}
                  sx={buttonStyle('linear-gradient(90deg, #ff6a00, #ee0979)')}
                >
                  🍥 CHASIDE
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/maci')}
                  sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)')}
                >
                  🛠️ MACI
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/dat')}
                  sx={buttonStyle('linear-gradient(90deg, #11998e, #38ef7d)')}
                >
                  🧩 DAT
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
                Cuenta
              </Typography>

              <Typography variant={sizes.subtitleVariant} color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>Nombre:</strong> {name}
              </Typography>

              <Typography variant={sizes.subtitleVariant} color="text.secondary" sx={{ mb: 2 }}>
                <strong>Usuario:</strong> {username}
              </Typography>

              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleLogout}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  py: sizes.btnPy,
                }}
              >
                Cerrar sesión
              </Button>

              <Button
                variant="outlined"
                fullWidth
                href="https://wa.me/59162733929?text=Hola%2C%20quisiera%20hacer%20una%20consulta%20sobre%20el%20test%20vocacional"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  mt: 1.2,
                  fontWeight: 700,
                  textTransform: 'none',
                  py: sizes.btnPy,
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  '&:hover': { backgroundColor: '#e8f5e9' },
                }}
              >
                Contáctanos por WhatsApp
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientDashboard;
