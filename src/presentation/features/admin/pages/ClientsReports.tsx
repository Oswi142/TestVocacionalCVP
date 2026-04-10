import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/infrastructure/config/supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton, Collapse,
  Paper, TextField, Avatar, Divider, InputAdornment,
  Tooltip, useTheme, useMediaQuery,
  Select, MenuItem, FormControl, Snackbar, Alert, TablePagination, InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GetAppIcon from '@mui/icons-material/GetApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { downloadChasideReportPDF } from '@/domain/rules/chaside';
import { downloadIpprReportPDF } from '@/domain/rules/ippr';
import { downloadDatReportPDF, getCompletedDatCategories, DatType } from '@/domain/rules/dat';

const C = {
  primary: '#f59e0b', dark: '#d97706',
  bg: 'rgba(245,158,11,0.05)', bgHover: 'rgba(245,158,11,0.1)',
  border: 'rgba(245,158,11,0.15)', borderHover: 'rgba(245,158,11,0.35)',
  spinner: '#f59e0b', searchFocus: '#f59e0b', searchHover: 'rgba(245,158,11,0.4)',
};

const AVATAR_PALETTE = [
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#f97316,#ea580c)',
];

const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

type ClientView = { userid: number };
type TestRow = { id: number; testname: string; category?: DatType };

