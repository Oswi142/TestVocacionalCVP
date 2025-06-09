import React, { useEffect, useState } from 'react';
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
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import IconButton from '@mui/material/IconButton';
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
      showSnackbar('Respuestas guardadas correctamente.', 'success');
      setTimeout(() => navigate('/client'), 2000);
    } catch (err: any) {
      showSnackbar('Error al guardar respuestas: ' + err.message, 'error');
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
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [currentSection]);

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #f9c9a4, #cafacc)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 600, height: '90vh', backgroundColor: '#ffffff', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" color="primary">Test: Chaside</Typography>
          <Typography variant="subtitle1" color="primary">Sección {currentSection}</Typography>
        </Box>

        <Box id="scroll-container" sx={{ flex: 1, overflow: 'auto', padding: 3, paddingTop: 2 }}>
            {['interest', 'aptitude'].map(type => {
                const questionsOfType = questions.filter(q => q.chatype === type);
                if (questionsOfType.length === 0) return null;

                return (
                <Box key={type}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    {type === 'interest' ? 'Interés' : 'Aptitud'}
                    </Typography>

                    {questionsOfType.map((q) => (
                    <Box key={q.id} mb={4}>
                        <Typography variant="body1" fontWeight={500} gutterBottom>{q.question}</Typography>
                        <RadioGroup value={answers[q.id] || ''} onChange={(e) => handleChange(q.id, e.target.value)}>
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


        <Box sx={{ padding: 2, borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(groupedQuestions).map((key) => {
              const section = parseInt(key);
              const complete = isSectionComplete(section);
              const isCurrent = currentSection === section;

              return (
                <Button
                  key={section}
                  onClick={() => setCurrentSection(section)}
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: '50%',
                    color: complete ? '#fff' : isCurrent ? '#fff' : '#333',
                    backgroundColor: complete ? '#4caf50' : isCurrent ? '#1976d2' : '#f0f0f0',
                    '&:hover': {
                      backgroundColor: complete ? '#388e3c' : isCurrent ? '#1565c0' : '#e0e0e0',
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
              ¿Estás seguro de enviar tus respuestas?
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ fontSize: '0.95rem', color: '#5f5f5f' }}>
                Una vez que envíes, <strong>no podrás modificarlas</strong>. Asegúrate de haber completado todo correctamente.
              </DialogContentText>
            </DialogContent>
          </Box>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} variant="outlined" color="warning" sx={{ borderColor: '#fbc02d', color: '#f57f17' }}>
              Cancelar
            </Button>
            <Button onClick={() => { setConfirmOpen(false); handleSubmit(); }} variant="contained" color="warning" sx={{ backgroundColor: '#fbc02d', color: '#333', '&:hover': { backgroundColor: '#f9a825' } }} disabled={saving}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
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
