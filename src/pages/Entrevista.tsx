import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import dayjs from 'dayjs';

interface Question {
  id: number;
  question: string;
  section: number;
}

interface School {
  id: number;
  schoolname: string;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const departamentos = [
  'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí',
  'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

const Entrevista: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const STORAGE_KEY = `entrevista_${user.id || 'anonymous'}`;

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [birthdayDate, setBirthdayDate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  // Sistema de guardado manual únicamente
  const saveToLocal = useCallback(() => {
    try {
      const data = {
        answers,
        selectedSchoolId,
        birthdayDate: birthdayDate ? birthdayDate.toISOString() : null,
        currentSection,
        lastSaved: new Date().toLocaleString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(data.lastSaved);
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      return false;
    }
  }, [answers, selectedSchoolId, birthdayDate, currentSection, STORAGE_KEY]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const groupedQuestions = allQuestions.reduce((acc: { [key: number]: Question[] }, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => opt.questionid === questionId);

  const conditionalVisibility: Record<number, number> = {
    17: 16,
    20: 19,
    27: 26
  };

  const shouldDisplayQuestion = (questionId: number): boolean => {
    const dependentId = conditionalVisibility[questionId];
    if (!dependentId) return true;

    const selectedAnswerId = answers[dependentId];
    const options = getOptionsForQuestion(dependentId);
    const selectedAnswer = options.find(opt => String(opt.id) === String(selectedAnswerId));
    return selectedAnswer?.answer?.toLowerCase() === 'sí';
  };

  const isSectionComplete = (section: number): boolean => {
    const questions = groupedQuestions[section] || [];

    return questions.every((q) => {
      if (!shouldDisplayQuestion(q.id)) return true;

      const value = answers[q.id];

      if (q.question.toLowerCase().includes('fecha')) {
        return !!birthdayDate;
      }

      if (q.question.toLowerCase().includes('colegio')) {
        return selectedSchoolId !== null;
      }

      return !!value && value.trim() !== '';
    });
  };

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [currentSection]);

  useEffect(() => {
    const fetchData = async () => {
      const [questionsRes, schoolsRes, optionsRes] = await Promise.all([
        supabase.from('questions').select('id, question, section').eq('testid', 1).order('section').order('id'),
        supabase.from('schools').select('id, schoolname').order('schoolname'),
        supabase.from('answeroptions').select('id, questionid, answer').order('id')
      ]);

      if (!questionsRes.error) setAllQuestions(questionsRes.data || []);
      if (!schoolsRes.error) setSchools(schoolsRes.data || []);
      if (!optionsRes.error) setAnswerOptions(optionsRes.data || []);

      // Cargar datos guardados
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const localData = JSON.parse(stored);
          setAnswers(localData.answers || {});
          setSelectedSchoolId(localData.selectedSchoolId);
          
          if (localData.birthdayDate) {
            setBirthdayDate(dayjs(localData.birthdayDate));
          }
          
          setCurrentSection(localData.currentSection || 1);
          setLastSaved(localData.lastSaved || '');
          
          showSnackbar('Respuestas cargadas', 'success');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }

      setLoading(false);
    };

    fetchData();
  }, [STORAGE_KEY]);

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value.trim() === '' ? '' : value
    }));
  };

  const handleSchoolChange = (schoolId: number) => {
    setSelectedSchoolId(schoolId);
  };

  const handleDateChange = (newValue: any) => {
    setBirthdayDate(newValue);
  };

  const handleSectionChange = (section: number) => {
    setCurrentSection(section);
  };

  const handleExit = () => {
    setExitConfirmOpen(true);
  };

  const confirmExit = () => {
    // Guardar automáticamente al salir
    saveToLocal();
    setExitConfirmOpen(false);
    navigate(-1);
  };

  const handleManualSave = () => {
    const success = saveToLocal();
    showSnackbar(success ? 'Respuestas guardadas correctamente' : 'Error al guardar', success ? 'success' : 'error');
  };

  const isAllComplete = (): boolean => {
    return Object.keys(groupedQuestions).every((key) => {
      const section = parseInt(key);
      return isSectionComplete(section);
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      if (!user || !user.id) {
        throw new Error('Usuario no encontrado');
      }

      const allVisibleQuestions = allQuestions.filter(q => shouldDisplayQuestion(q.id));
      
      const unansweredRequired = allVisibleQuestions.filter(q => {
        if ([17, 20, 27].includes(q.id)) return false;
        
        const value = answers[q.id];
        
        if (q.question.toLowerCase().includes('fecha')) {
          return !birthdayDate;
        }
        
        if (q.question.toLowerCase().includes('colegio')) {
          return !selectedSchoolId;
        }
        
        return !value || String(value).trim() === '';
      });

      if (unansweredRequired.length > 0) {
        const missingSections = [
          ...new Set(unansweredRequired.map(q => q.section))
        ];
        showSnackbar(`Faltan preguntas en sección(es): ${missingSections.join(', ')}`, 'error');
        setSaving(false);
        return;
      }

      const section1 = groupedQuestions[1] || [];
      
      const mapped = {
        gender: answers[section1[0]?.id] || '',
        birthday: birthdayDate ? birthdayDate.format('YYYY-MM-DD') : '',
        birthplace: answers[section1[2]?.id] || '',
        address: answers[section1[3]?.id] || '',
        grade: answers[section1[5]?.id] || '',
        hobbies: answers[section1[6]?.id] || '',
      };

      const { error: infoError } = await supabase.from('clientsinfo').upsert({
        userid: user.id,
        gender: mapped.gender,
        birthday: mapped.birthday,
        birthplace: mapped.birthplace,
        address: mapped.address,
        schoolid: selectedSchoolId,
        grade: mapped.grade,
        hobbies: mapped.hobbies,
      });

      if (infoError) throw infoError;

      const sectionsToProcess = [2, 3, 4, 5, 6, 7, 8];
      
      for (const sectionNum of sectionsToProcess) {
        const sectionQuestions = groupedQuestions[sectionNum] || [];
        
        for (const q of sectionQuestions) {
          if (!shouldDisplayQuestion(q.id)) continue;
          
          const value = answers[q.id];
          if (!value || String(value).trim() === '') continue;

          const options = getOptionsForQuestion(q.id);
          let insertData: any = {
            clientid: user.id,
            testid: 1,
            questionid: q.id
          };

          if (options.length > 0) {
            const answerId = parseInt(value);
            if (isNaN(answerId)) continue;
            insertData.answerid = answerId;
          } else {
            insertData.details = value;
          }
          
          const { error: insertError } = await supabase.from('testsanswers').insert(insertData);
          if (insertError) throw insertError;
        }
      }

      // Limpiar datos locales después del envío exitoso
      localStorage.removeItem(STORAGE_KEY);
      
      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => {
        navigate('/client');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error:', err);
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
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
          background: 'linear-gradient(to right, #f9c9a4, #cafacc)' 
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
      padding: 2,
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        width: '100%', 
        maxWidth: 600, 
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
          padding: 2, 
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <IconButton onClick={handleExit}>
              <ArrowBackIcon />
            </IconButton>
            
            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleManualSave}
              sx={{ 
                borderColor: '#4caf50',
                color: '#4caf50',
                '&:hover': { borderColor: '#388e3c', backgroundColor: '#f1f8e9' }
              }}
            >
              Guardar
            </Button>
          </Box>

          <Typography variant="h5" color="primary">Test: Entrevista</Typography>
          <Typography variant="subtitle1" color="primary">
            Sección {currentSection}
          </Typography>

          {lastSaved && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <SaveIcon sx={{ fontSize: 12, mr: 0.5, color: '#4caf50' }} />
              Guardado: {lastSaved}
            </Typography>
          )}
        </Box>

        {/* Contenido */}
        <Box 
          id="scroll-container"
          sx={{ 
            flex: 1,
            overflow: 'auto',
            padding: 3,
            paddingTop: 2
          }}
        >
          {/* Alerts */}
          {currentSection === 2 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Profundizar en la relación y ocupación de cada uno de sus familiares y otras personas significativas.
            </Alert>
          )}

          {currentSection === 3 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Responde con sinceridad a las siguientes preguntas relacionadas con tu etapa escolar.
            </Alert>
          )}

          {currentSection === 4 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Indica cuánto piensas que ha influido cada factor en tu elección vocacional.
            </Alert>
          )}

          {currentSection === 5 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Comparte tus reflexiones personales. Responde con sinceridad.
            </Alert>
          )}

          {currentSection === 6 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Responde si las siguientes afirmaciones son verdaderas o falsas.
            </Alert>
          )}

          {currentSection === 7 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Indica si necesitas la siguiente información relacionada con tus decisiones vocacionales.
            </Alert>
          )}

          {currentSection === 8 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Indica si presentas alguna de las siguientes dificultades relacionadas con tu elección vocacional.
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {questions.map((q) => {
              if (!shouldDisplayQuestion(q.id)) return null;
              const options = getOptionsForQuestion(q.id);
              const isSelect = (currentSection === 3 || currentSection === 4|| currentSection === 6|| currentSection === 7|| currentSection === 8) && options.length > 0;

              return (
                <Box key={q.id} mb={3}>
                  <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>

                  {isSelect && !q.question.toLowerCase().includes('colegio') ? (
                    <RadioGroup
                      value={answers[q.id] || ''}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                    >
                      {options.map((opt) => (
                        <FormControlLabel
                          key={opt.id}
                          value={String(opt.id)}
                          control={<Radio color="primary" />}
                          label={opt.answer}
                        />
                      ))}
                    </RadioGroup>
                  ) : q.question.toLowerCase().includes('sexo') ? (
                    <FormControl fullWidth variant="outlined">
                      <Select
                        displayEmpty
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      >
                        <MenuItem value="" disabled>Selecciona tu género</MenuItem>
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Femenino">Femenino</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                      </Select>
                    </FormControl>
                  ) : q.question.toLowerCase().includes('fecha') ? (
                    <DatePicker
                      value={birthdayDate}
                      onChange={handleDateChange}
                      format="DD/MM/YYYY"
                    />
                  ) : q.question.toLowerCase().includes('departamento') ? (
                    <FormControl fullWidth variant="outlined">
                      <Select
                        displayEmpty
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      >
                        <MenuItem value="" disabled>Departamento</MenuItem>
                        {departamentos.map((dep) => (
                          <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : q.question.toLowerCase().includes('colegio') ? (
                    <FormControl fullWidth variant="outlined">
                      <Select
                        displayEmpty
                        value={selectedSchoolId !== null ? String(selectedSchoolId) : ''}
                        onChange={(e) => handleSchoolChange(Number(e.target.value))}
                      >
                        <MenuItem value="" disabled>Selecciona tu colegio</MenuItem>
                        {schools.map((school) => (
                          <MenuItem key={school.id} value={school.id}>{school.schoolname}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        minRows={1}
                        maxRows={10}
                        inputProps={{ maxLength: 150 }}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      />
                      <Typography variant="caption" color="textSecondary">
                        Máx. de caracteres: {(answers[q.id] || '').length}/150
                      </Typography>
                    </>
                  )}
                </Box>
              );
            })}
          </LocalizationProvider>
        </Box>

        {/* Footer */}
        <Box sx={{
          padding: 2,
          borderTop: '1px solid #e0e0e0',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(groupedQuestions).map((key) => {
              const section = parseInt(key);
              const complete = isSectionComplete(section);
              const isCurrent = currentSection === section;

              return (
                <Button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: '50%',
                    color: complete ? '#fff' : isCurrent ? '#fff' : '#333',
                    backgroundColor: complete
                      ? '#4caf50'
                      : isCurrent
                      ? '#1976d2'
                      : '#f0f0f0',
                    '&:hover': {
                      backgroundColor: complete
                        ? '#388e3c'
                        : isCurrent
                        ? '#1565c0'
                        : '#e0e0e0',
                    }
                  }}
                >
                  {section}
                </Button>
              );
            })}

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={saving || !isAllComplete()}
              sx={{
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: isAllComplete() ? '#0288d1' : '#cfd8dc',
                color: isAllComplete() ? 'white' : '#757575',
                '&:hover': {
                  backgroundColor: isAllComplete() ? '#0277bd' : '#cfd8dc',
                }
              }}
            >
              <CheckIcon fontSize="small" />
            </Button>
          </Box>
        </Box>

        {/* Dialog envío */}
        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              padding: 2,
              border: '2px solid #fbc02d',
              backgroundColor: '#fffde7',
              maxWidth: 400
            }
          }}
        >
          <Box sx={{ textAlign: 'center', px: 2, py: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#f9a825', mb: 1 }} />
            <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#f57f17', pb: 0 }}>
              ¿Enviar respuestas?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f' }}>
                Una vez enviadas, no podrás modificarlas.
              </DialogContentText>
            </DialogContent>
          </Box>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              onClick={() => setConfirmOpen(false)}
              variant="outlined"
              color="warning"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit();
              }}
              variant="contained"
              color="warning"
              disabled={saving}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog salida */}
        <Dialog
          open={exitConfirmOpen}
          onClose={() => setExitConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              padding: 2,
              border: '2px solid #2196f3',
              backgroundColor: '#e3f2fd',
              maxWidth: 450
            }
          }}
        >
          <Box sx={{ textAlign: 'center', px: 2, py: 1 }}>
            <WarningAmberIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
            <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#1565c0', pb: 0 }}>
              ¿Seguro que quieres salir?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f', textAlign: 'center' }}>
                Tus respuestas serán guardadas automáticamente y podrás continuar desde donde lo dejaste cuando regreses.
              </DialogContentText>
            </DialogContent>
          </Box>
          <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
            <Button
              onClick={() => setExitConfirmOpen(false)}
              variant="outlined"
              color="primary"
              sx={{ minWidth: 100 }}
            >
              Continuar test
            </Button>
            <Button
              onClick={confirmExit}
              variant="contained"
              color="primary"
              sx={{ minWidth: 100 }}
            >
              Salir
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Entrevista;