const ClientsReports: React.FC = () => {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, TestRow[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchAll = async () => {
      const [userRes, testRes] = await Promise.all([
        supabase.from('users').select('id,name').eq('role', 'client').range(0, 9999),
        supabase.from('tests').select('id, testname').range(0, 9999),
      ]);
      const userRowsRaw = userRes.error ? [] : (userRes.data || []);
      const testsRows = testRes.error ? [] : (testRes.data || []);
      const usersDedup = Array.from(new Map(userRowsRaw.map((u: any) => [u.id, u])).values());
      setUsers(usersDedup);
      setClients(usersDedup.map((u: any) => ({ userid: u.id })));
      setTests((testsRows as TestRow[]).filter(t => !((t.testname || '').toLowerCase().includes('entrevista'))));
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    
    // Enriquecer con nombres para filtrar y ordenar
    const enriched = clients.map(c => {
        const u = users.find(user => user.id === c.userid);
        return { ...c, name: u?.name || '' };
    });

    let result = enriched;
    if (q) {
        result = enriched.filter(c => c.name.toLowerCase().includes(q));
    }

    // Ordenamiento
    result.sort((a, b) => {
        if (sortBy === 'date') {
            return sortOrder === 'asc' ? a.userid - b.userid : b.userid - a.userid;
        } else {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (sortOrder === 'asc') return nameA.localeCompare(nameB);
            return nameB.localeCompare(nameA);
        }
    });

    return result;
  }, [clients, users, search, sortBy, sortOrder]);

  const paginatedClients = useMemo(() => {
    return filteredClients.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredClients, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortBy, sortOrder]);

  const getClientInitials = (name: string) =>
    (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const kindOfTest = (testname: string): 'chaside' | 'ippr' | 'maci' | 'dat' | 'other' => {
    const t = (testname || '').toLowerCase();
    if (t.includes('chaside')) return 'chaside';
    if (t.includes('ipp')) return 'ippr';
    if (t.includes('maci')) return 'maci';
    if (t.includes('dat')) return 'dat';
    return 'other';
  };

  const getAttemptLabel = (prefix: string) => {
    if (prefix === 'active') return 'Intento Actual (Activo)';
    const match = prefix.match(/\[HIST_(.+)\]/);
    if (match) return `Historial: ${match[1].replace(/-/g, ':')}`;
    return 'Intento Anterior';
  };

  const handleToggleClient = async (client: ClientView) => {
    setExpandedClientId(prev => (prev === client.userid ? null : client.userid));
    if (!clientTestsMap[client.userid]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: true }));

        // 1. Obtener todos los test IDs donde el usuario tiene respuestas (incluyendo históricos)
        const { data: allAnswersRaw } = await supabase
          .from('testsanswers')
          .select('testid, details')
          .eq('clientid', client.userid);

        const answers = (allAnswersRaw || []) as any[];
        const uniqTestIds = [...new Set(answers.map(a => a.testid))];

        const testsForClient: any[] = [];
        for (const id of uniqTestIds) {
          const baseTest = tests.find(t => t.id === id);
          if (!baseTest) continue;

          // Encontrar intentos únicos para este test
          const testAnswers = answers.filter(a => a.testid === id);
          const attempts = new Set<string>();
          testAnswers.forEach(a => {
            const d = a.details || '';
            const match = d.match(/^\[HIST_[^\]]+\]/);
            if (match) attempts.add(match[0]);
            else attempts.add('active');
          });

          const sortedAttempts = Array.from(attempts).sort((a, b) => {
            if (a === 'active') return -1;
            if (b === 'active') return 1;
            return b.localeCompare(a); // Más recientes primero
          });

          if (kindOfTest(baseTest.testname) === 'dat') {
            const completedCats = await getCompletedDatCategories(client.userid, sortedAttempts[0]);
            testsForClient.push({
              ...baseTest,
              testname: `DAT (${completedCats.length} de 6 completados)`,
              attempts: sortedAttempts,
              selectedAttempt: sortedAttempts[0]
            });
          } else {
            testsForClient.push({
              ...baseTest,
              attempts: sortedAttempts,
              selectedAttempt: sortedAttempts[0]
            });
          }
        }
        setClientTestsMap(prev => ({ ...prev, [client.userid]: testsForClient }));
      } catch (e) { console.error('Error fetching tests for client:', e); }
      finally { setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: false })); }
    }
  };

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAttemptChange = (clientId: number, testId: number, attempt: string) => {
    setClientTestsMap(prev => {
      const clientTests = prev[clientId] || [];
      const updated = clientTests.map(t => t.id === testId ? { ...t, selectedAttempt: attempt } : t);
      return { ...prev, [clientId]: updated };
    });
  };

  const handleDownload = async (clientId: number, test: TestRow) => {
    try {
      const type = kindOfTest(test.testname);
      const attempt = (test as any).selectedAttempt || 'active';
      if (type === 'chaside') { await downloadChasideReportPDF(clientId, attempt); return; }
      if (type === 'ippr') { await downloadIpprReportPDF(clientId, attempt); return; }
      if (type === 'dat') { await downloadDatReportPDF(clientId, attempt); return; }
      showToast('Reporte disponible próximamente para este test.', 'info');
    } catch (err: any) { console.error(err); showToast(`No se pudo generar el reporte: ${err?.message ?? 'Error desconocido'}`, 'error'); }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: isMobile ? 1 : 3, boxSizing: 'border-box', overflowX: 'hidden' }}>
      <Box sx={{ width: '100%', maxWidth: 1000, height: '90vh', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderRadius: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>

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
              <AssignmentIcon sx={{ fontSize: 32, color: C.primary }} />
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={800}
                sx={{ color: '#1e293b' }}
              >
                Resultados y Perfiles
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mb: 2 }}>Análisis interpretativo, puntajes y perfiles vocacionales generados.</Typography>

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
              placeholder="Buscar cliente..."
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

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                <CircularProgress size={40} thickness={5} sx={{ color: C.spinner }} />
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>Cargando perfiles...</Typography>
              </Box>
            ) : filteredClients.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <PersonIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No se encontraron clientes</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>Intenta con otro término de búsqueda</Typography>
              </Box>
            ) : (
              paginatedClients.map((client) => {
                const user = users.find(u => u.id === client.userid);
                const isExpanded = expandedClientId === client.userid;
                const testsForClient = clientTestsMap[client.userid] || [];
                return (
                  <Paper key={client.userid} elevation={0} sx={{ borderRadius: '20px', backgroundColor: isExpanded ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' } }}>
                    <Box onClick={() => handleToggleClient(client)} sx={{ px: 3, py: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ background: avatarColor(client.userid), width: 44, height: 44, fontSize: '0.95rem', fontWeight: 800 }}>
                          {getClientInitials(user?.name || 'SC')}
                        </Avatar>
                        <Typography variant="subtitle1" fontWeight={700} color="#1e293b">{user?.name || 'Sin nombre'}</Typography>
                      </Box>
                      <IconButton size="small" sx={{ pointerEvents: 'none' }}>
                        {isExpanded ? <ExpandLessIcon sx={{ color: C.primary }} /> : <ExpandMoreIcon sx={{ color: '#94a3b8' }} />}
                      </IconButton>
                    </Box>
                    <Collapse in={isExpanded} unmountOnExit>
                      <Box sx={{ px: 3, pb: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        {loadingTestsForClient[client.userid] ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                            <CircularProgress size={20} thickness={5} sx={{ color: C.spinner }} />
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Cargando reportes...</Typography>
                          </Box>
                        ) : testsForClient.length === 0 ? (
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', py: 1 }}>No hay diagnósticos completados para este usuario.</Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {testsForClient.map((test: any) => {
                              const kind = kindOfTest(test.testname);
                              const isReady = kind === 'chaside' || kind === 'ippr' || kind === 'maci' || kind === 'dat';
                              const caption = (kind === 'maci' || kind === 'dat') ? 'Puntajes brutos registrados' : 'Perfil vocacional interpretado';
                              return (
                                <Box key={test.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '14px', backgroundColor: C.bg, border: `1px solid ${C.border}`, transition: 'all 0.2s', '&:hover': { backgroundColor: C.bgHover, borderColor: C.borderHover } }}>
                                  <Box display="flex" alignItems="center" gap={1.5}>
                                    <Box sx={{ p: 0.8, borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.12)', display: 'flex' }}>
                                      <AssignmentIcon sx={{ fontSize: 18, color: C.dark }} />
                                    </Box>
                                    <Box>
                                      <Typography variant="body2" fontWeight={700} color="#334155">{test.testname}</Typography>
                                      {test.attempts && test.attempts.length > 1 ? (
                                        <FormControl size="small" variant="standard" sx={{ minWidth: 150 }}>
                                          <Select
                                            value={test.selectedAttempt}
                                            onChange={(e) => handleAttemptChange(client.userid, test.id, e.target.value as string)}
                                            sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}
                                          >
                                            {test.attempts.map((att: string) => (
                                              <MenuItem key={att} value={att} sx={{ fontSize: '0.75rem' }}>
                                                {getAttemptLabel(att)}
                                              </MenuItem>
                                            ))}
                                          </Select>
                                        </FormControl>
                                      ) : (
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                                          {isReady ? caption : 'Reporte próximamente'}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                  <Tooltip title={isReady ? 'Descargar reporte' : 'En desarrollo'} arrow placement="left">
                                    <span>
                                      <IconButton disabled={!isReady} onClick={() => handleDownload(client.userid, test)} size="small"
                                        sx={{ backgroundColor: isReady ? '#1e293b' : 'rgba(0,0,0,0.06)', color: isReady ? 'white' : 'rgba(0,0,0,0.25)', borderRadius: '10px', width: 34, height: 34, '&:hover': isReady ? { backgroundColor: '#0f172a', transform: 'translateY(-2px)' } : {}, transition: 'all 0.2s' }}>
                                        <GetAppIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Paper>
                )
              })
            )}
          </Box>
          <TablePagination
            component="div"
            count={filteredClients.length}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientsReports;
