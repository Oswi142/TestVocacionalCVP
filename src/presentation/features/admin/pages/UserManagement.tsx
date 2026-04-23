import React, { useEffect, useState, useMemo, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/infrastructure/config/supabaseClient';
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
  Tooltip,
  TablePagination
} from '@mui/material';
import { adminService } from '@/infrastructure/services/adminService';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import jsPDF from 'jspdf';
import logoCvp from '@/assets/logo-cvp.png';
import UserProgressDialog from '@/presentation/features/admin/components/UserProgressDialog';
import ActionOverlay from '@/presentation/components/ActionOverlay';

const UserManagement: React.FC = () => {
  const [name, setName] = useState('');
  const [first_last_name, setfirst_last_name] = useState('');
  const [second_last_name, setsecond_last_name] = useState('');
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
  const [search, setSearch] = useState('');
  const [openProgressDialog, setOpenProgressDialog] = useState(false);
  const [selectedUserForProgress, setSelectedUserForProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionOverlay, setActionOverlay] = useState({ open: false, message: '', submessage: '' });
  const [hasRelatedData, setHasRelatedData] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getLoggedUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };
  const loggedUser = getLoggedUser();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!editingUser) {
      setUsername(generateUsername(name, first_last_name, second_last_name));
    }
  }, [name, first_last_name, second_last_name, editingUser]);

  const isValidName = (value: string) => {
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    return regex.test(value.trim()) && value.trim().length > 0;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
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

  const generateUsername = (n: string, f: string, s: string) => {
    const mainName = n.trim().split(' ')[0].toLowerCase();
    const fLast = f.trim().toLowerCase().replace(/\s+/g, '');
    const sLast = s.trim().toLowerCase().replace(/\s+/g, '');

    let user = mainName;
    if (fLast) user += `.${fLast}`;
    if (sLast) user += `.${sLast}`;

    return user.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateCredentialsPDF = async (n: string, f: string, s: string, user: string, pass: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pw, 35, 'F');

    try {
      doc.addImage(logoCvp, 'PNG', (pw / 2) - 15, 3, 30, 30);
    } catch (e) {
      console.warn("Logo load error", e);
    }

    const contentYStart = 45;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('CREDENCIALES DE ACCESO', pw / 2, contentYStart, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.8);
    doc.line(pw / 2 - 15, contentYStart + 4, pw / 2 + 15, contentYStart + 4);

    const cardX = 12;
    const cardY = contentYStart + 12;
    const cardW = pw - 24;
    const cardH = 50;

    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

    const rowHeight = 11;
    const startDataY = cardY + 11;

    const drawRow = (label: string, value: string, y: number, isLast = false) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), cardX + 8, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(value, cardX + 8, y + 5);

      if (!isLast) {
        doc.setDrawColor(235, 240, 245);
        doc.setLineWidth(0.2);
        doc.line(cardX + 8, y + 8, cardX + cardW - 8, y + 8);
      }
    };

    drawRow('Nombre Completo', `${n} ${f} ${s}`.trim(), startDataY);
    drawRow('Usuario', user, startDataY + rowHeight + 3);
    drawRow('Contraseña', pass, startDataY + (rowHeight + 3) * 2, true);

    const infoY = cardY + cardH + 10;
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(cardX, infoY, cardW, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('¡SEGURIDAD!', pw / 2, infoY + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Guarde estos datos en un lugar seguro y no los comparta.', pw / 2, infoY + 12, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('© 2026 Club Vida Plena', pw / 2, ph - 10, { align: 'center' });

    doc.save(`Credenciales_${user}.pdf`);
  };

  const handleCreateUser = async () => {
    try {
      if (!name || !username || !password || !role) return;
      setActionOverlay({ open: true, message: 'Creando usuario...', submessage: 'Por favor espera un momento' });

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('username', username.trim())
        .single();

      if (existing) {
        setActionOverlay({ open: false, message: '', submessage: '' });
        showToast('Ese nombre de usuario ya está en uso', 'error');
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('users').insert({
        name,
        first_last_name: first_last_name,
        second_last_name: second_last_name,
        username: username.trim(),
        password: hashedPassword,
        role,
        created_by: loggedUser.id,
        created_at: new Date().toISOString()
      });
      if (error) throw error;

      await generateCredentialsPDF(name, first_last_name, second_last_name, username, password);

      handleCloseCreateDialog();
      fetchUsers();
      showToast('Usuario creado exitosamente', 'success');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionOverlay({ open: false, message: '', submessage: '' });
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return;
      setActionOverlay({ open: true, message: 'Actualizando usuario...', submessage: 'Guardando los cambios' });

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('username', username.trim())
        .neq('id', editingUser.id)
        .single();

      if (existing) {
        setActionOverlay({ open: false, message: '', submessage: '' });
        showToast('Ese nombre de usuario ya está en uso', 'error');
        return;
      }

      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
      const { error } = await supabase
        .from('users')
        .update({
          name,
          first_last_name: first_last_name,
          second_last_name: second_last_name,
          username: username.trim(),
          ...(hashedPassword ? { password: hashedPassword } : {}),
          role
        })
        .eq('id', editingUser.id);
      if (error) throw error;

      handleCloseEditDialog();
      fetchUsers();
      showToast('Usuario actualizado', 'success');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionOverlay({ open: false, message: '', submessage: '' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === loggedUser.id) {
      showToast('No puedes eliminar tu propio usuario', 'error');
      setOpenConfirmDialog(false);
      return;
    }

    try {
      setOpenConfirmDialog(false);
      setActionOverlay({ open: true, message: 'Eliminando usuario...', submessage: 'Esto puede tomar unos segundos' });

      await adminService.deleteUser(userToDelete.id);

      fetchUsers();
      showToast('Usuario eliminado', 'success');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setActionOverlay({ open: false, message: '', submessage: '' });
      setUserToDelete(null);
      setHasRelatedData(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase().trim();
    let result = users.filter((user: any) =>
      user.name.toLowerCase().includes(s) ||
      user.username.toLowerCase().includes(s)
    );

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const idA = a.id || a.user_id;
        const idB = b.id || b.user_id;
        return sortOrder === 'asc' ? idA - idB : idB - idA;
      } else {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (sortOrder === 'asc') return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      }
    });

    return result;
  }, [users, search, sortBy, sortOrder]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortBy, sortOrder]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setShowSnackbar(true);
  };

  const handleEdit = useCallback((user: any) => {
    setEditingUser(user);
    setName(user.name);
    setfirst_last_name(user.first_last_name || '');
    setsecond_last_name(user.second_last_name || '');
    setUsername(user.username);
    setRole(user.role);
    setPassword('');
    setOpenEditDialog(true);
  }, []);

  const confirmDelete = useCallback(async (user: any) => {
    setUserToDelete(user);
    try {
      const hasData = await adminService.checkUserDependencies(user.id);
      setHasRelatedData(hasData);
    } catch (e) {
      console.error("Error checking deps", e);
      setHasRelatedData(false);
    } finally {
      setOpenConfirmDialog(true);
    }
  }, []);

  const resetForm = () => {
    setName('');
    setfirst_last_name('');
    setsecond_last_name('');
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

  const isCreateDisabled = !isValidName(name) || !first_last_name || !username || !password || !role;

  const isEditDisabled =
    !editingUser ||
    !isValidName(name) ||
    !first_last_name ||
    (name === editingUser.name &&
      first_last_name === (editingUser.first_last_name || '') &&
      second_last_name === (editingUser.second_last_name || '') &&
      username === editingUser.username &&
      role === editingUser.role);

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
          height: isMobile ? 'auto' : '90vh',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: isMobile ? 3 : 4, borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              mb: 1,
              gap: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: '#64748b', backgroundColor: 'rgba(0,0,0,0.03)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)', transform: 'translateX(-3px)' }, transition: 'all 0.2s' }}>
                <ArrowBackIcon />
              </IconButton>
              <PeopleIcon sx={{ fontSize: 32, color: '#1976d2' }} />
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={800}
                sx={{ color: '#1e293b' }}
              >
                Gestión de Usuarios
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setPassword(generateRandomPassword());
                setOpenCreateDialog(true);
              }}
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
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mb: 2 }}>Administración centralizada de accesos, roles y perfiles del sistema.</Typography>

          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl variant="standard" sx={{ minWidth: 140 }}>
                <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 700, ml: 1 }}>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  displayEmpty
                  disableUnderline
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    px: 1.5,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    '& .MuiSelect-select': { py: 0, height: '36px', display: 'flex', alignItems: 'center' }
                  }}
                >
                  <MenuItem value="date">Registro</MenuItem>
                  <MenuItem value="name">Alfabético</MenuItem>
                </Select>
              </FormControl>

              <FormControl variant="standard" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 700, ml: 1 }}>Sentido</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  displayEmpty
                  disableUnderline
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px',
                    px: 1.5,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    '& .MuiSelect-select': { py: 0, height: '36px', display: 'flex', alignItems: 'center' }
                  }}
                >
                  <MenuItem value="asc">Ascendente</MenuItem>
                  <MenuItem value="desc">Descendente</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              size="small"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '50px',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.85rem',
                  height: '36px',
                  '& fieldset': { borderColor: 'rgba(0,0,0,0.05)' }
                }
              }}
              sx={{ width: isMobile ? '100%' : 220 }}
            />
          </Box>
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
          <UserTable
            users={paginatedUsers}
            loading={loading}
            isMobile={isMobile}
            loggeduser_id={loggedUser.id}
            onProgress={handleOpenProgress}
            onEdit={handleEdit}
            onDelete={confirmDelete}
          />
          <TablePagination
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPageOptions={[]}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{
              borderTop: '1px solid rgba(0,0,0,0.05)',
              '& .MuiTablePagination-toolbar': {
                minHeight: '48px',
                px: 2
              },
              '& .MuiTablePagination-displayedRows': {
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b'
              }
            }}
          />
        </Box>
      </Box>

      {/* Crear Usuario */}
      <Dialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            p: 1.5,
            width: '100%',
            maxWidth: '550px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Crear Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre(s)"
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Primer Apellido"
              fullWidth
              value={first_last_name}
              onChange={(e) => setfirst_last_name(e.target.value)}
              margin="dense"
              variant="filled"
              sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            />
            <TextField
              label="Segundo Apellido"
              fullWidth
              value={second_last_name}
              onChange={(e) => setsecond_last_name(e.target.value)}
              margin="dense"
              variant="filled"
              sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            />
          </Box>
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
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            p: 1.5,
            width: '100%',
            maxWidth: '550px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>Editar Usuario</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre(s)"
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Primer Apellido"
              fullWidth
              value={first_last_name}
              onChange={(e) => setfirst_last_name(e.target.value)}
              margin="dense"
              variant="filled"
              sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            />
            <TextField
              label="Segundo Apellido"
              fullWidth
              value={second_last_name}
              onChange={(e) => setsecond_last_name(e.target.value)}
              margin="dense"
              variant="filled"
              sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
            />
          </Box>
          <TextField
            label="Usuario"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="dense"
            variant="filled"
            sx={{ '& .MuiFilledInput-root': { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px' } }}
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
            <DialogContentText sx={{ color: '#5f2120', fontWeight: 500, px: 2 }}>
              ¿Estás seguro de eliminar a <strong>{userToDelete?.name}</strong>? Esta acción no se puede deshacer.
            </DialogContentText>
            {hasRelatedData && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', borderRadius: 2, border: '1px solid rgba(211, 47, 47, 0.2)', mx: 2 }}>
                <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningAmberIcon fontSize="small" /> ¡ATENCIÓN!
                </Typography>
                <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600, display: 'block', mt: 0.5 }}>
                  Este usuario tiene respuestas de tests y datos de perfil guardados. Al eliminarlo, se borrará TODA su información de forma permanente.
                </Typography>
              </Box>
            )}
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

      {/* Action Overlay */}
      <ActionOverlay
        open={actionOverlay.open}
        message={actionOverlay.message}
        submessage={actionOverlay.submessage}
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
    </Box>
  );
};

