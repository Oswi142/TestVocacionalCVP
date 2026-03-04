import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, IconButton,
  Collapse, Paper, TextField,
  Avatar, Divider, InputAdornment, Tooltip, useTheme, useMediaQuery
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
import { getCompletedDatCategories, DAT_LABELS, DatType, getDatTestId } from '../../../utils/dat';
import { adminService } from '../../../services/adminService';
import { testService } from '../../../services/testService';
import { UnifiedClient } from '../../../types/user';
import { Question as QuestionRow, AnswerOption as AnswerOptionRow, Test, TestAnswer as TestsAnswerRow } from '../../../types/test';

const C = {
  primary: '#10b981', dark: '#059669',
  bg: 'rgba(16,185,129,0.05)', bgHover: 'rgba(16,185,129,0.1)',
  border: 'rgba(16,185,129,0.15)', borderHover: 'rgba(16,185,129,0.35)',
  spinner: '#10b981', searchFocus: '#10b981', searchHover: 'rgba(16,185,129,0.4)',
};

const AVATAR_PALETTE = [
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#f97316,#ea580c)',
];

const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

const ClientsAnswers: React.FC = () => {
  const [clients, setClients] = useState<UnifiedClient[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, Test[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [clientsData, testsData] = await Promise.all([
          adminService.getClients(),
          adminService.getTests(),
        ]);
        setClients(clientsData);
        setTests(testsData);
      } catch (e) {
        console.error('Error fetching initial data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const splitTextIntoLines = (text: string, maxWidth: number = 50): string[] => {
    if (!text || !text.trim()) return [''];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) currentLine += (currentLine ? ' ' : '') + word;
      else { if (currentLine) { lines.push(currentLine); currentLine = word; } else { lines.push(word); } }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const downloadPDF = async (clientId: number, testId: number, category?: DatType) => {
    try {
      const client = clients.find(c => c.userid === clientId);
      const test = tests.find(t => t.id === testId);
      const datId = await getDatTestId();
      const isDat = testId === datId || (test?.testname || '').toLowerCase().includes('dat');
      const clientAnswers = (await adminService.getClientAnswers(clientId, testId)) as TestsAnswerRow[];
      const qIds = [...new Set(clientAnswers.map(a => a.questionid))];
      const aIds = [...new Set(clientAnswers.map(a => a.answerid).filter((x): x is number => x != null))];
      const [qsRaw, optsRaw] = await Promise.all([
        qIds.length ? adminService.getQuestionsByIds(qIds) : Promise.resolve([]),
        aIds.length ? adminService.getOptionsByIds(aIds) : Promise.resolve([]),
      ]);
      const qMap = new Map<number, QuestionRow>((qsRaw ?? []).map((q: any) => [q.id, q]));
      const oMap = new Map<number, AnswerOptionRow>((optsRaw ?? []).map((o: any) => [o.id, o]));
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('es-ES');
      doc.setFont('helvetica');
      doc.setFontSize(16); doc.text('Reporte de Resultados', 14, 20);
      doc.setFontSize(12);
      doc.text(`Fecha de generación: ${now}`, 14, 30);
      doc.text(`Nombre: ${client?.name || ''}`, 14, 38);
      doc.setFontSize(14); doc.text(`Test: ${test?.testname || ''}`, 14, 52);
      const tableData: any[] = [];
      let categoriesToProcess: (DatType | undefined)[] = [category];
      if (isDat && !category) {
        const foundCats = new Set<DatType>();
        clientAnswers.forEach(ans => { const q = qMap.get(ans.questionid); if (q?.dat_type) foundCats.add(q.dat_type as DatType); });
        const order: DatType[] = ['razonamiento_verbal','razonamiento_numerico','razonamiento_abstracto','razonamiento_mecanico','razonamiento_espacial','ortografia'];
        categoriesToProcess = order.filter(c => foundCats.has(c));
      }
      categoriesToProcess.forEach(currentCat => {
        if (isDat && currentCat) tableData.push([{ content: `SECCIÓN: ${DAT_LABELS[currentCat]}`, styles: { fillColor: [41,128,185], textColor: [255,255,255], fontStyle: 'bold', fontSize: 11, halign: 'center' } }]);
        const filteredAnswers = isDat && currentCat ? clientAnswers.filter(ans => qMap.get(ans.questionid)?.dat_type === currentCat) : clientAnswers;
        let n = 1;
        filteredAnswers.forEach(ans => {
          const qRow = qMap.get(ans.questionid);
          const oRow = ans.answerid != null ? oMap.get(ans.answerid) : undefined;
          let qText = qRow?.question || ''; if (!qText.trim()) qText = 'Pregunta Visual';
          const aText = oRow?.answer ?? ans.details ?? '';
          const qLines = splitTextIntoLines(qText, 80);
          const aLines = splitTextIntoLines(aText, 80);
          tableData.push([{ content: `PREGUNTA ${n}: ${qLines[0]}`, styles: { fillColor: [232,245,255], textColor: [33,150,243], fontStyle: 'bold', fontSize: 10 } }]);
          for (let i = 1; i < qLines.length; i++) tableData.push([{ content: qLines[i], styles: { fillColor: [232,245,255], textColor: [33,150,243], fontStyle: 'bold', fontSize: 10 } }]);
          tableData.push([{ content: `RESPUESTA: ${aLines[0]}`, styles: { fontSize: 10, textColor: [60,60,60] } }]);
          for (let i = 1; i < aLines.length; i++) tableData.push([{ content: aLines[i], styles: { fontSize: 10, textColor: [60,60,60] } }]);
          tableData.push([{ content: '', styles: { minCellHeight: 3 } }]);
          n++;
        });
      });
      autoTable(doc, { startY: 62, body: tableData, theme: 'plain', styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', valign: 'top', halign: 'left' }, columnStyles: { 0: { cellWidth: 'wrap' } }, tableWidth: 'auto', margin: { left: 12, right: 12 }, showHead: false, pageBreak: 'auto', rowPageBreak: 'avoid' });
      doc.save(`Resultados_${client?.name || 'Cliente'}_${test?.testname || 'Test'}.pdf`);
    } catch (e) { console.error(e); alert('Ocurrió un error generando el PDF.'); }
  };

  const filteredClients = clients.filter(client => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (client.name || '').toLowerCase().split(' ').some((w: string) => w.startsWith(q));
  });

  const getClientInitials = (name: string) =>
    (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleToggleClient = async (client: UnifiedClient) => {
    setExpandedClientId(prev => (prev === client.userid ? null : client.userid));
    if (!clientTestsMap[client.userid]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: true }));
        const uniqIds = await testService.getCompletedTestIds(client.userid);
        const datId = await getDatTestId();
        const testsForClient: Test[] = [];
        for (const id of uniqIds) {
          const baseTest = tests.find(t => t.id === id);
          if (!baseTest) continue;
          if (id === datId || (baseTest.testname || '').toLowerCase().includes('dat')) {
            const completedCats = await getCompletedDatCategories(client.userid);
            testsForClient.push({ ...baseTest, testname: `DAT (${completedCats.length} de 6 completados)` });
          } else { testsForClient.push(baseTest); }
        }
        setClientTestsMap(prev => ({ ...prev, [client.userid]: testsForClient }));
      } catch (e) { console.error('Error fetching tests for client:', e); }
      finally { setLoadingTestsForClient(prev => ({ ...prev, [client.userid]: false })); }
    }
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
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800} color="#1e293b">Histórico de Respuestas</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Respaldo íntegro y técnico de las respuestas enviadas por los usuarios.</Typography>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} variant="outlined" size="small"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>), sx: { borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' }, '&:hover fieldset': { borderColor: `${C.searchHover} !important` }, '&.Mui-focused fieldset': { borderColor: `${C.searchFocus} !important` }, height: '34px' } }}
              sx={{ width: 220 }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}</Typography>
          </Box>
        </Box>

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              <CircularProgress size={40} thickness={5} sx={{ color: C.spinner }} />
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>Cargando clientes...</Typography>
            </Box>
          ) : filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <PersonIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No se encontraron clientes</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>Intenta con otro término de búsqueda</Typography>
            </Box>
          ) : (
            filteredClients.map((client) => {
              const isExpanded = expandedClientId === client.userid;
              const testsForClient = clientTestsMap[client.userid] || [];
              return (
                <Paper key={client.userid} elevation={0} sx={{ borderRadius: '20px', backgroundColor: isExpanded ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' } }}>
                  <Box onClick={() => handleToggleClient(client)} sx={{ px: 3, py: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ background: avatarColor(client.userid), width: 44, height: 44, fontSize: '0.95rem', fontWeight: 800 }}>
                        {getClientInitials(client.name || 'SC')}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={700} color="#1e293b">{client.name || 'Sin nombre'}</Typography>
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
                          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Cargando respuestas...</Typography>
                        </Box>
                      ) : testsForClient.length === 0 ? (
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', py: 1 }}>Este usuario aún no ha enviado respuestas.</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {testsForClient.map((test: any) => (
                            <Box key={test.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '14px', backgroundColor: C.bg, border: `1px solid ${C.border}`, transition: 'all 0.2s', '&:hover': { backgroundColor: C.bgHover, borderColor: C.borderHover } }}>
                              <Box display="flex" alignItems="center" gap={1.5}>
                                <Box sx={{ p: 0.8, borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex' }}>
                                  <AssignmentIcon sx={{ fontSize: 18, color: C.dark }} />
                                </Box>
                                <Box>
                                  <Typography variant="body2" fontWeight={700} color="#334155">{test.testname}</Typography>
                                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>Respaldo técnico de respuestas</Typography>
                                </Box>
                              </Box>
                              <Tooltip title="Descargar respaldo PDF" arrow placement="left">
                                <IconButton onClick={() => downloadPDF(client.userid, test.id, test.category)} size="small" sx={{ backgroundColor: '#1e293b', color: 'white', borderRadius: '10px', width: 34, height: 34, '&:hover': { backgroundColor: '#0f172a', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
                                  <GetAppIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
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
