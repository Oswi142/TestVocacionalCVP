import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton,
  Collapse, Paper, TextField, Avatar, Chip,
  Divider, InputAdornment, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GetAppIcon from '@mui/icons-material/GetApp';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ===== Tipos =====
type QuestionRow = { id: number; question: string };
type AnswerOptionRow = { id: number; answer: string };
type TestsAnswerRow = {
  clientid: number;
  testid: number;
  questionid: number;
  answerid: number | null;
  details: string | null;
};
type ClientView = {
  userid: number;
  birthday?: string | null;
  address?: string | null;
  birthplace?: string | null;
};

const ClientsAnswers: React.FC = () => {
  const [clients, setClients] = useState<ClientView[]>([]);
  const [users, setUsers] = useState<any[]>([]); // solo role=client
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado visual/datos
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, any[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [testsCountMap, setTestsCountMap] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      const [clientRes, userRes, testRes] = await Promise.all([
        supabase.from('clientsinfo').select('*').range(0, 9999),
        supabase.from('users').select('*').eq('role', 'client').range(0, 9999),
        supabase.from('tests').select('id, testname').range(0, 9999),
      ]);

      const clientsinfoRows = clientRes.error ? [] : (clientRes.data || []);
      const userRowsRaw     = userRes.error ? [] : (userRes.data || []);
      const testsRows       = testRes.error ? [] : (testRes.data || []);

      const usersDedup = Array.from(new Map(userRowsRaw.map((u: any) => [u.id, u])).values());

      const ciMap = new Map<number, any>(clientsinfoRows.map((c: any) => [c.userid, c]));
      const unified = usersDedup.map((u: any) => {
        const ci = ciMap.get(u.id);
        return {
          userid: u.id,
          birthday: ci?.birthday ?? null,
          address:  ci?.address  ?? null,
          birthplace: ci?.birthplace ?? null,
        } as ClientView;
      });

      // Contadores de tests por cliente (testid únicos)
      let counts: Record<number, number> = {};
      try {
        const ids = usersDedup.map((u: any) => u.id);
        if (ids.length) {
          const { data: rows } = await supabase
            .from('testsanswers')
            .select('clientid,testid')
            .in('clientid', ids)
            .range(0, 999999);

          if (rows) {
            const map = new Map<number, Set<number>>();
            rows.forEach((r: any) => {
              if (!map.has(r.clientid)) map.set(r.clientid, new Set<number>());
              map.get(r.clientid)!.add(r.testid);
            });
            counts = Object.fromEntries(
              Array.from(map.entries()).map(([cid, set]) => [cid, set.size])
            );
          }
        }
      } catch (e) {
        console.error(e);
      }

      setUsers(usersDedup);
      setClients(unified);
      setTests(testsRows);
      setTestsCountMap(counts);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const splitTextIntoLines = (text: string, maxWidth: number = 50): string[] => {
    const words = (text || '').split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) currentLine += (currentLine ? ' ' : '') + word;
      else { if (currentLine) { lines.push(currentLine); currentLine = word; } else { lines.push(word); } }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // ===== PDF on-demand =====
  const downloadPDF = async (clientId: number, testId: number) => {
    try {
      const user = users.find(u => u.id === clientId);
      const test = tests.find(t => t.id === testId);

      const { data: clientAnswersRaw, error: ansErr } = await supabase
        .from('testsanswers')
        .select('clientid,testid,questionid,answerid,details')
        .eq('clientid', clientId)
        .eq('testid', testId)
        .order('questionid', { ascending: true })
        .range(0, 99999);

      if (ansErr) throw ansErr;
      const clientAnswers = (clientAnswersRaw ?? []) as TestsAnswerRow[];

      const qIds = [...new Set(clientAnswers.map(a => a.questionid))];
      const aIds = [...new Set(clientAnswers.map(a => a.answerid).filter((x): x is number => x != null))];

      const [{ data: qsRaw, error: qErr }, { data: optsRaw, error: oErr }] = await Promise.all([
        qIds.length ? supabase.from('questions').select('id,question').in('id', qIds) : Promise.resolve({ data: [] as any[], error: null } as any),
        aIds.length ? supabase.from('answeroptions').select('id,answer').in('id', aIds) : Promise.resolve({ data: [] as any[], error: null } as any),
      ]);
      if (qErr) throw qErr;
      if (oErr) throw oErr;

      const qMap = new Map<number, QuestionRow>((qsRaw ?? []).map((q: any) => [q.id, q]));
      const oMap = new Map<number, AnswerOptionRow>((optsRaw ?? []).map((o: any) => [o.id, o]));

      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('es-ES');

      doc.setFont('helvetica');
      doc.setFontSize(16);
      doc.text('Reporte de Resultados', 14, 20);

      doc.setFontSize(12);
      doc.text(`Fecha de generación: ${now}`, 14, 30);
      doc.text(`Nombre: ${user?.name || ''}`, 14, 38);

      doc.setFontSize(14);
      doc.text(`Test: ${test?.testname || ''}`, 14, 52);

      const tableData: any[] = [];
      let questionNumber = 1;

      (clientAnswers || []).forEach((ans) => {
        const questionRow = qMap.get(ans.questionid);
        const optionRow = ans.answerid != null ? oMap.get(ans.answerid) : undefined;

        const questionText = questionRow?.question ?? '';
        const answerText = optionRow?.answer ?? ans.details ?? '';

        const questionLines = splitTextIntoLines(questionText, 80);
        const answerLines = splitTextIntoLines(answerText, 80);

        tableData.push([{ content: `PREGUNTA ${questionNumber}: ${questionLines[0]}`, styles: { fillColor: [232,245,255], textColor: [33,150,243], fontStyle: 'bold', fontSize: 10 } }]);
        for (let i = 1; i < questionLines.length; i++) {
          tableData.push([{ content: questionLines[i], styles: { fillColor: [232,245,255], textColor: [33,150,243], fontStyle: 'bold', fontSize: 10 } }]);
        }
        tableData.push([{ content: `RESPUESTA: ${answerLines[0]}`, styles: { fontSize: 10, textColor: [60,60,60] } }]);
        for (let i = 1; i < answerLines.length; i++) {
          tableData.push([{ content: answerLines[i], styles: { fontSize: 10, textColor: [60,60,60] } }]);
        }
        tableData.push([{ content: '', styles: { minCellHeight: 3 } }]);
        questionNumber++;
      });

      const left = 12, right = 12;
      autoTable(doc, {
        startY: 62,
        body: tableData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', valign: 'top', halign: 'left' },
        columnStyles: { 0: { cellWidth: 'wrap' } },
        tableWidth: 'auto',
        margin: { left, right },
        showHead: false,
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      const fileName = `Resultados_${user?.name || 'Cliente'}_${test?.testname || 'Test'}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error generando el PDF.');
    }
  };

  const filteredClients = clients.filter(client => {
    const user = users.find(u => u.id === client.userid);
    const name = (user?.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const getClientInitials = (name: string) =>
    (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleToggleClient = async (client: ClientView) => {
    setExpandedClientId(prev => (prev === client.userid ? null : client.userid));

    if (!clientTestsMap[client.userid]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: true }));
        const { data: rows, error } = await supabase
          .from('testsanswers')
          .select('testid')
          .eq('clientid', client.userid)
          .order('testid', { ascending: true })
          .range(0, 9999);

        if (error) throw error;

        const uniqIds = [...new Set((rows || []).map(r => r.testid))];
        const testsForClient = uniqIds
          .map(id => tests.find(t => t.id === id))
          .filter(Boolean) as any[];

        setClientTestsMap(prev => ({ ...prev, [client.userid]: testsForClient }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: false }));
      }
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
            <Typography variant="h5" fontWeight="bold">Gestión de Resultados</Typography>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Consulta y descarga los resultados de evaluaciones</Typography>
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
              const testCount = testsCountMap[client.userid] ?? 0;

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
                        {/* 👇 Se quitó fecha de nacimiento y procedencia */}
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Chip
                        icon={<AssignmentIcon />}
                        label={testCount > 0 ? `${testCount} test${testCount !== 1 ? 's' : ''}` : 'Sin respuestas'}
                        variant={testCount > 0 ? 'outlined' : 'filled'}
                        color={testCount > 0 ? 'primary' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      <IconButton color="primary" size="small">
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Contenido expandido */}
                  <Collapse in={isExpanded} unmountOnExit>
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      {/* 👇 Se quitó el bloque de Dirección */}
                      <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mb: 2 }}>
                        {testCount > 0 ? 'Evaluaciones disponibles' : 'No hay evaluaciones respondidas'}
                      </Typography>

                      {loadingTestsForClient[client.userid] ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Cargando evaluaciones...
                        </Typography>
                      ) : testsForClient.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {testCount > 0 ? 'Toca para recargar' : 'Aún no hay respuestas para este cliente'}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {testsForClient.map((test: any) => (
                            <Paper key={test.id} variant="outlined" sx={{
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                            }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <AssignmentIcon color="primary" sx={{ fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="500">{test.testname}</Typography>
                                    <Typography variant="caption" color="text.secondary">Evaluación completada</Typography>
                                  </Box>
                                </Box>
                                <Tooltip title="Descargar PDF" arrow>
                                  <IconButton
                                    color="primary"
                                    onClick={() => downloadPDF(client.userid, test.id)}
                                    size="small"
                                    sx={{ backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }}
                                  >
                                    <GetAppIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Paper>
                          ))}
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

export default ClientsAnswers;