interface UserTableProps {
  users: any[];
  loading: boolean;
  isMobile: boolean;
  loggeduser_id: number;
  onProgress: (user: any) => void;
  onEdit: (user: any) => void;
  onDelete: (user: any) => void;
}

const UserTable: React.FC<UserTableProps> = React.memo(({ users, loading, isMobile, loggeduser_id, onProgress, onEdit, onDelete }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 4 }}>
        <CircularProgress size={40} sx={{ color: '#1976d2' }} />
      </Box>
    );
  }

  return (
    <TableContainer sx={{
      flex: 1,
      overflowY: 'auto',
      '& .MuiTableCell-stickyHeader': {
        backgroundColor: '#f1f5f9',
        fontWeight: 700,
        color: '#475569',
        zIndex: 2
      }
    }}>
      <Table stickyHeader sx={{ minWidth: isMobile ? '600px' : '100%' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '35%' }}>Nombre</TableCell>
            <TableCell sx={{ width: '25%' }}>Usuario</TableCell>
            <TableCell sx={{ width: '20%' }}>Rol</TableCell>
            <TableCell align="right" sx={{ width: '20%' }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length > 0 ? (
            users.map((user: any) => (
              <TableRow
                key={user.id}
                hover
                sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' }, transition: 'background-color 0.2s' }}
              >
                <TableCell sx={{ color: '#334155', fontWeight: 500, wordBreak: 'break-word' }}>
                  <Box sx={{ fontWeight: 700 }}>
                    {user.name} {user.first_last_name} {user.second_last_name}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontStyle: user.created_by_name ? 'italic' : 'normal' }}>
                    {user.created_by_name ? `Creado por: ${user.created_by_name}` : '-'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: '#334155', wordBreak: 'break-word' }}>{user.username}</TableCell>
                <TableCell>
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
                <TableCell align="right">
                  <Tooltip title="Gestionar Tests" arrow>
                    <IconButton
                      sx={{ color: '#0891b2', '&:hover': { backgroundColor: 'rgba(8, 145, 178, 0.1)', transform: 'scale(1.1)' }, transition: 'all 0.2s' }}
                      onClick={() => onProgress(user)}
                    >
                      <ListAltIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    sx={{ color: '#1976d2', '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)', transform: 'scale(1.1)' }, transition: 'all 0.2s' }}
                    onClick={() => onEdit(user)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    sx={{
                      color: '#d32f2f',
                      '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)', transform: 'scale(1.1)' },
                      transition: 'all 0.2s'
                    }}
                    onClick={() => onDelete(user)}
                    disabled={user.id === loggeduser_id}
                    title={user.id === loggeduser_id ? "No puedes eliminar tu propio usuario" : "Eliminar"}>
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
  );
});

export default UserManagement;
