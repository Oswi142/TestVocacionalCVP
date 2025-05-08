import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Header from '../components/Header'; // Asegúrate de que la ruta esté bien

const ClientDashboard: React.FC = () => {
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

  return (
    <>
      <Header />

      <Box
        sx={{
          width: '100vw',
          height: 'calc(100vh - 64px)', // altura total menos el header
          background: 'linear-gradient(to right, rgb(249, 201, 164), rgb(202, 250, 204))',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
        }}
      >
        <Box
          sx={{
            padding: 4,
            borderRadius: 4,
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            fontWeight={700}
            color="green"
            gutterBottom
          >
            Bienvenido, {name} 👋
          </Typography>

          <Typography variant="body1" color="text.secondary" gutterBottom>
            Es hora de iniciar a realizar los tests! 😄
          </Typography>

          <Box display="flex" flexDirection="column" gap={2} mt={4}>
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
              onClick={() => navigate('/dat')}
              sx={buttonStyle('linear-gradient(90deg, #43cea2, #185a9d)')}
            >
              🛠️ DAT
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default ClientDashboard;
