import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  TextField,
  Avatar,
  Chip,
  InputAdornment,
  Tooltip,
  Stack,
  Paper,
  Button,
  Divider,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GetAppIcon from '@mui/icons-material/GetApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';

import { useNavigate } from 'react-router-dom';

import { downloadChasideReportPDF } from '../utils/chaside';

type ClientView = { userid: number };

type TestIds = {
  ipprId: number | null;
  chasideId: number | null;
  maciId: number | null;
};

type RespFlags = { ippr: boolean; chaside: boolean; maci: boolean };

const ClientsReports: React.FC = () => {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [, setTestIds] = useState<TestIds>({
    ipprId: null,
    chasideId: null,
    maciId: null,
  });

  const [respMap, setRespMap] = useState<Record<number, RespFlags>>({});

  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: usersRaw, error: usersErr } = await supabase
          .from('users')
          .select('id, name')
          .eq('role', 'client')
          .range(0, 99999);
        if (usersErr) throw usersErr;

        const usersDedup = Array.from(new Map((usersRaw || []).map((u: any) => [u.id, u])).values());
        setUsers(usersDedup);
        setClients(usersDedup.map((u: any) => ({ userid: u.id })));

        const { data: tests, error: testsErr } = await supabase
          .from('tests')
          .select('id, testname')
          .range(0, 99999);
        if (testsErr) throw testsErr;

        const findId = (needle: string) =>
          tests?.find(t => (t.testname || '').toLowerCase().includes(needle))?.id ?? null;

        const ipprId = findId('ipp');
        const chasideId = findId('chaside');
        const maciId = findId('maci');
        setTestIds({ ipprId, chasideId, maciId });

        const wanted = [ipprId, chasideId, maciId].filter((x): x is number => !!x);
        const flags: Record<number, RespFlags> = {};

        if (wanted.length) {
          const { data: ans, error: ansErr } = await supabase
            .from('testsanswers')
            .select('clientid,testid')
            .in('testid', wanted)
            .range(0, 999999);
          if (ansErr) throw ansErr;

          (ans || []).forEach((r: any) => {
            const cur = flags[r.clientid] ?? { ippr: false, chaside: false, maci: false };
            if (r.testid === ipprId) cur.ippr = true;
            if (r.testid === chasideId) cur.chaside = true;
            if (r.testid === maciId) cur.maci = true;
            flags[r.clientid] = cur;
          });
        }

        setRespMap(flags);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredClients = clients.filter(c => {
    const u = users.find(u => u.id === c.userid);
    return (u?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  const initials = (name: string) =>
    (name || '')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #f9c9a4, #cafacc)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 900, height: '90vh', bgcolor: 'white', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }} size="small">
              <ArrowBackIcon />
            </IconButton>
            <PersonIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">Descargar Resultados</Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Busca un cliente y descarga sus reportes. CHASIDE ya genera informe interpretado.
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="Buscar cliente por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#f8f9fa',
                '&:hover': { backgroundColor: '#e9ecef' }
              }
            }}
          />
          <Chip
            icon={<PersonIcon />}
            label={`${filteredClients.length} cliente${filteredClients.length !== 1 ? 's' : ''} encontrado${filteredClients.length !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Listado */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 6 }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No se encontraron clientes</Typography>
            </Box>
          ) : (
            filteredClients.map((c) => {
              const u = users.find(x => x.id === c.userid);
              const flags = respMap[c.userid] ?? { ippr: false, chaside: false, maci: false };

              return (
                <Paper
                  key={c.userid}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    border: '1px solid #eaeaea',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                    {/* Identidad */}
                    <Box display="flex" alignItems="center" gap={2} minWidth={0}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 46, height: 46, fontWeight: 700 }}>
                        {initials(u?.name || 'SC')}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {u?.name || 'Sin nombre'}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={0.5}>
                          <Chip
                            size="small"
                            icon={flags.ippr ? <DoneIcon /> : <CloseIcon />}
                            label={`IPP-R: ${flags.ippr ? 'Respondió' : 'No respondió'}`}
                            color={flags.ippr ? 'success' : 'default'}
                            variant={flags.ippr ? 'filled' : 'outlined'}
                          />
                          <Chip
                            size="small"
                            icon={flags.maci ? <DoneIcon /> : <CloseIcon />}
                            label={`MACI: ${flags.maci ? 'Respondió' : 'No respondió'}`}
                            color={flags.maci ? 'success' : 'default'}
                            variant={flags.maci ? 'filled' : 'outlined'}
                          />
                        </Stack>
                      </Box>
                    </Box>

                    {/* Acciones */}
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* Botón CHASIDE si respondió */}
                      {flags.chaside ? (
                        <Tooltip title="Descargar reporte CHASIDE">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<GetAppIcon />}
                            onClick={() => downloadChasideReportPDF(c.userid)}
                          >
                            CHASIDE
                          </Button>
                        </Tooltip>
                      ) : (
                        <Chip
                          size="small"
                          icon={<CloseIcon />}
                          label="CHASIDE: No respondió"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Separador fino */}
                  <Divider sx={{ mt: 2 }} />
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
