import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService } from '@/infrastructure/services/authService';
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
  Fade,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/application/useCases/useAuth';
import PageBackground from '@/presentation/components/PageBackground';
import LogoHeader from '@/presentation/components/LogoHeader';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userData = await loginService(username.trim(), password);
      login(userData);

      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'client') {
        navigate('/client');
      } else {
        setError('Rol desconocido');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <PageBackground>
      <Fade in timeout={800} appear={true}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 6,
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LogoHeader height={isMobile ? 120 : 180} />
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              fontWeight={800}
              color="#1e293b"
              gutterBottom
              sx={{ mt: 1 }}
            >
              Bienvenido!
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.3s ease',
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }
              }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.3s ease',
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }
              }}
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
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: '1.1rem',
                backgroundColor: '#FF6F00',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 6px 15px rgba(255, 111, 0, 0.3)',
                '&:hover': {
                  backgroundColor: '#E65100',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(255, 111, 0, 0.4)'
                },
                '&:active': {
                  transform: 'translateY(1px)',
                }
              }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Paper>
      </Fade>
    </PageBackground>
  );
};

export default Login;
