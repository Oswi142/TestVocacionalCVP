import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton, Collapse,
  Paper, TextField, Avatar, Divider, InputAdornment,
  Tooltip, useTheme, useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GetAppIcon from '@mui/icons-material/GetApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { downloadChasideReportPDF } from '../../../utils/chaside';
import { downloadIpprReportPDF } from '../../../utils/ippr';
import { downloadDatReportPDF, getCompletedDatCategories, DatType } from '../../../utils/dat';

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
type TestsAnswerRow = { clientid: number; testid: number };

const ClientsReports: React.FC = () => {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, TestRow[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
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

  const filteredClients = clients.filter(client => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const user = users.find(u => u.id === client.userid);
    return (user?.name || '').toLowerCase().split(' ').some((w: string) => w.startsWith(q));
  });

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

  const handleToggleClient = async (client: ClientView) => {
    setExpandedClientId(prev => (prev === client.userid ? null : client.userid));
    if (!clientTestsMap[client.userid]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: true }));
        const { data: rows, error } = await supabase.from('testsanswers').select('testid,clientid').eq('clientid', client.userid).range(0, 99999);
        if (error) throw error;
        const uniqIds = [...new Set(((rows || []) as TestsAnswerRow[]).map(r => r.testid))];
        const testsForClient: TestRow[] = [];
        for (const id of uniqIds) {
          const baseTest = tests.find(t => t.id === id);
          if (!baseTest) continue;
          if (kindOfTest(baseTest.testname) === 'dat') {
            const completedCats = await getCompletedDatCategories(client.userid);
            testsForClient.push({ ...baseTest, testname: `DAT (${completedCats.length} de 6 completados)` });
          } else { testsForClient.push(baseTest); }
        }
        setClientTestsMap(prev => ({ ...prev, [client.userid]: testsForClient }));
      } catch (e) { console.error(e); }
      finally { setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: false })); }
    }
  };

  const handleDownload = async (clientId: number, test: TestRow) => {
    try {
      const type = kindOfTest(test.testname);
      if (type === 'chaside') { await downloadChasideReportPDF(clientId); return; }
      if (type === 'ippr') { await downloadIpprReportPDF(clientId); return; }
      if (type === 'dat') { await downloadDatReportPDF(clientId); return; }
      alert('Reporte disponible próximamente para este test.');
    } catch (err: any) { console.error(err); alert(`No se pudo generar el reporte: ${err?.message ?? 'Error desconocido'}`); }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg,#f9c9a4 0%,#cafacc 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: isMobile ? 1 : 3, boxSizing: 'border-box', overflowX: 'hidden' }}>
      <Box sx={{ width: '100%', maxWidth: 1000, height: '90vh', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderRadius: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* Header */}
        <Box sx={{ p: isMobile ? 3 : 4, borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <Box display="flex" alignItems="center" mb={1} gap={2}>
            <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: '#64748b', backgroundColor: 'rgba(0,0,0,0.03)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)', transform: 'translateX(-3px)' }, transition: 'all 0.2s' }}>
              <ArrowBackIcon />
            </IconButton>
            <AssignmentIcon sx={{ fontSize: 32, color: C.primary }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800} color="#1e293b">Resultados y Perfiles</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Análisis interpretativo, puntajes y perfiles vocacionales generados.</Typography>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} variant="outlined" size="small"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>), sx: { borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' }, '&:hover fieldset': { borderColor: `${C.searchHover} !important` }, '&.Mui-focused fieldset': { borderColor: `${C.searchFocus} !important` }, height: '34px' } }}
              sx={{ width: 220 }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{filteredClients.length} perfil{filteredClients.length !== 1 ? 'es' : ''}</Typography>
          </Box>
        </Box>

        {/* List */}
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
            filteredClients.map((client) => {
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
                          {testsForClient.map((test) => {
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
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>{isReady ? caption : 'Reporte próximamente'}</Typography>
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
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientsReports;
