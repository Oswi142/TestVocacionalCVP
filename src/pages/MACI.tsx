import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  question: string;
  section: number;
}

interface AnswerOption {
  id: number;
  questionid: number;
  answer: string;
}

const MACI: React.FC = () => {
  const TEST_ID = 4; // ← MACI
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [currentSection, setCurrentSection] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Agrupar preguntas por sección
  const groupedQuestions = useMemo(() => {
    const acc: Record<number, Question[]> = {};
    for (const q of allQuestions) {
      if (!acc[q.section]) acc[q.section] = [];
      acc[q.section].push(q);
    }
    // ordenar cada sección por id por si acaso
    Object.keys(acc).forEach(k => acc[Number(k)].sort((a, b) => a.id - b.id));
    return acc;
  }, [allQuestions]);

  const questions = groupedQuestions[currentSection] || [];

  const getOptionsForQuestion = (questionId: number) =>
    answerOptions.filter(opt => Number(opt.questionid) === Number(questionId));

  const handleChange = (id: number, value: string) =>
    setAnswers(prev => ({ ...prev, [id]: value }));

  const isSectionComplete = (section: number): boolean => {
    const sectionQuestions = groupedQuestions[section] || [];
    return sectionQuestions.length > 0 && sectionQuestions.every(q => !!answers[q.id]);
  };

  const isAllComplete = (): boolean =>
    Object.keys(groupedQuestions).every(key => isSectionComplete(parseInt(key)));

  const handleSubmit = async () => {
    const unanswered = allQuestions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      showSnackbar('Debes responder todas las preguntas antes de finalizar.', 'error');
      return;
    }

    setSaving(true);
    try {
      // Inserción por lotes para mejor performance
      const payload = allQuestions.map(q => ({
        clientid: user.id,
        testid: TEST_ID,
        questionid: q.id,
        answerid: parseInt(answers[q.id], 10)
      }));

      const { error } = await supabase.from('testsanswers').insert(payload);
      if (error) throw error;

      showSnackbar('Respuestas guardadas correctamente.', 'success');
      setTimeout(() => navigate('/client'), 1500);
    } catch (err: any) {
      showSnackbar('Error al guardar respuestas: ' + (err?.message || 'desconocido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Preguntas de MACI
        const questionsRes = await supabase
          .from('questions')
          .select('id, question, section')
          .eq('testid', TEST_ID)
          .order('id', { ascending: true });

        if (questionsRes.error) throw questionsRes.error;

        const questions = (questionsRes.data || []) as Question[];
        setAllQuestions(questions);

        // 2) Opciones para estas preguntas
        const ids = questions.map(q => q.id);
        if (ids.length === 0) {
          setAnswerOptions([]);
          return;
        }

        const optionsRes = await supabase
          .from('answeroptions')
          .select('id, questionid, answer')
          .in('questionid', ids)
          .order('id', { ascending: true });

        if (optionsRes.error) throw optionsRes.error;

        const cleaned = (optionsRes.data || []).map((opt: any) => ({
          ...opt,
          questionid: Number(opt.questionid)
        })) as AnswerOption[];
        setAnswerOptions(cleaned);
      } catch (error) {
        console.error('Error fetching MACI:', error);
        showSnackbar('Error al cargar el test MACI', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const el = document.getElementById('scroll-container');
    if (el) el.scrollTop = 0;
  }, [currentSection]);

  if (loading) {
    return (
      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(to right, #f9c9a4, #cafacc)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100vw', height: '100vh', background: 'linear-gradient(to right, #f9c9a4, #cafacc)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 600, height: '90vh', bgcolor: '#fff', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mb: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" color="primary">Test: MACI</Typography>
          <Typography variant="subtitle1" color="primary">Sección {currentSection}</Typography>
        </Box>

        {/* Body */}
        <Box id="scroll-container" sx={{ flex: 1, overflow: 'auto', p: 3, pt: 2 }}>
          {questions.map((q) => {
            const opts = getOptionsForQuestion(q.id);
            return (
              <Box key={q.id} mb={4}>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  {q.question}
                </Typography>

                <RadioGroup
                  value={answers[q.id] || ''}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                >
                  {opts.map((opt) => (
                    <FormControlLabel
                      key={opt.id}
                      value={String(opt.id)} // guardamos el id de la opción
                      control={<Radio color="primary" />}
                      label={opt.answer}
                    />
                  ))}
                </RadioGroup>

                {opts.length === 0 && (
                  <Typography variant="caption" color="error">
                    ⚠️ Esta pregunta no tiene opciones cargadas (ID: {q.id})
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Footer: navegación por secciones + enviar */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(groupedQuestions).map((key) => {
              const section = parseInt(key, 10);
              const complete = isSectionComplete(section);
              const isCurrent = currentSection === section;
              return (
                <Button
                  key={section}
                  onClick={() => setCurrentSection(section)}
                  sx={{
                    minWidth: 36, height: 36, borderRadius: '50%',
                    color: complete ? '#fff' : isCurrent ? '#fff' : '#333',
                    backgroundColor: complete ? '#4caf50' : isCurrent ? '#1976d2' : '#f0f0f0',
                    '&:hover': { backgroundColor: complete ? '#388e3c' : isCurrent ? '#1565c0' : '#e0e0e0' }
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
                minWidth: 36, height: 36, borderRadius: '50%',
                backgroundColor: isAllComplete() ? '#0288d1' : '#cfd8dc',
                color: isAllComplete() ? 'white' : '#757575',
                '&:hover': { backgroundColor: isAllComplete() ? '#0277bd' : '#cfd8dc' }
              }}
            >
              <CheckIcon fontSize="small" />
            </Button>
          </Box>
        </Box>

        {/* Confirmación */}
        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 3, p: 2, border: '2px solid #fbc02d', bgcolor: '#fffde7', maxWidth: 400
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

        {/* Snackbar */}
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

export default MACI;
