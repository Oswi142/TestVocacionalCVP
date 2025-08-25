import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box, Typography, CircularProgress, IconButton,
  Collapse, Paper, TextField, Avatar, Chip,
  Divider, InputAdornment,
  Tooltip, Badge
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GetAppIcon from '@mui/icons-material/GetApp';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


const ClientsAnswers: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [answerOptions, setAnswerOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();


  useEffect(() => {
    const fetchAll = async () => {
      const [clientRes, userRes, testRes, questionRes, answerRes, optionRes] = await Promise.all([
        supabase.from('clientsinfo').select('*'),
        supabase.from('users').select('*'),
        supabase.from('tests').select('id, testname'),
        supabase.from('questions').select('id, question'),
        supabase.from('testsanswers').select('*'),
        supabase.from('answeroptions').select('*')
      ]);

      if (!clientRes.error) setClients(clientRes.data || []);
      if (!userRes.error) setUsers(userRes.data || []);
      if (!testRes.error) setTests(testRes.data || []);
      if (!questionRes.error) setQuestions(questionRes.data || []);
      if (!answerRes.error) setAnswers(answerRes.data || []);
      if (!optionRes.error) setAnswerOptions(optionRes.data || []);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const splitTextIntoLines = (text: string, maxWidth: number = 50): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const downloadPDF = (clientId: number, testId: number) => {
    const client = clients.find(c => c.userid === clientId);
    const user = users.find(u => u.id === clientId);
    const clientAnswers = answers.filter(a => a.clientid === clientId && a.testid === testId);
    const test = tests.find(t => t.id === testId);

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('es-ES');

    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Reporte de Resultados', 14, 20);

    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${now}`, 14, 30);
    doc.text(`Nombre: ${user?.name || ''}`, 14, 38);
    doc.text(`Nacimiento: ${client?.birthday || ''}`, 14, 46);
    doc.text(`Dirección: ${client?.address || ''}`, 14, 54);
    doc.text(`Procedencia: ${client?.birthplace || ''}`, 14, 62);

    doc.setFontSize(14);
    doc.text(`Test: ${test?.testname || ''}`, 14, 75);

    const tableData: any[] = [];
    let questionNumber = 1;

    clientAnswers.forEach((ans: any) => {
      const question = questions.find((q: any) => q.id === ans.questionid);
      const option = answerOptions.find((ao: any) => ao.id === ans.answerid);

      const questionText = question?.question || '';
      const answerText = option?.answer || ans.details || '';

      const questionLines = splitTextIntoLines(questionText, 80);
      const answerLines = splitTextIntoLines(answerText, 80);

      tableData.push([{
        content: `PREGUNTA ${questionNumber}: ${questionLines[0]}`,
        styles: {
          fillColor: [232, 245, 255],
          textColor: [33, 150, 243],
          fontStyle: 'bold',
          fontSize: 10
        }
      }]);

      for (let i = 1; i < questionLines.length; i++) {
        tableData.push([{
          content: questionLines[i],
          styles: {
            fillColor: [232, 245, 255],
            textColor: [33, 150, 243],
            fontStyle: 'bold',
            fontSize: 10
          }
        }]);
      }

      tableData.push([{
        content: `RESPUESTA: ${answerLines[0]}`,
        styles: {
          fontSize: 10,
          textColor: [60, 60, 60]
        }
      }]);

      for (let i = 1; i < answerLines.length; i++) {
        tableData.push([{
          content: answerLines[i],
          styles: {
            fontSize: 10,
            textColor: [60, 60, 60]
          }
        }]);
      }

      tableData.push([{
        content: '',
        styles: { minCellHeight: 3 }
      }]);

      questionNumber++;
    });

    autoTable(doc, {
      startY: 85,
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'top'
      },
      columnStyles: {
        0: {
          cellWidth: 175
        }
      },
      margin: { left: 14, right: 14 },
      showHead: false,
      pageBreak: 'auto',
      rowPageBreak: 'avoid'
    });

    const fileName = `Resultados_${user?.name || 'Cliente'}_${test?.testname || 'Test'}.pdf`;
    doc.save(fileName);
  };

  const uniqueClients = clients.reduce((acc: any[], current) => {
    const exists = acc.find(c => c.userid === current.userid);
    return exists ? acc : [...acc, current];
  }, []);

  const filteredClients = uniqueClients.filter(client => {
    const user = users.find(u => u.id === client.userid);
    return user?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(to right, #f9c9a4, #cafacc)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100vw', 
      height: '100vh',
      background: 'linear-gradient(to right, #f9c9a4, #cafacc)',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 2
    }}>
      <Box sx={{
        width: '100%', 
        maxWidth: 800, 
        height: '90vh',
        backgroundColor: '#ffffff', 
        borderRadius: 4, 
        boxShadow: 3,
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{ 
          padding: 3, 
          borderBottom: '1px solid #e0e0e0',
          background: 'white',
          color: 'primary.main'
        }}>
          <Box display="flex" alignItems="center" mb={1} gap={2}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }} size="small">
            <ArrowBackIcon />
            </IconButton>
            <PersonIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="bold">
                Gestión de Resultados
            </Typography>
            </Box>

          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Consulta y descarga los resultados de evaluaciones
          </Typography>
        </Box>

        {/* Search Section */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            placeholder="Buscar cliente por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
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
                '&:hover': {
                  backgroundColor: '#e9ecef'
                }
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

        {/* Clients List */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: 2,
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2 
        }}>
          {filteredClients.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No se encontraron clientes
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Intenta con otro término de búsqueda
              </Typography>
            </Box>
          ) : (
            filteredClients.map((client) => {
              const user = users.find(u => u.id === client.userid);
              const isExpanded = expandedClientId === client.userid;
              const clientTests = answers.filter(a => a.clientid === client.userid)
                .map(a => a.testid)
                .filter((value, index, self) => self.indexOf(value) === index);
              const testsForClient = clientTests.map(id => tests.find(t => t.id === id)).filter(Boolean);

              return (
                <Box key={client.userid} sx={{ mb: 1 }}>
                  {/* Client Header */}
                  <Box
                    onClick={() => setExpandedClientId(prev => prev === client.userid ? null : client.userid)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ 
                        bgcolor: 'primary.main', 
                        width: 40, 
                        height: 40,
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        {getClientInitials(user?.name || 'SC')}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                          {user?.name || 'Sin nombre'}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                          {client.birthday && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(client.birthday)}
                              </Typography>
                            </Box>
                          )}
                          {client.birthplace && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {client.birthplace}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Badge badgeContent={testsForClient.length} color="primary">
                        <Chip 
                          icon={<AssignmentIcon />}
                          label="Tests"
                          variant="outlined"
                          color="primary"
                          size="small"
                        />
                      </Badge>
                      <IconButton color="primary" size="small">
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Expanded Content */}
                  <Collapse in={isExpanded} unmountOnExit>
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      {client.address && (
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Dirección:</strong> {client.address}
                          </Typography>
                        </Box>
                      )}
                      
                      <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mb: 2 }}>
                        Evaluaciones Disponibles
                      </Typography>
                      
                      {testsForClient.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>
                          No hay evaluaciones disponibles para este cliente
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {testsForClient.map((test: any) => (
                            <Paper key={test.id} variant="outlined" sx={{ 
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }
                            }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <AssignmentIcon color="primary" sx={{ fontSize: 20 }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="500">
                                      {test.testname}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Evaluación completada
                                    </Typography>
                                  </Box>
                                </Box>
                                <Tooltip title="Descargar PDF" arrow>
                                  <IconButton 
                                    color="primary" 
                                    onClick={() => downloadPDF(client.userid, test.id)}
                                    size="small"
                                    sx={{
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      '&:hover': {
                                        backgroundColor: 'primary.dark',
                                      }
                                    }}
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
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientsAnswers;