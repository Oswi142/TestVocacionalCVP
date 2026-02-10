import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService } from '../../../services/authService';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  useMediaQuery,
  useTheme,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import PageBackground from '../../../components/PageBackground';
import LogoHeader from '../../../components/LogoHeader';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const userData = await loginService(username, password);
      login(userData);

      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'client') {
        navigate('/client');
      } else {
        setError('Rol desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <PageBackground>
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 4,
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LogoHeader height={isMobile ? 120 : 180} />
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            fontWeight={600}
            color="#2E7D32"
            gutterBottom
            sx={{ mt: 1 }}
          >
            Bienvenido!
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Usuario"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            inputProps={{ 'data-testid': 'username-input' }}
          />

          <TextField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            inputProps={{ 'data-testid': 'password-input' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            data-testid="login-button"
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              py: 1,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              backgroundColor: '#FF6F00',
              '&:hover': { backgroundColor: '#EF6C00' },
            }}
          >
            Entrar
          </Button>
        </form>
      </Paper>
    </PageBackground>
  );
};

export default Login;
