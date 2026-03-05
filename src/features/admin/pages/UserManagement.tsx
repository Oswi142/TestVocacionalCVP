import React, { useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../../../supabaseClient';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Chip,
  InputAdornment,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { adminService } from '../../../services/adminService';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import ListAltIcon from '@mui/icons-material/ListAlt';
import UserProgressDialog from '../components/UserProgressDialog';

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
  const [search, setSearch] = useState('');
  const [openProgressDialog, setOpenProgressDialog] = useState(false);
  const [selectedUserForProgress, setSelectedUserForProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

  const isValidName = (value: string) => {
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/; // Letras y espacios
    return regex.test(value.trim()) && value.trim().length > 0;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getClients();
      setUsers(data);
    } catch (e) {
      console.error(e);
      setMessage('Error al cargar usuarios');
      setMessageType('error');
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProgress = (user: any) => {
    setSelectedUserForProgress(user);
    setOpenProgressDialog(true);
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


  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === loggedUser.id) {
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

  const filteredUsers = users.filter((user: any) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.username.toLowerCase().includes(search.toLowerCase())
  );
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
        width: '100%',
        minHeight: '100vh',
        p: isMobile ? 2 : 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1000,
          height: isMobile ? 'auto' : '85vh',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          p: isMobile ? 2 : 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            mb: 4,
            gap: 2,
          }}
        >
          <Typography
            variant={isMobile ? 'h4' : 'h3'}
            fontWeight={800}
            sx={{ color: '#1e293b' }}
          >
            Gestión de Usuarios
          </Typography>
          <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} width={isMobile ? '100%' : 'auto'}>
            <Button
              variant="contained"
              onClick={() => setOpenCreateDialog(true)}
              fullWidth={isMobile}
              sx={{
                borderRadius: '50px',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.39)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(25, 118, 210, 0.23)' },
                transition: 'all 0.2s'
              }}
            >
              + Nuevo Usuario
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin')}
              fullWidth={isMobile}
              sx={{
                borderRadius: '50px',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                borderWidth: 2,
                '&:hover': { borderWidth: 2, transform: 'translateY(-2px)' },
                transition: 'all 0.2s'
              }}
            >
              ← Volver
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Lista de Usuarios
          </Typography>
          <TextField
            size="small"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="standard"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ pl: 1.5, mr: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              disableUnderline: true,
              sx: {
                borderRadius: '50px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                border: '1px solid rgba(0,0,0,0.05)',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                '& .MuiInputBase-input': {
                  height: '100%',
                  padding: '0 12px 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }
              }
            }}
            sx={{ width: isMobile ? '100%' : '250px' }}
          />
        </Box>

        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.05)',
          backgroundColor: 'rgba(255,255,255,0.4)',
          position: 'relative'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 4 }}>
              <CircularProgress size={40} sx={{ color: '#1976d2' }} />
            </Box>
          ) : (
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '8px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
            }}>
              {/* Header estático */}
              <Table sx={{ tableLayout: 'fixed', minWidth: isMobile ? '700px' : '100%', backgroundColor: '#f1f5f9' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', width: isMobile ? '200px' : '35%' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', width: isMobile ? '150px' : '25%' }}>Usuario</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', width: isMobile ? '150px' : '20%' }}>Rol</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', width: isMobile ? '150px' : '20%' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
              </Table>

              {/* Cuerpo con scroll vertical */}
              <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                <Table sx={{ tableLayout: 'fixed', minWidth: isMobile ? '700px' : '100%' }}>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user: any) => (
                        <TableRow
                          key={user.id}
                          hover
                          sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' }, transition: 'background-color 0.2s' }}
                        >
                          <TableCell sx={{ color: '#334155', fontWeight: 500, width: isMobile ? '200px' : '35%', wordBreak: 'break-word' }}>{user.name}</TableCell>
                          <TableCell sx={{ color: '#334155', width: isMobile ? '150px' : '25%', wordBreak: 'break-word' }}>{user.username}</TableCell>
                          <TableCell sx={{ width: isMobile ? '150px' : '20%' }}>
                            <Chip
                              label={user.role === 'admin' ? 'Administrador' : 'Cliente'}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                backgroundColor: user.role === 'admin' ? '#dcfce7' : '#e0f2fe',
                                color: user.role === 'admin' ? '#166534' : '#075985'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ width: isMobile ? '150px' : '20%' }}>
                            <Tooltip title="Gestionar Tests" arrow>
                              <IconButton
                                sx={{ color: '#0891b2', '&:hover': { backgroundColor: 'rgba(8, 145, 178, 0.1)', transform: 'scale(1.1)' }, transition: 'all 0.2s' }}
                                onClick={() => handleOpenProgress(user)}
                              >
                                <ListAltIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <IconButton
                              sx={{ color: '#1976d2', '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)', transform: 'scale(1.1)' }, transition: 'all 0.2s' }}
                              onClick={() => handleEdit(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              sx={{
                                color: '#d32f2f',
                                '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)', transform: 'scale(1.1)' },
                                transition: 'all 0.2s'
                              }}
                              onClick={() => confirmDelete(user)}
                              disabled={user.id === loggedUser.id}
                              title={user.id === loggedUser.id ? "No puedes eliminar tu propio usuario" : "Eliminar"}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#64748b' }}>
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Box>

      {/* Crear Usuario */}
      <Dialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            p: 0.5,
            width: '100%',
            maxWidth: '380px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Crear Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            error={!isValidName(name) && name.length > 0}
            helperText={
              !isValidName(name) && name.length > 0
                ? 'Solo letras y espacios.'
                : ''
            }
          />
          <TextField
            label="Usuario"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
          />
          <TextField
            label="Contraseña"
            type={showPasswordCreate ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => {
              if (e.target.value.length <= 12) setPassword(e.target.value);
            }}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
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
          <FormControl fullWidth margin="dense" variant="filled" sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}>
            <InputLabel>Rol</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rol">
              <MenuItem value="client">Cliente</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={handleCloseCreateDialog} sx={{ fontWeight: 700, color: '#64748b' }}>Cancelar</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={isCreateDisabled}
            sx={{ borderRadius: '50px', fontWeight: 700, px: 3 }}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editar Usuario */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            p: 0.5,
            width: '100%',
            maxWidth: '380px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Editar Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            error={!isValidName(name) && name.length > 0}
            helperText={
              !isValidName(name) && name.length > 0
                ? 'Solo letras y espacios.'
                : ''
            }
          />
          <TextField
            label="Usuario"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
          />
          <TextField
            label="Contraseña (opcional)"
            type={showPasswordEdit ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => {
              if (e.target.value.length <= 12) setPassword(e.target.value);
            }}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
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
          <FormControl fullWidth margin="dense" variant="filled" sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}>
            <InputLabel>Rol</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} label="Rol">
              <MenuItem value="client">Cliente</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={handleCloseEditDialog} sx={{ fontWeight: 700, color: '#64748b' }}>Cancelar</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={isEditDisabled}
            sx={{ borderRadius: '50px', fontWeight: 700, px: 3 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Eliminación */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            backgroundColor: 'rgba(255, 235, 238, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.5)',
            overflow: 'hidden',
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <WarningAmberIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 1 }} />
          <DialogTitle sx={{ fontWeight: 800, color: '#c62828', p: 0, pb: 1, fontSize: '1.25rem' }}>
            ¿Eliminar usuario?
          </DialogTitle>
          <DialogContent sx={{ p: 0, pb: 3 }}>
            <DialogContentText sx={{ color: '#5f2120', fontWeight: 500 }}>
              Esta acción eliminará al usuario de forma permanente.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', p: 0, gap: 1 }}>
            <Button
              onClick={() => setOpenConfirmDialog(false)}
              variant="outlined"
              color="error"
              sx={{
                borderRadius: 3, textTransform: 'none', fontWeight: 700, borderWidth: '2px',
                '&:hover': { borderWidth: '2px', backgroundColor: 'rgba(211,47,47,0.05)' }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteUser}
              variant="contained"
              color="error"
              sx={{
                borderRadius: 3, textTransform: 'none', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(211,47,47,0.3)',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(211,47,47,0.4)' }
              }}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Gestión de Progreso de Tests */}
      <UserProgressDialog
        open={openProgressDialog}
        onClose={() => setOpenProgressDialog(false)}
        user={selectedUserForProgress}
        onShowMessage={showToast}
      />

      {/* Toast */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={messageType}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box >
  );
};

export default UserManagement;
