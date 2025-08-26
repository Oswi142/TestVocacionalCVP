import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import logo from '../assets/logo-cvp.png'; // Asegurate que la ruta sea correcta

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
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

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
        {/* LOGO */}
        <Box
          component="img"
          src={logo}
          alt="Club Vida Plena"
          draggable={false}
          sx={{
            height: 120,
            maxWidth: '100%',
            objectFit: 'contain',
            mb: 3,
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
            mb: 2,
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

        {/* Contenido */}
        <Box
          sx={{
            width: '100%',
            padding: 4,
            borderRadius: 4,
            backgroundColor: '#ffffff',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
            minHeight: 460,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {activeTab === 'tests' ? (
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
                Es hora de iniciar a realizar los tests! 😄
              </Typography>

              <Box display="flex" flexDirection="column" gap={2} mt={4} width="100%">
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
                onClick={handleLogout}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
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
                  mt: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  '&:hover': {
                    backgroundColor: '#e8f5e9',
                  },
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
