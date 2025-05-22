import React, { useEffect, useState } from 'react';
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
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Divider,
  InputAdornment
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const UserManagement: React.FC = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [showPasswordCreate, setShowPasswordCreate] = useState(true);
  const [showPasswordEdit, setShowPasswordEdit] = useState(true);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

  const isValidName = (value: string) => {
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/; // Letras y espacios
    return regex.test(value.trim()) && value.trim().length > 0;
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select();
    if (!error) setUsers(data);
  };

  const handleCreateUser = async () => {
    try {
      if (!name || !username || !password || !role) return;
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        showToast('Ese nombre de usuario ya está en uso', 'error');
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('users').insert({ name, username, password: hashedPassword, role });
      if (error) throw error;

      handleCloseCreateDialog();
      fetchUsers();
      showToast('Usuario creado exitosamente', 'success');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleUpdateUser = async () => {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', editingUser.id)
        .single();

      if (existing) {
        showToast('Ese nombre de usuario ya está en uso', 'error');
        return;
      }

      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
      const { error } = await supabase
        .from('users')
        .update({ name, username, ...(hashedPassword ? { password: hashedPassword } : {}), role })
        .eq('id', editingUser.id);
      if (error) throw error;

      handleCloseEditDialog();
      fetchUsers();
      showToast('Usuario actualizado', 'success');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
  };


  const handleDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) {
      showToast('No puedes eliminar tu propio usuario', 'error');
      setOpenConfirmDialog(false);
      return;
    }

    const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
    if (!error) {
      fetchUsers();
      showToast('Usuario eliminado', 'success');
    }
    setOpenConfirmDialog(false);
    setUserToDelete(null);
  };
  const showToast = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setShowSnackbar(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setRole(user.role);
    setPassword('');
    setShowPasswordEdit(true);
    setOpenEditDialog(true);
  };

  const confirmDelete = (user: any) => {
    setUserToDelete(user);
    setOpenConfirmDialog(true);
  };

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('client');
    setEditingUser(null);
    setShowPasswordCreate(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    resetForm();
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    resetForm();
  };

  const isCreateDisabled = !isValidName(name) || !username || !password || !role;

  const isEditDisabled =
    !editingUser ||
    !isValidName(name) ||
    (name === editingUser.name &&
      username === editingUser.username &&
      role === editingUser.role &&
      password === '');

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        background: 'linear-gradient(to right, #f9c9a4, #cafacc)',
        p: isMobile ? 2 : 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          backgroundColor: '#fff',
          borderRadius: 3,
          p: isMobile ? 2 : 4,
          boxShadow: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            mb: 3,
            gap: isMobile ? 2 : 0,
          }}
        >
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} color="primary">
            Gestión de Usuarios
          </Typography>
          <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} width={isMobile ? '100%' : 'auto'}>
            <Button variant="contained" onClick={() => setOpenCreateDialog(true)} fullWidth={isMobile}>
              + Crear Usuario
            </Button>
            <Button variant="outlined" onClick={() => navigate('/admin')} fullWidth={isMobile}>
              ← Volver al Dashboard
            </Button>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom fontWeight={600}>
          Lista de Usuarios
        </Typography>

        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2, overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell><strong>Nombre</strong></TableCell>
                <TableCell><strong>Usuario</strong></TableCell>
                <TableCell><strong>Rol</strong></TableCell>
                <TableCell align="right"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell align="right">
                    <IconButton sx={{ color: '#1976d2' }} onClick={() => handleEdit(user)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      sx={{ color: '#d32f2f' }}
                      onClick={() => confirmDelete(user)}
                      disabled={user.id === currentUser.id}
                      title={user.id === currentUser.id ? "No puedes eliminar tu propio usuario" : "Eliminar"}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Crear Usuario */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} fullWidth maxWidth="xs">
        <DialogTitle>Crear Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            error={!isValidName(name) && name.length > 0}
            helperText={
              !isValidName(name) && name.length > 0
                ? 'Solo letras y espacios. No se permiten símbolos ni espacios vacíos.'
                : ''
            }
          />
          <TextField label="Usuario" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} margin="dense" />
          <TextField
            label="Contraseña"
            type={showPasswordCreate ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => {
              if (e.target.value.length <= 12) setPassword(e.target.value);
            }}
            margin="dense"
            helperText={`Máx. 12 caracteres ${password.length}/12`}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPasswordCreate(!showPasswordCreate)} edge="end">
                    {showPasswordCreate ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Rol</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rol">
              <MenuItem value="client">Cliente</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancelar</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary" disabled={isCreateDisabled}>Crear</Button>
        </DialogActions>
      </Dialog>

      {/* Editar Usuario */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
        <DialogTitle>Editar Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            error={!isValidName(name) && name.length > 0}
            helperText={
              !isValidName(name) && name.length > 0
                ? 'Solo letras y espacios. No se permiten símbolos ni espacios vacíos.'
                : ''
            }
          />
          <TextField label="Usuario" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} margin="dense" />
          <TextField
            label="Contraseña (opcional)"
            type={showPasswordEdit ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => {
              if (e.target.value.length <= 12) setPassword(e.target.value);
            }}
            margin="dense"
            helperText={`Máx. 12 caracteres ${password.length}/12`}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPasswordEdit(!showPasswordEdit)} edge="end">
                    {showPasswordEdit ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Rol</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rol">
              <MenuItem value="client">Cliente</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button onClick={handleUpdateUser} variant="contained" color="primary" disabled={isEditDisabled}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Eliminación */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle><Typography fontWeight={700} color="#d32f2f">¿Eliminar Usuario?</Typography></DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#444', mb: 2 }}>
            Esta acción eliminará al usuario de forma permanente. ¿Estás seguro que deseas continuar?
          </DialogContentText>
          <Divider />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ backgroundColor: '#d32f2f', color: 'white' }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={messageType} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
