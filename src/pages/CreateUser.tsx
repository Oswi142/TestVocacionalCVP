import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const CreateUser: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCreateUser = async () => {
    setMessage('');
    try {
      if (!name || !username || !password || !role) {
        setMessage('Todos los campos son obligatorios.');
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { error } = await supabase.from('users').insert({
        name,
        username,
        password: hashedPassword,
        role,
      });

      if (error) throw error;

      setMessage('✅ Usuario creado exitosamente');
      setName('');
      setUsername('');
      setPassword('');
      setRole('client');
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message);
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(to right, #f9c9a4, #cafacc)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 500,
          backgroundColor: '#ffffff',
          borderRadius: 4,
          boxShadow: 3,
          padding: 4,
        }}
      >
        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} gutterBottom color="primary">
          Crear Nuevo Usuario
        </Typography>

        <TextField
          label="Nombre"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
        />
        <TextField
          label="Usuario"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          margin="normal"
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Rol</InputLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            label="Rol"
          >
            <MenuItem value="client">Cliente</MenuItem>
            <MenuItem value="admin">Administrador</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" color="primary" fullWidth onClick={handleCreateUser} sx={{ mt: 2 }}>
          Crear Usuario
        </Button>

        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
          onClick={() => navigate('/admin')}
        >
          ← Volver al Dashboard
        </Button>

        {message && (
          <Alert sx={{ mt: 2 }} severity={message.includes('✅') ? 'success' : 'error'}>
            {message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default CreateUser;
