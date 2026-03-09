import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton,
  Collapse, Paper, TextField,
  Avatar, Divider, InputAdornment, Tooltip, useTheme, useMediaQuery,
  Snackbar, Alert
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
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
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

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };





  const downloadPDF = async (clientId: number, testId: number, category?: DatType, attemptId: string = 'active') => {
    try {
      const client = clients.find(c => c.userid === clientId);
      const test = tests.find(t => t.id === testId);
      const datId = await getDatTestId();
      const isDat = testId === datId || (test?.testname || '').toLowerCase().includes('dat');

      const allAnswers = (await adminService.getClientAnswers(clientId, testId)) as TestsAnswerRow[];
      const clientAnswers = allAnswers.filter(ans => {
        const details = ans.details || '';
        if (attemptId === 'active') return !details.startsWith('[HIST_');
        return details.startsWith(attemptId);
      });

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

      let submitDateStr = now;
      if (attemptId !== 'active' && clientAnswers.length > 0) {
        const dates = clientAnswers
          .map(a => a.created_at ? new Date(a.created_at).getTime() : 0)
          .filter(t => t > 0);

        if (dates.length > 0) {
          const maxDate = new Date(Math.max(...dates));
          submitDateStr = maxDate.toLocaleDateString('es-ES');
        }
      }

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE TÉCNICO DE RESPUESTAS', 14, 17);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Enviado: ${submitDateStr}`, 160, 17);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 182, 48, 4, 4, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos del Cliente', 20, 44);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 47, 188, 47);

      doc.setFontSize(9.5);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Nombre:', 20, 54);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(client?.name || 'No registrado', 40, 54);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Colegio:', 20, 61);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(client?.school || 'No registrado', 40, 61);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Grado:', 20, 68);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(client?.grade || 'No registrado', 40, 68);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Test:', 20, 75);
      doc.setTextColor(16, 185, 129); doc.setFont('helvetica', 'bold'); doc.text(test?.testname || '', 40, 75);

      let formattedBirthday = 'No registrado';
      if (client?.birthday) {
        const [year, month, day] = client.birthday.split('-');
        if (year && month && day) {
          formattedBirthday = `${day}/${month}/${year}`;
        } else {
          formattedBirthday = client.birthday;
        }
      }

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('F. Nac.:', 110, 54);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(formattedBirthday, 134, 54);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Lugar Nac.:', 110, 61);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(client?.birthplace || 'No registrado', 134, 61);

      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text('Género:', 110, 68);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.text(client?.gender || 'No registrado', 134, 68);

      const tableData: any[] = [];
      let categoriesToProcess: (DatType | undefined)[] = [category];

      if (isDat && !category) {
        const foundCats = new Set<DatType>();
        clientAnswers.forEach(ans => { const q = qMap.get(ans.questionid); if (q?.dat_type) foundCats.add(q.dat_type as DatType); });
        const order: DatType[] = ['razonamiento_verbal', 'razonamiento_numerico', 'razonamiento_abstracto', 'razonamiento_mecanico', 'razonamiento_espacial', 'ortografia'];
        categoriesToProcess = order.filter(c => foundCats.has(c));
      }

      categoriesToProcess.forEach(currentCat => {
        if (isDat && currentCat) {
          tableData.push([{ content: `\nSECCIÓN: ${DAT_LABELS[currentCat]}\n`, styles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 11, halign: 'center' } }]);
        }
        const filteredAnswers = isDat && currentCat ? clientAnswers.filter(ans => qMap.get(ans.questionid)?.dat_type === currentCat) : clientAnswers;

        let n = 1;
        filteredAnswers.forEach(ans => {
          const qRow = qMap.get(ans.questionid);
          const oRow = ans.answerid != null ? oMap.get(ans.answerid) : undefined;
          let qText = qRow?.question || '';
          if (!qText.trim()) qText = 'Pregunta Visual (Referente a la imagen del documento)';
          const aText = oRow?.answer ?? ans.details ?? 'Sin respuesta';

          tableData.push([{
            content: `${n}. ${qText}`,
            styles: { fillColor: [255, 255, 255], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 9.5, cellPadding: { top: 6, bottom: 2, left: 4, right: 4 } }
          }]);

          tableData.push([{
            content: `R:  ${aText}`,
            styles: { fillColor: [255, 255, 255], textColor: [15, 23, 42], fontStyle: 'normal', fontSize: 10, cellPadding: { top: 2, bottom: 6, left: 4, right: 4 } }
          }]);

          tableData.push([{ content: '', styles: { fillColor: [255, 255, 255], minCellHeight: 1, cellPadding: 0 } }]);
          n++;
        });
      });

      autoTable(doc, {
        startY: 88,
        body: tableData,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 10, overflow: 'linebreak', valign: 'middle' },
        columnStyles: { 0: { cellWidth: 'wrap' } },
        tableWidth: 'auto',
        margin: { left: 14, right: 14, bottom: 20 },
        showHead: false,
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        didDrawCell: (data) => {
          if (data.row.index % 3 === 1 && data.cell.raw !== '') {
            doc.setDrawColor(241, 245, 249);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });
      doc.save(`Resultados_${client?.name || 'Cliente'}_${test?.testname || 'Test'}.pdf`);
    } catch (e) { console.error(e); showToast('Ocurrió un error generando el PDF.', 'error'); }
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

        const { data: allAnswersRaw } = await supabase
          .from('testsanswers')
          .select('testid, details')
          .eq('clientid', client.userid);

        const answers = (allAnswersRaw || []) as any[];
        const uniqTestIds = [...new Set(answers.map(a => a.testid))];

        const datId = await getDatTestId();
        const testsForClient: any[] = [];

        for (const id of uniqTestIds) {
          const baseTest = tests.find(t => t.id === id);
          if (!baseTest) continue;

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
            return b.localeCompare(a);
          });

          if (id === datId || (baseTest.testname || '').toLowerCase().includes('dat')) {
            const completedCats = await getCompletedDatCategories(client.userid);
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



  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', p: isMobile ? 1 : 3, boxSizing: 'border-box', overflowX: 'hidden' }}>
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
                                </Box>
                              </Box>
                              <Tooltip title="Descargar respaldo PDF" arrow placement="left">
                                <IconButton onClick={() => downloadPDF(client.userid, test.id, test.category, test.selectedAttempt)} size="small" sx={{ backgroundColor: '#1e293b', color: 'white', borderRadius: '10px', width: 34, height: 34, '&:hover': { backgroundColor: '#0f172a', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
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

export default ClientsAnswers;
