import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

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

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
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
          backgroundColor: '#fff',
          boxShadow: 3,
        }}
      >
        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          fontWeight={600}
          color="#2E7D32"
          gutterBottom
        >
          Bienvenido, {name} 👋
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
        >
          Es hora de iniciar a realizar los tests! ;)
        </Typography>

        <Box display="flex" flexDirection="column" gap={2} mt={4}>
          <Box>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/entrevista')}
              sx={{
                color: '#000',
                borderColor: '#ccc',
                backgroundColor: '#fff',
                '&:hover': { backgroundColor: '#f0f0f0' },
                paddingY: 2
              }}
            >
              📝 Entrevista
            </Button>
          </Box>
          <Box>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/ippr')}
              sx={{
                color: '#000',
                borderColor: '#ccc',
                backgroundColor: '#fff',
                '&:hover': { backgroundColor: '#f0f0f0' },
                paddingY: 2
              }}
            >
              🧠 IPPR
            </Button>
          </Box>
          <Box>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/chaside')}
              sx={{
                color: '#000',
                borderColor: '#ccc',
                backgroundColor: '#fff',
                '&:hover': { backgroundColor: '#f0f0f0' },
                paddingY: 2
              }}
            >
              🎨 CHASIDE
            </Button>
          </Box>
          <Box>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/dat')}
              sx={{
                color: '#000',
                borderColor: '#ccc',
                backgroundColor: '#fff',
                '&:hover': { backgroundColor: '#f0f0f0' },
                paddingY: 2
              }}
            >
              🔧 DAT
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ClientDashboard;
