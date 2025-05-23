import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
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
import logo from '../assets/logo-cvp.png';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const user = await login(username, password);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'client') {
        navigate('/client');
      } else {
        setError('Rol desconocido');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(to right,rgb(249, 201, 164),rgb(202, 250, 204))',
        padding: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          borderRadius: 4,
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          backgroundColor: '#fff',
        }}
      >
        <img
          src={logo}
          alt="Club Vida Plena"
          style={{ width: isMobile ? 120 : 180, marginBottom: 0 }}
        />

        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          fontWeight={600}
          color="#2E7D32"
          gutterBottom
        >
          Bienvenido!
        </Typography>

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
    </Box>
  );
};

export default Login;
