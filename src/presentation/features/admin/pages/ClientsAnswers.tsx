import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/infrastructure/config/supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton,
  Collapse, Paper, TextField,
  Avatar, Divider, InputAdornment, Tooltip, useTheme, useMediaQuery,
  Snackbar, Alert, TablePagination, Select, MenuItem, FormControl, InputLabel
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
import { getCompletedDatCategories, DAT_LABELS, DatType, getDattest_id } from '@/domain/rules/dat';
import { adminService } from '@/infrastructure/services/adminService';
import { UnifiedClient } from '@/domain/entities/user';
import { Question as QuestionRow, AnswerOption as AnswerOptionRow, Test, TestAnswer as TestsAnswerRow } from '@/domain/entities/test';

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
  const [expandedclient_id, setExpandedclient_id] = useState<number | null>(null);
  const [clientTestsMap, setClientTestsMap] = useState<Record<number, Test[]>>({});
  const [loadingTestsForClient, setLoadingTestsForClient] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [clientsData, testsData] = await Promise.all([
          adminService.getUsers('client'),
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





  const downloadPDF = async (client_id: number, test_id: number, category?: DatType, attemptId: string = 'active') => {
    try {
      const { drawPremiumHeader, drawClientCard, drawFooter, PDF_COLORS, PDF_FONT_SIZE } = await import('@/infrastructure/utils/pdfUtils');
      const client = clients.find(c => c.user_id === client_id);
      const test = tests.find(t => t.id === test_id);
      const datId = await getDattest_id();
      const isDat = test_id === datId || (test?.test_name || '').toLowerCase().includes('dat');

      const allAnswers = (await adminService.getClientAnswers(client_id, test_id)) as TestsAnswerRow[];
      const clientAnswers = allAnswers.filter(ans => {
        const details = ans.details || '';
        if (attemptId === 'active') return !details.startsWith('[HIST_');
        return details.startsWith(attemptId);
      });

      const qIds = [...new Set(clientAnswers.map(a => a.question_id))];
      const aIds = [...new Set(clientAnswers.map(a => a.answer_id).filter((x): x is number => x != null))];
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

      // ── Premium header ────────────────────────────────────────────────────
      let y = drawPremiumHeader(
        doc,
        'REPORTE TÉCNICO DE RESPUESTAS',
        `Test: ${test?.test_name || '—'}   |   Enviado: ${submitDateStr}`,
        now
      );

      // ── Client card ───────────────────────────────────────────────────────
      const { buildClientCardFields: buildFields } = await import('@/infrastructure/utils/pdfUtils');
      y = drawClientCard(doc, y, buildFields({
        name: (client as any)?.name ?? null,
        first_last_name: (client as any)?.first_last_name ?? null,
        second_last_name: (client as any)?.second_last_name ?? null,
        school: (client as any)?.school ?? null,
        grade: (client as any)?.grade ?? null,
        birthday: (client as any)?.birthday ?? null,
        birthplace: (client as any)?.birthplace ?? null,
        gender: (client as any)?.gender ?? null,
      }));

      // ── Answers table ─────────────────────────────────────────────────────
      const tableData: any[] = [];
      let categoriesToProcess: (DatType | undefined)[] = [category];

      if (isDat && !category) {
        const foundCats = new Set<DatType>();
        clientAnswers.forEach(ans => { const q = qMap.get(ans.question_id); if (q?.dat_type) foundCats.add(q.dat_type as DatType); });
        const order: DatType[] = ['razonamiento_verbal', 'razonamiento_numerico', 'razonamiento_abstracto', 'razonamiento_mecanico', 'razonamiento_espacial', 'ortografia'];
        categoriesToProcess = order.filter(c => foundCats.has(c));
      }

      categoriesToProcess.forEach(currentCat => {
        if (isDat && currentCat) {
          tableData.push([{ content: `\nSECCIÓN: ${DAT_LABELS[currentCat]}\n`, styles: { fillColor: PDF_COLORS.lightBg, textColor: PDF_COLORS.accentGreen, fontStyle: 'bold', fontSize: PDF_FONT_SIZE, halign: 'center' } }]);
        }
        const filteredAnswers = isDat && currentCat ? clientAnswers.filter(ans => qMap.get(ans.question_id)?.dat_type === currentCat) : clientAnswers;

        let n = 1;
        filteredAnswers.forEach(ans => {
          const qRow = qMap.get(ans.question_id);
          const oRow = ans.answer_id != null ? oMap.get(ans.answer_id) : undefined;
          let qText = qRow?.question || '';
          if (!qText.trim()) qText = 'Pregunta Visual (Referente a la imagen del documento)';
          const aText = oRow?.answer ?? ans.details ?? 'Sin respuesta';

          tableData.push([{
            content: `${n}. ${qText}`,
            styles: { fillColor: [255, 255, 255], textColor: PDF_COLORS.mutedText, fontStyle: 'bold', fontSize: PDF_FONT_SIZE, cellPadding: { top: 7, bottom: 1.5, left: 4, right: 4 } }
          }]);

          tableData.push([{
            content: `R:  ${aText}`,
            styles: { fillColor: [255, 255, 255], textColor: PDF_COLORS.bodyText, fontStyle: 'normal', fontSize: PDF_FONT_SIZE, cellPadding: { top: 1.5, bottom: 7, left: 4, right: 4 } }
          }]);

          n++;
        });
      });

      autoTable(doc, {
        startY: y,
        body: tableData,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: PDF_FONT_SIZE, overflow: 'linebreak', valign: 'top' },
        columnStyles: { 0: { cellWidth: 182 } },
        tableWidth: 'wrap',
        margin: { left: 14, right: 14, bottom: 20 },
        showHead: false,
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        didDrawCell: (data) => {
          if (data.row.index % 2 === 1) {
            doc.setDrawColor(...PDF_COLORS.divider as [number, number, number]);
            doc.setLineWidth(0.2);
            doc.line(
              data.cell.x + 4,
              data.cell.y + data.cell.height,
              data.cell.x + data.cell.width - 4,
              data.cell.y + data.cell.height
            );
          }
        }
      });

      drawFooter(doc);
      doc.save(`Resultados_${client?.name || 'Cliente'}_${test?.test_name || 'Test'}.pdf`);
    } catch (e) { console.error(e); showToast('Ocurrió un error generando el PDF.', 'error'); }
  };

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = [...clients];

    if (q) {
      result = result.filter(c => (c.name || '').toLowerCase().includes(q));
    }

    // Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const idA = a.user_id;
        const idB = b.user_id;
        return sortOrder === 'asc' ? idA - idB : idB - idA;
      } else {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (sortOrder === 'asc') return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      }
    });

    return result;
  }, [clients, search, sortBy, sortOrder]);

  const paginatedClients = useMemo(() => {
    return filteredClients.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredClients, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortBy, sortOrder]);

  const getClientInitials = (name: string) =>
    (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleToggleClient = async (client: UnifiedClient) => {
    setExpandedclient_id(prev => (prev === client.user_id ? null : client.user_id));
    if (!clientTestsMap[client.user_id]) {
      try {
        setLoadingTestsForClient(prev => ({ ...prev, [client.user_id]: true }));

        const { data: allAnswersRaw } = await supabase
          .from('test_answers')
          .select('test_id, details')
          .eq('client_id', client.user_id);

        const answers = (allAnswersRaw || []) as any[];
        const uniqtest_ids = [...new Set(answers.map(a => a.test_id))];

        const datId = await getDattest_id();
        const testsForClient: any[] = [];

        for (const id of uniqtest_ids) {
          const baseTest = tests.find(t => t.id === id);
          if (!baseTest) continue;

          const testAnswers = answers.filter(a => a.test_id === id);
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

          if (id === datId || (baseTest.test_name || '').toLowerCase().includes('dat')) {
            const completedCats = await getCompletedDatCategories(client.user_id);
            testsForClient.push({
              ...baseTest,
              test_name: `DAT (${completedCats.length} de 6 completados)`,
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
        setClientTestsMap(prev => ({ ...prev, [client.user_id]: testsForClient }));
      } catch (e) { console.error('Error fetching tests for client:', e); }
      finally { setLoadingTestsForClient(prev => ({ ...prev, [client.user_id]: false })); }
    }
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
                Histórico de Respuestas
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mb: 2 }}>Consulta y descarga las respuestas detalladas de cada proceso evaluativo.</Typography>

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

        {/* List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              paginatedClients.map((client) => {
                const isExpanded = expandedclient_id === client.user_id;
                const testsForClient = clientTestsMap[client.user_id] || [];
                return (
                  <Paper key={client.user_id} elevation={0} sx={{ borderRadius: '20px', backgroundColor: isExpanded ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' } }}>
                    <Box onClick={() => handleToggleClient(client)} sx={{ px: 3, py: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ background: avatarColor(client.user_id), width: 44, height: 44, fontSize: '0.95rem', fontWeight: 800 }}>
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
                        {loadingTestsForClient[client.user_id] ? (
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
                                    <Typography variant="body2" fontWeight={700} color="#334155">{test.test_name}</Typography>
                                  </Box>
                                </Box>
                                <Tooltip title="Descargar respaldo PDF" arrow placement="left">
                                  <IconButton onClick={() => downloadPDF(client.user_id, test.id, test.category, test.selectedAttempt)} size="small" sx={{ backgroundColor: '#1e293b', color: 'white', borderRadius: '10px', width: 34, height: 34, '&:hover': { backgroundColor: '#0f172a', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
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

export default ClientsAnswers;
