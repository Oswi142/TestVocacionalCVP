import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Collapse,
  Paper,
  TextField,
  Avatar,
  Chip,
  Divider,
  InputAdornment,
  Tooltip,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GetAppIcon from '@mui/icons-material/GetApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useNavigate } from 'react-router-dom';
import { downloadChasideReportPDF } from '../utils/chaside';
import { downloadIpprReportPDF } from '../utils/ippr';
import { downloadMaciReportPDF } from '../utils/maci';

// ===== Tipos =====
type ClientView = { userid: number };
type TestRow = { id: number; testname: string };
type TestsAnswerRow = { clientid: number; testid: number };

const ClientsReports: React.FC = () => {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [users, setUsers] = useState<any[]>([]); // solo role=client
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado visual/datos
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, TestRow[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      const [userRes, testRes] = await Promise.all([
        supabase.from('users').select('id,name').eq('role', 'client').range(0, 9999),
        supabase.from('tests').select('id, testname').range(0, 9999),
      ]);

      const userRowsRaw = userRes.error ? [] : (userRes.data || []);
      const testsRows   = testRes.error ? [] : (testRes.data || []);

      // dedup usuarios
      const usersDedup = Array.from(new Map(userRowsRaw.map((u: any) => [u.id, u])).values());
      setUsers(usersDedup);
      setClients(usersDedup.map((u: any) => ({ userid: u.id })));

      // **Excluir ENTREVISTA** desde la fuente
      const filteredTests = (testsRows as TestRow[]).filter(t =>
        !((t.testname || '').toLowerCase().includes('entrevista'))
      );
      setTests(filteredTests);

      setLoading(false);
    };

    fetchAll();
  }, []);

  const filteredClients = clients.filter(client => {
    const user = users.find(u => u.id === client.userid);
    const name = (user?.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const getClientInitials = (name: string) =>
    (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const kindOfTest = (testname: string): 'chaside' | 'ippr' | 'maci' | 'other' => {
    const t = (testname || '').toLowerCase();
    if (t.includes('chaside')) return 'chaside';
    if (t.includes('ipp')) return 'ippr';
    if (t.includes('maci')) return 'maci';
    return 'other';
  };

  // Expand/collapse y carga on-demand de tests respondidos (excluyendo entrevista)
  const handleToggleClient = async (client: ClientView) => {
    setExpandedClientId(prev => (prev === client.userid ? null : client.userid));

    if (!clientTestsMap[client.userid]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: true }));
        // Traer testid de respuestas del cliente
        const { data: rows, error } = await supabase
          .from('testsanswers')
          .select('testid,clientid')
          .eq('clientid', client.userid)
          .range(0, 99999);

        if (error) throw error;

        const uniqIds = [...new Set(((rows || []) as TestsAnswerRow[]).map(r => r.testid))];
        // Mapear a tests **ya filtrados** (sin entrevista)
        const testsForClient = uniqIds
          .map(id => tests.find(t => t.id === id))
          .filter(Boolean) as TestRow[];

        setClientTestsMap(prev => ({ ...prev, [client.userid]: testsForClient }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: false }));
      }
    }
  };

  // ← ahora con try/catch para ver los errores en UI
  const handleDownload = async (clientId: number, test: TestRow) => {
    try {
      const type = kindOfTest(test.testname);
      if (type === 'chaside') {
        await downloadChasideReportPDF(clientId);
        return;
      }
      if (type === 'ippr') {
        await downloadIpprReportPDF(clientId);
        return;
      }
      if (type === 'maci') {
        await downloadMaciReportPDF(clientId);
        return;
      }
      alert('Reporte disponible próximamente para este test.');
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo generar el reporte: ${err?.message ?? 'Error desconocido'}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #f9c9a4, #cafacc)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 880, height: '90vh', backgroundColor: '#ffffff', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', background: 'white', color: 'primary.main' }}>
          <Box display="flex" alignItems="center" mb={1} gap={2}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }} size="small"><ArrowBackIcon /></IconButton>
            <PersonIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">Descargar Resultados</Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Descarga los reportes disponibles (CHASIDE e IPP-R interpretados; MACI con puntajes brutos).
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="Buscar cliente por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#f8f9fa', '&:hover': { backgroundColor: '#e9ecef' } } }}
          />
          <Chip icon={<PersonIcon />} label={`${filteredClients.length} cliente${filteredClients.length !== 1 ? 's' : ''} encontrado${filteredClients.length !== 1 ? 's' : ''}`} color="primary" variant="outlined" size="small" />
        </Box>

        {/* Clients List */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No se encontraron clientes</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>Intenta con otro término de búsqueda</Typography>
            </Box>
          ) : (
            filteredClients.map((client) => {
              const user = users.find(u => u.id === client.userid);
              const isExpanded = expandedClientId === client.userid;
              const testsForClient = clientTestsMap[client.userid] || [];

              return (
                <Paper
                  key={client.userid}
                  elevation={1}
                  sx={{
                    borderRadius: 3,
                    p: 1,
                    transition: 'box-shadow 0.2s ease, transform 0.05s ease',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    '&:hover': { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }
                  }}
                >
                  {/* Header de cliente */}
                  <Box
                    onClick={() => handleToggleClient(client)}
                    sx={{
                      px: 2, py: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                      '&:hover': { backgroundColor: '#f8f9fa' }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42, fontSize: '0.95rem', fontWeight: 'bold' }}>
                        {getClientInitials(user?.name || 'SC')}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                          {user?.name || 'Sin nombre'}
                        </Typography>
                      </Box>
                    </Box>

                    <IconButton color="primary" size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  {/* Contenido expandido */}
                  <Collapse in={isExpanded} unmountOnExit>
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mb: 2 }}>
                        {testsForClient.length > 0 ? 'Evaluaciones disponibles' : 'No hay evaluaciones respondidas'}
                      </Typography>

                      {loadingTestsForClient[client.userid] ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Cargando evaluaciones...
                        </Typography>
                      ) : testsForClient.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Aún no hay respuestas para este cliente
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {testsForClient.map((test) => {
                            const kind = kindOfTest(test.testname);
                            const isReadyReport = kind === 'chaside' || kind === 'ippr' || kind === 'maci';
                            const captionText = kind === 'maci' ? 'Puntajes brutos' : 'Reporte interpretado';

                            return (
                              <Paper
                                key={test.id}
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  transition: 'all 0.2s ease',
                                  '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                                }}
                              >
                                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5}>
                                  <Box display="flex" alignItems="center" gap={1.5}>
                                    <AssignmentIcon color="primary" sx={{ fontSize: 20 }} />
                                    <Box>
                                      <Typography variant="body2" fontWeight="500">{test.testname}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {isReadyReport ? captionText : 'Reporte próximamente'}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  <Tooltip title={isReadyReport ? 'Descargar reporte' : 'Disponible próximamente'} arrow>
                                    <span>
                                      <IconButton
                                        color="primary"
                                        disabled={!isReadyReport}
                                        onClick={() => handleDownload(client.userid, test)}
                                        size="small"
                                        sx={{
                                          backgroundColor: isReadyReport ? 'primary.main' : undefined,
                                          color: isReadyReport ? 'white' : undefined,
                                          '&:hover': isReadyReport ? { backgroundColor: 'primary.dark' } : undefined
                                        }}
                                      >
                                        <GetAppIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                              </Paper>
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
