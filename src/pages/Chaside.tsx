import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string;
  section: number;
  chatype: string;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const Chaside: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const STORAGE_KEY = `chaside_${user.id || 'anonymous'}`;

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
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
  }, [answers, currentSection, STORAGE_KEY]);

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
    answerOptions.filter(opt => Number(opt.questionid) === Number(questionId));

  const handleChange = (id: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: value
    }));
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

  const isSectionComplete = (section: number): boolean => {
    const sectionQuestions = groupedQuestions[section] || [];
    return sectionQuestions.every(q => !!answers[q.id]);
  };

  const isAllComplete = (): boolean => {
    return Object.keys(groupedQuestions).every((key) => {
      const section = parseInt(key);
      return isSectionComplete(section);
    });
  };

  const handleSubmit = async () => {
    const unanswered = allQuestions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      showSnackbar('Debes responder todas las preguntas antes de finalizar.', 'error');
      return;
    }

    setSaving(true);
    try {
      for (const q of allQuestions) {
        await supabase.from('testsanswers').insert({
          clientid: user.id,
          testid: 3,
          questionid: q.id,
          answerid: parseInt(answers[q.id])
        });
      }

      // Limpiar datos locales después del envío exitoso
      localStorage.removeItem(STORAGE_KEY);

      showSnackbar('Respuestas enviadas correctamente', 'success');
      setTimeout(() => navigate('/client'), 2000);
    } catch (err: any) {
      showSnackbar('Error al enviar: ' + (err.message || 'Error desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Primero obtener las preguntas
        const questionsRes = await supabase
          .from('questions')
          .select('id, question, section, chatype')
          .eq('testid', 3)
          .order('id');

        if (questionsRes.error) throw questionsRes.error;
        
        const questions = questionsRes.data || [];
        const questionIds = questions.map(q => q.id);
        
        // Luego obtener solo las opciones de respuesta para estas preguntas
        const optionsRes = await supabase
          .from('answeroptions')
          .select('id, questionid, answer')
          .in('questionid', questionIds)
          .order('id');

        if (optionsRes.error) throw optionsRes.error;

        setAllQuestions(questions);
        const cleaned = (optionsRes.data || []).map((opt: any) => ({
          ...opt,
          questionid: Number(opt.questionid),
        }));
        setAnswerOptions(cleaned);

        // Cargar datos guardados
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const localData = JSON.parse(stored);
            setAnswers(localData.answers || {});
            setCurrentSection(localData.currentSection || 1);
            setLastSaved(localData.lastSaved || '');
            
            showSnackbar('Respuestas cargadas', 'success');
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error al cargar los datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [STORAGE_KEY]);

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [currentSection]);

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

          <Typography variant="h5" color="primary">Test: Chaside</Typography>
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
          {['interest', 'aptitude'].map(type => {
            const questionsOfType = questions.filter(q => q.chatype === type);
            if (questionsOfType.length === 0) return null;

            return (
              <Box key={type} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                  {type === 'interest' ? 'Interés' : 'Aptitud'}
                </Typography>

                {questionsOfType.map((q) => (
                  <Box key={q.id} mb={4}>
                    <Typography variant="body1" fontWeight={500} gutterBottom>
                      {q.question}
                    </Typography>
                    <RadioGroup 
                      value={answers[q.id] || ''} 
                      onChange={(e) => handleChange(q.id, e.target.value)}
                    >
                      {getOptionsForQuestion(q.id).map((opt) => (
                        <FormControlLabel
                          key={opt.id}
                          value={String(opt.id)}
                          control={<Radio color="primary" />}
                          label={opt.answer}
                        />
                      ))}
                      {/* Depurador visual para preguntas sin opciones */}
                      {getOptionsForQuestion(q.id).length === 0 && (
                        <Typography variant="caption" color="error">
                          ⚠️ Esta pregunta no tiene opciones cargadas (ID: {q.id})
                        </Typography>
                      )}
                    </RadioGroup>
                  </Box>
                ))}
              </Box>
            );
          })}
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
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            flexWrap: 'wrap', 
            justifyContent: 'center' 
          }}>
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
              Continuar
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
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Chaside;